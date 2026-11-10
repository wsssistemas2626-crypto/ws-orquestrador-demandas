// A decisão entre versões do DEC da mesma demanda (08-correcao, A-01 e A-02): só o DEC mais novo da demanda pode ser
// decidido. Sem isso, arquivar o v1 depois de aprovar o v2 encerrava a demanda (status final). Desde a 0.1.13, o A-02
// não recusa mais a aprovação: o DEC aprovado mais novo substitui o anterior, e só ele gera o Pedido de Construção.
// Postgres real, papel do app; dados só fictícios; relógio fixo, cada teste num dia próprio (C-36).
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { aprovacao, decisao, demanda, user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { obterPacoteDecisao } from './consultas';
import { criarPacoteDecisao } from './criar';
import { MENSAGENS_DECISAO, registrarDecisao } from './decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-versoes-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-versoes-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

const DOC = { referenciaDocumento: 'DOC-FICTICIO-VERSOES', dataDocumento: '2026-10-21' };
const decisaoDe = (corpo: Record<string, unknown>) => registrarDecisaoSchema.parse(corpo);
const aprovar = (opcao: 'A' | 'B', extra: Record<string, unknown> = {}) => decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, ...extra });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'versoes-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'versoes-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;
const aprovacoesDo = (decId: string) => migrator().select().from(aprovacao).where(eq(aprovacao.pacoteDecisaoId, decId));
const decisoesDo = (decId: string) => migrator().select().from(decisao).where(eq(decisao.pacoteDecisaoId, decId));

type Nivel = 'cto' | 'cto_e_administradora';

const novoDec = async (demandaId: string, nivel: Nivel = 'cto') =>
  (
    await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'Opção A' }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: nivel }),
    )
  ).id;

// Demanda com ESP v1, RSK v1 e o DEC v1 pendente; os DEC seguintes citam a mesma ESP e o mesmo RSK (nenhum fica
// desatualizado).
async function prepararDemanda(nivel: Nivel = 'cto'): Promise<{ demandaId: string; v1: string }> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(
    deps,
    cto,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'Corrigir pedidos duplicados',
      escopoInclui: ['Importação de pedidos'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['Critério fictício'],
      definicaoDePronto: ['pnpm test verde'],
    }),
  );
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  return { demandaId: d.id, v1: await novoDec(d.id, nivel) };
}

describe('A-01: só o DEC mais novo da demanda pode ser decidido', () => {
  it('v2 aprovado e depois o v1 arquivado: 409, a demanda não vai a encerrada e o v2 ainda leva a demanda a aprovada', async () => {
    const { demandaId, v1 } = await prepararDemanda();
    const v2 = await novoDec(demandaId);
    expect((await registrarDecisao(deps, cto, v2, aprovar('A'))).resultado).toBe('aprovada');

    await expect(registrarDecisao(deps, cto, v1, decisaoDe({ statusDecisao: 'arquivada' }))).rejects.toMatchObject({
      codigo: 'conflito',
      mensagem: MENSAGENS_DECISAO.naoEhOMaisNovo,
    });
    expect(await decisoesDo(v1)).toEqual([]);
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');

    const d = await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'aprovada' }));
    expect(d.status).toBe('aprovada');
  });

  it('com o v2 pendente, devolver, arquivar ou aprovar o v1 dá 409, sem decisão, aprovação nem mudança na demanda', async () => {
    const { demandaId, v1 } = await prepararDemanda();
    await novoDec(demandaId);
    for (const corpo of [decisaoDe({ statusDecisao: 'devolvida' }), decisaoDe({ statusDecisao: 'arquivada' }), aprovar('A')]) {
      await expect(registrarDecisao(deps, cto, v1, corpo), corpo.statusDecisao).rejects.toMatchObject({
        codigo: 'conflito',
        mensagem: MENSAGENS_DECISAO.naoEhOMaisNovo,
      });
    }
    expect(await decisoesDo(v1)).toEqual([]);
    expect(await aprovacoesDo(v1)).toEqual([]);
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
  });

  it('dupla aprovação começada no v1 não termina depois do v2: a aprovação da administradora no v1 dá 409', async () => {
    const { demandaId, v1 } = await prepararDemanda('cto_e_administradora');
    expect((await registrarDecisao(deps, cto, v1, aprovar('A'))).resultado).toBe('aprovacao_parcial');
    await novoDec(demandaId, 'cto_e_administradora');

    await expect(registrarDecisao(deps, administradora, v1, aprovar('A', DOC))).rejects.toMatchObject({
      codigo: 'conflito',
      mensagem: MENSAGENS_DECISAO.naoEhOMaisNovo,
    });
    expect((await aprovacoesDo(v1)).map((a) => a.papelAprovacao)).toEqual(['cto']);
    expect(await decisoesDo(v1)).toEqual([]);
  });

  it('o DEC mais novo continua decidido normalmente: devolver o v2 grava a decisão e muda a demanda', async () => {
    const { demandaId } = await prepararDemanda();
    const v2 = await novoDec(demandaId);
    expect((await registrarDecisao(deps, cto, v2, decisaoDe({ statusDecisao: 'devolvida' }))).resultado).toBe('devolvida');
    expect(await decisoesDo(v2)).toHaveLength(1);
    expect(await statusDa(demandaId)).not.toBe('pronta_para_decisao');
  });

  it('DEC já decidido e que não é o mais novo continua respondendo "já tem decisão"', async () => {
    const { demandaId, v1 } = await prepararDemanda();
    await registrarDecisao(deps, cto, v1, decisaoDe({ statusDecisao: 'devolvida' }));
    await novoDec(demandaId);
    await expect(registrarDecisao(deps, cto, v1, decisaoDe({ statusDecisao: 'arquivada' }))).rejects.toMatchObject({
      codigo: 'conflito',
      mensagem: MENSAGENS_DECISAO.jaDecidido,
    });
  });
});

// 0.1.13 (DEC-DEM-20261104-0014-v1, opção b do E5 do 0013, decidida por Fabiano): o A-02 deixou de recusar a aprovação.
// O DEC mais novo é aprovado com outro DEC da demanda já aprovado, e o anterior fica substituído; a garantia de um só
// Pedido de Construção passou para o gerar (gerar-substituido.test.ts). Os casos completos estão em substituicao.test.ts.
describe('A-02 revisto (0.1.13): o DEC aprovado mais novo substitui o anterior', () => {
  it('v1 aprovado com A e o v2 criado depois: aprovar o v2 com B dá aprovada, com aprovação e decisão no v2, e o v1 fica substituído', async () => {
    const { demandaId, v1 } = await prepararDemanda();
    await registrarDecisao(deps, cto, v1, aprovar('A'));
    const v2 = await novoDec(demandaId);

    const r = await registrarDecisao(deps, cto, v2, aprovar('B'));
    expect(r.resultado).toBe('aprovada');
    expect(await aprovacoesDo(v2)).toHaveLength(1);
    expect(await decisoesDo(v2)).toEqual([expect.objectContaining({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' })]);
    expect(await obterPacoteDecisao(b.db, v1)).toMatchObject({ statusDecisao: 'aprovada', substituido: true, substituidoPor: v2 });
  });

  it('na dupla aprovação, a primeira aprovação (parcial) do v2 é gravada com o v1 aprovado, e o v1 ainda não é substituído', async () => {
    const { demandaId, v1 } = await prepararDemanda();
    await registrarDecisao(deps, cto, v1, aprovar('A'));
    const v2 = await novoDec(demandaId, 'cto_e_administradora');

    expect((await registrarDecisao(deps, administradora, v2, aprovar('A', DOC))).resultado).toBe('aprovacao_parcial');
    expect((await aprovacoesDo(v2)).map((a) => a.papelAprovacao)).toEqual(['administradora']);
    expect(await obterPacoteDecisao(b.db, v1)).toMatchObject({ substituido: false, substituidoPor: null });
  });

  it('v1 devolvido não conta como aprovado: o v2 é aprovado', async () => {
    const { demandaId, v1 } = await prepararDemanda();
    await registrarDecisao(deps, cto, v1, decisaoDe({ statusDecisao: 'devolvida' }));
    const v2 = await novoDec(demandaId);
    expect((await registrarDecisao(deps, cto, v2, aprovar('B'))).resultado).toBe('aprovada');
  });
});
