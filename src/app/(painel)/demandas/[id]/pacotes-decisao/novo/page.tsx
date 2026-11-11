// T09 Novo pacote de decisão (03, T09; RF-10, RF-19). Server Component: a pessoa (C-04), a autorização de
// `criar_pacote_decisao` (a mesma de POST /api/demandas/:id/pacotes-decisao) e o id pela regex antes de tocar o banco
// (C-17). Id fora do formato ou que não existe: 404 (03, 2.8). Sem ESP ou sem RSK, a tela abre sem formulário, com o que
// falta e o botão de cada um. Com os dois, a informação das versões que o pacote vai citar (as mais novas) e o
// formulário em branco: cada pacote é uma proposta nova (03, T09, Vazio).
// 0.2.0 (T15; 03, 8.2 do pedido 0015): a tela tem até 760 px de largura (`max-w-190`), com o formulário em cartões.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../../../components/Alerta';
import { classeDoBotao } from '../../../../../../components/Botao';
import { faltaParaCriar, TEXTOS_DEC, valoresDoPacote } from '../../../../../../components/dados-do-pacote';
import { exigirPessoaNaPagina } from '../../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import { RE_ID_DEMANDA } from '../../../../../../modules/demandas/gerar-id';
import { idVersao } from '../../../../../../modules/versoes';
import { lerDemandaDaPagina, metadadosDaDemanda } from '../../demanda-da-pagina';
import { FormularioPacote } from './FormularioPacote';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDaDemanda((await params).id, TEXTOS_DEC.tituloNovo);
}

export default async function PaginaNovoPacote({ params }: Props) {
  const { id } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEMANDA.test(id) ? `/demandas/${id}/pacotes-decisao/novo` : '/demandas');
  autorizar(pessoa, 'criar_pacote_decisao');
  const d = await lerDemandaDaPagina(id);
  if (!d) notFound();

  const falta = faltaParaCriar(d, d.id);
  const idNovo = idVersao('DEC', d.id, (d.pacotesDecisao[0]?.versao ?? 0) + 1);
  const esp = d.especificacoes[0]?.id;
  const rsk = d.pareceresRisco[0]?.id;

  return (
    <div className="flex max-w-190 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="break-words">
          <span className="font-mono">{d.id}</span>
          {` — ${d.titulo}`}
        </p>
        <h1>{TEXTOS_DEC.tituloNovo}</h1>
      </div>
      {falta || !esp || !rsk ? (
        <Alerta tipo="atencao" className="flex flex-col items-start gap-3">
          <p>{falta?.texto}</p>
          <div className="flex flex-wrap gap-3">
            {falta?.botoes.map((b) => (
              <Link key={b.href} href={b.href} className={classeDoBotao('secundario')}>
                {b.rotulo}
              </Link>
            ))}
          </div>
        </Alerta>
      ) : (
        <>
          <Alerta tipo="informacao">
            <p>{TEXTOS_DEC.infoProxima(idNovo, esp, rsk)}</p>
          </Alerta>
          <FormularioPacote demandaId={d.id} idNovo={idNovo} inicial={valoresDoPacote()} />
        </>
      )}
    </div>
  );
}
