// T05 do DEC-DEM-20261111-0018-v1 (D-05; SB-09 d, RNF-09, CA-02.5): sentinelas das recusas do D1 pelo nome em vigor na
// criação do DEC, em arquivo próprio para não mexer nas asserções de test/transversal/sentinelas.test.ts. A mesma
// captura de lá (pino, console e transporte falso do Sentry iniciado do mesmo jeito). Tudo pelas rotas: a demanda com o
// solicitante "Pessoa Sentinelazyx Ficticia" e a ESP com "Sentinelazyx"; o DEC criado pela rota de pessoa e aprovado; o
// solicitante trocado para "Outra Novazyq Ficticia" (citado no RSK); a geração recusada (422) e a entrega ao /construir
// recusada (422). No fim, nem o nome antigo nem o atual aparecem: nas respostas das recusas, nas linhas do pino e do
// console, nos envelopes do Sentry, em `evento` (antes e depois), na coluna `caminhos_com_nome_na_criacao` nem em
// nenhuma tabela do esquema `pgboss`. Postgres real, relógio fixo, dados fictícios; o token só nasce em tempo de teste.
import { format } from 'node:util';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import * as rotaDecisao from '../../src/app/api/pacotes-decisao/[decId]/decisao/route';
import * as rotaPedido from '../../src/app/api/pacotes-decisao/[decId]/pedido-construcao/route';
import * as rotaDemanda from '../../src/app/api/demandas/[id]/route';
import * as rotaEspecificacoes from '../../src/app/api/demandas/[id]/especificacoes/route';
import * as rotaPacotes from '../../src/app/api/demandas/[id]/pacotes-decisao/route';
import * as rotaPareceres from '../../src/app/api/demandas/[id]/pareceres-risco/route';
import * as rotaDemandas from '../../src/app/api/demandas/route';
import { comTransacao } from '../../src/db/transacao';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { relogioFixo } from '../../src/lib/relogio';
import { iniciarSentry } from '../../src/lib/sentry';
import { criarTokenDeIntegracao } from '../../src/modules/acesso/tokens-servico';
import { MENSAGENS_PEDIDO } from '../../src/modules/pedido-construcao/gerar';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { CONFIRMADO, chamadasDoConstruir, inserirEventoDoPedido } from '../pedidos-construcao';
import { chamarRota, type OpRequisicao } from '../requisicao';
import { criarPessoa } from '../sessao';

const SENTINELA_ANTIGA = 'Sentinelazyx';
const SENTINELA_ATUAL = 'Novazyq';
const NOME_ANTIGO = `Pessoa ${SENTINELA_ANTIGA} Ficticia`;
const NOME_ATUAL = `Outra ${SENTINELA_ATUAL} Ficticia`;

let b: BancoDeTeste;
let deps: Deps;
let cookieAutora: string;
let cookieDecisora: string;
let usuarioDecisora: string;
let tokenConstruir: string;
const relogio = relogioFixo('2026-11-14T19:00:00Z');
const construir = chamadasDoConstruir(() => tokenConstruir);

// Captura das saídas: pino (e console, segunda rede) e Sentry falso.
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

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  for (const metodo of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    espioes.push(vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => void linhasDoConsole.push(format(...args))));
  }
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte: transporteFalso });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  cookieAutora = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  const decisora = await criarPessoa(deps, { papel: 'cto' });
  cookieDecisora = decisora.cookie;
  usuarioDecisora = decisora.usuarioId;
  tokenConstruir = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  for (const e of espioes) e.mockRestore();
  await deps.fila.parar();
  await b.fechar();
});

type Handler = Parameters<typeof chamarRota>[0];
const chamar = (h: Handler, metodo: string, caminho: string, op: OpRequisicao & { params?: Record<string, string> }) => chamarRota(h, { metodo, caminho, ...op });

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

it(
  'recusas do D1 pelo nome da criação e pelo atual: nenhum dos dois nomes nas respostas, no pino, no console, no Sentry, no histórico, na coluna nem no pgboss',
  async () => {
    // Demanda, ESP, RSK e DEC pela rota de pessoa; a ESP cita o nome antigo, o RSK cita o que vai ser o atual.
    const rd = await chamar(rotaDemandas.POST, 'POST', '/api/demandas', {
      cookie: cookieAutora,
      corpo: { titulo: 'Pedidos duplicados (fictício)', tipo: 'bug', solicitanteNome: NOME_ANTIGO, contexto: 'Importação diária do ERP', descricaoProblema: 'Pedidos aparecem duas vezes' },
    });
    expect(rd.status).toBe(201);
    const demandaId = ((await rd.json()) as { id: string }).id;
    const params = { id: demandaId };
    const re = await chamar(rotaEspecificacoes.POST, 'POST', `/api/demandas/${demandaId}/especificacoes`, {
      cookie: cookieAutora,
      params,
      corpo: {
        descricaoObjetiva: 'Corrigir pedidos duplicados',
        situacaoAtual: `Conversar com ${SENTINELA_ANTIGA} sobre o estoque`,
        escopoInclui: ['Importação de pedidos'],
        sistemaAlvo: 'sistema-ficticio',
        repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
        criteriosAceitePreliminares: ['Pedido importado uma vez só'],
        definicaoDePronto: ['pnpm test verde'],
      },
    });
    expect(re.status).toBe(201);
    const rr = await chamar(rotaPareceres.POST, 'POST', `/api/demandas/${demandaId}/pareceres-risco`, {
      cookie: cookieAutora,
      params,
      corpo: { resumo: `${SENTINELA_ATUAL} acompanha a virada`, riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' },
    });
    expect(rr.status).toBe(201);

    const inicioDoLog = linhasDoLog.length;

    const rp = await chamar(rotaPacotes.POST, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, {
      cookie: cookieAutora,
      params,
      corpo: { resumoExecutivo: 'Corrigir a importação de pedidos', opcaoA: { descricao: 'Corrigir no importador' }, opcaoB: { descricao: 'Refazer a integração' }, nivelAprovacaoRequerido: 'cto' },
    });
    expect(rp.status).toBe(201);
    const decId = ((await rp.json()) as { id: string }).id;
    const ra = await chamar(rotaDecisao.PATCH, 'PATCH', `/api/pacotes-decisao/${decId}/decisao`, {
      cookie: cookieDecisora,
      params: { decId },
      corpo: { statusDecisao: 'aprovada', opcaoEscolhida: 'A' },
    });
    expect(ra.status).toBe(200);
    const rt = await chamar(rotaDemanda.PATCH, 'PATCH', `/api/demandas/${demandaId}`, { cookie: cookieAutora, params, corpo: { solicitanteNome: NOME_ATUAL } });
    expect(rt.status).toBe(200);

    // As recusas: a geração pela pessoa e a entrega ao /construir (com um pedido_gerado de pessoa anterior, pelo migrator).
    const rg = await chamar(rotaPedido.POST, 'POST', `/api/pacotes-decisao/${decId}/pedido-construcao`, { cookie: cookieDecisora, params: { decId }, corpo: CONFIRMADO });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId, demandaId, atorTipo: 'pessoa', atorId: usuarioDecisora, prefixo: null, depois: CONFIRMADO });
    const rx = await construir.entregar(decId);
    const recusas: Array<[number, string]> = [
      [rg.status, await rg.text()],
      [rx.status, await rx.text()],
    ];
    const esperado = { erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: nome', 'risco.conteudo: nome'] };
    expect(recusas.map(([s, c]) => [s, JSON.parse(c)])).toEqual([
      [422, esperado],
      [422, esperado],
    ]);

    await Sentry.flush(2_000);

    // O teste só prova algo se as saídas foram exercitadas e a coluna foi gravada.
    const rotasDoLog = linhasDoLog
      .slice(inicioDoLog)
      .map((l) => JSON.parse(l) as { evento?: string; rota?: string; status?: number })
      .filter((l) => l.evento === 'requisicao')
      .map((l) => [l.rota, l.status]);
    expect(rotasDoLog).toEqual([
      ['/api/demandas/[id]/pacotes-decisao', 201],
      ['/api/pacotes-decisao/[decId]/decisao', 200],
      ['/api/demandas/[id]', 200],
      ['/api/pacotes-decisao/[decId]/pedido-construcao', 422],
      ['/api/pedidos-construcao/[decId]/entrega', 422],
    ]);
    const coluna = await b.poolMigrator.query<{ c: string[] | null }>('select caminhos_com_nome_na_criacao as c from pacote_decisao where demanda_id = $1', [demandaId]);
    expect(coluna.rows.map((r) => r.c)).toEqual([['especificacao.conteudo']]);

    const eventos = await b.poolMigrator.query<{ antes: string | null; depois: string | null }>('select antes::text as antes, depois::text as depois from evento');
    const todasAsColunas = await b.poolMigrator.query<{ c: string | null }>("select array_to_string(caminhos_com_nome_na_criacao, ',') as c from pacote_decisao");
    const saidas: Array<[string, string]> = [
      ['respostas das recusas', recusas.map(([, c]) => c).join('\n')],
      ['pino', linhasDoLog.join('\n')],
      ['console', linhasDoConsole.join('\n')],
      ['Sentry', envelopesDoSentry.join('\n')],
      ['evento', JSON.stringify(eventos.rows)],
      ['coluna', JSON.stringify(todasAsColunas.rows)],
      ['pgboss', JSON.stringify(await todasAsLinhasDoPgboss())],
    ];
    for (const [onde, texto] of saidas) {
      for (const sentinela of [SENTINELA_ANTIGA, SENTINELA_ATUAL]) expect(texto.toLowerCase().includes(sentinela.toLowerCase()), `${sentinela} em ${onde}`).toBe(false);
    }
  },
  120_000,
);
