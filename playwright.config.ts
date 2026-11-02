// e2e do painel (T36). Sem BASE_URL, o Playwright sobe o próprio servidor (e2e/servidor.ts: Postgres descartável pelo
// Testcontainers, migrations, seed fictício, `next build` e `next start` na porta 3101, só em 127.0.0.1: o build de
// produção, desde a 08-correcao). Com BASE_URL, roda os mesmos testes contra um ambiente já de pé (homologação), sem
// subir nada. Os dados de cada teste são criados pela API.
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
