'use client';

// Conteúdo da seção "Confirmação do Awave" da T05 (T18 do DEC-DEM-20261111-0016-v1; RF-06 na tela, CA-06.7; 03, 5.3, 5.4
// e seção 10), no molde de MudarStatus.tsx. O estado chega pronto da página (estadoDaConfirmacao, só do histórico, D-06):
// a tela não decide quem pode confirmar nem o que a confirmação faz; quem decide é o servidor (confirmarDemandaNoPainel).
//   - Aguardando: os três parágrafos da 03, o segundo ligado ao botão por aria-describedby, e "Confirmar demanda", sem
//     diálogo (P-01). Durante o envio, "Confirmando…", desabilitado, e o conteúdo com aria-busy.
//   - Sucesso (também a repetição idempotente): "Demanda confirmada." na região de aviso, o foco no h2 da seção e a página
//     lida de novo no servidor, que passa a seção a "Confirmada" e tira o selo. A resposta não diz se o agente de insumo
//     foi acionado (parecer 3 da 06-T08-revisao), e a tela não afirma isso: o que vem depois é a regra de hoje.
//   - Erro: Alerta com "Não foi possível concluir: " (errosDoResultado), que recebe o foco; o botão volta.
//   - Confirmada e final sem confirmação: só texto, sem botão. A região de aviso fica montada em todo estado, para o
//     anúncio não se perder quando o botão some depois da nova leitura.
// O nome da pessoa e as datas são só texto (C-18).
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { Botao } from '../../../../components/Botao';
import { TEXTOS_CONFIRMACAO } from '../../../../components/dados-da-confirmacao';
import { errosDoResultado } from '../../../../components/formulario';
import { RegiaoAviso } from '../../../../components/RegiaoAviso';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import { confirmarDemandaNoPainel } from './acoes';
import { ID_SECAO } from './detalhe';

// O parágrafo da consequência (03, 5.4, P2), que o botão cita por aria-describedby (03, seção 10).
export const ID_CONSEQUENCIA = 'confirmacao-consequencia';

// O que a página passa: o estado de estadoDaConfirmacao já em texto (data formatada no fuso do sistema, ISO para o
// <time>, rótulo do status), para o navegador não formatar nada.
export type SecaoDaConfirmacao =
  | { tipo: 'aguardando' }
  | { tipo: 'confirmada'; ator: string; data: string; iso: string }
  | { tipo: 'final_sem_confirmacao'; status: string };

type Props = { id: string; estado: SecaoDaConfirmacao };

// "Confirmada por <ator> em <data>." com a data dentro de <time>: o texto é o da constante, e a data é a do fim da frase
// (lastIndexOf), mesmo que o nome da conta contenha o mesmo texto.
function Confirmada({ ator, data, iso }: { ator: string; data: string; iso: string }) {
  const frase = TEXTOS_CONFIRMACAO.confirmada(ator, data);
  const i = frase.lastIndexOf(data);
  return (
    <>
      <p>
        {frase.slice(0, i)}
        <time dateTime={iso}>{data}</time>
        {frase.slice(i + data.length)}
      </p>
      <p>{TEXTOS_CONFIRMACAO.depois}</p>
    </>
  );
}

export function ConfirmarDemanda({ id, estado }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const alertaDeEnvio = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alerta) alertaDeEnvio.current?.focus();
  }, [alerta]);

  // Depois da nova leitura, o botão some: se o foco caiu no corpo da página, ele volta ao título da seção.
  useEffect(() => {
    if (aviso && estado.tipo !== 'aguardando' && document.activeElement === document.body)
      document.getElementById(ID_SECAO.confirmacao)?.focus();
  }, [aviso, estado.tipo]);

  async function confirmar() {
    if (enviando) return;
    setAlerta(null);
    setAviso('');
    setEnviando(true);
    try {
      const r = await confirmarDemandaNoPainel({ id });
      if (r.ok) {
        setAviso(TEXTOS_CONFIRMACAO.sucesso);
        document.getElementById(ID_SECAO.confirmacao)?.focus();
        router.refresh();
        return;
      }
      setAlerta(errosDoResultado(r).alerta ?? r.mensagem);
    } catch {
      setAlerta(MENSAGEM_ERRO_INTERNO);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RegiaoAviso visivel={aviso !== ''}>{aviso}</RegiaoAviso>
      {estado.tipo === 'aguardando' ? (
        <div aria-busy={enviando} className="flex flex-col items-start gap-4">
          <p>{TEXTOS_CONFIRMACAO.aguardando}</p>
          <p id={ID_CONSEQUENCIA}>{TEXTOS_CONFIRMACAO.consequencia}</p>
          <p>{TEXTOS_CONFIRMACAO.orientacao}</p>
          {alerta ? (
            <div ref={alertaDeEnvio} tabIndex={-1} className="self-stretch">
              <Alerta tipo="erro" envio>
                {alerta}
              </Alerta>
            </div>
          ) : null}
          <Botao
            aria-describedby={ID_CONSEQUENCIA}
            carregando={enviando}
            textoCarregando={TEXTOS_CONFIRMACAO.enviando}
            onClick={confirmar}
            className="max-md:w-full"
          >
            {TEXTOS_CONFIRMACAO.botao}
          </Botao>
        </div>
      ) : estado.tipo === 'confirmada' ? (
        <Confirmada ator={estado.ator} data={estado.data} iso={estado.iso} />
      ) : (
        <p>{TEXTOS_CONFIRMACAO.finalSem(estado.status)}</p>
      )}
    </div>
  );
}
