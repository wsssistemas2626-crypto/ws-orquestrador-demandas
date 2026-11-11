// Foco dentro da gaveta (03, 3.3; ADR-15). O <dialog> modal deixa o resto da página inerte, mas o Chromium deixa o Tab
// sair do diálogo para a interface do navegador: a volta do primeiro ao último focável (e do último ao primeiro) é feita
// aqui. No meio da lista, o navegador move o foco sozinho.

// O índice que deve receber o foco depois de Tab (ou Shift+Tab, `paraTras`), ou null quando o navegador resolve.
// `atual` -1: o foco não está em nenhum focável da lista.
export function proximoIndiceCircular(atual: number, total: number, paraTras: boolean): number | null {
  if (total <= 0) return null;
  if (atual < 0) return paraTras ? total - 1 : 0;
  if (paraTras) return atual === 0 ? total - 1 : null;
  return atual === total - 1 ? 0 : null;
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Os elementos focáveis pelo Tab dentro de `raiz`, na ordem do DOM, só os que estão desenhados.
export function focaveisEm(raiz: HTMLElement): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(FOCAVEIS)].filter((e) => e.getClientRects().length > 0);
}
