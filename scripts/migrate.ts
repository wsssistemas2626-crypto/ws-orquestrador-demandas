// Aplica as migrations com o papel migrator (DATABASE_URL_MIGRATOR), dono do DDL (ADR-12).
// O papel do app (orquestrador_app) precisa existir antes: a migration de privilégios falha sem ele, de propósito.
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { instalarFilas } from '../src/lib/fila';
import { reduzirErro } from '../src/lib/reduzir-erro';

const PASTA = fileURLToPath(new URL('../drizzle', import.meta.url));

export async function migrar(urlMigrator: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: urlMigrator, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: PASTA });
  } finally {
    await pool.end();
  }
  // Esquema e filas do pg-boss, também com o migrator: o app sobe com `migrate: false` e não tem DDL (T-02, C-34).
  await instalarFilas(urlMigrator);
}

// Verdadeiro só quando este arquivo é o chamado pela linha de comando (tsx scripts/migrate.ts), com caminho absoluto
// ou relativo; importado pelo ajudante de teste, não roda nada.
export function ehExecucaoDireta(argv1: string | undefined, urlDoModulo: string, cwd: string): boolean {
  if (!argv1) return false;
  return pathToFileURL(resolve(cwd, argv1)).href === urlDoModulo;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  const url = process.env.DATABASE_URL_MIGRATOR;
  if (!url) {
    process.stderr.write('DATABASE_URL_MIGRATOR ausente.\n');
    process.exit(1);
  }
  try {
    await migrar(url);
    process.stdout.write('Migrations aplicadas.\n');
  } catch (e) {
    // Sem a mensagem do Postgres na saída: ela pode trazer valor de linha. Só a classe e o código (C-21).
    const { classe, code } = reduzirErro(e);
    process.stderr.write(`Migrations não aplicadas (${classe} ${code ?? 'sem código'}).\n`);
    process.exit(1);
  }
}
