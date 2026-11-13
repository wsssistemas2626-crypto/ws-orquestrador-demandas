// Regras puras da tela do andamento do Pedido de Construção (0.4.0, T11 do DEC-DEM-20261111-0017-v1; 03, seções 4.1,
// 5.2, 5.3 e 8; D-03, D-16): o selo de fase da fila (T03) e a seção "Andamento da construção" do detalhe (T05). Recebem
// só o AndamentoVista já conferido por lerAndamento e conferem de novo cada valor antes de virar texto (AN-12): rótulo por
// Object.hasOwn, número só inteiro de 0 a 999 com prontas ≤ total, link só com RE_ID_DEC (CV-19). Qualquer valor fora
// disso vale como "sem andamento": sem selo e sem seção (CA-04.6). Vai ao navegador: só tipos vêm dos módulos, e nada de
// acesso, banco, deps ou Server Action (CV-09).
import type { StatusConstrucao } from '../db/schema/andamento';
import type { StatusDemanda } from '../db/schema/demandas';
import type { AndamentoVista } from '../modules/andamento/schemas';
import type { PacoteResumo } from '../modules/demandas/consultas';
import { RE_ID_DEC } from './dados-do-pacote';
import { faseNaTela, ROTULO_SITUACAO_CONSTRUCAO, situacaoNaTela, tarefaNaTela, tarefasEmTexto } from './rotulos';

// 03, seção 8, por inteiro.
export const TEXTOS_ANDAMENTO = {
  secao: 'Andamento da construção',
  termos: { pedido: 'Pedido de Construção', fase: 'Fase', situacao: 'Situação', tarefas: 'Tarefas prontas' },
  semPlano: 'Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano.',
  cancelada: 'A construção deste pedido foi cancelada no /construir.',
  substituido: (decId: string) =>
    `Este andamento é do pedido de ${decId}, cujo pacote foi substituído por um aprovado mais novo. O andamento do pedido novo aparece aqui quando o /construir começar.`,
  ultimaMudanca: 'Última mudança informada pelo /construir em ',
  nota: 'Esta página não se atualiza sozinha. Recarregue para ver o andamento mais novo.',
  erroNaFila: 'Não foi possível ler o andamento da construção. A fila aparece sem a fase das demandas em construção.',
  seloConcluida: 'Construção concluída',
  seloCancelada: 'Construção cancelada',
} as const;

// --- conferência comum ---

type AndamentoNaTela = { decId: string; fase: string; situacao: StatusConstrucao; prontas: number; total: number; atualizadoEm: Date };

// Cada valor de novo (o tipo não protege do que veio montado à mão ou de leitura nova sem lerAndamento). Fora: null.
function conferido(a: AndamentoVista | null): AndamentoNaTela | null {
  if (a === null) return null;
  const fase = faseNaTela(a.fase);
  const situacao = situacaoNaTela(a.statusConstrucao);
  const prontas = tarefaNaTela(a.tarefasProntas);
  const total = tarefaNaTela(a.tarefasTotal);
  const atualizadoEm = a.atualizadoEm instanceof Date && !Number.isNaN(a.atualizadoEm.getTime()) ? a.atualizadoEm : null;
  if (fase === null || situacao === null || prontas === null || total === null || prontas > total || atualizadoEm === null) return null;
  return { decId: a.decId, fase, situacao, prontas, total, atualizadoEm };
}

// --- T03: selo de fase (03, 4.1) ---

// O texto visível vai com aria-hidden e o do leitor de tela em sr-only, logo depois; a cor é nome de token e só reforça.
export type SeloDeFase = { visivel: string; leitor: string; cor: 'marinho' | 'positivo' | 'tinta-media' };

// Só na demanda em Em construção com andamento válido (RF-08; CA-08.4): em todo outro status, null.
export function seloDeFase(status: StatusDemanda, a: AndamentoVista | null): SeloDeFase | null {
  if (status !== 'em_construcao') return null;
  const v = conferido(a);
  if (v === null) return null;
  switch (v.situacao) {
    case 'construido':
      return { visivel: TEXTOS_ANDAMENTO.seloConcluida, leitor: 'Andamento: construção concluída.', cor: 'positivo' };
    case 'cancelado':
      return { visivel: TEXTOS_ANDAMENTO.seloCancelada, leitor: 'Andamento: construção cancelada.', cor: 'tinta-media' };
    case 'em_construcao':
      return v.total > 0
        ? { visivel: `${v.fase} · ${v.prontas}/${v.total}`, leitor: `Andamento: ${v.fase}, ${v.prontas} de ${v.total} ${v.total === 1 ? 'tarefa pronta' : 'tarefas prontas'}.`, cor: 'marinho' }
        : { visivel: v.fase, leitor: `Andamento: ${v.fase}.`, cor: 'marinho' };
    default: {
      const nunca: never = v.situacao;
      void nunca;
      return null;
    }
  }
}

// --- T05: seção "Andamento da construção" (03, 5.2 e 5.3) ---

export type SecaoDoAndamento = {
  // null → TEXTOS_DETALHE.naoInformado, sem link (decId fora de RE_ID_DEC; CV-19)
  dec: { id: string; href: string | null } | null;
  fase: string;
  situacao: string;
  // barra: <progress value={valor} max={maximo} aria-valuetext={valorTexto}>{recurso}</progress>, com o texto acima;
  // sem_plano: só o texto, sem barra (CA-09.2)
  tarefas: { tipo: 'barra'; texto: string; valor: number; maximo: number; valorTexto: string; recurso: string } | { tipo: 'sem_plano'; texto: string };
  alertas: string[]; // cancelada e substituído, nessa ordem; Alerta atencao estático
  // TEXTOS_ANDAMENTO.ultimaMudanca + <time dateTime={iso}>{data}</time> + "."
  ultimaMudanca: { data: string; iso: string };
  nota: string;
};

// Em qualquer status da demanda com andamento válido (o RF-09 não restringe); sem andamento, null e a seção não existe
// (CA-09.4). `pacotes` é d.pacotesDecisao, que a página já lê; `formatar` é formatarDataHora (fuso do sistema).
export function secaoDoAndamento(a: AndamentoVista | null, pacotes: readonly Pick<PacoteResumo, 'id' | 'substituido'>[], formatar: (d: Date) => string): SecaoDoAndamento | null {
  const v = conferido(a);
  if (v === null) return null;
  const decValido = RE_ID_DEC.test(v.decId);
  const tarefas: SecaoDoAndamento['tarefas'] =
    v.total > 0
      ? { tipo: 'barra', texto: tarefasEmTexto(v.prontas, v.total), valor: v.prontas, maximo: v.total, valorTexto: tarefasEmTexto(v.prontas, v.total), recurso: `${v.prontas} de ${v.total}` }
      : { tipo: 'sem_plano', texto: TEXTOS_ANDAMENTO.semPlano };
  const alertas: string[] = [];
  if (v.situacao === 'cancelado') alertas.push(TEXTOS_ANDAMENTO.cancelada);
  // O id só entra no texto com o formato de DEC: valor de fora não chega à tela.
  if (decValido && pacotes.some((p) => p.id === v.decId && p.substituido)) alertas.push(TEXTOS_ANDAMENTO.substituido(v.decId));
  return {
    dec: decValido ? { id: v.decId, href: `/pacotes-decisao/${v.decId}` } : null,
    fase: v.fase,
    situacao: ROTULO_SITUACAO_CONSTRUCAO[v.situacao],
    tarefas,
    alertas,
    ultimaMudanca: { data: formatar(v.atualizadoEm), iso: v.atualizadoEm.toISOString() },
    nota: TEXTOS_ANDAMENTO.nota,
  };
}
