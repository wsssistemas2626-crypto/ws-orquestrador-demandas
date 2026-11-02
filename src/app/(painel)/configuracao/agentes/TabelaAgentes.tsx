'use client';

// Tabela "Agentes de IA" da T12 (03, T12; RF-19; 04, C-12 e C-26): um interruptor por agente (`button role="switch"`
// com aria-checked e o estado em texto ao lado), na coluna "Situação", e a última mudança ("<nome>, <data>" ou "Nunca
// alterado"). Ligar abre o diálogo da 03 ("Ligar o agente de risco?"); desligar não pede confirmação. Enquanto a mudança
// vai ao servidor, o interruptor mostra "Alterando…" e fica desabilitado; depois, o foco volta a ele. Deu certo: "Agente
// de risco ligado." (ou "desligado.") na região de aviso, e a página relê a última mudança. Falhou: o interruptor fica
// como estava e o alerta de erro, com o foco, diz por quê. Para a administradora, os quatro aparecem desabilitados.
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState, useTransition } from 'react';
import { Alerta } from '../../../../components/Alerta';
import {
  avisoDeAlternancia,
  erroDeAlternar,
  TEXTOS_AGENTES,
  textoDoDialogo,
  tituloDoDialogo,
  type LinhaAgente,
} from '../../../../components/dados-dos-agentes';
import { DialogoConfirmacao } from '../../../../components/DialogoConfirmacao';
import { Interruptor } from '../../../../components/Interruptor';
import { Tabela } from '../../../../components/Tabela';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import type { Agente } from '../../../../modules/acesso/ator';
import { alternarAgenteNoPainel } from './acoes';
import { useAviso } from './AvisoDaTela';

const idDoInterruptor = (a: Agente): string => `interruptor-${a}`;

type Props = { linhas: LinhaAgente[]; podeAlterar: boolean };

export function TabelaAgentes({ linhas, podeAlterar }: Props) {
  const router = useRouter();
  const [, iniciarTransicao] = useTransition();
  const { avisar, limpar } = useAviso();
  const t = TEXTOS_AGENTES;

  // O estado mostrado: o do servidor, trocado pela resposta de cada mudança até a página reler. A troca vale só sobre a
  // leitura em que foi feita; com a leitura nova, vale de novo o servidor.
  const doServidor = linhas.map((l) => `${l.agente}:${l.ligado}`).join(',');
  const [troca, setTroca] = useState<{ base: string; ligados: Partial<Record<Agente, boolean>> }>({ base: doServidor, ligados: {} });
  const ligados = troca.base === doServidor ? troca.ligados : {};

  const [confirmando, setConfirmando] = useState<Agente | null>(null);
  // O título do diálogo continua o do último agente enquanto ele fecha.
  const [noDialogo, setNoDialogo] = useState<Agente>('risco');
  const [ocupado, setOcupado] = useState<Agente | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [foco, setFoco] = useState<{ agente: Agente; n: number } | null>(null);
  const alertaDeErro = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (erro) alertaDeErro.current?.focus();
  }, [erro]);

  useEffect(() => {
    if (foco) document.getElementById(idDoInterruptor(foco.agente))?.focus();
  }, [foco]);

  const estaLigado = (l: LinhaAgente): boolean => ligados[l.agente] ?? l.ligado;

  async function alternar(agente: Agente, ligar: boolean) {
    if (ocupado || !podeAlterar) return;
    setOcupado(agente);
    setErro(null);
    limpar();
    let falha: string | null = null;
    try {
      const r = await alternarAgenteNoPainel({ agente, ligado: ligar });
      if (r.ok) {
        const { agente: alterado, ligado } = r.dados;
        setTroca((atual) => ({ base: doServidor, ligados: { ...(atual.base === doServidor ? atual.ligados : {}), [alterado]: ligado } }));
        avisar(avisoDeAlternancia(r.dados.agente, r.dados.ligado));
        iniciarTransicao(() => router.refresh());
      } else {
        falha = erroDeAlternar(agente, ligar, r);
      }
    } catch {
      falha = MENSAGEM_ERRO_INTERNO;
    } finally {
      setOcupado(null);
    }
    // O interruptor ficou desabilitado durante o envio e perdeu o foco: no erro, o foco vai ao alerta; senão, volta a ele.
    if (falha) setErro(falha);
    else setFoco((f) => ({ agente, n: (f?.n ?? 0) + 1 }));
  }

  function aoAlternar(l: LinhaAgente) {
    if (estaLigado(l)) {
      void alternar(l.agente, false);
      return;
    }
    setNoDialogo(l.agente);
    setConfirmando(l.agente);
  }

  function confirmar() {
    const agente = confirmando;
    setConfirmando(null);
    if (agente) void alternar(agente, true);
  }

  const celulas = linhas.map((l) => [
    l.rotulo,
    <Interruptor
      key="interruptor"
      id={idDoInterruptor(l.agente)}
      rotulo={l.rotulo}
      ligado={estaLigado(l)}
      onAlternar={() => aoAlternar(l)}
      desabilitado={!podeAlterar}
      ocupado={ocupado === l.agente}
    />,
    l.ultimaMudanca ? (
      <Fragment key="mudanca">
        {l.ultimaMudanca.quem ? `${l.ultimaMudanca.quem}, ` : null}
        <time dateTime={l.ultimaMudanca.iso}>{l.ultimaMudanca.quando}</time>
      </Fragment>
    ) : (
      t.nuncaAlterado
    ),
  ]);

  return (
    <>
      {erro ? (
        <div ref={alertaDeErro} tabIndex={-1}>
          <Alerta tipo="erro" envio>
            <p>{erro}</p>
          </Alerta>
        </div>
      ) : null}
      <Tabela legenda={t.legendaTabela} rotuloRegiao={t.legendaTabela} colunas={t.colunas} linhas={celulas} chaves={linhas.map((l) => l.agente)} />
      <DialogoConfirmacao
        aberto={confirmando !== null}
        titulo={tituloDoDialogo(noDialogo)}
        rotuloConfirmar={t.ligarAgente}
        rotuloCancelar={t.cancelar}
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(null)}
      >
        <p>{textoDoDialogo(noDialogo)}</p>
      </DialogoConfirmacao>
    </>
  );
}
