// Registro e leitura do histórico (RF-21, CA-21.3, CA-02.4, C-09, C-30) contra o Postgres real, com o papel do app.
// Dados só fictícios; o relógio é sempre o fixo.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../acesso/ator';
import { listarHistorico } from './consultas';
import { mudancaDeCampo, registrarEvento } from './registrar';

const DEMANDA = 'DEM-20261022-0001';
const OUTRA = 'DEM-20261022-0002';
const PREFIXO = 'Ab3dE5gH';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-hist-cto', nome: 'Pessoa Ficticia Um', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-hist-adm', nome: 'Pessoa Ficticia Dois', papel: 'administradora' };
const agente: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: PREFIXO };
const agenteSemToken: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: null };
const sistema: AtorSistema = { tipo: 'sistema' };

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
  // O nome e o papel que o histórico mostra vêm de `user`; o nome gravado no ator não é o que vale.
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: 'Pessoa Ficticia Um', email: 'hist-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: 'Pessoa Ficticia Dois', email: 'hist-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  await b.poolMigrator.query('truncate evento');
});

describe('registrarEvento', () => {
  it('pessoa: ator_id é o usuarioId, sem prefixo de token, e a data vem do Relogio', async () => {
    const relogio = relogioFixo('2026-10-22T09:15:00-03:00');
    await registrarEvento(b.db, { ator: cto, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'demanda_criada' }, relogio);
    const [linha] = await b.db.select().from(evento);
    expect(linha).toEqual({
      id: expect.any(Number),
      ocorridoEm: new Date('2026-10-22T12:15:00Z'),
      atorTipo: 'pessoa',
      atorId: cto.usuarioId,
      atorTokenPrefixo: null,
      demandaId: DEMANDA,
      entidade: 'demanda',
      entidadeId: DEMANDA,
      acao: 'demanda_criada',
      antes: null,
      depois: null,
    });
  });

  it('CA-02.4 e C-09: agente grava o nome do agente em ator_id e o prefixo do token em ator_token_prefixo', async () => {
    await registrarEvento(b.db, { ator: agente, demandaId: DEMANDA, entidade: 'parecer_risco', entidadeId: `RSK-${DEMANDA}-v1`, acao: 'parecer_risco_criado' }, relogioFixo('2026-10-22T12:00:00Z'));
    const [linha] = await b.db.select().from(evento);
    expect(linha).toMatchObject({ atorTipo: 'agente', atorId: 'risco', atorTokenPrefixo: PREFIXO });
  });

  it('agente sem token (job do worker) grava prefixo nulo', async () => {
    await registrarEvento(b.db, { ator: agenteSemToken, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'falha_agente' }, relogioFixo('2026-10-22T12:00:00Z'));
    const [linha] = await b.db.select().from(evento);
    expect(linha).toMatchObject({ atorTipo: 'agente', atorId: 'orquestrador', atorTokenPrefixo: null });
  });

  it('sistema grava ator_id "sistema"; evento sem demanda fica com demanda_id nulo', async () => {
    await registrarEvento(b.db, { ator: sistema, entidade: 'configuracao_ia', entidadeId: 'teto', acao: 'suspensao_por_teto' }, relogioFixo('2026-10-22T12:00:00Z'));
    const [linha] = await b.db.select().from(evento);
    expect(linha).toMatchObject({ atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null, demandaId: null, antes: null, depois: null });
  });

  it('grava antes e depois em jsonb, como recebidos', async () => {
    const m = mudancaDeCampo('status', 'nova', 'em_analise');
    await registrarEvento(b.db, { ator: cto, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'status_alterado', ...m }, relogioFixo('2026-10-22T12:00:00Z'));
    const [linha] = await b.db.select().from(evento);
    expect(linha).toMatchObject({ antes: { status: 'nova' }, depois: { status: 'em_analise' } });
  });

  it('dentro de uma transação desfeita, o evento não fica (aceita a transação de quem chama)', async () => {
    await expect(
      comTransacao(b.poolApp, async ({ tx }) => {
        await registrarEvento(tx, { ator: cto, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'demanda_criada' }, relogioFixo('2026-10-22T12:00:00Z'));
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await b.db.select().from(evento)).toEqual([]);
  });
});

describe('listarHistorico', () => {
  const registrar = (ator: AtorPessoa | AtorAgente | AtorSistema, iso: string, acao: Parameters<typeof registrarEvento>[1]['acao'], demandaId = DEMANDA) =>
    registrarEvento(b.db, { ator, demandaId, entidade: 'demanda', entidadeId: demandaId, acao }, relogioFixo(iso));

  it('RF-21: do mais novo para o mais antigo, com pessoa (nome e papel), agente sem prefixo e sistema', async () => {
    await registrar(cto, '2026-10-22T12:00:00Z', 'demanda_criada');
    await registrar(agente, '2026-10-22T12:05:00Z', 'parecer_risco_criado');
    await registrar(sistema, '2026-10-22T12:10:00Z', 'texto_expurgado');
    await registrar(administradora, '2026-10-22T12:15:00Z', 'aprovacao_registrada');

    const h = await listarHistorico(b.db, DEMANDA);
    expect(h.map((e) => e.acao)).toEqual(['aprovacao_registrada', 'texto_expurgado', 'parecer_risco_criado', 'demanda_criada']);
    expect(h.map((e) => e.ator)).toEqual([
      { tipo: 'pessoa', nome: 'Pessoa Ficticia Dois', papel: 'administradora' },
      { tipo: 'sistema' },
      { tipo: 'agente', agente: 'risco' },
      { tipo: 'pessoa', nome: 'Pessoa Ficticia Um', papel: 'cto' },
    ]);
    expect(h[0]).toEqual({
      id: expect.any(Number),
      ocorridoEm: new Date('2026-10-22T12:15:00Z'),
      ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia Dois', papel: 'administradora' },
      entidade: 'demanda',
      entidadeId: DEMANDA,
      acao: 'aprovacao_registrada',
      antes: null,
      depois: null,
    });
  });

  it('C-09: o prefixo do token fica na coluna, mas não sai na leitura', async () => {
    await registrar(agente, '2026-10-22T12:05:00Z', 'parecer_risco_criado');
    const [linha] = await b.db.select().from(evento).where(eq(evento.demandaId, DEMANDA));
    expect(linha!.atorTokenPrefixo).toBe(PREFIXO);
    const h = await listarHistorico(b.db, DEMANDA);
    expect(JSON.stringify(h)).not.toContain(PREFIXO);
  });

  it('a leitura não traz o id interno da pessoa', async () => {
    await registrar(cto, '2026-10-22T12:00:00Z', 'demanda_criada');
    expect(JSON.stringify(await listarHistorico(b.db, DEMANDA))).not.toContain(cto.usuarioId);
  });

  it('o nome e o papel vêm da conta, e não do que o ator trazia', async () => {
    await registrar({ ...cto, nome: 'Outro Nome Ficticio' }, '2026-10-22T12:00:00Z', 'demanda_criada');
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toEqual({ tipo: 'pessoa', nome: 'Pessoa Ficticia Um', papel: 'cto' });
  });

  it('só os eventos da demanda pedida', async () => {
    await registrar(cto, '2026-10-22T12:00:00Z', 'demanda_criada');
    await registrar(cto, '2026-10-22T12:01:00Z', 'demanda_criada', OUTRA);
    await registrarEvento(b.db, { ator: sistema, entidade: 'configuracao_ia', entidadeId: 'teto', acao: 'suspensao_por_teto' }, relogioFixo('2026-10-22T12:02:00Z'));
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h).toHaveLength(1);
    expect(h[0]!.entidadeId).toBe(DEMANDA);
  });

  it('eventos no mesmo instante saem do último gravado para o primeiro', async () => {
    await registrar(cto, '2026-10-22T12:00:00Z', 'demanda_criada');
    await registrar(cto, '2026-10-22T12:00:00Z', 'status_alterado');
    await registrar(cto, '2026-10-22T12:00:00Z', 'campo_alterado');
    expect((await listarHistorico(b.db, DEMANDA)).map((e) => e.acao)).toEqual(['campo_alterado', 'status_alterado', 'demanda_criada']);
  });

  it('evento de pessoa cuja conta não existe continua no histórico, com nome e papel nulos', async () => {
    await registrar({ tipo: 'pessoa', usuarioId: 'u-hist-inexistente', nome: 'Pessoa Ficticia Tres', papel: 'cto' }, '2026-10-22T12:00:00Z', 'demanda_criada');
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toEqual({ tipo: 'pessoa', nome: null, papel: null });
  });

  it('demanda sem eventos devolve lista vazia', async () => {
    expect(await listarHistorico(b.db, 'DEM-20261022-0099')).toEqual([]);
  });
});
