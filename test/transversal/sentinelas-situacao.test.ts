// T02 do DEC-DEM-20261111-0018-v1 (D-05; RNF-03, RNF-04, SB-05): sentinelas da rota da situação do pedido, em arquivo
// próprio para não mexer nas asserções de test/transversal/sentinelas.test.ts. A mesma captura de lá (pino, console e
// transporte falso do Sentry iniciado do mesmo jeito). Pela rota, com o token `construir`: um DEC vigente, um
// substituído, um inexistente e um cujo pedido_gerado aponta para outra demanda; e um 5xx provocado pela falha da conexão
// do pool, com o id do DEC e um texto de erro do Postgres na mensagem. No fim, nem o id dos DEC, nem `wsod_`, nem o
// prefixo, nem o texto do token depois do prefixo aparecem no pino, no console ou no Sentry; o texto do Postgres não
// chega ao Sentry. Postgres real, relógio fixo, dados fictícios; o token só nasce em tempo de teste e nunca vai a
// mensagem de expect.
import { format } from 'node:util';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { comTransacao } from '../../src/db/transacao';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { relogioFixo } from '../../src/lib/relogio';
import { iniciarSentry } from '../../src/lib/sentry';
import { criarTokenDeIntegracao } from '../../src/modules/acesso/tokens-servico';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { CONFIRMADO, chamadasDoConstruir, inserirEventoDoPedido, preparadorDePedidos } from '../pedidos-construcao';

const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const TEXTO_DO_POSTGRES = 'relation "evento" does not exist';

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let prefixoConstruir: string;
const relogio = relogioFixo('2026-11-13T12:00:00Z');
const construir = chamadasDoConstruir(() => tokenConstruir);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'sentinelas-situacao', entregar: (decId) => construir.entregar(decId) });

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

// O texto do token depois de `wsod_` e do prefixo de 8 caracteres: o que nunca pode sair.
const textoDepoisDoPrefixo = (token: string) => token.slice('wsod_'.length + 8);

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  for (const metodo of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    espioes.push(vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => void linhasDoConsole.push(format(...args))));
  }
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte: transporteFalso });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const t = await comTransacao(deps.pool, (x) => criarTokenDeIntegracao(x, 'construir', deps.relogio));
  tokenConstruir = t.token;
  prefixoConstruir = t.prefixo;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  for (const e of espioes) e.mockRestore();
  await deps.fila.parar();
  await b.fechar();
});

it(
  'vigente, substituído, inexistente, de outra demanda e 5xx: nenhum id de DEC, wsod_, prefixo nem texto do token no pino, no console ou no Sentry; o texto do Postgres não vai ao Sentry',
  async () => {
    const vigente = await preparador.prepararDec();
    const substituido = await preparador.prepararDec();
    const v2 = await preparador.novoDec(substituido.autora, substituido.demandaId);
    await preparador.aprovar(v2);
    const deOutra = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, {
      acao: 'pedido_gerado',
      decId: deOutra.decId,
      demandaId: vigente.demandaId,
      atorTipo: 'pessoa',
      atorId: preparador.geradora.usuarioId,
      prefixo: null,
      depois: CONFIRMADO,
    });
    const inicioDoLog = linhasDoLog.length;
    const inicioDoConsole = linhasDoConsole.length;

    const respostas: Array<[number, string]> = [];
    for (const decId of [vigente.decId, substituido.decId, INEXISTENTE, deOutra.decId]) {
      const r = await construir.situacao(decId);
      respostas.push([r.status, await r.text()]);
    }
    expect(respostas).toEqual([
      [200, '{"situacao":"vigente"}'],
      [200, '{"situacao":"substituido"}'],
      [404, expect.stringContaining('nao_encontrado')],
      [404, expect.stringContaining('nao_encontrado')],
    ]);

    // 5xx provocado: a conexão da transação da leitura falha com o id do DEC e um texto do Postgres na mensagem. A
    // consulta do token (pool.query, que chama connect com callback) segue para o pool de verdade.
    const conectar = deps.pool.connect.bind(deps.pool) as (cb?: unknown) => unknown;
    const espiao = vi.spyOn(deps.pool, 'connect').mockImplementation(((cb?: unknown) => {
      if (typeof cb === 'function') return conectar(cb);
      return Promise.reject(new Error(`falha fictícia com ${vigente.decId} e ${TEXTO_DO_POSTGRES}`));
    }) as never);
    let r5xx: Response;
    try {
      r5xx = await construir.situacao(vigente.decId);
    } finally {
      espiao.mockRestore();
    }
    expect(r5xx.status).toBe(500);
    const corpo5xx = await r5xx.text();
    expect(JSON.parse(corpo5xx)).toMatchObject({ erro: 'erro_interno' });
    expect(corpo5xx.includes(TEXTO_DO_POSTGRES)).toBe(false);
    expect(corpo5xx.includes(vigente.decId)).toBe(false);

    await Sentry.flush(2_000);

    // O teste só prova algo se as saídas foram exercitadas.
    const rotasDoLog = linhasDoLog
      .slice(inicioDoLog)
      .map((l) => JSON.parse(l) as { evento?: string; rota?: string; status?: number })
      .filter((l) => l.evento === 'requisicao' && l.rota === '/api/pedidos-construcao/[decId]/situacao')
      .map((l) => l.status);
    expect(rotasDoLog).toEqual([200, 200, 404, 404, 500]);
    expect(envelopesDoSentry.length).toBeGreaterThanOrEqual(1);

    const saidas: Array<[string, string]> = [
      ['pino', linhasDoLog.slice(inicioDoLog).join('\n')],
      ['console', linhasDoConsole.slice(inicioDoConsole).join('\n')],
      ['Sentry', envelopesDoSentry.join('\n')],
    ];
    const ids = [vigente.decId, substituido.decId, INEXISTENTE, deOutra.decId, v2];
    expect(textoDepoisDoPrefixo(tokenConstruir).length).toBe(35);
    for (const [onde, texto] of saidas) {
      for (const id of ids) expect(texto.includes(id), `id de DEC em ${onde}`).toBe(false);
      expect(texto.includes('wsod_'), `wsod_ em ${onde}`).toBe(false);
      expect(texto.includes(prefixoConstruir), `prefixo em ${onde}`).toBe(false);
      expect(texto.includes(tokenConstruir), `token em ${onde}`).toBe(false);
      expect(texto.includes(textoDepoisDoPrefixo(tokenConstruir)), `texto do token depois do prefixo em ${onde}`).toBe(false);
    }
    // Sem as aspas: no envelope serializado elas sairiam escapadas, e a busca pelo texto inteiro passaria em falso.
    for (const pedaco of ['does not exist', 'falha fictícia'])
      expect(envelopesDoSentry.join('\n').includes(pedaco), 'texto do erro no Sentry').toBe(false);
  },
  120_000,
);
