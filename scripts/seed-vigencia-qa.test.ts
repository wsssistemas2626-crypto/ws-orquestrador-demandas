// scripts/seed-vigencia-qa.test.ts — 06-T10-testes do DEC-DEM-20261111-0018-v1 (qa-automacao), ao lado do
// seed-vigencia.test.ts do engenheiro, sem mudar nada nele. O que ele não cobre:
//   (1) as leituras que a T11 e os e2e da T12 a T14 fazem sobre o banco semeado: a busca do e2e (demandaDoSeed, lista
//       de melhorias de 100 por página) acha cada uma uma vez; a vista da demanda (obterDemanda) tem o v2 pendente como
//       mais novo e o v1 aprovado, nenhum desatualizado nem substituído, os dois citando a mesma ESP e o mesmo RSK; os ids
//       casam o formato que os avisos exigem (RE_ID_DEC, RE_ID_DEMANDA_NA_TELA); os pares de nível dão os três avisos
//       (a/b, c); e a dica do Arquivar (destinoDoArquivamento) é Aprovada nas três;
//   (2) a `arquivarSemVigente` serve ao "Arquivar → … Encerrada" do e2e: em Nova (origem do fluxo), com uma ESP e um RSK
//       (a preparação do e2e não cria versão), sem vigente;
//   (3) o seed continua só com dado fictício: toda conta citada nas quatro é de CONTAS_FICTICIAS, todo e-mail é
//       `@ficticio.test`, nenhum CPF, CNPJ, telefone, senha ou segredo TOTP nas linhas, e a marcação da criação dos seis
//       DECs fica vazia (o D1 não recusa nenhum pedido por causa do seed);
//   (4) as regras do servidor sobre o dado (banco próprio; cada caso numa demanda diferente, então nada depende de
//       ordem): aprovar o v2 só do CTO da `vigenciaNivelMenor` é recusado (S-01) sem gravar, e arquivá-lo a leva a
//       Aprovada com o v1 de dupla em vigor; na `vigenciaComPendente`, uma aprovação deixa o v1 em vigor e a segunda faz
//       o v2 substituí-lo (o aviso (a) diz a verdade); na `arquivarSemVigente`, o DEC criado como no e2e leva a Pronta
//       para decisão, e arquivá-lo leva a Encerrada.
// Postgres real (Testcontainers), SEED_FICTICIO=1, relógio fixo. Nenhum token. Só dado fictício.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RE_ID_DEMANDA_NA_TELA } from '../src/components/dados-das-etapas';
import { RE_ID_DEC } from '../src/components/dados-do-pacote';
import type { NivelAprovacao } from '../src/db/schema/decisao';
import type { Deps } from '../src/lib/deps';
import { ErroDominio } from '../src/lib/erros';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import type { AtorPessoa } from '../src/modules/acesso/ator';
import { destinoDoArquivamento, estadoDoVigente } from '../src/modules/demandas/arquivamento';
import { listarDemandasPara, obterDemanda } from '../src/modules/demandas/consultas';
import { filtroDemandasSchema } from '../src/modules/demandas/schemas';
import { obterPacoteDecisao } from '../src/modules/pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../src/modules/pacotes-decisao/criar';
import { MENSAGENS_DECISAO, registrarDecisao } from '../src/modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../src/modules/pacotes-decisao/schemas';
import { vigenteDaDemanda } from '../src/modules/pacotes-decisao/substituido';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { CONTAS_FICTICIAS, seedFicticio, TITULOS_DO_E2E } from './seed-ficticio';

const AGORA = '2026-11-14T15:00:00Z';
const DIA = '2026-11-14';

// O nível do v1 aprovado (vigente) e o do v2 pendente de cada uma, e o aviso que cada página da T11 deve mostrar
// (03, 4.2): (a) no v2 e (b) no v1 quando o v2 pode substituir o v1; (c) no v2 e nada no v1 quando o v2 é só do CTO e o
// v1 teve as duas aprovações.
const COM_DEC = {
  vigenciaComPendente: { vigente: 'cto', pendente: 'cto_e_administradora', noV2: 'a', noV1: 'b' },
  vigenciaNivelMenor: { vigente: 'cto_e_administradora', pendente: 'cto', noV2: 'c', noV1: null },
  vigenciaArquivar: { vigente: 'cto', pendente: 'cto', noV2: 'a', noV1: 'b' },
} as const satisfies Record<string, { vigente: NivelAprovacao; pendente: NivelAprovacao; noV2: 'a' | 'c'; noV1: 'b' | null }>;
type ChaveComDec = keyof typeof COM_DEC;
const CHAVES_COM_DEC = Object.keys(COM_DEC) as ChaveComDec[];
const CHAVES = [...CHAVES_COM_DEC, 'arquivarSemVigente'] as const;
type Chave = (typeof CHAVES)[number];

// Os status de onde o DEC novo leva a demanda a Pronta para decisão (e2e/decisao.spec.ts, ORIGENS_DO_FLUXO).
const ORIGENS_DO_FLUXO: readonly string[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao'];

// O corpo do DEC que o e2e "Arquivar" cria pela API (e2e/decisao.spec.ts, novoPacote), só texto fictício.
const DEC_COMO_NO_E2E = {
  resumoExecutivo: 'Resumo executivo fictício.',
  opcaoA: { descricao: 'Construir tudo numa entrega (fictício)', vantagens: 'Resolve a causa (fictício)' },
  opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
  nivelAprovacaoRequerido: 'cto',
};

type Linha = Record<string, unknown>;
const linhas = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<Linha[]> => (await b.poolMigrator.query(sql, valores)).rows;
const contar = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<number> => Number((await linhas(b, sql, valores))[0]!.n);

async function idDe(b: BancoDeTeste, chave: Chave): Promise<string> {
  const r = await linhas(b, 'select id from demanda where titulo = $1', [TITULOS_DO_E2E[chave]]);
  expect(r, chave).toHaveLength(1);
  return r[0]!.id as string;
}

async function pessoa(b: BancoDeTeste, conta: 'cto' | 'administradora'): Promise<AtorPessoa> {
  const [u] = await linhas(b, 'select id, name from "user" where email = $1', [CONTAS_FICTICIAS[conta].email]);
  return { tipo: 'pessoa', usuarioId: u!.id as string, nome: u!.name as string, papel: conta };
}

// O que a demanda tem gravado, para provar que uma recusa não gravou nada.
async function retrato(b: BancoDeTeste, demandaId: string) {
  return {
    status: (await linhas(b, 'select status from demanda where id = $1', [demandaId]))[0]!.status,
    aprovacoes: await contar(b, 'select count(*)::int as n from aprovacao a join pacote_decisao p on p.id = a.pacote_decisao_id where p.demanda_id = $1', [
      demandaId,
    ]),
    decisoes: await contar(b, 'select count(*)::int as n from decisao d join pacote_decisao p on p.id = d.pacote_decisao_id where p.demanda_id = $1', [demandaId]),
    eventos: await contar(b, 'select count(*)::int as n from evento where demanda_id = $1', [demandaId]),
  };
}

async function semear(): Promise<{ b: BancoDeTeste; deps: Deps }> {
  const b = await novoBanco();
  const deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
  expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  return { b, deps };
}

describe('as leituras da T11 e dos e2e da T12 a T14 sobre o banco semeado (sem gravar)', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear());
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('demandaDoSeed: a lista de melhorias da "cto", numa página de 100, tem cada uma das quatro uma vez, com o título original', async () => {
    const cto = await pessoa(b, 'cto');
    const pagina = await listarDemandasPara(b.db, filtroDemandasSchema.parse({ tipo: 'melhoria', limit: '100' }), cto);
    expect(pagina.total).toBeLessThanOrEqual(100);
    for (const chave of CHAVES) {
      const achadas = pagina.itens.filter((d) => d.titulo === TITULOS_DO_E2E[chave]);
      expect(achadas.map((d) => d.id), chave).toEqual([await idDe(b, chave)]);
    }
  });

  it.each(CHAVES_COM_DEC)('%s: v2 pendente é o mais novo, v1 aprovado é o vigente; nenhum desatualizado nem substituído; mesma ESP e mesmo RSK; ids no formato dos avisos; dica do Arquivar = Aprovada', async (chave) => {
    const caso = COM_DEC[chave];
    const id = await idDe(b, chave);
    const v1 = `DEC-${id}-v1`;
    const v2 = `DEC-${id}-v2`;
    const d = await obterDemanda(b.db, id);
    expect(d.status).toBe('pronta_para_decisao');
    // D-12: o mais novo (pacotesDecisao[0]) é o v2, pendente e não desatualizado; o v1, aprovado e não substituído.
    expect(d.pacotesDecisao.map((p) => ({ id: p.id, statusDecisao: p.statusDecisao, desatualizado: p.desatualizado, substituido: p.substituido }))).toEqual([
      { id: v2, statusDecisao: 'pendente', desatualizado: false, substituido: false },
      { id: v1, statusDecisao: 'aprovada', desatualizado: false, substituido: false },
    ]);
    expect(d.especificacoes).toHaveLength(1);
    expect(d.pareceresRisco).toHaveLength(1);

    const p1 = await obterPacoteDecisao(b.db, v1);
    const p2 = await obterPacoteDecisao(b.db, v2);
    expect({ nivel: p1.nivelAprovacaoRequerido, status: p1.statusDecisao, opcao: p1.decisao?.opcaoEscolhida, substituidoPor: p1.substituidoPor }).toEqual({
      nivel: caso.vigente,
      status: 'aprovada',
      opcao: 'A',
      substituidoPor: null,
    });
    expect({ nivel: p2.nivelAprovacaoRequerido, status: p2.statusDecisao, aprovadores: p2.aprovadores, decisao: p2.decisao, desatualizado: p2.desatualizado }).toEqual({
      nivel: caso.pendente,
      status: 'pendente',
      aprovadores: [],
      decisao: null,
      desatualizado: false,
    });
    expect([p1.especificacaoId, p2.especificacaoId]).toEqual([d.especificacoes[0]!.id, d.especificacoes[0]!.id]);
    expect([p1.parecerRiscoId, p2.parecerRiscoId]).toEqual([d.pareceresRisco[0]!.id, d.pareceresRisco[0]!.id]);
    expect([p1.rascunhosCitados, p2.rascunhosCitados]).toEqual([[], []]);

    // SB-12: o aviso só cita id que casa o formato; o link do (c) usa o id da demanda.
    expect([v1, v2].every((x) => RE_ID_DEC.test(x))).toBe(true);
    expect(RE_ID_DEMANDA_NA_TELA.test(id)).toBe(true);

    const vigente = await vigenteDaDemanda(b.db, id);
    expect(vigente).toEqual({ id: v1, nivel: caso.vigente, desatualizado: false });
    // A dica do Arquivar (T12) e o e2e da T14 ("vai para Aprovada, e <v1> continua em vigor").
    expect(destinoDoArquivamento(d.status, estadoDoVigente(vigente))).toBe('aprovada');
  });

  it('os três pares de nível cobrem os três avisos: pendente que exige mais (a/b), só do CTO sobre a dupla (c) e o mesmo nível (a/b)', async () => {
    const pares: Record<string, { vigente: NivelAprovacao; pendente: NivelAprovacao }> = {};
    for (const chave of CHAVES_COM_DEC) {
      const id = await idDe(b, chave);
      pares[chave] = {
        vigente: (await obterPacoteDecisao(b.db, `DEC-${id}-v1`)).nivelAprovacaoRequerido,
        pendente: (await obterPacoteDecisao(b.db, `DEC-${id}-v2`)).nivelAprovacaoRequerido,
      };
    }
    const soCtoSobreDupla = (p: { vigente: NivelAprovacao; pendente: NivelAprovacao }) => p.pendente === 'cto' && p.vigente === 'cto_e_administradora';
    expect(CHAVES_COM_DEC.filter((c) => soCtoSobreDupla(pares[c]!))).toEqual(CHAVES_COM_DEC.filter((c) => COM_DEC[c].noV2 === 'c'));
    expect(CHAVES_COM_DEC.filter((c) => !soCtoSobreDupla(pares[c]!))).toEqual(CHAVES_COM_DEC.filter((c) => COM_DEC[c].noV2 === 'a'));
    expect(new Set(CHAVES_COM_DEC.map((c) => `${pares[c]!.vigente}>${pares[c]!.pendente}`)).size).toBe(3);
    expect(new Set(CHAVES_COM_DEC.map((c) => COM_DEC[c].noV2))).toEqual(new Set(['a', 'c']));
  });

  it('arquivarSemVigente: em Nova (origem do fluxo do e2e), uma ESP e um RSK (a preparação do e2e não cria versão), nenhum DEC, sem vigente', async () => {
    const id = await idDe(b, 'arquivarSemVigente');
    const d = await obterDemanda(b.db, id);
    expect(d.status).toBe('nova');
    expect(ORIGENS_DO_FLUXO).toContain(d.status);
    expect([d.especificacoes.length, d.pareceresRisco.length, d.pacotesDecisao.length]).toEqual([1, 1, 0]);
    expect(await vigenteDaDemanda(b.db, id)).toBeNull();
    // Depois do DEC do e2e (Pronta para decisão), arquivar sem vigente vai a Encerrada, como o alerta do e2e diz.
    expect(destinoDoArquivamento('pronta_para_decisao', estadoDoVigente(null))).toBe('encerrada');
  });

  it('só dado fictício: contas de CONTAS_FICTICIAS, e-mail @ficticio.test, sem CPF, CNPJ, telefone, senha nem segredo TOTP; marcação da criação vazia nos seis DECs', async () => {
    const ids = await Promise.all(CHAVES.map((c) => idDe(b, c)));
    // Toda conta que as quatro citam (autoria, aprovação, decisão, evento) existe e é uma das contas fictícias.
    const citadas = (
      await linhas(
        b,
        `select distinct x.id from (
           select autor_id::text as id from demanda where id = any($1) and autor_tipo = 'pessoa'
           union select autor_id::text from especificacao_tecnica where demanda_id = any($1) and autor_tipo = 'pessoa'
           union select autor_id::text from parecer_risco where demanda_id = any($1) and autor_tipo = 'pessoa'
           union select autor_id::text from pacote_decisao where demanda_id = any($1) and autor_tipo = 'pessoa'
           union select a.registrada_por::text from aprovacao a join pacote_decisao p on p.id = a.pacote_decisao_id where p.demanda_id = any($1)
           union select d.decidida_por::text from decisao d join pacote_decisao p on p.id = d.pacote_decisao_id where p.demanda_id = any($1)
           union select ator_id::text from evento where demanda_id = any($1) and ator_tipo = 'pessoa'
         ) x`,
        [ids],
      )
    ).map((l) => l.id as string);
    const emails = (await linhas(b, 'select email from "user" where id::text = any($1) order by email', [citadas])).map((l) => l.email as string);
    expect(emails).toHaveLength(citadas.length);
    expect(emails).toEqual([CONTAS_FICTICIAS.administradora.email, CONTAS_FICTICIAS.configurar2fa.email, CONTAS_FICTICIAS.cto.email]);
    const nomes = (
      await linhas(b, 'select distinct a.nome_aprovador from aprovacao a join pacote_decisao p on p.id = a.pacote_decisao_id where p.demanda_id = any($1) order by 1', [ids])
    ).map((l) => l.nome_aprovador as string);
    expect(nomes).toEqual([CONTAS_FICTICIAS.administradora.nome, CONTAS_FICTICIAS.cto.nome]);

    // As linhas inteiras das quatro, como texto: nenhum dado com cara de pessoal real nem segredo.
    const textos: string[] = [];
    for (const sql of [
      'select row_to_json(x)::text as j from demanda x where x.id = any($1)',
      'select row_to_json(x)::text as j from especificacao_tecnica x where x.demanda_id = any($1)',
      'select row_to_json(x)::text as j from parecer_risco x where x.demanda_id = any($1)',
      'select row_to_json(x)::text as j from pacote_decisao x where x.demanda_id = any($1)',
      'select row_to_json(x)::text as j from aprovacao x join pacote_decisao p on p.id = x.pacote_decisao_id where p.demanda_id = any($1)',
      'select row_to_json(x)::text as j from decisao x join pacote_decisao p on p.id = x.pacote_decisao_id where p.demanda_id = any($1)',
      'select row_to_json(x)::text as j from evento x where x.demanda_id = any($1)',
    ]) {
      textos.push(...(await linhas(b, sql, [ids])).map((l) => l.j as string));
    }
    expect(textos.length).toBeGreaterThanOrEqual(4 + 4 + 4 + 6 + 4 + 3);
    const tudo = textos.join('\n');
    for (const t of CHAVES.map((c) => TITULOS_DO_E2E[c])) expect(tudo).toContain(t);
    for (const e of tudo.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) expect(e, 'e-mail fora do domínio fictício').toMatch(/@ficticio\.test$/);
    expect(tudo, 'CPF').not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
    expect(tudo, 'CNPJ').not.toMatch(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
    expect(tudo, 'telefone').not.toMatch(/\(\d{2}\)\s?\d{4,5}-\d{4}/);
    for (const conta of Object.values(CONTAS_FICTICIAS)) {
      expect(tudo.includes(conta.senha), 'senha de conta fictícia').toBe(false);
      if ('segredoTotp' in conta) expect(tudo.includes(conta.segredoTotp), 'segredo TOTP').toBe(false);
    }
    // Referência de documento só a fictícia.
    expect(
      (await linhas(b, 'select distinct coalesce(a.referencia_documento, \'-\') as r from aprovacao a join pacote_decisao p on p.id = a.pacote_decisao_id where p.demanda_id = any($1) order by 1', [ids])).map(
        (l) => l.r,
      ),
    ).toEqual(['-', 'DOC-FICTICIO-0018']);

    // A marcação da criação (SB-07) é gravada e vazia nos seis: nenhum caminho cita o nome do solicitante, e o D1 não
    // recusa a geração de nenhum pedido destas demandas por causa do texto do seed.
    expect(
      (await linhas(b, 'select coalesce(cardinality(caminhos_com_nome_na_criacao), -1) as n from pacote_decisao where demanda_id = any($1) order by id', [ids])).map(
        (l) => l.n,
      ),
    ).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

// Banco próprio: estes casos gravam. Cada um usa uma demanda diferente, então nenhum depende de outro nem da ordem.
describe('as regras do servidor sobre as demandas da vigência (S-01, S-04, substituição)', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear());
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('vigenciaNivelMenor: aprovar o v2 só do CTO é recusado (409 do S-01) sem gravar nada; arquivá-lo leva a Aprovada, com o v1 de dupla em vigor', async () => {
    const cto = await pessoa(b, 'cto');
    const id = await idDe(b, 'vigenciaNivelMenor');
    const antes = await retrato(b, id);
    const recusa = await registrarDecisao(deps, cto, `DEC-${id}-v2`, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' })).then(
      () => null,
      (e: unknown) => e,
    );
    expect(recusa).toBeInstanceOf(ErroDominio);
    expect({ codigo: (recusa as ErroDominio).codigo, mensagem: (recusa as ErroDominio).mensagem }).toEqual({
      codigo: 'conflito',
      mensagem: MENSAGENS_DECISAO.nivelMenorQueOVigente,
    });
    expect(await retrato(b, id)).toEqual(antes);

    const { resultado } = await registrarDecisao(deps, cto, `DEC-${id}-v2`, registrarDecisaoSchema.parse({ statusDecisao: 'arquivada' }));
    expect(resultado).toBe('arquivada');
    expect((await obterDemanda(b.db, id)).status).toBe('aprovada');
    expect(await vigenteDaDemanda(b.db, id)).toEqual({ id: `DEC-${id}-v1`, nivel: 'cto_e_administradora', desatualizado: false });
    expect((await obterPacoteDecisao(b.db, `DEC-${id}-v1`)).substituido).toBe(false);
  });

  it('vigenciaComPendente: com só a aprovação da "cto", o v2 segue pendente e o v1 em vigor; com a da "administradora", o v2 substitui o v1', async () => {
    const id = await idDe(b, 'vigenciaComPendente');
    const v1 = `DEC-${id}-v1`;
    const v2 = `DEC-${id}-v2`;
    const parcial = await registrarDecisao(deps, await pessoa(b, 'cto'), v2, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
    expect(parcial.resultado).toBe('aprovacao_parcial');
    expect(parcial.pacote.statusDecisao).toBe('pendente');
    // T12, CA-06.1: com uma aprovação registrada, o aviso (a) continua valendo (o v1 ainda é o vigente).
    expect(await vigenteDaDemanda(b.db, id)).toEqual({ id: v1, nivel: 'cto', desatualizado: false });
    expect((await obterDemanda(b.db, id)).status).toBe('pronta_para_decisao');

    const final = await registrarDecisao(
      deps,
      await pessoa(b, 'administradora'),
      v2,
      registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', referenciaDocumento: 'DOC-FICTICIO-QA-0018', dataDocumento: DIA }),
    );
    expect(final.resultado).toBe('aprovada');
    expect(await vigenteDaDemanda(b.db, id)).toEqual({ id: v2, nivel: 'cto_e_administradora', desatualizado: false });
    const p1 = await obterPacoteDecisao(b.db, v1);
    expect({ substituido: p1.substituido, substituidoPor: p1.substituidoPor }).toEqual({ substituido: true, substituidoPor: v2 });
    expect(
      (await linhas(b, "select entidade_id, depois from evento where demanda_id = $1 and acao = 'pacote_decisao_substituido'", [id])).map((l) => ({
        entidade_id: l.entidade_id,
        depois: l.depois,
      })),
    ).toEqual([{ entidade_id: v1, depois: { substituido: v1, substituidoPor: v2 } }]);
  });

  it('arquivarSemVigente: o DEC criado como no e2e leva de Nova a Pronta para decisão; arquivá-lo, sem vigente, leva a Encerrada', async () => {
    const cto = await pessoa(b, 'cto');
    const id = await idDe(b, 'arquivarSemVigente');
    expect((await obterDemanda(b.db, id)).status).toBe('nova');
    const dec = await criarPacoteDecisao(deps, cto, id, criarPacoteDecisaoSchema.parse(DEC_COMO_NO_E2E));
    expect(dec.id).toBe(`DEC-${id}-v1`);
    const d = await obterDemanda(b.db, id);
    expect(d.status).toBe('pronta_para_decisao');
    // Nenhuma ESP nem RSK a mais: o DEC cita as do seed.
    expect([d.especificacoes.length, d.pareceresRisco.length]).toEqual([1, 1]);
    expect(destinoDoArquivamento(d.status, estadoDoVigente(await vigenteDaDemanda(b.db, id)))).toBe('encerrada');
    const { resultado } = await registrarDecisao(deps, cto, dec.id, registrarDecisaoSchema.parse({ statusDecisao: 'arquivada' }));
    expect(resultado).toBe('arquivada');
    expect((await obterDemanda(b.db, id)).status).toBe('encerrada');
    expect(await vigenteDaDemanda(b.db, id)).toBeNull();
  });
});
