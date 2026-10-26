// Serviço de demanda contra o Postgres real, pelo papel do app (RF-03, RF-06, RF-07, C-11, C-30, C-36). Dados só
// fictícios; o relógio é sempre o fixo.
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { decisao, demanda, especificacaoTecnica, evento, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../acesso/ator';
import { listarHistorico } from '../historico/consultas';
import { MENSAGEM_LIMITE } from '../limites';
import { idVersao } from '../versoes';
import { criarDemandaSchema, type Status } from './schemas';
import { alterarDemanda, criarDemanda } from './servico';
import { mudarStatusPeloSistema, type TransicaoAutomatica } from './transicoes';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-dem-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-dem-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'Ab3dE5gH' };
const sistema: AtorSistema = { tipo: 'sistema' };

const entrada = criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: 'Pessoa Ficticia CTO', email: 'dem-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: 'Pessoa Ficticia Adm', email: 'dem-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  // Cada teste num dia próprio: o limite de 30 por hora (C-36) de um teste não entra no outro.
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const eventosDa = (demandaId: string) => b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);
const ultimoValorDaSequencia = async () => (await b.poolMigrator.query<{ v: string }>('select last_value as v from demanda_seq')).rows[0]!.v;

async function demandaEm(status: Status, extra: Partial<typeof demanda.$inferInsert> = {}): Promise<string> {
  const d = await criarDemanda(deps, cto, entrada);
  await migrator().update(demanda).set({ status, ...extra }).where(eq(demanda.id, d.id));
  return d.id;
}

// ESP v1, RSK v1 e DEC v1 da demanda; com `decisaoDoDec`, a decisão gravada (como a T21 fará).
async function comPacote(demandaId: string, decisaoDoDec?: 'aprovada' | 'devolvida'): Promise<void> {
  const db = migrator();
  const agora = relogio.agora();
  const autor = { autorTipo: 'pessoa' as const, autorId: cto.usuarioId, rascunhoAgente: false, criadaEm: agora };
  await db.insert(especificacaoTecnica).values({ ...autor, id: idVersao('ESP', demandaId, 1), demandaId, versao: 1, descricaoObjetiva: 'x', escopoInclui: ['x'] });
  await db.insert(parecerRisco).values({ ...autor, id: idVersao('RSK', demandaId, 1), demandaId, versao: 1, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
  await db.insert(pacoteDecisao).values({
    ...autor,
    id: idVersao('DEC', demandaId, 1),
    demandaId,
    versao: 1,
    especificacaoId: idVersao('ESP', demandaId, 1),
    especificacaoVersao: 1,
    parecerRiscoId: idVersao('RSK', demandaId, 1),
    parecerRiscoVersao: 1,
    demandaTipo: 'bug',
    demandaTitulo: 'x',
    demandaDescricao: 'x',
    resumoExecutivo: 'x',
    opcaoA: { descricao: 'A' },
    opcaoB: { descricao: 'B' },
    nivelAprovacaoRequerido: 'cto',
  });
  if (decisaoDoDec)
    await db.insert(decisao).values({
      pacoteDecisaoId: idVersao('DEC', demandaId, 1),
      statusDecisao: decisaoDoDec,
      opcaoEscolhida: decisaoDoDec === 'aprovada' ? 'A' : null,
      decididaPor: cto.usuarioId,
      decididaEm: agora,
    });
}

const erroDe = async (p: Promise<unknown>): Promise<ErroDominio> => {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
};

describe('criarDemanda', () => {
  it('CA-03.1: pessoa cria com id DEM-AAAAMMDD-NNNN, status nova e evento demanda_criada', async () => {
    relogio.definir('2026-10-22T23:30:00-03:00');
    const d = await criarDemanda(deps, cto, { ...entrada, solicitantePapel: 'operacoes', urgencia: 'alta', anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }] });
    expect(d.id).toMatch(/^DEM-20261022-\d{4}$/);
    expect(d).toMatchObject({
      titulo: 'Pedidos duplicados',
      tipo: 'bug',
      status: 'nova',
      solicitanteNome: 'Pessoa Ficticia',
      solicitantePapel: 'operacoes',
      urgencia: 'alta',
      linhaServicoProvavel: null,
      anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }],
      duvidasEntrada: [],
      rascunhoAgente: false,
      responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' },
      criadaEm: relogio.agora(),
      atualizadaEm: relogio.agora(),
      especificacoes: [],
      pareceresRisco: [],
      pacotesDecisao: [],
    });
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha).toMatchObject({ autorTipo: 'pessoa', autorId: cto.usuarioId, rascunhoAgente: false });
    const evs = await eventosDa(d.id);
    expect(evs).toEqual([
      expect.objectContaining({
        atorTipo: 'pessoa',
        atorId: cto.usuarioId,
        entidade: 'demanda',
        entidadeId: d.id,
        acao: 'demanda_criada',
        antes: null,
        depois: { status: 'nova', tipo: 'bug' },
        ocorridoEm: relogio.agora(),
      }),
    ]);
  });

  it('C-11: criada por token de agente fica rascunho_agente = true e autor agente, mesmo com rascunhoAgente:false no corpo', async () => {
    const corpo = criarDemandaSchema.parse({ ...entrada, rascunhoAgente: false, autorTipo: 'pessoa', autorId: cto.usuarioId, responsavel: 'pessoa' });
    const d = await criarDemanda(deps, orquestrador, corpo);
    expect(d.rascunhoAgente).toBe(true);
    expect(d.responsavel).toEqual({ tipo: 'agente', agente: 'orquestrador' });
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha).toMatchObject({ autorTipo: 'agente', autorId: 'orquestrador', rascunhoAgente: true });
    const [ev] = await eventosDa(d.id);
    expect(ev).toMatchObject({ atorTipo: 'agente', atorId: 'orquestrador', atorTokenPrefixo: 'Ab3dE5gH', acao: 'demanda_criada' });
  });

  it('C-11: chave que não é campo da demanda não chega ao banco, mesmo que o chamador a passe', async () => {
    const d = await criarDemanda(deps, cto, { ...entrada, status: 'aprovada', rascunhoAgente: true, autorId: 'x', id: 'DEM-20991231-9999' } as never);
    expect(d.id).not.toBe('DEM-20991231-9999');
    expect(d).toMatchObject({ status: 'nova', rascunhoAgente: false, responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' } });
  });

  it('agente que não é o orquestrador e o ator sistema recebem sem_permissao, e nada é gravado nem a sequência anda', async () => {
    const antes = await ultimoValorDaSequencia();
    const [{ n: total }] = (await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from demanda')).rows as [{ n: number }];
    for (const ator of [{ tipo: 'agente', agente: 'risco', prefixoToken: null } as AtorAgente, sistema])
      expect(await erroDe(criarDemanda(deps, ator, entrada))).toMatchObject({ codigo: 'sem_permissao' });
    expect(await ultimoValorDaSequencia()).toBe(antes);
    expect((await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from demanda')).rows[0]!.n).toBe(total);
  });

  it('duvidasEntrada do chamador fica na demanda, que nasce nova (a transição é de quem chama)', async () => {
    const d = await criarDemanda(deps, orquestrador, entrada, undefined, { duvidasEntrada: ['Qual é o ERP?', 'Desde quando?'] });
    expect(d).toMatchObject({ status: 'nova', duvidasEntrada: ['Qual é o ERP?', 'Desde quando?'] });
  });

  it('com a transação do chamador, a demanda some se ela for desfeita', async () => {
    let id = '';
    await expect(
      comTransacao(b.poolApp, async (t) => {
        const d = await criarDemanda(deps, cto, entrada, t);
        id = d.id;
        expect(d.status).toBe('nova');
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(id).toMatch(/^DEM-/);
    expect(await b.db.select().from(demanda).where(eq(demanda.id, id))).toEqual([]);
    expect(await eventosDa(id)).toEqual([]);
  });

  it('C-36: a 31ª demanda do mesmo ator na mesma hora responde 429; outra hora, passa', async () => {
    for (let i = 0; i < 30; i++) {
      await criarDemanda(deps, administradora, entrada);
      relogio.avancar(60_000);
    }
    const antes = await ultimoValorDaSequencia();
    const e = await erroDe(criarDemanda(deps, administradora, entrada));
    expect(e).toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.demanda });
    // C-36: o id só é gerado depois do limite; o 429 não gasta número da sequência.
    expect(await ultimoValorDaSequencia()).toBe(antes);
    // Outro ator na mesma hora passa.
    await expect(criarDemanda(deps, cto, entrada)).resolves.toMatchObject({ status: 'nova' });
    relogio.avancar(3_600_000);
    await expect(criarDemanda(deps, administradora, entrada)).resolves.toMatchObject({ status: 'nova' });
  });

  it('C-36: 35 criações simultâneas do mesmo ator → exatamente 30 gravadas e 5 com 429', async () => {
    const r = await Promise.allSettled(Array.from({ length: 35 }, () => criarDemanda(deps, administradora, entrada)));
    const ok = r.filter((x) => x.status === 'fulfilled');
    const recusadas = r.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
    expect(ok).toHaveLength(30);
    expect(recusadas).toHaveLength(5);
    for (const x of recusadas) expect(x.reason).toMatchObject({ codigo: 'limite_excedido' });
  });

  it('C-30: o evento de criação não leva o nome do solicitante nem texto livre', async () => {
    const d = await criarDemanda(deps, cto, { ...entrada, solicitanteNome: 'SENTINELA-NOME-CRIAR', contexto: 'SENTINELA-CONTEXTO-CRIAR' });
    const texto = JSON.stringify(await eventosDa(d.id));
    expect(texto).not.toContain('SENTINELA');
  });
});

describe('alterarDemanda', () => {
  it('CA-06.4: mudar linhaServicoProvavel grava evento com antes, depois, pessoa e data', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    relogio.avancar(60_000);
    const v = await alterarDemanda(deps, administradora, d.id, { linhaServicoProvavel: 'automacao_integracao' });
    expect(v).toMatchObject({ linhaServicoProvavel: 'automacao_integracao', atualizadaEm: relogio.agora(), criadaEm: d.criadaEm });
    const [ev] = (await eventosDa(d.id)).filter((e) => e.acao === 'campo_alterado');
    expect(ev).toMatchObject({
      atorTipo: 'pessoa',
      atorId: administradora.usuarioId,
      entidade: 'demanda',
      entidadeId: d.id,
      antes: { linhaServicoProvavel: null },
      depois: { linhaServicoProvavel: 'automacao_integracao' },
      ocorridoEm: relogio.agora(),
    });
    const hist = await listarHistorico(b.db, d.id);
    expect(hist[0]).toMatchObject({ acao: 'campo_alterado', ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia Adm', papel: 'administradora' } });
  });

  it('C-30: mudar solicitanteNome com sentinela não deixa o sentinela em nenhum evento', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    await alterarDemanda(deps, cto, d.id, {
      solicitanteNome: 'SENTINELA-NOME-ALTERAR',
      titulo: 'SENTINELA-TITULO',
      contexto: 'SENTINELA-CONTEXTO',
      descricaoProblema: 'SENTINELA-PROBLEMA',
      impactoPercebido: 'SENTINELA-IMPACTO',
      justificativaUrgencia: 'SENTINELA-JUSTIFICATIVA',
      anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/SENTINELA-ANEXO' }],
    });
    const linhas = await b.poolMigrator.query<{ t: string }>('select evento::text as t from evento where demanda_id = $1', [d.id]);
    expect(linhas.rows).toHaveLength(8);
    for (const l of linhas.rows) expect(l.t).not.toContain('SENTINELA');
    const alterados = (await eventosDa(d.id)).filter((e) => e.acao === 'campo_alterado');
    expect(alterados.map((e) => e.depois)).toEqual(
      expect.arrayContaining([{ solicitanteNome: { alterado: true } }, { titulo: { alterado: true } }, { anexos: { alterado: true } }]),
    );
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha).toMatchObject({ solicitanteNome: 'SENTINELA-NOME-ALTERAR', titulo: 'SENTINELA-TITULO' });
  });

  it('um evento campo_alterado por campo que mudou; o que veio igual não gera evento', async () => {
    const d = await criarDemanda(deps, cto, { ...entrada, urgencia: 'baixa', anexos: [{ tipo: 'arquivo', referencia: 'a.pdf', descricao: 'Proposta' }] });
    await alterarDemanda(deps, cto, d.id, {
      titulo: 'Pedidos duplicados',
      urgencia: 'media',
      tipo: 'melhoria',
      anexos: [{ descricao: 'Proposta', referencia: 'a.pdf', tipo: 'arquivo' }],
    });
    const alterados = (await eventosDa(d.id)).filter((e) => e.acao === 'campo_alterado');
    expect(alterados.map((e) => e.antes)).toEqual([{ tipo: 'bug' }, { urgencia: 'baixa' }]);
    expect(alterados.map((e) => e.depois)).toEqual([{ tipo: 'melhoria' }, { urgencia: 'media' }]);
  });

  it('null limpa campo opcional e registra a mudança', async () => {
    const d = await criarDemanda(deps, cto, { ...entrada, contexto: 'Contexto ficticio', urgencia: 'alta' });
    const v = await alterarDemanda(deps, cto, d.id, { contexto: null, urgencia: null });
    expect(v).toMatchObject({ contexto: null, urgencia: null });
    const alterados = (await eventosDa(d.id)).filter((e) => e.acao === 'campo_alterado');
    expect(alterados.map((e) => [e.antes, e.depois])).toEqual([
      [{ urgencia: 'alta' }, { urgencia: null }],
      [{ contexto: { alterado: true } }, { contexto: { alterado: true } }],
    ]);
  });

  it('nada alterado → entrada_invalida "Nada foi alterado."', async () => {
    const d = await criarDemanda(deps, cto, { ...entrada, contexto: 'Contexto ficticio' });
    for (const m of [{}, { titulo: 'Pedidos duplicados', contexto: 'Contexto ficticio', status: 'nova' as const }]) {
      const e = await erroDe(alterarDemanda(deps, cto, d.id, m));
      expect(e).toMatchObject({ codigo: 'entrada_invalida', mensagem: 'Nada foi alterado.' });
    }
    expect(await eventosDa(d.id)).toHaveLength(1);
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha!.atualizadaEm).toEqual(d.atualizadaEm);
  });

  it('demanda inexistente → nao_encontrado', async () => {
    expect(await erroDe(alterarDemanda(deps, cto, 'DEM-20261022-9999', { titulo: 'x' }))).toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('CA-07.4 na regra: agente e sistema recebem sem_permissao, e nada muda', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    for (const ator of [orquestrador, sistema])
      expect(await erroDe(alterarDemanda(deps, ator as never, d.id, { status: 'em_analise' }))).toMatchObject({ codigo: 'sem_permissao' });
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha!.status).toBe('nova');
  });

  it('nova → em_analise muda, registra status_alterado com a pessoa e devolve a vista', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    const v = await alterarDemanda(deps, cto, d.id, { status: 'em_analise' });
    expect(v.status).toBe('em_analise');
    const evs = (await eventosDa(d.id)).filter((e) => e.acao === 'status_alterado');
    expect(evs).toEqual([expect.objectContaining({ atorTipo: 'pessoa', atorId: cto.usuarioId, antes: { status: 'nova' }, depois: { status: 'em_analise' } })]);
  });

  it('CA-07.1: pronta_para_decisao → aprovada sem DEC aprovado responde 409 com o motivo e não muda', async () => {
    const id = await demandaEm('pronta_para_decisao');
    const semDec = await erroDe(alterarDemanda(deps, cto, id, { status: 'aprovada' }));
    expect(semDec).toMatchObject({ codigo: 'conflito', mensagem: 'a demanda não tem pacote de decisão aprovado e atualizado.' });
    await comPacote(id);
    expect(await erroDe(alterarDemanda(deps, cto, id, { status: 'aprovada' }))).toMatchObject({ codigo: 'conflito' });
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, id));
    expect(linha!.status).toBe('pronta_para_decisao');
    expect((await eventosDa(id)).filter((e) => e.acao === 'status_alterado')).toEqual([]);
  });

  it('CA-07.1: com DEC devolvido também não aprova', async () => {
    const id = await demandaEm('pronta_para_decisao');
    await comPacote(id, 'devolvida');
    expect(await erroDe(alterarDemanda(deps, cto, id, { status: 'aprovada' }))).toMatchObject({ codigo: 'conflito' });
  });

  it('pronta_para_decisao → aprovada com DEC aprovado e atualizado muda', async () => {
    const id = await demandaEm('pronta_para_decisao');
    await comPacote(id, 'aprovada');
    await expect(alterarDemanda(deps, cto, id, { status: 'aprovada' })).resolves.toMatchObject({ status: 'aprovada' });
  });

  it('DEC aprovado que ficou desatualizado por ESP ou RSK nova não aprova a demanda', async () => {
    for (const nova of ['ESP', 'RSK'] as const) {
      const id = await demandaEm('pronta_para_decisao');
      await comPacote(id, 'aprovada');
      const autor = { autorTipo: 'pessoa' as const, autorId: cto.usuarioId, rascunhoAgente: false, criadaEm: relogio.agora(), demandaId: id, versao: 2 };
      if (nova === 'ESP') await migrator().insert(especificacaoTecnica).values({ ...autor, id: idVersao('ESP', id, 2), descricaoObjetiva: 'x', escopoInclui: ['x'] });
      else await migrator().insert(parecerRisco).values({ ...autor, id: idVersao('RSK', id, 2), riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
      expect(await erroDe(alterarDemanda(deps, cto, id, { status: 'aprovada' })), nova).toMatchObject({
        codigo: 'conflito',
        mensagem: 'a demanda não tem pacote de decisão aprovado e atualizado.',
      });
    }
  });

  it('DEC aprovado de outra demanda não vale', async () => {
    const outra = await demandaEm('pronta_para_decisao');
    await comPacote(outra, 'aprovada');
    const id = await demandaEm('pronta_para_decisao');
    expect(await erroDe(alterarDemanda(deps, cto, id, { status: 'aprovada' }))).toMatchObject({ codigo: 'conflito' });
  });

  it('CA-07.2: estudo em aprovada → em_construcao responde 409; mudar o tipo para estudo na mesma chamada também', async () => {
    const estudo = await demandaEm('aprovada', { tipo: 'estudo' });
    expect(await erroDe(alterarDemanda(deps, cto, estudo, { status: 'em_construcao' }))).toMatchObject({
      codigo: 'conflito',
      mensagem: 'demanda do tipo Estudo não vai para construção.',
    });
    const bug = await demandaEm('aprovada');
    expect(await erroDe(alterarDemanda(deps, cto, bug, { status: 'em_construcao', tipo: 'estudo' }))).toMatchObject({ codigo: 'conflito' });
    // A recusa desfaz a chamada inteira: o tipo também não mudou.
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, bug));
    expect(linha).toMatchObject({ tipo: 'bug', status: 'aprovada' });
    expect((await eventosDa(bug)).filter((e) => e.acao !== 'demanda_criada')).toEqual([]);
  });

  it('CA-07.3: em_construcao → entregue muda e registra a pessoa', async () => {
    const id = await demandaEm('em_construcao');
    relogio.avancar(5_000);
    const v = await alterarDemanda(deps, administradora, id, { status: 'entregue' });
    expect(v).toMatchObject({ status: 'entregue', atualizadaEm: relogio.agora() });
    const hist = await listarHistorico(b.db, id);
    expect(hist[0]).toMatchObject({
      acao: 'status_alterado',
      antes: { status: 'em_construcao' },
      depois: { status: 'entregue' },
      ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia Adm', papel: 'administradora' },
      ocorridoEm: relogio.agora(),
    });
  });

  it('CA-07.5: entregue não muda de status, com o motivo da tela', async () => {
    const id = await demandaEm('entregue');
    expect(await erroDe(alterarDemanda(deps, cto, id, { status: 'em_analise' }))).toMatchObject({
      codigo: 'conflito',
      mensagem: 'Entregue é um status final. Não há próxima mudança.',
    });
  });

  it('campos e status na mesma chamada: os dois mudam, com um evento cada', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    const v = await alterarDemanda(deps, cto, d.id, { urgencia: 'alta', status: 'em_analise' });
    expect(v).toMatchObject({ urgencia: 'alta', status: 'em_analise' });
    expect((await eventosDa(d.id)).map((e) => e.acao)).toEqual(['demanda_criada', 'campo_alterado', 'status_alterado']);
  });

  it('com a transação do chamador, a mudança some se ela for desfeita', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await alterarDemanda(deps, cto, d.id, { titulo: 'Outro titulo' }, t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha!.titulo).toBe('Pedidos duplicados');
    expect(await eventosDa(d.id)).toHaveLength(1);
  });

  it('duas alterações ao mesmo tempo na mesma demanda são postas em fila pela trava: as duas gravam', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    await Promise.all([alterarDemanda(deps, cto, d.id, { urgencia: 'alta' }), alterarDemanda(deps, administradora, d.id, { linhaServicoProvavel: 'indefinida' })]);
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, d.id));
    expect(linha).toMatchObject({ urgencia: 'alta', linhaServicoProvavel: 'indefinida' });
  });
});

describe('mudarStatusPeloSistema', () => {
  const casos: Array<[TransicaoAutomatica, Status[], Status]> = [
    ['duvida_em_aberto', ['nova', 'em_analise', 'pronta_para_decisao'], 'aguardando_informacao'],
    ['dec_criado', ['nova', 'em_analise', 'aguardando_informacao'], 'pronta_para_decisao'],
    ['decisao_devolvida', ['nova', 'aguardando_informacao', 'pronta_para_decisao'], 'em_analise'],
    ['decisao_arquivada', ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao'], 'encerrada'],
  ];
  const TODOS: Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'encerrada', 'aprovada', 'em_construcao', 'entregue', 'devolvida'];

  it.each(casos)('%s: da origem permitida vai ao destino, com evento de ator sistema; fora dela, nada muda', async (motivo, origens, destino) => {
    for (const de of TODOS) {
      const id = await demandaEm(de);
      relogio.avancar(1_000);
      await comTransacao(b.poolApp, (t) => mudarStatusPeloSistema(t, deps, id, motivo));
      const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, id));
      const evs = (await eventosDa(id)).filter((e) => e.acao === 'status_alterado');
      if (origens.includes(de)) {
        expect(linha, `${motivo} de ${de}`).toMatchObject({ status: destino, atualizadaEm: relogio.agora() });
        expect(evs).toEqual([
          expect.objectContaining({ atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null, antes: { status: de }, depois: { status: destino }, ocorridoEm: relogio.agora() }),
        ]);
      } else {
        expect(linha!.status, `${motivo} de ${de}`).toBe(de);
        expect(evs).toEqual([]);
      }
    }
  });

  it('roda dentro da transação de quem chama: desfeita, o status volta', async () => {
    const id = await demandaEm('em_analise');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await mudarStatusPeloSistema(t, deps, id, 'duvida_em_aberto');
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    const [linha] = await b.db.select().from(demanda).where(eq(demanda.id, id));
    expect(linha!.status).toBe('em_analise');
  });

  it('demanda inexistente → nao_encontrado', async () => {
    expect(await erroDe(comTransacao(b.poolApp, (t) => mudarStatusPeloSistema(t, deps, 'DEM-20261022-9999', 'dec_criado')))).toMatchObject({
      codigo: 'nao_encontrado',
    });
  });

  it('o histórico mostra o sistema como ator', async () => {
    const id = await demandaEm('em_analise');
    await comTransacao(b.poolApp, (t) => mudarStatusPeloSistema(t, deps, id, 'dec_criado'));
    const hist = await listarHistorico(b.db, id);
    expect(hist[0]).toMatchObject({ acao: 'status_alterado', ator: { tipo: 'sistema' } });
  });
});

it('o papel do app não precisa de mais privilégio que o da T05 (nenhuma escrita fora das colunas permitidas)', async () => {
  // Se alterarDemanda tentasse gravar autor ou criada_em, o GRANT por coluna recusaria com 42501.
  const d = await criarDemanda(deps, cto, entrada);
  await alterarDemanda(deps, cto, d.id, { titulo: 'Novo titulo', status: 'em_analise' });
  const r = await b.db.execute<{ n: number }>(sql`select count(*)::int as n from ${demanda} where ${demanda.id} = ${d.id}`);
  expect(r.rows[0]!.n).toBe(1);
});
