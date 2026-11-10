// 0.1.13 (DEC-DEM-20261104-0014-v1, opção b do E5 do 0013): o DEC aprovado mais novo da demanda substitui o aprovado
// anterior. Sem coluna nem status novo: `substituido` e `substituidoPor` são calculados na leitura (S1), a aprovação do
// DEC mais novo passa com outro DEC da demanda já aprovado, com todas as regras de hoje (S2), e grava no histórico um
// evento com os dois ids, sem texto livre (S4). Postgres real, papel do app; dados só fictícios; relógio fixo, cada
// teste num dia próprio (C-36).
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { aprovacao, decisao, demanda, evento, user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { obterDemanda, vistaDaDemandaPara } from '../demandas/consultas';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { MOTIVOS_TRANSICAO } from '../demandas/transicoes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { listarPacotes, listarPacotesDaDemanda, obterPacoteDecisao, vistaDoPacotePara } from './consultas';
import { criarPacoteDecisao } from './criar';
import { MENSAGENS_DECISAO, registrarDecisao } from './decidir';
import { criarPacoteDecisaoSchema, filtroPacotesSchema, registrarDecisaoSchema } from './schemas';
import { aprovadoMaisNovo } from './substituido';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-subst-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-subst-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

const DOC = { referenciaDocumento: 'DOC-FICTICIO-014', dataDocumento: '2026-11-04' };
const decisaoDe = (corpo: Record<string, unknown>) => registrarDecisaoSchema.parse(corpo);
const aprovar = (opcao: 'A' | 'B', extra: Record<string, unknown> = {}) => decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, ...extra });
const espValida = (descricaoObjetiva = 'Calcular o frete automaticamente') =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva,
    escopoInclui: ['Cálculo de frete'],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: ['O frete sai calculado no pedido'],
    definicaoDePronto: ['pnpm test verde'],
  });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'subst-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'subst-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-04T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;
const levarA = (id: string, status: string) => b.poolMigrator.query('update demanda set status = $2 where id = $1', [id, status]);
const aprovacoesDo = (decId: string) => migrator().select().from(aprovacao).where(eq(aprovacao.pacoteDecisaoId, decId));
const decisoesDo = (decId: string) => migrator().select().from(decisao).where(eq(decisao.pacoteDecisaoId, decId));
const eventosDa = (demandaId: string) => migrator().select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(asc(evento.id));
const substituicoesDa = async (demandaId: string) => (await eventosDa(demandaId)).filter((e) => e.acao === 'pacote_decisao_substituido');
const campos = async (decId: string) => {
  const p = await obterPacoteDecisao(b.db, decId);
  return { statusDecisao: p.statusDecisao, substituido: p.substituido, substituidoPor: p.substituidoPor };
};

type Nivel = 'cto' | 'cto_e_administradora';

const novoDec = async (demandaId: string, nivel: Nivel = 'cto') =>
  (
    await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Resumo fictício',
        opcaoA: { descricao: 'Calcular no sistema' },
        opcaoB: { descricao: 'Manter a planilha' },
        nivelAprovacaoRequerido: nivel,
      }),
    )
  ).id;

// R1 da 01: demanda com ESP v1, RSK v1 e o DEC v1 aprovado com A pela `cto`.
async function comV1Aprovado(nivelV1: Nivel = 'cto'): Promise<{ demandaId: string; v1: string }> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({ titulo: 'Frete da filial', tipo: 'melhoria', solicitanteNome: 'Carla Santos Ficticia', contexto: 'A filial do litoral calcula o frete à mão.' }),
  );
  await criarEspecificacao(deps, cto, d.id, espValida());
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  const v1 = await novoDec(d.id, nivelV1);
  if (nivelV1 === 'cto') await registrarDecisao(deps, cto, v1, aprovar('A'));
  else {
    await registrarDecisao(deps, administradora, v1, aprovar('A', DOC));
    await registrarDecisao(deps, cto, v1, aprovar('A'));
  }
  expect((await obterPacoteDecisao(b.db, v1)).statusDecisao).toBe('aprovada');
  return { demandaId: d.id, v1 };
}

describe('S1: substituido e substituidoPor na leitura', () => {
  it('v1 e v2 aprovados: o v1 é substituído pelo v2; o v2 não; com o v3 aprovado, v1 e v2 apontam para o v3', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    expect(await campos(v1)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('A'));
    expect(await campos(v1)).toEqual({ statusDecisao: 'aprovada', substituido: true, substituidoPor: v2 });
    expect(await campos(v2)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });

    const v3 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v3, aprovar('B'));
    expect(await campos(v1)).toEqual({ statusDecisao: 'aprovada', substituido: true, substituidoPor: v3 });
    expect(await campos(v2)).toEqual({ statusDecisao: 'aprovada', substituido: true, substituidoPor: v3 });
    expect(await campos(v3)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });

    // A lista da demanda (T05, GET /api/demandas/:id/pacotes-decisao) traz os mesmos campos.
    const lista = await listarPacotesDaDemanda(b.db, demandaId);
    expect(lista.map((p) => [p.id, p.substituido, p.substituidoPor])).toEqual([
      [v3, false, null],
      [v2, true, v3],
      [v1, true, v3],
    ]);
  });

  it('DEC pendente, devolvido e arquivado não são substituídos; o v1 aprovado com o v2 em aprovação parcial também não', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId, 'cto_e_administradora');
    expect(await campos(v2)).toEqual({ statusDecisao: 'pendente', substituido: false, substituidoPor: null });
    expect((await registrarDecisao(deps, administradora, v2, aprovar('A', DOC))).resultado).toBe('aprovacao_parcial');
    expect(await campos(v1)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });
    expect(await campos(v2)).toEqual({ statusDecisao: 'pendente', substituido: false, substituidoPor: null });

    // Devolvido e arquivado, em demandas próprias (arquivar encerra a demanda).
    const outra = await comV1Aprovado();
    const devolvido = await novoDec(outra.demandaId);
    await registrarDecisao(deps, cto, devolvido, decisaoDe({ statusDecisao: 'devolvida' }));
    expect(await campos(devolvido)).toEqual({ statusDecisao: 'devolvida', substituido: false, substituidoPor: null });
    expect(await campos(outra.v1)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });
    const terceira = await comV1Aprovado();
    const arquivado = await novoDec(terceira.demandaId);
    await registrarDecisao(deps, cto, arquivado, decisaoDe({ statusDecisao: 'arquivada' }));
    expect(await campos(arquivado)).toEqual({ statusDecisao: 'arquivada', substituido: false, substituidoPor: null });
    expect(await campos(terceira.v1)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });
  });

  it('listarPacotes com statusDecisao=aprovada traz o substituído, marcado, e o substituto', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('B'));
    const { itens } = await listarPacotes(b.db, filtroPacotesSchema.parse({ statusDecisao: 'aprovada', limit: '100' }));
    const daDemanda = itens.filter((p) => p.demandaId === demandaId).map((p) => [p.id, p.statusDecisao, p.substituido, p.substituidoPor]);
    expect(daDemanda).toEqual([
      [v2, 'aprovada', false, null],
      [v1, 'aprovada', true, v2],
    ]);
  });

  it('obterDemanda: pacotesDecisao com os dois campos, iguais aos da vista do DEC', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('A'));
    const d = await obterDemanda(b.db, demandaId);
    expect(d.pacotesDecisao.map((p) => [p.id, p.statusDecisao, p.substituido, p.substituidoPor])).toEqual([
      [v2, 'aprovada', false, null],
      [v1, 'aprovada', true, v2],
    ]);
  });

  it('vista mínima (E6): para o agente, o DEC e a lista da demanda trazem substituido e substituidoPor, sem nome', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('A'));
    const minima = vistaDoPacotePara(consolidacao, await obterPacoteDecisao(b.db, v1), ['Carla Santos Ficticia']);
    expect(minima).toMatchObject({ id: v1, substituido: true, substituidoPor: v2 });
    const demandaMinima = vistaDaDemandaPara(consolidacao, await obterDemanda(b.db, demandaId));
    expect(demandaMinima.pacotesDecisao.map((p) => [p.id, p.substituido, p.substituidoPor])).toEqual([
      [v2, false, null],
      [v1, true, v2],
    ]);
    const texto = JSON.stringify([minima, demandaMinima]);
    expect(texto).not.toContain('Carla');
    expect(texto).not.toContain('Pessoa Ficticia');
  });

  it('aprovadoMaisNovo: o id do DEC aprovado de maior versão, ou null', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    expect(await aprovadoMaisNovo(b.db, demandaId)).toBe(v1);
    const v2 = await novoDec(demandaId);
    expect(await aprovadoMaisNovo(b.db, demandaId)).toBe(v1);
    await registrarDecisao(deps, cto, v2, aprovar('B'));
    expect(await aprovadoMaisNovo(b.db, demandaId)).toBe(v2);
    const semAprovado = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Sem pacote', tipo: 'bug', solicitanteNome: 'Joana Ficticia' }));
    expect(await aprovadoMaisNovo(b.db, semAprovado.id)).toBeNull();
  });
});

describe('S2: aprovar o DEC mais novo com outro DEC da demanda já aprovado', () => {
  it('caso 1 (E3): v1 aprovado com A; v2 "Só o CTO" aprovado com B pela cto → aprovada, uma aprovação e uma decisão no v2', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    const r = await registrarDecisao(deps, cto, v2, aprovar('B'));
    expect(r.resultado).toBe('aprovada');
    expect(r.pacote).toMatchObject({ id: v2, statusDecisao: 'aprovada', substituido: false, substituidoPor: null });
    expect(await aprovacoesDo(v2)).toHaveLength(1);
    expect(await decisoesDo(v2)).toEqual([expect.objectContaining({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' })]);
    expect((await obterPacoteDecisao(b.db, v1)).substituidoPor).toBe(v2);
    // P1-d: a aprovação que substitui não muda o status da demanda.
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
  });

  it('casos 2 e 3: na dupla aprovação, a parcial não substitui; a segunda, na mesma opção, substitui e grava um evento', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId, 'cto_e_administradora');
    expect((await registrarDecisao(deps, administradora, v2, aprovar('A', DOC))).resultado).toBe('aprovacao_parcial');
    expect((await obterPacoteDecisao(b.db, v1)).substituido).toBe(false);
    expect(await substituicoesDa(demandaId)).toEqual([]);

    expect((await registrarDecisao(deps, cto, v2, aprovar('A'))).resultado).toBe('aprovada');
    expect((await obterPacoteDecisao(b.db, v1)).substituidoPor).toBe(v2);
    expect(await substituicoesDa(demandaId)).toHaveLength(1);
  });

  it('caso 4: opção diferente, papel repetido e a administradora sem documento continuam recusados, e o v1 não é substituído', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId, 'cto_e_administradora');
    await expect(registrarDecisao(deps, administradora, v2, aprovar('A'))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    expect(await aprovacoesDo(v2)).toEqual([]);
    await registrarDecisao(deps, administradora, v2, aprovar('A', DOC));
    await expect(registrarDecisao(deps, administradora, v2, aprovar('A', DOC))).rejects.toMatchObject({
      codigo: 'conflito',
      mensagem: MENSAGENS_DECISAO.aprovacaoJaRegistrada.administradora,
    });
    await expect(registrarDecisao(deps, cto, v2, aprovar('B'))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.opcaoDiferente.administradora });
    expect(await decisoesDo(v2)).toEqual([]);
    expect(await campos(v1)).toEqual({ statusDecisao: 'aprovada', substituido: false, substituidoPor: null });
    expect(await substituicoesDa(demandaId)).toEqual([]);
  });

  it('caso 5 (P1-b) e C-10: v2 de nível cto aprovado pela administradora → 403; pelo agente → 403; nada substituído', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await expect(registrarDecisao(deps, administradora, v2, aprovar('A'))).rejects.toMatchObject({ codigo: 'sem_permissao' });
    await expect(registrarDecisao(deps, consolidacao, v2, aprovar('A'))).rejects.toMatchObject({ codigo: 'sem_permissao' });
    await expect(registrarDecisao(deps, { tipo: 'sistema' }, v2, aprovar('A'))).rejects.toMatchObject({ codigo: 'sem_permissao' });
    expect(await aprovacoesDo(v2)).toEqual([]);
    expect(await decisoesDo(v2)).toEqual([]);
    expect((await obterPacoteDecisao(b.db, v1)).substituido).toBe(false);
    expect(await substituicoesDa(demandaId)).toEqual([]);
  });

  it('caso 6 (CA-13.4): v2 que cita rascunho de agente, sem revisouRascunhosDeAgente → 400; com a confirmação, aprova e substitui', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    await criarEspecificacao(deps, insumo, demandaId, espValida('Calcular o frete automaticamente, versão 2'));
    const v2 = await novoDec(demandaId);
    await expect(registrarDecisao(deps, cto, v2, aprovar('A'))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    expect(await aprovacoesDo(v2)).toEqual([]);
    expect((await obterPacoteDecisao(b.db, v1)).substituido).toBe(false);
    expect((await registrarDecisao(deps, cto, v2, aprovar('A', { revisouRascunhosDeAgente: true }))).resultado).toBe('aprovada');
    expect((await obterPacoteDecisao(b.db, v1)).substituidoPor).toBe(v2);
  });

  it('caso 7 (CA-12.2): v2 desatualizado (ESP nova depois dele) → 409 desatualizado; o v1 não é substituído', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await criarEspecificacao(deps, cto, demandaId, espValida('Calcular o frete automaticamente, versão 2'));
    await expect(registrarDecisao(deps, cto, v2, aprovar('A'))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.desatualizado });
    expect(await decisoesDo(v2)).toEqual([]);
    expect((await obterPacoteDecisao(b.db, v1)).substituido).toBe(false);
    expect(await substituicoesDa(demandaId)).toEqual([]);
  });

  it('caso 8 (M-08): v1 aprovado, v2 pendente e a demanda encerrada → 409 demandaFinal', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    for (const status of ['encerrada', 'entregue']) {
      await levarA(demandaId, status);
      await expect(registrarDecisao(deps, cto, v2, aprovar('A')), status).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.demandaFinal });
    }
    expect(await decisoesDo(v2)).toEqual([]);
    expect((await obterPacoteDecisao(b.db, v1)).substituido).toBe(false);
  });

  it('caso 9 (A-01): com o v2 pendente, aprovar o v1 de novo dá jaDecidido; decidir um v1 pendente com o v2 criado dá naoEhOMaisNovo', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    await novoDec(demandaId);
    await expect(registrarDecisao(deps, cto, v1, aprovar('B'))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.jaDecidido });

    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Frete da filial', tipo: 'melhoria', solicitanteNome: 'Joana Ficticia' }));
    await criarEspecificacao(deps, cto, d.id, espValida());
    await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const pendente = await novoDec(d.id);
    await novoDec(d.id);
    await expect(registrarDecisao(deps, cto, pendente, aprovar('A'))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.naoEhOMaisNovo });
  });

  it('caso 10: v1, v2 e v3 aprovados nesta ordem → dois eventos, v1→v2 e v2→v3', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('B'));
    const v3 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v3, aprovar('A'));
    expect((await substituicoesDa(demandaId)).map((e) => [e.entidadeId, e.depois])).toEqual([
      [v1, { substituido: v1, substituidoPor: v2 }],
      [v2, { substituido: v2, substituidoPor: v3 }],
    ]);
  });

  it.each(['aprovada', 'em_construcao', 'devolvida'])('caso 11 (E9): substituição com a demanda em %s: aprova, substitui e o status não muda', async (status) => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await levarA(demandaId, status);
    expect((await registrarDecisao(deps, cto, v2, aprovar('A'))).resultado).toBe('aprovada');
    expect((await obterPacoteDecisao(b.db, v1)).substituidoPor).toBe(v2);
    expect(await statusDa(demandaId)).toBe(status);
  });

  it('caso 12 (C-13): duas aprovações do v2 ao mesmo tempo → uma aprovada, a outra 409 jaDecidido, uma decisão e um evento de substituição', async () => {
    for (let i = 0; i < 5; i++) {
      relogio.avancar(86_400_000);
      const { demandaId, v1 } = await comV1Aprovado();
      const v2 = await novoDec(demandaId);
      const r = await Promise.allSettled([registrarDecisao(deps, cto, v2, aprovar('A')), registrarDecisao(deps, cto, v2, aprovar('B'))]);
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect((r.find((x) => x.status === 'rejected') as PromiseRejectedResult).reason).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.jaDecidido });
      expect(await decisoesDo(v2)).toHaveLength(1);
      expect((await substituicoesDa(demandaId)).map((e) => e.depois)).toEqual([{ substituido: v1, substituidoPor: v2 }]);
    }
  });

  it('caso 13 (C-13): dupla aprovação do v2 com cto e administradora ao mesmo tempo → uma parcial, uma completa e um evento', async () => {
    for (let i = 0; i < 5; i++) {
      relogio.avancar(86_400_000);
      const { demandaId, v1 } = await comV1Aprovado();
      const v2 = await novoDec(demandaId, 'cto_e_administradora');
      const r = await Promise.all([registrarDecisao(deps, cto, v2, aprovar('A')), registrarDecisao(deps, administradora, v2, aprovar('A', DOC))]);
      expect(r.map((x) => x.resultado).sort()).toEqual(['aprovacao_parcial', 'aprovada']);
      expect(await decisoesDo(v2)).toHaveLength(1);
      expect((await substituicoesDa(demandaId)).map((e) => e.depois)).toEqual([{ substituido: v1, substituidoPor: v2 }]);
    }
  });

  it('v1 de dupla aprovação substituído por um v2 só do CTO: a regra vale entre níveis diferentes', async () => {
    const { demandaId, v1 } = await comV1Aprovado('cto_e_administradora');
    const v2 = await novoDec(demandaId);
    expect((await registrarDecisao(deps, cto, v2, aprovar('B'))).resultado).toBe('aprovada');
    expect((await obterPacoteDecisao(b.db, v1)).substituidoPor).toBe(v2);
  });
});

// E7 da 01, guarda: temPacoteAprovadoAtualizado não muda. O substituído atualizado implica o substituto atualizado (o
// DEC novo cita ESP e RSK de versão maior ou igual), então este teste já passa na base; fica para travar a regra.
describe('E7: transição manual para aprovada com um DEC substituído', () => {
  it('v1 substituído e v2 aprovado atualizado: a transição passa; depois de uma ESP nova, recusa com semPacote', async () => {
    const { demandaId } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('B'));
    expect((await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'aprovada' }))).status).toBe('aprovada');

    const outra = await comV1Aprovado();
    const w2 = await novoDec(outra.demandaId);
    await registrarDecisao(deps, cto, w2, aprovar('B'));
    await criarEspecificacao(deps, cto, outra.demandaId, espValida('Calcular o frete automaticamente, versão 2'));
    await expect(alterarDemanda(deps, cto, outra.demandaId, alterarDemandaSchema.parse({ status: 'aprovada' }))).rejects.toMatchObject({
      mensagem: MOTIVOS_TRANSICAO.semPacote,
    });
  });
});

describe('S4: evento de substituição no histórico', () => {
  it('caso 1: aprovacao_registrada, decisao_registrada e pacote_decisao_substituido, nesta ordem, com só os dois ids', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, aprovar('B', { comentarios: 'Comentário com Carla Santos Ficticia' }));
    const doV2 = (await eventosDa(demandaId)).filter((e) => e.entidadeId === v2 || e.acao === 'pacote_decisao_substituido').slice(-3);
    expect(doV2.map((e) => e.acao)).toEqual(['aprovacao_registrada', 'decisao_registrada', 'pacote_decisao_substituido']);
    const ev = doV2[2]!;
    expect(ev).toMatchObject({ atorTipo: 'pessoa', atorId: cto.usuarioId, demandaId, entidade: 'pacote_decisao', entidadeId: v1, antes: null });
    expect(ev.depois).toEqual({ substituido: v1, substituidoPor: v2 });
    expect(JSON.stringify(ev)).not.toContain('Carla');
  });

  it('sem DEC aprovado antes, a aprovação não grava evento de substituição', async () => {
    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Frete da filial', tipo: 'melhoria', solicitanteNome: 'Joana Ficticia' }));
    await criarEspecificacao(deps, cto, d.id, espValida());
    await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const v1 = await novoDec(d.id);
    await registrarDecisao(deps, cto, v1, decisaoDe({ statusDecisao: 'devolvida' }));
    const v2 = await novoDec(d.id);
    await registrarDecisao(deps, cto, v2, aprovar('A'));
    expect(await substituicoesDa(d.id)).toEqual([]);
  });
});
