'use client';

// "Registrar decisão" da T11 (03, T11; RF-13, RF-14; P1-a, P1-b): o grupo "Decisão", com "Aprovar" indisponível e
// explicado quando o pacote está desatualizado (CA-12.4); o grupo "Opção escolhida", que aparece logo depois ao marcar
// "Aprovar", sem mover o foco, ou a frase da opção fixada na segunda aprovação; o documento assinado, só para a conta
// da administradora; os comentários; e a confirmação de revisão, quando o pacote cita rascunho de agente. Validação no
// envio (2.5); o diálogo resume a decisão e repete o repositório destino e o nível (C-14, WCAG 3.3.4) antes de
// registrar; erros da API no mesmo resumo e o 409 num alerta. Registrada, a página é lida de novo com o alerta de
// resultado. A regra que vale é a do servidor (registrarDecisaoNoPainel).
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { AreaTexto } from '../../../../components/AreaTexto';
import { Botao } from '../../../../components/Botao';
import { CaixaSelecao } from '../../../../components/CaixaSelecao';
import { CampoTexto } from '../../../../components/CampoTexto';
import { useConfirmarSaida } from '../../../../components/CamposDaDemanda';
import {
  caminhoDepoisDeDecidir,
  decisaoSuja,
  entradaDaDecisao,
  errosDaApiDecisao,
  textoDoDialogo,
  TEXTOS_DECISAO,
  validarDecisao,
  valoresDaDecisao,
  type ContextoDoFormulario,
  type ValoresDaDecisao,
} from '../../../../components/dados-da-decisao';
import { DialogoConfirmacao } from '../../../../components/DialogoConfirmacao';
import { idDoCampo, type ErrosDoFormulario } from '../../../../components/formulario';
import { GrupoOpcoes, type OpcaoDoGrupo } from '../../../../components/GrupoOpcoes';
import { ResumoErros } from '../../../../components/ResumoErros';
import type { NivelAprovacao, OpcaoDecisao, StatusDecisaoGravado } from '../../../../db/schema/decisao';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import { registrarDecisaoNoPainel } from './acoes';

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };
const ID_BOTAO = 'registrar-decisao';

type Props = {
  decId: string;
  contexto: ContextoDoFormulario;
  opcoesDecisao: readonly OpcaoDoGrupo[];
  opcoesEscolha: readonly OpcaoDoGrupo[];
  repositorioDestino: string | null;
  nivelAprovacaoRequerido: NivelAprovacao;
};

export function FormularioDecisao({ decId, contexto, opcoesDecisao, opcoesEscolha, repositorioDestino, nivelAprovacaoRequerido }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresDaDecisao>(valoresDaDecisao);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(decisaoSuja(valores));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  const mudar = <K extends keyof ValoresDaDecisao>(campo: K, valor: ValoresDaDecisao[K]) => setValores((v) => ({ ...v, [campo]: valor }));
  const aprovando = valores.statusDecisao === 'aprovada';
  const t = TEXTOS_DECISAO;

  async function registrar() {
    setEnviando(true);
    let saindo = false;
    try {
      const r = await registrarDecisaoNoPainel({ decId, decisao: entradaDaDecisao(valores, contexto) });
      if (r.ok) {
        saindo = true;
        liberar();
        const destino = caminhoDepoisDeDecidir(decId);
        if (`${window.location.pathname}${window.location.search}` === destino) router.refresh();
        else router.replace(destino);
        return;
      }
      setErros(errosDaApiDecisao(r, contexto));
    } catch {
      setErros({ ...SEM_ERROS, alerta: MENSAGEM_ERRO_INTERNO });
    } finally {
      setConfirmando(false);
      if (!saindo) setEnviando(false);
    }
  }

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarDecisao(valores, contexto);
    if (locais.length > 0) {
      setErros({ ...SEM_ERROS, campos: locais, porCampo: Object.fromEntries(locais.map((c) => [c.campo, c.mensagem])) });
      return;
    }
    setErros(SEM_ERROS);
    // O diálogo devolve o foco a quem o tinha ao abrir: o botão "Registrar decisão", também no envio pela tecla Enter.
    document.getElementById(ID_BOTAO)?.focus();
    setConfirmando(true);
  }

  let escolha: ReactNode = null;
  if (aprovando)
    escolha = contexto.opcaoFixada ? (
      <p>{t.fixada(contexto.opcaoFixada.papel, contexto.opcaoFixada.opcao)}</p>
    ) : (
      <GrupoOpcoes
        nome={idDoCampo('opcaoEscolhida')}
        legenda={t.legendaOpcao}
        opcoes={opcoesEscolha}
        erro={erros.porCampo.opcaoEscolhida}
        valor={valores.opcaoEscolhida}
        onMudar={(o) => mudar('opcaoEscolhida', o as OpcaoDecisao)}
      />
    );

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
      <form noValidate onSubmit={enviar} aria-busy={enviando} className="flex flex-col gap-6">
        <GrupoOpcoes
          nome={idDoCampo('statusDecisao')}
          legenda={t.legendaDecisao}
          opcoes={opcoesDecisao}
          erro={erros.porCampo.statusDecisao}
          valor={valores.statusDecisao}
          onMudar={(s) => mudar('statusDecisao', s as StatusDecisaoGravado)}
        />
        {escolha}
        {aprovando && contexto.pedeDocumento ? (
          <>
            <CampoTexto
              id={idDoCampo('referenciaDocumento')}
              rotulo={t.referencia}
              obrigatorio
              dica={t.dicaReferencia}
              erro={erros.porCampo.referenciaDocumento}
              value={valores.referenciaDocumento}
              autoComplete="off"
              onChange={(e) => mudar('referenciaDocumento', e.target.value)}
            />
            <CampoTexto
              id={idDoCampo('dataDocumento')}
              type="date"
              rotulo={t.dataAssinatura}
              obrigatorio
              erro={erros.porCampo.dataDocumento}
              value={valores.dataDocumento}
              onChange={(e) => mudar('dataDocumento', e.target.value)}
            />
          </>
        ) : null}
        <AreaTexto
          id={idDoCampo('comentarios')}
          rotulo={t.comentarios}
          rows={3}
          value={valores.comentarios}
          erro={erros.porCampo.comentarios}
          onChange={(e) => mudar('comentarios', e.target.value)}
        />
        {contexto.exigeRevisao ? (
          <CaixaSelecao
            id={idDoCampo('revisouRascunhosDeAgente')}
            rotulo={t.revisei}
            obrigatorio
            erro={erros.porCampo.revisouRascunhosDeAgente}
            checked={valores.revisouRascunhosDeAgente}
            onChange={(e) => mudar('revisouRascunhosDeAgente', e.target.checked)}
          />
        ) : null}
        <div>
          <Botao id={ID_BOTAO} type="submit" carregando={enviando} textoCarregando={t.registrando}>
            {t.registrar}
          </Botao>
        </div>
      </form>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo={t.dialogoTitulo}
        rotuloConfirmar={t.dialogoConfirmar}
        rotuloCancelar={t.dialogoVoltar}
        ocupado={enviando}
        textoOcupado={t.registrando}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() => void registrar()}
      >
        <div className="flex flex-col gap-2">
          {textoDoDialogo(valores, contexto, { especificacaoCitada: { repositorioDestino }, nivelAprovacaoRequerido }).map((linha) => (
            <p key={linha}>{linha}</p>
          ))}
        </div>
      </DialogoConfirmacao>
      {dialogo}
    </>
  );
}

// Alerta de resultado depois de criar o pacote ou de registrar a decisão (03, T11, Foco: "alerta de resultado"). A
// página é lida de novo e o formulário some; sem isto, o foco cairia no corpo da página.
export function AlertaDeResultado({ children }: { children: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} tabIndex={-1}>
      <Alerta tipo="sucesso" envio>
        {children}
      </Alerta>
    </div>
  );
}
