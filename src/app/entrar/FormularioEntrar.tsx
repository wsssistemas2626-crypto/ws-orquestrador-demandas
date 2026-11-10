'use client';

// T01 Entrar (03, T01): e-mail e senha → código do aplicativo (ou código de recuperação) → destino. Conta sem 2FA ativo
// recebe do Better Auth uma sessão curta e vai a /configurar-2fa (C-08). A verificação nunca "confia neste
// dispositivo" (C-05: `trustDevice: false`, e o servidor troca qualquer outro valor por false). O destino chega pronto
// do servidor, já passado por destinoSeguro (C-40). Não há cadastro nem "esqueci minha senha" (C-03).
//
// Validação ao enviar (03, 2.5): campo vazio ou código fora de 6 dígitos vai ao Resumo de erros, com aria-invalid no
// campo; a recusa do servidor vai a um alerta de envio (role="alert") que recebe o foco. O texto é sempre o da 03.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alerta } from '../../components/Alerta';
import { Botao } from '../../components/Botao';
import { CaixaSelecao } from '../../components/CaixaSelecao';
import { CampoTexto } from '../../components/CampoTexto';
import { ResumoErros } from '../../components/ResumoErros';
import { authClient, codigoDeSeisDigitos, MENSAGENS_ENTRAR, mensagemDoErro, type ErroDoAuth } from '../../lib/auth-cliente';
import { MENSAGENS_ACESSO } from '../../modules/acesso/mensagens';

type Passo = 'senha' | 'codigo' | 'recuperacao';
// `campos` vazio: recusa do servidor (alerta de envio). Com campos: validação no envio (Resumo de erros).
type Erro = { mensagem: string; campos: string[]; resumo: { idCampo: string; mensagem: string }[] };

const ID_EMAIL = 'entrar-email';
const ID_SENHA = 'entrar-senha';
const ID_MOSTRAR = 'entrar-mostrar-senha';
const ID_CODIGO = 'entrar-codigo';
const ID_RECUPERACAO = 'entrar-codigo-recuperacao';

const erroDeCampo = (mensagem: string, campos: string[]): Erro => ({ mensagem, campos, resumo: [{ idCampo: campos[0]!, mensagem }] });
const erroDeEnvio = (mensagem: string): Erro => ({ mensagem, campos: [], resumo: [] });

type Props = { destino: string; sessaoTerminou: boolean };

export function FormularioEntrar({ destino, sessaoTerminou }: Props) {
  const router = useRouter();
  const [passo, setPasso] = useState<Passo>('senha');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [recuperacao, setRecuperacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<Erro | null>(null);
  // Para onde vai o foco: o título (null) ou o campo de id `alvo`. `n` muda a cada pedido, para repetir o mesmo alvo.
  const [foco, setFoco] = useState<{ alvo: string | null; n: number }>({ alvo: null, n: 0 });
  const titulo = useRef<HTMLHeadingElement>(null);
  const alertaDeEnvio = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = foco.alvo ? document.getElementById(foco.alvo) : titulo.current;
    el?.focus();
  }, [foco]);

  useEffect(() => {
    if (erro && erro.campos.length === 0) alertaDeEnvio.current?.focus();
  }, [erro]);

  const focar = (alvo: string | null) => setFoco((f) => ({ alvo, n: f.n + 1 }));
  const erroDoCampo = (id: string) => (erro?.campos.includes(id) ? erro.mensagem : undefined);

  function recusado(etapa: Passo, e: ErroDoAuth) {
    const m = mensagemDoErro(etapa, e);
    if (m.expirou) {
      // O passo do código acabou: volta ao passo 1 com o e-mail preenchido (03, T01).
      setPasso('senha');
      setCodigo('');
      setRecuperacao('');
    }
    setErro(erroDeEnvio(m.mensagem));
  }

  async function enviarSenha(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando) return;
    const vazios = [email.trim() ? null : ID_EMAIL, senha ? null : ID_SENHA].filter((x): x is string => x !== null);
    if (vazios.length > 0) {
      setErro(erroDeCampo(MENSAGENS_ENTRAR.preencha, vazios));
      return;
    }
    setEnviando(true);
    let saindo = false;
    try {
      const r = await authClient().signIn.email({ email: email.trim(), password: senha });
      if (r.error) {
        recusado('senha', r.error);
        return;
      }
      setSenha('');
      if ((r.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
        setErro(null);
        setPasso('codigo');
        focar(null);
        return;
      }
      // Sem twoFactorRedirect, a conta ainda não tem 2FA: a sessão curta só abre /configurar-2fa.
      saindo = true;
      router.replace('/configurar-2fa');
    } catch {
      recusado('senha', null);
    } finally {
      if (!saindo) setEnviando(false);
    }
  }

  async function enviarCodigo(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (enviando || passo === 'senha') return;
    const etapa = passo;
    const doAplicativo = etapa === 'codigo' ? codigoDeSeisDigitos(codigo) : null;
    const deRecuperacao = recuperacao.trim();
    if (etapa === 'codigo' && !doAplicativo) {
      setErro(erroDeCampo(MENSAGENS_ENTRAR.seisDigitos, [ID_CODIGO]));
      return;
    }
    if (etapa === 'recuperacao' && !deRecuperacao) {
      setErro(erroDeCampo(MENSAGENS_ENTRAR.recuperacaoInvalida, [ID_RECUPERACAO]));
      return;
    }
    setEnviando(true);
    let saindo = false;
    try {
      const cliente = authClient();
      const r =
        etapa === 'codigo'
          ? await cliente.twoFactor.verifyTotp({ code: doAplicativo!, trustDevice: false })
          : await cliente.twoFactor.verifyBackupCode({ code: deRecuperacao, trustDevice: false });
      if (r.error) {
        recusado(etapa, r.error);
        return;
      }
      saindo = true;
      router.replace(destino);
    } catch {
      recusado(etapa, null);
    } finally {
      if (!saindo) setEnviando(false);
    }
  }

  function trocarModo() {
    const novo: Passo = passo === 'codigo' ? 'recuperacao' : 'codigo';
    setErro(null);
    setPasso(novo);
    focar(novo === 'codigo' ? ID_CODIGO : ID_RECUPERACAO);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 ref={titulo} tabIndex={-1}>
        {passo === 'senha' ? 'Entrar' : 'Código de verificação'}
      </h1>
      {sessaoTerminou && passo === 'senha' ? <Alerta tipo="atencao">{MENSAGENS_ACESSO.nao_autenticado}</Alerta> : null}
      {erro && erro.campos.length > 0 ? <ResumoErros erros={erro.resumo} /> : null}
      {erro && erro.campos.length === 0 ? (
        <div ref={alertaDeEnvio} tabIndex={-1}>
          <Alerta tipo="erro" envio>
            {erro.mensagem}
          </Alerta>
        </div>
      ) : null}

      {passo === 'senha' ? (
        <form noValidate onSubmit={enviarSenha} aria-busy={enviando} className="flex flex-col gap-4">
          <CampoTexto
            id={ID_EMAIL}
            name="email"
            type="email"
            rotulo="E-mail (obrigatório)"
            obrigatorio
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erroDoCampo(ID_EMAIL)}
          />
          <CampoTexto
            id={ID_SENHA}
            name="password"
            type={mostrarSenha ? 'text' : 'password'}
            rotulo="Senha (obrigatório)"
            obrigatorio
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            erro={erroDoCampo(ID_SENHA)}
          />
          <CaixaSelecao id={ID_MOSTRAR} rotulo="Mostrar senha" checked={mostrarSenha} onChange={(e) => setMostrarSenha(e.target.checked)} />
          <div>
            <Botao type="submit" carregando={enviando} textoCarregando="Verificando…" className="w-full">
              Continuar
            </Botao>
          </div>
        </form>
      ) : (
        <form noValidate onSubmit={enviarCodigo} aria-busy={enviando} className="flex flex-col gap-4">
          {passo === 'codigo' ? (
            <>
              <p>Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
              <CampoTexto
                id={ID_CODIGO}
                name="code"
                rotulo="Código (obrigatório)"
                obrigatorio
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                erro={erroDoCampo(ID_CODIGO)}
              />
            </>
          ) : (
            <>
              <p>
                Digite um dos códigos de recuperação que você guardou ao configurar a verificação. Cada código vale uma vez.
              </p>
              <CampoTexto
                id={ID_RECUPERACAO}
                name="backupCode"
                rotulo="Código de recuperação (obrigatório)"
                obrigatorio
                autoComplete="one-time-code"
                spellCheck={false}
                value={recuperacao}
                onChange={(e) => setRecuperacao(e.target.value)}
                erro={erroDoCampo(ID_RECUPERACAO)}
              />
            </>
          )}
          <div className="flex flex-col items-center gap-2">
            <Botao type="submit" carregando={enviando} textoCarregando="Verificando…" className="w-full">
              Entrar
            </Botao>
            <Botao variante="link" onClick={trocarModo} disabled={enviando}>
              {passo === 'codigo' ? 'Usar um código de recuperação' : 'Usar o código do aplicativo'}
            </Botao>
          </div>
        </form>
      )}
    </div>
  );
}
