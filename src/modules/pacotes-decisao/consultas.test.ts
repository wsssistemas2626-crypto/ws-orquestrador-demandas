// Leitura do pacote de decisão contra o Postgres real, pelo papel do app (RF-10, RF-12, RF-23). As aprovações e decisões
// são gravadas pelo migrator: a decisão de verdade chega na T21. Dados só fictícios; o relógio é sempre o fixo, um dia
// por teste.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { Ator, AtorAgente, AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { listarPacotes, listarPacotesDaDemanda, obterPacoteDecisao } from './consultas';
import { criarPacoteDecisao } from './criar';
import { criarPacoteDecisaoSchema, filtroPacotesSchema } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decq-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decq-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

const esp = () =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva: 'Corrigir pedidos duplicados',
    escopoInclui: ['Importação de pedidos'],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: ['pnpm test verde'],
  });
const rsk = (extra: Record<string, unknown> = {}) =>
  criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'alto', riscoJuridicoNivel: 'medio', ...extra });
const dec = (extra: Record<string, unknown> = {}) =>
  criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'A fictícia' }, opcaoB: { descricao: 'B fictícia' }, nivelAprovacaoRequerido: 'cto', ...extra });

type Svc = { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };

async function prepararBanco(): Promise<BancoDeTeste> {
  const banco = await novoBanco();
  await banco.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'decq-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'decq-adm@exemplo.test', papel: 'administradora' },
  ]);
  return banco;
}

// Demanda com ESP v1 e RSK v1 (dos autores dados) e um DEC v1.
async function demandaComDec(svc: Svc, autores: { esp?: Ator; rsk?: Ator; dec?: Ator } = {}): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(svc, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(svc, autores.esp ?? cto, d.id, esp());
  await criarParecerRisco(svc, autores.rsk ?? cto, d.id, rsk());
  const p = await criarPacoteDecisao(svc, autores.dec ?? cto, d.id, dec());
  return { demandaId: d.id, decId: p.id };
}

// Aprovação e decisão gravadas como a T21 vai gravar, pelo migrator.
async function aprovarComo(banco: BancoDeTeste, decId: string, quando: Date, opcao: 'A' | 'B' = 'A'): Promise<void> {
  await banco.poolMigrator.query(
    `insert into aprovacao (pacote_decisao_id, papel_aprovacao, nome_aprovador, registrada_por, opcao, registrada_em) values ($1, 'cto', $2, $3, $4, $5)`,
    [decId, cto.nome, cto.usuarioId, opcao, quando],
  );
  await banco.poolMigrator.query(
    `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, comentarios, decidida_por, decidida_em) values ($1, 'aprovada', $2, 'Comentário fictício', $3, $4)`,
    [decId, opcao, cto.usuarioId, quando],
  );
}
async function decidirSemAprovar(banco: BancoDeTeste, decId: string, status: 'devolvida' | 'arquivada', quando: Date): Promise<void> {
  await banco.poolMigrator.query(`insert into decisao (pacote_decisao_id, status_decisao, decidida_por, decidida_em) values ($1, $2, $3, $4)`, [
    decId,
    status,
    administradora.usuarioId,
    quando,
  ]);
}

describe('filtroPacotesSchema', () => {
  it('CA-23.2: statusDecisao=talvez → recusado', () => {
    expect(filtroPacotesSchema.safeParse({ statusDecisao: 'talvez' }).success).toBe(false);
  });
  it('aceita os quatro status; limit e offset como na fila (padrão 20 e 0, limit até 100)', () => {
    for (const s of ['pendente', 'aprovada', 'devolvida', 'arquivada']) expect(filtroPacotesSchema.parse({ statusDecisao: s }).statusDecisao).toBe(s);
    expect(filtroPacotesSchema.parse({})).toEqual({ limit: 20, offset: 0 });
    expect(filtroPacotesSchema.parse({ limit: '5', offset: '10' })).toEqual({ limit: 5, offset: 10 });
    expect(filtroPacotesSchema.safeParse({ limit: '500' }).success).toBe(false);
    expect(filtroPacotesSchema.safeParse({ limit: '0' }).success).toBe(false);
    expect(filtroPacotesSchema.safeParse({ offset: '-1' }).success).toBe(false);
  });
  it('chave repetida (lista) é recusada; chave desconhecida é descartada', () => {
    expect(filtroPacotesSchema.safeParse({ statusDecisao: ['aprovada', 'pendente'] }).success).toBe(false);
    expect(filtroPacotesSchema.parse({ demandaId: 'DEM-20261022-0001' })).not.toHaveProperty('demandaId');
  });
});

describe('obterPacoteDecisao e listarPacotesDaDemanda', () => {
  let b: BancoDeTeste;
  let svc: Svc;
  let dia = 0;
  beforeAll(async () => {
    b = await prepararBanco();
  });
  afterAll(async () => {
    await b.fechar();
  });
  beforeEach(() => {
    const relogio = relogioFixo('2026-10-22T12:00:00Z');
    relogio.avancar(++dia * 86_400_000);
    svc = { db: b.db, pool: b.poolApp, relogio };
  });

  it('CA-12.1: DEC v1 que cita ESP v1; criada a ESP v2 → desatualizado: true', async () => {
    const { demandaId, decId } = await demandaComDec(svc);
    expect((await obterPacoteDecisao(b.db, decId)).desatualizado).toBe(false);
    await criarEspecificacao(svc, cto, demandaId, esp());
    expect(await obterPacoteDecisao(b.db, decId)).toMatchObject({ desatualizado: true, especificacaoId: idVersao('ESP', demandaId, 1) });
    expect((await listarPacotesDaDemanda(b.db, demandaId)).map((p) => p.desatualizado)).toEqual([true]);
  });

  it('RSK v2 também deixa o DEC desatualizado', async () => {
    const { demandaId, decId } = await demandaComDec(svc);
    await criarParecerRisco(svc, cto, demandaId, rsk());
    expect((await obterPacoteDecisao(b.db, decId)).desatualizado).toBe(true);
  });

  it('o DEC v2, que cita as versões novas, não está desatualizado; o v1 continua', async () => {
    const { demandaId, decId } = await demandaComDec(svc);
    await criarEspecificacao(svc, cto, demandaId, esp());
    await criarParecerRisco(svc, cto, demandaId, rsk());
    const v2 = await criarPacoteDecisao(svc, cto, demandaId, dec());
    expect(v2).toMatchObject({ especificacaoId: idVersao('ESP', demandaId, 2), parecerRiscoId: idVersao('RSK', demandaId, 2), desatualizado: false });
    expect((await listarPacotesDaDemanda(b.db, demandaId)).map((p) => [p.id, p.desatualizado])).toEqual([
      [v2.id, false],
      [decId, true],
    ]);
  });

  it('a ESP v2 de outra demanda não deixa o DEC desatualizado', async () => {
    const a = await demandaComDec(svc);
    const outra = await demandaComDec(svc);
    await criarEspecificacao(svc, cto, outra.demandaId, esp());
    expect((await obterPacoteDecisao(b.db, a.decId)).desatualizado).toBe(false);
    expect((await obterPacoteDecisao(b.db, outra.decId)).desatualizado).toBe(true);
  });

  it('rascunhosCitados lista o DEC, a ESP e o RSK com rascunho_agente', async () => {
    const todos = await demandaComDec(svc, { esp: insumo, rsk: risco, dec: consolidacao });
    expect((await obterPacoteDecisao(b.db, todos.decId)).rascunhosCitados).toEqual([
      todos.decId,
      idVersao('ESP', todos.demandaId, 1),
      idVersao('RSK', todos.demandaId, 1),
    ]);
    const so = await demandaComDec(svc, { rsk: risco });
    expect((await obterPacoteDecisao(b.db, so.decId)).rascunhosCitados).toEqual([idVersao('RSK', so.demandaId, 1)]);
    const nenhum = await demandaComDec(svc);
    expect((await obterPacoteDecisao(b.db, nenhum.decId)).rascunhosCitados).toEqual([]);
  });

  it('niveisRisco e especificacaoCitada vêm do RSK e da ESP citados, não dos mais novos', async () => {
    const { demandaId, decId } = await demandaComDec(svc);
    await criarParecerRisco(svc, cto, demandaId, rsk({ riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'alto', riscoJuridicoNivel: 'alto' }));
    expect(await obterPacoteDecisao(b.db, decId)).toMatchObject({
      niveisRisco: { tecnico: 'baixo', operacional: 'alto', juridico: 'medio' },
      especificacaoCitada: { sistemaAlvo: 'meu-sistema', repositorioDestino: 'wsssistemas2626-crypto/meu-sistema', criteriosAceitePreliminares: ['Critério fictício'], definicaoDePronto: ['pnpm test verde'] },
    });
  });

  it('aprovadores e decisão: derivados de aprovacao e decisao, com o nome da conta de quem decidiu', async () => {
    const { decId } = await demandaComDec(svc);
    const quando = svc.relogio.agora();
    await b.poolMigrator.query(
      `insert into aprovacao (pacote_decisao_id, papel_aprovacao, nome_aprovador, registrada_por, opcao, registrada_em) values ($1, 'cto', $2, $3, 'B', $4)`,
      [decId, cto.nome, cto.usuarioId, new Date(quando.getTime() - 60_000)],
    );
    expect(await obterPacoteDecisao(b.db, decId)).toMatchObject({
      statusDecisao: 'pendente',
      decisao: null,
      aprovadores: [{ papel: 'cto', nome: cto.nome, opcao: 'B', referenciaDocumento: null, dataDocumento: null }],
    });
    await b.poolMigrator.query(
      `insert into aprovacao (pacote_decisao_id, papel_aprovacao, nome_aprovador, registrada_por, opcao, referencia_documento, data_documento, registrada_em) values ($1, 'administradora', $2, $3, 'B', 'DOC-FICTICIO-001', '2026-10-20', $4)`,
      [decId, administradora.nome, administradora.usuarioId, quando],
    );
    await b.poolMigrator.query(
      `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, comentarios, decidida_por, decidida_em) values ($1, 'aprovada', 'B', 'Comentário fictício', $2, $3)`,
      [decId, administradora.usuarioId, quando],
    );
    const v = await obterPacoteDecisao(b.db, decId);
    expect(v.statusDecisao).toBe('aprovada');
    expect(v.aprovadores).toEqual([
      { papel: 'cto', nome: cto.nome, opcao: 'B', registradaEm: new Date(quando.getTime() - 60_000), referenciaDocumento: null, dataDocumento: null },
      { papel: 'administradora', nome: administradora.nome, opcao: 'B', registradaEm: quando, referenciaDocumento: 'DOC-FICTICIO-001', dataDocumento: '2026-10-20' },
    ]);
    expect(v.decisao).toEqual({ opcaoEscolhida: 'B', comentarios: 'Comentário fictício', decididaPor: administradora.nome, decididaEm: quando });
    expect(JSON.stringify(v)).not.toContain(administradora.usuarioId);
    expect(JSON.stringify(v)).not.toContain(cto.usuarioId);
  });

  it('decisão devolvida: statusDecisao devolvida, sem opção e sem aprovadores', async () => {
    const { decId } = await demandaComDec(svc);
    await decidirSemAprovar(b, decId, 'devolvida', svc.relogio.agora());
    expect(await obterPacoteDecisao(b.db, decId)).toMatchObject({ statusDecisao: 'devolvida', aprovadores: [], decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: administradora.nome } });
  });

  it('a vista não traz id interno de conta nem execução de agente', async () => {
    const { decId } = await demandaComDec(svc);
    const v = await obterPacoteDecisao(b.db, decId);
    expect(Object.keys(v)).not.toContain('autorId');
    expect(Object.keys(v)).not.toContain('execucaoAgenteId');
    expect(JSON.stringify(v)).not.toContain(cto.usuarioId);
  });

  it('obterPacoteDecisao de versão que não existe → nao_encontrado', async () => {
    const { demandaId } = await demandaComDec(svc);
    await expect(obterPacoteDecisao(b.db, idVersao('DEC', demandaId, 2))).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('listarPacotesDaDemanda: da mais nova para a mais antiga, inclusive com dez versões ou mais; só da demanda', async () => {
    const { demandaId } = await demandaComDec(svc);
    const outra = await demandaComDec(svc);
    for (let i = 2; i <= 11; i++) await criarPacoteDecisao(svc, i % 2 ? cto : consolidacao, demandaId, dec({ resumoExecutivo: `Versão ${i}` }));
    const lista = await listarPacotesDaDemanda(b.db, demandaId);
    expect(lista.map((p) => p.versao)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(lista.every((p) => p.demandaId === demandaId)).toBe(true);
    expect((await listarPacotesDaDemanda(b.db, outra.demandaId)).map((p) => p.id)).toEqual([outra.decId]);
  });

  it('listarPacotesDaDemanda: demanda sem DEC → lista vazia; que não existe → nao_encontrado', async () => {
    const d = await criarDemanda(svc, cto, criarDemandaSchema.parse({ titulo: 'Sem pacote', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
    expect(await listarPacotesDaDemanda(b.db, d.id)).toEqual([]);
    await expect(listarPacotesDaDemanda(b.db, 'DEM-20261022-9999')).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });
});

// Banco próprio: a listagem é de todos os pacotes, e os DEC dos outros blocos não entram na conta.
describe('listarPacotes (RF-23)', () => {
  let b: BancoDeTeste;
  let svc: Svc;
  const ids: Record<'aprovado1' | 'aprovado2' | 'pendente' | 'devolvido' | 'arquivado', string> = {} as never;
  let demandaAprovado1 = '';

  // Cinco DEC, cada um criado uma hora depois do anterior: aprovado1, pendente, aprovado2, devolvido, arquivado.
  beforeAll(async () => {
    b = await prepararBanco();
    const relogio = relogioFixo('2026-11-02T12:00:00Z');
    svc = { db: b.db, pool: b.poolApp, relogio };
    const proximo = async () => {
      const r = await demandaComDec(svc);
      relogio.avancar(3_600_000);
      return r;
    };
    const a1 = await proximo();
    demandaAprovado1 = a1.demandaId;
    ids.aprovado1 = a1.decId;
    ids.pendente = (await proximo()).decId;
    ids.aprovado2 = (await proximo()).decId;
    ids.devolvido = (await proximo()).decId;
    ids.arquivado = (await proximo()).decId;
    await aprovarComo(b, ids.aprovado1, relogio.agora());
    await aprovarComo(b, ids.aprovado2, relogio.agora(), 'B');
    await decidirSemAprovar(b, ids.devolvido, 'devolvida', relogio.agora());
    await decidirSemAprovar(b, ids.arquivado, 'arquivada', relogio.agora());
    // O aprovado1 fica desatualizado: a demanda ganha a ESP v2 depois da aprovação.
    await criarEspecificacao(svc, cto, demandaAprovado1, esp());
  });
  afterAll(async () => {
    await b.fechar();
  });

  const filtro = (q: Record<string, unknown> = {}) => filtroPacotesSchema.parse(q);

  it('CA-23.1: 2 aprovados e os outros não, statusDecisao=aprovada → só os 2, cada um com desatualizado', async () => {
    const r = await listarPacotes(b.db, filtro({ statusDecisao: 'aprovada' }));
    expect(r.total).toBe(2);
    expect(r.itens.map((p) => [p.id, p.statusDecisao, p.desatualizado])).toEqual([
      [ids.aprovado2, 'aprovada', false],
      [ids.aprovado1, 'aprovada', true],
    ]);
    expect(r.itens[0]!.aprovadores).toEqual([expect.objectContaining({ papel: 'cto', nome: cto.nome, opcao: 'B' })]);
    expect(r.itens[0]!.decisao).toMatchObject({ opcaoEscolhida: 'B', decididaPor: cto.nome });
    expect(r).toMatchObject({ limit: 20, offset: 0 });
  });

  it.each([
    ['pendente', 'pendente'],
    ['devolvida', 'devolvido'],
    ['arquivada', 'arquivado'],
  ] as const)('statusDecisao=%s → só esse', async (status, chave) => {
    const r = await listarPacotes(b.db, filtro({ statusDecisao: status }));
    expect(r.total).toBe(1);
    expect(r.itens.map((p) => [p.id, p.statusDecisao])).toEqual([[ids[chave], status]]);
  });

  it('sem filtro → todos, do mais novo para o mais antigo', async () => {
    const r = await listarPacotes(b.db, filtro());
    expect(r.total).toBe(5);
    expect(r.itens.map((p) => p.id)).toEqual([ids.arquivado, ids.devolvido, ids.aprovado2, ids.pendente, ids.aprovado1]);
  });

  it('limit e offset: a página pedida, com o total de todas', async () => {
    const r = await listarPacotes(b.db, filtro({ limit: '2', offset: '1' }));
    expect(r).toMatchObject({ total: 5, limit: 2, offset: 1 });
    expect(r.itens.map((p) => p.id)).toEqual([ids.devolvido, ids.aprovado2]);
    const alem = await listarPacotes(b.db, filtro({ statusDecisao: 'aprovada', offset: '5' }));
    expect(alem).toMatchObject({ itens: [], total: 2 });
  });
});
