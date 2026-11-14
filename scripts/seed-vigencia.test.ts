// scripts/seed-vigencia.test.ts — T10 do DEC-DEM-20261111-0018-v1 (RF-03, RF-06, D-15): o seed fictício ganha as quatro
// demandas da vigência, que os e2e da T11 a T14 leem sem criar demanda nem versão (G3.12). Todas pela conta fictícia
// `configurar2fa` (papel cto), com as aprovações da "cto" e, na dupla, da "administradora". Postgres real
// (Testcontainers); SEED_FICTICIO=1; banco vazio; relógio fixo. Nenhum pedido gerado nem token: a lista de pendentes do
// /construir continua só com a `pedidoParaBuscar`. Só dado fictício.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import type { Deps } from '../src/lib/deps';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import type { AtorPessoa } from '../src/modules/acesso/ator';
import { registrarDecisao } from '../src/modules/pacotes-decisao/decidir';
import { registrarDecisaoSchema } from '../src/modules/pacotes-decisao/schemas';
import { vigenteDaDemanda } from '../src/modules/pacotes-decisao/substituido';
import { listarPendentes } from '../src/modules/pedido-construcao/pendentes';
import { CONTAS_FICTICIAS, MENSAGENS_SEED, seedFicticio, TITULOS_DO_E2E, TOTAL_DEMANDAS_DO_SEED } from './seed-ficticio';

const AGORA = '2026-11-14T15:00:00Z';
const EM = new Date(AGORA);
const DIA = '2026-11-14';

const CHAVES_DA_VIGENCIA = ['vigenciaComPendente', 'vigenciaNivelMenor', 'vigenciaArquivar', 'arquivarSemVigente'] as const;
type Chave = (typeof CHAVES_DA_VIGENCIA)[number];
const titulo = (c: Chave): string => (TITULOS_DO_E2E as Readonly<Record<string, string>>)[c] ?? '';
const DA_VIGENCIA: readonly string[] = CHAVES_DA_VIGENCIA.map(titulo);

type Linha = Record<string, unknown>;
const linhas = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<Linha[]> => (await b.poolMigrator.query(sql, valores)).rows;
const contar = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<number> => Number((await linhas(b, sql, valores))[0]!.n);

async function idDaDemanda(b: BancoDeTeste, t: string): Promise<string> {
  const r = await linhas(b, 'select id from demanda where titulo = $1', [t]);
  expect(r, t).toHaveLength(1);
  return r[0]!.id as string;
}

// Os DECs da demanda, do v1 ao mais novo, com nível, autoria, decisão e a marcação da criação (SB-07).
async function decsDa(b: BancoDeTeste, demandaId: string): Promise<Linha[]> {
  return linhas(
    b,
    `select p.id, p.versao, p.nivel_aprovacao_requerido as nivel, p.autor_tipo, u.email, p.caminhos_com_nome_na_criacao is not null as marcado,
            d.status_decisao, d.opcao_escolhida
       from pacote_decisao p left join "user" u on u.id = p.autor_id left join decisao d on d.pacote_decisao_id = p.id
      where p.demanda_id = $1 order by p.versao`,
    [demandaId],
  );
}

async function aprovacoesDo(b: BancoDeTeste, decId: string): Promise<Linha[]> {
  return linhas(
    b,
    `select a.papel_aprovacao as papel, a.opcao, u.email, a.referencia_documento, to_char(a.data_documento, 'YYYY-MM-DD') as data_documento
       from aprovacao a join "user" u on u.id = a.registrada_por where a.pacote_decisao_id = $1 order by a.papel_aprovacao`,
    [decId],
  );
}

const statusDa = async (b: BancoDeTeste, demandaId: string): Promise<string> => (await linhas(b, 'select status from demanda where id = $1', [demandaId]))[0]!.status as string;

const daConfigurar = { autor_tipo: 'pessoa', email: CONTAS_FICTICIAS.configurar2fa.email, marcado: true };
const aprovacaoDaCto = { papel: 'cto', opcao: 'A', email: CONTAS_FICTICIAS.cto.email, referencia_documento: null, data_documento: null };

describe('seed fictício com as demandas da vigência (0.4.1, T10)', () => {
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

  it('os quatro títulos novos: com "(fictício)", diferentes entre si e dos de antes', () => {
    expect(Object.keys(TITULOS_DO_E2E)).toEqual(expect.arrayContaining([...CHAVES_DA_VIGENCIA]));
    for (const t of DA_VIGENCIA) expect(t).toContain('(fictício)');
    const todos = Object.values(TITULOS_DO_E2E);
    expect(new Set(todos).size).toBe(todos.length);
  });

  it('o total do seed conta as quatro novas: 40 demandas, e a mensagem e o log dizem o mesmo número', async () => {
    expect(TOTAL_DEMANDAS_DO_SEED).toBe(40);
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(TOTAL_DEMANDAS_DO_SEED);
    expect(MENSAGENS_SEED.semeado).toContain(`${TOTAL_DEMANDAS_DO_SEED} demandas`);
    const log = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'seed_ficticio');
    expect(log.map((l) => l.quantidade)).toEqual([TOTAL_DEMANDAS_DO_SEED]);
  });

  it('D-15: cada uma existe uma vez, melhoria, sob_medida, "Pessoa Ficticia Produto", com contexto, criada pela configurar2fa', async () => {
    for (const t of DA_VIGENCIA) {
      const r = await linhas(
        b,
        `select d.tipo, d.solicitante_nome, d.linha_servico_provavel, d.rascunho_agente, d.autor_tipo, u.email,
                length(trim(coalesce(d.contexto, ''))) > 0 as tem_contexto
           from demanda d left join "user" u on u.id = d.autor_id where d.titulo = $1`,
        [t],
      );
      expect(r, t).toEqual([
        {
          tipo: 'melhoria',
          solicitante_nome: 'Pessoa Ficticia Produto',
          linha_servico_provavel: 'sob_medida',
          rascunho_agente: false,
          autor_tipo: 'pessoa',
          email: CONTAS_FICTICIAS.configurar2fa.email,
          tem_contexto: true,
        },
      ]);
    }
  });

  it('D-15 e C-36: a configurar2fa fica com 4 demandas e 14 versões (4 ESP, 4 RSK, 6 DEC) na hora do seed; a sem2fa, com as 28 e 33 de antes', async () => {
    const daConta = (email: string, tabela: string) =>
      contar(b, `select count(*)::int as n from ${tabela} x join "user" u on u.id = x.autor_id where u.email = $1 and x.criada_em = $2`, [email, EM]);
    const conta = CONTAS_FICTICIAS.configurar2fa.email;
    expect(await daConta(conta, 'demanda')).toBe(4);
    expect([await daConta(conta, 'especificacao_tecnica'), await daConta(conta, 'parecer_risco'), await daConta(conta, 'pacote_decisao')]).toEqual([4, 4, 6]);
    const sem2fa = CONTAS_FICTICIAS.sem2fa.email;
    expect(await daConta(sem2fa, 'demanda')).toBe(28);
    expect((await daConta(sem2fa, 'especificacao_tecnica')) + (await daConta(sem2fa, 'parecer_risco')) + (await daConta(sem2fa, 'pacote_decisao'))).toBe(33);
  });

  it('vigenciaComPendente: v1 cto aprovado na opção A pela "cto"; v2 cto_e_administradora pendente, sem aprovação; Pronta para decisão; vigente = v1 atualizado', async () => {
    const id = await idDaDemanda(b, titulo('vigenciaComPendente'));
    expect(await statusDa(b, id)).toBe('pronta_para_decisao');
    const decs = await decsDa(b, id);
    expect(decs).toEqual([
      { id: `DEC-${id}-v1`, versao: 1, nivel: 'cto', ...daConfigurar, status_decisao: 'aprovada', opcao_escolhida: 'A' },
      { id: `DEC-${id}-v2`, versao: 2, nivel: 'cto_e_administradora', ...daConfigurar, status_decisao: null, opcao_escolhida: null },
    ]);
    expect(await aprovacoesDo(b, `DEC-${id}-v1`)).toEqual([aprovacaoDaCto]);
    expect(await aprovacoesDo(b, `DEC-${id}-v2`)).toEqual([]);
    expect(await vigenteDaDemanda(b.db, id)).toEqual({ id: `DEC-${id}-v1`, nivel: 'cto', desatualizado: false });
  });

  it('vigenciaNivelMenor: v1 cto_e_administradora aprovado na opção A pela "cto" e pela "administradora" (documento fictício); v2 cto pendente; Pronta para decisão', async () => {
    const id = await idDaDemanda(b, titulo('vigenciaNivelMenor'));
    expect(await statusDa(b, id)).toBe('pronta_para_decisao');
    expect(await decsDa(b, id)).toEqual([
      { id: `DEC-${id}-v1`, versao: 1, nivel: 'cto_e_administradora', ...daConfigurar, status_decisao: 'aprovada', opcao_escolhida: 'A' },
      { id: `DEC-${id}-v2`, versao: 2, nivel: 'cto', ...daConfigurar, status_decisao: null, opcao_escolhida: null },
    ]);
    expect(await aprovacoesDo(b, `DEC-${id}-v1`)).toEqual([
      { papel: 'administradora', opcao: 'A', email: CONTAS_FICTICIAS.administradora.email, referencia_documento: 'DOC-FICTICIO-0018', data_documento: DIA },
      aprovacaoDaCto,
    ]);
    expect(await aprovacoesDo(b, `DEC-${id}-v2`)).toEqual([]);
    expect(await vigenteDaDemanda(b.db, id)).toEqual({ id: `DEC-${id}-v1`, nivel: 'cto_e_administradora', desatualizado: false });
  });

  it('vigenciaArquivar: v1 cto aprovado pela "cto"; v2 cto pendente; Pronta para decisão; vigente = v1 atualizado', async () => {
    const id = await idDaDemanda(b, titulo('vigenciaArquivar'));
    expect(await statusDa(b, id)).toBe('pronta_para_decisao');
    expect(await decsDa(b, id)).toEqual([
      { id: `DEC-${id}-v1`, versao: 1, nivel: 'cto', ...daConfigurar, status_decisao: 'aprovada', opcao_escolhida: 'A' },
      { id: `DEC-${id}-v2`, versao: 2, nivel: 'cto', ...daConfigurar, status_decisao: null, opcao_escolhida: null },
    ]);
    expect(await aprovacoesDo(b, `DEC-${id}-v1`)).toEqual([aprovacaoDaCto]);
    expect(await vigenteDaDemanda(b.db, id)).toEqual({ id: `DEC-${id}-v1`, nivel: 'cto', desatualizado: false });
  });

  it('arquivarSemVigente: ESP v1 e RSK v1 da configurar2fa, nenhum DEC; continua em Nova, sem vigente', async () => {
    const id = await idDaDemanda(b, titulo('arquivarSemVigente'));
    expect(await statusDa(b, id)).toBe('nova');
    const versoes = (tabela: string) => linhas(b, `select x.versao, x.autor_tipo, u.email from ${tabela} x left join "user" u on u.id = x.autor_id where x.demanda_id = $1`, [id]);
    const v1 = [{ versao: 1, autor_tipo: 'pessoa', email: CONTAS_FICTICIAS.configurar2fa.email }];
    expect(await versoes('especificacao_tecnica')).toEqual(v1);
    expect(await versoes('parecer_risco')).toEqual(v1);
    expect(await decsDa(b, id)).toEqual([]);
    expect(await vigenteDaDemanda(b.db, id)).toBeNull();
  });

  it('as outras três também têm ESP v1 e RSK v1 só (os DECs v2 não ficam desatualizados), e nenhuma recebeu pedido gerado, substituição nem andamento', async () => {
    for (const chave of ['vigenciaComPendente', 'vigenciaNivelMenor', 'vigenciaArquivar'] as const) {
      const id = await idDaDemanda(b, titulo(chave));
      expect(await contar(b, 'select count(*)::int as n from especificacao_tecnica where demanda_id = $1', [id]), chave).toBe(1);
      expect(await contar(b, 'select count(*)::int as n from parecer_risco where demanda_id = $1', [id]), chave).toBe(1);
    }
    const ids = await Promise.all(DA_VIGENCIA.map((t) => idDaDemanda(b, t)));
    expect(
      await contar(b, "select count(*)::int as n from evento where demanda_id = any($1) and acao in ('pedido_gerado', 'pacote_decisao_substituido', 'andamento_registrado')", [ids]),
    ).toBe(0);
    expect(await contar(b, 'select count(*)::int as n from andamento_construcao where demanda_id = any($1)', [ids])).toBe(0);
  });

  it('todo DEC das quatro tem a marcação da criação gravada (não nula); a lista de pendentes do /construir não muda; nenhum token nasce', async () => {
    const ids = await Promise.all(DA_VIGENCIA.map((t) => idDaDemanda(b, t)));
    expect(await contar(b, 'select count(*)::int as n from pacote_decisao where demanda_id = any($1)', [ids])).toBe(6);
    expect(await contar(b, 'select count(*)::int as n from pacote_decisao where demanda_id = any($1) and caminhos_com_nome_na_criacao is null', [ids])).toBe(0);
    expect(await listarPendentes(b.db)).toEqual([{ decId: `DEC-${await idDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar)}-v1` }]);
    expect(await contar(b, 'select count(*)::int as n from token_servico')).toBe(0);
  });

  it('G3.13: o log do seed não leva título nem id das demandas da vigência, nem a referência do documento', async () => {
    const texto = linhasDoLog.join('').toLowerCase();
    const ids = await Promise.all(DA_VIGENCIA.map((t) => idDaDemanda(b, t)));
    for (const v of [...DA_VIGENCIA, ...ids, 'DOC-FICTICIO-0018']) expect(texto.includes(v.toLowerCase()), v).toBe(false);
  });
});

// O dado serve à regra do S-04 (T06): arquivar o v2 da `vigenciaArquivar` leva a demanda a Aprovada, com o v1 vigente.
// Banco próprio: este caso grava.
describe('as demandas da vigência sob a regra do arquivamento (S-04)', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
    substituirDestinoDoLog({ write: () => undefined });
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('arquivar o v2 da vigenciaArquivar: Aprovada, com o v1 ainda vigente', async () => {
    const [u] = await linhas(b, 'select id, name from "user" where email = $1', [CONTAS_FICTICIAS.cto.email]);
    const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: u!.id as string, nome: u!.name as string, papel: 'cto' };
    const id = await idDaDemanda(b, titulo('vigenciaArquivar'));
    const { resultado } = await registrarDecisao(deps, cto, `DEC-${id}-v2`, registrarDecisaoSchema.parse({ statusDecisao: 'arquivada' }));
    expect(resultado).toBe('arquivada');
    expect(await statusDa(b, id)).toBe('aprovada');
    expect((await vigenteDaDemanda(b.db, id))?.id).toBe(`DEC-${id}-v1`);
  });
});
