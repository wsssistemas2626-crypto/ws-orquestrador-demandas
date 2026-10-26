// Matriz de acesso como dado (C-10, C-12; 02, seção 6). `autorizar` é a única porta: rota, Server Action e job
// chamam a mesma função. O ator `sistema` não passa em nenhuma ação: as mudanças automáticas usam funções internas
// que não chamam `autorizar`. Ação, agente ou papel desconhecido é negado.
import { ErroDominio } from '../../lib/erros';
import { AGENTES, PAPEIS, ehPapel, type Agente, type Ator, type Papel } from './ator';
import { MENSAGENS_ACESSO } from './mensagens';

export const ACOES = [
  'criar_demanda',
  'listar_demandas',
  'ler_demanda',
  'alterar_demanda',
  'registrar_entrada',
  'ler_texto_bruto',
  'ler_historico',
  'criar_especificacao',
  'ler_especificacao',
  'criar_parecer_risco',
  'ler_parecer_risco',
  'criar_pacote_decisao',
  'ler_pacote_decisao',
  'registrar_decisao',
  'gerar_pedido_construcao',
  'ler_configuracao_agentes',
  'alterar_agente',
  'ler_teto',
  'alterar_teto',
] as const;
export type Acao = (typeof ACOES)[number];

type Linha = { readonly pessoa: 'qualquer' | 'cto' | null; readonly agentes: readonly Agente[] };

const linha = (pessoa: Linha['pessoa'], agentes: readonly Agente[]): Linha =>
  Object.freeze({ pessoa, agentes: Object.freeze([...agentes]) });

const QUALQUER_PESSOA_SEM_AGENTE = linha('qualquer', []);
const LEITURA = linha('qualquer', AGENTES);

export const MATRIZ: Readonly<Record<Acao, Linha>> = Object.freeze({
  criar_demanda: linha('qualquer', ['orquestrador']),
  listar_demandas: LEITURA,
  ler_demanda: LEITURA,
  alterar_demanda: QUALQUER_PESSOA_SEM_AGENTE,
  registrar_entrada: QUALQUER_PESSOA_SEM_AGENTE,
  ler_texto_bruto: QUALQUER_PESSOA_SEM_AGENTE,
  ler_historico: QUALQUER_PESSOA_SEM_AGENTE,
  criar_especificacao: linha('qualquer', ['insumo_tecnico']),
  ler_especificacao: LEITURA,
  criar_parecer_risco: linha('qualquer', ['risco']),
  ler_parecer_risco: LEITURA,
  criar_pacote_decisao: linha('qualquer', ['consolidacao']),
  ler_pacote_decisao: LEITURA,
  registrar_decisao: QUALQUER_PESSOA_SEM_AGENTE,
  gerar_pedido_construcao: QUALQUER_PESSOA_SEM_AGENTE,
  ler_configuracao_agentes: QUALQUER_PESSOA_SEM_AGENTE,
  alterar_agente: linha('cto', []),
  ler_teto: QUALQUER_PESSOA_SEM_AGENTE,
  alterar_teto: linha('cto', []),
});

// Mensagem da 03, seção 2.8. Não cita o ator nem a ação.
const MENSAGEM_SEM_PERMISSAO = MENSAGENS_ACESSO.sem_permissao;

// Só chave própria da matriz: `toString`, `__proto__` e afins não viram linha.
const linhaDa = (acao: Acao): Linha | undefined =>
  Object.prototype.hasOwnProperty.call(MATRIZ, acao) ? MATRIZ[acao] : undefined;

function pessoaPode(l: Linha, papel: Papel): boolean {
  if (l.pessoa === 'qualquer') return true;
  if (l.pessoa === 'cto') return papel === 'cto';
  return false;
}

function permitido(ator: Ator, acao: Acao): boolean {
  const l = linhaDa(acao);
  if (!l) return false;
  if (ator.tipo === 'pessoa') return ehPapel(ator.papel) && pessoaPode(l, ator.papel);
  if (ator.tipo === 'agente') return (AGENTES as readonly string[]).includes(ator.agente) && l.agentes.includes(ator.agente);
  return false;
}

export function autorizar(ator: Ator, acao: Acao): void {
  if (!permitido(ator, acao)) throw new ErroDominio('sem_permissao', MENSAGEM_SEM_PERMISSAO);
}

// Para o teste transversal da T13: cada agente e cada papel que a matriz nega nesta ação.
export function atoresProibidos(
  acao: Acao,
): Array<{ tipo: 'agente'; agente: Agente } | { tipo: 'pessoa'; papel: Papel }> {
  const l = linhaDa(acao);
  const agentes = AGENTES.filter((a) => !l || !l.agentes.includes(a)).map((agente) => ({ tipo: 'agente' as const, agente }));
  const papeis = PAPEIS.filter((papel) => !l || !pessoaPode(l, papel)).map((papel) => ({ tipo: 'pessoa' as const, papel }));
  return [...agentes, ...papeis];
}
