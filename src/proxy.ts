// Proxy do Next 16 (antigo middleware). Só cabeçalhos (C-19): CSP com nonce novo por requisição e `Cache-Control:
// no-store` em toda página fora dos arquivos estáticos. O nonce vai à página em `x-nonce` (e a CSP no cabeçalho da
// requisição, de onde o Next tira o nonce dos próprios scripts). Não decide acesso (C-04): quem decide é exigirPessoa,
// dentro de cada página, rota e Server Action; desviar deste arquivo não abre nada.
import { NextResponse, type NextRequest } from 'next/server';

function novoNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

function politica(nonce: string): string {
  // O React em modo de desenvolvimento usa eval para a pilha de erro; só lá.
  const evalDev = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalDev}`,
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join('; ');
}

export function proxy(req: NextRequest): NextResponse {
  const nonce = novoNonce();
  const csp = politica(nonce);
  const cabecalhos = new Headers(req.headers);
  // O que o cliente mandou em x-nonce é trocado: só vale o do servidor.
  cabecalhos.set('x-nonce', nonce);
  cabecalhos.set('content-security-policy', csp);
  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set('content-security-policy', csp);
  resposta.headers.set('cache-control', 'no-store');
  return resposta;
}

export const config = {
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)' }],
};
