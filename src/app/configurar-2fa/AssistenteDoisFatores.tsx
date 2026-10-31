'use client';

// T02 Configurar verificação em duas etapas (03, T02): senha → QR code ou chave → primeiro código → códigos de
// recuperação → fila. A ativação é do plugin twoFactor do Better Auth: `enable` com a senha devolve o totpURI e os
// códigos de recuperação, e o 2FA só fica ativo com o primeiro código certo (`skipVerificationOnEnable: false`, T08).
//
// O QR code é desenhado aqui, a partir do totpURI (src/lib/qr.ts): o segredo não vai a nenhum serviço de imagem. A
// chave em texto é a alternativa ao QR (agrupada de 4 em 4; o botão copia sem os espaços). Os códigos de recuperação
// aparecem só neste passo e não ficam guardados em lugar nenhum da página depois de sair dela.
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Alerta } from '../../components/Alerta';
import { Botao } from '../../components/Botao';
import { CaixaSelecao } from '../../components/CaixaSelecao';
import { CampoTexto } from '../../components/CampoTexto';
import { RegiaoAviso } from '../../components/RegiaoAviso';
import { ResumoErros } from '../../components/ResumoErros';
import {
  agruparDeQuatro,
  authClient,
  codigoDeSeisDigitos,
  MENSAGENS_2FA,
  mensagemDoErro,
  segredoDoTotpUri,
  type ErroDoAuth,
  type EtapaDoAuth,
} from '../../lib/auth-cliente';
import { MENSAGEM_ERRO_INTERNO } from '../../lib/erros';
import { caminhoSvgDoQr, gerarQr } from '../../lib/qr';
import { MENSAGENS_ACESSO } from '../../modules/acesso/mensagens';

type Passo = 1 | 2 | 3;
type Ativacao = { uri: string; segredo: string; codigos: string[] };
type Erro = { mensagem: string; campos: string[]; resumo: { idCampo: string; mensagem: string }[] };

const TITULOS: Readonly<Record<Passo, string>> = {
  1: 'Passo 1 de 3 — Confirme sua senha',
  2: 'Passo 2 de 3 — Ligue o aplicativo autenticador',
  3: 'Passo 3 de 3 — Guarde os códigos de recuperação',
};
const ALT_QR = 'QR code para adicionar o WS Orquestrador de Demandas ao aplicativo autenticador';
const NOME_ARQUIVO = 'codigos-de-recuperacao-ws-orquestrador.txt';
// Destino ao concluir: a fila mostra "Verificação em duas etapas ativada." (03, T02, Sucesso).
const DESTINO_AO_CONCLUIR = '/demandas?aviso=2fa-ativado';

const ID_SENHA = 'dois-fatores-senha';
const ID_CODIGO = 'dois-fatores-codigo';
const ID_GUARDEI = 'dois-fatores-guardei';

const erroDeCampo = (mensagem: string, id: string): Erro => ({ mensagem, campos: [id], resumo: [{ idCampo: id, mensagem }] });
const erroDeEnvio = (mensagem: string): Erro => ({ mensagem, campos: [], resumo: [] });

function qrDe(uri: string): { lado: number; d: string } | null {
  try {
    return caminhoSvgDoQr(gerarQr(uri).modulos);
  } catch {
    // Acima da capacidade: fica só a chave em texto, que é a alternativa ao QR.
    return null;
  }
}

export function AssistenteDoisFatores() {
  const router = useRouter();
  const [passo, setPasso] = useState<Passo>(1);
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [guardei, setGuardei] = useState(false);
  const [ativacao, setAtivacao] = useState<Ativacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);
  const [aviso, setAviso] = useState('');
  // 0: o h1 (primeira carga); depois, o h2 do passo novo (03, T02: "foco vai ao título do passo novo").
  const [foco, setFoco] = useState(0);
  const titulo = useRef<HTMLHeadingElement>(null);
  const tituloDoPasso = useRef<HTMLHeadingElement>(null);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);
  const qr = useMemo(() => (ativacao ? qrDe(ativacao.uri) : null), [ativacao]);

  useEffect(() => {
    (foco === 0 ? titulo.current : tituloDoPasso.current)?.focus();
  }, [foco]);

  useEffect(() => {
    if (erro && erro.campos.length === 0) alertaDeEnvio.current?.focus();
  }, [erro]);

  const irPara = (p: Passo) => {
    setErro(null);
    setAviso('');
    setPasso(p);
    setFoco((n) => n + 1);
  };
  const erroDoCampo = (id: string) => (erro?.campos.includes(id) ? erro.mensagem : undefined);
  const recusado = (etapa: EtapaDoAuth, e: ErroDoAuth) => setErro(erroDeEnvio(mensagemDoErro(etapa, e).mensagem));

  async function confirmarSenha(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      const r = await authClient().twoFactor.enable({ password: senha });
      if (r.error) {
        recusado('ativar', r.error);
        return;
      }
      // Só TOTP está configurado (C-03); qualquer outra resposta é erro do servidor.
      const segredo = r.data.method === 'totp' ? segredoDoTotpUri(r.data.totpURI) : null;
      if (r.data.method !== 'totp' || !segredo) {
        setErro(erroDeEnvio(MENSAGEM_ERRO_INTERNO));
        return;
      }
      setAtivacao({ uri: r.data.totpURI, segredo, codigos: r.data.backupCodes });
      setSenha('');
      irPara(2);
    } catch {
      recusado('ativar', null);
    } finally {
      setEnviando(false);
    }
  }

  async function verificar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const c = codigoDeSeisDigitos(codigo);
    if (!c) {
      setErro(erroDeCampo(MENSAGENS_2FA.codigoInvalido, ID_CODIGO));
      return;
    }
    setEnviando(true);
    try {
      const r = await authClient().twoFactor.verifyTotp({ code: c, trustDevice: false });
      if (r.error) {
        recusado('verificarAtivacao', r.error);
        return;
      }
      setCodigo('');
      irPara(3);
    } catch {
      recusado('verificarAtivacao', null);
    } finally {
      setEnviando(false);
    }
  }

  async function copiar(texto: string, sucesso: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(sucesso);
    } catch {
      setAviso(MENSAGENS_2FA.naoCopiou);
    }
  }

  function baixar(codigos: readonly string[]) {
    const url = URL.createObjectURL(new Blob([`${codigos.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = NOME_ARQUIVO;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function concluir(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (!guardei) {
      setErro(erroDeCampo(MENSAGENS_2FA.marqueQueGuardou, ID_GUARDEI));
      return;
    }
    setEnviando(true);
    router.replace(DESTINO_AO_CONCLUIR);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 ref={titulo} tabIndex={-1}>
        Configurar verificação em duas etapas
      </h1>
      <p>
        Para proteger as decisões registradas aqui, toda conta usa senha e um código do aplicativo autenticador (por exemplo,
        Google Authenticator ou Microsoft Authenticator).
      </p>
      {passo === 1 ? <Alerta tipo="atencao">{MENSAGENS_ACESSO.sem_2fa}</Alerta> : null}

      <section aria-labelledby="dois-fatores-passo" className="flex flex-col gap-4">
        <h2 id="dois-fatores-passo" ref={tituloDoPasso} tabIndex={-1}>
          {TITULOS[passo]}
        </h2>
        {erro && erro.campos.length > 0 ? <ResumoErros erros={erro.resumo} /> : null}
        {erro && erro.campos.length === 0 ? (
          <div ref={alertaDeEnvio} tabIndex={-1}>
            <Alerta tipo="erro" envio>
              {erro.mensagem}
            </Alerta>
          </div>
        ) : null}

        {passo === 1 ? (
          <form noValidate onSubmit={confirmarSenha} aria-busy={enviando} className="flex flex-col gap-4">
            <CampoTexto
              id={ID_SENHA}
              name="password"
              type="password"
              rotulo="Senha (obrigatório)"
              obrigatorio
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              erro={erroDoCampo(ID_SENHA)}
            />
            <div>
              <Botao type="submit" carregando={enviando} textoCarregando="Verificando…">
                Continuar
              </Botao>
            </div>
          </form>
        ) : null}

        {passo === 2 && ativacao ? (
          <form noValidate onSubmit={verificar} aria-busy={enviando} className="flex flex-col gap-4">
            <p>No aplicativo, escolha adicionar conta e leia o QR code.</p>
            {qr ? (
              <svg
                role="img"
                aria-label={ALT_QR}
                viewBox={`0 0 ${qr.lado} ${qr.lado}`}
                width={200}
                height={200}
                shapeRendering="crispEdges"
                className="border border-borda"
              >
                <rect width={qr.lado} height={qr.lado} fill="#ffffff" />
                <path d={qr.d} fill="#000000" />
              </svg>
            ) : null}
            <p>Não consegue ler o QR code? Digite esta chave no aplicativo:</p>
            <div className="flex flex-wrap items-center gap-3">
              <code id="dois-fatores-chave" className="font-mono text-lg">
                {agruparDeQuatro(ativacao.segredo)}
              </code>
              <Botao variante="secundario" onClick={() => copiar(ativacao.segredo, MENSAGENS_2FA.chaveCopiada)}>
                Copiar chave
              </Botao>
            </div>
            <CampoTexto
              id={ID_CODIGO}
              name="code"
              rotulo="Código de 6 dígitos (obrigatório)"
              obrigatorio
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              erro={erroDoCampo(ID_CODIGO)}
            />
            <div>
              <Botao type="submit" carregando={enviando} textoCarregando="Verificando…">
                Verificar
              </Botao>
            </div>
          </form>
        ) : null}

        {passo === 3 && ativacao ? (
          <form noValidate onSubmit={concluir} aria-busy={enviando} className="flex flex-col gap-4">
            <p>Se perder o celular, cada um destes códigos permite entrar uma vez. Eles aparecem só agora.</p>
            <ul id="dois-fatores-codigos" className="grid max-w-md grid-cols-2 gap-2 font-mono">
              {ativacao.codigos.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Botao variante="secundario" onClick={() => baixar(ativacao.codigos)}>
                Baixar códigos
              </Botao>
              <Botao variante="secundario" onClick={() => copiar(ativacao.codigos.join('\n'), MENSAGENS_2FA.codigosCopiados)}>
                Copiar códigos
              </Botao>
            </div>
            <CaixaSelecao
              id={ID_GUARDEI}
              rotulo="Guardei os códigos em lugar seguro (obrigatório)"
              obrigatorio
              checked={guardei}
              onChange={(e) => setGuardei(e.target.checked)}
              erro={erroDoCampo(ID_GUARDEI)}
            />
            <div>
              <Botao type="submit" disabled={enviando}>
                Concluir
              </Botao>
            </div>
          </form>
        ) : null}
      </section>

      <RegiaoAviso>{aviso}</RegiaoAviso>
    </div>
  );
}
