import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // next/font/local só funciona dentro do compilador do Next (T02, ADR-13); no teste de unidade, o substituto.
      { find: /^next\/font\/local$/, replacement: fileURLToPath(new URL('./test/next-font-local.ts', import.meta.url)) },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts', 'scripts/**/*.test.ts'],
    globalSetup: ['test/setup-global.ts'],
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
