// T10 (IN-10, RF-12, RF-15, RNF-02, ADR-27, P-02, P-03): as leituras do Pedido de Construção no histórico, contra o
// Postgres real pelo papel do app (Testcontainers). O que o /construir pode buscar (listarPendentes) e as leituras que a
// entrega (T11), o recebimento (T12) e o painel (T19) usam. Só leitura: nada aqui grava evento. Os eventos que nenhum
// caminho do app grava com aquele ator (pedido_gerado de agente, eventos do /construir antes das rotas da T11 e da T12)
// entram pelo migrator, com o prefixo fictício `ficticio` (G3.3). Relógio fixo, cada teste num dia próprio; o banco é
// compartilhado pelo bloco funcional, então cada teste olha só os próprios DEC. Dados só fictícios.
import { count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import type { Db } from '../../db';
import * as schema from '../../db/schema';
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
import { gerarPedido } from './gerar';
import { listarPendentes, pedidoGeradoPorPessoa, recebidoComSha, recebimentoDoPedido, shasEntregues } from './pendentes';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-pendentes-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

const ESP_COMPLETA = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK_PADRAO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

// 64 hexadecimais minúsculos, fictícios.
const sha = (n: number) => n.toString(16).padStart(64, '0');

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([{ id: cto.usuarioId, name: cto.nome, email: 'pendentes-cto@exemplo.test', papel: 'cto' }]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-12T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

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

// Solicitante "Carlos Exemplar": "Ficticia" casaria com o título do teste do P-02 já na geração.
async function prepararAprovado(demanda: Record<string, unknown> = {}): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados (fictício)',
      tipo: 'bug',
      solicitanteNome: 'Carlos Exemplar',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
      ...demanda,
    }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(ESP_COMPLETA));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(RSK_PADRAO));
  const decId = await novoDec(d.id);
  await aprovar(decId);
  return { demandaId: d.id, decId };
}

// Aprovado e com o pedido gerado por pessoa, pelo caminho real.
async function prepararGerado(demanda: Record<string, unknown> = {}): Promise<{ demandaId: string; decId: string }> {
  const r = await prepararAprovado(demanda);
  await gerarPedido(deps, cto, r.decId, CONFIRMADO);
  return r;
}

type EventoAMao = {
  acao: string;
  decId: string;
  demandaId: string | null;
  atorTipo: 'pessoa' | 'agente' | 'sistema' | 'integracao';
  atorId: string;
  prefixo?: string | null;
  ocorridoEm: string;
  entidade?: string;
  depois?: unknown;
};

// Pelo migrator: o ator e a data ficam exatamente como o teste quer.
async function inserirEvento(e: EventoAMao): Promise<void> {
  await b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [e.ocorridoEm, e.atorTipo, e.atorId, e.prefixo ?? null, e.demandaId, e.entidade ?? 'pacote_decisao', e.decId, e.acao, e.depois === undefined ? null : JSON.stringify(e.depois)],
  );
}

const doConstruir = (acao: 'pedido_entregue' | 'pedido_recebido', decId: string, demandaId: string, depois: unknown, ocorridoEm = '2026-11-25T10:00:00Z') =>
  inserirEvento({ acao, decId, demandaId, atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio', ocorridoEm, depois });

// A lista inteira do banco, só com os DEC que o teste pediu, na ordem em que vieram.
const pendentesEntre = async (ids: string[]) => (await listarPendentes(b.db)).map((i) => i.decId).filter((id) => ids.includes(id));
const estaPendente = async (decId: string) => (await pendentesEntre([decId])).length === 1;
const totalDeEventos = async () => (await b.db.select({ n: count() }).from(evento))[0]!.n;

describe('listarPendentes: o que o /construir pode buscar (RF-12, IN-10)', () => {
  it('CA-12.1 e CA-12.2: o DEC aprovado sem pedido_gerado fica fora; depois de gerarPedido por pessoa, entra como { decId }', async () => {
    const { decId } = await prepararAprovado();
    expect(await estaPendente(decId)).toBe(false);
    await gerarPedido(deps, cto, decId, CONFIRMADO);
    expect(await pendentesEntre([decId])).toEqual([decId]);
    // Gerar de novo não duplica o item.
    await gerarPedido(deps, cto, decId, CONFIRMADO);
    expect(await pendentesEntre([decId])).toEqual([decId]);
  });

  it('cada item tem só a chave decId, nenhum DEC se repete, e a leitura não grava evento (CA-12.6)', async () => {
    await prepararGerado();
    const antes = await totalDeEventos();
    const itens = await listarPendentes(b.db);
    expect(await totalDeEventos()).toBe(antes);
    expect(itens.length).toBeGreaterThan(0);
    for (const item of itens) {
      expect(Object.keys(item)).toEqual(['decId']);
      expect(item.decId).toMatch(/^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]+$/);
    }
    expect(new Set(itens.map((i) => i.decId)).size).toBe(itens.length);
  });

  it('IN-10: pedido_gerado de agente, de integração, de sistema ou sobre outra entidade não põe o DEC na lista', async () => {
    const casos: Array<Pick<EventoAMao, 'atorTipo' | 'atorId' | 'prefixo' | 'entidade'>> = [
      { atorTipo: 'agente', atorId: 'orquestrador' },
      { atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio' },
      { atorTipo: 'sistema', atorId: 'sistema' },
      // De pessoa, mas sobre a demanda e não sobre o pacote de decisão.
      { atorTipo: 'pessoa', atorId: cto.usuarioId, entidade: 'demanda' },
    ];
    const ids: string[] = [];
    for (const c of casos) {
      const { demandaId, decId } = await prepararAprovado();
      await inserirEvento({ ...c, acao: 'pedido_gerado', decId, demandaId, ocorridoEm: '2026-11-20T09:00:00Z', depois: { confirmaSemDadoPessoal: true } });
      ids.push(decId);
      expect(await pedidoGeradoPorPessoa(b.db, decId), JSON.stringify(c)).toBeNull();
    }
    expect(await pendentesEntre(ids)).toEqual([]);
  });

  it('IN-10: um pedido_gerado de pessoa basta, mesmo com outro de agente no mesmo DEC', async () => {
    const { demandaId, decId } = await prepararGerado();
    await inserirEvento({ acao: 'pedido_gerado', decId, demandaId, atorTipo: 'agente', atorId: 'orquestrador', ocorridoEm: '2026-10-01T09:00:00Z' });
    expect(await estaPendente(decId)).toBe(true);
  });

  it('CA-12.3: a demanda entregue ou encerrada tira o DEC da lista; aprovada e em_construcao não tiram', async () => {
    const entregue = await prepararGerado();
    for (const status of ['aprovada', 'em_construcao'] as const) {
      await alterarDemanda(deps, cto, entregue.demandaId, alterarDemandaSchema.parse({ status }));
      expect(await estaPendente(entregue.decId), status).toBe(true);
    }
    await alterarDemanda(deps, cto, entregue.demandaId, alterarDemandaSchema.parse({ status: 'entregue' }));
    expect(await estaPendente(entregue.decId)).toBe(false);

    const encerrada = await prepararGerado();
    expect(await estaPendente(encerrada.decId)).toBe(true);
    await alterarDemanda(deps, cto, encerrada.demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
    expect(await estaPendente(encerrada.decId)).toBe(false);
  });

  it('CA-12.4: um DEC mais novo da demanda, aprovado, tira o antigo; o novo só entra com o próprio pedido_gerado', async () => {
    const { demandaId, decId: v1 } = await prepararGerado();
    const v2 = await novoDec(demandaId);
    // Ainda pendente de decisão, o v2 não substitui o v1.
    expect(await pendentesEntre([v1, v2])).toEqual([v1]);
    await aprovar(v2);
    expect(await pendentesEntre([v1, v2])).toEqual([]);
    await gerarPedido(deps, cto, v2, CONFIRMADO);
    expect(await pendentesEntre([v1, v2])).toEqual([v2]);
  });

  it('CA-12.4: uma ESP ou um RSK mais novos que os citados (desatualizado) tiram o DEC', async () => {
    const porEsp = await prepararGerado();
    const porRsk = await prepararGerado();
    expect(await pendentesEntre([porEsp.decId, porRsk.decId])).toHaveLength(2);
    await criarEspecificacao(deps, cto, porEsp.demandaId, criarEspecificacaoSchema.parse({ ...ESP_COMPLETA, definicaoDePronto: ['pnpm lint limpo'] }));
    await criarParecerRisco(deps, cto, porRsk.demandaId, criarParecerRiscoSchema.parse({ ...RSK_PADRAO, riscoTecnicoNivel: 'alto' }));
    expect(await pendentesEntre([porEsp.decId, porRsk.decId])).toEqual([]);
  });

  it('CA-12.5: pedido_recebido tira o DEC; pedido_entregue não tira (P-02); o recebido de outro DEC não conta', async () => {
    const a = await prepararGerado();
    const outro = await prepararGerado();
    await doConstruir('pedido_entregue', a.decId, a.demandaId, { sha256: sha(1) });
    expect(await pendentesEntre([a.decId, outro.decId])).toHaveLength(2);
    await doConstruir('pedido_recebido', outro.decId, outro.demandaId, { sha256: sha(2) });
    expect(await pendentesEntre([a.decId, outro.decId])).toEqual([a.decId]);
    await doConstruir('pedido_recebido', a.decId, a.demandaId, { sha256: sha(1) });
    expect(await pendentesEntre([a.decId, outro.decId])).toEqual([]);
  });

  it('P-02: o DEC continua na lista quando a entrega seria recusada pelo nome do solicitante (a lista não monta o pedido)', async () => {
    const { demandaId, decId } = await prepararGerado({ titulo: 'Pedido da Joana Ficticia' });
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ solicitanteNome: 'Joana Ficticia' }));
    const recusa = await comTransacao(b.poolApp, ({ tx }) => conferirEMontarPedido(tx, decId)).then(
      () => null,
      (e: unknown) => e,
    );
    expect(recusa).toBeInstanceOf(ErroDominio);
    expect((recusa as ErroDominio).codigo).toBe('nao_processavel');
    expect(await estaPendente(decId)).toBe(true);
  });

  it('P-03: pedido gerado em outubro também conta; a ordem é do primeiro pedido_gerado mais antigo para o mais novo, e depois pelo id', async () => {
    const d1 = await prepararAprovado();
    const d2 = await prepararAprovado();
    const d3 = await prepararAprovado();
    const d4 = await prepararAprovado();
    const gerado = (d: { decId: string; demandaId: string }, ocorridoEm: string) =>
      inserirEvento({ acao: 'pedido_gerado', decId: d.decId, demandaId: d.demandaId, atorTipo: 'pessoa', atorId: cto.usuarioId, ocorridoEm, depois: { confirmaSemDadoPessoal: true } });
    // d1: gerado de novo em novembro, mas o primeiro é de 5 de outubro e é ele que conta.
    await gerado(d1, '2026-11-20T08:00:00Z');
    await gerado(d1, '2026-10-05T08:00:00Z');
    await gerado(d2, '2026-10-10T08:00:00Z');
    // d3 e d4 no mesmo instante: desempata pelo id.
    await gerado(d4, '2026-10-01T09:00:00Z');
    await gerado(d3, '2026-10-01T09:00:00Z');
    const empatados = [d3.decId, d4.decId].sort();
    expect(await pendentesEntre([d1.decId, d2.decId, d3.decId, d4.decId])).toEqual([...empatados, d1.decId, d2.decId]);
  });
});

describe('pedidoGeradoPorPessoa (IN-10)', () => {
  it('depois de gerarPedido devolve só { demandaId }, a demanda do DEC; antes, null', async () => {
    const { demandaId, decId } = await prepararAprovado();
    expect(await pedidoGeradoPorPessoa(b.db, decId)).toBeNull();
    await gerarPedido(deps, cto, decId, CONFIRMADO);
    const r = await pedidoGeradoPorPessoa(b.db, decId);
    expect(r).toEqual({ demandaId });
    expect(Object.keys(r!)).toEqual(['demandaId']);
  });

  it('DEC que não existe → null; pedido_gerado de pessoa sem demanda_id → null', async () => {
    expect(await pedidoGeradoPorPessoa(b.db, 'DEC-DEM-20261112-9999-v1')).toBeNull();
    const { decId } = await prepararAprovado();
    await inserirEvento({ acao: 'pedido_gerado', decId, demandaId: null, atorTipo: 'pessoa', atorId: cto.usuarioId, ocorridoEm: '2026-11-20T09:00:00Z' });
    expect(await pedidoGeradoPorPessoa(b.db, decId)).toBeNull();
  });
});

describe('shasEntregues, recebidoComSha e recebimentoDoPedido (ADR-26, IN-11, RF-15)', () => {
  it('shasEntregues: só os sha256 de pedido_entregue do mesmo DEC no formato ^[0-9a-f]{64}$, na ordem de gravação, sem repetir', async () => {
    const a = await prepararGerado();
    const outro = await prepararGerado();
    expect(await shasEntregues(b.db, a.decId)).toEqual([]);
    for (const depois of [
      { sha256: sha(2) },
      { sha256: 'A'.repeat(64) },
      { sha256: sha(1).slice(1) },
      { sha256: `${sha(1)}0` },
      { sha256: 123 },
      { outro: sha(5) },
      { sha256: sha(1) },
      { sha256: sha(2) },
    ])
      await doConstruir('pedido_entregue', a.decId, a.demandaId, depois);
    await inserirEvento({ acao: 'pedido_entregue', decId: a.decId, demandaId: a.demandaId, atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio', ocorridoEm: '2026-11-25T10:00:00Z', entidade: 'demanda', depois: { sha256: sha(3) } });
    await doConstruir('pedido_recebido', a.decId, a.demandaId, { sha256: sha(4) });
    await doConstruir('pedido_entregue', outro.decId, outro.demandaId, { sha256: sha(6) });
    expect(await shasEntregues(b.db, a.decId)).toEqual([sha(2), sha(1)]);
    expect(await shasEntregues(b.db, outro.decId)).toEqual([sha(6)]);
    expect(await shasEntregues(b.db, 'DEC-DEM-20261112-9999-v1')).toEqual([]);
  });

  it('recebidoComSha: verdadeiro só com pedido_recebido do mesmo DEC e o mesmo hash', async () => {
    const a = await prepararGerado();
    const outro = await prepararGerado();
    await doConstruir('pedido_entregue', a.decId, a.demandaId, { sha256: sha(7) });
    expect(await recebidoComSha(b.db, a.decId, sha(7))).toBe(false);
    // Com letras, para a maiúscula ser outro texto.
    const recebidoSha = sha(0xabcdef8);
    await doConstruir('pedido_recebido', a.decId, a.demandaId, { sha256: recebidoSha });
    expect(await recebidoComSha(b.db, a.decId, recebidoSha)).toBe(true);
    expect(await recebidoComSha(b.db, a.decId, sha(7))).toBe(false);
    expect(await recebidoComSha(b.db, outro.decId, recebidoSha)).toBe(false);
    expect(await recebidoComSha(b.db, a.decId, recebidoSha.toUpperCase())).toBe(false);
    expect(await recebidoComSha(b.db, a.decId, '')).toBe(false);
  });

  it('recebimentoDoPedido: a data do primeiro pedido_recebido do DEC, ou null', async () => {
    const a = await prepararGerado();
    expect(await recebimentoDoPedido(b.db, a.decId)).toBeNull();
    await doConstruir('pedido_entregue', a.decId, a.demandaId, { sha256: sha(9) }, '2026-11-17T07:00:00Z');
    expect(await recebimentoDoPedido(b.db, a.decId)).toBeNull();
    // Gravados fora de ordem: vale o mais antigo, não o primeiro inserido.
    await doConstruir('pedido_recebido', a.decId, a.demandaId, { sha256: sha(9) }, '2026-11-20T10:00:00Z');
    await doConstruir('pedido_recebido', a.decId, a.demandaId, { sha256: sha(9) }, '2026-11-18T08:30:00Z');
    await inserirEvento({ acao: 'pedido_recebido', decId: a.decId, demandaId: a.demandaId, atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio', ocorridoEm: '2026-11-01T00:00:00Z', entidade: 'demanda' });
    const em = await recebimentoDoPedido(b.db, a.decId);
    expect(em).toBeInstanceOf(Date);
    expect(em!.toISOString()).toBe('2026-11-18T08:30:00.000Z');
    expect(await recebimentoDoPedido(b.db, 'DEC-DEM-20261112-9999-v1')).toBeNull();
  });
});

// RNF-02 e ADR-27: 200 DEC e 20 mil eventos, pelo planejador de verdade. Medir tempo exige o relógio do processo
// (performance.now()), não o Relogio dos Deps, como em resumo-da-fila.test.ts.
type NoDoPlano = { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; Plans?: NoDoPlano[] };
const nosDe = (no: NoDoPlano): NoDoPlano[] => [no, ...(no.Plans ?? []).flatMap(nosDe)];
const resumoDoPlano = (p: NoDoPlano): string =>
  nosDe(p)
    .map((n) => [n['Node Type'], n['Relation Name'], n['Index Name']].filter(Boolean).join(' '))
    .join(' > ');
const relatar = (linha: string) => process.stdout.write(`T10 ${linha}\n`);
const LIMITE_MS = 1_000;
const MINUTO = 60_000;
const BASE = Date.UTC(2026, 9, 1, 12);
const demandaDe = (i: number) => `DEM-20261001-${String(i).padStart(4, '0')}`;

// A mesma regra do SQL de carga, escrita à parte: i de 1 a 200. v1 aprovado se i % 10 <> 0; demanda final se
// i % 7 = 0; ESP v2 (desatualizado) se i % 11 = 0; v2 aprovado (substitui o v1) se i % 13 = 0; pedido_gerado de pessoa
// no v1 se i % 4 <> 0 (de agente se i % 4 = 0), o primeiro em BASE + (i * 37 % 200) min; recebido no v1 se i % 5 = 0;
// pedido_gerado de pessoa no v2 se i % 26 = 0, em BASE + 2 dias + i min.
function pendentesEsperados(): string[] {
  const itens: Array<{ decId: string; t: number }> = [];
  for (let i = 1; i <= 200; i++) {
    const final = i % 7 === 0;
    const desatualizado = i % 11 === 0;
    if (i % 10 !== 0 && !final && !desatualizado && i % 13 !== 0 && i % 4 !== 0 && i % 5 !== 0)
      itens.push({ decId: `DEC-${demandaDe(i)}-v1`, t: BASE + ((i * 37) % 200) * MINUTO });
    if (i % 26 === 0 && !final && !desatualizado) itens.push({ decId: `DEC-${demandaDe(i)}-v2`, t: BASE + 2 * 1_440 * MINUTO + i * MINUTO });
  }
  return itens.sort((x, y) => x.t - y.t || (x.decId < y.decId ? -1 : 1)).map((x) => x.decId);
}

describe('RNF-02: plano de execução de listarPendentes com 200 DEC e 20 mil eventos (EXPLAIN ANALYZE)', () => {
  let v: BancoDeTeste;
  beforeAll(async () => {
    v = await novoBanco();
    const demandas = `from generate_series(1, 200) as i`;
    const dem = `'DEM-20261001-' || lpad(i::text, 4, '0')`;
    for (const comando of [
      `insert into demanda (id, titulo, tipo, status, solicitante_nome, urgencia, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em)
       select ${dem}, 'Demanda ficticia ' || i, 'melhoria',
              case when i % 14 = 0 then 'entregue' when i % 7 = 0 then 'encerrada' else 'pronta_para_decisao' end,
              'Pessoa Ficticia', 'media', 'pessoa', 'u-ficticio-pendentes', false,
              timestamptz '2026-09-01 12:00:00+00' + i * interval '1 minute', timestamptz '2026-09-01 12:00:00+00' + i * interval '1 minute'
       ${demandas}`,
      `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'ESP-' || ${dem} || '-v' || v, ${dem}, v, 'Descricao ficticia', '["item ficticio"]'::jsonb, 'pessoa', 'u-ficticio-pendentes', false, timestamptz '2026-09-02 12:00:00+00'
       ${demandas} cross join generate_series(1, 2) as v where v = 1 or i % 11 = 0`,
      `insert into parecer_risco (id, demanda_id, versao, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'RSK-' || ${dem} || '-v1', ${dem}, 1, 'baixo', 'medio', 'alto', 'pessoa', 'u-ficticio-pendentes', false, timestamptz '2026-09-02 12:00:00+00'
       ${demandas}`,
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo,
         demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'DEC-' || ${dem} || '-v' || v, ${dem}, v, 'ESP-' || ${dem} || '-v1', 1, 'RSK-' || ${dem} || '-v1', 1, 'melhoria',
              'Demanda ficticia ' || i, 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"Opcao A ficticia"}'::jsonb, '{"descricao":"Opcao B ficticia"}'::jsonb,
              'cto', 'pessoa', 'u-ficticio-pendentes', false, timestamptz '2026-09-03 12:00:00+00'
       ${demandas} cross join generate_series(1, 2) as v where v = 1 or i % 13 = 0`,
      `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, decidida_por, decidida_em)
       select 'DEC-' || ${dem} || '-v' || v, 'aprovada', 'A', 'u-ficticio-pendentes', timestamptz '2026-09-04 12:00:00+00' + v * interval '1 day'
       ${demandas} cross join generate_series(1, 2) as v where (v = 1 and i % 10 <> 0) or (v = 2 and i % 13 = 0)`,
      // pedido_gerado no v1: de pessoa (o primeiro na ordem embaralhada, mais um depois se i % 3 = 0) ou de agente.
      `insert into evento (ocorrido_em, ator_tipo, ator_id, demanda_id, entidade, entidade_id, acao, depois)
       select timestamptz '2026-10-01 12:00:00+00' + ((i * 37) % 200) * interval '1 minute' + r * interval '1 day',
              case when i % 4 = 0 then 'agente' else 'pessoa' end, case when i % 4 = 0 then 'orquestrador' else 'u-ficticio-pendentes' end,
              ${dem}, 'pacote_decisao', 'DEC-' || ${dem} || '-v1', 'pedido_gerado', '{"confirmaSemDadoPessoal":true}'::jsonb
       ${demandas} cross join generate_series(0, 1) as r where r = 0 or (i % 3 = 0 and i % 4 <> 0)`,
      `insert into evento (ocorrido_em, ator_tipo, ator_id, demanda_id, entidade, entidade_id, acao, depois)
       select timestamptz '2026-10-03 12:00:00+00' + i * interval '1 minute', 'pessoa', 'u-ficticio-pendentes',
              ${dem}, 'pacote_decisao', 'DEC-' || ${dem} || '-v2', 'pedido_gerado', '{"confirmaSemDadoPessoal":true}'::jsonb
       ${demandas} where i % 26 = 0`,
      // O /construir: entregue nos pares, recebido nos múltiplos de 5, sempre no v1 gerado por pessoa.
      `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
       select timestamptz '2026-10-05 12:00:00+00' + i * interval '1 minute' + (a = 'pedido_recebido')::int * interval '1 minute',
              'integracao', 'construir', 'ficticio', ${dem}, 'pacote_decisao', 'DEC-' || ${dem} || '-v1', a,
              jsonb_build_object('sha256', lpad(to_hex(i), 64, '0'))
       ${demandas} cross join unnest(array['pedido_entregue', 'pedido_recebido']) as a
       where i % 4 <> 0 and ((a = 'pedido_entregue' and (i % 2 = 0 or i % 5 = 0)) or (a = 'pedido_recebido' and i % 5 = 0))`,
      // O resto do histórico, até 20 mil eventos: os atos de sempre sobre as demandas e os DEC.
      `insert into evento (ocorrido_em, ator_tipo, ator_id, demanda_id, entidade, entidade_id, acao, depois)
       select timestamptz '2026-09-05 12:00:00+00' + k * interval '1 minute', 'pessoa', 'u-ficticio-pendentes',
              'DEM-20261001-' || lpad((1 + k % 200)::text, 4, '0'),
              case when k % 6 < 4 then 'demanda' else 'pacote_decisao' end,
              case when k % 6 < 4 then 'DEM-20261001-' || lpad((1 + k % 200)::text, 4, '0') else 'DEC-DEM-20261001-' || lpad((1 + k % 200)::text, 4, '0') || '-v1' end,
              (array['status_alterado', 'campo_alterado', 'especificacao_criada', 'demanda_criada', 'aprovacao_registrada', 'decisao_registrada'])[1 + k % 6],
              '{"alterado":true}'::jsonb
       from generate_series(1, 20000 - (select count(*) from evento)::int) as k`,
      'analyze',
    ]) {
      await v.poolMigrator.query(comando);
    }
  });
  afterAll(async () => {
    await v.fechar();
  });

  it('a carga tem 200 demandas, 200 DEC v1 e 20 mil eventos', async () => {
    const { rows } = await v.poolMigrator.query<{ demandas: number; decs: number; eventos: number }>(
      `select (select count(*) from demanda)::int as demandas, (select count(*) from pacote_decisao where versao = 1)::int as decs, (select count(*) from evento)::int as eventos`,
    );
    expect(rows[0]).toEqual({ demandas: 200, decs: 200, eventos: 20_000 });
  });

  it('devolve exatamente os pendentes da regra, na ordem do primeiro pedido_gerado e do id', async () => {
    const esperado = pendentesEsperados();
    expect(esperado.length).toBeGreaterThan(20);
    expect((await listarPendentes(v.db)).map((i) => i.decId)).toEqual(esperado);
  });

  it('uma consulta só, que usa evento_acao_entidade_idx, não varre evento inteira e roda abaixo de 1 s', async () => {
    const consultas: Array<{ sql: string; params: unknown[] }> = [];
    const db: Db = drizzle(v.poolApp, { schema, casing: 'snake_case', logger: { logQuery: (sql, params) => consultas.push({ sql, params }) } });
    const inicio = performance.now();
    const itens = await listarPendentes(db);
    const ms = performance.now() - inicio;
    expect(itens.length).toBeGreaterThan(20);
    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.sql).toMatch(/^select /);
    const r = await v.poolApp.query<{ 'QUERY PLAN': Array<{ Plan: NoDoPlano; 'Execution Time': number }> }>(
      `explain (analyze, format json) ${consultas[0]!.sql}`,
      consultas[0]!.params,
    );
    const { Plan: plano, 'Execution Time': execucao } = r.rows[0]!['QUERY PLAN'][0]!;
    relatar(`EXPLAIN listarPendentes (${itens.length} itens, chamada ${ms.toFixed(1)} ms, execução ${execucao.toFixed(1)} ms): ${resumoDoPlano(plano)}`);
    const nos = nosDe(plano);
    expect(nos.filter((n) => n['Index Name'] === 'evento_acao_entidade_idx').length).toBeGreaterThan(0);
    expect(nos.filter((n) => n['Node Type'] === 'Seq Scan' && n['Relation Name'] === 'evento')).toEqual([]);
    expect(execucao).toBeLessThan(LIMITE_MS);
    expect(ms).toBeLessThan(LIMITE_MS);
  });
});
