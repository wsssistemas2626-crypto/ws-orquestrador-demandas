// Boot do app (Next chama `register` uma vez, antes de atender). Confere a configuração (C-31, C-33): com segredo curto,
// URL inválida ou retenção fora de 1..365, o app não sobe, e o erro cita só o nome da variável. Depois liga o Sentry,
// que fica desligado sem DSN. Só no runtime Node: o Sentry e o pg não rodam no edge.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { lerConfigApp } = await import('./lib/env');
  const { iniciarSentry } = await import('./lib/sentry');
  lerConfigApp();
  iniciarSentry({ dsn: process.env.SENTRY_DSN || undefined });
}
