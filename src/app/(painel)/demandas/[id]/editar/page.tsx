// T06 Editar dados da demanda (03, T06). Server Component: a pessoa (C-04), a autorização de `alterar_demanda` (a mesma
// de PATCH /api/demandas/:id), o id pela regex antes de tocar o banco (C-17) e os valores atuais por obterDemanda (sem
// texto bruto). Id fora do formato ou que não existe: 404 (03, 2.8), com o título da aba da 2.8.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../../components/Alerta';
import { TEXTOS_DEMANDA, valoresDaDemanda } from '../../../../../components/dados-da-demanda';
import { exigirPessoaNaPagina } from '../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../modules/acesso/matriz';
import { RE_ID_DEMANDA } from '../../../../../modules/demandas/gerar-id';
import { lerDemandaDaPagina, metadadosDaDemanda } from '../demanda-da-pagina';
import { FormularioEditarDemanda } from './FormularioEditarDemanda';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDaDemanda((await params).id, TEXTOS_DEMANDA.tituloEditar);
}

export default async function PaginaEditarDemanda({ params }: Props) {
  const { id } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEMANDA.test(id) ? `/demandas/${id}/editar` : '/demandas');
  autorizar(pessoa, 'alterar_demanda');
  const d = await lerDemandaDaPagina(id);
  if (!d) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-texto-suave">{d.id}</p>
        <h1>{TEXTOS_DEMANDA.tituloEditar}</h1>
      </div>
      <Alerta tipo="informacao">{TEXTOS_DEMANDA.avisoEdicao}</Alerta>
      <FormularioEditarDemanda id={d.id} inicial={valoresDaDemanda(d)} />
    </div>
  );
}
