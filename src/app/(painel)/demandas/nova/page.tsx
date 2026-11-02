// T04 Nova demanda (03, T04). Server Component: a pessoa (C-04), a autorização de `registrar_entrada` (a mesma de POST
// /api/demandas/entrada) e o estado do agente orquestrador (T28), que decide o modo. Com `?entrada=<id>` ("Preencher à
// mão", T03), lê a entrada pendente com `ler_texto_bruto` e abre o formulário com o texto já colado (WCAG 3.3.7); a
// entrada que não existe mais (convertida ou expurgada) dá 404. O texto da entrada só vai ao formulário, nunca ao log.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TEXTOS_DEMANDA } from '../../../../components/dados-da-demanda';
import { obterDeps } from '../../../../lib/deps';
import { ErroDominio } from '../../../../lib/erros';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { estadoDoAgente } from '../../../../modules/agentes/gatilhos';
import { obterEntradaPendente } from '../../../../modules/demandas/entradas-pendentes';
import { FormularioNovaDemanda, type PendenteNoFormulario } from './FormularioNovaDemanda';

export const metadata: Metadata = { title: TEXTOS_DEMANDA.tituloNova };

type Parametros = Record<string, string | string[] | undefined>;

export default async function PaginaNovaDemanda({ searchParams }: { searchParams: Promise<Parametros> }) {
  const parametros = await searchParams;
  const entradaId = typeof parametros.entrada === 'string' ? parametros.entrada : undefined;
  const pessoa = await exigirPessoaNaPagina(entradaId ? `/demandas/nova?entrada=${encodeURIComponent(entradaId)}` : '/demandas/nova');
  autorizar(pessoa, 'registrar_entrada');
  const deps = await obterDeps();

  let pendente: PendenteNoFormulario | null = null;
  if (parametros.entrada !== undefined) {
    if (entradaId === undefined) notFound();
    try {
      const p = await obterEntradaPendente(deps, pessoa, entradaId);
      pendente = {
        id: entradaId,
        texto: p.texto,
        canal: p.origem?.canal ?? '',
        referencia: p.origem?.referencia ?? '',
        solicitanteNome: p.solicitanteNome,
        solicitantePapel: p.solicitantePapel ?? '',
      };
    } catch (e) {
      if (e instanceof ErroDominio && e.codigo === 'nao_encontrado') notFound();
      throw e;
    }
  }
  const estado = await estadoDoAgente(deps.db, 'orquestrador', deps.relogio);

  return (
    <div className="flex flex-col gap-6">
      <h1>{TEXTOS_DEMANDA.tituloNova}</h1>
      <FormularioNovaDemanda estado={estado} pendente={pendente} />
    </div>
  );
}
