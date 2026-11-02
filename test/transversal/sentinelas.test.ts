// T34: teste transversal de sentinelas (RNF-10, C-21 ampliado, C-22, critério preliminar 13). O sistema inteiro roda
// contra o Postgres real (Testcontainers), com o Better Auth, os tokens de serviço, a fila do pg-boss, o provedor de IA
// falso e o Resend com `fetch` falso (RNF-14: nada sai da máquina). Relógio fixo (RNF-15). Dados só fictícios.
//
// A entrada leva texto, nome, e-mail, telefone, token e senha sentinelas por todos os caminhos: entrada pelo
// orquestrador, ESP, RSK e DEC por agente e por pessoa, decisão, Pedido de Construção e os caminhos de erro (400, 409,
// violação de CHECK no banco, saída de agente fora do schema, erro do provedor, Resend falhando, login errado, token
// inválido). No fim, nenhum sentinela pode estar:
// - nas linhas do pino (o `log` de src/lib/log.ts) nem no console;
// - nos envelopes do Sentry, pelo transporte falso;
// - em nenhuma tabela do esquema `pgboss` (payload, saída e erro guardados pelo pg-boss);
// - em `execucao_agente`.
import { format } from 'node:util';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { PROMPTS } from '../../src/agents';
import * as rotaDecisao from '../../src/app/api/pacotes-decisao/[decId]/decisao/route';
import * as rotaPedido from '../../src/app/api/pacotes-decisao/[decId]/pedido-construcao/route';
import * as rotaDemanda from '../../src/app/api/demandas/[id]/route';
import * as rotaEntrada from '../../src/app/api/demandas/entrada/route';
import * as rotaEspecificacoes from '../../src/app/api/demandas/[id]/especificacoes/route';
import * as rotaPacotes from '../../src/app/api/demandas/[id]/pacotes-decisao/route';
import * as rotaPareceres from '../../src/app/api/demandas/[id]/pareceres-risco/route';
import * as rotaDemandas from '../../src/app/api/demandas/route';
import { comTransacao } from '../../src/db/transacao';
import { tratarAgenteExecutar } from '../../src/jobs/agente-executar';
import { tratarAvisoDecPronto } from '../../src/jobs/aviso-dec-pronto';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { MENSAGEM_ERRO_INTERNO } from '../../src/lib/erros';
import { criarFila, FILAS } from '../../src/lib/fila';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { relogioFixo } from '../../src/lib/relogio';
import { iniciarSentry } from '../../src/lib/sentry';
import type { Agente } from '../../src/modules/acesso/ator';
import { criarTokenServico } from '../../src/modules/acesso/tokens-servico';
import type { DepsAgente } from '../../src/modules/agentes/executar';
import type { DepsAviso } from '../../src/modules/avisos/aviso-dec';
import { EnviadorResend } from '../../src/modules/avisos/enviador';
import { CONFIG_TESTE } from '../auth';
import { novoBanco, type BancoDeTeste } from '../banco';
import { AGORA_TESTE, criarDepsDeTeste } from '../deps';
import { ProvedorFalso } from '../provedor-falso';
import { chamarRota, type OpRequisicao } from '../requisicao';
import { SENTINELAS, contemSentinela } from '../sentinelas';
import { criarPessoa, postAuth } from '../sessao';

const MODELO = 'modelo-ficticio';
const SEGUNDOS_30 = 30_000;

let b: BancoDeTeste;
let deps: Deps;
let depsAgente: DepsAgente;
const relogio = relogioFixo(AGORA_TESTE);
const provedor = new ProvedorFalso();

// Captura das quatro saídas: pino (e console, segunda rede), Sentry falso, pgboss e execucao_agente.
const linhasDoLog: string[] = [];
const linhasDoConsole: string[] = [];
const envelopesDoSentry: string[] = [];
const transporteFalso = () => ({
  send: async (envelope: unknown) => {
    envelopesDoSentry.push(JSON.stringify(envelope));
    return {};
  },
  flush: async () => true,
});
const espioes: Array<{ mockRestore(): void }> = [];
// Corpo de cada resposta de erro devolvida ao usuário (RNF-10: sem sentinela, pilha, SQL nem nome interno).
const respostasDeErro: Array<{ rotulo: string; corpo: string }> = [];
async function guardarErro(rotulo: string, r: Response): Promise<Response> {
  respostasDeErro.push({ rotulo, corpo: await r.clone().text() });
  return r;
}

let cookieAutora: string;
let cookieDecisora: string;
let tokenInsumo: string;

// --- ajudantes ---

type Handler = Parameters<typeof chamarRota>[0];
const comoPessoa = (cookie: string): OpRequisicao => ({ cookie });

async function chamar(h: Handler, metodo: string, caminho: string, op: OpRequisicao & { params?: Record<string, string> }) {
  return chamarRota(h, { metodo, caminho, ...op });
}

async function corpoJson<T = Record<string, unknown>>(r: Response): Promise<T> {
  return (await r.json()) as T;
}

const resposta = (saida: unknown, texto?: string) => ({
  texto: texto ?? JSON.stringify(saida),
  modelo: MODELO,
  tokensEntrada: 120,
  tokensSaida: 80,
});

// A execução pendente mais nova do agente, tratada pelo handler da fila com o job que o pg-boss guardou para ela.
async function rodarAgente(agente: Agente): Promise<string> {
  const ex = await b.poolMigrator.query<{ id: string }>(
    `select id from execucao_agente where agente = $1 and status = 'pendente' order by criada_em desc limit 1`,
    [agente],
  );
  const execucaoId = ex.rows[0]?.id;
  expect(execucaoId, `execução pendente de ${agente}`).toBeDefined();
  const job = await b.poolMigrator.query<{ id: string; data: unknown }>(
    `select id, data from pgboss.job where name = $1 and data->>'execucaoId' = $2 order by singleton_key desc limit 1`,
    [FILAS.agenteExecutar, execucaoId],
  );
  expect(job.rows[0], `job de ${agente}`).toBeDefined();
  await tratarAgenteExecutar(depsAgente, [job.rows[0]!]);
  const st = await b.poolMigrator.query<{ status: string }>('select status from execucao_agente where id = $1', [execucaoId]);
  return st.rows[0]!.status;
}

const espDeConstrucao = (extra: Record<string, unknown> = {}) => ({
  descricaoObjetiva: `Corrigir pedidos duplicados ${SENTINELAS.texto}`,
  escopoInclui: ['Importação diária'],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Nenhum pedido duplicado'],
  definicaoDePronto: ['Teste verde'],
  ...extra,
});
const rskDaPessoa = {
  resumo: `Risco baixo ${SENTINELAS.texto}`,
  riscoTecnicoNivel: 'baixo',
  riscoOperacionalNivel: 'medio',
  riscoJuridicoNivel: 'baixo',
};
const decDaPessoa = {
  resumoExecutivo: `Resumo ${SENTINELAS.texto}`,
  opcaoA: { descricao: `Corrigir agora ${SENTINELAS.texto}` },
  opcaoB: { descricao: 'Esperar a próxima versão' },
  nivelAprovacaoRequerido: 'cto',
};

const criarDemandaPelaApi = async (extra: Record<string, unknown> = {}) =>
  chamar(rotaDemandas.POST, 'POST', '/api/demandas', {
    ...comoPessoa(cookieAutora),
    corpo: {
      titulo: 'Pedidos duplicados no ERP',
      tipo: 'bug',
      solicitanteNome: SENTINELAS.nome,
      contexto: `Importação diária ${SENTINELAS.texto}`,
      descricaoProblema: SENTINELAS.texto,
      ...extra,
    },
  });

// Demanda, ESP, RSK e DEC gravados por pessoa pela API; devolve o id do DEC. O nome do solicitante (sentinela) não vai
// ao pedido (CA-22.6); e-mail e telefone na descrição da demanda ou na ESP fazem o pedido ser recusado (C-28).
async function caminhoDaPessoa(
  op: { situacaoAtual?: string; espDoAgente?: boolean; demanda?: Record<string, unknown> } = {},
): Promise<{ demandaId: string; decId: string }> {
  const rd = await criarDemandaPelaApi(op.demanda);
  expect(rd.status).toBe(201);
  const demandaId = (await corpoJson<{ id: string }>(rd)).id;
  const params = { id: demandaId };
  if (op.espDoAgente) {
    const r = await chamar(rotaEspecificacoes.POST, 'POST', `/api/demandas/${demandaId}/especificacoes`, {
      bearer: tokenInsumo,
      params,
      corpo: { ...(PROMPTS.insumo_tecnico.exemploSaida as object), situacaoAtual: SENTINELAS.texto },
    });
    expect(r.status, 'ESP pelo token do agente').toBe(201);
  }
  const re = await chamar(rotaEspecificacoes.POST, 'POST', `/api/demandas/${demandaId}/especificacoes`, {
    ...comoPessoa(cookieAutora),
    params,
    corpo: espDeConstrucao(op.situacaoAtual ? { situacaoAtual: op.situacaoAtual } : {}),
  });
  expect(re.status, 'ESP da pessoa').toBe(201);
  const rr = await chamar(rotaPareceres.POST, 'POST', `/api/demandas/${demandaId}/pareceres-risco`, { ...comoPessoa(cookieAutora), params, corpo: rskDaPessoa });
  expect(rr.status, 'RSK da pessoa').toBe(201);
  const rp = await chamar(rotaPacotes.POST, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, { ...comoPessoa(cookieAutora), params, corpo: decDaPessoa });
  expect(rp.status, 'DEC da pessoa').toBe(201);
  return { demandaId, decId: (await corpoJson<{ id: string }>(rp)).id };
}

const aprovar = (decId: string) =>
  chamar(rotaDecisao.PATCH, 'PATCH', `/api/pacotes-decisao/${decId}/decisao`, {
    ...comoPessoa(cookieDecisora),
    params: { decId },
    corpo: { statusDecisao: 'aprovada', opcaoEscolhida: 'A', comentarios: `Aprovado ${SENTINELAS.texto}` },
  });

const gerarPedido = (decId: string) =>
  chamar(rotaPedido.POST, 'POST', `/api/pacotes-decisao/${decId}/pedido-construcao`, { ...comoPessoa(cookieDecisora), params: { decId }, corpo: {} });

async function todasAsLinhasDoPgboss(): Promise<Record<string, unknown[]>> {
  const tabelas = await b.poolMigrator.query<{ relname: string }>(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'pgboss' and c.relkind in ('r', 'p') order by c.relname`,
  );
  const saida: Record<string, unknown[]> = {};
  for (const { relname } of tabelas.rows) {
    saida[relname] = (await b.poolMigrator.query(`select * from pgboss."${relname.replaceAll('"', '""')}"`)).rows;
  }
  return saida;
}

// --- preparação ---

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  for (const metodo of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    espioes.push(vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => void linhasDoConsole.push(format(...args))));
  }
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte: transporteFalso });

  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  depsAgente = { db: deps.db, pool: deps.pool, relogio, fila: deps.fila, provedor };

  cookieAutora = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieDecisora = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenInsumo = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', relogio))).token;

  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 50 where id = 1');
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  for (const e of espioes) e.mockRestore();
  await deps.fila.parar();
  await b.fechar();
});

it(
  'fluxo completo e caminhos de erro sem nenhum sentinela no pino, no Sentry falso, no pgboss nem em execucao_agente',
  async () => {
    // 1. Entrada pelo orquestrador ligado, com todos os sentinelas no texto, no nome e na origem. A saída do provedor
    //    falso traz SENTINELAS.texto em descricaoProblema: conteúdo de IA também não pode ir ao log.
    await b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1`, [MODELO]);
    const textoBruto = [
      `Bom dia, aqui é ${SENTINELAS.nome}.`,
      `Meu e-mail é ${SENTINELAS.email} e meu telefone é ${SENTINELAS.telefone}.`,
      `O token que recebi foi ${SENTINELAS.token} e a senha ${SENTINELAS.senha}.`,
      `Problema: ${SENTINELAS.texto}`,
    ].join('\n');
    const rEntrada = await chamar(rotaEntrada.POST, 'POST', '/api/demandas/entrada', {
      ...comoPessoa(cookieAutora),
      corpo: { modo: 'agente', texto: textoBruto, solicitanteNome: SENTINELAS.nome, origem: { canal: 'email', referencia: SENTINELAS.email } },
    });
    expect(rEntrada.status).toBe(202);

    provedor.respostas.push(resposta({ ...(PROMPTS.orquestrador.exemploSaida as object), descricaoProblema: `Relato: ${SENTINELAS.texto}` }));
    expect(await rodarAgente('orquestrador')).toBe('concluida');
    const demandaA = (await b.poolMigrator.query<{ id: string }>(`select artefato_id as id from execucao_agente where agente = 'orquestrador'`)).rows[0]!.id;
    expect(demandaA).toMatch(/^DEM-\d{8}-\d{4}$/);

    // 2a. ESP pelo agente de insumo técnico: a 1ª saída está fora do schema e traz sentinelas; a 2ª vale.
    provedor.respostas.push(resposta(null, `{"descricaoObjetiva": 42, "nota": "${SENTINELAS.email} ${SENTINELAS.texto} ${SENTINELAS.token}"}`));
    expect(await rodarAgente('insumo_tecnico')).toBe('pendente');
    relogio.avancar(SEGUNDOS_30 + 1_000);
    provedor.respostas.push(resposta({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [], descricaoObjetiva: `ESP ${SENTINELAS.texto}` }));
    expect(await rodarAgente('insumo_tecnico')).toBe('concluida');

    // 2b. RSK pelo agente de risco: o provedor lança erro com sentinela na mensagem (erro inesperado, vai ao Sentry).
    provedor.respostas.push(new Error(`falhou para ${SENTINELAS.email} com ${SENTINELAS.token}\n    at ${SENTINELAS.texto}`));
    expect(await rodarAgente('risco')).toBe('falhou');

    // 2c. A pessoa grava o RSK da demanda do agente; a consolidação, ligada, grava o DEC como rascunho.
    const rRskA = await chamar(rotaPareceres.POST, 'POST', `/api/demandas/${demandaA}/pareceres-risco`, {
      ...comoPessoa(cookieAutora),
      params: { id: demandaA },
      corpo: rskDaPessoa,
    });
    expect(rRskA.status).toBe(201);
    provedor.respostas.push(resposta({ ...(PROMPTS.consolidacao.exemploSaida as object), resumoExecutivo: `Consolidado ${SENTINELAS.texto}` }));
    expect(await rodarAgente('consolidacao')).toBe('concluida');

    // 2d. Agentes desligados: o caminho da pessoa, com ESP também pelo token do agente; aprovação e Pedido de Construção.
    await b.poolMigrator.query('update configuracao_agente set ligado = false');
    const aprovado = await caminhoDaPessoa({ espDoAgente: true });
    expect((await aprovar(aprovado.decId)).status).toBe(200);
    const rPedido = await gerarPedido(aprovado.decId);
    expect(rPedido.status).toBe(200);
    await rPedido.text();
    // Com e-mail na ESP, o pedido é recusado (C-28).
    const comEmail = await caminhoDaPessoa({
      situacaoAtual: `Falar com ${SENTINELAS.email}`,
      demanda: { contexto: `Contato ${SENTINELAS.email} ${SENTINELAS.telefone}` },
    });
    expect((await aprovar(comEmail.decId)).status).toBe(200);
    expect((await guardarErro('422 do pedido com e-mail', await gerarPedido(comEmail.decId))).status).toBe(422);

    // 3. Caminhos de erro.
    // 400 de validação com sentinelas no corpo, inclusive em chave desconhecida e em link recusado.
    const r400 = await chamar(rotaDemandas.POST, 'POST', '/api/demandas', {
      ...comoPessoa(cookieAutora),
      corpo: {
        titulo: '',
        tipo: SENTINELAS.texto,
        solicitanteNome: SENTINELAS.nome,
        contexto: SENTINELAS.email,
        anexos: [{ tipo: 'url', referencia: `javascript:${SENTINELAS.token}` }],
        [SENTINELAS.email]: SENTINELAS.senha,
      },
    });
    expect(r400.status).toBe(400);
    await guardarErro('400 de validação', r400);
    // Corpo que nem é JSON, com sentinela.
    const rJson = await chamar(rotaDemandas.POST, 'POST', '/api/demandas', { ...comoPessoa(cookieAutora), corpo: `{"titulo": "${SENTINELAS.texto}"` });
    expect(rJson.status).toBe(400);
    await guardarErro('400 de corpo que não é JSON', rJson);
    // 409 de transição, com sentinela no corpo.
    const r409 = await chamar(rotaDemanda.PATCH, 'PATCH', `/api/demandas/${aprovado.demandaId}`, {
      ...comoPessoa(cookieAutora),
      params: { id: aprovado.demandaId },
      corpo: { status: 'entregue', titulo: SENTINELAS.texto, contexto: SENTINELAS.email },
    });
    expect(r409.status).toBe(409);
    await guardarErro('409 de transição', r409);
    // Violação de CHECK provocada pelo migrator: a linha recusada traz os sentinelas na mensagem do Postgres (500).
    await b.poolMigrator.query(`alter table demanda add constraint t34_sem_sentinela check (position('SENTINELA' in titulo) = 0) not valid`);
    try {
      const r500 = await criarDemandaPelaApi({ titulo: `Pedido ${SENTINELAS.texto}` });
      expect(r500.status).toBe(500);
      await guardarErro('500 da violação de CHECK', r500);
      // O 500 é o genérico do mapeador (C-20), sem a mensagem nem o `detail` do Postgres.
      expect(await r500.json()).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    } finally {
      await b.poolMigrator.query('alter table demanda drop constraint t34_sem_sentinela');
    }
    // Token de serviço que não existe (o próprio sentinela) e login errado com e-mail e senha sentinelas.
    const rToken = await chamar(rotaDemandas.GET, 'GET', '/api/demandas', { bearer: SENTINELAS.token });
    expect(rToken.status).toBe(401);
    await guardarErro('401 do token inexistente', rToken);
    const rLogin = await postAuth(deps.auth, '/sign-in/email', { email: SENTINELAS.email, password: SENTINELAS.senha });
    expect(rLogin.status).toBe(401);
    await guardarErro('401 do login errado', rLogin);

    // Resend falhando com sentinela no erro de rede e no corpo da resposta; a chave e o destinatário são sentinelas.
    let chamadasAoResend = 0;
    const fetchFalso: typeof fetch = async () => {
      chamadasAoResend += 1;
      if (chamadasAoResend % 2 === 1) throw new Error(`rede caiu para ${SENTINELAS.email} ${SENTINELAS.token}`);
      return new Response(JSON.stringify({ message: `invalid to ${SENTINELAS.email}`, name: SENTINELAS.nome }), { status: 500 });
    };
    const depsAviso: DepsAviso = {
      pool: deps.pool,
      relogio,
      config: { urlBase: CONFIG_TESTE.urlBase, emailRemetente: 'avisos@ficticio.test', emailAvisoDecisao: SENTINELAS.email },
      enviador: new EnviadorResend({ chave: SENTINELAS.token, fetch: fetchFalso }),
    };
    // A 1ª tentativa de cada aviso passa pelo pg-boss de verdade, que guarda o erro relançado no próprio job.
    const avisos = Number((await b.poolMigrator.query(`select count(*) from pgboss.job where name = $1`, [FILAS.avisoDecPronto])).rows[0].count);
    expect(avisos).toBe(3);
    const filaAviso = await criarFila(b.urlApp);
    try {
      await filaAviso.boss.work(FILAS.avisoDecPronto, { batchSize: 1 }, (jobs) => tratarAvisoDecPronto(depsAviso, jobs));
      await expect
        .poll(async () => Number((await b.poolMigrator.query(`select count(*) from pgboss.job where name = $1 and state = 'retry'`, [FILAS.avisoDecPronto])).rows[0].count), {
          timeout: 30_000,
          interval: 250,
        })
        .toBe(avisos);
    } finally {
      await filaAviso.parar();
    }
    // A 2ª e a 3ª tentativa de um aviso pelo handler: na 3ª, `falhou`, log de erro e Sentry.
    const jobAviso = (
      await b.poolMigrator.query<{ id: string; data: unknown }>(`select id, data from pgboss.job where name = $1 and data->>'decId' = $2`, [
        FILAS.avisoDecPronto,
        aprovado.decId,
      ])
    ).rows[0]!;
    await expect(tratarAvisoDecPronto(depsAviso, [jobAviso])).rejects.toThrow('aviso_nao_enviado');
    await expect(tratarAvisoDecPronto(depsAviso, [jobAviso])).resolves.toBeUndefined();
    expect((await b.poolMigrator.query('select status from aviso_email where pacote_decisao_id = $1', [aprovado.decId])).rows[0].status).toBe('falhou');
    expect(chamadasAoResend).toBe(avisos + 2);

    // 4. Leitura: todas as tabelas do esquema pgboss e execucao_agente, pelo migrator.
    await Sentry.flush(2_000);
    const linhasPgboss = await todasAsLinhasDoPgboss();
    const execucoes = (await b.poolMigrator.query('select * from execucao_agente order by criada_em')).rows;

    // O teste só prova algo se as saídas foram de fato exercitadas.
    const eventos = new Set(linhasDoLog.map((l) => (JSON.parse(l) as { evento?: string }).evento));
    for (const e of ['requisicao', 'login_falhou', 'agente_reagendado', 'agente_concluido', 'falha_agente', 'aviso_email_falha', 'aviso_email_falhou']) {
      expect(eventos, e).toContain(e);
    }
    expect(provedor.chamadas).toHaveLength(5);
    expect(envelopesDoSentry.length).toBeGreaterThanOrEqual(3);
    const sentry = envelopesDoSentry.join('');
    // A violação de CHECK (500 da rota), o erro do provedor e o aviso que falhou chegaram ao Sentry, reduzidos.
    expect(sentry).toContain('23514');
    expect(sentry).toContain('ErroEnvioEmail');
    expect(linhasPgboss.job?.length ?? 0).toBeGreaterThan(0);
    // O erro que o handler relançou ficou guardado pelo pg-boss no job do aviso, com a mensagem fixa.
    expect(JSON.stringify(linhasPgboss.job)).toContain('aviso_nao_enviado');
    expect(execucoes.map((e) => `${String(e.agente)}:${String(e.status)}`).sort()).toEqual([
      'consolidacao:concluida',
      'insumo_tecnico:concluida',
      'orquestrador:concluida',
      'risco:falhou',
    ]);

    expect(contemSentinela(linhasDoLog.join(''))).toBe(false);
    expect(contemSentinela(linhasDoConsole.join(''))).toBe(false);
    expect(contemSentinela(envelopesDoSentry.join(''))).toBe(false);
    expect(contemSentinela(JSON.stringify(linhasPgboss))).toBe(false);
    expect(contemSentinela(JSON.stringify(execucoes))).toBe(false);

    // RNF-10: o cookie de sessão e o token de serviço de verdade (não só os sentinelas) também não saem. O valor do
    // cookie entra como veio e decodificado, e o token de sessão (antes da assinatura) entra sozinho.
    const valoresDosCookies = [cookieAutora, cookieDecisora].flatMap((c) =>
      c.split('; ').flatMap((par) => {
        const valor = par.slice(par.indexOf('=') + 1);
        const decodificado = decodeURIComponent(valor);
        return [valor, decodificado, decodificado.split('.')[0]!];
      }),
    );
    const segredosReais = [...new Set([...valoresDosCookies, tokenInsumo])].filter((s) => s.length >= 16);
    expect(segredosReais.length, 'cookies e token de serviço capturados').toBeGreaterThanOrEqual(3);
    const todasAsSaidas = [linhasDoLog.join(''), linhasDoConsole.join(''), envelopesDoSentry.join(''), JSON.stringify(linhasPgboss), JSON.stringify(execucoes)].join('\n');
    for (const s of segredosReais) expect(todasAsSaidas.includes(s), `segredo real de ${s.length} caracteres numa saída`).toBe(false);

    // RNF-10: conteúdo de prompt também não vai ao log nem ao Sentry. O texto sentinela chegou mesmo ao provedor (a
    // asserção acima não é vazia), e nenhum trecho do prompt de sistema aparece nas saídas.
    expect(JSON.stringify(provedor.chamadas)).toContain(SENTINELAS.texto);
    for (const c of provedor.chamadas) {
      expect(c.sistema.length).toBeGreaterThan(60);
      expect(todasAsSaidas.includes(c.sistema.slice(0, 60)), 'prompt de sistema numa saída').toBe(false);
    }

    // C-22: payload de job só com ids. `agente.executar` leva só `{ execucaoId }` e `aviso.dec-pronto` só `{ decId }`.
    const jobs = (linhasPgboss.job ?? []) as Array<{ name: string; data: unknown }>;
    const dadosDaFila = (fila: string) => jobs.filter((j) => j.name === fila).map((j) => j.data as Record<string, unknown>);
    expect(dadosDaFila(FILAS.agenteExecutar).length).toBeGreaterThanOrEqual(4);
    for (const d of dadosDaFila(FILAS.agenteExecutar)) expect(Object.keys(d)).toEqual(['execucaoId']);
    expect(dadosDaFila(FILAS.avisoDecPronto)).toHaveLength(3);
    for (const d of dadosDaFila(FILAS.avisoDecPronto)) expect(Object.keys(d)).toEqual(['decId']);

    // RNF-10 e C-20: o erro devolvido ao usuário não leva sentinela, pilha, SQL nem nome interno.
    expect(respostasDeErro.map((r) => r.rotulo)).toEqual([
      '422 do pedido com e-mail',
      '400 de validação',
      '400 de corpo que não é JSON',
      '409 de transição',
      '500 da violação de CHECK',
      '401 do token inexistente',
      '401 do login errado',
    ]);
    for (const { rotulo, corpo } of respostasDeErro) {
      expect(corpo.length, rotulo).toBeGreaterThan(0);
      expect(contemSentinela(corpo), rotulo).toBe(false);
      expect(corpo, rotulo).not.toMatch(/\n\s+at |\.ts:\d+|node_modules/);
      expect(corpo, rotulo).not.toMatch(/insert into|t34_sem_sentinela|23514|violates|postgres|drizzle|ErroDominio|ZodError|pgboss/i);
    }
  },
  180_000,
);
