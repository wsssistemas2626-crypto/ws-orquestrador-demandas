// Dependências que rota, Server Action, job e serviço recebem (G5). `obterDeps` monta as de produção uma vez por
// processo, a partir de lerConfigApp() (C-33): importar o módulo, como faz o `next build`, não lê variável de ambiente.
// Só DATABASE_URL e a configuração do app: nunca a URL do migrator, a chave do provedor de IA nem a do e-mail, que são
// do migrate e do worker (C-27; o teste estático test/estatico/variaveis.test.ts recusa o nome delas aqui).
import type pg from 'pg';
import { criarDb, criarPool, type Db } from '../db';
import { criarAuth, type Auth } from '../modules/acesso/auth';
import { lerConfigApp, type ConfigApp } from './env';
import { criarFila, type Fila } from './fila';
import { relogioDoSistema, type Relogio } from './relogio';

export type Deps = { db: Db; pool: pg.Pool; relogio: Relogio; fila: Fila; auth: Auth; config: ConfigApp };

let emMontagem: Promise<Deps> | null = null;
let depsDeTeste: Deps | null = null;

async function montar(): Promise<Deps> {
  const config = lerConfigApp();
  const pool = criarPool(config.databaseUrl);
  try {
    const db = criarDb(pool);
    const fila = await criarFila(config.databaseUrl);
    return { db, pool, relogio: relogioDoSistema, fila, auth: criarAuth({ db, config, relogio: relogioDoSistema }), config };
  } catch (e) {
    await pool.end().catch(() => undefined);
    throw e;
  }
}

// Chamadas ao mesmo tempo esperam a mesma montagem. Se ela falhar (banco fora no boot), a próxima chamada tenta de novo.
export function obterDeps(): Promise<Deps> {
  if (depsDeTeste) return Promise.resolve(depsDeTeste);
  emMontagem ??= montar().catch((e: unknown) => {
    emMontagem = null;
    throw e;
  });
  return emMontagem;
}

// Só para teste: o que `obterDeps` devolve enquanto valer (null volta à montagem normal).
export function definirDepsParaTeste(d: Deps | null): void {
  depsDeTeste = d;
}
