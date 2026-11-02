'use client';

// T06 Editar dados da demanda (03, T06; RF-06): os campos de T04 (Solicitante, Classificação, Descrição e Anexos),
// preenchidos com os valores atuais. Não edita status (fica em T05) nem texto recebido. Vai ao servidor só o que mudou;
// sem mudança, o servidor responde "Nada foi alterado.". Validação, resumo de erros e confirmação ao sair como em T04.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alerta } from '../../../../../components/Alerta';
import { Botao, classeDoBotao } from '../../../../../components/Botao';
import { CamposDaDemanda, useConfirmarSaida } from '../../../../../components/CamposDaDemanda';
import {
  AVISO_DEMANDA,
  errosDaApi,
  errosLocais,
  estaSujo,
  mudancasDaEdicao,
  textoVazio,
  validarDemanda,
  type ValoresDaDemanda,
} from '../../../../../components/dados-da-demanda';
import type { ErrosDoFormulario } from '../../../../../components/formulario';
import { ResumoErros } from '../../../../../components/ResumoErros';
import { MENSAGEM_ERRO_INTERNO } from '../../../../../lib/erros';
import { alterarDadosNoPainel } from './acoes';

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };
const SEM_TEXTO = textoVazio();

type Props = { id: string; inicial: ValoresDaDemanda };

export function FormularioEditarDemanda({ id, inicial }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(estaSujo(inicial, SEM_TEXTO, valores, SEM_TEXTO));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarDemanda(valores, SEM_TEXTO, 'manual', { semTexto: true });
    if (locais.length > 0) {
      setErros(errosLocais(locais));
      return;
    }
    const { mudancas, indicesAnexos } = mudancasDaEdicao(inicial, valores);
    setEnviando(true);
    let saindo = false;
    try {
      const r = await alterarDadosNoPainel({ ...mudancas, id });
      if (r.ok) {
        saindo = true;
        liberar();
        router.push(`/demandas/${r.dados.id}?aviso=${AVISO_DEMANDA.alteracoesSalvas}`);
        return;
      }
      setErros(errosDaApi(r, { modo: 'manual', tamanhoTexto: 0, indicesAnexos }));
    } catch {
      setErros({ ...SEM_ERROS, alerta: MENSAGEM_ERRO_INTERNO });
    } finally {
      if (!saindo) setEnviando(false);
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
      <form noValidate onSubmit={enviar} aria-busy={enviando} className="flex flex-col gap-8">
        <CamposDaDemanda valores={valores} mudar={setValores} erros={erros.porCampo} />
        <div className="flex flex-wrap items-center gap-4">
          <Botao type="submit" carregando={enviando} textoCarregando="Salvando…">
            Salvar alterações
          </Botao>
          <Link href={`/demandas/${id}`} className={classeDoBotao('link')}>
            Cancelar
          </Link>
        </div>
      </form>
      {dialogo}
    </>
  );
}
