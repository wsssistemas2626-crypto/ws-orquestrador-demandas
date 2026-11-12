// 06-T20-testes (qa-automacao) do DEC-DEM-20261111-0016-v1 (D-10, IN-04): o lado do playwright.config.ts dos tokens do
// e2e local, que o test/tokens-do-e2e.test.ts não cobre (ele confere a gravação e a limpeza). O que se prova aqui:
//   - sem BASE_URL, a configuração aponta E2E_ARQUIVO_TOKENS para `tokens.json` numa pasta nova de `mkdtemp`, com o
//     prefixo que a limpeza confere, direto em tmpdir() (fora do repositório), e não grava token nenhum (a pasta nasce
//     vazia; quem grava é o e2e/servidor.ts);
//   - com BASE_URL (homologação), nenhum caminho de tokens, nenhum webServer, e o sinal HOMOLOGACAO liga o pulo;
//   - com E2E_ARQUIVO_TOKENS já posto (o caso dos workers e do webServer, que herdam a variável), nada muda.
// Cada caso recarrega a configuração do zero (vi.resetModules). O ambiente do processo volta ao de antes depois de cada
// teste, e a pasta criada é apagada: nada depende da ordem.
import { existsSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREFIXO_DA_PASTA } from '../e2e/integracoes';

const ANTES = { BASE_URL: process.env.BASE_URL, E2E_ARQUIVO_TOKENS: process.env.E2E_ARQUIVO_TOKENS };
const pastas: string[] = [];

function definir(nome: keyof typeof ANTES, valor: string | undefined): void {
  if (valor === undefined) delete process.env[nome];
  else process.env[nome] = valor;
}

afterEach(() => {
  for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true });
  definir('BASE_URL', ANTES.BASE_URL);
  definir('E2E_ARQUIVO_TOKENS', ANTES.E2E_ARQUIVO_TOKENS);
  vi.resetModules();
});

async function carregar() {
  vi.resetModules();
  const config = (await import('../playwright.config')).default;
  const { HOMOLOGACAO } = await import('../e2e/integracoes');
  return { config, HOMOLOGACAO };
}

describe('playwright.config.ts e os tokens do e2e local (D-10)', () => {
  it('sem BASE_URL: tokens.json numa pasta nova e vazia de mkdtemp em tmpdir(), com o prefixo da limpeza', async () => {
    definir('BASE_URL', undefined);
    definir('E2E_ARQUIVO_TOKENS', undefined);
    const { config, HOMOLOGACAO } = await carregar();
    const arquivo = process.env.E2E_ARQUIVO_TOKENS;
    expect(arquivo).toBeDefined();
    const pasta = dirname(arquivo!);
    pastas.push(pasta);
    expect(basename(arquivo!)).toBe('tokens.json');
    expect(dirname(pasta)).toBe(tmpdir());
    expect(basename(pasta).startsWith(PREFIXO_DA_PASTA)).toBe(true);
    expect(basename(pasta).length).toBeGreaterThan(PREFIXO_DA_PASTA.length);
    expect(existsSync(pasta)).toBe(true);
    // A configuração só reserva o caminho: o token nasce no e2e/servidor.ts, no banco descartável.
    expect(readdirSync(pasta)).toEqual([]);
    expect(HOMOLOGACAO).toBe(false);
    expect(config.use?.baseURL).toBe('http://127.0.0.1:3101');
    expect(config.webServer).toMatchObject({ command: 'pnpm exec tsx e2e/servidor.ts', reuseExistingServer: false });
  });

  it('com BASE_URL (homologação): nenhum caminho de tokens, nenhum webServer, e o pulo das integrações liga', async () => {
    definir('BASE_URL', 'http://homologacao.test');
    definir('E2E_ARQUIVO_TOKENS', undefined);
    const { config, HOMOLOGACAO } = await carregar();
    expect(process.env.E2E_ARQUIVO_TOKENS).toBeUndefined();
    expect(config.webServer).toBeUndefined();
    expect(config.use?.baseURL).toBe('http://homologacao.test');
    expect(HOMOLOGACAO).toBe(true);
  });

  it('com E2E_ARQUIVO_TOKENS já posto (workers e webServer herdam): o caminho não muda', async () => {
    const pasta = mkdtempSync(join(tmpdir(), 'ws-orq-qa-config-'));
    pastas.push(pasta);
    const arquivo = join(pasta, 'tokens.json');
    definir('BASE_URL', undefined);
    definir('E2E_ARQUIVO_TOKENS', arquivo);
    await carregar();
    expect(process.env.E2E_ARQUIVO_TOKENS).toBe(arquivo);
    expect(readdirSync(pasta)).toEqual([]);
  });
});
