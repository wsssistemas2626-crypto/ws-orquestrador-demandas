'use client';

// T09 Novo pacote de decisão (03, T09): "Resumo executivo"; as opções A e B em fieldset/legend, com rótulos que repetem a
// opção ("Vantagens da opção B"), para o campo ser entendido fora do contexto visual; "Recomendação"; e o grupo do nível
// de aprovação. Validação no envio (2.5); erros da API no mesmo resumo, e o 400 com `faltando` num alerta; o que foi
// digitado nunca se perde; confirmação ao sair com conteúdo não salvo. A regra que vale é a do servidor
// (gravarPacoteNoPainel). Gravado, vai à T11 do pacote novo.
// 0.2.0 (T15; 03, 8.2 do pedido 0015): cada campo solto e cada fieldset fica num Cartao, sem mudar rótulo, legenda,
// ordem nem campo; 20 px entre os blocos (03, 2.4).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alerta } from '../../../../../../components/Alerta';
import { AreaTexto } from '../../../../../../components/AreaTexto';
import { Botao, classeDoBotao } from '../../../../../../components/Botao';
import { useConfirmarSaida } from '../../../../../../components/CamposDaDemanda';
import { Cartao } from '../../../../../../components/Cartao';
import {
  caminhoDeChegadaDoPacote,
  campoDaOpcao,
  entradaDoPacote,
  errosDaApiDec,
  LETRAS,
  NIVEIS_DO_PACOTE,
  pacoteSujo,
  TEXTOS_DEC,
  validarPacote,
  type CampoTextoDec,
  type ValoresDoPacote,
} from '../../../../../../components/dados-do-pacote';
import { idDoCampo, type ErrosDoFormulario } from '../../../../../../components/formulario';
import { GrupoOpcoes } from '../../../../../../components/GrupoOpcoes';
import { ResumoErros } from '../../../../../../components/ResumoErros';
import { ROTULO_NIVEL_APROVACAO } from '../../../../../../components/rotulos';
import type { NivelAprovacao } from '../../../../../../db/schema/decisao';
import { MENSAGEM_ERRO_INTERNO } from '../../../../../../lib/erros';
import { gravarPacoteNoPainel } from './acoes';

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };
const OPCOES_NIVEL = NIVEIS_DO_PACOTE.map((n) => ({ valor: n, rotulo: ROTULO_NIVEL_APROVACAO[n] }));

type Props = { demandaId: string; idNovo: string; inicial: ValoresDoPacote };

export function FormularioPacote({ demandaId, idNovo, inicial }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(pacoteSujo(inicial, valores));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  const texto = (c: CampoTextoDec, rotulo: string, extra: { dica?: string; obrigatorio?: boolean } = {}) => (
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

  async function gravar() {
    setEnviando(true);
    let saindo = false;
    try {
      const r = await gravarPacoteNoPainel({ ...entradaDoPacote(valores), demandaId });
      if (r.ok) {
        saindo = true;
        liberar();
        router.push(caminhoDeChegadaDoPacote(r.dados.id));
        return;
      }
      setErros(errosDaApiDec(r));
    } catch {
      setErros({ ...SEM_ERROS, alerta: MENSAGEM_ERRO_INTERNO });
    } finally {
      if (!saindo) setEnviando(false);
    }
  }

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarPacote(valores);
    if (locais.length > 0) {
      setErros({ ...SEM_ERROS, campos: locais, porCampo: Object.fromEntries(locais.map((c) => [c.campo, c.mensagem])) });
      return;
    }
    void gravar();
  }

  const t = TEXTOS_DEC;
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
        <Cartao>{texto('resumoExecutivo', t.resumoExecutivo, { obrigatorio: true })}</Cartao>
        {LETRAS.map((l) => (
          <Cartao key={l}>
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="mb-2 text-lg font-semibold">{t.opcao(l)}</legend>
              {texto(campoDaOpcao(l, 'descricao'), t.descricao(l), { obrigatorio: true })}
              {texto(campoDaOpcao(l, 'vantagens'), t.vantagens(l))}
              {texto(campoDaOpcao(l, 'desvantagens'), t.desvantagens(l))}
              {texto(campoDaOpcao(l, 'quandoEscolher'), t.quandoEscolher(l))}
            </fieldset>
          </Cartao>
        ))}
        <Cartao>{texto('recomendacao', t.recomendacao, { dica: t.dicaRecomendacao })}</Cartao>
        <Cartao>
          <GrupoOpcoes
            nome={idDoCampo('nivelAprovacaoRequerido')}
            legenda={t.nivel}
            dica={t.dicaNivel}
            opcoes={OPCOES_NIVEL}
            erro={erros.porCampo.nivelAprovacaoRequerido}
            valor={valores.nivelAprovacaoRequerido}
            onMudar={(n) => setValores((v) => ({ ...v, nivelAprovacaoRequerido: n as NivelAprovacao }))}
          />
        </Cartao>
        <div className="flex flex-wrap items-center gap-4">
          <Botao type="submit" carregando={enviando} textoCarregando={t.gravando}>
            {t.gravar(idNovo)}
          </Botao>
          <Link href={`/demandas/${demandaId}`} className={classeDoBotao('link')}>
            {t.cancelar}
          </Link>
        </div>
      </form>
      {dialogo}
    </>
  );
}
