// src/modules/andamento/registrar-prazo.test.ts — T07 do DEC-DEM-20261111-0017-v1, AN-06 (lição da 0019): o registro do
// andamento roda com o orçamento `padrao` e o prazo total de 8 s, e o piso (5 s e 2 s) nunca passa por cima do restante.
// Banco próprio, com um gatilho só deste banco de teste que guarda o statement_timeout e o lock_timeout em vigor no
// INSERT do andamento. O relógio monotônico (performance.now) é movido por vi.spyOn, como em prazo-total-0019.test.ts.
// Postgres real, papel do app, relógio fixo, dados fictícios.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { corpo, retratoDa } from '../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao } from '../../../test/integracoes';
import { preparadorDePedidos } from '../../../test/pedidos-construcao';
import { criarPool } from '../../db';
import type { Deps } from '../../lib/deps';
import { relogioFixo } from '../../lib/relogio';
import { MENSAGEM_INDISPONIVEL } from '../integracoes/tempo-limite';
import { registrarAndamento } from './registrar';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
const construir = atorDeIntegracao('construir');

let b: BancoDeTeste;
let deps: Deps;
let decId: string;
let demandaId: string;
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'registrar-prazo',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

// O statement_timeout e o lock_timeout em vigor, em milissegundos (o Postgres mostra '1s', '993ms', '0'...).
const UNIDADES: Readonly<Record<string, number>> = { ms: 1, s: 1_000, min: 60_000 };
function emMs(v: string): number {
  const m = /^(\d+)(ms|s|min)?$/.exec(v);
  if (!m) throw new Error('tempo-limite em formato inesperado');
  return Number(m[1]) * (m[2] ? UNIDADES[m[2]]! : 1);
}

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  ({ decId, demandaId } = await preparador.prepararDec());
  // Gatilho só deste banco de teste: guarda o statement_timeout e o lock_timeout em vigor no INSERT do andamento.
  await b.poolMigrator.query(`create table prazo_visto (stmt text, lock text)`);
  await b.poolMigrator.query(
    `create function registrar_prazo() returns trigger language plpgsql security definer as $$ begin insert into prazo_visto values (current_setting('statement_timeout'), current_setting('lock_timeout')); return new; end $$`,
  );
  await b.poolMigrator.query(`create trigger andamento_prazo before insert on andamento_construcao for each row execute function registrar_prazo()`);
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('AN-06: prazo total do registro, sem piso por cima', () => {
  it('(a) 7 s gastos na espera pela conexão: no INSERT, statement_timeout e lock_timeout ≤ 1 s, nunca 5 s nem 2 s', async () => {
    await b.poolMigrator.query(`delete from prazo_visto`);
    const pool = criarPool(b.urlApp, { max: 1 });
    const segura = await pool.connect();
    try {
      // Relógio parado: nada de tempo corre entre as instruções, e o resultado não depende da velocidade da máquina.
      let agora = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => agora);
      const pendente = registrarAndamento({ pool, relogio }, construir, decId, corpo());
      agora = 7_000;
      segura.release();
      await pendente;
      const vistos = (await b.poolMigrator.query<{ stmt: string; lock: string }>(`select stmt, lock from prazo_visto`)).rows;
      expect(vistos).toHaveLength(1);
      expect(emMs(vistos[0]!.stmt)).toBeLessThanOrEqual(1_000);
      expect(emMs(vistos[0]!.lock)).toBeLessThanOrEqual(1_000);
      expect(emMs(vistos[0]!.stmt)).toBeGreaterThan(0);
    } finally {
      await pool.end();
    }
  });

  it('(b) o relógio monotônico passa de 8 s no meio: 503 indisponivel e nada gravado', async () => {
    let agora = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => (agora += 1_000));
    const antes = await retratoDa(b, demandaId);
    await expect(registrarAndamento(deps, construir, decId, corpo({ fase: 'testando' }))).rejects.toMatchObject({
      codigo: 'indisponivel',
      mensagem: MENSAGEM_INDISPONIVEL,
    });
    expect(await retratoDa(b, demandaId)).toEqual(antes);
  });
});
