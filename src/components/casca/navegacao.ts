// Itens do menu do painel (03, 3.2; ADR-15): os de hoje, com a mesma regra de página atual. Usados pelo menu lateral e
// pela gaveta (ItensDoMenu), e reexportados por CabecalhoPainel.tsx para os testes de hoje.
export const LINKS = [
  { href: '/demandas', texto: 'Demandas' },
  { href: '/demandas/nova', texto: 'Nova demanda' },
  { href: '/configuracao/agentes', texto: 'Agentes e teto' },
] as const;

export type LinkDoMenu = (typeof LINKS)[number];

// Telas que pertencem à fila: detalhe, edição e as versões de ESP, RSK e DEC. "Nova demanda" tem item próprio.
const DA_FILA = /^\/(demandas|especificacoes|pareceres-risco|pacotes-decisao)(\/|$)/;

export function ehPaginaAtual(href: string, caminho: string | null): boolean {
  if (!caminho) return false;
  if (href === '/demandas') return DA_FILA.test(caminho) && caminho !== '/demandas/nova';
  return caminho === href || caminho.startsWith(`${href}/`);
}
