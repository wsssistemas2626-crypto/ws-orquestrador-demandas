import { defineConfig } from 'drizzle-kit';

// Só gera migrations (pnpm db:generate); não conecta em banco. Quem aplica é scripts/migrate.ts, com o migrator.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  casing: 'snake_case',
});
