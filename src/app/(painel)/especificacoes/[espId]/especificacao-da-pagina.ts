// Leitura da ESP pela página /especificacoes/[espId] (T10). O id passa pela regex de ESP antes de tocar o banco (C-17);
// fora do formato ou inexistente, `null`, e a página responde 404. `cache` do React: a página e o generateMetadata da
// mesma requisição leem uma vez só. O título da aba segue a regra de demanda-da-pagina.ts: o generateMetadata também
// chama notFound(), mas só para pessoa com acesso; sem sessão válida, o título não diz se a versão existe.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RE_ID_ESP } from '../../../../components/dados-da-especificacao';
import { obterDeps } from '../../../../lib/deps';
import { ErroDominio } from '../../../../lib/erros';
import { exigirPessoa } from '../../../../modules/acesso/exigir-pessoa';
import { obterEspecificacao, type EspecificacaoVista } from '../../../../modules/especificacoes/consultas';

export const lerEspecificacaoDaPagina = cache(async (espId: string): Promise<(EspecificacaoVista & { versaoMaisNova: string }) | null> => {
  if (!RE_ID_ESP.test(espId)) return null;
  const deps = await obterDeps();
  try {
    return await obterEspecificacao(deps.db, espId);
  } catch (e) {
    if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') return null;
    throw e;
  }
});

export async function metadadosDaEspecificacao(espId: string, titulo: string): Promise<Metadata> {
  const deps = await obterDeps();
  try {
    await exigirPessoa(deps, await headers());
  } catch (e) {
    if (e instanceof ErroDominio) return { title: titulo };
    throw e;
  }
  if (!(await lerEspecificacaoDaPagina(espId))) notFound();
  return { title: titulo };
}
