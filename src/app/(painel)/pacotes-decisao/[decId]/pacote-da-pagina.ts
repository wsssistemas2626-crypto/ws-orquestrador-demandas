// Leitura do DEC pela página /pacotes-decisao/[decId] (T11). O id passa pela regex de DEC antes de tocar o banco (C-17);
// fora do formato ou inexistente, `null`, e a página responde 404 (03, 2.8). `cache` do React: a página e o
// generateMetadata da mesma requisição leem uma vez só. O título da aba segue a regra de demanda-da-pagina.ts: o
// generateMetadata também chama notFound(), mas só para pessoa com acesso; sem sessão válida, o título não diz se o
// pacote existe.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RE_ID_DEC } from '../../../../components/dados-do-pacote';
import { obterDeps } from '../../../../lib/deps';
import { ErroDominio } from '../../../../lib/erros';
import { exigirPessoa } from '../../../../modules/acesso/exigir-pessoa';
import { obterPacoteDecisao } from '../../../../modules/pacotes-decisao/consultas';

export const lerPacoteDaPagina = cache(async (decId: string) => {
  if (!RE_ID_DEC.test(decId)) return null;
  const deps = await obterDeps();
  try {
    return await obterPacoteDecisao(deps.db, decId);
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') return null;
    throw e;
  }
});

export async function metadadosDoPacote(decId: string, titulo: string): Promise<Metadata> {
  const deps = await obterDeps();
  try {
    await exigirPessoa(deps, await headers());
  } catch (e) {
    if (e instanceof ErroDominio) return { title: titulo };
    throw e;
  }
  if (!(await lerPacoteDaPagina(decId))) notFound();
  return { title: titulo };
}
