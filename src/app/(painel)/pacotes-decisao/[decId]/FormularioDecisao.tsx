'use client';

// "Registrar decisão" da T11 (03, T11; RF-13, RF-14; P1-a, P1-b). 0.2.0 (DEC-DEM-20261110-0015-v1, T12; RF-11, ADR-18;
// 03, 6.4): um formulário só, com três botões de envio no grupo "Ações da decisão": "Aprovar a opção X" ("Aprovar" sem
// opção), "Devolver" e "Arquivar". O botão ativado define a decisão (envioDaDecisao), e o mesmo valor vai ao diálogo e à
// Server Action (CV-10). As opções, ou a frase da opção fixada na segunda aprovação, e o documento assinado (só a conta
// da administradora) aparecem desde o início; com o pacote desatualizado não aparecem, e "Aprovar" fica focável,
// explicado e sem efeito (CV-11). Comentários e a confirmação de revisão, quando o pacote cita rascunho de agente, valem
// para as três ações. Nenhuma opção vem marcada (CV-13) e nenhum campo digitado tem `name` (CV-15). Validação no envio
// (2.5); o diálogo resume a decisão e repete o repositório destino e o nível (C-14, WCAG 3.3.4) antes de registrar;
// erros da API no mesmo resumo e o 409 num alerta. Registrada, a página é lida de novo com o alerta de resultado. A
// regra que vale é a do servidor (registrarDecisaoNoPainel).
//
// T13 (03, 6.3; RF-12): abaixo de 768 px o grupo "Ações da decisão" é o rodapé fixo da C2 (branco, borda superior,
// área segura, principal de 48 px na largura toda, "Devolver" e "Arquivar" lado a lado); a partir de 768 px fica no
// fluxo, no fim do cartão. Só classe muda: o DOM, os ids e o comportamento são os da T12. A folga embaixo do `main` e o
// scroll-padding, para nada focado ficar sob o rodapé, estão em globals.css.
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
  envioDaDecisao,
  errosDaApiDecisao,
  ID_DOS_BOTOES,
  rotuloDoPrincipal,
  textoDoDialogo,
  TEXTOS_DECISAO,
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
// Ids estáveis (03, 6.4): os três botões, o grupo deles e os textos ligados por aria-describedby.
const ID_RODAPE = 'rodape-da-decisao';
const ID_INDISPONIVEL = 'decisao-aprovar-indisponivel';
const ID_CONSEQUENCIA = { devolvida: 'decisao-consequencia-devolver', arquivada: 'decisao-consequencia-arquivar' } as const;
const CLASSE_DA_NOTA = 'text-sm text-tinta-media';
// 03, 6.3: o rodapé da C2 só abaixo de 768 px (12 × 16 px de preenchimento, mais a área segura embaixo); 124 px sem a
// explicação e 150 px com ela. O z-index fica acima do cartão de opção e no nível da barra do topo, que ele não cruza.
const CLASSE_DO_RODAPE =
  'flex flex-col gap-3 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-20 max-md:gap-2 max-md:border-t max-md:border-linha max-md:bg-branco max-md:px-4 max-md:pt-3 max-md:pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]';
// A explicação do "Aprovar" indisponível em 13 px no rodapé do celular (03, 6.3).
const CLASSE_DA_EXPLICACAO = `${CLASSE_DA_NOTA} max-md:text-[0.8125rem] max-md:leading-[1.125rem]`;

type Props = {
  decId: string;
  contexto: ContextoDoFormulario;
  opcoesEscolha: readonly OpcaoDoGrupo[];
  repositorioDestino: string | null;
  nivelAprovacaoRequerido: NivelAprovacao;
};

export function FormularioDecisao({ decId, contexto, opcoesEscolha, repositorioDestino, nivelAprovacaoRequerido }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<ValoresDaDecisao>(valoresDaDecisao);
  const [enviando, setEnviando] = useState(false);
  // O `v` que o diálogo mostra e que "Confirmar e registrar" envia (CV-10): montado uma vez, no envio.
  const [aConfirmar, setAConfirmar] = useState<ValoresDaDecisao | null>(null);
  // O botão ativado: só ele mostra "Registrando…" enquanto os três ficam desabilitados.
  const [ativada, setAtivada] = useState<StatusDecisaoGravado | null>(null);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(decisaoSuja(valores));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  const mudar = <K extends keyof ValoresDaDecisao>(campo: K, valor: ValoresDaDecisao[K]) => setValores((v) => ({ ...v, [campo]: valor }));
  const t = TEXTOS_DECISAO;
  const indisponivel = contexto.aprovarIndisponivel;

  async function registrar(v: ValoresDaDecisao) {
    setEnviando(true);
    let saindo = false;
    try {
      const r = await registrarDecisaoNoPainel({ decId, decisao: entradaDaDecisao(v, contexto) });
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
      setAConfirmar(null);
      if (!saindo) setEnviando(false);
    }
  }

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    // O botão de envio deste formulário que foi ativado (clique, Enter ou Espaço nele, ou o Enter num campo de texto,
    // que envia pelo primeiro, o principal). Sem botão, ou com valor fora da lista, nada acontece.
    const submitter = (ev.nativeEvent as SubmitEvent).submitter;
    const botao = submitter instanceof HTMLButtonElement && submitter.form === ev.currentTarget ? submitter : null;
    const r = envioDaDecisao(valores, contexto, botao?.value);
    if (r.tipo === 'nada') return;
    if (r.tipo === 'erros') {
      setErros({ ...SEM_ERROS, campos: r.erros, porCampo: Object.fromEntries(r.erros.map((c) => [c.campo, c.mensagem])) });
      return;
    }
    setErros(SEM_ERROS);
    // O diálogo devolve o foco a quem o tinha ao abrir: o botão ativado, também no Enter (o Safari não foca no clique).
    botao?.focus();
    setAtivada(r.v.statusDecisao === '' ? null : r.v.statusDecisao);
    setAConfirmar(r.v);
  }

  let escolha: ReactNode = null;
  if (!indisponivel)
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
        variante="cartao"
      />
    );

  // Os três botões: desabilitados enquanto envia, e o ativado com "Registrando…".
  const estadoDoBotao = (acao: StatusDecisaoGravado) => ({ disabled: enviando && ativada !== acao, carregando: enviando && ativada === acao });

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
        {escolha}
        {contexto.pedeDocumento && !indisponivel ? (
          <>
            {/* Sem `obrigatorio` (aria-required): o documento é obrigatório só para aprovar, e o rótulo diz isso. */}
            <CampoTexto
              id={idDoCampo('referenciaDocumento')}
              rotulo={t.referencia}
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
        <div className="flex flex-col gap-1">
          <p id={ID_CONSEQUENCIA.devolvida} className={CLASSE_DA_NOTA}>
            {t.dicaDevolver}
          </p>
          <p id={ID_CONSEQUENCIA.arquivada} className={CLASSE_DA_NOTA}>
            {t.dicaArquivar}
          </p>
        </div>
        <div id={ID_RODAPE} role="group" aria-label={t.grupoAcoes} className={CLASSE_DO_RODAPE}>
          {indisponivel ? (
            <p id={ID_INDISPONIVEL} className={CLASSE_DA_EXPLICACAO}>
              {t.dicaAprovarIndisponivel}
            </p>
          ) : null}
          <Botao
            type="submit"
            id={ID_DOS_BOTOES.aprovada}
            name="acao"
            value="aprovada"
            aria-disabled={indisponivel || undefined}
            aria-describedby={indisponivel ? ID_INDISPONIVEL : undefined}
            {...estadoDoBotao('aprovada')}
            textoCarregando={t.registrando}
            className="max-md:min-h-12 max-md:w-full"
          >
            {rotuloDoPrincipal(valores, contexto)}
          </Botao>
          <div className="flex flex-wrap gap-3 max-md:grid max-md:grid-cols-2">
            <Botao
              type="submit"
              id={ID_DOS_BOTOES.devolvida}
              name="acao"
              value="devolvida"
              variante="secundario"
              aria-describedby={ID_CONSEQUENCIA.devolvida}
              {...estadoDoBotao('devolvida')}
              textoCarregando={t.registrando}
            >
              {t.devolverCurto}
            </Botao>
            <Botao
              type="submit"
              id={ID_DOS_BOTOES.arquivada}
              name="acao"
              value="arquivada"
              variante="secundario"
              aria-describedby={ID_CONSEQUENCIA.arquivada}
              {...estadoDoBotao('arquivada')}
              textoCarregando={t.registrando}
            >
              {t.arquivar}
            </Botao>
          </div>
        </div>
      </form>
      <DialogoConfirmacao
        aberto={aConfirmar !== null}
        titulo={t.dialogoTitulo}
        rotuloConfirmar={t.dialogoConfirmar}
        rotuloCancelar={t.dialogoVoltar}
        ocupado={enviando}
        textoOcupado={t.registrando}
        onCancelar={() => setAConfirmar(null)}
        onConfirmar={() => {
          if (aConfirmar) void registrar(aConfirmar);
        }}
      >
        <div className="flex flex-col gap-2">
          {aConfirmar
            ? textoDoDialogo(aConfirmar, contexto, { especificacaoCitada: { repositorioDestino }, nivelAprovacaoRequerido }).map((linha) => <p key={linha}>{linha}</p>)
            : null}
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
