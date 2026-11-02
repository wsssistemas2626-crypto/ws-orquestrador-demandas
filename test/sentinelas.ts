// Valores fictícios que nunca podem aparecer em log, Sentry ou mensagem de erro (C-21, JUR-2026-002, 7.4).
// Um teste joga estes valores na entrada e confere que nenhum deles chega à saída.
export const SENTINELAS = {
  texto: 'SENTINELA-TEXTO-7f3a',
  email: 'sentinela.7f3a@exemplo.test',
  telefone: '(11) 90000-0000',
  token: 'wsod_SENTINELA7f3aSENTINELA7f3a',
  senha: 'SENTINELA-SENHA-7f3a',
  nome: 'Pessoa Ficticia Sentinela',
} as const;

export const contemSentinela = (saida: string) => Object.values(SENTINELAS).some((s) => saida.includes(s));
