// Entrada pelo agente orquestrador (T28: RF-05 CA-05.2, RF-15, T-01, T-03, C-22, C-31) contra o Postgres real, pelo
// papel do app, com a fila do pg-boss, Better Auth de teste e o provedor de IA falso (RNF-14). Relógio fixo (RNF-15).
// O texto colado é sempre fictício, com os sentinelas de test/sentinelas.ts (JUR-2026-002, 7.4).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { chamarRota } from '../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarPessoa } from '../../../test/sessao';
import { PROMPTS } from '../../agents';
import { POST as POST_ENTRADA } from '../../app/api/demandas/entrada/route';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import type { Agente, AtorAgente, AtorPessoa } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { obterDemanda } from '../demandas/consultas';
import { MENSAGEM_ORQUESTRADOR_DESLIGADO, MENSAGEM_ORQUESTRADOR_SUSPENSO, entradaSchema, registrarEntrada, type Entrada } from '../demandas/entrada';
import { listarEntradasPendentes, obterEntradaPendente } from '../demandas/entradas-pendentes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { listarHistorico } from '../historico/consultas';
import { DESTINOS, executarAgente } from './executar';
import { SCHEMA_DE_SAIDA } from './schemas';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const DIA_MS = 86_400_000;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TEXTO = `Pedido de ${SENTINELAS.nome}, e-mail ${SENTINELAS.email}, telefone ${SENTINELAS.telefone}. ${SENTINELAS.texto}`;
const SAIDA = { ...(PROMPTS.orquestrador.exemploSaida as object), perguntasParaSolicitante: [] } as Record<string, unknown>;
const PERGUNTAS = ['Todos os marketplaces apresentam a duplicação?', 'Desde quando?'];

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let cto: AtorPessoa;
let cookieCto: string;
let dia = 0;
const linhasDeLog: string[] = [];

const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: null };

const agente = (extra: Record<string, unknown> = {}): Entrada =>
  entradaSchema.parse({ modo: 'agente', texto: TEXTO, solicitanteNome: SENTINELAS.nome, solicitantePapel: 'operacoes', ...extra });
const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 100, tokensSaida: 50 });

const ligar = (a: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [a, MODELO]);
const desligar = (a: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = false where agente = $1', [a]);
const definirTeto = (v: number) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [v]);

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) => (await b.poolMigrator.query<T>(texto, valores)).rows;
const contar = async (tabela: string, onde = 'true', valores: unknown[] = []) =>
  Number((await consultar<{ n: string }>(`select count(*)::text as n from ${tabela} where ${onde}`, valores))[0]!.n);
const pendente = async (id: string) =>
  (
    await consultar<{ texto: string; origem: unknown; solicitante_nome: string; solicitante_papel: string | null; status: string; registrada_por: string; recebida_em: Date }>(
      'select texto, origem, solicitante_nome, solicitante_papel, status, registrada_por, recebida_em from entrada_pendente where id = $1',
      [id],
    )
  )[0];
const execucaoDa = async (pendenteId: string) =>
  (
    await consultar<{ id: string; demanda_id: string | null; status: string; artefato_id: string | null }>(
      `select id, demanda_id, status, artefato_id from execucao_agente where agente = 'orquestrador' and chave_entrada = $1`,
      [`entrada:${pendenteId}`],
    )
  )[0];
const linhaBruta = async (demandaId: string) =>
  (await consultar<{ texto: string | null; origem: unknown; recebida_em: Date }>('select texto, origem, recebida_em from entrada_bruta where demanda_id = $1', [demandaId]))[0];

async function capturar(p: Promise<unknown>): Promise<ErroDominio> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroDominio) return e;
    throw e;
  }
  throw new Error('esperava ErroDominio');
}

// Registra a entrada no modo agente e devolve o id da pendente.
async function enviarAoAgente(extra: Record<string, unknown> = {}): Promise<string> {
  const r = await registrarEntrada(deps, cto, agente(extra));
  if (r.tipo !== 'pendente') throw new Error('esperava pendente');
  return r.entradaId;
}

// Roda as tentativas da execução até ela sair de `reagendada`, andando o relógio pelas esperas de P1-e.
async function rodarAteOFim(execucaoId: string): Promise<string> {
  let r = await executarAgente({ ...deps, provedor }, execucaoId);
  while (r === 'reagendada') {
    relogio.avancar(120_000);
    r = await executarAgente({ ...deps, provedor }, execucaoId);
  }
  return r;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDeLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const pessoa = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = pessoa.cookie;
  cto = { tipo: 'pessoa', usuarioId: pessoa.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  // Cada teste num dia próprio, ainda em outubro: o limite por hora (C-36) de um teste não entra no outro.
  relogio.definir(AGORA);
  relogio.avancar(++dia * DIA_MS);
  await b.poolMigrator.query('truncate uso_ia');
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await ligar('orquestrador');
  await definirTeto(10);
  provedor = new ProvedorFalso();
});
afterEach(async () => {
  // Pendentes de um teste não aparecem na lista do outro.
  await b.poolMigrator.query('delete from entrada_pendente');
});

describe('modo agente: a entrada pendente (T-01)', () => {
  it('ligado → pendente aguardando com o texto como chegou, execução entrada:<uuid> sem demanda e job só com { execucaoId } (C-22)', async () => {
    const demandasAntes = await contar('demanda');
    const id = await enviarAoAgente({ origem: { canal: 'email', referencia: 'Assunto ficticio' } });
    expect(id).toMatch(RE_UUID);
    expect(await pendente(id)).toEqual({
      texto: TEXTO,
      origem: { canal: 'email', referencia: 'Assunto ficticio' },
      solicitante_nome: SENTINELAS.nome,
      solicitante_papel: 'operacoes',
      status: 'aguardando',
      registrada_por: cto.usuarioId,
      recebida_em: relogio.agora(),
    });
    const ex = await execucaoDa(id);
    expect(ex).toMatchObject({ demanda_id: null, status: 'pendente', artefato_id: null });
    const jobs = await consultar<{ data: Record<string, unknown>; singleton_key: string }>(
      `select data, singleton_key from pgboss.job where name = 'agente.executar' and data->>'execucaoId' = $1`,
      [ex!.id],
    );
    expect(jobs).toEqual([{ data: { execucaoId: ex!.id }, singleton_key: `orquestrador:entrada:${id}:t1` }]);
    // A demanda só nasce quando o agente termina ou a pessoa preenche à mão.
    expect(await contar('demanda')).toBe(demandasAntes);
  });

  it('orquestrador desligado → conflito com a mensagem da tela, sem pendente, execução nem job', async () => {
    await desligar('orquestrador');
    const antes = { p: await contar('entrada_pendente'), e: await contar('execucao_agente') };
    const e = await capturar(registrarEntrada(deps, cto, agente()));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGEM_ORQUESTRADOR_DESLIGADO });
    expect({ p: await contar('entrada_pendente'), e: await contar('execucao_agente') }).toEqual(antes);
  });

  it('suspenso pelo teto → conflito com a mensagem de suspensão da 03, sem pendente', async () => {
    await definirTeto(0);
    const antes = await contar('entrada_pendente');
    const e = await capturar(registrarEntrada(deps, cto, agente()));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGEM_ORQUESTRADOR_SUSPENSO });
    expect(MENSAGEM_ORQUESTRADOR_SUSPENSO).toBe('Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.');
    expect(await contar('entrada_pendente')).toBe(antes);
  });

  it('agente como ator → sem_permissao, sem pendente', async () => {
    const antes = await contar('entrada_pendente');
    const e = await capturar(registrarEntrada(deps, orquestrador as unknown as AtorPessoa, agente()));
    expect(e).toMatchObject({ codigo: 'sem_permissao' });
    expect(await contar('entrada_pendente')).toBe(antes);
  });
});

describe('gravarSaidaOrquestrador (CA-05.2, RF-15)', () => {
  it('o orquestrador tem destino, com o mesmo schema da saída', () => {
    expect(DESTINOS.orquestrador).toBeDefined();
    expect(DESTINOS.orquestrador!.schema).toBe(SCHEMA_DE_SAIDA.orquestrador);
  });

  it('CA-05.2: orquestrador ligado e saída válida → demanda criada como rascunho de agente, responsável agente orquestrador, histórico com o agente', async () => {
    provedor.respostas.push(resposta(SAIDA));
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    relogio.avancar(60_000);
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('concluida');

    const concluida = (await execucaoDa(id))!;
    expect(concluida.status).toBe('concluida');
    const demandaId = concluida.artefato_id!;
    expect(demandaId).toMatch(/^DEM-\d{8}-\d{4}$/);
    const d = await obterDemanda(deps.db, demandaId);
    expect(d).toMatchObject({
      titulo: SAIDA.titulo,
      tipo: SAIDA.tipo,
      status: 'nova',
      linhaServicoProvavel: SAIDA.linhaServicoProvavel,
      urgencia: SAIDA.urgencia,
      rascunhoAgente: true,
      responsavel: { tipo: 'agente', agente: 'orquestrador' },
      duvidasEntrada: [],
    });
    const historico = await listarHistorico(deps.db, demandaId);
    expect(historico.map((h) => [h.acao, h.ator])).toEqual([['demanda_criada', { tipo: 'agente', agente: 'orquestrador' }]]);
    expect(contemSentinela(JSON.stringify(historico))).toBe(false);
  });

  it('a demanda nasce com o nome e o papel informados pela pessoa, nunca do provedor, e sem anexos', async () => {
    provedor.respostas.push(
      resposta({ ...SAIDA, solicitanteNome: 'Nome Vindo Do Modelo', solicitantePapel: 'financeiro', anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/x' }] }),
    );
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('concluida');
    const demandaId = (await consultar<{ artefato_id: string }>('select artefato_id from execucao_agente where id = $1', [ex.id]))[0]!.artefato_id;
    const d = await obterDemanda(deps.db, demandaId);
    expect(d.solicitanteNome).toBe(SENTINELAS.nome);
    expect(d.solicitantePapel).toBe('operacoes');
    expect(d.anexos).toEqual([]);
  });

  it('a entrada_bruta guarda o texto original (não o minimizado), a origem e a data da entrada, e a pendente some', async () => {
    provedor.respostas.push(resposta(SAIDA));
    const id = await enviarAoAgente({ origem: { canal: 'mensagem' } });
    const recebida = relogio.agora();
    const ex = (await execucaoDa(id))!;
    relogio.avancar(5 * 60_000);
    await executarAgente({ ...deps, provedor }, ex.id);
    const demandaId = (await consultar<{ artefato_id: string }>('select artefato_id from execucao_agente where id = $1', [ex.id]))[0]!.artefato_id;

    expect(await linhaBruta(demandaId)).toEqual({ texto: TEXTO, origem: { canal: 'mensagem' }, recebida_em: recebida });
    expect(await pendente(id)).toBeUndefined();
    // Ao provedor foi o texto minimizado: sem nome, e-mail nem telefone do solicitante.
    const enviado = provedor.chamadas[0]!.conteudo;
    expect(enviado).not.toContain(SENTINELAS.nome);
    expect(enviado).not.toContain(SENTINELAS.email);
    expect(enviado).not.toContain(SENTINELAS.telefone);
  });

  it('perguntasParaSolicitante não vazia → aguardando_informacao, as perguntas em duvidas_entrada e nenhuma mensagem ao solicitante', async () => {
    provedor.respostas.push(resposta({ ...SAIDA, perguntasParaSolicitante: PERGUNTAS }));
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('concluida');
    const demandaId = (await consultar<{ artefato_id: string }>('select artefato_id from execucao_agente where id = $1', [ex.id]))[0]!.artefato_id;
    const d = await obterDemanda(deps.db, demandaId);
    expect(d.status).toBe('aguardando_informacao');
    expect(d.duvidasEntrada).toEqual(PERGUNTAS);
    const historico = await listarHistorico(deps.db, demandaId);
    expect(historico.find((h) => h.acao === 'status_alterado')).toMatchObject({
      ator: { tipo: 'sistema' },
      antes: { status: 'nova' },
      depois: { status: 'aguardando_informacao' },
    });
    // Nada sai: nenhum aviso de e-mail e nenhum job além do de agente.
    expect(await contar('aviso_email')).toBe(0);
    expect(await contar('pgboss.job', `name <> 'agente.executar'`)).toBe(0);
  });

  it('com o insumo técnico ligado, a demanda criada pelo orquestrador dispara o insumo técnico na mesma transação', async () => {
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(SAIDA));
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    await executarAgente({ ...deps, provedor }, ex.id);
    const demandaId = (await consultar<{ artefato_id: string }>('select artefato_id from execucao_agente where id = $1', [ex.id]))[0]!.artefato_id;
    expect(await contar('execucao_agente', `agente = 'insumo_tecnico' and chave_entrada = $1 and demanda_id = $2`, [`demanda:${demandaId}`, demandaId])).toBe(1);
  });

  it('o mesmo job duas vezes → uma chamada e uma demanda (CA-16.4)', async () => {
    provedor.respostas.push(resposta(SAIDA), resposta(SAIDA));
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    const antes = await contar('demanda');
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('concluida');
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('ja_tratada');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await contar('demanda')).toBe(antes + 1);
  });
});

describe('falha e ignorada: a pendente fica achável (C-31)', () => {
  it('3 falhas → a pendente fica falhou e aparece em listarEntradasPendentes, sem texto nem nome', async () => {
    provedor.respostas.push(resposta({ titulo: '' }), resposta('não é JSON'), resposta({ tipo: 'outro' }));
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    expect(await rodarAteOFim(ex.id)).toBe('falhou');
    expect(provedor.chamadas).toHaveLength(3);
    expect((await pendente(id))!.status).toBe('falhou');
    const lista = await listarEntradasPendentes(deps.db);
    const item = lista.find((p) => p.id === id);
    expect(item).toEqual({ id, recebidaEm: expect.any(Date), solicitantePapel: 'operacoes', status: 'falhou' });
    expect(contemSentinela(JSON.stringify(lista))).toBe(false);
  });

  it('antes de falhar, a pendente aparece como aguardando', async () => {
    const id = await enviarAoAgente({ solicitantePapel: undefined });
    expect((await listarEntradasPendentes(deps.db)).find((p) => p.id === id)).toEqual({
      id,
      recebidaEm: relogio.agora(),
      solicitantePapel: null,
      status: 'aguardando',
    });
  });

  it('agente desligado depois de a entrada entrar na fila → execução ignorada e a pendente fica falhou', async () => {
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    await desligar('orquestrador');
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);
    expect((await pendente(id))!.status).toBe('falhou');
  });

  it('teto atingido depois de a entrada entrar na fila → ignorada, sem chamada, e a pendente fica falhou', async () => {
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    await definirTeto(0);
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);
    expect((await pendente(id))!.status).toBe('falhou');
  });

  it('listarEntradasPendentes: da mais nova para a mais antiga', async () => {
    const primeira = await enviarAoAgente();
    relogio.avancar(60_000);
    const segunda = await enviarAoAgente();
    expect((await listarEntradasPendentes(deps.db)).map((p) => p.id)).toEqual([segunda, primeira]);
  });
});

describe('preencher à mão a partir da pendente', () => {
  it('obterEntradaPendente: a pessoa lê o texto, a origem, o nome e o papel para preencher o formulário', async () => {
    const id = await enviarAoAgente({ origem: { canal: 'email' } });
    expect(await obterEntradaPendente(deps, cto, id)).toEqual({
      texto: TEXTO,
      origem: { canal: 'email' },
      solicitanteNome: SENTINELAS.nome,
      solicitantePapel: 'operacoes',
    });
  });

  it('obterEntradaPendente: agente → sem_permissao; id fora do formato ou que não existe → nao_encontrado', async () => {
    const id = await enviarAoAgente();
    const e = await capturar(obterEntradaPendente(deps, orquestrador as unknown as AtorPessoa, id));
    expect(e).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(contemSentinela(JSON.stringify(e))).toBe(false);
    expect(await capturar(obterEntradaPendente(deps, cto, 'x'))).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await capturar(obterEntradaPendente(deps, cto, '6f1c2b0a-4d3e-4f5a-9b8c-7d6e5f4a3b2c'))).toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('preencher à mão a partir da pendente (entradaPendenteId) cria a demanda com o mesmo texto e apaga a pendente', async () => {
    const id = await enviarAoAgente({ origem: { canal: 'formulario' } });
    const recebida = relogio.agora();
    const ex = (await execucaoDa(id))!;
    provedor.respostas.push(resposta({ titulo: '' }), resposta({ titulo: '' }), resposta({ titulo: '' }));
    expect(await rodarAteOFim(ex.id)).toBe('falhou');

    relogio.avancar(DIA_MS / 2);
    const r = await registrarEntrada(
      deps,
      cto,
      entradaSchema.parse({ modo: 'manual', titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', entradaPendenteId: id, texto: 'outro texto' }),
    );
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    expect(r.demanda).toMatchObject({ rascunhoAgente: false, responsavel: { tipo: 'pessoa' }, solicitanteNome: 'Pessoa Ficticia' });
    // O texto, a origem e a data são os da pendente: o que chegou, quando chegou (o prazo de retenção conta dali).
    expect(await linhaBruta(r.demanda.id)).toEqual({ texto: TEXTO, origem: { canal: 'formulario' }, recebida_em: recebida });
    expect(await pendente(id)).toBeUndefined();
    expect(await contar('entrada_bruta', 'texto = $1', ['outro texto'])).toBe(0);
  });

  it('a pendente já convertida não converte de novo: nao_encontrado, sem segunda demanda', async () => {
    const id = await enviarAoAgente();
    const manual = () =>
      registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'manual', titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', entradaPendenteId: id }));
    await manual();
    const antes = await contar('demanda');
    expect(await capturar(manual())).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await contar('demanda')).toBe(antes);
  });

  it('convertida à mão antes do agente rodar → o agente não chama o provedor e não cria demanda', async () => {
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    await registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'manual', titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', entradaPendenteId: id }));
    const antes = await contar('demanda');
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('falhou');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await contar('demanda')).toBe(antes);
  });

  it('convertida à mão durante a chamada ao provedor → o agente não grava uma segunda demanda', async () => {
    const id = await enviarAoAgente();
    const ex = (await execucaoDa(id))!;
    const antes = await contar('demanda');
    const doAgenteAntes = await contar('demanda', 'rascunho_agente');
    const lento = {
      gerar: async () => {
        await registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'manual', titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', entradaPendenteId: id }));
        return resposta(SAIDA);
      },
    };
    expect(await executarAgente({ ...deps, provedor: lento }, ex.id)).toBe('falhou');
    expect(await contar('demanda')).toBe(antes + 1);
    expect(await contar('demanda', 'rascunho_agente')).toBe(doAgenteAntes);
  });
});

describe('POST /api/demandas/entrada no modo agente', () => {
  const postar = (corpo: unknown) => chamarRota(POST_ENTRADA, { metodo: 'POST', caminho: '/api/demandas/entrada', corpo, cookie: cookieCto });

  it('modo agente com orquestrador desligado → 409; ligado → 202 com entradaId, sem eco do texto', async () => {
    await desligar('orquestrador');
    const r409 = await postar({ modo: 'agente', texto: TEXTO, solicitanteNome: SENTINELAS.nome });
    expect(r409.status).toBe(409);
    expect(await r409.json()).toEqual({ erro: 'conflito', mensagem: MENSAGEM_ORQUESTRADOR_DESLIGADO });

    await ligar('orquestrador');
    const r = await postar({ modo: 'agente', texto: TEXTO, solicitanteNome: SENTINELAS.nome, origem: { canal: 'email' } });
    expect(r.status).toBe(202);
    const corpo = await r.text();
    expect(contemSentinela(corpo)).toBe(false);
    const json = JSON.parse(corpo) as { entradaId: string };
    expect(Object.keys(json)).toEqual(['entradaId']);
    expect(json.entradaId).toMatch(RE_UUID);
    expect((await pendente(json.entradaId))!.texto).toBe(TEXTO);
  });

  it('suspenso pelo teto → 409 com a mensagem de suspensão', async () => {
    await definirTeto(0);
    const r = await postar({ modo: 'agente', texto: TEXTO, solicitanteNome: SENTINELAS.nome });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGEM_ORQUESTRADOR_SUSPENSO });
  });
});

describe('T-03: agentesEmAndamento', () => {
  it('obterDemanda traz agentesEmAndamento com o risco pendente; concluída a execução, a lista fica vazia', async () => {
    await desligar('orquestrador');
    const r = await registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'manual', titulo: 'Pedidos duplicados', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    expect(r.demanda.agentesEmAndamento).toEqual([]);
    await ligar('risco');
    const esp = await criarEspecificacao(
      deps,
      cto,
      r.demanda.id,
      criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] }),
    );
    expect((await obterDemanda(deps.db, r.demanda.id)).agentesEmAndamento).toEqual([{ agente: 'risco', status: 'pendente' }]);

    const ex = (await consultar<{ id: string }>('select id from execucao_agente where chave_entrada = $1', [`esp:${esp.id}`]))[0]!;
    await b.poolMigrator.query(`update execucao_agente set status = 'em_andamento', bloqueada_ate = $2 where id = $1`, [ex.id, new Date(relogio.agora().getTime() + 60_000)]);
    expect((await obterDemanda(deps.db, r.demanda.id)).agentesEmAndamento).toEqual([{ agente: 'risco', status: 'em_andamento' }]);

    await b.poolMigrator.query(`update execucao_agente set status = 'falhou', bloqueada_ate = null where id = $1`, [ex.id]);
    expect((await obterDemanda(deps.db, r.demanda.id)).agentesEmAndamento).toEqual([]);
  });
});

describe('C-21: log sem texto', () => {
  it('o caminho inteiro (entrada, execução, falha e conversão à mão) não leva texto, nome, e-mail nem telefone ao log', async () => {
    const inicio = linhasDeLog.length;
    provedor.respostas.push(resposta(SAIDA));
    const id = await enviarAoAgente();
    await executarAgente({ ...deps, provedor }, (await execucaoDa(id))!.id);
    const outra = await enviarAoAgente();
    provedor.respostas.push(resposta({ titulo: '' }), resposta({ titulo: '' }), resposta({ titulo: '' }));
    await rodarAteOFim((await execucaoDa(outra))!.id);
    await registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'manual', titulo: 'T', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', entradaPendenteId: outra }));
    const novas = linhasDeLog.slice(inicio);
    expect(novas.length).toBeGreaterThan(0);
    expect(novas.some((l) => contemSentinela(l))).toBe(false);
  });
});
