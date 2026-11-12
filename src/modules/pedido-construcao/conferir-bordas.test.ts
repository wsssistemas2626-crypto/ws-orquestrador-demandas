// Bordas de conferirEMontarPedido (06-T09-testes, ADR-26, IN-10, RF-13 base): o que a entrega ao /construir (T11) vai
// depender desta função, além do que conferir.test.ts já cobre. A trava da demanda fica com a transação de quem chama até
// o fim dela; as conferências são refeitas sobre o estado de agora, depois de um pedido já gerado (CA-13.3, CA-13.4);
// C-28 com telefone e CPF e a ordem dos erros (C-28 primeiro, nome depois, dado pessoal antes do validarPedido);
// conferências ao mesmo tempo dão os mesmos bytes. Postgres real pelo papel do app (Testcontainers); relógio sempre fixo,
// cada teste num dia próprio (C-36), sem depender da ordem dos testes. Dados só fictícios.
import { and, count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { conferirEMontarPedido } from './conferir';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-conf-bordas-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

const ESP_COMPLETA = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK_PADRAO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([{ id: cto.usuarioId, name: cto.nome, email: 'conf-bordas-cto@exemplo.test', papel: 'cto' }]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-12T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

type Preparo = { demanda?: Record<string, unknown>; esp?: Record<string, unknown> };

const novoDec = async (demandaId: string) =>
  (
    await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Corrigir a importação de pedidos',
        opcaoA: { descricao: 'Corrigir no importador' },
        opcaoB: { descricao: 'Refazer a integração' },
        nivelAprovacaoRequerido: 'cto',
      }),
    )
  ).id;

const aprovar = (decId: string) => registrarDecisao(deps, cto, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));

async function prepararAprovado(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados (fictício)',
      tipo: 'bug',
      solicitanteNome: 'Carlos Exemplar',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
      ...op.demanda,
    }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(op.esp ?? ESP_COMPLETA));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(RSK_PADRAO));
  const decId = await novoDec(d.id);
  await aprovar(decId);
  return { demandaId: d.id, decId };
}

// Como a entrega vai chamar: dentro de uma transação, sem ator e sem confirmação.
const conferir = (decId: string) => comTransacao(b.poolApp, ({ tx }) => conferirEMontarPedido(tx, decId));

const totalDeEventos = async () => (await b.db.select({ n: count() }).from(evento))[0]!.n;
const pedidosGerados = async (decId: string) =>
  (
    await b.db
      .select({ n: count() })
      .from(evento)
      .where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')))
  )[0]!.n;

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

// A recusa da conferência é a mesma da geração (código, mensagem e extras), e nenhuma das duas grava evento.
async function recusaIgualAGeracao(decId: string): Promise<ErroDominio> {
  const antes = await totalDeEventos();
  const daConferencia = await erroDe(conferir(decId));
  const daGeracao = await erroDe(gerarPedido(deps, cto, decId, CONFIRMADO));
  expect({ codigo: daConferencia.codigo, mensagem: daConferencia.mensagem, extras: daConferencia.extras }).toEqual({
    codigo: daGeracao.codigo,
    mensagem: daGeracao.mensagem,
    extras: daGeracao.extras,
  });
  expect(await totalDeEventos()).toBe(antes);
  return daConferencia;
}

// Tenta travar a linha da demanda por outra conexão, sem esperar: 55P03 quando outra transação ainda a segura.
async function codigoAoTravarDeFora(demandaId: string): Promise<string | null> {
  return b.poolMigrator.query('select 1 from demanda where id = $1 for update nowait', [demandaId]).then(
    () => null,
    (e: { code?: string }) => e.code ?? 'sem_codigo',
  );
}

describe('conferirEMontarPedido: a trava da demanda é da transação de quem chama (G7, para a T11)', () => {
  it('depois de devolver o pedido, a linha da demanda continua travada até o fim da transação; depois do commit, fica livre', async () => {
    const { demandaId, decId } = await prepararAprovado();
    expect(await codigoAoTravarDeFora(demandaId)).toBeNull();
    const codigoDentro = await comTransacao(b.poolApp, async ({ tx }) => {
      const r = await conferirEMontarPedido(tx, decId);
      expect(r.dec.id).toBe(decId);
      return codigoAoTravarDeFora(demandaId);
    });
    expect(codigoDentro).toBe('55P03');
    expect(await codigoAoTravarDeFora(demandaId)).toBeNull();
  });

  it('cinco conferências ao mesmo tempo, cada uma na sua transação, dão os bytes da geração e nenhum evento', async () => {
    const { decId } = await prepararAprovado();
    const { json } = await gerarPedido(deps, cto, decId, CONFIRMADO);
    const antes = await totalDeEventos();
    const resultados = await Promise.all(Array.from({ length: 5 }, () => conferir(decId)));
    expect(new Set(resultados.map((r) => r.json))).toEqual(new Set([json]));
    expect(await totalDeEventos()).toBe(antes);
  });
});

describe('conferirEMontarPedido: depois de um pedido gerado, confere o estado de agora (CA-13.3, CA-13.4)', () => {
  it('CA-13.4: o solicitante passa a ter um nome que está no título copiado no DEC → nao_processavel "demanda.titulo: nome", sem o valor', async () => {
    const { demandaId, decId } = await prepararAprovado({ demanda: { titulo: 'Pedido da Joana Ficticia' } });
    await gerarPedido(deps, cto, decId, CONFIRMADO);
    expect(await pedidosGerados(decId)).toBe(1);
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ solicitanteNome: 'Joana Ficticia' }));
    relogio.avancar(86_400_000);
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['demanda.titulo: nome'] });
    expect(JSON.stringify({ m: e.mensagem, x: e.extras, s: e.message })).not.toMatch(/joana|ficticia/i);
    expect(await pedidosGerados(decId)).toBe(1);
  });

  it('CA-13.3: a demanda vai a encerrada depois do pedido gerado → conflito demandaFinal', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await gerarPedido(deps, cto, decId, CONFIRMADO);
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.demandaFinal);
  });

  it('CA-13.3: um RSK mais novo depois do pedido gerado → conflito desatualizado', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await gerarPedido(deps, cto, decId, CONFIRMADO);
    await criarParecerRisco(deps, cto, demandaId, criarParecerRiscoSchema.parse({ ...RSK_PADRAO, riscoTecnicoNivel: 'alto' }));
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.desatualizado);
  });

  it('CA-13.3: um DEC mais novo aprovado depois do pedido gerado → conflito substituido(v2), e o v2 monta', async () => {
    const { demandaId, decId: v1 } = await prepararAprovado();
    const doV1 = (await gerarPedido(deps, cto, v1, CONFIRMADO)).json;
    const v2 = await novoDec(demandaId);
    await aprovar(v2);
    const e = await recusaIgualAGeracao(v1);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.substituido(v2));
    const doV2 = (await conferir(v2)).json;
    expect(JSON.parse(doV2).pedido).toBe(v2);
    expect(doV2).not.toBe(doV1);
  });
});

describe('conferirEMontarPedido: C-28 e a ordem dos erros (IN-10)', () => {
  it('telefone na descrição, CPF na definição de pronto e o nome no título → C-28 primeiro, na ordem do pedido, e o nome por último, sem os valores', async () => {
    const { decId } = await prepararAprovado({
      demanda: { solicitanteNome: 'Joana Ficticia', titulo: 'Pedido da Joana Ficticia', contexto: `Ligar para ${SENTINELAS.telefone} antes` },
      esp: { ...ESP_COMPLETA, definicaoDePronto: ['pnpm test verde', 'Conferir o cadastro 123.456.789-09'] },
    });
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['demanda.descricao: telefone', 'definicao_de_pronto[1]: CPF', 'demanda.titulo: nome'] });
    const saida = JSON.stringify({ m: e.mensagem, x: e.extras, s: e.message });
    expect(contemSentinela(saida)).toBe(false);
    expect(saida).not.toMatch(/90000|456\.789|joana|ficticia/i);
  });

  it('dado pessoal é conferido antes do validarPedido: com os dois problemas, só o dado pessoal volta', async () => {
    const { decId } = await prepararAprovado({
      demanda: { contexto: undefined, descricaoProblema: undefined },
      esp: { ...ESP_COMPLETA, descricaoObjetiva: `Ligar para ${SENTINELAS.telefone}` },
    });
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.extras).toEqual({ erros: ['especificacao.conteudo: telefone'] });
    expect(contemSentinela(JSON.stringify({ m: e.mensagem, x: e.extras, s: e.message }))).toBe(false);
  });
});
