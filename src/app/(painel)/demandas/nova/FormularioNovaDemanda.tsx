'use client';

// T04 Nova demanda (03, T04; RF-03, RF-05, RF-20). O modo vem da configuração do agente orquestrador (T28): desligado ou
// suspenso pelo teto, a pessoa preenche tudo (modo manual), com o alerta de modo; ligado, a pessoa escolhe entre pedir
// ao agente (só o texto e o solicitante, com o aviso de minimização) e preencher ela mesma. "Preencher à mão" depois de
// falha do agente chega com a entrada pendente: o texto vem preenchido, só para leitura, e o modo é o manual.
//
// Validação ao enviar (03, 2.5): os erros vão ao Resumo de erros, que recebe o foco; os erros da API entram no mesmo
// resumo, campo a campo; o resto vira alerta de envio. O que foi digitado nunca se perde num erro, e sair com conteúdo
// não salvo pede confirmação.
//
// 0.2.0 (T14; 03, 8.2 do pedido 0015): cada seção e o grupo "Como criar a demanda?" ficam num Cartao, com 20 px entre
// os blocos (03, 2.4); campos, ordem, textos, validação e diálogo não mudam.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { AreaTexto } from '../../../../components/AreaTexto';
import { Botao, classeDoBotao } from '../../../../components/Botao';
import { CampoTexto } from '../../../../components/CampoTexto';
import { CamposDaDemanda, Secao, useConfirmarSaida } from '../../../../components/CamposDaDemanda';
import { Cartao } from '../../../../components/Cartao';
import {
  AVISO_DEMANDA,
  entradaDoFormulario,
  errosDaApi,
  errosLocais,
  estaSujo,
  LIMITE_TEXTO_PEDIDO,
  TEXTOS_DEMANDA,
  textoVazio,
  validarDemanda,
  valoresVazios,
  type ModoEntrada,
  type ValoresDaDemanda,
  type ValoresDoTexto,
} from '../../../../components/dados-da-demanda';
import { idDoCampo, type ErrosDoFormulario } from '../../../../components/formulario';
import { GrupoOpcoes } from '../../../../components/GrupoOpcoes';
import { ResumoErros } from '../../../../components/ResumoErros';
import { Selecao, type OpcaoSelecao } from '../../../../components/Selecao';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import { registrarEntradaNoPainel } from './acoes';

export type EstadoDoOrquestrador = 'desligado' | 'suspenso' | 'disponivel';
// A entrada que o agente não conseguiu preparar (T28), lida pela página com `ler_texto_bruto`.
export type PendenteNoFormulario = { id: string; texto: string; canal: string; referencia: string; solicitanteNome: string; solicitantePapel: string };

const OPCOES_CANAL: readonly OpcaoSelecao[] = [
  { valor: '', rotulo: 'Não informado' },
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'mensagem', rotulo: 'Mensagem' },
  { valor: 'formulario', rotulo: 'Formulário' },
  { valor: 'outro', rotulo: 'Outro' },
];

const OPCOES_MODO = [
  { valor: 'agente', rotulo: TEXTOS_DEMANDA.pedirAoAgente },
  { valor: 'manual', rotulo: TEXTOS_DEMANDA.preencherEuMesmo },
] as const;

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };

type Props = { estado: EstadoDoOrquestrador; pendente: PendenteNoFormulario | null };

export function FormularioNovaDemanda({ estado, pendente }: Props) {
  const router = useRouter();
  const escolheModo = estado === 'disponivel' && pendente === null;
  const [modo, setModo] = useState<ModoEntrada>(escolheModo ? 'agente' : 'manual');
  const [inicial] = useState<ValoresDaDemanda>(() =>
    pendente ? { ...valoresVazios(), solicitanteNome: pendente.solicitanteNome, solicitantePapel: pendente.solicitantePapel } : valoresVazios(),
  );
  const [textoInicial] = useState<ValoresDoTexto>(() => (pendente ? { texto: pendente.texto, canal: pendente.canal, referencia: pendente.referencia } : textoVazio()));
  const [valores, setValores] = useState(inicial);
  const [texto, setTexto] = useState(textoInicial);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(estaSujo(inicial, textoInicial, valores, texto));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  const agente = modo === 'agente';
  const somenteLeitura = pendente !== null;

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarDemanda(valores, texto, modo, { comEntradaPendente: somenteLeitura });
    if (locais.length > 0) {
      setErros(errosLocais(locais));
      return;
    }
    const { entrada, indicesAnexos } = entradaDoFormulario(valores, texto, modo, pendente?.id);
    setEnviando(true);
    let saindo = false;
    try {
      const r = await registrarEntradaNoPainel(entrada);
      if (r.ok) {
        saindo = true;
        liberar();
        router.push(r.dados.tipo === 'demanda' ? `/demandas/${r.dados.id}?aviso=${AVISO_DEMANDA.criada}` : `/demandas?aviso=${AVISO_DEMANDA.enviada}`);
        return;
      }
      setErros(errosDaApi(r, { modo, tamanhoTexto: texto.texto.length, indicesAnexos }));
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
      {estado === 'desligado' ? <Alerta tipo="informacao">{TEXTOS_DEMANDA.desligado}</Alerta> : null}
      {estado === 'suspenso' ? <Alerta tipo="informacao">{TEXTOS_DEMANDA.suspenso}</Alerta> : null}

      <form noValidate onSubmit={enviar} aria-busy={enviando} className="flex flex-col gap-5">
        {escolheModo ? (
          <Cartao>
            <GrupoOpcoes nome="modo" legenda={TEXTOS_DEMANDA.comoCriar} opcoes={OPCOES_MODO} valor={modo} onMudar={(m) => setModo(m as ModoEntrada)} />
          </Cartao>
        ) : null}

        <Secao titulo="Texto recebido">
          <AreaTexto
            id={idDoCampo('texto')}
            rotulo={agente ? 'Texto do pedido (obrigatório)' : 'Texto do pedido (opcional)'}
            obrigatorio={agente}
            dica={TEXTOS_DEMANDA.dicaTexto}
            limite={LIMITE_TEXTO_PEDIDO}
            rows={10}
            erro={erros.porCampo.texto}
            readOnly={somenteLeitura}
            value={texto.texto}
            onChange={(e) => {
              const v = e.target.value;
              setTexto((t) => ({ ...t, texto: v }));
            }}
          />
          <Selecao
            id={idDoCampo('origem.canal')}
            rotulo="Canal de origem (opcional)"
            opcoes={OPCOES_CANAL}
            erro={erros.porCampo['origem.canal']}
            disabled={somenteLeitura}
            value={texto.canal}
            onChange={(e) => {
              const v = e.target.value;
              setTexto((t) => ({ ...t, canal: v }));
            }}
          />
          <CampoTexto
            id={idDoCampo('origem.referencia')}
            rotulo="Referência da origem (opcional)"
            dica={TEXTOS_DEMANDA.dicaReferenciaOrigem}
            erro={erros.porCampo['origem.referencia']}
            autoComplete="off"
            readOnly={somenteLeitura}
            value={texto.referencia}
            onChange={(e) => {
              const v = e.target.value;
              setTexto((t) => ({ ...t, referencia: v }));
            }}
          />
        </Secao>

        <CamposDaDemanda valores={valores} mudar={setValores} erros={erros.porCampo} somenteSolicitante={agente} />

        {agente ? <Alerta tipo="informacao">{TEXTOS_DEMANDA.avisoMinimizacao}</Alerta> : null}

        <div className="flex flex-wrap items-center gap-4">
          <Botao type="submit" carregando={enviando} textoCarregando={agente ? 'Enviando…' : 'Salvando…'}>
            {agente ? 'Enviar ao agente' : 'Salvar demanda'}
          </Botao>
          <Link href="/demandas" className={classeDoBotao('link')}>
            Cancelar
          </Link>
        </div>
      </form>
      {dialogo}
    </>
  );
}
