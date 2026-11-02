import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // C-18: nenhum HTML cru vindo de texto do usuário ou do agente.
      'react/no-danger': 'error',
      // G3.7: log só por `log` de src/lib/log.ts (lista de permissão, C-21).
      'no-console': 'error',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'drizzle/**',
    'src/vendor/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);

export default eslintConfig;
