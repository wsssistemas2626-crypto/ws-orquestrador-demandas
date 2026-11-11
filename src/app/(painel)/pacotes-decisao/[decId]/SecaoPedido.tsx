'use client';

// Seção "Pedido de Construção" da T11 (03, T11; RF-22; CA-26.3; 04, C-16 e C-28), só com a decisão aprovada completa e
// demanda que não é Estudo (a página decide, por secaoDoPedido). O texto da 03, o aviso de C-28 e a caixa de
// confirmação de que o texto não tem dado pessoal (D3 do 0013) vêm antes do botão. A caixa segue a validação no envio
// (03, 2.5; como a caixa de revisão da decisão): o botão fica habilitado e, com a caixa desmarcada, não chama a Server
// Action, mostra o erro na caixa (aria-describedby) e põe o foco nela; marcar a caixa limpa o erro, e ela continua
// marcada depois de gerar. "Gerar Pedido de Construção" chama a Server Action (POST, nunca GET: a geração grava
// evento); depois, "Baixar <DEC-id>.json" é um link com `download` e o conteúdo exato num `data:` URL, "Copiar JSON" usa
// a área de transferência e o Bloco de JSON mostra o mesmo texto. Recusa: alerta com o texto da 03 e, no 422, a lista da
// API (campo e tipo, sem valor) e a orientação, um parágrafo por linha. Gerado, copiado e a cópia que falha vão à
// região de aviso (role="status"). Nada do pedido é guardado: ao sair da página, gera de novo, e o mesmo pacote gera
// sempre o mesmo pedido (CA-22.2).
import { useEffect, useRef, useState } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { BlocoJson } from '../../../../components/BlocoJson';
import { Botao, classeDoBotao } from '../../../../components/Botao';
import { CaixaSelecao } from '../../../../components/CaixaSelecao';
import { entradaDoPedido, erroDoPedido, hrefDoPedido, TEXTOS_PEDIDO, type ErroDoPedido } from '../../../../components/dados-do-pedido';
import { RegiaoAviso } from '../../../../components/RegiaoAviso';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import { gerarPedidoNoPainel, type PedidoGerado } from './acoes-pedido';

const ID_GERAR = 'gerar-pedido-construcao';
const ID_CONFIRMACAO = 'confirma-sem-dado-pessoal';

export function SecaoPedido({ decId }: { decId: string }) {
  const [gerando, setGerando] = useState(false);
  const [pedido, setPedido] = useState<PedidoGerado | null>(null);
  const [erro, setErro] = useState<ErroDoPedido | null>(null);
  const [aviso, setAviso] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [erroConfirmacao, setErroConfirmacao] = useState('');
  // Cada geração bem-sucedida devolve o foco ao botão, que ficou desabilitado durante o envio.
  const [focoNoBotao, setFocoNoBotao] = useState(0);
  // Cada clique com a caixa desmarcada põe o foco na caixa.
  const [focoNaCaixa, setFocoNaCaixa] = useState(0);
  const alertaDeErro = useRef<HTMLDivElement>(null);
  const t = TEXTOS_PEDIDO;

  useEffect(() => {
    if (erro) alertaDeErro.current?.focus();
  }, [erro]);

  useEffect(() => {
    if (focoNoBotao > 0) document.getElementById(ID_GERAR)?.focus();
  }, [focoNoBotao]);

  useEffect(() => {
    if (focoNaCaixa > 0) document.getElementById(ID_CONFIRMACAO)?.focus();
  }, [focoNaCaixa]);

  async function gerar() {
    if (gerando) return;
    const entrada = entradaDoPedido(decId, confirmado);
    if (!entrada) {
      setErroConfirmacao(t.semConfirmacao);
      setFocoNaCaixa((n) => n + 1);
      return;
    }
    setGerando(true);
    setErro(null);
    setAviso('');
    try {
      const r = await gerarPedidoNoPainel(entrada);
      if (r.ok) {
        setPedido(r.dados);
        setAviso(t.gerado);
        setFocoNoBotao((n) => n + 1);
      } else {
        setPedido(null);
        setErro(erroDoPedido(r));
      }
    } catch {
      setPedido(null);
      setErro({ texto: MENSAGEM_ERRO_INTERNO, erros: [], orientacao: [] });
    } finally {
      setGerando(false);
    }
  }

  async function copiar(json: string) {
    try {
      await navigator.clipboard.writeText(json);
      setAviso(t.copiado);
    } catch {
      setAviso(t.naoCopiou);
    }
  }

  return (
    <div className="flex flex-col gap-4" aria-busy={gerando}>
      <p>{t.texto}</p>
      <Alerta tipo="atencao">
        <p>{t.avisoDadoPessoal}</p>
      </Alerta>
      <CaixaSelecao
        id={ID_CONFIRMACAO}
        rotulo={t.confirmacao}
        obrigatorio
        checked={confirmado}
        erro={erroConfirmacao || undefined}
        onChange={(e) => {
          setConfirmado(e.target.checked);
          if (e.target.checked) setErroConfirmacao('');
        }}
      />
      <div>
        <Botao id={ID_GERAR} carregando={gerando} textoCarregando={t.gerando} onClick={() => void gerar()}>
          {t.gerar}
        </Botao>
      </div>
      {erro ? (
        <div ref={alertaDeErro} tabIndex={-1}>
          <Alerta tipo="erro" envio className="flex flex-col gap-2">
            <p>{erro.texto}</p>
            {erro.erros.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1 pl-6">
                {erro.erros.map((e, i) => (
                  <li key={`${i}-${e}`} className="break-words">
                    {e}
                  </li>
                ))}
              </ul>
            ) : null}
            {erro.orientacao.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </Alerta>
        </div>
      ) : null}
      {pedido ? (
        <>
          <div className="flex flex-wrap gap-3">
            <a href={hrefDoPedido(pedido.json)} download={pedido.nomeArquivo} className={classeDoBotao('secundario')}>
              {t.baixar(pedido.nomeArquivo)}
            </a>
            <Botao variante="secundario" onClick={() => void copiar(pedido.json)}>
              {t.copiar}
            </Botao>
          </div>
          <BlocoJson rotulo={t.rotuloBloco} conteudo={pedido.json} />
          <p className="text-sm text-tinta-media">{t.nota}</p>
        </>
      ) : null}
      <RegiaoAviso>{aviso}</RegiaoAviso>
    </div>
  );
}
