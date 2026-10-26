import type { NextConfig } from 'next';

// C-15: Server Actions só da origem de BETTER_AUTH_URL (o Next compara o host). Sem a variável (no build) ou com valor
// inválido, a lista fica vazia e vale só a própria origem da requisição; nunca um curinga.
function hostsPermitidos(url: string | undefined): string[] {
  if (!url) return [];
  try {
    return [new URL(url).host];
  } catch {
    return [];
  }
}

// C-19: cabeçalhos fixos de toda resposta. A CSP com nonce e o no-store das páginas vêm de src/proxy.ts; o no-store
// das rotas, de rota(). HSTS só em produção, onde o proxy do Easypanel termina o HTTPS.
function cabecalhosFixos(producao: boolean) {
  return [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'X-Frame-Options', value: 'DENY' },
    ...(producao ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['pg', 'pg-boss', 'pino'],
  experimental: {
    // RNF-04: o corpo da Server Action vai até 1 MB (o da API, 512 KB, fica com rota()).
    serverActions: { allowedOrigins: hostsPermitidos(process.env.BETTER_AUTH_URL), bodySizeLimit: '1mb' },
  },
  async headers() {
    return [{ source: '/:path*', headers: cabecalhosFixos(process.env.NODE_ENV === 'production') }];
  },
};

export default nextConfig;
