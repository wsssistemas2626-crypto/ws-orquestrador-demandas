// Matriz de acesso como dado (C-10, C-12; 02, seção 6). `autorizar` é a única porta: rota, Server Action e job
// chamam a mesma função. O ator `sistema` não passa em nenhuma ação: as mudanças automáticas usam funções internas
// que não chamam `autorizar`. Ação, agente ou papel desconhecido é negado.
import { ErroDominio } from '../../lib/erros';
import { AGENTES, INTEGRACOES, PAPEIS, ehIntegracao, ehPapel, type Agente, type Ator, type Integracao, type Papel } from './ator';
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
  // 0.3.0: a confirmação da demanda do Awave (RF-06) e as três do /construir (RF-03, CA-F-01).
  'confirmar_demanda',
  'listar_pedidos_pendentes',
  'entregar_pedido',
  'confirmar_recebimento_pedido',
] as const;
export type Acao = (typeof ACOES)[number];

// `integracoes` (0.3.0, IN-01): lista de permissão fechada por integração; vazia por padrão. Só cinco pares abrem
// (RF-03): awave em criar_demanda e ler_demanda; construir nas três ações dele.
type Linha = { readonly pessoa: 'qualquer' | 'cto' | null; readonly agentes: readonly Agente[]; readonly integracoes: readonly Integracao[] };

const linha = (pessoa: Linha['pessoa'], agentes: readonly Agente[], integracoes: readonly Integracao[] = []): Linha =>
  Object.freeze({ pessoa, agentes: Object.freeze([...agentes]), integracoes: Object.freeze([...integracoes]) });

const QUALQUER_PESSOA_SEM_AGENTE = linha('qualquer', []);
// Nunca tem integração: a leitura que o Awave tem (ler_demanda) é linha própria.
const LEITURA = linha('qualquer', AGENTES);
const SO_CONSTRUIR = linha(null, [], ['construir']);

export const MATRIZ: Readonly<Record<Acao, Linha>> = Object.freeze({
  criar_demanda: linha('qualquer', ['orquestrador'], ['awave']),
  listar_demandas: LEITURA,
  ler_demanda: linha('qualquer', AGENTES, ['awave']),
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
  confirmar_demanda: QUALQUER_PESSOA_SEM_AGENTE,
  listar_pedidos_pendentes: SO_CONSTRUIR,
  entregar_pedido: SO_CONSTRUIR,
  confirmar_recebimento_pedido: SO_CONSTRUIR,
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
  // IN-02: um ramo por tipo de ator; a integração nunca passa pelo ramo do agente.
  switch (ator.tipo) {
    case 'pessoa':
      return ehPapel(ator.papel) && pessoaPode(l, ator.papel);
    case 'agente':
      return (AGENTES as readonly string[]).includes(ator.agente) && l.agentes.includes(ator.agente);
    case 'integracao':
      return ehIntegracao(ator.integracao) && l.integracoes.includes(ator.integracao);
    case 'sistema':
      return false;
    default: {
      // Tipo fora da lista (montado à mão): negado, sem lançar outro erro.
      const nunca: never = ator;
      void nunca;
      return false;
    }
  }
}

export function autorizar(ator: Ator, acao: Acao): void {
  if (!permitido(ator, acao)) throw new ErroDominio('sem_permissao', MENSAGEM_SEM_PERMISSAO);
}

// Para o teste transversal da T13: cada agente, cada papel e cada integração que a matriz nega nesta ação. Ação
// desconhecida proíbe todos (falha fechada).
export function atoresProibidos(
  acao: Acao,
): Array<{ tipo: 'agente'; agente: Agente } | { tipo: 'pessoa'; papel: Papel } | { tipo: 'integracao'; integracao: Integracao }> {
  const l = linhaDa(acao);
  const agentes = AGENTES.filter((a) => !l || !l.agentes.includes(a)).map((agente) => ({ tipo: 'agente' as const, agente }));
  const papeis = PAPEIS.filter((papel) => !l || !pessoaPode(l, papel)).map((papel) => ({ tipo: 'pessoa' as const, papel }));
  const integracoes = INTEGRACOES.filter((i) => !l || !l.integracoes.includes(i)).map((integracao) => ({ tipo: 'integracao' as const, integracao }));
  return [...agentes, ...papeis, ...integracoes];
}
