// T20 do DEC-DEM-20261111-0016-v1 (D-10): os tokens das integrações no e2e local. O e2e/servidor.ts emite um token
// `awave` e um `construir` depois do seed, num banco descartável, e os grava em `tokens.json` (permissão 600), numa pasta
// de `mkdtemp` fora do repositório cujo caminho vem de E2E_ARQUIVO_TOKENS (posto pelo playwright.config.ts só sem
// BASE_URL); ao encerrar, apaga o arquivo e a pasta. Contra a homologação (BASE_URL), não há arquivo: os testes de API das
// integrações pulam com o motivo escrito, e a V-01 e a V-02 da 09-entrega cobrem. O token nunca vai a log, a mensagem de
// `expect` nem a arquivo do repositório (IN-04). Gravação e limpeza conferidas em test/tokens-do-e2e.test.ts.
import { existsSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';

export type TokensDoE2e = { awave: string; construir: string };

// O prefixo da pasta de `mkdtemp` (playwright.config.ts). A limpeza só apaga pasta com ele.
export const PREFIXO_DA_PASTA = 'ws-orq-e2e-';

export function tokensDoE2e(): TokensDoE2e | null {
  const arquivo = process.env.E2E_ARQUIVO_TOKENS;
  if (!arquivo || !existsSync(arquivo)) return null;
  return JSON.parse(readFileSync(arquivo, 'utf8')) as TokensDoE2e;
}

// `wx`: não sobrescreve nada que já exista. O valor só vai ao arquivo, nunca à saída.
export function gravarTokensDoE2e(arquivo: string, tokens: TokensDoE2e): void {
  writeFileSync(arquivo, JSON.stringify({ awave: tokens.awave, construir: tokens.construir }), { mode: 0o600, flag: 'wx' });
}

// Apaga o arquivo só se foi este processo que o gravou, e a pasta só quando é a de `mkdtemp` do e2e e ficou vazia.
export function apagarTokensDoE2e(arquivo: string, gravadoAqui: boolean): void {
  if (gravadoAqui) rmSync(arquivo, { force: true });
  const pasta = dirname(arquivo);
  if (!basename(pasta).startsWith(PREFIXO_DA_PASTA)) return;
  try {
    rmdirSync(pasta);
  } catch {
    // Já apagada, ou com algo que não é deste processo: fica.
  }
}

// O mesmo sinal do playwright.config.ts: com BASE_URL, os testes rodam contra a homologação, sem e2e/servidor.ts.
export const HOMOLOGACAO = !!process.env.BASE_URL;

export const MOTIVO_SEM_TOKENS = 'exige os tokens do e2e local (e2e/servidor.ts); na homologação, a V-01 e a V-02 da 09 cobrem';
