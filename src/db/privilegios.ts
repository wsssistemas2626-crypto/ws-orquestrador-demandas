// Fonte da guarda de privilégios (ADR-03, C-34): o que o papel do app pode em cada tabela do esquema public.
// Toda tabela nova entra aqui e no GRANT da migration custom; `privilegios.test.ts` quebra se um dos dois faltar.
export const PAPEL_APP = 'orquestrador_app';

export type RegraPrivilegio = {
  tabela: string;
  privilegios: Array<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'>;
  colunasUpdate?: string[];
};

const TUDO = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as const;

export const PRIVILEGIOS: RegraPrivilegio[] = [
  ...['user', 'session', 'account', 'verification', 'two_factor', 'bloqueio_verificacao'].map((tabela) => ({
    tabela,
    privilegios: [...TUDO],
  })),
  { tabela: 'token_servico', privilegios: ['SELECT', 'INSERT'], colunasUpdate: ['revogado_em'] },
  { tabela: 'evento', privilegios: ['SELECT', 'INSERT'] },
];

export const SEQUENCIAS: Array<{ nome: string; privilegios: Array<'USAGE'> }> = [];
