// src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts — 06-T06-testes do DEC-DEM-20261111-0018-v1 (qa-automacao;
// RF-03, SB-11, decisão S1 de Fabiano e 7.1). Testes adversariais do arquivamento pelo aprovado vigente, além dos do
// engenheiro (arquivar-com-vigente.test.ts):
// - o critério do pedido pelas rotas reais: PATCH da decisão (arquivar o v2) → demanda em aprovada → POST do pedido do v1
//   (200, válido para o /construir) → GET da situação pelo token construir (vigente); o v2 não gera e não tem situação;
// - arquivar nunca leva a aprovada com o vigente desatualizado pelo RSK novo (o engenheiro só desatualiza pela ESP), nem
//   com aprovação incompleta: a dupla aprovação com só o CTO, um DEC mais novo incompleto e atualizado por cima de um
//   aprovado desatualizado, e um DEC anterior devolvido, que não conta como vigente;
// - um DEC mais novo incompleto não esconde o vigente completo e atualizado: arquivar leva a aprovada e o v1 gera;
// - corrida em duas conexões: arquivar × RSK novo, nas duas ordens (o inventário G8, linha 3, está "sem mudança" e sem
//   teste na T06), e arquivar × completar a aprovação do v1 de dupla aprovação.
// Em todo caso que não termina em aprovada, o predicado da transição manual (temPacoteAprovadoAtualizado) é falso e o v1
// não gera; nos que terminam em aprovada, é verdadeiro e o v1 gera. Postgres real, papel do app, serviços e rotas reais;
// relógio fixo; uma autora por demanda (C-36); dados só fictícios.
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { chamarRota } from '../../../test/requisicao';
import { chamadasDoConstruir } from '../../../test/pedidos-construcao';
import { criarPessoa } from '../../../test/sessao';
import { PATCH as PATCH_DECISAO } from '../../app/api/pacotes-decisao/[decId]/decisao/route';
import { POST as POST_PEDIDO } from '../../app/api/pacotes-decisao/[decId]/pedido-construcao/route';
import { criarDb } from '../../db';
import { demanda, evento } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { AtorPessoa } from '../acesso/ator';
import { criarTokenDeIntegracao } from '../acesso/tokens-servico';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { gerarPedido, MENSAGENS_PEDIDO } from '../pedido-construcao/gerar';
import { obterPacoteDecisao } from './consultas';
import { criarPacoteDecisao } from './criar';
import { MENSAGENS_DECISAO, registrarDecisao } from './decidir';
import { temPacoteAprovadoAtualizado } from './desatualizado';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from './schemas';
import { vigenteDaDemanda } from './substituido';

type Nivel = 'cto' | 'cto_e_administradora';
type Cenario = { autora: AtorPessoa; demandaId: string };

const relogio = relogioFixo('2026-11-14T15:00:00Z');
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-arq-qa-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const DOC = { referenciaDocumento: 'DOC-FICTICIO-018-QA', dataDocumento: '2026-11-14' };
const RSK_BAIXO = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const RSK_NOVO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

const decisaoDe = (corpo: Record<string, unknown>) => registrarDecisaoSchema.parse(corpo);
const aprovar = (extra: Record<string, unknown> = {}) => decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...extra });
const arquivar = () => decisaoDe({ statusDecisao: 'arquivada' });
const devolver = () => decisaoDe({ statusDecisao: 'devolvida' });
const espDe = (descricaoObjetiva: string) =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva,
    escopoInclui: ['Conferência de estoque'],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: ['O estoque confere no fim do dia'],
    definicaoDePronto: ['pnpm test verde'],
  });

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let tokenConstruir: string;
let autoras = 0;
// As linhas do pino das rotas: o nome do solicitante não vai ao log.
const linhasDoLog: string[] = [];
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-arq-qa-${++autoras}`, nome: 'Pessoa Ficticia CTO', papel: 'cto' });
// Os serviços sem a fila, como no teste do engenheiro: nenhum job nasce no meio das corridas.
const srv = () => ({ db: deps.db, pool: deps.pool, relogio });
const construir = chamadasDoConstruir(() => tokenConstruir);

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenConstruir = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

const migrator = () => criarDb(b.poolMigrator);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;
const eventosDa = (demandaId: string) => migrator().select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(asc(evento.id));
const statusAlteradosDa = async (demandaId: string) => (await eventosDa(demandaId)).filter((e) => e.acao === 'status_alterado');
const pedidosGeradosDa = async (demandaId: string) => (await eventosDa(demandaId)).filter((e) => e.acao === 'pedido_gerado').map((e) => e.entidadeId);

const decidirPelaRota = (decId: string, corpo: unknown) =>
  chamarRota(PATCH_DECISAO, { metodo: 'PATCH', caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}/decisao`, params: { decId }, corpo, cookie: cookieCto });
const gerarPelaRota = (decId: string) =>
  chamarRota(POST_PEDIDO, { metodo: 'POST', caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}/pedido-construcao`, params: { decId }, corpo: CONFIRMADO, cookie: cookieCto });

async function demandaComEspERsk(): Promise<Cenario> {
  const autora = novaAutora();
  const d = await criarDemanda(
    srv(),
    autora,
    criarDemandaSchema.parse({ titulo: 'Conferência de estoque (fictício)', tipo: 'melhoria', solicitanteNome: 'Bruna Exemplar', contexto: 'O estoque é conferido à mão.' }),
  );
  await criarEspecificacao(srv(), autora, d.id, espDe('Conferir o estoque automaticamente'));
  await criarParecerRisco(srv(), autora, d.id, criarParecerRiscoSchema.parse(RSK_BAIXO));
  return { autora, demandaId: d.id };
}

const novoDec = async (c: Cenario, nivel: Nivel = 'cto') =>
  (
    await criarPacoteDecisao(
      srv(),
      c.autora,
      c.demandaId,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'Conferir no sistema' }, opcaoB: { descricao: 'Manter a planilha' }, nivelAprovacaoRequerido: nivel }),
    )
  ).id;

async function comV1Aprovado(nivel: Nivel = 'cto'): Promise<Cenario & { v1: string }> {
  const c = await demandaComEspERsk();
  const v1 = await novoDec(c, nivel);
  if (nivel === 'cto_e_administradora') await registrarDecisao(srv(), administradora, v1, aprovar(DOC));
  await registrarDecisao(srv(), c.autora, v1, aprovar());
  expect((await obterPacoteDecisao(b.db, v1)).statusDecisao).toBe('aprovada');
  return { ...c, v1 };
}

// Não terminou em aprovada: o predicado da transição manual é falso, e o v1 não gera (nem evento de pedido).
async function semAtalhoParaAprovada(c: Cenario, v1: string): Promise<void> {
  expect(await statusDa(c.demandaId)).not.toBe('aprovada');
  expect(await temPacoteAprovadoAtualizado(b.db, c.demandaId)).toBe(false);
  await expect(gerarPedido(srv(), c.autora, v1, CONFIRMADO)).rejects.toMatchObject({ codigo: 'conflito' });
  expect(await pedidosGeradosDa(c.demandaId)).toEqual([]);
}

// Espera até uma conexão estar na fila da trava de linha da demanda (FOR UPDATE espera em transactionid ou tuple).
async function esperarTrava(): Promise<void> {
  for (let i = 0; i < 500; i++) {
    const { rows } = await b.poolMigrator.query<{ n: number }>(
      "select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and wait_event in ('transactionid', 'tuple') and pid <> pg_backend_pid()",
    );
    if (rows[0]!.n > 0) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('a segunda transação não chegou à espera da trava');
}

function sinal(): { promessa: Promise<void>; disparar: () => void } {
  let disparar!: () => void;
  const promessa = new Promise<void>((r) => {
    disparar = r;
  });
  return { promessa, disparar: () => disparar() };
}

describe('critério 3 do pedido pelas rotas: v1 aprovado e v2 pendente; arquivar o v2 → aprovada, e o v1 gera', () => {
  it('PATCH arquivar o v2 → 200 e aprovada pelo Sistema; POST do pedido do v1 → 200, válido; situação do v1 vigente; o v2 não gera nem tem situação', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    expect(await statusDa(c.demandaId)).toBe('pronta_para_decisao');

    const r = await decidirPelaRota(v2, { statusDecisao: 'arquivada' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ resultado: 'arquivada', pacote: { id: v2, statusDecisao: 'arquivada' } });
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    expect((await statusAlteradosDa(c.demandaId)).at(-1)).toMatchObject({ atorTipo: 'sistema', atorId: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'aprovada' } });
    expect(await temPacoteAprovadoAtualizado(b.db, c.demandaId)).toBe(true);

    const p = await gerarPelaRota(c.v1);
    expect(p.status).toBe(200);
    const pedido = JSON.parse(await p.text());
    expect(validarPedido(pedido)).toEqual({ ok: true, erros: [] });
    expect(pedido).toMatchObject({ pedido: c.v1, decisao: { id: c.v1 } });
    expect(await pedidosGeradosDa(c.demandaId)).toEqual([c.v1]);

    const s = await construir.situacao(c.v1);
    expect(s.status).toBe(200);
    expect(await s.text()).toBe('{"situacao":"vigente"}');

    const p2 = await gerarPelaRota(v2);
    expect(p2.status).toBe(409);
    expect(await p2.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
    const s2 = await construir.situacao(v2);
    expect(s2.status).toBe(404);
    expect(await s2.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await pedidosGeradosDa(c.demandaId)).toEqual([c.v1]);
    expect(linhasDoLog.filter((l) => l.includes('"rota"')).length).toBeGreaterThanOrEqual(5);
    expect(linhasDoLog.join('\n')).not.toContain('Bruna Exemplar');
  });
});

describe('SB-11: arquivar nunca leva a aprovada com o vigente desatualizado ou com aprovação incompleta', () => {
  it('RSK novo depois do v1 (e não ESP): v1 desatualizado, v2 pendente e atualizado; arquivar o v2 → em_analise, e o v1 não gera', async () => {
    const c = await comV1Aprovado();
    await criarParecerRisco(srv(), c.autora, c.demandaId, criarParecerRiscoSchema.parse(RSK_NOVO));
    const v2 = await novoDec(c);
    expect((await obterPacoteDecisao(b.db, v2)).desatualizado).toBe(false);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toEqual({ id: c.v1, nivel: 'cto', desatualizado: true });
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    expect((await statusAlteradosDa(c.demandaId)).at(-1)).toMatchObject({ atorTipo: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'em_analise' } });
    await expect(gerarPedido(srv(), c.autora, c.v1, CONFIRMADO)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.desatualizado });
    await semAtalhoParaAprovada(c, c.v1);
  });

  it('dupla aprovação só com o CTO (a outra ordem do SB-11 c): vigente nulo; arquivar o v2 → encerrada, e o v1 não gera', async () => {
    const c = await demandaComEspERsk();
    const v1 = await novoDec(c, 'cto_e_administradora');
    expect((await registrarDecisao(srv(), c.autora, v1, aprovar())).resultado).toBe('aprovacao_parcial');
    const v2 = await novoDec(c);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toBeNull();
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('encerrada');
    expect((await statusAlteradosDa(c.demandaId)).at(-1)).toMatchObject({ atorTipo: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'encerrada' } });
    await semAtalhoParaAprovada(c, v1);
  });

  it('DEC mais novo incompleto e atualizado por cima de um aprovado desatualizado: o incompleto não conta; arquivar o v3 → em_analise', async () => {
    const c = await comV1Aprovado();
    await criarEspecificacao(srv(), c.autora, c.demandaId, espDe('Conferir o estoque automaticamente, versão 2'));
    const v2 = await novoDec(c, 'cto_e_administradora');
    expect((await registrarDecisao(srv(), administradora, v2, aprovar(DOC))).resultado).toBe('aprovacao_parcial');
    expect((await obterPacoteDecisao(b.db, v2)).desatualizado).toBe(false);
    const v3 = await novoDec(c);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toEqual({ id: c.v1, nivel: 'cto', desatualizado: true });
    await registrarDecisao(srv(), c.autora, v3, arquivar());
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    await semAtalhoParaAprovada(c, c.v1);
    await expect(gerarPedido(srv(), c.autora, v2, CONFIRMADO)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
  });

  it('DEC anterior devolvido não é vigente: v1 devolvido, v2 pendente; arquivar o v2 → encerrada', async () => {
    const c = await demandaComEspERsk();
    const v1 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v1, devolver());
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    const v2 = await novoDec(c);
    expect(await statusDa(c.demandaId)).toBe('pronta_para_decisao');
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toBeNull();
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('encerrada');
    await semAtalhoParaAprovada(c, v1);
  });

  it('o outro lado: DEC mais novo incompleto não esconde o vigente completo e atualizado; arquivar o v3 → aprovada, e o v1 gera', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c, 'cto_e_administradora');
    expect((await registrarDecisao(srv(), administradora, v2, aprovar(DOC))).resultado).toBe('aprovacao_parcial');
    const v3 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v3, arquivar());
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    expect(await temPacoteAprovadoAtualizado(b.db, c.demandaId)).toBe(true);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toEqual({ id: c.v1, nivel: 'cto', desatualizado: false });
    expect(JSON.parse((await gerarPedido(srv(), c.autora, c.v1, CONFIRMADO)).json)).toMatchObject({ pedido: c.v1 });
    expect(await pedidosGeradosDa(c.demandaId)).toEqual([c.v1]);
  });
});

describe('SB-11 (d) com o RSK: arquivar o v2 × RSK novo da mesma demanda, em duas conexões', () => {
  it('(i) o RSK novo segura a trava; o arquivamento espera → vê o v1 desatualizado e leva a em_analise, nunca aprovada', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    const gravou = sinal();
    const soltar = sinal();
    const rsk = comTransacao(b.poolApp, async (t) => {
      await criarParecerRisco(srv(), c.autora, c.demandaId, criarParecerRiscoSchema.parse(RSK_NOVO), t);
      gravou.disparar();
      await soltar.promessa;
    });
    await gravou.promessa;
    const arquivamento = registrarDecisao(srv(), c.autora, v2, arquivar());
    try {
      await esperarTrava();
    } finally {
      soltar.disparar();
    }
    await rsk;
    expect((await arquivamento).resultado).toBe('arquivada');
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toMatchObject({ id: c.v1, desatualizado: true });
    await semAtalhoParaAprovada(c, c.v1);
  });

  it('(ii) o arquivamento segura a trava; o RSK novo espera → aprovada com o v1 atualizado no commit, e o RSK vem depois', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    const arquivou = sinal();
    const soltar = sinal();
    let atualizadoNoCommit: boolean | null = null;
    const arquivamento = comTransacao(b.poolApp, async (t) => {
      await registrarDecisao(srv(), c.autora, v2, arquivar(), t);
      atualizadoNoCommit = await temPacoteAprovadoAtualizado(t.tx, c.demandaId);
      arquivou.disparar();
      await soltar.promessa;
    });
    await arquivou.promessa;
    const rsk = criarParecerRisco(srv(), c.autora, c.demandaId, criarParecerRiscoSchema.parse(RSK_NOVO));
    try {
      await esperarTrava();
    } finally {
      soltar.disparar();
    }
    await arquivamento;
    await rsk;
    expect(atualizadoNoCommit).toBe(true);
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    const evs = await eventosDa(c.demandaId);
    const iAprovada = evs.findIndex((e) => e.acao === 'status_alterado' && (e.depois as { status?: string } | null)?.status === 'aprovada');
    const iRskV2 = evs.findIndex((e) => e.acao === 'parecer_risco_criado' && e.entidadeId.endsWith('-v2'));
    expect(iAprovada).toBeGreaterThanOrEqual(0);
    expect(iRskV2).toBeGreaterThan(iAprovada);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toMatchObject({ id: c.v1, desatualizado: true });
  });
});

describe('aprovação incompleta × arquivamento, em duas conexões', () => {
  it('completar a aprovação do v1 de dupla aprovação ao mesmo tempo que arquivar o v2: o v1 nunca completa, e a demanda termina em encerrada (5 vezes)', async () => {
    for (let i = 0; i < 5; i++) {
      const c = await demandaComEspERsk();
      const v1 = await novoDec(c, 'cto_e_administradora');
      expect((await registrarDecisao(srv(), administradora, v1, aprovar(DOC))).resultado).toBe('aprovacao_parcial');
      const v2 = await novoDec(c);
      const [completar, arq] = await Promise.allSettled([registrarDecisao(srv(), c.autora, v1, aprovar()), registrarDecisao(srv(), c.autora, v2, arquivar())]);
      expect(arq.status).toBe('fulfilled');
      expect(completar.status).toBe('rejected');
      expect((completar as PromiseRejectedResult).reason).toMatchObject({ codigo: 'conflito' });
      expect([MENSAGENS_DECISAO.naoEhOMaisNovo, MENSAGENS_DECISAO.demandaFinal]).toContain((completar as PromiseRejectedResult).reason.mensagem);
      expect(await statusDa(c.demandaId)).toBe('encerrada');
      expect(await vigenteDaDemanda(b.db, c.demandaId)).toBeNull();
    }
  });
});
