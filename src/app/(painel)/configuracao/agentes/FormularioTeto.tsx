'use client';

// "Teto mensal de gasto (US$)" da T12 (03, T12 e 2.5; RF-18; P1-f). Validação ao enviar: a do navegador espelha a do
// servidor (validarTeto), e a que vale é a da Server Action (definirTetoSchema). Com erro, o Resumo de erros recebe o
// foco, o campo fica com aria-invalid e a mensagem abaixo dele; o que foi digitado fica. Salvo, "Teto salvo: US$ 10,00."
// vai à região de aviso e a página relê o gasto e o alerta do servidor. Para a administradora, campo e botão aparecem
// desabilitados, com o valor legível (C-12, C-26: a API decide). Sair com o valor mudado e não salvo pede confirmação.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { Botao } from '../../../../components/Botao';
import { useConfirmarSaida } from '../../../../components/CamposDaDemanda';
import { CampoTexto } from '../../../../components/CampoTexto';
import { errosDoTeto, errosLocaisDoTeto, ID_CAMPO_TETO, TEXTOS_AGENTES, validarTeto, valorDoTeto } from '../../../../components/dados-dos-agentes';
import type { ErrosDoFormulario } from '../../../../components/formulario';
import { ResumoErros } from '../../../../components/ResumoErros';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import { salvarTetoNoPainel } from './acoes';
import { useAviso } from './AvisoDaTela';

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };

type Props = { tetoMensal: number; podeAlterar: boolean };

export function FormularioTeto({ tetoMensal, podeAlterar }: Props) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const { avisar, limpar } = useAviso();
  const [valor, setValor] = useState(() => valorDoTeto(tetoMensal));
  const [salvo, setSalvo] = useState(() => valorDoTeto(tetoMensal));
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo } = useConfirmarSaida(podeAlterar && valor.trim() !== salvo);
  const t = TEXTOS_AGENTES;

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando || !podeAlterar) return;
    limpar();
    const local = validarTeto(valor);
    if (local) {
      setErros(errosLocaisDoTeto(local));
      return;
    }
    setEnviando(true);
    try {
      const r = await salvarTetoNoPainel({ tetoMensal: valor });
      if (r.ok) {
        const gravado = valorDoTeto(r.dados.tetoMensal);
        setValor(gravado);
        setSalvo(gravado);
        setErros(SEM_ERROS);
        avisar(t.tetoSalvo(r.dados.tetoMensal));
        // O gasto do mês, o alerta do teto e o aviso da moldura vêm do servidor.
        iniciarTransicao(() => router.refresh());
      } else {
        setErros(errosDoTeto(r));
      }
    } catch {
      setErros({ ...SEM_ERROS, alerta: MENSAGEM_ERRO_INTERNO });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <ResumoErros erros={erros.campos} />
      {erros.alerta ? (
        <div ref={alertaDeEnvio} tabIndex={-1}>
          <Alerta tipo="erro" envio>
            {erros.alerta}
          </Alerta>
        </div>
      ) : null}
      <form noValidate onSubmit={enviar} aria-busy={enviando} className="flex flex-col items-start gap-4">
        <CampoTexto
          id={ID_CAMPO_TETO}
          rotulo={t.rotuloTeto}
          dica={t.dicaTeto}
          erro={erros.porCampo.tetoMensal}
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          disabled={!podeAlterar}
          className="w-full max-w-xs"
        />
        <Botao type="submit" carregando={enviando} textoCarregando={t.salvando} disabled={!podeAlterar}>
          {t.salvarTeto}
        </Botao>
      </form>
      {dialogo}
    </>
  );
}
