'use client';

// Seções "Solicitante", "Classificação", "Descrição" e "Anexos (referências)" de T04, usadas também por T06 (03, T04 e
// T06). Os valores ficam na tela que usa o componente: trocar o modo (T04) esconde seções sem perder o que foi digitado.
// Anexos: "Adicionar anexo" leva o foco ao anexo novo; "Remover anexo N" leva ao anterior, ou a "Adicionar anexo" (03,
// 2.4). Também aqui: a confirmação ao sair com conteúdo não salvo (03, 2.5), comum às duas telas.
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AreaTexto } from './AreaTexto';
import { Botao } from './Botao';
import { CampoTexto, Dica } from './CampoTexto';
import { Cartao } from './Cartao';
import { ID_ADICIONAR_ANEXO, LIMITE_ANEXOS, TEXTOS_DEMANDA, type AnexoNoFormulario, type TipoAnexo, type ValoresDaDemanda } from './dados-da-demanda';
import { DialogoConfirmacao } from './DialogoConfirmacao';
import { idDoCampo } from './formulario';
import { GrupoOpcoes } from './GrupoOpcoes';
import { ROTULO_LINHA, ROTULO_PAPEL_SOLICITANTE, ROTULO_TIPO, ROTULO_URGENCIA } from './rotulos';
import { Selecao, type OpcaoSelecao } from './Selecao';

const opcoesDe = (rotulos: Readonly<Record<string, string>>): OpcaoSelecao[] => Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo }));

export const OPCOES_PAPEL: readonly OpcaoSelecao[] = [{ valor: '', rotulo: 'Não informado' }, ...opcoesDe(ROTULO_PAPEL_SOLICITANTE)];
const OPCOES_TIPO = opcoesDe(ROTULO_TIPO);
const OPCOES_LINHA: readonly OpcaoSelecao[] = [{ valor: '', rotulo: 'Não informada' }, ...opcoesDe(ROTULO_LINHA)];
const OPCOES_URGENCIA = [{ valor: '', rotulo: 'Não informada' }, ...opcoesDe(ROTULO_URGENCIA)];
const OPCOES_TIPO_ANEXO: readonly OpcaoSelecao[] = [
  { valor: 'url', rotulo: 'Link' },
  { valor: 'arquivo', rotulo: 'Arquivo' },
];

// Seção com título `h2` (03, T04: "Seções com fieldset/legend, ou h2 com section aria-labelledby"). 0.2.0 (T14; 03, 8.2
// do pedido 0015): a seção é o próprio Cartao, com o mesmo `section aria-labelledby` e o mesmo `h2`.
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  const id = useId();
  return (
    <Cartao rotuloPor={id} className="flex flex-col gap-4">
      <h2 id={id} className="text-lg font-semibold">
        {titulo}
      </h2>
      {children}
    </Cartao>
  );
}

type Props = {
  valores: ValoresDaDemanda;
  mudar: Dispatch<SetStateAction<ValoresDaDemanda>>;
  // Mensagem por caminho do campo ('titulo', 'anexos.1.referencia'), do último envio.
  erros: Readonly<Record<string, string>>;
  // Modo agente (T04): só a seção "Solicitante".
  somenteSolicitante?: boolean;
};

let contadorDeAnexos = 0;
const novoAnexo = (): AnexoNoFormulario => ({ chave: `novo-${++contadorDeAnexos}`, tipo: 'url', referencia: '', descricao: '' });

export function CamposDaDemanda({ valores, mudar, erros, somenteSolicitante = false }: Props) {
  // O id do elemento que recebe o foco depois de adicionar ou remover um anexo, já com a lista nova na tela.
  const focoPendente = useRef<string | null>(null);
  useEffect(() => {
    if (!focoPendente.current) return;
    document.getElementById(focoPendente.current)?.focus();
    focoPendente.current = null;
  });

  const campo = <K extends Exclude<keyof ValoresDaDemanda, 'anexos'>>(c: K) => ({
    id: idDoCampo(c),
    value: valores[c],
    erro: erros[c],
    onChange: (e: { target: { value: string } }) => {
      const valor = e.target.value;
      mudar((v) => ({ ...v, [c]: valor }));
    },
  });

  const mudarAnexo = (chave: string, mudanca: Partial<AnexoNoFormulario>) =>
    mudar((v) => ({ ...v, anexos: v.anexos.map((a) => (a.chave === chave ? { ...a, ...mudanca } : a)) }));

  function adicionarAnexo() {
    if (valores.anexos.length >= LIMITE_ANEXOS) return;
    focoPendente.current = idDoCampo(`anexos.${valores.anexos.length}.tipo`);
    mudar((v) => ({ ...v, anexos: [...v.anexos, novoAnexo()] }));
  }

  function removerAnexo(i: number) {
    focoPendente.current = i > 0 ? idDoCampo(`anexos.${i - 1}.tipo`) : ID_ADICIONAR_ANEXO;
    const chave = valores.anexos[i]?.chave;
    mudar((v) => ({ ...v, anexos: v.anexos.filter((a) => a.chave !== chave) }));
  }

  const noLimite = valores.anexos.length >= LIMITE_ANEXOS;

  return (
    <>
      <Secao titulo="Solicitante">
        <CampoTexto {...campo('solicitanteNome')} rotulo="Nome do solicitante (obrigatório)" obrigatorio dica={TEXTOS_DEMANDA.dicaNome} autoComplete="off" />
        <Selecao {...campo('solicitantePapel')} rotulo="Papel do solicitante" opcoes={OPCOES_PAPEL} />
      </Secao>
      {somenteSolicitante ? null : (
        <>
          <Secao titulo="Classificação">
            <CampoTexto {...campo('titulo')} rotulo="Título (obrigatório)" obrigatorio autoComplete="off" />
            <GrupoOpcoes
              nome={idDoCampo('tipo')}
              legenda="Tipo (obrigatório)"
              opcoes={OPCOES_TIPO}
              valor={valores.tipo}
              onMudar={(tipo) => mudar((v) => ({ ...v, tipo }))}
              erro={erros.tipo}
            />
            <Selecao {...campo('linhaServicoProvavel')} rotulo="Linha de serviço provável" opcoes={OPCOES_LINHA} />
            <GrupoOpcoes
              nome={idDoCampo('urgencia')}
              legenda="Urgência"
              opcoes={OPCOES_URGENCIA}
              valor={valores.urgencia}
              onMudar={(urgencia) => mudar((v) => ({ ...v, urgencia }))}
              erro={erros.urgencia}
            />
            <CampoTexto {...campo('justificativaUrgencia')} rotulo="Justificativa da urgência" autoComplete="off" />
          </Secao>
          <Secao titulo="Descrição">
            <AreaTexto {...campo('contexto')} rotulo="Contexto" rows={4} />
            <AreaTexto {...campo('descricaoProblema')} rotulo="Descrição do problema" rows={4} />
            <AreaTexto {...campo('impactoPercebido')} rotulo="Impacto percebido" rows={4} />
          </Secao>
          <Secao titulo="Anexos (referências)">
            <Dica id="anexos">{TEXTOS_DEMANDA.dicaAnexos}</Dica>
            {valores.anexos.map((a, i) => {
              const n = i + 1;
              return (
                <fieldset key={a.chave} className="flex flex-col gap-3 rounded-campo border border-linha p-4">
                  <legend className="font-medium">{`Anexo ${n}`}</legend>
                  <Selecao
                    id={idDoCampo(`anexos.${i}.tipo`)}
                    rotulo="Tipo"
                    opcoes={OPCOES_TIPO_ANEXO}
                    value={a.tipo}
                    erro={erros[`anexos.${i}.tipo`]}
                    onChange={(e) => mudarAnexo(a.chave, { tipo: e.target.value as TipoAnexo })}
                  />
                  <CampoTexto
                    id={idDoCampo(`anexos.${i}.referencia`)}
                    rotulo="Referência"
                    value={a.referencia}
                    erro={erros[`anexos.${i}.referencia`]}
                    autoComplete="off"
                    onChange={(e) => mudarAnexo(a.chave, { referencia: e.target.value })}
                  />
                  <CampoTexto
                    id={idDoCampo(`anexos.${i}.descricao`)}
                    rotulo="Descrição"
                    value={a.descricao}
                    erro={erros[`anexos.${i}.descricao`]}
                    autoComplete="off"
                    onChange={(e) => mudarAnexo(a.chave, { descricao: e.target.value })}
                  />
                  <div>
                    <Botao variante="secundario" onClick={() => removerAnexo(i)}>{`Remover anexo ${n}`}</Botao>
                  </div>
                </fieldset>
              );
            })}
            <div className="flex flex-col items-start gap-1">
              <Botao
                id={ID_ADICIONAR_ANEXO}
                variante="secundario"
                onClick={adicionarAnexo}
                disabled={noLimite}
                aria-describedby={noLimite || erros.anexos ? `${ID_ADICIONAR_ANEXO}-dica` : undefined}
              >
                Adicionar anexo
              </Botao>
              {noLimite || erros.anexos ? (
                <p id={`${ID_ADICIONAR_ANEXO}-dica`} className={`text-sm ${erros.anexos ? 'font-medium text-erro' : 'text-tinta-media'}`}>
                  {TEXTOS_DEMANDA.erroLimiteAnexos}
                </p>
              ) : null}
            </div>
          </Secao>
        </>
      )}
    </>
  );
}

// Confirmação ao sair com conteúdo não salvo (03, 2.5). Clique em link interno com a tela suja abre o diálogo; "Sair
// sem salvar" segue para o link. Fechar ou recarregar a aba usa o aviso do próprio navegador (beforeunload). O ouvinte
// fica na janela, em captura: vem antes do clique do <Link> do Next, que nem chega a navegar.
export function useConfirmarSaida(sujo: boolean): { dialogo: ReactNode; liberar: () => void } {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);
  const liberado = useRef(false);

  useEffect(() => {
    if (!sujo) return;
    const aoClicar = (e: MouseEvent) => {
      if (liberado.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      e.preventDefault();
      e.stopPropagation();
      setDestino(`${url.pathname}${url.search}${url.hash}`);
    };
    const aoSair = (e: BeforeUnloadEvent) => {
      if (liberado.current) return;
      e.preventDefault();
    };
    window.addEventListener('click', aoClicar, true);
    window.addEventListener('beforeunload', aoSair);
    return () => {
      window.removeEventListener('click', aoClicar, true);
      window.removeEventListener('beforeunload', aoSair);
    };
  }, [sujo]);

  const liberar = useCallback(() => {
    liberado.current = true;
  }, []);

  const dialogo = (
    <DialogoConfirmacao
      aberto={destino !== null}
      titulo={TEXTOS_DEMANDA.sairTitulo}
      rotuloConfirmar={TEXTOS_DEMANDA.sairConfirmar}
      rotuloCancelar={TEXTOS_DEMANDA.sairCancelar}
      perigo
      onCancelar={() => setDestino(null)}
      onConfirmar={() => {
        const para = destino;
        liberado.current = true;
        setDestino(null);
        if (para) router.push(para);
      }}
    >
      <p>{TEXTOS_DEMANDA.sairTexto}</p>
    </DialogoConfirmacao>
  );
  return { dialogo, liberar };
}
