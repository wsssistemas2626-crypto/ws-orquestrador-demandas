// Id da demanda (RF-04, RNF-09): DEM-AAAAMMDD-NNNN, com a data civil de São Paulo e a sequência global `demanda_seq`
// (4 dígitos, sem reinício diário nem ciclo). C-36: quem cria a demanda chama proximoIdDemanda só depois de validar a
// entrada, dentro da transação que grava; o nextval gasto numa transação desfeita não volta (buraco na sequência é
// aceito, repetição não).
import { count, sql } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda } from '../../db/schema';
import { ErroDominio } from '../../lib/erros';
import { aaaammddSaoPaulo } from '../../lib/fuso';
import { reduzirErro } from '../../lib/reduzir-erro';
import type { Relogio } from '../../lib/relogio';

// A mesma regex do parâmetro de caminho em rota() (G3.10); o teste confere que as duas não se afastam.
export const RE_ID_DEMANDA = /^DEM-\d{8}-\d{4}$/;

// RNF-09: a partir daqui o painel avisa que a capacidade de ids está perto do fim.
export const LIMITE_AVISO_CAPACIDADE = 9000;

// 2200H (sequence_generator_limit_exceeded): o nextval passou do maxValue 9999 de demanda_seq.
const SEQUENCIA_ESGOTADA = '2200H';

export async function proximoIdDemanda(tx: Db, relogio: Relogio): Promise<string> {
  let n: string | number | undefined;
  try {
    const r = await tx.execute<{ n: string }>(sql`select nextval('demanda_seq') as n`);
    n = r.rows[0]?.n;
  } catch (e) {
    if (reduzirErro(e).code === SEQUENCIA_ESGOTADA)
      throw new ErroDominio(
        'capacidade_de_ids_esgotada',
        'Não é possível criar a demanda: o limite de 9.999 ids foi atingido. Avise o time técnico.',
      );
    throw e;
  }
  if (n === undefined) throw new Error('nextval sem resultado');
  return `DEM-${aaaammddSaoPaulo(relogio.agora())}-${String(n).padStart(4, '0')}`;
}

export async function totalDeDemandas(db: Db): Promise<number> {
  const [linha] = await db.select({ n: count() }).from(demanda);
  return linha?.n ?? 0;
}
