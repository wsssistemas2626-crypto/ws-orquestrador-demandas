// RF-04, RF-05, RF-08, RF-09, RF-11 e IN-05, IN-06, IN-09, IN-12, IN-14 (T06): o POST /api/demandas pelo token do
// Awave, com rota, token e Postgres reais. Cada describe tem banco, relógio e token próprios: a contagem do limite não
// tem teto superior de data (registro da 06-T04-testes), então dois blocos que contam o awave nunca dividem banco, e o
// arquivo não depende de ordem. Dados e tokens fictícios; o token só nasce em tempo de teste e nunca vai a mensagem de
// expect (as asserções sobre ele são `includes(...)` com `toBe(false)`).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaAgentes from '../agentes/route';
import * as rotaHistorico from './[id]/historico/route';
import * as rotaDemanda from './[id]/route';
import * as rotaDemandas from './route';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import { AGENTES, type Ator } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, criarTokenServico, revogarTokenServico, validarTokenServico } from '../../../modules/acesso/tokens-servico';
import { situacaoDoTeto } from '../../../modules/agentes/teto';
import { autoriaDaDemanda } from '../../../modules/demandas/servico';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { MENSAGEM_LIMITE, MENSAGEM_LIMITE_AWAVE } from '../../../modules/limites';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, atorDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const MINUTO = 60_000;
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });
const CORPO_DE_PESSOA = { titulo: 'Demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' };
const CHAVE_DO_LIMITE_AWAVE = 'limite:demanda:integracao:awave';

type Ambiente = { b: BancoDeTeste; deps: Deps; relogio: RelogioFixo; token: string };

// Banco, deps, relógio e token do awave próprios do describe que chama.
function ambiente(inicio = '2026-11-11T12:00:00Z'): Ambiente {
  const a = {} as Ambiente;
  beforeAll(async () => {
    a.b = await novoBanco();
    a.relogio = relogioFixo(inicio);
    a.deps = await criarDepsDeTeste(a.b, { relogio: a.relogio });
    definirDepsParaTeste(a.deps);
    a.token = await tokenDeIntegracao(a.deps, 'awave');
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await a.deps.fila.parar();
    await a.b.fechar();
  });
  return a;
}

// Como a tool do Awave manda (e o agente, que também é cliente de servidor): Bearer, JSON, sem Origin e sem cookie.
const porToken = (bearer: string, corpo: unknown = CORPO_DO_AWAVE) =>
  chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer, corpo, semOrigin: true });
// Como o painel manda: cookie de sessão com 2FA e Origin certa.
const porSessao = (cookie: string, corpo: unknown = CORPO_DE_PESSOA) =>
  chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', cookie, corpo });

const idDo = async (r: Response) => ((await r.json()) as { id: string }).id;
const prefixoDo = (token: string) => token.slice(5, 13);
const restoDo = (token: string) => token.slice(13);

async function contar(b: BancoDeTeste, consulta: string, params: unknown[] = []): Promise<number> {
  return (await b.poolMigrator.query<{ n: number }>(consulta, params)).rows[0]!.n;
}

// O que uma recusa não pode mudar: a sequência de ids, as demandas e os eventos.
async function foto(b: BancoDeTeste) {
  const seq = (await b.poolMigrator.query<{ last_value: string; is_called: boolean }>('select last_value, is_called from demanda_seq')).rows[0];
  return {
    seq,
    demandas: await contar(b, 'select count(*)::int as n from demanda'),
    eventos: await contar(b, 'select count(*)::int as n from evento'),
  };
}

const linhaDaDemanda = async (b: BancoDeTeste, id: string) =>
  (await b.poolMigrator.query<{ l: Record<string, unknown> }>('select row_to_json(d) as l from demanda d where id = $1', [id])).rows[0]?.l;
const eventosDa = async (b: BancoDeTeste, id: string) =>
  (await b.poolMigrator.query<{ l: Record<string, unknown> }>('select row_to_json(e) as l from evento e where entidade_id = $1 order by id', [id])).rows.map(
    (r) => r.l,
  );

describe('G8 #6: autoriaDaDemanda', () => {
  it('o awave grava como integração; construir, sistema e tipo desconhecido são recusados; pessoa e agente como antes', () => {
    expect(autoriaDaDemanda(atorDeIntegracao('awave'))).toStrictEqual({ autorTipo: 'integracao', autorId: 'awave' });
    expect(() => autoriaDaDemanda(atorDeIntegracao('construir'))).toThrow(SEM_PERMISSAO);
    expect(() => autoriaDaDemanda({ tipo: 'sistema' })).toThrow(SEM_PERMISSAO);
    expect(() => autoriaDaDemanda({ tipo: 'robo' } as unknown as Ator)).toThrow('ator desconhecido');
    expect(autoriaDaDemanda({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' })).toStrictEqual({
      autorTipo: 'pessoa',
      autorId: 'u-ficticio',
    });
    expect(autoriaDaDemanda({ tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' })).toStrictEqual({ autorTipo: 'agente', autorId: 'risco' });
  });
});

describe('IN-05 e IN-12: o que o POST do Awave grava', () => {
  const a = ambiente();

  it('CA-04.2 a CA-04.4: autoria, solicitante e rascunho fixos; o que está fora da lista é descartado, sem 400', async () => {
    const corpo = {
      ...CORPO_DO_AWAVE,
      solicitanteNome: 'Maria Ficticia',
      autorTipo: 'pessoa',
      autorId: 'x',
      rascunhoAgente: false,
      anexos: [{ tipo: 'url', referencia: 'https://sentinela-a6f2.test/x' }],
      urgencia: 'alta',
      justificativaUrgencia: 'SENTINELA-JUSTIFICATIVA-a6f2',
      impactoPercebido: 'SENTINELA-IMPACTO-a6f2',
      linhaServicoProvavel: 'sob_medida',
      duvidasEntrada: ['SENTINELA-DUVIDA-a6f2'],
    };
    const r = await porToken(a.token, corpo);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    const l = await linhaDaDemanda(a.b, id);
    expect(l).toMatchObject({
      id,
      titulo: CORPO_DO_AWAVE.titulo,
      tipo: 'melhoria',
      status: 'nova',
      solicitante_nome: 'Awave',
      solicitante_papel: 'outro',
      descricao_problema: CORPO_DO_AWAVE.descricaoProblema,
      contexto: CORPO_DO_AWAVE.contexto,
      linha_servico_provavel: null,
      urgencia: null,
      justificativa_urgencia: null,
      impacto_percebido: null,
      anexos: [],
      duvidas_entrada: [],
      autor_tipo: 'integracao',
      autor_id: 'awave',
      rascunho_agente: true,
    });
    expect(JSON.stringify(l)).not.toMatch(/SENTINELA|Maria Ficticia|sentinela-a6f2|sob_medida|alta/);
  });

  it('IN-05: o papel do solicitante vem do corpo (está na lista)', async () => {
    const r = await porToken(a.token, { ...CORPO_DO_AWAVE, solicitantePapel: 'produto' });
    expect(r.status).toBe(201);
    expect(await linhaDaDemanda(a.b, await idDo(r))).toMatchObject({ solicitante_papel: 'produto', solicitante_nome: 'Awave' });
  });

  it('CA-04.5 e IN-12: um demanda_criada com o awave e o prefixo do token, e o depois só com status e tipo', async () => {
    const r = await porToken(a.token);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    const evs = await eventosDa(a.b, id);
    expect(evs).toHaveLength(1);
    const ev = evs[0]!;
    expect(ev).toMatchObject({
      ator_tipo: 'integracao',
      ator_id: 'awave',
      demanda_id: id,
      entidade: 'demanda',
      entidade_id: id,
      acao: 'demanda_criada',
      antes: null,
      depois: { status: 'nova', tipo: 'melhoria' },
    });
    expect(ev.depois).toStrictEqual({ status: 'nova', tipo: 'melhoria' });
    expect(ev.ator_token_prefixo === prefixoDo(a.token)).toBe(true);
    const texto = JSON.stringify(ev);
    for (const livre of [CORPO_DO_AWAVE.titulo!, CORPO_DO_AWAVE.descricaoProblema!, CORPO_DO_AWAVE.contexto!]) expect(texto.includes(livre)).toBe(false);
    expect(texto.includes(restoDo(a.token))).toBe(false);
    expect(texto.includes('wsod_')).toBe(false);

    // O que a pessoa lê no histórico da demanda: o ator Awave com o prefixo (IN-13), e nada do texto livre nem do token.
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    const h = await chamarRota(rotaHistorico.GET, { caminho: `/api/demandas/${id}/historico`, params: { id }, cookie });
    expect(h.status).toBe(200);
    const corpoH = await h.text();
    const { itens } = JSON.parse(corpoH) as { itens: Array<{ acao: string; ator: { tipo: string; integracao?: string; prefixo?: string } }> };
    expect(itens.map((i) => i.acao)).toEqual(['demanda_criada']);
    expect(itens[0]!.ator).toMatchObject({ tipo: 'integracao', integracao: 'awave' });
    expect(itens[0]!.ator.prefixo === prefixoDo(a.token)).toBe(true);
    for (const proibido of [restoDo(a.token), 'wsod_', CORPO_DO_AWAVE.titulo!, CORPO_DO_AWAVE.descricaoProblema!, CORPO_DO_AWAVE.contexto!])
      expect(corpoH.includes(proibido)).toBe(false);
  });

  it('CA-04.6: tipo fora da lista e corpo sem título → 400, sem gastar id nem gravar', async () => {
    const semTitulo: Record<string, string> = { ...CORPO_DO_AWAVE };
    delete semTitulo.titulo;
    const antes = await foto(a.b);
    for (const corpo of [{ ...CORPO_DO_AWAVE, tipo: 'urgente' }, semTitulo]) {
      const r = await porToken(a.token, corpo);
      expect(r.status).toBe(400);
      expect(await r.json()).toMatchObject({ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.' });
    }
    expect(await foto(a.b)).toEqual(antes);
  });

  it('IN-14: com a trava do limite do awave segura por outra conexão, 503 fixo e nada gravado; sem a trava, passa', async () => {
    const antes = await foto(a.b);
    const segura = await a.b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', [CHAVE_DO_LIMITE_AWAVE]);
      const r = await porToken(a.token);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', [CHAVE_DO_LIMITE_AWAVE]);
      segura.release();
    }
    expect(await foto(a.b)).toEqual(antes);
    expect((await porToken(a.token)).status).toBe(201);
  });

  it('IN-14: a linha de log do POST do Awave leva só o tipo do ator, sem token, prefixo, nome nem id', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    let r: Response;
    try {
      r = await porToken(a.token);
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(r.status).toBe(201);
    const id = await idDo(r);
    const log = linhas.map((l) => {
      const { time, ms, ...resto } = JSON.parse(l) as Record<string, unknown>;
      void time;
      void ms;
      return resto;
    });
    expect(log).toEqual([{ level: 30, evento: 'requisicao', metodo: 'POST', rota: '/api/demandas', status: 201, atorTipo: 'integracao' }]);
    const texto = linhas.join('\n');
    for (const proibido of [prefixoDo(a.token), restoDo(a.token), 'wsod_', 'awave', id, CORPO_DO_AWAVE.titulo!]) expect(texto.includes(proibido)).toBe(false);
  });

  it('CA-01.3 e CA-01.4: token do Awave revogado → 401 sem gravar; o outro do Awave, o de agente, o do /construir e a sessão continuam valendo', async () => {
    const outro = await comTransacao(a.deps.pool, (t) => criarTokenDeIntegracao(t, 'awave', a.relogio));
    expect((await porToken(outro.token)).status).toBe(201);
    expect(await comTransacao(a.deps.pool, (t) => revogarTokenServico(t, outro.prefixo, a.relogio))).toBe(true);
    const antes = await foto(a.b);
    const r = await porToken(outro.token);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido });
    expect(await foto(a.b)).toEqual(antes);

    expect((await porToken(a.token)).status).toBe(201);
    const deAgente = (await comTransacao(a.deps.pool, (t) => criarTokenServico(t, 'orquestrador', a.relogio))).token;
    expect((await porToken(deAgente, CORPO_DE_PESSOA)).status).toBe(201);
    const doConstruir = await tokenDeIntegracao(a.deps, 'construir');
    expect(await validarTokenServico(a.deps.db, doConstruir)).toMatchObject({ tipo: 'integracao', integracao: 'construir' });
    // Autenticado e negado pela matriz (403), e não 401: a revogação do outro não o tocou.
    const rc = await porToken(doConstruir);
    expect(rc.status).toBe(403);
    expect(await rc.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    expect((await porSessao(cookie)).status).toBe(201);
  });

  it('CA-10.6: um agente lê a demanda do Awave com a vista mínima, e o responsável é a integração', async () => {
    const id = await idDo(await porToken(a.token));
    const deAgente = (await comTransacao(a.deps.pool, (t) => criarTokenServico(t, 'risco', a.relogio))).token;
    const r = await chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer: deAgente, semOrigin: true });
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(corpo).toMatchObject({ id, rascunhoAgente: true, responsavel: { tipo: 'integracao', integracao: 'awave' } });
    expect(corpo.responsavel).toStrictEqual({ tipo: 'integracao', integracao: 'awave' });
    expect(corpo).not.toHaveProperty('solicitanteNome');
    expect(corpo).not.toHaveProperty('anexos');
  });
});

describe('IN-06 e D1: a demanda do Awave não dispara agente de IA ao nascer', () => {
  const a = ambiente();
  const MODELO = 'modelo-ficticio';
  beforeAll(async () => {
    // O insumo técnico ligado, com preço vigente e teto livre, como em gatilhos.test.ts.
    await a.b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
      MODELO,
      '2026-10-01T03:00:00Z',
    ]);
    await a.b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
    await a.b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1 where agente = 'insumo_tecnico'`, [MODELO]);
  });

  const execucoesDa = (id: string) => contar(a.b, 'select count(*)::int as n from execucao_agente where chave_entrada = $1', [`demanda:${id}`]);
  const jobs = () => contar(a.b, `select count(*)::int as n from pgboss.job where name = 'agente.executar'`);

  it('CA-05.1: com o insumo_tecnico ligado, o POST do Awave não cria execução nem job', async () => {
    const jobsAntes = await jobs();
    const r = await porToken(a.token);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    expect(await execucoesDa(id)).toBe(0);
    expect(await contar(a.b, 'select count(*)::int as n from execucao_agente where demanda_id = $1', [id])).toBe(0);
    expect(await jobs()).toBe(jobsAntes);
  });

  it('CA-05.2: a mesma criação por pessoa cria a execução e o job (regressão)', async () => {
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    const jobsAntes = await jobs();
    const r = await porSessao(cookie);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    expect(await execucoesDa(id)).toBe(1);
    expect(await jobs()).toBe(jobsAntes + 1);
  });
});

describe('IN-09: no máximo 10 demandas por hora do Awave, pela rota', () => {
  const a = ambiente();

  it('CA-08.1 e CA-08.2: a 11ª na janela é 429 sem gastar id; quando a primeira sai da janela, passa uma e só uma', async () => {
    for (let n = 1; n <= 10; n++) {
      expect((await porToken(a.token)).status, `criação ${n}`).toBe(201);
      a.relogio.avancar(MINUTO);
    }
    // As dez nasceram de T0 a T0+9 min; agora é T0+10 min.
    const antes = await foto(a.b);
    const r = await porToken(a.token);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE });
    expect(await foto(a.b)).toEqual(antes);
    // T0+60 min: só a primeira sai da janela (criada_em > agora - 1 h).
    a.relogio.avancar(50 * MINUTO);
    expect((await porToken(a.token)).status).toBe(201);
    expect((await porToken(a.token)).status).toBe(429);
  });
});

describe('IN-09: o limite do Awave não muda o das pessoas', () => {
  const a = ambiente();

  it('CA-08.3: com 10 do Awave na janela, uma pessoa cria 30, e a 31ª recebe o limite de pessoa', async () => {
    for (let n = 1; n <= 10; n++) expect((await porToken(a.token)).status, `awave ${n}`).toBe(201);
    expect((await porToken(a.token)).status).toBe(429);
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    for (let n = 1; n <= 30; n++) expect((await porSessao(cookie)).status, `pessoa ${n}`).toBe(201);
    const r = await porSessao(cookie);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE.demanda });
  });
});

describe('IN-09: concorrência no limite do Awave', () => {
  const a = ambiente();

  it('CA-08.4: 11 POSTs simultâneos com a janela vazia dão exatamente dez 201 e um 429', async () => {
    const respostas = await Promise.all(Array.from({ length: 11 }, () => porToken(a.token)));
    expect(respostas.map((r) => r.status).sort((x, y) => x - y)).toEqual([...Array<number>(10).fill(201), 429]);
    expect(await contar(a.b, `select count(*)::int as n from demanda where autor_tipo = 'integracao' and autor_id = 'awave'`)).toBe(10);
  });
});

describe('RF-11: o Awave fica fora da tela de agentes, do interruptor, do teto e do uso de IA', () => {
  const a = ambiente();

  it('CA-11.1 (API) e CA-11.3: depois de dez demandas do Awave, só os quatro agentes, e uso e teto iguais', async () => {
    const tetoAntes = await situacaoDoTeto(a.deps.db, a.relogio);
    const usoAntes = await contar(a.b, 'select count(*)::int as n from uso_ia');
    for (let n = 1; n <= 10; n++) expect((await porToken(a.token)).status, `awave ${n}`).toBe(201);
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    const r = await chamarRota(rotaAgentes.GET, { caminho: '/api/agentes', cookie });
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { agentes: Array<{ agente: string }> };
    expect(corpo.agentes.map((x) => x.agente).sort()).toEqual([...AGENTES].sort());
    expect(JSON.stringify(corpo)).not.toMatch(/awave/i);
    expect(await contar(a.b, 'select count(*)::int as n from configuracao_agente')).toBe(AGENTES.length);
    expect(await contar(a.b, 'select count(*)::int as n from uso_ia')).toBe(usoAntes);
    expect(await contar(a.b, 'select count(*)::int as n from execucao_agente')).toBe(0);
    expect(await situacaoDoTeto(a.deps.db, a.relogio)).toEqual(tetoAntes);
  });
});
