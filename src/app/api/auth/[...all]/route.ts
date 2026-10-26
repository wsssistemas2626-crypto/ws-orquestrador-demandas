// Rotas do Better Auth (login, sessão, 2FA). Até a T11 trazer `obterDeps`, a instância é montada aqui, na primeira
// requisição: importar o módulo (como faz o `next build`) não lê variável de ambiente.
import { toNextJsHandler } from 'better-auth/next-js';
import { criarDb, criarPool } from '../../../../db';
import { lerConfigApp } from '../../../../lib/env';
import { criarAuth, type Auth } from '../../../../modules/acesso/auth';

let auth: Auth | undefined;

function obterAuth(): Auth {
  if (!auth) {
    const config = lerConfigApp();
    auth = criarAuth({ db: criarDb(criarPool(config.databaseUrl)), config });
  }
  return auth;
}

export const { GET, POST } = toNextJsHandler(async (requisicao: Request) => obterAuth().handler(requisicao));
