// Casos de borda da decisão (T21), acrescentados na 06-T21-testes: rascunho de agente na dupla aprovação, a ligação da
// decisão com a transição manual para `aprovada` (RF-07, P1-d), a transição automática quando a demanda já saiu de
// pronta_para_decisao, e corridas que o concorrencia.test.ts não cobre (duas aprovações no nível cto, opções
// diferentes e o mesmo papel ao mesmo tempo na dupla). Postgres real, papel do app; dados só fictícios; o relógio é o
// fixo, e cada teste (e cada rodada) fica num dia próprio para o limite por hora (C-36) não pesar.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { aprovacao, decisao, demanda, evento, user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { MOTIVOS_TRANSICAO } from '../demandas/transicoes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { criarPacoteDecisao } from './criar';
import { MENSAGENS_DECISAO, registrarDecisao } from './decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bordas-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const cto2: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bordas-cto-2', nome: 'Pessoa Ficticia CTO 2', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bordas-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

const DOC = { referenciaDocumento: 'DOC-FICTICIO-BORDA', dataDocumento: '2026-10-21' };
const decisaoDe = (corpo: Record<string, unknown>) => registrarDecisaoSchema.parse(corpo);
const aprovar = (opcao: 'A' | 'B', extra: Record<string, unknown> = {}) => decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, ...extra });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'bordas-cto@exemplo.test', papel: 'cto' },
    { id: cto2.usuarioId, name: cto2.nome, email: 'bordas-cto-2@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'bordas-adm@exemplo.test', papel: 'administradora' },
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
const statusAlteradosDa = async (demandaId: string) =>
  (await migrator().select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id)).filter((e) => e.acao === 'status_alterado');

// Demanda com ESP v1, RSK v1 e DEC v1 pendente, por pessoa (ou o DEC pelo agente); a demanda fica em
// pronta_para_decisao. Nas corridas, cada rodada avança um dia (C-36).
async function prepararDec(op: { nivel?: 'cto' | 'cto_e_administradora'; decPor?: AtorPessoa | AtorAgente } = {}): Promise<{ demandaId: string; decId: string }> {
  relogio.avancar(86_400_000);
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
  const dec = await criarPacoteDecisao(
    deps,
    op.decPor ?? cto,
    d.id,
    criarPacoteDecisaoSchema.parse({
      resumoExecutivo: 'Resumo fictício',
      opcaoA: { descricao: 'Opção A' },
      opcaoB: { descricao: 'Opção B' },
      nivelAprovacaoRequerido: op.nivel ?? 'cto',
    }),
  );
  return { demandaId: d.id, decId: dec.id };
}

describe('CA-13.4 na dupla aprovação', () => {
  it('com DEC rascunho de agente, a confirmação de revisão é exigida de cada aprovador, e cada aprovação guarda a sua', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora', decPor: consolidacao });
    expect((await registrarDecisao(deps, cto, decId, aprovar('A', { revisouRascunhosDeAgente: true }))).resultado).toBe('aprovacao_parcial');

    const erro = await registrarDecisao(deps, administradora, decId, aprovar('A', DOC)).catch((e: unknown) => e);
    expect(erro).toMatchObject({
      codigo: 'entrada_invalida',
      extras: { campos: [{ campo: 'revisouRascunhosDeAgente', mensagem: MENSAGENS_DECISAO.revisarRascunhos }] },
    });
    expect(await aprovacoesDo(decId)).toHaveLength(1);
    expect(await decisoesDo(decId)).toEqual([]);

    const { resultado } = await registrarDecisao(deps, administradora, decId, aprovar('A', { ...DOC, revisouRascunhosDeAgente: true }));
    expect(resultado).toBe('aprovada');
    const linhas = await aprovacoesDo(decId);
    expect(linhas.map((l) => [l.papelAprovacao, l.revisouRascunhos]).sort()).toEqual([
      ['administradora', true],
      ['cto', true],
    ]);
  });
});

describe('RF-07 com P1-d: a decisão e a transição manual para aprovada', () => {
  it('com só a aprovação do CTO na dupla, a demanda não vai a aprovada (409); com as duas, vai', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    const paraAprovada = alterarDemandaSchema.parse({ status: 'aprovada' });

    await registrarDecisao(deps, cto, decId, aprovar('A'));
    await expect(alterarDemanda(deps, cto, demandaId, paraAprovada)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MOTIVOS_TRANSICAO.semPacote });
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');

    await registrarDecisao(deps, administradora, decId, aprovar('A', DOC));
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
    const d = await alterarDemanda(deps, cto, demandaId, paraAprovada);
    expect(d.status).toBe('aprovada');
  });
});

describe('RF-07: transição automática quando a demanda já saiu de pronta_para_decisao', () => {
  it('devolvida com a demanda já em em_analise (mudança manual): a decisão é gravada e não há segunda mudança de status', async () => {
    const { decId, demandaId } = await prepararDec();
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'em_analise' }));
    const antes = await statusAlteradosDa(demandaId);

    const { pacote, resultado } = await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'devolvida' }));
    expect(resultado).toBe('devolvida');
    expect(pacote.statusDecisao).toBe('devolvida');
    expect(await decisoesDo(decId)).toHaveLength(1);
    expect(await statusDa(demandaId)).toBe('em_analise');
    expect(await statusAlteradosDa(demandaId)).toHaveLength(antes.length);
  });
});

// M-08 (DEC-DEM-20261103-0007-v1): decidir um DEC de demanda em status final é recusado com 409, logo depois da trava e
// antes de toda outra conferência, sem linha em aprovacao, decisao nem evento; a demanda segue no status final.
describe('M-08: decidir DEC de demanda em status final', () => {
  const eventosDa = async (demandaId: string) => (await migrator().select().from(evento).where(eq(evento.demandaId, demandaId))).length;
  const levarA = async (demandaId: string, status: 'encerrada' | 'entregue') => {
    if (status === 'encerrada') await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
    // entregue só se chega por aprovada → em_construcao → entregue, com DEC aprovado; aqui o DEC tem de ficar pendente.
    else await migrator().update(demanda).set({ status: 'entregue' }).where(eq(demanda.id, demandaId));
  };
  const decisoes = [
    ['aprovar', aprovar('A')],
    ['devolver', decisaoDe({ statusDecisao: 'devolvida' })],
    ['arquivar', decisaoDe({ statusDecisao: 'arquivada' })],
  ] as const;

  for (const status of ['encerrada', 'entregue'] as const) {
    it.each(decisoes)(`%s um DEC pendente em demanda ${status} → 409 demandaFinal, sem efeito`, async (_acao, entrada) => {
      const { decId, demandaId } = await prepararDec();
      await levarA(demandaId, status);
      const antes = await eventosDa(demandaId);
      await expect(registrarDecisao(deps, cto, decId, entrada)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.demandaFinal });
      expect(await aprovacoesDo(decId)).toEqual([]);
      expect(await decisoesDo(decId)).toEqual([]);
      expect(await eventosDa(demandaId)).toBe(antes);
      expect(await statusDa(demandaId)).toBe(status);
    });
  }

  it('DEC já decidido em demanda encerrada → 409 demandaFinal (vem antes do jaDecidido)', async () => {
    const { decId, demandaId } = await prepararDec();
    await registrarDecisao(deps, cto, decId, aprovar('A'));
    await levarA(demandaId, 'encerrada');
    const antes = await eventosDa(demandaId);
    await expect(registrarDecisao(deps, cto, decId, aprovar('A'))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.demandaFinal });
    await expect(registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'arquivada' }))).rejects.toMatchObject({ mensagem: MENSAGENS_DECISAO.demandaFinal });
    expect(await aprovacoesDo(decId)).toHaveLength(1);
    expect(await decisoesDo(decId)).toHaveLength(1);
    expect(await eventosDa(demandaId)).toBe(antes);
  });

  it('dupla aprovação com só a do CTO e a demanda encerrada → a da administradora é recusada', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovar('A'));
    await levarA(demandaId, 'encerrada');
    await expect(registrarDecisao(deps, administradora, decId, aprovar('A', DOC))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.demandaFinal });
    expect(await aprovacoesDo(decId)).toHaveLength(1);
    expect(await decisoesDo(decId)).toEqual([]);
  });

  it('nos status não finais, decidir segue como antes', async () => {
    const { decId, demandaId } = await prepararDec();
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ status: 'em_analise' }));
    expect((await registrarDecisao(deps, cto, decId, aprovar('A'))).resultado).toBe('aprovada');
  });

  it('o texto da recusa é fixo e em minúscula (a tela acrescenta o prefixo)', () => {
    expect(MENSAGENS_DECISAO.demandaFinal).toBe('a demanda está em status final; o pacote não pode mais ser decidido.');
  });
});

describe('Corridas da decisão que o concorrencia.test.ts não cobre', () => {
  it('CA-11.3: duas aprovações ao mesmo tempo no nível cto → uma passa, a outra 409; uma aprovação e uma decisão só', async () => {
    for (let i = 0; i < 10; i++) {
      const { decId } = await prepararDec();
      const r = await Promise.allSettled([registrarDecisao(deps, cto, decId, aprovar('A')), registrarDecisao(deps, cto, decId, aprovar('B'))]);
      const ok = r.filter((x): x is PromiseFulfilledResult<Awaited<ReturnType<typeof registrarDecisao>>> => x.status === 'fulfilled');
      const recusa = r.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
      expect(ok).toHaveLength(1);
      expect(recusa).toHaveLength(1);
      expect(recusa[0]!.reason).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.jaDecidido });
      expect(await aprovacoesDo(decId)).toHaveLength(1);
      const decisoes = await decisoesDo(decId);
      expect(decisoes).toHaveLength(1);
      expect(decisoes[0]!.opcaoEscolhida).toBe(ok[0]!.value.pacote.decisao!.opcaoEscolhida);
    }
  });

  it('CA-14.4: CTO com A e administradora com B ao mesmo tempo → uma aprovação parcial, a outra 409 que cita quem aprovou, nenhuma decisão', async () => {
    for (let i = 0; i < 5; i++) {
      const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
      const [doCto, daAdm] = await Promise.allSettled([
        registrarDecisao(deps, cto, decId, aprovar('A')),
        registrarDecisao(deps, administradora, decId, aprovar('B', DOC)),
      ]);
      expect([doCto.status, daAdm.status].sort()).toEqual(['fulfilled', 'rejected']);
      const venceu = doCto.status === 'fulfilled' ? doCto : (daAdm as PromiseFulfilledResult<Awaited<ReturnType<typeof registrarDecisao>>>);
      const perdeu = (doCto.status === 'rejected' ? doCto : daAdm) as PromiseRejectedResult;
      expect(venceu.value.resultado).toBe('aprovacao_parcial');
      const papelQueVenceu = doCto.status === 'fulfilled' ? 'cto' : 'administradora';
      expect(perdeu.reason).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.opcaoDiferente[papelQueVenceu] });
      const linhas = await aprovacoesDo(decId);
      expect(linhas.map((l) => l.papelAprovacao)).toEqual([papelQueVenceu]);
      expect(await decisoesDo(decId)).toEqual([]);
    }
  });

  it('duas contas cto aprovando ao mesmo tempo na dupla → uma aprovação de papel cto, a outra 409, e o DEC segue pendente', async () => {
    for (let i = 0; i < 5; i++) {
      const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
      const r = await Promise.allSettled([registrarDecisao(deps, cto, decId, aprovar('A')), registrarDecisao(deps, cto2, decId, aprovar('A'))]);
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      const recusa = r.find((x): x is PromiseRejectedResult => x.status === 'rejected')!;
      expect(recusa.reason).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.aprovacaoJaRegistrada.cto });
      expect(await aprovacoesDo(decId)).toHaveLength(1);
      expect(await decisoesDo(decId)).toEqual([]);
    }
  });
});
