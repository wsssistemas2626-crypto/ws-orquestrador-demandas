// T03 Fila de demandas, provisória (T36): só o título, para a moldura ter onde aparecer. A T38 completa.
import type { Metadata } from 'next';
import { exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';

export const metadata: Metadata = { title: 'Demandas' };

export default async function PaginaDemandas() {
  await exigirPessoaNaPagina('/demandas');
  return <h1>Demandas</h1>;
}
