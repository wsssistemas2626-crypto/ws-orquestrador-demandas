'use client';

// "Mudar status" da T05 (03, T05; RF-07, CA-07.3). As opções chegam do servidor (as transições da tabela do RF-07, com a
// opção que a regra impede indisponível e explicada); a regra que vale é a do servidor, pela Server Action. Validação ao
// enviar (03, 2.5): sem opção marcada, o Resumo de erros recebe o foco. Conflito (409) vira alerta de erro com
// "Não foi possível concluir: ", que recebe o foco. Sucesso: "Status alterado para …" na Região de aviso, e a página é
// lida de novo no servidor (selo, opções e histórico). A Região de aviso fica montada também no status final, para o
// anúncio não se perder quando o grupo some.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { Botao } from '../../../../components/Botao';
import { errosDoResultado, idDoCampo, type ErroDeCampo } from '../../../../components/formulario';
import { GrupoOpcoes, opcaoMarcavel, type OpcaoDoGrupo } from '../../../../components/GrupoOpcoes';
import { RegiaoAviso } from '../../../../components/RegiaoAviso';
import { ResumoErros } from '../../../../components/ResumoErros';
import { ROTULO_STATUS } from '../../../../components/rotulos';
import { MENSAGEM_ERRO_INTERNO } from '../../../../lib/erros';
import type { Status } from '../../../../modules/demandas/schemas';
import { mudarStatusNoPainel } from './acoes';
import { ID_SECAO, TEXTOS_DETALHE } from './detalhe';

const NOME_DO_GRUPO = idDoCampo('novoStatus');
const SEM_ERROS: readonly ErroDeCampo[] = [];

type Props = { id: string; statusAtual: Status; opcoes: readonly OpcaoDoGrupo[]; final: string | null; dicaFixa: string | null };

export function MudarStatus({ id, statusAtual, opcoes, final, dicaFixa }: Props) {
  const router = useRouter();
  const [escolhido, setEscolhido] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errosDeCampo, setErrosDeCampo] = useState<readonly ErroDeCampo[]>(SEM_ERROS);
  const [alerta, setAlerta] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const alertaDeEnvio = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alerta) alertaDeEnvio.current?.focus();
  }, [alerta]);

  // Chegou a um status final: o botão sumiu, e o foco vai ao título da seção, para não cair no fim da página.
  useEffect(() => {
    if (final && aviso && document.activeElement === document.body) document.getElementById(ID_SECAO.status)?.focus();
  }, [final, aviso]);

  const primeiraDisponivel = opcoes.find((o) => !o.desabilitada) ?? opcoes[0];
  const erroDoGrupo = errosDeCampo[0]?.mensagem;

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    setAlerta(null);
    if (!opcaoMarcavel(opcoes, escolhido)) {
      setErrosDeCampo([
        {
          campo: 'novoStatus',
          idCampo: primeiraDisponivel ? `${NOME_DO_GRUPO}-${primeiraDisponivel.valor}` : NOME_DO_GRUPO,
          rotulo: TEXTOS_DETALHE.novoStatus,
          mensagem: TEXTOS_DETALHE.escolhaStatus,
        },
      ]);
      return;
    }
    setErrosDeCampo(SEM_ERROS);
    setAviso('');
    setEnviando(true);
    try {
      const r = await mudarStatusNoPainel({ id, status: escolhido });
      if (r.ok) {
        setEscolhido('');
        setAviso(TEXTOS_DETALHE.statusAlterado(ROTULO_STATUS[r.dados.status]));
        router.refresh();
        return;
      }
      // Status fora da enumeração (400 com campos) só chega por envio adulterado: a tela pede a escolha de novo.
      const e = errosDoResultado(r);
      setAlerta(e.alerta ?? TEXTOS_DETALHE.escolhaStatus);
    } catch {
      setAlerta(MENSAGEM_ERRO_INTERNO);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <RegiaoAviso visivel={aviso !== ''}>{aviso}</RegiaoAviso>
      <p>{TEXTOS_DETALHE.statusAtual(ROTULO_STATUS[statusAtual])}</p>
      {dicaFixa ? <p className="text-sm text-texto-suave">{dicaFixa}</p> : null}
      {final ? (
        <p>{final}</p>
      ) : (
        <>
          <ResumoErros erros={errosDeCampo} />
          {alerta ? (
            <div ref={alertaDeEnvio} tabIndex={-1}>
              <Alerta tipo="erro" envio>
                {alerta}
              </Alerta>
            </div>
          ) : null}
          <form noValidate onSubmit={enviar} aria-busy={enviando} className="flex flex-col items-start gap-4">
            <GrupoOpcoes nome={NOME_DO_GRUPO} legenda={TEXTOS_DETALHE.novoStatus} opcoes={opcoes} erro={erroDoGrupo} valor={escolhido} onMudar={setEscolhido} />
            <Botao type="submit" carregando={enviando} textoCarregando={TEXTOS_DETALHE.mudando}>
              {TEXTOS_DETALHE.mudarStatus}
            </Botao>
          </form>
        </>
      )}
    </div>
  );
}
