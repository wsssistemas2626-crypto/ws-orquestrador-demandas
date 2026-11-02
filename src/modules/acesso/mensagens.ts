// Mensagens de acesso devolvidas por exigirPessoa, resolverAtor, autorizar e rota() (parecer 1 do 06-T10-tech-lead.md):
// um lugar só, para as cópias não divergirem. As três primeiras são da 03, seção 2.8, por inteiro (G3.11). Nenhuma
// cita dado da sessão, do token, do ator ou da ação.
export const MENSAGENS_ACESSO = {
  nao_autenticado: 'Sua sessão terminou. Entre de novo para continuar.',
  sem_2fa: 'Para usar o painel, configure a verificação em duas etapas.',
  sem_permissao: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.',
  // Fora da 03 (parecer 2 do 06-T10-tech-lead.md): só no corpo da API, para agente.
  token_invalido: 'Token de serviço inválido ou revogado.',
  ambiguo: 'Use só uma forma de autenticação.',
} as const;
