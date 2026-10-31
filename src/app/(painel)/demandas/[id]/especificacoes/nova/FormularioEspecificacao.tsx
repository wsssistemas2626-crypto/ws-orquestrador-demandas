'use client';

// T07 Nova versão da especificação técnica (03, T07): seções em fieldset/legend, listas pela Lista de textos (2.4) e o
// repositório destino calculado (conta + sistema alvo), em texto ligado ao sistema alvo por aria-describedby e sem
// anúncio a cada tecla. Validação no envio (2.5); com dúvida em aberto, o Diálogo "Gravar com dúvidas em aberto?" antes
// de gravar, que devolve o foco ao botão "Gravar" ao fechar. Erros da API no mesmo resumo; o que foi digitado nunca se
// perde; confirmação ao sair com conteúdo não salvo. A regra que vale é a do servidor (gravarEspecificacaoNoPainel).
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Alerta } from '../../../../../../components/Alerta';
import { AreaTexto } from '../../../../../../components/AreaTexto';
import { Botao, classeDoBotao } from '../../../../../../components/Botao';
import { CampoTexto, descritores, Dica } from '../../../../../../components/CampoTexto';
import { useConfirmarSaida } from '../../../../../../components/CamposDaDemanda';
import {
  caminhoDeChegada,
  CONTAS_REPOSITORIO,
  entradaDaEspecificacao,
  errosDaApiEsp,
  especificacaoSuja,
  ID_REPOSITORIO_DESTINO,
  repositorioDe,
  temDuvidas,
  TEXTOS_ESP,
  validarEspecificacao,
  type CampoListaEsp,
  type CampoTextoEsp,
  type rotulosDaConstrucao,
  type ValoresDaEspecificacao,
} from '../../../../../../components/dados-da-especificacao';
import { DialogoConfirmacao } from '../../../../../../components/DialogoConfirmacao';
import { idDoCampo, type ErrosDoFormulario } from '../../../../../../components/formulario';
import type { ItemDaLista } from '../../../../../../components/lista-textos';
import { ListaTextos } from '../../../../../../components/ListaTextos';
import { ResumoErros } from '../../../../../../components/ResumoErros';
import { Selecao } from '../../../../../../components/Selecao';
import { MENSAGEM_ERRO_INTERNO } from '../../../../../../lib/erros';
import type { Tipo } from '../../../../../../modules/demandas/schemas';
import { gravarEspecificacaoNoPainel } from './acoes';

const SEM_ERROS: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };
const OPCOES_CONTA = CONTAS_REPOSITORIO.map((c) => ({ valor: c, rotulo: c }));
const ID_BOTAO_GRAVAR = 'gravar-especificacao';

type Props = {
  demandaId: string;
  tipo: Tipo;
  versaoEsperada: number;
  idNovo: string;
  rotulos: ReturnType<typeof rotulosDaConstrucao>;
  inicial: ValoresDaEspecificacao;
};

function Secao({ legenda, dica, idDica, children }: { legenda: string; dica?: string; idDica?: string; children: ReactNode }) {
  return (
    <fieldset aria-describedby={dica && idDica ? `${idDica}-dica` : undefined} className="flex min-w-0 flex-col gap-4">
      <legend className="mb-2 text-lg font-semibold">{legenda}</legend>
      {dica && idDica ? <Dica id={idDica}>{dica}</Dica> : null}
      {children}
    </fieldset>
  );
}

export function FormularioEspecificacao({ demandaId, tipo, versaoEsperada, idNovo, rotulos, inicial }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erros, setErros] = useState<ErrosDoFormulario>(SEM_ERROS);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const { dialogo, liberar } = useConfirmarSaida(especificacaoSuja(inicial, valores));

  useEffect(() => {
    if (erros.alerta) alertaDeEnvio.current?.focus();
  }, [erros]);

  const texto = (c: CampoTextoEsp, rotulo: string, extra: { dica?: string } = {}) => (
    <AreaTexto
      id={idDoCampo(c)}
      rotulo={rotulo}
      rows={3}
      value={valores[c]}
      erro={erros.porCampo[c]}
      obrigatorio={c === 'descricaoObjetiva'}
      onChange={(e) => {
        const valor = e.target.value;
        setValores((v) => ({ ...v, [c]: valor }));
      }}
      {...extra}
    />
  );

  const lista = (c: CampoListaEsp, legenda: string, nome: string, dica?: string) => (
    <ListaTextos
      campo={c}
      legenda={legenda}
      nome={nome}
      dica={dica}
      itens={valores[c]}
      mudar={(f: (itens: ItemDaLista[]) => ItemDaLista[]) => setValores((v) => ({ ...v, [c]: f(v[c]) }))}
      erros={erros.porCampo}
    />
  );

  async function gravar() {
    const { entrada, indices } = entradaDaEspecificacao(valores, tipo);
    setEnviando(true);
    let saindo = false;
    try {
      const r = await gravarEspecificacaoNoPainel({ ...entrada, demandaId, versaoEsperada });
      if (r.ok) {
        saindo = true;
        liberar();
        router.push(caminhoDeChegada(r.dados));
        return;
      }
      setErros(errosDaApiEsp(r, { indices, valores }));
    } catch {
      setErros({ ...SEM_ERROS, alerta: MENSAGEM_ERRO_INTERNO });
    } finally {
      if (!saindo) setEnviando(false);
    }
  }

  function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarEspecificacao(valores, tipo);
    if (locais.length > 0) {
      setErros({ ...SEM_ERROS, campos: locais, porCampo: Object.fromEntries(locais.map((c) => [c.campo, c.mensagem])) });
      return;
    }
    if (temDuvidas(valores)) {
      // O diálogo devolve o foco a quem o tinha ao abrir: o botão "Gravar", também no envio pela tecla Enter.
      document.getElementById(ID_BOTAO_GRAVAR)?.focus();
      setConfirmando(true);
      return;
    }
    void gravar();
  }

  const r = TEXTOS_ESP.secoes;
  const nomes = {
    sistemaAlvo: idDoCampo('sistemaAlvo'),
    conta: idDoCampo('contaRepositorio'),
  };

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
        <Secao legenda={r.problema}>
          {texto('descricaoObjetiva', 'Descrição objetiva (obrigatório)')}
          {texto('situacaoAtual', 'Situação atual')}
          {texto('situacaoDesejada', 'Situação desejada')}
        </Secao>
        <Secao legenda={r.escopo} dica={TEXTOS_ESP.dicaEscopo} idDica="secao-escopo">
          {lista('escopoInclui', 'Escopo inclui', 'Escopo inclui')}
          {lista('escopoExclui', 'Escopo exclui', 'Escopo exclui')}
        </Secao>
        <Secao legenda={r.sistemas}>
          {texto('sistemasErp', 'ERP')}
          {texto('sistemasEcommerceMarketplace', 'E-commerce e marketplace')}
          {texto('sistemasApisTerceiros', 'APIs de terceiros')}
          {texto('sistemasServicosInternos', 'Serviços internos da WS')}
        </Secao>
        <Secao legenda={r.dados}>
          {texto('dadosEntidades', 'Entidades')}
          {texto('dadosCamposCriticos', 'Campos críticos')}
        </Secao>
        {texto('restricoesTecnicas', r.restricoes)}
        {lista('duvidasEmAberto', r.duvidas, r.duvidas, TEXTOS_ESP.dicaDuvidas)}
        <Secao legenda={rotulos.legenda}>
          <CampoTexto
            id={nomes.sistemaAlvo}
            rotulo={rotulos.sistemaAlvo}
            obrigatorio={rotulos.dicaLista !== undefined}
            dica={TEXTOS_ESP.dicaSistemaAlvo}
            erro={erros.porCampo.sistemaAlvo}
            value={valores.sistemaAlvo}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              const sistemaAlvo = e.target.value;
              setValores((v) => ({ ...v, sistemaAlvo }));
            }}
            aria-describedby={descritores(nomes.sistemaAlvo, TEXTOS_ESP.dicaSistemaAlvo, erros.porCampo.sistemaAlvo, ID_REPOSITORIO_DESTINO)}
          />
          <Selecao
            id={nomes.conta}
            rotulo={rotulos.conta}
            obrigatorio={rotulos.dicaLista !== undefined}
            opcoes={OPCOES_CONTA}
            value={valores.contaRepositorio}
            erro={erros.porCampo.contaRepositorio}
            onChange={(e) => {
              const contaRepositorio = e.target.value;
              setValores((v) => ({ ...v, contaRepositorio }));
            }}
          />
          <p id={ID_REPOSITORIO_DESTINO} className="font-mono break-all">
            {TEXTOS_ESP.repositorioDestino(repositorioDe(valores))}
          </p>
          {lista('criteriosAceitePreliminares', rotulos.criterios, 'Critérios de aceite preliminares', rotulos.dicaLista)}
          {lista('definicaoDePronto', rotulos.definicao, 'Definição de pronto', rotulos.dicaLista)}
        </Secao>
        <div className="flex flex-wrap items-center gap-4">
          <Botao id={ID_BOTAO_GRAVAR} type="submit" carregando={enviando} textoCarregando={TEXTOS_ESP.gravando}>
            {TEXTOS_ESP.gravar(idNovo)}
          </Botao>
          <Link href={`/demandas/${demandaId}`} className={classeDoBotao('link')}>
            {TEXTOS_ESP.cancelar}
          </Link>
        </div>
      </form>
      <DialogoConfirmacao
        aberto={confirmando}
        titulo={TEXTOS_ESP.dialogoTitulo}
        rotuloConfirmar={TEXTOS_ESP.dialogoConfirmar}
        rotuloCancelar={TEXTOS_ESP.dialogoVoltar}
        onCancelar={() => setConfirmando(false)}
        onConfirmar={() => {
          setConfirmando(false);
          void gravar();
        }}
      >
        <p>{TEXTOS_ESP.dialogoTexto}</p>
      </DialogoConfirmacao>
      {dialogo}
    </>
  );
}
