// Cliente do Better Auth no navegador (T37), com o plugin de dois fatores, e o que as telas T01 e T02 fazem com a
// resposta. O cliente nasce na primeira chamada, já no navegador: importar o módulo (no servidor, no `next build` ou no
// teste) não cria nada nem lê variável de ambiente. A base é a origem da própria página, a mesma de BETTER_AUTH_URL.
//
// A tela nunca mostra a mensagem do Better Auth (em inglês, e pode mudar de versão): o status e o código decidem o texto,
// que é sempre o da 03 (RNF-10).
import { createAuthClient } from 'better-auth/client';
import { twoFactorClient } from 'better-auth/client/plugins';
import { MENSAGEM_ERRO_INTERNO } from './erros';

function criarCliente() {
  return createAuthClient({ baseURL: window.location.origin, basePath: '/api/auth', plugins: [twoFactorClient()] });
}

let cliente: ReturnType<typeof criarCliente> | null = null;

export function authClient(): ReturnType<typeof criarCliente> {
  cliente ??= criarCliente();
  return cliente;
}

// 03, T01, por inteiro.
export const MENSAGENS_ENTRAR = {
  preencha: 'Preencha o e-mail e a senha.',
  incorretos: 'E-mail ou senha incorretos.',
  seisDigitos: 'O código precisa ter 6 dígitos.',
  codigoInvalido: 'Código inválido ou expirado. Confira se o relógio do celular está certo e tente de novo.',
  recuperacaoInvalida: 'Código de recuperação inválido ou já usado.',
  muitasTentativas: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  tempoAcabou: 'O tempo para digitar o código acabou. Entre de novo.',
} as const;

// 03, T02, por inteiro.
export const MENSAGENS_2FA = {
  senhaIncorreta: 'Senha incorreta.',
  codigoInvalido: 'Código inválido. Confira se o relógio do celular está certo e digite o código atual.',
  marqueQueGuardou: 'Marque que guardou os códigos para concluir.',
  naoCopiou: 'Não foi possível copiar. Selecione os códigos e copie com Ctrl+C.',
  chaveCopiada: 'Chave copiada.',
  codigosCopiados: 'Códigos copiados.',
  ativada: 'Verificação em duas etapas ativada.',
} as const;

// A chamada que falhou: senha do login (sign-in), código do aplicativo no login (verify-totp), código de recuperação
// (verify-backup-code), senha da ativação (enable) e primeiro código da ativação (verify-totp com sessão).
export type EtapaDoAuth = 'senha' | 'codigo' | 'recuperacao' | 'ativar' | 'verificarAtivacao';
export type ErroDoAuth = { status?: number; code?: string } | null | undefined;

// O cookie de dois fatores do login venceu (ou sumiu): o passo do código acabou, e a pessoa volta ao passo 1.
const COOKIE_DE_DOIS_FATORES = /TWO_FACTOR_COOKIE/;

const RECUSA: Readonly<Record<EtapaDoAuth, string>> = {
  senha: MENSAGENS_ENTRAR.incorretos,
  codigo: MENSAGENS_ENTRAR.codigoInvalido,
  recuperacao: MENSAGENS_ENTRAR.recuperacaoInvalida,
  ativar: MENSAGENS_2FA.senhaIncorreta,
  verificarAtivacao: MENSAGENS_2FA.codigoInvalido,
};

export function mensagemDoErro(etapa: EtapaDoAuth, erro: ErroDoAuth): { mensagem: string; expirou: boolean } {
  const status = erro?.status;
  // 429: o limite por IP (C-06) e o bloqueio da verificação por conta (T09) têm o mesmo texto na tela.
  if (status === 429) return { mensagem: MENSAGENS_ENTRAR.muitasTentativas, expirou: false };
  if (status === 400 || status === 401) {
    const expirou = (etapa === 'codigo' || etapa === 'recuperacao') && COOKIE_DE_DOIS_FATORES.test(erro?.code ?? '');
    return expirou ? { mensagem: MENSAGENS_ENTRAR.tempoAcabou, expirou } : { mensagem: RECUSA[etapa], expirou };
  }
  return { mensagem: MENSAGEM_ERRO_INTERNO, expirou: false };
}

// O código do aplicativo, sem os espaços que vêm ao colar ("123 456"); só 6 dígitos ASCII valem.
export function codigoDeSeisDigitos(texto: string): string | null {
  const limpo = texto.replace(/\s+/g, '');
  return /^[0-9]{6}$/.test(limpo) ? limpo : null;
}

export function segredoDoTotpUri(uri: string): string | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== 'otpauth:') return null;
    return u.searchParams.get('secret') || null;
  } catch {
    return null;
  }
}

export function agruparDeQuatro(chave: string): string {
  return chave.match(/.{1,4}/g)?.join(' ') ?? '';
}
