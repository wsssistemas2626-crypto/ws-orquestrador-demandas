// GET /api/saude (RNF-17, ADR-12): pública, responde 200 só com o banco conectado e a última migration aplicada.
// Banco real (Testcontainers): o migrado do modelo e um criado vazio, sem as migrations.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { criarDepsDeTeste } from '../../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDb, criarPool } from '../../../db';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { GET } from './route';

let b: BancoDeTeste;
let deps: Deps;
let poolVazio: pg.Pool;
const linhas: string[] = [];
// O handler não lê a requisição (nada dela muda a resposta); o Next chama com ela, o teste chama sem.
const saude = () => GET();

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  // Banco sem template de modelo: existe, conecta, mas não tem o esquema `drizzle` nem as tabelas.
  const admin = inject('pgAdmin');
  const nome = `vazio_${randomUUID().replaceAll('-', '')}`;
  const p = new pg.Pool({ connectionString: admin, max: 1 });
  try {
    await p.query(`create database ${nome}`);
  } finally {
    await p.end();
  }
  poolVazio = criarPool(admin.replace(/\/postgres$/, `/${nome}`), { max: 1 });
  substituirDestinoDoLog({
    write: (l) => {
      linhas.push(l);
    },
  });
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await poolVazio.end();
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  linhas.length = 0;
});

describe('GET /api/saude', () => {
  it('200 { status: ok } com banco migrado, em menos de 200 ms, sem versão nem configuração', async () => {
    definirDepsParaTeste(deps);
    await saude(); // conexão do pool já aberta, como num app de pé
    const inicio = performance.now();
    const r = await saude();
    expect(performance.now() - inicio).toBeLessThan(200);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: 'ok' });
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('não pede credencial: responde 200 sem ler cookie nem Bearer', async () => {
    definirDepsParaTeste(deps);
    expect(GET.length).toBe(0);
    expect((await saude()).status).toBe(200);
  });
  it('503 { status: indisponivel } quando a última migration não está aplicada', async () => {
    definirDepsParaTeste({ ...deps, pool: poolVazio, db: criarDb(poolVazio) });
    const r = await saude();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ status: 'indisponivel' });
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('503 quando a última migration aplicada não é a última do journal', async () => {
    // Num banco à parte, para não tirar a migration do banco dos outros testes deste arquivo.
    const outro = await novoBanco();
    try {
      await outro.poolMigrator.query(
        'delete from drizzle.__drizzle_migrations where created_at = (select max(created_at) from drizzle.__drizzle_migrations)',
      );
      definirDepsParaTeste({ ...deps, pool: outro.poolApp, db: outro.db });
      expect((await saude()).status).toBe(503);
    } finally {
      await outro.fechar();
    }
  });
  it('503 quando o banco não responde no tempo limite, sem passar muito dos 150 ms', async () => {
    const lento = {
      ...deps,
      db: { execute: () => new Promise(() => undefined) } as unknown as Deps['db'],
    };
    definirDepsParaTeste(lento);
    const inicio = performance.now();
    const r = await saude();
    expect(r.status).toBe(503);
    expect(performance.now() - inicio).toBeLessThan(400);
  });
  it('a falha vai ao log só como evento, sem a mensagem do Postgres', async () => {
    definirDepsParaTeste({ ...deps, pool: poolVazio, db: criarDb(poolVazio) });
    await saude();
    const texto = linhas.join('\n');
    expect(texto).toContain('"evento":"saude_indisponivel"');
    expect(texto).not.toContain('__drizzle_migrations');
    expect(texto).not.toContain('does not exist');
  });
});
