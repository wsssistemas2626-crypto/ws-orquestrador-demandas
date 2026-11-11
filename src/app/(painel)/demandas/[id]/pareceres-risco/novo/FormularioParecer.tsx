'use client';

// T08 Novo parecer de risco (03, T08): "Resumo"; os três riscos em fieldset/legend, cada um com o grupo de opções do
// nível (a `legend` traz o nome do risco: "Nível do risco técnico (obrigatório)") e o "Comentário"; as listas pela Lista
// de textos (2.4); e "Quando envolver o jurídico ou a administradora". Validação no envio (2.5); erros da API no mesmo
// resumo; o que foi digitado nunca se perde; confirmação ao sair com conteúdo não salvo. A regra que vale é a do servidor
// (gravarParecerNoPainel).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alerta } from '../../../../../../components/Alerta';
import { AreaTexto } from '../../../../../../components/AreaTexto';
import { Botao, classeDoBotao } from '../../../../../../components/Botao';
import { useConfirmarSaida } from '../../../../../../components/CamposDaDemanda';
import { Cartao } from '../../../../../../components/Cartao';
import {
  caminhoDeChegadaDoParecer,
  entradaDoParecer,
  errosDaApiRsk,
  NIVEIS_DO_PARECER,
  parecerSujo,
  RISCOS,
  TEXTOS_RSK,
  validarParecer,
  type CampoListaRsk,
  type CampoTextoRsk,
  type ValoresDoParecer,
} from '../../../../../../components/dados-do-parecer';
import { idDoCampo, type ErrosDoFormulario } from '../../../../../../components/formulario';
import { GrupoOpcoes } from '../../../../../../components/GrupoOpcoes';
import { errosDepoisDeRemover, type ItemDaLista } from '../../../../../../components/lista-textos';
import { ListaTextos } from '../../../../../../components/ListaTextos';
import { ResumoErros } from '../../../../../../components/ResumoErros';
import { ROTULO_NIVEL } from '../../../../../../components/rotulos';
import { MENSAGEM_ERRO_INTERNO } from '../../../../../../lib/erros';
import type { NivelRisco } from '../../../../../../db/schema/versoes';
import { gravarParecerNoPainel } from './acoes';

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };
const OPCOES_NIVEL = NIVEIS_DO_PARECER.map((n) => ({ valor: n, rotulo: ROTULO_NIVEL[n] }));

type Props = { demandaId: string; versaoEsperada: number; idNovo: string; inicial: ValoresDoParecer };

// 0.2.0 (T14; 03, 8.2 do pedido 0015): cada fieldset fica num Cartao, sem mudar a legenda nem os campos.
function Secao({ legenda, children }: { legenda: string; children: ReactNode }) {
  return (
    <Cartao>
      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">{legenda}</legend>
        {children}
      </fieldset>
    </Cartao>
  );
}

export function FormularioParecer({ demandaId, versaoEsperada, idNovo, inicial }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(parecerSujo(inicial, valores));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  const texto = (c: CampoTextoRsk, rotulo: string, extra: { dica?: string } = {}) => (
    <AreaTexto
      id={idDoCampo(c)}
      rotulo={rotulo}
      rows={3}
      value={valores[c]}
      erro={erros.porCampo[c]}
      onChange={(e) => {
        const valor = e.target.value;
        setValores((v) => ({ ...v, [c]: valor }));
      }}
      {...extra}
    />
  );

  const lista = (c: CampoListaRsk, nome: string, dica?: string) => (
    <ListaTextos
      campo={c}
      legenda={nome}
      nome={nome}
      dica={dica}
      itens={valores[c]}
      mudar={(f: (itens: ItemDaLista[]) => ItemDaLista[]) => setValores((v) => ({ ...v, [c]: f(v[c]) }))}
      erros={erros.porCampo}
      aoRemover={(removido, restantes) => setErros((e) => errosDepoisDeRemover(e, { campo: c, nome, removido, restantes }))}
    />
  );

  async function gravar() {
    const { entrada, indices } = entradaDoParecer(valores);
    setEnviando(true);
    let saindo = false;
    try {
      const r = await gravarParecerNoPainel({ ...entrada, demandaId, versaoEsperada });
      if (r.ok) {
        saindo = true;
        liberar();
        router.push(caminhoDeChegadaDoParecer(r.dados));
        return;
      }
      setErros(errosDaApiRsk(r, { indices, valores }));
    } catch {
      setErros({ ...SEM_ERROS, alerta: MENSAGEM_ERRO_INTERNO });
    } finally {
      if (!saindo) setEnviando(false);
    }
  }

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarParecer(valores);
    if (locais.length > 0) {
      setErros({ ...SEM_ERROS, campos: locais, porCampo: Object.fromEntries(locais.map((c) => [c.campo, c.mensagem])) });
      return;
    }
    void gravar();
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
      <form noValidate onSubmit={enviar} aria-busy={enviando} className="flex flex-col gap-5">
        <Cartao>{texto('resumo', TEXTOS_RSK.resumo)}</Cartao>
        {RISCOS.map((r) => (
          <Secao key={r.nivel} legenda={r.titulo}>
            <GrupoOpcoes
              nome={idDoCampo(r.nivel)}
              legenda={TEXTOS_RSK.legendaNivel(r.nome)}
              opcoes={OPCOES_NIVEL}
              erro={erros.porCampo[r.nivel]}
              valor={valores[r.nivel]}
              onMudar={(nivel) => setValores((v) => ({ ...v, [r.nivel]: nivel as NivelRisco }))}
            />
            {texto(r.comentario, TEXTOS_RSK.comentario)}
          </Secao>
        ))}
        <Cartao>{lista('recomendacoesMitigacao', TEXTOS_RSK.recomendacoes)}</Cartao>
        <Cartao>{lista('preCondicoes', TEXTOS_RSK.preCondicoes, TEXTOS_RSK.dicaPreCondicoes)}</Cartao>
        <Cartao>{texto('envolverJuridicoOuAdministradoraQuando', TEXTOS_RSK.envolver, { dica: TEXTOS_RSK.dicaEnvolver })}</Cartao>
        <div className="flex flex-wrap items-center gap-4">
          <Botao type="submit" carregando={enviando} textoCarregando={TEXTOS_RSK.gravando}>
            {TEXTOS_RSK.gravar(idNovo)}
          </Botao>
          <Link href={`/demandas/${demandaId}`} className={classeDoBotao('link')}>
            {TEXTOS_RSK.cancelar}
          </Link>
        </div>
      </form>
      {dialogo}
    </>
  );
}
