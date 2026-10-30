// Servidor do e2e local (T36), chamado pelo `webServer` do playwright.config.ts quando não há BASE_URL:
//   1. Postgres 16 descartável pelo Testcontainers, com o papel do app criado antes da migration (ADR-03);
//   2. migrations e filas com o migrator (scripts/migrate.ts);
//   3. seed fictício (scripts/seed-ficticio.ts), com SEED_FICTICIO=1 só aqui dentro, nunca no ambiente do processo;
//   4. `next dev` na porta 3101, preso em 127.0.0.1, com DATABASE_URL do papel do app e segredo fictício.
// O app recebe um ambiente montado do zero: só PATH, HOME e as três variáveis dele. Nenhuma chave de provedor de IA ou
// de e-mail chega ao processo, nem a URL do migrator (C-27, RNF-14). Credenciais e segredo valem só para este banco.
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import { migrar } from '../scripts/migrate';
import { seedFicticio } from '../scripts/seed-ficticio';
import { criarDb, criarPool } from '../src/db';
import type { ConfigApp } from '../src/lib/env';
import { criarFila } from '../src/lib/fila';
import { relogioDoSistema } from '../src/lib/relogio';
import { criarAuth } from '../src/modules/acesso/auth';

const PORTA = '3101';
const HOST = '127.0.0.1';
const URL_BASE = `http://${HOST}:${PORTA}`;
const SEGREDO_FICTICIO = 'SEGREDO-FICTICIO-DO-E2E-'.padEnd(48, '0');
const SENHA_APP_FICTICIA = 'app_e2e_ficticia';

async function criarPapelDoApp(urlMigrator: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: urlMigrator, max: 1 });
  try {
    await pool.query(`create role orquestrador_app login password '${SENHA_APP_FICTICIA}' nosuperuser nocreatedb nocreaterole`);
  } finally {
    await pool.end();
  }
}

function urlDoApp(urlMigrator: string): string {
  const u = new URL(urlMigrator);
  u.username = 'orquestrador_app';
  u.password = SENHA_APP_FICTICIA;
  return u.toString();
}

async function semear(urlApp: string): Promise<void> {
  const config: ConfigApp = {
    urlBase: URL_BASE,
    segredoAuth: SEGREDO_FICTICIO,
    cabecalhoIp: 'x-real-ip',
    retencaoDias: 90,
    producao: false,
    databaseUrl: urlApp,
  };
  const pool = criarPool(urlApp, { max: 2 });
  const fila = await criarFila(urlApp);
  try {
    const db = criarDb(pool);
    const relogio = relogioDoSistema;
    const r = await seedFicticio({ db, pool, relogio, fila, auth: criarAuth({ db, config, relogio }), config }, { SEED_FICTICIO: '1' });
    if (r !== 'semeado') throw new Error('e2e: o seed fictício não rodou');
  } finally {
    await fila.parar().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

function subirNext(urlApp: string): ChildProcess {
  const binNext = createRequire(import.meta.url).resolve('next/dist/bin/next');
  const env: Record<string, string | undefined> = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: urlApp,
    BETTER_AUTH_URL: URL_BASE,
    BETTER_AUTH_SECRET: SEGREDO_FICTICIO,
  };
  // `Record` em vez de `NodeJS.ProcessEnv` pelo mesmo motivo de lerConfigApp (NODE_ENV obrigatório nos tipos do Next);
  // o `next dev` define o NODE_ENV dele.
  return spawn(process.execPath, [binNext, 'dev', '-p', PORTA, '-H', HOST], { stdio: 'inherit', env: env as NodeJS.ProcessEnv });
}

let banco: StartedPostgreSqlContainer | null = null;
let next: ChildProcess | null = null;
let encerrando = false;

async function encerrar(codigo: number): Promise<never> {
  if (!encerrando) {
    encerrando = true;
    next?.kill('SIGTERM');
    await banco?.stop().catch(() => undefined);
  }
  process.exit(codigo);
}

process.on('SIGTERM', () => void encerrar(0));
process.on('SIGINT', () => void encerrar(0));

try {
  banco = await new PostgreSqlContainer('postgres:16-alpine')
    .withUsername('migrator')
    .withPassword('migrator_e2e_ficticio')
    .withDatabase('orquestrador')
    .start();
  const urlMigrator = banco.getConnectionUri();
  await criarPapelDoApp(urlMigrator);
  await migrar(urlMigrator);
  const urlApp = urlDoApp(urlMigrator);
  await semear(urlApp);
  next = subirNext(urlApp);
  next.on('exit', (codigo) => void encerrar(codigo ?? 1));
} catch (e) {
  // Sem a mensagem: pode citar a URL do banco. Só a classe do erro.
  process.stderr.write(`e2e: o servidor não subiu (${e instanceof Error ? e.name : 'erro'}).\n`);
  await encerrar(1);
}
