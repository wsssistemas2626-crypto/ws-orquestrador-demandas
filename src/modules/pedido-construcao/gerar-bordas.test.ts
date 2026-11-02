// Bordas do Pedido de Construção (T22, 06-T22-testes): determinismo sob concorrência e depois de mudar a conta de quem
// aprovou, caminho do dado pessoal em cada parte do pedido, falso positivo dos detectores em texto técnico comum, ordem
// entre a recusa de dado pessoal e a do validarPedido, e a dupla aprovação com a opção B virando o dia em São Paulo.
// Postgres real pelo papel do app (Testcontainers); relógio sempre fixo, cada teste num dia próprio (limite por hora,
// C-36). Dados só fictícios.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { evento, user } from '../../db/schema';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema, type Tipo } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bordas-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bordas-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

const ESP_COMPLETA = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK_PADRAO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const OPCOES = { opcaoA: { descricao: 'Corrigir no importador' }, opcaoB: { descricao: 'Refazer a integração' } };

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'bordas-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'bordas-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

type Preparo = {
  tipo?: Tipo;
  demanda?: Record<string, unknown>;
  esp?: Record<string, unknown>;
  opcoes?: Record<string, unknown>;
  nivel?: 'cto' | 'cto_e_administradora';
};

async function prepararDec(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados',
      tipo: op.tipo ?? 'bug',
      solicitanteNome: 'Pessoa Ficticia',
      contexto: 'Importação diária do ERP',
      ...op.demanda,
    }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(op.esp ?? ESP_COMPLETA));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(RSK_PADRAO));
  const dec = await criarPacoteDecisao(
    deps,
    cto,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', ...OPCOES, ...op.opcoes, nivelAprovacaoRequerido: op.nivel ?? 'cto' }),
  );
  return { demandaId: d.id, decId: dec.id };
}

const aprovar = (decId: string, quem: AtorPessoa = cto, opcao: 'A' | 'B' = 'A', extra: Record<string, unknown> = {}) =>
  registrarDecisao(deps, quem, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, ...extra }));

async function prepararAprovado(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const r = await prepararDec(op);
  await aprovar(r.decId);
  return r;
}

const eventosDoPedido = (decId: string) =>
  b.db
    .select()
    .from(evento)
    .where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')));

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

describe('CA-22.2: o mesmo DEC gera sempre o mesmo pedido (bordas)', () => {
  it('cinco gerações ao mesmo tempo dão o mesmo JSON, byte a byte, e cinco eventos pedido_gerado', async () => {
    const { decId } = await prepararAprovado();
    const resultados = await Promise.all(Array.from({ length: 5 }, () => gerarPedido(deps, cto, decId)));
    const jsons = new Set(resultados.map((r) => r.json));
    expect(jsons.size).toBe(1);
    expect(validarPedido(JSON.parse(resultados[0]!.json))).toEqual({ ok: true, erros: [] });
    expect(await eventosDoPedido(decId)).toHaveLength(5);
  });

  it('a conta de quem aprovou muda de nome depois da aprovação: aprovadoPor continua o nome gravado na aprovação', async () => {
    const { decId } = await prepararAprovado();
    const antes = (await gerarPedido(deps, cto, decId)).json;
    await b.db.update(user).set({ name: 'Pessoa Ficticia Renomeada' }).where(eq(user.id, cto.usuarioId));
    try {
      const depois = (await gerarPedido(deps, administradora, decId)).json;
      expect(depois).toBe(antes);
      expect(JSON.parse(depois).decisao.aprovadoPor).toBe('Pessoa Ficticia CTO');
    } finally {
      await b.db.update(user).set({ name: cto.nome }).where(eq(user.id, cto.usuarioId));
    }
  });

  it('um ano depois, as listas da ESP saem na ordem gravada e o arquivo é o mesmo', async () => {
    const criterios = ['Terceiro critério', 'Primeiro critério', 'Segundo critério'];
    const pronto = ['pnpm test verde', 'pnpm lint limpo'];
    const { decId } = await prepararAprovado({ esp: { ...ESP_COMPLETA, criteriosAceitePreliminares: criterios, definicaoDePronto: pronto } });
    const a = (await gerarPedido(deps, cto, decId)).json;
    relogio.avancar(365 * 86_400_000);
    const b2 = (await gerarPedido(deps, cto, decId)).json;
    expect(b2).toBe(a);
    const p = JSON.parse(b2);
    expect(p.criterios_aceite_preliminares).toEqual(criterios);
    expect(p.definicao_de_pronto).toEqual(pronto);
  });
});

describe('C-28: caminho do dado pessoal em cada parte do pedido (bordas)', () => {
  it('e-mail na descrição da opção escolhida → "decisao.opcaoEscolhida: e-mail", sem o valor e sem evento', async () => {
    const { decId } = await prepararAprovado({ opcoes: { opcaoA: { descricao: 'Combinar com contato@exemplo.test' } } });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.codigo).toBe('nao_processavel');
    expect(e.extras).toEqual({ erros: ['decisao.opcaoEscolhida: e-mail'] });
    expect(JSON.stringify(e.extras)).not.toContain('exemplo.test');
    expect(await eventosDoPedido(decId)).toEqual([]);
  });

  it('e-mail só na opção que não foi escolhida não bloqueia nem aparece no pedido', async () => {
    const { decId } = await prepararAprovado({ opcoes: { opcaoB: { descricao: 'Combinar com contato@exemplo.test' } } });
    const { json } = await gerarPedido(deps, cto, decId);
    expect(json).not.toContain('exemplo.test');
    expect(JSON.parse(json).decisao.opcaoEscolhida).toBe('A: Corrigir no importador');
  });

  it('telefone no contexto da demanda e CPF na definição de pronto → "demanda.descricao: telefone" e "definicao_de_pronto[1]: CPF"', async () => {
    const { decId } = await prepararAprovado({
      demanda: { contexto: 'Ligar para (11) 90000-0000 antes' },
      esp: { ...ESP_COMPLETA, definicaoDePronto: ['pnpm test verde', 'Conferir o cadastro 123.456.789-09'] },
    });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.extras).toEqual({ erros: ['demanda.descricao: telefone', 'definicao_de_pronto[1]: CPF'] });
    expect(JSON.stringify(e.extras)).not.toMatch(/90000|456\.789/);
  });

  it('dado pessoal é conferido antes do validarPedido: com os dois problemas, só o dado pessoal volta', async () => {
    const { decId } = await prepararAprovado({
      demanda: { contexto: undefined },
      esp: { ...ESP_COMPLETA, descricaoObjetiva: 'Falar com contato@exemplo.test' },
    });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['especificacao.conteudo: e-mail'] });
  });

  it('texto técnico comum não é dado pessoal: versão, porta, CEP, valor, data, hora, CNPJ sem pontuação e número longo', async () => {
    const tecnico = [
      'Next 16.3.8 na porta 3101',
      'CEP 01310-100',
      'R$ 1.234.567,89 por mês',
      'Prazo 22/10/2026 às 12:30',
      'Fornecedor 12345678000190',
      'Lote 123456789012 e protocolo 1234567890',
      'pnpm@12.6.0 e @types/node',
    ];
    const { decId } = await prepararAprovado({ esp: { ...ESP_COMPLETA, escopoInclui: tecnico } });
    const p = JSON.parse((await gerarPedido(deps, cto, decId)).json);
    for (const t of tecnico) expect(p.especificacao.conteudo).toContain(t);
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
  });
});

describe('A-03 (08-correcao): DEC aprovado e depois desatualizado não gera pedido', () => {
  it('ESP v2 gravada depois da aprovação do DEC v1: 409 com a mensagem de desatualizado, sem evento', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await criarEspecificacao(deps, cto, demandaId, criarEspecificacaoSchema.parse({ ...ESP_COMPLETA, descricaoObjetiva: 'Corrigir pedidos duplicados, versão 2' }));
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.codigo).toBe('conflito');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.desatualizado);
    expect(await eventosDoPedido(decId)).toEqual([]);
  });

  it('RSK v2 gravado depois da aprovação: também 409', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await criarParecerRisco(deps, cto, demandaId, criarParecerRiscoSchema.parse({ ...RSK_PADRAO, riscoTecnicoNivel: 'alto' }));
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.desatualizado });
  });
});

describe('dupla aprovação com a opção B (bordas)', () => {
  it('as duas com B, a que completa às 23:59 de São Paulo: "B: <descrição>" e aprovadoEm do dia de São Paulo', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    relogio.definir('2026-12-02T15:00:00Z');
    await aprovar(decId, administradora, 'B', { referenciaDocumento: 'DOC-FICTICIO-020', dataDocumento: '2026-12-01' });
    // 02:59 UTC do dia 4 ainda é 23:59 do dia 3 em São Paulo.
    relogio.definir('2026-12-04T02:59:00Z');
    await aprovar(decId, cto, 'B');
    const p = JSON.parse((await gerarPedido(deps, cto, decId)).json);
    expect(p.decisao).toEqual({ id: decId, opcaoEscolhida: 'B: Refazer a integração', aprovadoPor: 'Pessoa Ficticia CTO e Pessoa Ficticia Adm', aprovadoEm: '2026-12-03' });
    expect(JSON.stringify(p)).not.toContain('DOC-FICTICIO-020');
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
  });
});
