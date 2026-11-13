// scripts/seed-andamento.test.ts — T10 do DEC-DEM-20261111-0017-v1 (AN-15, D-07, D-11, C-36): o seed deixa as demandas
// de andamento no estado da tabela do plano, sem token, e a lista de pendentes do /construir igual à da 0.3.0. Postgres
// real (Testcontainers); SEED_FICTICIO=1; banco vazio; relógio fixo. O andamento entra direto pelo ator `construir` de
// prefixo `ficticio` (D-07), com as mesmas regras do serviço e sem chamá-lo. Só dado fictício.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { andamentosDa, eventosDo } from '../test/andamento';
import { criarDepsDeTeste } from '../test/deps';
import type { Deps } from '../src/lib/deps';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import { ultimoAndamento } from '../src/modules/andamento/consultas';
import { lerAndamento } from '../src/modules/andamento/regras';
import { aprovadoVigente } from '../src/modules/pacotes-decisao/substituido';
import { listarPendentes, recebimentoDoPedido } from '../src/modules/pedido-construcao/pendentes';
import { CONTAS_FICTICIAS, MENSAGENS_SEED, seedFicticio, TITULOS_DO_E2E, TOTAL_DEMANDAS_DO_SEED } from './seed-ficticio';

const AGORA = '2026-11-12T15:00:00Z';
const EM = new Date(AGORA);

const CHAVES_DO_ANDAMENTO = [
  'andamentoConstruindo',
  'andamentoRevisando',
  'andamentoConcluido',
  'andamentoCancelado',
  'andamentoSemPlano',
  'andamentoParaEnviar',
  'andamentoSemPedido',
  'emConstrucaoSemAndamento',
] as const;
type Chave = (typeof CHAVES_DO_ANDAMENTO)[number];
const DO_ANDAMENTO: readonly string[] = CHAVES_DO_ANDAMENTO.map((c) => TITULOS_DO_E2E[c]);

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

// Um passo do andamento como o /construir mandaria: fase, prontas, total e situação.
type Passo = readonly [fase: string, prontas: number, total: number, situacao: string];
const marco = ([fase, prontas, total, situacao]: Passo) => ({ fase, tarefasProntas: prontas, tarefasTotal: total, statusConstrucao: situacao });

// A tabela do plano (T10): status final, os passos gravados e as mudanças de status do construir, por chave.
const ESPERADO: Readonly<Record<Chave, { status: string; passos: readonly Passo[]; doConstruir: ReadonlyArray<readonly [string, string]> }>> = {
  andamentoConstruindo: {
    status: 'em_construcao',
    passos: [
      ['entendendo_o_pedido', 0, 0, 'em_construcao'],
      ['construindo', 9, 17, 'em_construcao'],
    ],
    doConstruir: [['aprovada', 'em_construcao']],
  },
  andamentoRevisando: { status: 'em_construcao', passos: [['revisando_e_entregando', 17, 17, 'em_construcao']], doConstruir: [['aprovada', 'em_construcao']] },
  // `construido` não muda status (A1): quem leva a demanda a em_construcao antes do envio é a "cto".
  andamentoConcluido: { status: 'em_construcao', passos: [['documentando', 12, 12, 'construido']], doConstruir: [] },
  andamentoCancelado: {
    status: 'devolvida',
    passos: [
      ['construindo', 3, 8, 'em_construcao'],
      ['construindo', 3, 8, 'cancelado'],
    ],
    doConstruir: [
      ['aprovada', 'em_construcao'],
      ['em_construcao', 'devolvida'],
    ],
  },
  andamentoSemPlano: { status: 'em_construcao', passos: [['entendendo_o_pedido', 0, 0, 'em_construcao']], doConstruir: [['aprovada', 'em_construcao']] },
  andamentoParaEnviar: { status: 'aprovada', passos: [], doConstruir: [] },
  andamentoSemPedido: { status: 'pronta_para_decisao', passos: [], doConstruir: [] },
  emConstrucaoSemAndamento: { status: 'em_construcao', passos: [], doConstruir: [] },
};

// As mudanças de status feitas pela "cto" no seed, por chave (pelo painel, como uma pessoa faria).
const DA_PESSOA: Readonly<Record<Chave, ReadonlyArray<readonly [string, string]>>> = {
  andamentoConstruindo: [['pronta_para_decisao', 'aprovada']],
  andamentoRevisando: [['pronta_para_decisao', 'aprovada']],
  andamentoConcluido: [
    ['pronta_para_decisao', 'aprovada'],
    ['aprovada', 'em_construcao'],
  ],
  andamentoCancelado: [['pronta_para_decisao', 'aprovada']],
  andamentoSemPlano: [['pronta_para_decisao', 'aprovada']],
  andamentoParaEnviar: [['pronta_para_decisao', 'aprovada']],
  andamentoSemPedido: [],
  emConstrucaoSemAndamento: [
    ['pronta_para_decisao', 'aprovada'],
    ['aprovada', 'em_construcao'],
  ],
};

const COM_PEDIDO: readonly Chave[] = ['andamentoConstruindo', 'andamentoRevisando', 'andamentoConcluido', 'andamentoCancelado', 'andamentoSemPlano', 'andamentoParaEnviar'];

describe('seed fictício com o andamento (0.4.0, T10)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('os oito títulos novos: os do plano, com "(fictício)", diferentes entre si e dos de antes', () => {
    expect(TITULOS_DO_E2E).toMatchObject({
      andamentoConstruindo: 'Andamento: construindo (fictício)',
      andamentoRevisando: 'Andamento: revisando e entregando (fictício)',
      andamentoConcluido: 'Andamento: construção concluída (fictício)',
      andamentoCancelado: 'Andamento: construção cancelada (fictício)',
      andamentoSemPlano: 'Andamento: sem plano de tarefas (fictício)',
      andamentoParaEnviar: 'Andamento: para o /construir enviar (fictício)',
      andamentoSemPedido: 'Andamento: pacote sem pedido gerado (fictício)',
      emConstrucaoSemAndamento: 'Em construção sem andamento (fictício)',
    });
    const todos = Object.values(TITULOS_DO_E2E);
    expect(new Set(todos).size).toBe(todos.length);
    for (const t of DO_ANDAMENTO) expect(t).toContain('(fictício)');
  });

  it('o total do seed conta as oito novas: 36 demandas, e a mensagem diz o mesmo número', async () => {
    expect(TOTAL_DEMANDAS_DO_SEED).toBe(36);
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    expect(MENSAGENS_SEED.semeado).toContain(`${TOTAL_DEMANDAS_DO_SEED} demandas`);
    const log = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'seed_ficticio');
    expect(log.map((l) => l.quantidade)).toEqual([TOTAL_DEMANDAS_DO_SEED]);
  });

  it('as oito são as últimas criadas, na ordem da tabela, e têm o molde das do e2e (melhoria, sob_medida, sem2fa, contexto)', async () => {
    const ordem = (
      await linhas(b, `select d.titulo from evento e join demanda d on d.id = e.demanda_id where e.acao = 'demanda_criada' and e.entidade = 'demanda' order by e.id`)
    ).map((l) => l.titulo as string);
    expect(ordem.slice(-DO_ANDAMENTO.length)).toEqual(DO_ANDAMENTO);
    for (const titulo of DO_ANDAMENTO) {
      const [d] = await linhas(
        b,
        `select d.tipo, d.solicitante_nome, d.solicitante_papel, d.linha_servico_provavel, d.rascunho_agente, d.autor_tipo, u.email,
                length(trim(coalesce(d.contexto, ''))) > 0 as tem_contexto
           from demanda d left join "user" u on u.id = d.autor_id where d.titulo = $1`,
        [titulo],
      );
      expect(d, titulo).toEqual({
        tipo: 'melhoria',
        solicitante_nome: 'Pessoa Ficticia Produto',
        solicitante_papel: 'produto',
        linha_servico_provavel: 'sob_medida',
        rascunho_agente: false,
        autor_tipo: 'pessoa',
        email: CONTAS_FICTICIAS.sem2fa.email,
        tem_contexto: true,
      });
    }
  });

  it('cada uma tem ESP, RSK e DEC da sem2fa, DEC de nível cto aprovado pela "cto" na opção A e vigente', async () => {
    for (const titulo of DO_ANDAMENTO) {
      const demandaId = await idDaDemanda(b, titulo);
      const autoria = async (tabela: string) =>
        linhas(b, `select x.versao, x.autor_tipo, u.email from ${tabela} x left join "user" u on u.id = x.autor_id where x.demanda_id = $1`, [demandaId]);
      const daSem2fa = [{ versao: 1, autor_tipo: 'pessoa', email: CONTAS_FICTICIAS.sem2fa.email }];
      expect(await autoria('especificacao_tecnica'), titulo).toEqual(daSem2fa);
      expect(await autoria('parecer_risco'), titulo).toEqual(daSem2fa);
      const decId = await decDaDemanda(b, titulo);
      expect(await linhas(b, 'select autor_tipo, nivel_aprovacao_requerido from pacote_decisao where id = $1', [decId]), titulo).toEqual([
        { autor_tipo: 'pessoa', nivel_aprovacao_requerido: 'cto' },
      ]);
      expect(await linhas(b, 'select status_decisao, opcao_escolhida from decisao where pacote_decisao_id = $1', [decId]), titulo).toEqual([
        { status_decisao: 'aprovada', opcao_escolhida: 'A' },
      ]);
      expect((await aprovadoVigente(b.db, demandaId))?.id, titulo).toBe(decId);
    }
  });

  it('C-36: a sem2fa fica com 28 de 30 demandas e 33 de 60 versões na hora do seed', async () => {
    const daSem2fa = (tabela: string) =>
      contar(b, `select count(*)::int as n from ${tabela} x join "user" u on u.id = x.autor_id where u.email = $1 and x.criada_em = $2`, [
        CONTAS_FICTICIAS.sem2fa.email,
        EM,
      ]);
    expect(await daSem2fa('demanda')).toBe(28);
    const versoes = (await daSem2fa('especificacao_tecnica')) + (await daSem2fa('parecer_risco')) + (await daSem2fa('pacote_decisao'));
    expect(versoes).toBe(33);
  });

  it.each(CHAVES_DO_ANDAMENTO)('%s: status, linhas de andamento, andamento_registrado e mudanças de status como na tabela do plano', async (chave) => {
    const titulo = TITULOS_DO_E2E[chave];
    const esperado = ESPERADO[chave];
    const demandaId = await idDaDemanda(b, titulo);
    const decId = await decDaDemanda(b, titulo);
    expect((await linhas(b, 'select status from demanda where id = $1', [demandaId]))[0]!.status).toBe(esperado.status);

    // Uma linha por passo, do DEC vigente, com o prefixo fictício e a hora do relógio injetado.
    expect(await andamentosDa(b, demandaId)).toEqual(
      esperado.passos.map(([fase, prontas, total, situacao]) => ({
        dec_id: decId,
        fase,
        tarefas_prontas: prontas,
        tarefas_total: total,
        status_construcao: situacao,
        ator_token_prefixo: 'ficticio',
        gravado_em: EM,
      })),
    );

    // A2: um andamento_registrado por mudança de fase ou situação, com antes e depois chave a chave.
    const comum = { ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: 'ficticio', demanda_id: demandaId, entidade: 'pacote_decisao' };
    const marcos = esperado.passos.filter((p, i) => i === 0 || p[0] !== esperado.passos[i - 1]![0] || p[3] !== esperado.passos[i - 1]![3]);
    expect(await eventosDo(b, decId, 'andamento_registrado')).toEqual(
      marcos.map((p, i) => ({ ...comum, antes: i === 0 ? null : marco(marcos[i - 1]!), depois: marco(p) })),
    );

    // As transições automáticas são do ator construir (nunca "Sistema"); as manuais, da "cto".
    const status = await linhas(
      b,
      `select e.ator_tipo, e.ator_id, e.ator_token_prefixo, u.email, e.antes, e.depois from evento e left join "user" u on u.id = e.ator_id
        where e.acao = 'status_alterado' and e.demanda_id = $1 order by e.id`,
      [demandaId],
    );
    expect(status.filter((s) => s.ator_tipo === 'integracao')).toEqual(
      esperado.doConstruir.map(([de, para]) => ({
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: 'ficticio',
        email: null,
        antes: { status: de },
        depois: { status: para },
      })),
    );
    expect(status.filter((s) => s.ator_tipo === 'pessoa')).toEqual(
      DA_PESSOA[chave].map(([de, para]) => ({
        ator_tipo: 'pessoa',
        ator_id: expect.any(String),
        ator_token_prefixo: null,
        email: CONTAS_FICTICIAS.cto.email,
        antes: { status: de },
        depois: { status: para },
      })),
    );
    // Do sistema, só a de sempre ao criar o DEC (dec_criado): Nova → Pronta para decisão.
    expect(status.filter((s) => s.ator_tipo !== 'integracao' && s.ator_tipo !== 'pessoa')).toEqual([
      { ator_tipo: 'sistema', ator_id: 'sistema', ator_token_prefixo: null, email: null, antes: { status: 'nova' }, depois: { status: 'pronta_para_decisao' } },
    ]);

    // O último andamento é o do último passo, lido como a fila e o detalhe leem (lerAndamento).
    const ultimo = esperado.passos.at(-1);
    expect(lerAndamento(await ultimoAndamento(b.db, demandaId))).toEqual(
      ultimo ? { decId, fase: ultimo[0], tarefasProntas: ultimo[1], tarefasTotal: ultimo[2], statusConstrucao: ultimo[3], atualizadoEm: EM } : null,
    );
  });

  it('os seis com pedido: gerado pela "cto", entregue e recebido pelo construir do seed (D-11); a semPedido e a emConstrucaoSemAndamento sem pedido', async () => {
    for (const chave of CHAVES_DO_ANDAMENTO) {
      const titulo = TITULOS_DO_E2E[chave];
      const decId = await decDaDemanda(b, titulo);
      const gerados = await linhas(
        b,
        `select e.ator_tipo, u.email from evento e left join "user" u on u.id = e.ator_id
          where e.acao = 'pedido_gerado' and e.entidade = 'pacote_decisao' and e.entidade_id = $1`,
        [decId],
      );
      const doConstruir = await linhas(
        b,
        `select acao, ator_tipo, ator_id, ator_token_prefixo from evento where entidade_id = $1 and acao in ('pedido_entregue', 'pedido_recebido') order by id`,
        [decId],
      );
      if (COM_PEDIDO.includes(chave)) {
        expect(gerados, titulo).toEqual([{ ator_tipo: 'pessoa', email: CONTAS_FICTICIAS.cto.email }]);
        const doSeed = { ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: 'ficticio' };
        expect(doConstruir, titulo).toEqual([
          { acao: 'pedido_entregue', ...doSeed },
          { acao: 'pedido_recebido', ...doSeed },
        ]);
        expect(await recebimentoDoPedido(b.db, decId), titulo).toEqual(EM);
      } else {
        expect(gerados, titulo).toEqual([]);
        expect(doConstruir, titulo).toEqual([]);
      }
    }
  });

  it('D-11: a lista de pendentes do /construir continua só com a pedidoParaBuscar', async () => {
    expect(await listarPendentes(b.db)).toEqual([{ decId: await decDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar) }]);
  });

  it('os totais do andamento: 7 linhas e 7 andamento_registrado, todos de demandas do seed de andamento', async () => {
    expect(await contar(b, 'select count(*)::int as n from andamento_construcao')).toBe(7);
    expect(await contar(b, "select count(*)::int as n from evento where acao = 'andamento_registrado'")).toBe(7);
    const titulos = (await linhas(b, 'select distinct d.titulo from andamento_construcao a join demanda d on d.id = a.demanda_id order by d.titulo')).map((l) => l.titulo);
    expect(titulos).toEqual(
      [TITULOS_DO_E2E.andamentoConstruindo, TITULOS_DO_E2E.andamentoRevisando, TITULOS_DO_E2E.andamentoConcluido, TITULOS_DO_E2E.andamentoCancelado, TITULOS_DO_E2E.andamentoSemPlano].sort(
        (x, y) => (x < y ? -1 : x > y ? 1 : 0),
      ),
    );
  });

  it('AN-15 e D-09: nenhum token de serviço; o único prefixo gravado é o fictício; nada no formato de token no log, nos eventos nem no andamento', async () => {
    expect(await contar(b, 'select count(*)::int as n from token_servico')).toBe(0);
    expect(await linhas(b, 'select distinct ator_token_prefixo from andamento_construcao')).toEqual([{ ator_token_prefixo: 'ficticio' }]);
    expect(await linhas(b, 'select distinct ator_token_prefixo from evento where ator_token_prefixo is not null')).toEqual([{ ator_token_prefixo: 'ficticio' }]);
    expect(linhasDoLog.join('').includes('wsod_'), 'wsod_ no log do seed').toBe(false);
    const eventos = await linhas(b, 'select antes, depois from evento');
    expect(JSON.stringify(eventos).includes('wsod_'), 'wsod_ nos eventos').toBe(false);
  });

  it('G3.10: o log do seed não leva título, decId nem fase das demandas de andamento', async () => {
    const texto = linhasDoLog.join('').toLowerCase();
    const decIds = await Promise.all(DO_ANDAMENTO.map((t) => decDaDemanda(b, t)));
    for (const v of [...DO_ANDAMENTO, ...decIds, 'entendendo_o_pedido', 'revisando_e_entregando', 'andamento_registrado']) expect(texto.includes(v.toLowerCase()), v).toBe(false);
  });
});
