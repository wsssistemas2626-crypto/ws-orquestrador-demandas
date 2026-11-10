// test/estatico/vigia.test.ts — CV-03: as funções da vigia e a herança em todo spec.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { origemDaUrl, problemasDaVigia } from '../../e2e/vigia';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const specs = globSync('e2e/**/*.spec.ts', { cwd: raiz }).sort();

describe('vigia de origem e CSP (CV-03)', () => {
  it('origem: http, https e ws do mesmo host são a mesma origem; data, blob e about não têm rede', () => {
    expect(origemDaUrl('http://127.0.0.1:3101/demandas')).toBe('http://127.0.0.1:3101');
    expect(origemDaUrl('ws://127.0.0.1:3101/_next/x')).toBe('http://127.0.0.1:3101');
    expect(origemDaUrl('https://fontes.exemplo.test/s/x.woff2')).toBe('https://fontes.exemplo.test');
    for (const u of ['data:font/woff2;base64,AA', 'blob:http://127.0.0.1:3101/abc', 'about:blank']) expect(origemDaUrl(u)).toBeNull();
  });

  it('o coletor vazio não reprova; com qualquer item, reprova com a URL ou a mensagem', () => {
    expect(problemasDaVigia({ outraOrigem: [], csp: [] })).toEqual([]);
    expect(problemasDaVigia({ outraOrigem: ['https://exemplo.test/x.css'], csp: ['style-src-elem https://exemplo.test/x.css'] })).toEqual([
      'requisição a outra origem: https://exemplo.test/x.css',
      'violação de CSP: style-src-elem https://exemplo.test/x.css',
    ]);
  });

  it('todo spec importa test e expect de ./apoio, nunca o test de @playwright/test', () => {
    expect(specs.length).toBeGreaterThan(20);
    for (const s of specs) {
      const fonte = readFileSync(`${raiz}${s}`, 'utf8');
      expect({ s, deApoio: /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*'\.\/apoio'/.test(fonte) }).toEqual({ s, deApoio: true });
      expect({ s, direto: /import\s*\{[^}]*\b(?<!type\s)test\b[^}]*\}\s*from\s*'@playwright\/test'/.test(fonte) }).toEqual({ s, direto: false });
    }
  });

  it('a configuração não desliga a CSP nem sobe retries', () => {
    const cfg = readFileSync(`${raiz}playwright.config.ts`, 'utf8');
    expect(cfg).not.toMatch(/bypassCSP/);
    expect(cfg).toMatch(/retries:\s*0,/);
  });
});
