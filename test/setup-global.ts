// Postgres real (Testcontainers) para os testes de integração: um contêiner por execução do Vitest, um banco
// `modelo` já migrado com o migrator, e cada arquivo de teste copia o modelo num banco novo (test/banco.ts).
// Credenciais fictícias, só deste contêiner descartável.
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { migrar } from '../scripts/migrate';

declare module 'vitest' {
  export interface ProvidedContext {
    pgAdmin: string;
  }
}

export default async function setup(projeto: TestProject) {
  const c = await new PostgreSqlContainer('postgres:16-alpine')
    .withUsername('migrator')
    .withPassword('migrator_teste')
    .withDatabase('postgres')
    .start();
  const admin = c.getConnectionUri();
  const pool = new pg.Pool({ connectionString: admin, max: 1 });
  try {
    // O papel do app existe antes da migration, como em cada ambiente (ADR-03); nunca é criado pela migration.
    await pool.query(`create role orquestrador_app login password 'app_teste' nosuperuser nocreatedb nocreaterole`);
    await pool.query('create database modelo');
  } finally {
    await pool.end();
  }
  await migrar(admin.replace(/\/postgres$/, '/modelo'));
  projeto.provide('pgAdmin', admin);
  return async () => {
    await c.stop();
  };
}
