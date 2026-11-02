// Leitura do RSK pela página /pareceres-risco/[rskId] (T10). O id passa pela regex de RSK antes de tocar o banco (C-17);
// fora do formato ou inexistente, `null`, e a página responde 404. `cache` do React: a página e o generateMetadata da
// mesma requisição leem uma vez só. O título da aba segue a regra de demanda-da-pagina.ts: o generateMetadata também
// chama notFound(), mas só para pessoa com acesso; sem sessão válida, o título não diz se a versão existe.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RE_ID_RSK } from '../../../../components/dados-do-parecer';
import { obterDeps } from '../../../../lib/deps';
import { ErroDominio } from '../../../../lib/erros';
import { exigirPessoa } from '../../../../modules/acesso/exigir-pessoa';
import { obterParecerRisco } from '../../../../modules/pareceres-risco/consultas';

export const lerParecerDaPagina = cache(async (rskId: string) => {
  if (!RE_ID_RSK.test(rskId)) return null;
  const deps = await obterDeps();
  try {
    return await obterParecerRisco(deps.db, rskId);
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') return null;
    throw e;
  }
});

export async function metadadosDoParecer(rskId: string, titulo: string): Promise<Metadata> {
  const deps = await obterDeps();
  try {
    await exigirPessoa(deps, await headers());
  } catch (e) {
    if (e instanceof ErroDominio) return { title: titulo };
    throw e;
  }
  if (!(await lerParecerDaPagina(rskId))) notFound();
  return { title: titulo };
}
