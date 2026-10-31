// Leitura da demanda pelas páginas de /demandas/[id] (T05 e T06). O id passa pela regex antes de tocar o banco (C-17);
// fora do formato ou inexistente, `null`, e a página responde 404 (03, 2.8). `cache` do React: a página e o
// generateMetadata da mesma requisição leem uma vez só.
//
// Título da aba: com notFound() só na página, o Next mantém o título da página no 404 ("Detalhe da demanda"), e não o
// da 2.8. Por isso o generateMetadata também chama notFound(), mas só para pessoa com acesso: sem sessão válida, a página
// leva a /entrar, e o título não diz se o id existe.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { obterDeps } from '../../../../lib/deps';
import { ErroDominio } from '../../../../lib/erros';
import { exigirPessoa } from '../../../../modules/acesso/exigir-pessoa';
import { obterDemanda, type DemandaVista } from '../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../modules/demandas/gerar-id';

export const lerDemandaDaPagina = cache(async (id: string): Promise<DemandaVista | null> => {
  if (!RE_ID_DEMANDA.test(id)) return null;
  const deps = await obterDeps();
  try {
    return await obterDemanda(deps.db, id);
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') return null;
    throw e;
  }
});

export async function metadadosDaDemanda(id: string, titulo: string): Promise<Metadata> {
  const deps = await obterDeps();
  try {
    await exigirPessoa(deps, await headers());
  } catch (e) {
    if (e instanceof ErroDominio) return { title: titulo };
    throw e;
  }
  if (!(await lerDemandaDaPagina(id))) notFound();
  return { title: titulo };
}
