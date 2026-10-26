// Leitura de demandas (RF-06, CA-06.1, CA-06.3) contra o Postgres real, pelo papel do app. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { decisao, demanda, entradaBruta, especificacaoTecnica, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { idVersao } from '../versoes';
import { listarDemandas, obterDemanda } from './consultas';
import { filtroDemandasSchema } from './schemas';

const CTO = 'u-cons-cto';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values({ id: CTO, name: 'Pessoa Ficticia CTO', email: 'cons-cto@exemplo.test', papel: 'cto' });
});
afterAll(async () => {
  await b.fechar();
});

const migrator = () => criarDb(b.poolMigrator);
const filtro = (q: Record<string, string> = {}) => filtroDemandasSchema.parse(q);

let n = 0;
async function inserir(campos: Partial<typeof demanda.$inferInsert> & { criadaEm: Date }): Promise<string> {
  n += 1;
  const id = `DEM-20261022-${String(n).padStart(4, '0')}`;
  await migrator()
    .insert(demanda)
    .values({ id, titulo: `Demanda ficticia ${n}`, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia', autorTipo: 'pessoa', autorId: CTO, atualizadaEm: campos.criadaEm, ...campos });
  return id;
}

const ESP = (demandaId: string, versao: number, autor: { autorTipo: 'pessoa' | 'agente'; autorId: string }, criadaEm: Date) => ({
  id: idVersao('ESP', demandaId, versao),
  demandaId,
  versao,
  descricaoObjetiva: 'x',
  escopoInclui: ['x'],
  ...autor,
  rascunhoAgente: autor.autorTipo === 'agente',
  criadaEm,
});
const RSK = (demandaId: string, versao: number, autor: { autorTipo: 'pessoa' | 'agente'; autorId: string }, criadaEm: Date) => ({
  id: idVersao('RSK', demandaId, versao),
  demandaId,
  versao,
  riscoTecnicoNivel: 'baixo' as const,
  riscoOperacionalNivel: 'baixo' as const,
  riscoJuridicoNivel: 'baixo' as const,
  ...autor,
  rascunhoAgente: autor.autorTipo === 'agente',
  criadaEm,
});
const DEC = (demandaId: string, versao: number, esp: number, rsk: number, autor: { autorTipo: 'pessoa' | 'agente'; autorId: string }, criadaEm: Date) => ({
  id: idVersao('DEC', demandaId, versao),
  demandaId,
  versao,
  especificacaoId: idVersao('ESP', demandaId, esp),
  especificacaoVersao: esp,
  parecerRiscoId: idVersao('RSK', demandaId, rsk),
  parecerRiscoVersao: rsk,
  demandaTipo: 'melhoria' as const,
  demandaTitulo: 'x',
  demandaDescricao: 'x',
  resumoExecutivo: 'x',
  opcaoA: { descricao: 'A' },
  opcaoB: { descricao: 'B' },
  nivelAprovacaoRequerido: 'cto' as const,
  ...autor,
  rascunhoAgente: autor.autorTipo === 'agente',
  criadaEm,
});

describe('listarDemandas', () => {
  // Um bloco de demandas com datas próprias (outubro de 2030), longe das dos outros testes deste arquivo.
  let bugs: string[];
  let melhorias: string[];
  beforeAll(async () => {
    bugs = [];
    melhorias = [];
    for (let i = 0; i < 3; i++) bugs.push(await inserir({ tipo: 'bug', status: 'em_analise', linhaServicoProvavel: 'sob_medida', criadaEm: new Date(`2030-10-0${i + 1}T12:00:00Z`) }));
    for (let i = 0; i < 2; i++) melhorias.push(await inserir({ tipo: 'melhoria', status: 'nova', criadaEm: new Date(`2030-10-0${i + 4}T12:00:00Z`) }));
  });

  it('CA-06.1: 3 bug e 2 melhoria, filtro tipo=bug devolve as 3, com total 3', async () => {
    const r = await listarDemandas(b.db, filtro({ tipo: 'bug' }));
    expect(r.total).toBe(3);
    expect(r.itens.map((d) => d.id).sort()).toEqual([...bugs].sort());
    expect(r).toMatchObject({ limit: 20, offset: 0 });
  });

  it('filtros de status e linha de serviço; combinados valem juntos', async () => {
    expect((await listarDemandas(b.db, filtro({ status: 'em_analise' }))).total).toBe(3);
    expect((await listarDemandas(b.db, filtro({ linhaServicoProvavel: 'sob_medida' }))).total).toBe(3);
    expect((await listarDemandas(b.db, filtro({ tipo: 'melhoria', status: 'em_analise' }))).itens).toEqual([]);
    expect((await listarDemandas(b.db, filtro({ tipo: 'melhoria', status: 'nova' }))).total).toBe(2);
  });

  it('ordena da mais nova para a mais antiga e respeita limit e offset', async () => {
    const todas = await listarDemandas(b.db, filtro());
    const datas = todas.itens.map((d) => d.criadaEm.getTime());
    expect(datas).toEqual([...datas].sort((x, y) => y - x));
    expect(todas.itens.slice(0, 5).map((d) => d.id)).toEqual([melhorias[1], melhorias[0], bugs[2], bugs[1], bugs[0]]);
    const pagina = await listarDemandas(b.db, filtro({ limit: '2', offset: '1' }));
    expect(pagina.itens.map((d) => d.id)).toEqual([melhorias[0], bugs[2]]);
    expect(pagina).toMatchObject({ limit: 2, offset: 1, total: todas.total });
  });

  it('offset além do fim devolve lista vazia com o total', async () => {
    const r = await listarDemandas(b.db, filtro({ tipo: 'bug', offset: '10' }));
    expect(r).toEqual({ itens: [], total: 3, limit: 20, offset: 10 });
  });

  it('o item resumido tem só os campos da fila: sem solicitante, texto livre, anexos nem autor', async () => {
    const [item] = (await listarDemandas(b.db, filtro({ tipo: 'bug', limit: '1' }))).itens;
    expect(Object.keys(item!).sort()).toEqual(['criadaEm', 'id', 'linhaServicoProvavel', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia']);
  });

  it('mesma data de criação: desempata pelo id, do maior para o menor', async () => {
    const quando = new Date('2031-01-01T00:00:00Z');
    const a = await inserir({ tipo: 'produto_proprio', criadaEm: quando });
    const c = await inserir({ tipo: 'produto_proprio', criadaEm: quando });
    expect((await listarDemandas(b.db, filtro({ tipo: 'produto_proprio' }))).itens.map((d) => d.id)).toEqual([c, a]);
  });
});

describe('obterDemanda', () => {
  it('CA-06.3: obterDemanda de id inexistente → nao_encontrado', async () => {
    const e = await obterDemanda(b.db, 'DEM-20261022-9999').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('a vista da demanda não tem texto nem origem', async () => {
    const quando = new Date('2026-10-22T12:00:00Z');
    const id = await inserir({ criadaEm: quando });
    await b.db.insert(entradaBruta).values({ demandaId: id, texto: 'SENTINELA-TEXTO-BRUTO', origem: { canal: 'email', referencia: 'SENTINELA-ORIGEM' }, recebidaEm: quando });
    const vista = await obterDemanda(b.db, id);
    expect(Object.keys(vista)).not.toContain('texto');
    expect(Object.keys(vista)).not.toContain('origem');
    expect(JSON.stringify(vista)).not.toContain('SENTINELA');
  });

  it('todos os campos da demanda em camelCase, com responsável no lugar do autor', async () => {
    const quando = new Date('2026-10-22T12:00:00Z');
    const id = await inserir({
      titulo: 'Pedidos duplicados',
      tipo: 'bug',
      status: 'em_analise',
      solicitantePapel: 'produto',
      linhaServicoProvavel: 'automacao_integracao',
      urgencia: 'media',
      justificativaUrgencia: 'j',
      contexto: 'c',
      descricaoProblema: 'd',
      impactoPercebido: 'i',
      anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }],
      duvidasEntrada: ['Qual ERP?'],
      criadaEm: quando,
      atualizadaEm: new Date('2026-10-22T13:00:00Z'),
    });
    expect(await obterDemanda(b.db, id)).toEqual({
      id,
      titulo: 'Pedidos duplicados',
      tipo: 'bug',
      status: 'em_analise',
      solicitanteNome: 'Pessoa Ficticia',
      solicitantePapel: 'produto',
      linhaServicoProvavel: 'automacao_integracao',
      urgencia: 'media',
      justificativaUrgencia: 'j',
      contexto: 'c',
      descricaoProblema: 'd',
      impactoPercebido: 'i',
      anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }],
      duvidasEntrada: ['Qual ERP?'],
      rascunhoAgente: false,
      responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' },
      criadaEm: quando,
      atualizadaEm: new Date('2026-10-22T13:00:00Z'),
      especificacoes: [],
      pareceresRisco: [],
      pacotesDecisao: [],
    });
  });

  it('demanda de agente: responsável agente e rascunho de agente; pessoa sem conta aparece sem nome', async () => {
    const quando = new Date('2026-10-22T12:00:00Z');
    const doAgente = await inserir({ autorTipo: 'agente', autorId: 'orquestrador', rascunhoAgente: true, criadaEm: quando });
    expect(await obterDemanda(b.db, doAgente)).toMatchObject({ rascunhoAgente: true, responsavel: { tipo: 'agente', agente: 'orquestrador' } });
    const semConta = await inserir({ autorId: 'u-que-nao-existe', criadaEm: quando });
    expect((await obterDemanda(b.db, semConta)).responsavel).toEqual({ tipo: 'pessoa', nome: null });
  });

  it('listas de ESP, RSK e DEC resumidas, da versão mais nova para a mais antiga, com autor e rascunho', async () => {
    const t0 = new Date('2026-10-22T12:00:00Z');
    const t1 = new Date('2026-10-22T13:00:00Z');
    const pessoa = { autorTipo: 'pessoa' as const, autorId: CTO };
    const agente = (a: string) => ({ autorTipo: 'agente' as const, autorId: a });
    const id = await inserir({ criadaEm: t0 });
    const db = migrator();
    await db.insert(especificacaoTecnica).values([ESP(id, 1, pessoa, t0), ESP(id, 2, agente('insumo_tecnico'), t1)]);
    await db.insert(parecerRisco).values(RSK(id, 1, agente('risco'), t0));
    await db.insert(pacoteDecisao).values([DEC(id, 1, 1, 1, pessoa, t0), DEC(id, 2, 2, 1, agente('consolidacao'), t1)]);

    const v = await obterDemanda(b.db, id);
    expect(v.especificacoes).toEqual([
      { id: idVersao('ESP', id, 2), versao: 2, criadaEm: t1, autor: { tipo: 'agente', agente: 'insumo_tecnico' }, rascunhoAgente: true },
      { id: idVersao('ESP', id, 1), versao: 1, criadaEm: t0, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' }, rascunhoAgente: false },
    ]);
    expect(v.pareceresRisco).toEqual([{ id: idVersao('RSK', id, 1), versao: 1, criadaEm: t0, autor: { tipo: 'agente', agente: 'risco' }, rascunhoAgente: true }]);
    expect(v.pacotesDecisao).toEqual([
      { id: idVersao('DEC', id, 2), versao: 2, criadaEm: t1, autor: { tipo: 'agente', agente: 'consolidacao' }, rascunhoAgente: true, statusDecisao: 'pendente', desatualizado: false },
      { id: idVersao('DEC', id, 1), versao: 1, criadaEm: t0, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' }, rascunhoAgente: false, statusDecisao: 'pendente', desatualizado: true },
    ]);
  });

  it('statusDecisao vem da decisão gravada; RSK nova também deixa o DEC desatualizado', async () => {
    const t0 = new Date('2026-10-22T12:00:00Z');
    const pessoa = { autorTipo: 'pessoa' as const, autorId: CTO };
    const id = await inserir({ criadaEm: t0 });
    const db = migrator();
    await db.insert(especificacaoTecnica).values(ESP(id, 1, pessoa, t0));
    await db.insert(parecerRisco).values(RSK(id, 1, pessoa, t0));
    await db.insert(pacoteDecisao).values([DEC(id, 1, 1, 1, pessoa, t0), DEC(id, 2, 1, 1, pessoa, t0), DEC(id, 3, 1, 1, pessoa, t0)]);
    await db.insert(decisao).values([
      { pacoteDecisaoId: idVersao('DEC', id, 1), statusDecisao: 'arquivada', decididaPor: CTO, decididaEm: t0 },
      { pacoteDecisaoId: idVersao('DEC', id, 2), statusDecisao: 'aprovada', opcaoEscolhida: 'B', decididaPor: CTO, decididaEm: t0 },
    ]);
    let v = await obterDemanda(b.db, id);
    expect(v.pacotesDecisao.map((p) => [p.versao, p.statusDecisao, p.desatualizado])).toEqual([
      [3, 'pendente', false],
      [2, 'aprovada', false],
      [1, 'arquivada', false],
    ]);
    await db.insert(parecerRisco).values(RSK(id, 2, pessoa, t0));
    v = await obterDemanda(b.db, id);
    expect(v.pacotesDecisao.every((p) => p.desatualizado)).toBe(true);
  });

  it('as versões de outra demanda não entram', async () => {
    const t0 = new Date('2026-10-22T12:00:00Z');
    const pessoa = { autorTipo: 'pessoa' as const, autorId: CTO };
    const a = await inserir({ criadaEm: t0 });
    const outra = await inserir({ criadaEm: t0 });
    await migrator().insert(especificacaoTecnica).values([ESP(outra, 1, pessoa, t0), ESP(outra, 2, pessoa, t0)]);
    await migrator().insert(parecerRisco).values(RSK(outra, 1, pessoa, t0));
    await migrator().insert(pacoteDecisao).values(DEC(outra, 1, 1, 1, pessoa, t0));
    const v = await obterDemanda(b.db, a);
    expect([v.especificacoes, v.pareceresRisco, v.pacotesDecisao]).toEqual([[], [], []]);
  });
});
