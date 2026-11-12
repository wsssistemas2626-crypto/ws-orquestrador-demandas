// ADR-26 (T09): a geração e a entrega usam a mesma conferência e montagem, conferirEMontarPedido. Ela devolve o DEC e o
// JSON byte a byte igual ao de gerarPedido, não grava evento, não pede a confirmação de dado pessoal e recusa com o
// mesmo código e a mesma mensagem da geração (RF-22 passos 3 a 11 do cap. 05). Postgres real pelo papel do app; relógio
// fixo, cada teste num dia próprio (C-36). Dados só fictícios.
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { AtorPessoa } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema, type Tipo } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { obterPacoteDecisao } from '../pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { conferirEMontarPedido } from './conferir';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-conferir-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

const ESP_COMPLETA = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  situacaoAtual: 'O importador grava o mesmo pedido duas vezes',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const ESP_ESTUDO = { descricaoObjetiva: 'Avaliar a troca do ERP', escopoInclui: ['Levantamento'] };
const RSK_PADRAO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([{ id: cto.usuarioId, name: cto.nome, email: 'conferir-cto@exemplo.test', papel: 'cto' }]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-12T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

type Preparo = { tipo?: Tipo; demanda?: Record<string, unknown>; esp?: Record<string, unknown> };

async function prepararDec(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const tipo = op.tipo ?? 'bug';
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados (fictício)',
      tipo,
      solicitanteNome: 'Pessoa Ficticia',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
      ...op.demanda,
    }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(op.esp ?? (tipo === 'estudo' ? ESP_ESTUDO : ESP_COMPLETA)));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(RSK_PADRAO));
  return { demandaId: d.id, decId: await novoDec(d.id) };
}

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
  const r = await prepararDec(op);
  await aprovar(r.decId);
  return r;
}

// Como a entrega vai chamar: dentro de uma transação, sem ator e sem confirmação.
const conferir = (decId: string) => comTransacao(b.poolApp, ({ tx }) => conferirEMontarPedido(tx, decId));

const totalDeEventos = async () => (await b.db.select({ n: count() }).from(evento))[0]!.n;
const eventosDoDec = (decId: string) => b.db.select().from(evento).where(eq(evento.entidadeId, decId));

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

// A recusa de conferirEMontarPedido é a mesma de gerarPedido: código, mensagem e extras; nenhuma das duas grava evento.
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

describe('conferirEMontarPedido: a mesma montagem da geração (ADR-26)', () => {
  it('devolve { dec, json }: o json é o de gerarPedido para o mesmo DEC, byte a byte, e o dec é a vista do DEC', async () => {
    const { decId } = await prepararAprovado();
    const r = await conferir(decId);
    expect(Object.keys(r).sort()).toEqual(['dec', 'json']);
    const { json } = await gerarPedido(deps, cto, decId, CONFIRMADO);
    expect(r.json).toBe(json);
    expect(r.dec).toEqual(await obterPacoteDecisao(b.db, decId));
    expect(r.dec.id).toBe(decId);
    expect(validarPedido(JSON.parse(r.json))).toEqual({ ok: true, erros: [] });
  });

  it('a geração antes e a conferência depois dão os mesmos bytes, também em outro dia e depois de editar a demanda (CA-22.2)', async () => {
    const { demandaId, decId } = await prepararAprovado();
    const { json } = await gerarPedido(deps, cto, decId, CONFIRMADO);
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ titulo: 'Título novo (fictício)', tipo: 'melhoria' }));
    relogio.avancar(86_400_000);
    expect((await conferir(decId)).json).toBe(json);
    expect((await conferir(decId)).json).toBe(json);
  });

  it('não grava evento nenhum e não pede a confirmação de dado pessoal (só a transação e o id)', async () => {
    const { decId } = await prepararAprovado();
    const antes = await totalDeEventos();
    const doDecAntes = await eventosDoDec(decId);
    await conferir(decId);
    await conferir(decId);
    expect(await totalDeEventos()).toBe(antes);
    expect(await eventosDoDec(decId)).toEqual(doDecAntes);
    expect(doDecAntes.some((e) => e.acao === 'pedido_gerado')).toBe(false);
    expect(conferirEMontarPedido.length).toBe(2);
  });

  it('aceita a transação de quem chama: dentro dela devolve o pedido, e nada fica gravado depois do rollback', async () => {
    const { decId } = await prepararAprovado();
    const antes = await totalDeEventos();
    await expect(
      comTransacao(b.poolApp, async ({ tx }) => {
        const r = await conferirEMontarPedido(tx, decId);
        expect(r.dec.id).toBe(decId);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await totalDeEventos()).toBe(antes);
  });
});

describe('conferirEMontarPedido: as recusas são as da geração, com o mesmo código e a mesma mensagem', () => {
  it('DEC que não existe → nao_encontrado com a mensagem de sempre', async () => {
    const e = await recusaIgualAGeracao('DEC-DEM-20261112-9999-v1');
    expect(e.codigo).toBe('nao_encontrado');
    expect(e.mensagem).toBe(MENSAGEM_NAO_ENCONTRADO);
  });

  it('demanda em status final (encerrada) → conflito demandaFinal', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.demandaFinal);
  });

  it('demanda entregue (pelo caminho real) → conflito demandaFinal', async () => {
    const { demandaId, decId } = await prepararAprovado();
    for (const status of ['aprovada', 'em_construcao', 'entregue'] as const) await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status }));
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.demandaFinal);
  });

  it('sem decisão aprovada (pendente e devolvida) → conflito naoAprovado', async () => {
    const pendente = await prepararDec();
    const devolvida = await prepararDec();
    await registrarDecisao(deps, cto, devolvida.decId, registrarDecisaoSchema.parse({ statusDecisao: 'devolvida' }));
    for (const { decId } of [pendente, devolvida]) {
      const e = await recusaIgualAGeracao(decId);
      expect(e.codigo, decId).toBe('conflito');
      expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoAprovado);
    }
  });

  it('substituído por um aprovado mais novo da demanda → conflito substituido(id do mais novo); o mais novo monta', async () => {
    const { demandaId, decId: v1 } = await prepararAprovado();
    const v2 = await novoDec(demandaId);
    await aprovar(v2);
    const e = await recusaIgualAGeracao(v1);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.substituido(v2));
    expect(JSON.parse((await conferir(v2)).json).decisao.id).toBe(v2);
  });

  it('desatualizado (ESP mais nova que a citada) → conflito desatualizado', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await criarEspecificacao(deps, cto, demandaId, criarEspecificacaoSchema.parse({ ...ESP_COMPLETA, definicaoDePronto: ['pnpm lint limpo'] }));
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.desatualizado);
  });

  it('estudo → nao_processavel estudo', async () => {
    const { decId } = await prepararAprovado({ tipo: 'estudo' });
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.estudo);
  });

  it('nome do solicitante no título copiado → nao_processavel com erros ["demanda.titulo: nome"], sem o valor', async () => {
    const { decId } = await prepararAprovado({ demanda: { solicitanteNome: 'Joana Ficticia', titulo: 'Pedido da Joana Ficticia' } });
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['demanda.titulo: nome'] });
    expect(JSON.stringify({ m: e.mensagem, x: e.extras, s: e.message })).not.toMatch(/joana|ficticia/i);
  });

  it('C-28: e-mail na ESP → nao_processavel com o caminho e o tipo, sem o valor', async () => {
    const { decId } = await prepararAprovado({ esp: { ...ESP_COMPLETA, situacaoAtual: `Falar com ${SENTINELAS.email}` } });
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.extras).toEqual({ erros: ['especificacao.conteudo: e-mail'] });
    expect(contemSentinela(JSON.stringify({ m: e.mensagem, x: e.extras, s: e.message }))).toBe(false);
  });

  it('validarPedido do /construir recusou → nao_processavel com os erros dele', async () => {
    const { decId } = await prepararAprovado({ demanda: { contexto: undefined, descricaoProblema: undefined } });
    const e = await recusaIgualAGeracao(decId);
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['demanda.descricao vazio'] });
  });
});
