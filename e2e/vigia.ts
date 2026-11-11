// e2e/vigia.ts — funções puras da vigia (CV-03), sem Playwright, para o teste de unidade.
export type Coletor = { outraOrigem: string[]; csp: string[] };

export function origemDaUrl(url: string): string | null {
  const u = new URL(url);
  if (u.protocol === 'data:' || u.protocol === 'blob:' || u.protocol === 'about:') return null;
  const protocolo = u.protocol === 'ws:' ? 'http:' : u.protocol === 'wss:' ? 'https:' : u.protocol;
  return `${protocolo}//${u.host}`;
}

export function problemasDaVigia(c: Coletor): string[] {
  return [...c.outraOrigem.map((u) => `requisição a outra origem: ${u}`), ...c.csp.map((m) => `violação de CSP: ${m}`)];
}
