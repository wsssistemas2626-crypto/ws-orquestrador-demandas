// Não encontrado da T10 (03, T10, Erro: 404 "Versão não encontrada."): id de ESP fora do formato ou que não existe.
// Dentro da moldura do painel, com o texto da 2.8 e "Voltar para a fila". Só texto fixo; sem dado nenhum.
import type { Metadata } from 'next';
import Link from 'next/link';
import { classeDoBotao } from '../../../../components/Botao';
import { TEXTOS_ESP } from '../../../../components/dados-da-especificacao';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../../lib/erros';

export const metadata: Metadata = { title: TEXTOS_ESP.versaoNaoEncontrada };

export default function VersaoNaoEncontrada() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1>{TEXTOS_ESP.versaoNaoEncontrada}</h1>
      <p>{MENSAGEM_NAO_ENCONTRADO}</p>
      <Link href="/demandas" className={`${classeDoBotao('primario')} no-underline`}>
        Voltar para a fila
      </Link>
    </div>
  );
}
