// T08 do DEC-DEM-20261111-0017-v1 (D-05; AN-11, RNF-03, RNF-04, CA-02.4): sentinelas da rota do andamento, em arquivo
// próprio para não mexer nas asserções de test/transversal/sentinelas.test.ts. A mesma captura de lá (pino, console,
// transporte falso do Sentry iniciado do mesmo jeito, todas as tabelas do esquema `pgboss`), e mais `andamento_construcao`
// e `antes`/`depois` de `evento`. Pela rota, com o token `construir`: a sentinela como valor de chave a mais, como nome de
// chave a mais, como `fase` e como `status`; um corpo válido (204); um 503 provocado (para o Sentry ter o que conferir); e
// a leitura, pelo token `awave`, de uma demanda do Awave com andamento gravado. No fim, nem a sentinela nem o texto de
// um token depois do prefixo aparecem em nenhuma saída. Postgres real, relógio fixo, dados fictícios; os tokens só
// nascem em tempo de teste e nunca vão a mensagem de expect.
import { format } from 'node:util';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import * as rotaDemanda from '../../src/app/api/demandas/[id]/route';
import * as rotaDemandas from '../../src/app/api/demandas/route';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { relogioFixo } from '../../src/lib/relogio';
import { iniciarSentry } from '../../src/lib/sentry';
import { criarEspecificacaoSchema } from '../../src/modules/especificacoes/schemas';
import { criarEspecificacao } from '../../src/modules/especificacoes/servico';
import { criarParecerRiscoSchema } from '../../src/modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../src/modules/pareceres-risco/servico';
import { andamentosDa, inserirAndamento } from '../andamento';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../integracoes';
import { chamadasDoConstruir, ESP_DO_PEDIDO, preparadorDePedidos, RSK_DO_PEDIDO } from '../pedidos-construcao';
import { chamarRota } from '../requisicao';
import { contemSentinela } from '../sentinelas';

const SENTINELA = 'SENTINELA-ANDAMENTO-7c1e';
const VALIDO = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' } as const;

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let tokenAwave: string;
const relogio = relogioFixo('2026-11-12T12:00:00Z');
const construir = chamadasDoConstruir(() => tokenConstruir);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'sentinelas-andamento', entregar: (decId) => construir.entregar(decId) });

// Captura das saídas: pino (e console, segunda rede), Sentry falso e o que a rota devolve.
const linhasDoLog: string[] = [];
const linhasDoConsole: string[] = [];
const envelopesDoSentry: string[] = [];
const respostas: string[] = [];
const transporteFalso = () => ({
  send: async (envelope: unknown) => {
    envelopesDoSentry.push(JSON.stringify(envelope));
    return {};
  },
  flush: async () => true,
});
const espioes: Array<{ mockRestore(): void }> = [];

async function guardar(r: Response): Promise<{ status: number; texto: string }> {
  const texto = await r.text();
  respostas.push(`${r.status} ${[...r.headers].map(([k, v]) => `${k}: ${v}`).join('\n')}\n${texto}`);
  return { status: r.status, texto };
}

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
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  for (const e of espioes) e.mockRestore();
  await deps.fila.parar();
  await b.fechar();
});

it(
  'andamento com a sentinela no corpo, envio válido, 503 e leitura do Awave: nenhuma sentinela nem texto de token no pino, no console, no Sentry, nas respostas, no pgboss, em andamento_construcao nem em evento',
  async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const inicio = linhasDoLog.length;

    // 1. A sentinela como valor de chave a mais, como nome de chave a mais, como fase e como status: 422 sem eco.
    const comSentinela = [
      { ...VALIDO, nota: SENTINELA },
      { ...VALIDO, [SENTINELA]: 1 },
      { ...VALIDO, fase: SENTINELA },
      { ...VALIDO, status: SENTINELA },
    ];
    for (const c of comSentinela) {
      // A sentinela vai mesmo no corpo: a asserção de ausência no fim não é vazia.
      expect(JSON.stringify(c)).toContain(SENTINELA);
      const r = await guardar(await construir.andamento(decId, c));
      expect(r.status).toBe(422);
      expect(JSON.parse(r.texto)).toMatchObject({ erro: 'nao_processavel' });
    }

    // 2. Um corpo válido grava a linha e o andamento_registrado.
    expect((await guardar(await construir.andamento(decId, VALIDO))).status).toBe(204);
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);

    // 3. 503 provocado: a trava do pedido presa por outra conexão; o erro vai ao Sentry (reduzido).
    const outra = await b.poolMigrator.connect();
    try {
      await outra.query('begin');
      await outra.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`pedido:${decId}`]);
      expect((await guardar(await construir.andamento(decId, { ...VALIDO, tarefasProntas: 10 }))).status).toBe(503);
    } finally {
      await outra.query('rollback');
      outra.release();
    }

    // 4. Leitura pelo Awave de uma demanda dele, com andamento gravado (ESP, RSK e DEC por pessoa, a linha pelo migrator).
    const criada = await guardar(await chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: tokenAwave, semOrigin: true, corpo: CORPO_DO_AWAVE }));
    expect(criada.status).toBe(201);
    const idAwave = (JSON.parse(criada.texto) as { id: string }).id;
    const pessoa = preparador.novaAutora();
    await criarEspecificacao(deps, pessoa, idAwave, criarEspecificacaoSchema.parse(ESP_DO_PEDIDO));
    await criarParecerRisco(deps, pessoa, idAwave, criarParecerRiscoSchema.parse(RSK_DO_PEDIDO));
    const decAwave = await preparador.novoDec(pessoa, idAwave);
    await inserirAndamento(b, { demandaId: idAwave, decId: decAwave, fase: 'testando', prontas: 3, total: 4, gravadoEm: relogio.agora() });
    const rLida = await guardar(await chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${idAwave}`, params: { id: idAwave }, bearer: tokenAwave, semOrigin: true }));
    expect(rLida.status).toBe(200);

    // 5. As saídas.
    await Sentry.flush(2_000);
    const pgboss = await todasAsLinhasDoPgboss();
    const andamentos = (await b.poolMigrator.query(`select row_to_json(a)::text as linha from andamento_construcao a order by id`)).rows.map((r: { linha: string }) => r.linha);
    const eventos = (await b.poolMigrator.query(`select coalesce(antes::text, '') || ' ' || coalesce(depois::text, '') as texto from evento order by id`)).rows.map(
      (r: { texto: string }) => r.texto,
    );
    const marcos = (await b.poolMigrator.query(`select count(*)::int as n from evento where entidade_id = $1 and acao = 'andamento_registrado'`, [decId])).rows[0].n;

    // O teste só prova algo se as saídas foram exercitadas.
    const rotasDoLog = linhasDoLog
      .slice(inicio)
      .map((l) => JSON.parse(l) as { evento?: string; rota?: string; status?: number })
      .filter((l) => l.evento === 'requisicao' && l.rota === '/api/pedidos-construcao/[decId]/andamento')
      .map((l) => l.status);
    expect(rotasDoLog).toEqual([422, 422, 422, 422, 204, 503]);
    expect(envelopesDoSentry.length).toBeGreaterThanOrEqual(1);
    expect(andamentos).toHaveLength(2);
    expect(marcos).toBe(1);
    expect(eventos.length).toBeGreaterThan(0);
    expect(respostas).toHaveLength(8);

    const saidas: Array<[string, string]> = [
      ['pino', linhasDoLog.join('\n')],
      ['console', linhasDoConsole.join('\n')],
      ['Sentry', envelopesDoSentry.join('\n')],
      ['respostas', respostas.join('\n')],
      ['pgboss', JSON.stringify(pgboss)],
      ['andamento_construcao', andamentos.join('\n')],
      ['evento (antes e depois)', eventos.join('\n')],
    ];
    for (const [onde, texto] of saidas) {
      expect(texto.includes(SENTINELA), `sentinela em ${onde}`).toBe(false);
      expect(contemSentinela(texto), `sentinela da 0.3.0 em ${onde}`).toBe(false);
      for (const [nome, token] of [
        ['construir', tokenConstruir],
        ['awave', tokenAwave],
      ] as const) {
        expect(textoDepoisDoPrefixo(token).length, nome).toBe(35);
        expect(texto.includes(token), `token ${nome} em ${onde}`).toBe(false);
        expect(texto.includes(textoDepoisDoPrefixo(token)), `texto do token ${nome} depois do prefixo em ${onde}`).toBe(false);
      }
    }
    expect([linhasDoLog.join(''), eventos.join(''), JSON.stringify(pgboss), andamentos.join('')].join('\n').includes('wsod_'), 'wsod_ no log, nos eventos, no pgboss ou no andamento').toBe(
      false,
    );
  },
  120_000,
);
