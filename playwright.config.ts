// e2e do painel (T36). Sem BASE_URL, o Playwright sobe o próprio servidor (e2e/servidor.ts: Postgres descartável pelo
// Testcontainers, migrations, seed fictício, `next build` e `next start` na porta 3101, só em 127.0.0.1: o build de
// produção, desde a 08-correcao). Com BASE_URL, roda os mesmos testes contra um ambiente já de pé (homologação), sem
// subir nada. Os dados do e2e vêm de duas fontes:
//   - o seed fictício (scripts/seed-ficticio.ts): as contas de CONTAS_FICTICIAS, o DEC de rascunho de agente e as
//     demandas de TITULOS_DO_E2E, achadas pelo título (e2e/apoio.ts, demandaDoSeed);
//   - a API, pela sessão da página (e2e/apoio.ts, api): as demandas e as versões que os testes criam.
// As demandas do seed acumulam versões e decisões entre execuções contra o mesmo banco (homologação reaproveitada). O
// teste que precisa de banco recém-semeado diz isso ao ser pulado ("exige banco recém-semeado: ...").
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL;
const LOCAL = 'http://127.0.0.1:3101';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  // Um banco só para todos os testes: em série, para um teste não ver o dado do outro no meio.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL ?? LOCAL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(BASE_URL
    ? {}
    : {
        webServer: {
          command: 'pnpm exec tsx e2e/servidor.ts',
          url: `${LOCAL}/api/saude`,
          // Banco, migrations, seed e o `next build` antes de o app responder.
          timeout: 300_000,
          reuseExistingServer: false,
          gracefulShutdown: { signal: 'SIGTERM', timeout: 20_000 },
        },
      }),
});
