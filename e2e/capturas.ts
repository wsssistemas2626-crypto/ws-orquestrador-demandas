// e2e/capturas.ts — regras puras das capturas de tela do manual (T17 do DEC-DEM-20261110-0015-v1: RF-17, CA-17.2, CV-17 e
// D-04), sem Playwright, para o teste de unidade (test/estatico/capturas.test.ts). Quem tira as fotos é o
// e2e/capturas.spec.ts.
import { fileURLToPath } from 'node:url';

// A pasta do manual técnico que o capítulo 08 cita (10-documentacao).
export const PASTA_DAS_CAPTURAS = fileURLToPath(new URL('../docs/manual-tecnico/capturas/', import.meta.url));

// As nove capturas da T17: tela e largura no nome.
export const CAPTURAS = [
  't01-entrar-1280',
  't01-entrar-390',
  't03-fila-1280',
  't03-fila-390',
  't05-demanda-1280',
  't05-demanda-390',
  't11-decisao-1280',
  't11-decisao-390',
  'gaveta-aberta-390',
] as const;
export type NomeDaCaptura = (typeof CAPTURAS)[number];

// D-04: a captura que deve ser regravada mesmo existindo. Só numa correção da 08 que mude o visual de uma tela capturada;
// o nome volta a sair daqui na mesma passagem (o teste estático exige a lista vazia).
export const REGRAVAR: readonly NomeDaCaptura[] = [];

// CV-17: só contra o servidor em loopback e nunca com CI no ambiente, com qualquer valor (o GitHub Actions põe CI=true).
// Assim nenhuma captura sai de produção nem de uma homologação remota pelo BASE_URL, e o CI nunca regrava PNG.
export function podeCapturar(baseURL: string | undefined, ci: string | undefined): boolean {
  if (ci !== undefined) return false;
  if (!baseURL) return false;
  let host: string;
  try {
    host = new URL(baseURL).hostname;
  } catch {
    return false;
  }
  return host === '127.0.0.1' || host === 'localhost';
}

// D-04: grava a captura que ainda não existe; a que existe só é regravada se estiver em REGRAVAR.
export function deveGravar(nome: NomeDaCaptura, existe: boolean, regravar: readonly NomeDaCaptura[] = REGRAVAR): boolean {
  return !existe || regravar.includes(nome);
}
