// T15 do DEC-DEM-20261111-0016-v1 (IN-17, V-01, D-09): o seed fictício ganha três demandas do Awave e dois Pedidos de
// Construção para o /construir, um a buscar e um já recebido. Os atos das integrações usam o ator montado com o prefixo
// fictício `ficticio`: nenhum token nasce num banco semeado. Banco real (Testcontainers), papel do app, relógio fixo.
// Só dado fictício (domínio .test, "Pessoa Ficticia", "(fictício)").
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import type { Deps } from '../src/lib/deps';
import { FILAS, type Fila } from '../src/lib/fila';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import { NOME_DA_INTEGRACAO } from '../src/modules/acesso/ator';
import { aguardaConfirmacao, jaConfirmada } from '../src/modules/demandas/confirmacao';
import { RE_SHA256, listarPendentes, recebimentoDoPedido, shasEntregues } from '../src/modules/pedido-construcao/pendentes';
import { CONTAS_FICTICIAS, MENSAGENS_SEED, seedFicticio, TITULOS_DO_E2E, TOTAL_DEMANDAS_DO_SEED } from './seed-ficticio';

const AGORA = '2026-11-11T15:00:00Z';
const DO_AWAVE = [TITULOS_DO_E2E.awaveAguardando, TITULOS_DO_E2E.awaveConfirmar, TITULOS_DO_E2E.awaveEncerrada];
const DOS_PEDIDOS = [TITULOS_DO_E2E.pedidoParaBuscar, TITULOS_DO_E2E.pedidoRecebido];

type Linha = Record<string, unknown>;
const linhas = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<Linha[]> => (await b.poolMigrator.query(sql, valores)).rows;
const contar = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<number> => Number((await linhas(b, sql, valores))[0]!.n);

async function idDaDemanda(b: BancoDeTeste, titulo: string): Promise<string> {
  const r = await linhas(b, 'select id from demanda where titulo = $1', [titulo]);
  expect(r, titulo).toHaveLength(1);
  return r[0]!.id as string;
}

async function decDaDemanda(b: BancoDeTeste, titulo: string): Promise<string> {
  const r = await linhas(b, 'select p.id from pacote_decisao p join demanda d on d.id = p.demanda_id where d.titulo = $1', [titulo]);
  expect(r, titulo).toHaveLength(1);
  return r[0]!.id as string;
}

describe('seed fictício com as integrações (agentes desligados, como na homologação)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
    // O deps de teste usa CONFIG_TESTE (http://127.0.0.1:3101): a guarda do loopback (M-07) deixa semear.
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('os cinco títulos novos: fictícios, diferentes entre si e dos de antes', () => {
    expect(TITULOS_DO_E2E).toMatchObject({
      awaveAguardando: 'Relatório do Awave aguardando confirmação (fictício)',
      awaveConfirmar: 'Relatório do Awave para confirmar no e2e (fictício)',
      awaveEncerrada: 'Relatório do Awave encerrado sem confirmação (fictício)',
      pedidoParaBuscar: 'Pedido para o /construir buscar (fictício)',
      pedidoRecebido: 'Pedido já recebido pelo /construir (fictício)',
    });
    const todos = Object.values(TITULOS_DO_E2E);
    expect(new Set(todos).size).toBe(todos.length);
    for (const t of [...DO_AWAVE, ...DOS_PEDIDOS]) expect(t).toContain('(fictício)');
  });

  // 0.4.0 (T10 do DEC-DEM-20261111-0017-v1): mais as oito do andamento, conferidas em seed-andamento.test.ts.
  it('o total do seed conta as cinco novas e, desde a 0.4.0, as oito do andamento: 36 demandas, e a mensagem diz o mesmo número', async () => {
    expect(TOTAL_DEMANDAS_DO_SEED).toBe(36);
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    expect(MENSAGENS_SEED.semeado).toContain(`${TOTAL_DEMANDAS_DO_SEED} demandas`);
  });

  it('três demandas do Awave: autoria integracao/awave, rascunho, solicitante "Awave", melhoria; duas em Nova e uma encerrada', async () => {
    const r = await linhas(
      b,
      `select titulo, tipo, status, autor_tipo, autor_id, rascunho_agente, solicitante_nome, solicitante_papel,
              linha_servico_provavel, urgencia, anexos, contexto, descricao_problema
         from demanda where autor_tipo = 'integracao' order by titulo`,
    );
    const esperado = (titulo: string, status: string) => ({
      titulo,
      tipo: 'melhoria',
      status,
      autor_tipo: 'integracao',
      autor_id: 'awave',
      rascunho_agente: true,
      solicitante_nome: NOME_DA_INTEGRACAO.awave,
      solicitante_papel: 'outro',
      linha_servico_provavel: null,
      urgencia: null,
      anexos: [],
    });
    expect(r.map((l) => l.titulo)).toEqual([...DO_AWAVE].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)));
    const porTitulo = (t: string) => r.find((l) => l.titulo === t);
    expect(porTitulo(TITULOS_DO_E2E.awaveAguardando)).toMatchObject(esperado(TITULOS_DO_E2E.awaveAguardando, 'nova'));
    expect(porTitulo(TITULOS_DO_E2E.awaveConfirmar)).toMatchObject(esperado(TITULOS_DO_E2E.awaveConfirmar, 'nova'));
    expect(porTitulo(TITULOS_DO_E2E.awaveEncerrada)).toMatchObject(esperado(TITULOS_DO_E2E.awaveEncerrada, 'encerrada'));
    for (const l of r) {
      // O corpo do contrato do Awave tem descrição e contexto; nenhum dos dois é vazio.
      expect(String(l.contexto ?? '').trim(), String(l.titulo)).not.toBe('');
      expect(String(l.descricao_problema ?? '').trim(), String(l.titulo)).not.toBe('');
    }
    // O Awave fica com 3 das 10 demandas por hora (D2).
    expect(r).toHaveLength(3);
  });

  it('nenhuma demanda do Awave está confirmada: sem demanda_confirmada, e as três aguardam a confirmação', async () => {
    for (const titulo of DO_AWAVE) {
      const id = await idDaDemanda(b, titulo);
      expect(await jaConfirmada(b.db, id), titulo).toBe(false);
      expect(await aguardaConfirmacao(b.db, id), titulo).toBe(true);
    }
    expect(await contar(b, "select count(*)::int as n from evento where acao = 'demanda_confirmada'")).toBe(0);
  });

  it('demanda_criada do Awave com ator integracao/awave e prefixo ficticio; o encerramento é da pessoa "cto"', async () => {
    const ids = await Promise.all(DO_AWAVE.map((t) => idDaDemanda(b, t)));
    const criadas = await linhas(
      b,
      `select ator_tipo, ator_id, ator_token_prefixo, entidade, antes, depois from evento
        where acao = 'demanda_criada' and demanda_id = any($1) order by demanda_id`,
      [ids],
    );
    expect(criadas).toEqual(
      ids.map(() => ({
        ator_tipo: 'integracao',
        ator_id: 'awave',
        ator_token_prefixo: 'ficticio',
        entidade: 'demanda',
        antes: null,
        depois: { status: 'nova', tipo: 'melhoria' },
      })),
    );
    const encerrada = await idDaDemanda(b, TITULOS_DO_E2E.awaveEncerrada);
    const status = await linhas(
      b,
      `select e.ator_tipo, e.ator_token_prefixo, u.email, e.antes, e.depois from evento e left join "user" u on u.id = e.ator_id
        where e.acao = 'status_alterado' and e.demanda_id = $1`,
      [encerrada],
    );
    expect(status).toEqual([
      { ator_tipo: 'pessoa', ator_token_prefixo: null, email: CONTAS_FICTICIAS.cto.email, antes: { status: 'nova' }, depois: { status: 'encerrada' } },
    ]);
  });

  it('dois pedidos gerados por pessoa: demanda, ESP, RSK e DEC da sem2fa, DEC de nível cto aprovado pela "cto"', async () => {
    for (const titulo of DOS_PEDIDOS) {
      const [dem] = await linhas(
        b,
        `select d.id, d.tipo, d.autor_tipo, u.email,
                (select count(*)::int from especificacao_tecnica e where e.demanda_id = d.id) as esp,
                (select count(*)::int from parecer_risco r where r.demanda_id = d.id) as rsk
           from demanda d left join "user" u on u.id = d.autor_id where d.titulo = $1`,
        [titulo],
      );
      expect(dem, titulo).toMatchObject({ tipo: 'melhoria', autor_tipo: 'pessoa', email: CONTAS_FICTICIAS.sem2fa.email, esp: 1, rsk: 1 });
      const decId = await decDaDemanda(b, titulo);
      const [dec] = await linhas(b, 'select autor_tipo, rascunho_agente, nivel_aprovacao_requerido from pacote_decisao where id = $1', [decId]);
      expect(dec, titulo).toEqual({ autor_tipo: 'pessoa', rascunho_agente: false, nivel_aprovacao_requerido: 'cto' });
      expect(await linhas(b, 'select status_decisao, opcao_escolhida from decisao where pacote_decisao_id = $1', [decId]), titulo).toEqual([
        { status_decisao: 'aprovada', opcao_escolhida: 'A' },
      ]);
      const gerados = await linhas(
        b,
        `select e.ator_tipo, u.email, e.depois from evento e left join "user" u on u.id = e.ator_id
          where e.acao = 'pedido_gerado' and e.entidade = 'pacote_decisao' and e.entidade_id = $1`,
        [decId],
      );
      expect(gerados, titulo).toEqual([{ ator_tipo: 'pessoa', email: CONTAS_FICTICIAS.cto.email, depois: { confirmaSemDadoPessoal: true } }]);
    }
  });

  it('V-01: o /construir acha só o pedido a buscar; o já recebido tem a data do recebimento', async () => {
    const buscar = await decDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar);
    const recebido = await decDaDemanda(b, TITULOS_DO_E2E.pedidoRecebido);
    // Os outros DECs do seed não estão aprovados por inteiro (ou são de agente, sem pedido gerado): só o a buscar fica.
    expect(await listarPendentes(b.db)).toEqual([{ decId: buscar }]);
    expect(await recebimentoDoPedido(b.db, recebido)).toEqual(new Date(AGORA));
    expect(await recebimentoDoPedido(b.db, buscar)).toBeNull();
    expect(await shasEntregues(b.db, buscar)).toEqual([]);
  });

  it('o pedido recebido: um pedido_entregue e um pedido_recebido do construir, com prefixo ficticio e o mesmo sha256', async () => {
    const decId = await decDaDemanda(b, TITULOS_DO_E2E.pedidoRecebido);
    const demandaId = await idDaDemanda(b, TITULOS_DO_E2E.pedidoRecebido);
    const doConstruir = await linhas(
      b,
      `select acao, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, antes, depois from evento
        where entidade_id = $1 and acao in ('pedido_entregue', 'pedido_recebido') order by id`,
      [decId],
    );
    const [entrega] = await shasEntregues(b.db, decId);
    expect(RE_SHA256.test(entrega ?? '')).toBe(true);
    const comum = { ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: 'ficticio', demanda_id: demandaId, entidade: 'pacote_decisao', antes: null };
    expect(doConstruir).toEqual([
      { acao: 'pedido_entregue', ...comum, depois: { sha256: entrega } },
      { acao: 'pedido_recebido', ...comum, depois: { sha256: entrega } },
    ]);
  });

  it('D-09 e IN-04: nenhum token de serviço no banco semeado, e nada no formato de token no log nem nos eventos', async () => {
    expect(await contar(b, 'select count(*)::int as n from token_servico')).toBe(0);
    expect(linhasDoLog.join('')).toContain('seed_ficticio');
    expect(linhasDoLog.join('').includes('wsod_'), 'wsod_ no log do seed').toBe(false);
    const eventos = await linhas(b, 'select ator_token_prefixo, antes, depois from evento');
    expect(JSON.stringify(eventos).includes('wsod_'), 'wsod_ nos eventos').toBe(false);
    // O único prefixo gravado é o fictício, fora do formato de token (G3.3).
    expect(await linhas(b, 'select distinct ator_token_prefixo from evento where ator_token_prefixo is not null')).toEqual([{ ator_token_prefixo: 'ficticio' }]);
  });

  it('nenhuma execução de agente para as demandas do Awave', async () => {
    const ids = await Promise.all(DO_AWAVE.map((t) => idDaDemanda(b, t)));
    expect(await contar(b, 'select count(*)::int as n from execucao_agente where demanda_id = any($1)', [ids])).toBe(0);
  });
});

// Uma transação só (como o resto do seed): a falha no aviso do quinto DEC, o do `pedidoRecebido`, vem depois das três
// demandas do Awave e do pedido gerado da `pedidoParaBuscar`, e nada disso fica para trás.
describe('seed fictício que falha no meio das integrações', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
    substituirDestinoDoLog({ write: () => undefined });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('nenhuma demanda do Awave, pedido gerado nem evento das integrações fica gravado, e a subida seguinte semeia tudo', async () => {
    const FALHA = 'falha simulada no aviso do quinto DEC (fictício)';
    let avisos = 0;
    let naTransacao: unknown = null;
    const filaQueFalha: Fila = {
      enviar: async (executor, nome, payload, op) => {
        if (nome === FILAS.avisoDecPronto && ++avisos === 5) {
          naTransacao = (
            await executor.executeSql(
              `select (select count(*)::int from demanda where autor_tipo = 'integracao') as do_awave,
                      (select count(*)::int from evento where acao = 'pedido_gerado') as gerados`,
            )
          ).rows[0];
          throw new Error(FALHA);
        }
        return deps.fila.enviar(executor, nome, payload, op);
      },
      parar: () => Promise.resolve(),
    };
    await expect(seedFicticio({ ...deps, fila: filaQueFalha }, { SEED_FICTICIO: '1' })).rejects.toThrow(FALHA);
    // Prova de que a falha veio depois das três do Awave e do primeiro pedido gerado.
    expect(naTransacao).toEqual({ do_awave: 3, gerados: 1 });
    for (const tabela of ['demanda', 'evento', 'pacote_decisao', 'decisao', 'aviso_email', '"user"']) {
      expect(await contar(b, `select count(*)::int as n from ${tabela}`), tabela).toBe(0);
    }
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
    expect(await contar(b, "select count(*)::int as n from demanda where autor_tipo = 'integracao'")).toBe(3);
    expect(await listarPendentes(b.db)).toHaveLength(1);
  });
});

// IN-06 e D1: com o insumo técnico ligado e o teto livre, a demanda criada por pessoa gera execução (controle positivo), e a
// do Awave, não, mesmo pelo seed.
describe('seed fictício com o insumo técnico ligado', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
    substituirDestinoDoLog({ write: () => undefined });
    await b.poolMigrator.query("update configuracao_agente set ligado = true, modelo = 'modelo-ficticio' where agente = 'insumo_tecnico'");
    await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('a demanda de pessoa tem a execução do insumo técnico; as três do Awave, nenhuma execução nem job', async () => {
    const daPessoa = await idDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar);
    expect(await linhas(b, 'select agente, chave_entrada from execucao_agente where demanda_id = $1', [daPessoa])).toEqual([
      { agente: 'insumo_tecnico', chave_entrada: `demanda:${daPessoa}` },
    ]);
    const ids = await Promise.all(DO_AWAVE.map((t) => idDaDemanda(b, t)));
    expect(await contar(b, 'select count(*)::int as n from execucao_agente where demanda_id = any($1)', [ids])).toBe(0);
    // O job do agente leva o id da execução: o da pessoa existe (controle), e nenhum aponta para execução do Awave.
    const jobsDe = (demandas: string[]) =>
      contar(
        b,
        `select count(*)::int as n from pgboss.job j
          where j.name = 'agente.executar' and j.data->>'execucaoId' in (select id::text from execucao_agente where demanda_id = any($1))`,
        [demandas],
      );
    expect(await jobsDe([daPessoa])).toBe(1);
    expect(await jobsDe(ids)).toBe(0);
  });
});
