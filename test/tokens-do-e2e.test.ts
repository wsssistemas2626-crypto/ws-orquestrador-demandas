// T20 do DEC-DEM-20261111-0016-v1 (D-10, IN-04): o arquivo dos tokens do e2e local. O e2e/servidor.ts grava os tokens
// `awave` e `construir` em `tokens.json` (permissão 600, sem sobrescrever nada) numa pasta de `mkdtemp` e, ao encerrar,
// apaga o arquivo e a pasta: nenhum `tokens.json` sobra em tmpdir(). Os valores aqui são fictícios, fora do formato de
// token (`wsod_`).
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { apagarTokensDoE2e, gravarTokensDoE2e, PREFIXO_DA_PASTA, tokensDoE2e } from '../e2e/integracoes';

const FICTICIOS = { awave: 'token-ficticio-awave', construir: 'token-ficticio-construir' } as const;

const pastas: string[] = [];
const novaPasta = (prefixo = PREFIXO_DA_PASTA) => {
  const p = mkdtempSync(join(tmpdir(), prefixo));
  pastas.push(p);
  return p;
};
const variavelAntes = process.env.E2E_ARQUIVO_TOKENS;

afterEach(() => {
  for (const p of pastas.splice(0)) rmSync(p, { recursive: true, force: true });
  if (variavelAntes === undefined) delete process.env.E2E_ARQUIVO_TOKENS;
  else process.env.E2E_ARQUIVO_TOKENS = variavelAntes;
});

describe('tokens do e2e local (D-10)', () => {
  it('a pasta do playwright.config.ts tem o prefixo conferido na limpeza', () => {
    expect(PREFIXO_DA_PASTA).toBe('ws-orq-e2e-');
  });

  it('grava o JSON dos dois tokens com permissão 600, e tokensDoE2e o lê pela variável', () => {
    const arquivo = join(novaPasta(), 'tokens.json');
    gravarTokensDoE2e(arquivo, FICTICIOS);
    expect(JSON.parse(readFileSync(arquivo, 'utf8'))).toEqual(FICTICIOS);
    expect(statSync(arquivo).mode & 0o777).toBe(0o600);
    process.env.E2E_ARQUIVO_TOKENS = arquivo;
    expect(tokensDoE2e()).toEqual(FICTICIOS);
  });

  it('não sobrescreve um arquivo que já existe', () => {
    const arquivo = join(novaPasta(), 'tokens.json');
    writeFileSync(arquivo, 'de outro processo');
    expect(() => gravarTokensDoE2e(arquivo, FICTICIOS)).toThrow();
    expect(readFileSync(arquivo, 'utf8')).toBe('de outro processo');
  });

  it('sem a variável, ou sem o arquivo, tokensDoE2e devolve null', () => {
    delete process.env.E2E_ARQUIVO_TOKENS;
    expect(tokensDoE2e()).toBeNull();
    process.env.E2E_ARQUIVO_TOKENS = join(novaPasta(), 'tokens.json');
    expect(tokensDoE2e()).toBeNull();
  });

  it('ao encerrar, apaga o arquivo gravado e a pasta de mkdtemp: nada sobra', () => {
    const pasta = novaPasta();
    const arquivo = join(pasta, 'tokens.json');
    gravarTokensDoE2e(arquivo, FICTICIOS);
    apagarTokensDoE2e(arquivo, true);
    expect(existsSync(arquivo)).toBe(false);
    expect(existsSync(pasta)).toBe(false);
  });

  it('sem ter gravado (o servidor caiu antes), apaga só a pasta vazia', () => {
    const pasta = novaPasta();
    apagarTokensDoE2e(join(pasta, 'tokens.json'), false);
    expect(existsSync(pasta)).toBe(false);
  });

  it('não apaga arquivo que não gravou, nem a pasta que ainda tem algo', () => {
    const pasta = novaPasta();
    const arquivo = join(pasta, 'tokens.json');
    writeFileSync(arquivo, 'de outro processo');
    apagarTokensDoE2e(arquivo, false);
    expect(readFileSync(arquivo, 'utf8')).toBe('de outro processo');
    expect(existsSync(pasta)).toBe(true);
  });

  it('pasta sem o prefixo do mkdtemp do e2e: apaga o arquivo gravado e deixa a pasta', () => {
    const pasta = novaPasta('ws-orq-outra-');
    const arquivo = join(pasta, 'tokens.json');
    gravarTokensDoE2e(arquivo, FICTICIOS);
    apagarTokensDoE2e(arquivo, true);
    expect(existsSync(arquivo)).toBe(false);
    expect(existsSync(pasta)).toBe(true);
  });
});
