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
  // 0.4.0 (AN-10): só de inclusão; nenhuma coluna em `colunasUpdate`.
  { tabela: 'andamento_construcao', privilegios: ['SELECT', 'INSERT'] },
  // T05. A demanda é mutável, mas o UPDATE é por coluna: id, autor_tipo, autor_id, criada_em e (desde a T06, parecer 1
  // da 06-T05-tech-lead.md) rascunho_agente não mudam (C-11).
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
  // T06. Interruptor e teto: o app liga, desliga, troca modelo e teto; não cria nem apaga agente nem a linha do teto,
  // e não troca a chave nem a moeda (C-26, P1-f).
  { tabela: 'configuracao_agente', privilegios: ['SELECT'], colunasUpdate: ['ligado', 'modelo', 'atualizado_em', 'atualizado_por'] },
  { tabela: 'configuracao_ia', privilegios: ['SELECT'], colunasUpdate: ['teto_mensal', 'atualizado_em', 'atualizado_por'] },
  // Preço novo é vigência nova; uso de IA é registro de cobrança: os dois só de inclusão (CA-17.3).
  { tabela: 'preco_modelo', privilegios: ['SELECT', 'INSERT'] },
  { tabela: 'uso_ia', privilegios: ['SELECT', 'INSERT'] },
  // A execução muda de estado (ADR-07), mas agente, entrada, demanda e criação não mudam, e ela não é apagada.
  {
    tabela: 'execucao_agente',
    privilegios: ['SELECT', 'INSERT'],
    colunasUpdate: ['status', 'tentativas', 'proxima_tentativa_em', 'bloqueada_ate', 'artefato_id', 'atualizada_em'],
  },
  { tabela: 'aviso_email', privilegios: ['SELECT', 'INSERT'], colunasUpdate: ['status', 'tentativas', 'id_provedor', 'enviado_em', 'atualizado_em'] },
  // O worker grava o próprio batimento e limpa o das instâncias antigas.
  { tabela: 'worker_batimento', privilegios: [...TUDO] },
  { tabela: 'rotina_execucao', privilegios: ['SELECT', 'INSERT'], colunasUpdate: ['ultima_execucao_em', 'quantidade'] },
];

// USAGE dá nextval; setval (UPDATE) e a leitura direta (SELECT) ficam com o migrator.
export const SEQUENCIAS: Array<{ nome: string; privilegios: Array<'USAGE'> }> = [{ nome: 'demanda_seq', privilegios: ['USAGE'] }];
