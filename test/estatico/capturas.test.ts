// test/estatico/capturas.test.ts — CV-17 (04) e D-04 (T17 do DEC-DEM-20261110-0015-v1): as capturas do manual só nascem
// em loopback e fora do CI, só com o seed fictício e sem a T02 (QR, segredo TOTP e códigos de recuperação); são nove, com
// a tela e a largura no nome; uma captura que já existe não é regravada, e o REGRAVAR fica vazio no commit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CAPTURAS, deveGravar, PASTA_DAS_CAPTURAS, podeCapturar, REGRAVAR } from '../../e2e/capturas';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const spec = readFileSync(`${raiz}e2e/capturas.spec.ts`, 'utf8');

describe('CV-17: capturas só em loopback e fora do CI', () => {
  it('aceita 127.0.0.1 e localhost, com qualquer porta, quando CI não existe', () => {
    expect(podeCapturar('http://127.0.0.1:3101', undefined)).toBe(true);
    expect(podeCapturar('http://localhost:3101', undefined)).toBe(true);
    expect(podeCapturar('http://127.0.0.1:3207/', undefined)).toBe(true);
  });

  it('recusa quando CI existe, com qualquer valor, mesmo em loopback', () => {
    for (const ci of ['true', '1', 'false', '']) expect(podeCapturar('http://127.0.0.1:3101', ci), `CI=${ci}`).toBe(false);
  });

  it('recusa sem baseURL, com endereço inválido e com qualquer outro host', () => {
    expect(podeCapturar(undefined, undefined)).toBe(false);
    expect(podeCapturar('', undefined)).toBe(false);
    expect(podeCapturar('não é endereço', undefined)).toBe(false);
    for (const u of [
      'https://orquestrador.wsscloud.tech',
      'http://10.0.0.5:3101',
      'http://0.0.0.0:3101',
      'http://[::1]:3101',
      'http://127.0.0.1.exemplo.test:3101',
      'http://localhost.exemplo.test',
      'https://exemplo.test/?volta=http://127.0.0.1:3101',
    ])
      expect(podeCapturar(u, undefined), u).toBe(false);
  });

  it('o spec pula todo teste pelo podeCapturar, com a baseURL do Playwright e o CI do ambiente', () => {
    expect(spec).toMatch(/test\.beforeEach\(\s*\(\{\s*baseURL\s*\}\)\s*=>\s*\{\s*test\.skip\(\s*!podeCapturar\(baseURL,\s*process\.env\.CI\)/);
    // Ninguém troca a baseURL dentro do spec (a de produção ou a de uma homologação remota).
    expect(spec).not.toMatch(/baseURL\s*:/);
  });

  it('o spec não visita a T02 nem entra com as contas sem 2FA', () => {
    expect(spec).not.toMatch(/configurar-?2fa|sem2fa|entrarSoComSenha/i);
  });

  it('o spec tira foto só pelo auxiliar, na pasta das capturas e só da janela', () => {
    expect(spec.match(/\.screenshot\(/g)).toHaveLength(1);
    expect(spec).toMatch(/\.screenshot\(\{\s*path:\s*arquivo,\s*fullPage:\s*false\b/);
    expect(spec).toMatch(/`\$\{PASTA_DAS_CAPTURAS\}\$\{nome\}\.png`/);
  });
});

describe('RF-17 (CA-17.2) e D-04: nove capturas, gravadas uma vez', () => {
  it('a pasta é docs/manual-tecnico/capturas/ do repositório', () => {
    expect(PASTA_DAS_CAPTURAS).toBe(`${raiz}docs/manual-tecnico/capturas/`);
  });

  it('as nove: T01, T03, T05 e T11 nas duas larguras e a gaveta aberta em 390 px, com tela e largura no nome', () => {
    expect([...CAPTURAS]).toEqual([
      't01-entrar-1280',
      't01-entrar-390',
      't03-fila-1280',
      't03-fila-390',
      't05-demanda-1280',
      't05-demanda-390',
      't11-decisao-1280',
      't11-decisao-390',
      'gaveta-aberta-390',
    ]);
    for (const nome of CAPTURAS) expect(nome).toMatch(/^(?:t\d{2}-[a-z]+|gaveta-aberta)-(?:1280|390)$/);
  });

  it('o spec produz cada uma das nove', () => {
    for (const prefixo of ['t01-entrar-', 't03-fila-', 't05-demanda-', 't11-decisao-']) expect(spec).toContain(`\`${prefixo}\${largura}\``);
    expect(spec).toContain("'gaveta-aberta-390'");
    expect(spec).toMatch(/\[\[1280,\s*720\],\s*\[390,\s*844\]\]/);
  });

  it('REGRAVAR fica vazio no commit', () => {
    expect(REGRAVAR).toEqual([]);
  });

  it('deveGravar: grava a que falta, pula a que existe e regrava só a que está em REGRAVAR', () => {
    expect(deveGravar('t03-fila-390', false)).toBe(true);
    expect(deveGravar('t03-fila-390', true)).toBe(false);
    expect(deveGravar('t05-demanda-1280', true, ['t05-demanda-1280'])).toBe(true);
    expect(deveGravar('t05-demanda-390', true, ['t05-demanda-1280'])).toBe(false);
  });
});
