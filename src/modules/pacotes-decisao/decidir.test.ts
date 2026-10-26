// Decisão e dupla aprovação contra o Postgres real, pelo papel do app (RF-13, RF-14, RF-12, RF-11, RF-07, C-11, C-12,
// P1-a, P1-b, P1-d, G3.8). Dados só fictícios; o relógio é sempre o fixo, e cada teste fica num dia próprio para o
// limite por hora (C-36) de um não pesar no outro.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarDb } from '../../db';
import { aprovacao, decisao, demanda, evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { obterPacoteDecisao } from './consultas';
import { criarPacoteDecisao } from './criar';
import {
  MENSAGENS_DECISAO,
  MODO_APROVACAO_ADMINISTRADORA,
  papelDaAprovacao,
  registrarDecisao,
} from './decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decidir-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decidir-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: 'Cn5oL1dA' };
const sistema: AtorSistema = { tipo: 'sistema' };

const DOC = { referenciaDocumento: 'DOC-FICTICIO-001', dataDocumento: '2026-10-21' };

const esp = () =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva: 'Corrigir pedidos duplicados',
    escopoInclui: ['Importação de pedidos'],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: ['pnpm test verde'],
  });
const rsk = () => criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
const entradaDec = (nivel: 'cto' | 'cto_e_administradora') =>
  criarPacoteDecisaoSchema.parse({
    resumoExecutivo: 'Corrigir a importação de pedidos duplicados',
    opcaoA: { descricao: 'Corrigir no importador' },
    opcaoB: { descricao: 'Refazer a integração' },
    nivelAprovacaoRequerido: nivel,
  });
const decisaoDe = (corpo: Record<string, unknown>) => registrarDecisaoSchema.parse(corpo);
const aprovarA = (extra: Record<string, unknown> = {}) => decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...extra });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'decidir-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'decidir-adm@exemplo.test', papel: 'administradora' },
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
const eventosDa = (demandaId: string) => b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);
const acoesDa = async (demandaId: string) => (await eventosDa(demandaId)).map((e) => e.acao);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;
const aprovacoesDo = (decId: string) => migrator().select().from(aprovacao).where(eq(aprovacao.pacoteDecisaoId, decId)).orderBy(aprovacao.registradaEm);
const decisoesDo = (decId: string) => migrator().select().from(decisao).where(eq(decisao.pacoteDecisaoId, decId));

type Preparo = { espPor?: AtorPessoa | AtorAgente; rskPor?: AtorPessoa | AtorAgente; decPor?: AtorPessoa | AtorAgente; nivel?: 'cto' | 'cto_e_administradora' };

// Demanda com ESP v1, RSK v1 e DEC v1 pendente; por padrão tudo por pessoa e nível cto. A demanda termina em
// pronta_para_decisao (CA-10.4).
async function prepararDec(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(deps, op.espPor ?? cto, d.id, esp());
  await criarParecerRisco(deps, op.rskPor ?? cto, d.id, rsk());
  const dec = await criarPacoteDecisao(deps, op.decPor ?? cto, d.id, entradaDec(op.nivel ?? 'cto'));
  return { demandaId: d.id, decId: dec.id };
}

async function nadaGravado(decId: string, demandaId: string, acoesAntes: string[]): Promise<void> {
  expect(await decisoesDo(decId)).toEqual([]);
  expect(await acoesDa(demandaId)).toEqual(acoesAntes);
}

describe('registrarDecisaoSchema', () => {
  it('CA-13.2 e CA-13.3: opção C e aprovada sem opção → 400 (schema)', () => {
    expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'aprovada', opcaoEscolhida: 'C' }).success).toBe(false);
    expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'aprovada' }).success).toBe(false);
    expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'aprovada', opcaoEscolhida: 'a' }).success).toBe(false);
  });

  it('statusDecisao ausente ou fora da lista → recusado, com o campo statusDecisao', () => {
    for (const corpo of [{}, { statusDecisao: 'pendente' }, { statusDecisao: 'recusada', opcaoEscolhida: 'A' }]) {
      const r = registrarDecisaoSchema.safeParse(corpo);
      expect(r.success, JSON.stringify(corpo)).toBe(false);
      expect(r.error!.issues.map((i) => i.path.join('.'))).toEqual(['statusDecisao']);
    }
  });

  it('devolvida e arquivada aceitam só os comuns; a opção mandada junto é descartada', () => {
    expect(decisaoDe({ statusDecisao: 'devolvida', opcaoEscolhida: 'A', comentarios: 'Refazer' })).toEqual({ statusDecisao: 'devolvida', comentarios: 'Refazer' });
    expect(decisaoDe({ statusDecisao: 'arquivada' })).toEqual({ statusDecisao: 'arquivada' });
  });

  it('referência ao documento: aparada, de 1 a 200 caracteres; data no formato AAAA-MM-DD', () => {
    expect(aprovarA({ referenciaDocumento: '  DOC-1  ', dataDocumento: '2026-10-21' })).toMatchObject({ referenciaDocumento: 'DOC-1', dataDocumento: '2026-10-21' });
    for (const extra of [{ referenciaDocumento: '   ' }, { referenciaDocumento: 'x'.repeat(201) }, { dataDocumento: '21/10/2026' }, { dataDocumento: '2026-13-01' }]) {
      expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...extra }).success, JSON.stringify(extra)).toBe(false);
    }
  });

  it('registrarComo só aceita administradora', () => {
    expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', registrarComo: 'cto' }).success).toBe(false);
    expect(aprovarA({ registrarComo: 'administradora' })).toMatchObject({ registrarComo: 'administradora' });
  });

  it('C-11: nenhum campo de autoria passa pelo schema', () => {
    const entrada = aprovarA({
      aprovadorNome: 'Outra Pessoa',
      aprovadorPapel: 'administradora',
      papelAprovacao: 'administradora',
      nomeAprovador: 'Outra Pessoa',
      registradaPor: 'u-outra',
      decididaPor: 'u-outra',
      autorTipo: 'agente',
      autorId: 'consolidacao',
    });
    expect(Object.keys(entrada).sort()).toEqual(['opcaoEscolhida', 'statusDecisao']);
  });

  it('revisouRascunhosDeAgente só aceita booleano', () => {
    expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'devolvida', revisouRascunhosDeAgente: 'sim' }).success).toBe(false);
    expect(decisaoDe({ statusDecisao: 'devolvida', revisouRascunhosDeAgente: true })).toMatchObject({ revisouRascunhosDeAgente: true });
  });
});

describe('P1-a: modo de aprovação da administradora', () => {
  it('o modo da 0.1.0 é somente_propria', () => {
    expect(MODO_APROVACAO_ADMINISTRADORA).toBe('somente_propria');
  });

  it('somente_propria: o papel é o da conta; CTO pedindo registrarComo administradora → sem_permissao', () => {
    expect(papelDaAprovacao(cto, aprovarA(), 'somente_propria')).toBe('cto');
    expect(papelDaAprovacao(administradora, aprovarA(), 'somente_propria')).toBe('administradora');
    expect(papelDaAprovacao(administradora, aprovarA({ registrarComo: 'administradora' }), 'somente_propria')).toBe('administradora');
    expect(() => papelDaAprovacao(cto, aprovarA({ registrarComo: 'administradora' }), 'somente_propria')).toThrow(ErroDominio);
  });

  it('cto_com_referencia: o CTO pode registrar em nome da administradora (o outro modo, a uma linha de distância)', () => {
    expect(papelDaAprovacao(cto, aprovarA({ registrarComo: 'administradora' }), 'cto_com_referencia')).toBe('administradora');
    expect(papelDaAprovacao(cto, aprovarA(), 'cto_com_referencia')).toBe('cto');
  });
});

describe('registrarDecisao: nível cto', () => {
  it('CA-13.1: CTO aprova A em DEC pendente, atualizado, de nível cto → aprovada, com dataAprovacao e a pessoa em aprovadores', async () => {
    const { decId } = await prepararDec();
    const { pacote, resultado } = await registrarDecisao(deps, cto, decId, aprovarA());
    expect(resultado).toBe('aprovada');
    expect(pacote.statusDecisao).toBe('aprovada');
    expect(pacote.decisao!.decididaEm).toEqual(relogio.agora());
    expect(pacote.decisao).toMatchObject({ opcaoEscolhida: 'A', decididaPor: cto.nome, comentarios: null });
    expect(pacote.aprovadores).toEqual([expect.objectContaining({ papel: 'cto', nome: 'Pessoa Ficticia CTO', opcao: 'A', referenciaDocumento: null, dataDocumento: null })]);
    expect(pacote.aprovadores[0]!.registradaEm).toEqual(relogio.agora());
    const [linhaDecisao] = await decisoesDo(decId);
    expect(linhaDecisao).toMatchObject({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', decididaPor: cto.usuarioId });
    const [linhaAprovacao] = await aprovacoesDo(decId);
    expect(linhaAprovacao).toMatchObject({ papelAprovacao: 'cto', nomeAprovador: cto.nome, registradaPor: cto.usuarioId, opcao: 'A', revisouRascunhos: false });
  });

  it('CA-13.5 e C-11: aprovadorNome e papelAprovacao do body são ignorados', async () => {
    const { decId } = await prepararDec();
    const entrada = registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', aprovadorNome: 'Outra Pessoa', papelAprovacao: 'administradora' });
    const { pacote } = await registrarDecisao(deps, cto, decId, entrada);
    expect(pacote.aprovadores[0]).toMatchObject({ papel: 'cto', nome: 'Pessoa Ficticia CTO' });
  });

  it('opção B e comentários gravados na aprovação e na decisão; comentário só de espaços vira nulo', async () => {
    const { decId } = await prepararDec();
    const { pacote } = await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', comentarios: 'Seguir com a B' }));
    expect(pacote.decisao).toMatchObject({ opcaoEscolhida: 'B', comentarios: 'Seguir com a B' });
    expect((await aprovacoesDo(decId))[0]).toMatchObject({ opcao: 'B', comentario: 'Seguir com a B' });
    const outro = await prepararDec();
    const r = await registrarDecisao(deps, cto, outro.decId, decisaoDe({ statusDecisao: 'devolvida', comentarios: '   ' }));
    expect(r.pacote.decisao!.comentarios).toBeNull();
  });

  it('referência ao documento enviada pelo CTO não é gravada na aprovação dele', async () => {
    const { decId } = await prepararDec();
    await registrarDecisao(deps, cto, decId, aprovarA(DOC));
    expect((await aprovacoesDo(decId))[0]).toMatchObject({ referenciaDocumento: null, dataDocumento: null });
  });

  it('P1-b e C-12: administradora em DEC de nível cto → 403, e nada gravado', async () => {
    const { decId, demandaId } = await prepararDec();
    const antes = await acoesDa(demandaId);
    const erro = await registrarDecisao(deps, administradora, decId, aprovarA(DOC)).catch((e: unknown) => e);
    expect(erro).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    await nadaGravado(decId, demandaId, antes);
    expect(await aprovacoesDo(decId)).toEqual([]);
  });

  it('administradora devolve ou arquiva um DEC de nível cto (só aprovar é do CTO)', async () => {
    const a = await prepararDec();
    expect((await registrarDecisao(deps, administradora, a.decId, decisaoDe({ statusDecisao: 'devolvida' }))).resultado).toBe('devolvida');
    const b2 = await prepararDec();
    expect((await registrarDecisao(deps, administradora, b2.decId, decisaoDe({ statusDecisao: 'arquivada' }))).resultado).toBe('arquivada');
  });

  it('C-12: CTO com registrarComo administradora → 403, em qualquer nível, e nada gravado', async () => {
    for (const nivel of ['cto', 'cto_e_administradora'] as const) {
      const { decId, demandaId } = await prepararDec({ nivel });
      const antes = await acoesDa(demandaId);
      await expect(registrarDecisao(deps, cto, decId, aprovarA({ registrarComo: 'administradora', ...DOC }))).rejects.toMatchObject({ codigo: 'sem_permissao' });
      await nadaGravado(decId, demandaId, antes);
      expect(await aprovacoesDo(decId)).toEqual([]);
    }
  });
});

describe('registrarDecisao: dupla aprovação (cto_e_administradora)', () => {
  it('CA-14.1: só com a do CTO → pendente, sem dataAprovacao e sem decisão, com a aprovação parcial visível', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    const { pacote, resultado } = await registrarDecisao(deps, cto, decId, aprovarA());
    expect(resultado).toBe('aprovacao_parcial');
    expect(pacote).toMatchObject({ statusDecisao: 'pendente', decisao: null });
    expect(pacote.aprovadores).toEqual([expect.objectContaining({ papel: 'cto', nome: cto.nome, opcao: 'A' })]);
    expect(await decisoesDo(decId)).toEqual([]);
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
  });

  it('CA-14.2: com a da administradora (referência e data) → aprovada com as duas em aprovadores', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA());
    relogio.avancar(60_000);
    const { pacote, resultado } = await registrarDecisao(deps, administradora, decId, aprovarA({ ...DOC, comentarios: 'Documento assinado' }));
    expect(resultado).toBe('aprovada');
    expect(pacote.statusDecisao).toBe('aprovada');
    expect(pacote.decisao).toMatchObject({ opcaoEscolhida: 'A', decididaPor: administradora.nome, comentarios: 'Documento assinado' });
    expect(pacote.decisao!.decididaEm).toEqual(relogio.agora());
    expect(pacote.aprovadores).toEqual([
      expect.objectContaining({ papel: 'cto', nome: cto.nome, opcao: 'A', referenciaDocumento: null, dataDocumento: null }),
      expect.objectContaining({ papel: 'administradora', nome: administradora.nome, opcao: 'A', ...DOC }),
    ]);
  });

  it('a administradora pode aprovar primeiro; a do CTO completa', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    expect((await registrarDecisao(deps, administradora, decId, aprovarA({ ...DOC, registrarComo: 'administradora' }))).resultado).toBe('aprovacao_parcial');
    const { pacote, resultado } = await registrarDecisao(deps, cto, decId, aprovarA());
    expect(resultado).toBe('aprovada');
    expect(pacote.aprovadores.map((a) => a.papel)).toEqual(['administradora', 'cto']);
    expect(pacote.decisao).toMatchObject({ decididaPor: cto.nome });
  });

  it('CA-14.3: administradora sem referência ao documento → 400 com o campo, e nada gravado', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA());
    const antes = await acoesDa(demandaId);
    const casos: Array<[Record<string, unknown>, string[]]> = [
      [{}, ['referenciaDocumento', 'dataDocumento']],
      [{ dataDocumento: DOC.dataDocumento }, ['referenciaDocumento']],
      [{ referenciaDocumento: DOC.referenciaDocumento }, ['dataDocumento']],
    ];
    for (const [extra, campos] of casos) {
      const erro = await registrarDecisao(deps, administradora, decId, aprovarA(extra)).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ErroDominio);
      expect(erro).toMatchObject({ codigo: 'entrada_invalida' });
      expect((erro as ErroDominio).extras.campos).toEqual(
        campos.map((campo) => ({ campo, mensagem: campo === 'referenciaDocumento' ? MENSAGENS_DECISAO.semReferencia : MENSAGENS_DECISAO.semDataDocumento })),
      );
    }
    expect(MENSAGENS_DECISAO.semReferencia).toBe('Informe o identificador do documento assinado.');
    expect(MENSAGENS_DECISAO.semDataDocumento).toBe('Informe a data da assinatura.');
    expect(await aprovacoesDo(decId)).toHaveLength(1);
    await nadaGravado(decId, demandaId, antes);
  });

  it('CA-14.4: CTO com A e administradora com B → 409 que cita o CTO, e nada gravado', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA());
    const antes = await acoesDa(demandaId);
    const erro = await registrarDecisao(deps, administradora, decId, decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', ...DOC })).catch((e: unknown) => e);
    expect(erro).toMatchObject({ codigo: 'conflito', mensagem: 'a opção precisa ser a mesma aprovada pelo CTO.' });
    expect(await aprovacoesDo(decId)).toHaveLength(1);
    await nadaGravado(decId, demandaId, antes);
  });

  it('CA-14.4 ao contrário: administradora com A e CTO com B → 409 que cita a administradora', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, administradora, decId, aprovarA(DOC));
    await expect(registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' }))).rejects.toMatchObject({
      codigo: 'conflito',
      mensagem: 'a opção precisa ser a mesma aprovada pela administradora.',
    });
  });

  it('a mesma conta (ou o mesmo papel) aprovando duas vezes → 409, sem segunda linha', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA());
    const outroCto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decidir-cto-2', nome: 'Pessoa Ficticia CTO 2', papel: 'cto' };
    for (const ator of [cto, outroCto]) {
      await expect(registrarDecisao(deps, ator, decId, aprovarA())).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.aprovacaoJaRegistrada.cto });
    }
    expect(await aprovacoesDo(decId)).toHaveLength(1);
  });

  it('com uma aprovação parcial, o pacote ainda pode ser devolvido', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA());
    const { pacote, resultado } = await registrarDecisao(deps, administradora, decId, decisaoDe({ statusDecisao: 'devolvida' }));
    expect(resultado).toBe('devolvida');
    expect(pacote).toMatchObject({ statusDecisao: 'devolvida', decisao: { opcaoEscolhida: null, decididaPor: administradora.nome } });
    expect(await statusDa(demandaId)).toBe('em_analise');
  });
});

describe('registrarDecisao: rascunhos de agente (CA-13.4)', () => {
  it('CA-13.4: DEC do agente consolidacao sem revisouRascunhosDeAgente → 400 e nada gravado', async () => {
    const { decId, demandaId } = await prepararDec({ decPor: consolidacao });
    const antes = await acoesDa(demandaId);
    for (const extra of [{}, { revisouRascunhosDeAgente: false }]) {
      const erro = await registrarDecisao(deps, cto, decId, aprovarA(extra)).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ErroDominio);
      expect(erro).toMatchObject({
        codigo: 'entrada_invalida',
        extras: { campos: [{ campo: 'revisouRascunhosDeAgente', mensagem: 'Marque que revisou os rascunhos de agente para registrar a decisão.' }] },
      });
    }
    expect(await aprovacoesDo(decId)).toEqual([]);
    await nadaGravado(decId, demandaId, antes);
  });

  it('com revisouRascunhosDeAgente: true → aprovada, e a aprovação guarda que revisou', async () => {
    const { decId } = await prepararDec({ decPor: consolidacao });
    const { resultado } = await registrarDecisao(deps, cto, decId, aprovarA({ revisouRascunhosDeAgente: true }));
    expect(resultado).toBe('aprovada');
    expect((await aprovacoesDo(decId))[0]).toMatchObject({ revisouRascunhos: true });
  });

  it.each([
    ['a ESP do agente insumo_tecnico', { espPor: insumo }],
    ['o RSK do agente risco', { rskPor: risco }],
  ] as const)('%s citada também exige a confirmação', async (_, op) => {
    const { decId } = await prepararDec(op);
    await expect(registrarDecisao(deps, cto, decId, aprovarA())).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    expect((await registrarDecisao(deps, cto, decId, aprovarA({ revisouRascunhosDeAgente: true }))).resultado).toBe('aprovada');
  });

  it('devolver e arquivar também exigem a confirmação quando há rascunho citado', async () => {
    for (const statusDecisao of ['devolvida', 'arquivada'] as const) {
      const { decId } = await prepararDec({ decPor: consolidacao });
      await expect(registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao }))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
      expect((await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao, revisouRascunhosDeAgente: true }))).resultado).toBe(statusDecisao);
    }
  });

  it('sem rascunho citado, a confirmação não é exigida', async () => {
    const { decId } = await prepararDec();
    expect((await registrarDecisao(deps, cto, decId, aprovarA())).resultado).toBe('aprovada');
  });
});

describe('registrarDecisao: decisão única e desatualizado', () => {
  it('CA-11.3: segunda decisão no mesmo DEC → 409', async () => {
    const { decId, demandaId } = await prepararDec();
    await registrarDecisao(deps, cto, decId, aprovarA());
    const antes = await acoesDa(demandaId);
    for (const entrada of [aprovarA(), decisaoDe({ statusDecisao: 'devolvida' }), decisaoDe({ statusDecisao: 'arquivada' })]) {
      await expect(registrarDecisao(deps, cto, decId, entrada)).rejects.toMatchObject({ codigo: 'conflito', mensagem: 'este pacote já tem decisão registrada.' });
    }
    expect(await decisoesDo(decId)).toHaveLength(1);
    expect(await acoesDa(demandaId)).toEqual(antes);
  });

  it('CA-11.3: depois de devolvida, aprovar → 409', async () => {
    const { decId } = await prepararDec();
    await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'devolvida' }));
    await expect(registrarDecisao(deps, cto, decId, aprovarA())).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.jaDecidido });
  });

  it('CA-12.2 e CA-12.3: desatualizado não aprova (409, continua pendente) e devolve (aceito)', async () => {
    const { decId, demandaId } = await prepararDec();
    await criarEspecificacao(deps, cto, demandaId, esp());
    const antes = await acoesDa(demandaId);
    const erro = await registrarDecisao(deps, cto, decId, aprovarA()).catch((e: unknown) => e);
    expect(erro).toMatchObject({ codigo: 'conflito', mensagem: 'o pacote está desatualizado e não pode ser aprovado.' });
    expect((await obterPacoteDecisao(b.db, decId)).statusDecisao).toBe('pendente');
    expect(await aprovacoesDo(decId)).toEqual([]);
    await nadaGravado(decId, demandaId, antes);
    const { pacote, resultado } = await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'devolvida' }));
    expect(resultado).toBe('devolvida');
    expect(pacote).toMatchObject({ statusDecisao: 'devolvida', desatualizado: true });
  });

  it('CA-12.3: desatualizado por RSK novo também arquiva', async () => {
    const { decId, demandaId } = await prepararDec();
    await criarParecerRisco(deps, cto, demandaId, rsk());
    await expect(registrarDecisao(deps, cto, decId, aprovarA())).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.desatualizado });
    expect((await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'arquivada' }))).resultado).toBe('arquivada');
  });

  it('CA-12.2 na dupla aprovação: com a do CTO e uma ESP nova, a da administradora → 409', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA());
    await criarEspecificacao(deps, cto, demandaId, esp());
    await expect(registrarDecisao(deps, administradora, decId, aprovarA(DOC))).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.desatualizado });
    expect(await aprovacoesDo(decId)).toHaveLength(1);
    expect(await decisoesDo(decId)).toEqual([]);
  });

  it('DEC que não existe → nao_encontrado', async () => {
    await expect(registrarDecisao(deps, cto, 'DEC-DEM-20261022-9999-v1', aprovarA())).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });
});

describe('registrarDecisao: status da demanda (RF-07, P1-d)', () => {
  it('devolvida leva a demanda a em_analise; arquivada a encerrada; aprovada não muda o status (P1-d)', async () => {
    const devolver = await prepararDec();
    await registrarDecisao(deps, cto, devolver.decId, decisaoDe({ statusDecisao: 'devolvida' }));
    expect(await statusDa(devolver.demandaId)).toBe('em_analise');

    const arquivar = await prepararDec();
    await registrarDecisao(deps, cto, arquivar.decId, decisaoDe({ statusDecisao: 'arquivada' }));
    expect(await statusDa(arquivar.demandaId)).toBe('encerrada');

    const aprovar = await prepararDec();
    await registrarDecisao(deps, cto, aprovar.decId, aprovarA());
    expect(await statusDa(aprovar.demandaId)).toBe('pronta_para_decisao');
    expect((await eventosDa(aprovar.demandaId)).filter((e) => e.acao === 'status_alterado')).toHaveLength(1);
  });

  it('a mudança automática é do ator sistema, depois do evento da decisão', async () => {
    const { decId, demandaId } = await prepararDec();
    await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'devolvida' }));
    const eventos = await eventosDa(demandaId);
    expect(eventos.slice(-2).map((e) => e.acao)).toEqual(['decisao_registrada', 'status_alterado']);
    expect(eventos.at(-1)).toMatchObject({ atorTipo: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'em_analise' } });
  });
});

describe('registrarDecisao: acesso e histórico', () => {
  it('C-12: ator agente e ator sistema → 403 também chamando a função direto (como o worker)', async () => {
    const { decId, demandaId } = await prepararDec();
    const antes = await acoesDa(demandaId);
    const agentes: AtorAgente[] = (['orquestrador', 'insumo_tecnico', 'risco', 'consolidacao'] as const).map((agente) => ({ tipo: 'agente', agente, prefixoToken: null }));
    for (const ator of [sistema, ...agentes]) {
      for (const entrada of [aprovarA({ revisouRascunhosDeAgente: true }), decisaoDe({ statusDecisao: 'devolvida' })]) {
        await expect(registrarDecisao(deps, ator, decId, entrada)).rejects.toMatchObject({ codigo: 'sem_permissao' });
      }
    }
    expect(await aprovacoesDo(decId)).toEqual([]);
    await nadaGravado(decId, demandaId, antes);
  });

  it('RF-21 e C-30: aprovacao_registrada e decisao_registrada com a pessoa, sem o comentário', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await registrarDecisao(deps, cto, decId, aprovarA({ comentarios: SENTINELAS.texto }));
    await registrarDecisao(deps, administradora, decId, aprovarA({ ...DOC, comentarios: `${SENTINELAS.nome} ${SENTINELAS.email}` }));
    const eventos = (await eventosDa(demandaId)).filter((e) => e.entidadeId === decId && e.acao !== 'pacote_decisao_criado');
    expect(eventos.map((e) => [e.acao, e.atorTipo, e.atorId])).toEqual([
      ['aprovacao_registrada', 'pessoa', cto.usuarioId],
      ['aprovacao_registrada', 'pessoa', administradora.usuarioId],
      ['decisao_registrada', 'pessoa', administradora.usuarioId],
    ]);
    expect(eventos[0]).toMatchObject({ entidade: 'pacote_decisao', antes: null, depois: { papel: 'cto', opcao: 'A' } });
    expect(eventos[0]!.depois).not.toHaveProperty('referenciaDocumento');
    expect(eventos[1]).toMatchObject({ depois: { papel: 'administradora', opcao: 'A', ...DOC } });
    expect(eventos[2]).toMatchObject({ depois: { statusDecisao: 'aprovada', opcaoEscolhida: 'A' } });
    expect(contemSentinela(JSON.stringify(await eventosDa(demandaId)))).toBe(false);
  });

  it('decisao_registrada da devolução, sem opção e sem aprovação', async () => {
    const { decId, demandaId } = await prepararDec();
    await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'devolvida', comentarios: SENTINELAS.texto }));
    const ev = (await eventosDa(demandaId)).find((e) => e.acao === 'decisao_registrada')!;
    expect(ev).toMatchObject({ atorTipo: 'pessoa', atorId: cto.usuarioId, entidade: 'pacote_decisao', entidadeId: decId, depois: { statusDecisao: 'devolvida' } });
    expect(ev.depois).not.toHaveProperty('opcaoEscolhida');
    expect(await acoesDa(demandaId)).not.toContain('aprovacao_registrada');
    expect(await aprovacoesDo(decId)).toEqual([]);
  });
});

describe('registrarDecisao: transação (G3.8)', () => {
  it('com a transação de quem chama, o rollback desfaz aprovação, decisão, eventos e status', async () => {
    const { decId, demandaId } = await prepararDec();
    const antes = await acoesDa(demandaId);
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await registrarDecisao(deps, cto, decId, decisaoDe({ statusDecisao: 'arquivada' }), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    await nadaGravado(decId, demandaId, antes);
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
  });

  it('com a transação de quem chama, a vista devolvida já enxerga a decisão', async () => {
    const { decId } = await prepararDec();
    const r = await comTransacao(b.poolApp, (t) => registrarDecisao(deps, cto, decId, aprovarA(), t));
    expect(r.pacote).toMatchObject({ id: decId, statusDecisao: 'aprovada' });
    expect(r.pacote.id).toBe(idVersao('DEC', r.pacote.demandaId, 1));
  });
});
