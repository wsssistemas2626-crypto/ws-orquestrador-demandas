// Testes da 06-T12-testes (qa-automacao): os critérios da T12 conferidos pela leitura do histórico, contra o Postgres
// real e com o papel do app (CA-06.4, CA-02.4, CA-21.3, C-30). Dados só fictícios; o relógio é sempre o fixo.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { contemSentinela, SENTINELAS } from '../../../test/sentinelas';
import { demanda, entradaBruta, evento, user } from '../../db/schema';
import { relogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../acesso/ator';
import { listarHistorico } from './consultas';
import { CAMPOS_TEXTO_LIVRE, mudancaDeCampo, registrarEvento } from './registrar';

const DEMANDA = 'DEM-20261022-0001';
const PREFIXO = 'Qa7kP2mX';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-hist-qa-cto', nome: 'Pessoa Ficticia Qa', papel: 'cto' };
const sistema: AtorSistema = { tipo: 'sistema' };

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values({ id: cto.usuarioId, name: 'Pessoa Ficticia Qa', email: 'hist-qa-cto@exemplo.test', papel: 'cto' });
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  await b.poolMigrator.query('truncate evento');
});

describe('listarHistorico: critérios da T12', () => {
  it('CA-06.4: a mudança de linhaServicoProvavel sai na leitura com antes, depois, a pessoa e a data e hora', async () => {
    const m = mudancaDeCampo('linhaServicoProvavel', 'indefinida', 'automacao_integracao');
    await registrarEvento(
      b.db,
      { ator: cto, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'campo_alterado', ...m },
      relogioFixo('2026-10-22T14:05:00-03:00'),
    );
    expect(await listarHistorico(b.db, DEMANDA)).toEqual([
      {
        id: expect.any(Number),
        ocorridoEm: new Date('2026-10-22T17:05:00Z'),
        ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia Qa', papel: 'cto' },
        entidade: 'demanda',
        entidadeId: DEMANDA,
        acao: 'campo_alterado',
        antes: { linhaServicoProvavel: 'indefinida' },
        depois: { linhaServicoProvavel: 'automacao_integracao' },
      },
    ]);
  });

  it('CA-02.4: artefato criado pelo agente insumo_tecnico sai como agente insumo_tecnico, não como pessoa', async () => {
    const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: PREFIXO };
    await registrarEvento(
      b.db,
      { ator: insumo, demandaId: DEMANDA, entidade: 'especificacao_tecnica', entidadeId: `ESP-${DEMANDA}-v1`, acao: 'especificacao_criada' },
      relogioFixo('2026-10-22T12:00:00Z'),
    );
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toEqual({ tipo: 'agente', agente: 'insumo_tecnico' });
    expect(JSON.stringify(e)).not.toContain(PREFIXO);
  });

  it('CA-21.3 e C-30: demanda com texto bruto e campos de texto livre alterados; nada disso aparece no histórico', async () => {
    const id = 'DEM-20261022-0003';
    const relogio = relogioFixo('2026-10-22T12:00:00Z');
    const textoBruto = `De: ${SENTINELAS.nome} <${SENTINELAS.email}>\n${SENTINELAS.texto} ${SENTINELAS.telefone}`;
    await b.db.insert(demanda).values({
      id,
      titulo: SENTINELAS.texto,
      tipo: 'bug',
      solicitanteNome: SENTINELAS.nome,
      contexto: SENTINELAS.email,
      autorTipo: 'pessoa',
      autorId: cto.usuarioId,
      criadaEm: relogio.agora(),
      atualizadaEm: relogio.agora(),
    });
    await b.db
      .insert(entradaBruta)
      .values({ demandaId: id, texto: textoBruto, origem: { canal: 'email', referencia: SENTINELAS.email }, recebidaEm: relogio.agora() });

    await registrarEvento(b.db, { ator: cto, demandaId: id, entidade: 'demanda', entidadeId: id, acao: 'demanda_criada' }, relogio);
    for (const campo of CAMPOS_TEXTO_LIVRE) {
      relogio.avancar(60_000);
      const m = mudancaDeCampo(campo, textoBruto, `${SENTINELAS.texto} ${SENTINELAS.nome} ${SENTINELAS.email} ${SENTINELAS.telefone}`);
      await registrarEvento(b.db, { ator: cto, demandaId: id, entidade: 'demanda', entidadeId: id, acao: 'campo_alterado', ...m }, relogio);
    }
    relogio.avancar(60_000);
    await registrarEvento(b.db, { ator: sistema, demandaId: id, entidade: 'entrada_bruta', entidadeId: id, acao: 'texto_expurgado' }, relogio);

    const h = await listarHistorico(b.db, id);
    expect(h).toHaveLength(2 + CAMPOS_TEXTO_LIVRE.size);
    expect(contemSentinela(JSON.stringify(h))).toBe(false);
    // A coluna gravada também não tem o texto: o histórico não é expurgado, então não pode guardá-lo (C-30).
    expect(contemSentinela(JSON.stringify(await b.db.select().from(evento).where(eq(evento.demandaId, id))))).toBe(false);
    // Controle do teste: o texto bruto está de fato no banco, na tabela própria.
    const [bruta] = await b.db.select().from(entradaBruta).where(eq(entradaBruta.demandaId, id));
    expect(bruta!.texto).toContain(SENTINELAS.texto);
  });
});
