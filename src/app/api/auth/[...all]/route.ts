// Rotas do Better Auth (login, sessão, 2FA), com a mesma instância das rotas e das páginas (obterDeps, T11). Importar o
// módulo (como faz o `next build`) não lê variável de ambiente: a configuração é lida na primeira requisição.
import { toNextJsHandler } from 'better-auth/next-js';
import { obterDeps } from '../../../../lib/deps';

export const { GET, POST } = toNextJsHandler(async (requisicao: Request) => (await obterDeps()).auth.handler(requisicao));
