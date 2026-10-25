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
  // T05. A demanda é mutável, mas o UPDATE é por coluna: id, autor_tipo, autor_id e criada_em não mudam (C-11).
  {
    tabela: 'demanda',
    privilegios: ['SELECT', 'INSERT'],
    colunasUpdate: [
      'titulo',
      'tipo',
      'status',
      'solicitante_nome',
      'solicitante_papel',
      'linha_servico_provavel',
      'urgencia',
      'justificativa_urgencia',
      'contexto',
      'descricao_problema',
      'impacto_percebido',
      'anexos',
      'duvidas_entrada',
      'rascunho_agente',
      'atualizada_em',
    ],
  },
  // Só o expurgo muda a entrada bruta (C-31, C-34).
  { tabela: 'entrada_bruta', privilegios: ['SELECT', 'INSERT'], colunasUpdate: ['texto', 'origem', 'expurgada_em'] },
  { tabela: 'entrada_pendente', privilegios: [...TUDO] },
  // Versões e decisão: só de inclusão (RF-11, CA-11.2).
  ...['especificacao_tecnica', 'parecer_risco', 'pacote_decisao', 'aprovacao', 'decisao'].map((tabela) => ({
    tabela,
    privilegios: ['SELECT', 'INSERT'] as RegraPrivilegio['privilegios'],
  })),
];

// USAGE dá nextval; setval (UPDATE) e a leitura direta (SELECT) ficam com o migrator.
export const SEQUENCIAS: Array<{ nome: string; privilegios: Array<'USAGE'> }> = [{ nome: 'demanda_seq', privilegios: ['USAGE'] }];
