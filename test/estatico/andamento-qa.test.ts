// test/estatico/andamento-qa.test.ts — escrito na 06-T02-testes do DEC-DEM-20261111-0017-v1 (qa-automacao), ao lado de
// andamento.test.ts, sem mudar nada nele. Fecha duas brechas do AN-01 (f) ("Server Action ou job chamando a ação"):
//   1) a varredura de andamento.test.ts lê só .ts e .tsx: um .mjs, .js, .cjs ou .mts de src/ ou scripts/ (como
//      src/vendor/construir/pedido.mjs) ou um arquivo de configuração da raiz citaria a ação sem ninguém ver;
//   2) quem chama o serviço não precisa escrever o nome da ação: basta importar `registrarAndamento`. Fora de teste, só
//      a rota nova importa src/modules/andamento/registrar.ts por valor (plano, T08; D-07: o seed não o chama). O
//      caminho é resolvido (relativo, pelo apelido @/, com extensão ou index), e não comparado por texto.
// Cada regra tem caso plantado que a reprova e caso parecido que ela deixa passar.
import { globSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importacoesDe } from './importacoes';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const listar = (padrao: string) => globSync(padrao, { cwd: raiz }).sort();
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');
const semTeste = (a: string) => !/\.test\.[cm]?[jt]sx?$/.test(a);

const SERVICO = 'src/modules/andamento/registrar';
export const IMPORTAM_REGISTRAR: readonly string[] = ['src/app/api/pedidos-construcao/[decId]/andamento/route.ts'];

// O módulo para onde a importação aponta, sem extensão e sem /index; pacote e caminho que não é literal voltam crus.
export function moduloDe(arquivo: string, origem: string): string {
  let alvo: string;
  if (origem.startsWith('./') || origem.startsWith('../')) alvo = posix.normalize(posix.join(posix.dirname(arquivo), origem));
  else if (origem.startsWith('@/')) alvo = `src/${origem.slice(2)}`;
  else return origem;
  return alvo.replace(/\.[cm]?[jt]sx?$/, '').replace(/\/index$/, '');
}

export function importadoresDoServico(arquivos: ReadonlyArray<readonly [string, string]>): string[] {
  return arquivos
    .filter(([nome, fonte]) => importacoesDe(nome, fonte).some((i) => !i.soTipo && moduloDe(nome, i.origem) === SERVICO))
    .map(([nome]) => nome);
}

describe('AN-01 (f): a ação também fora de .ts e .tsx', () => {
  const outros = listar('{src,scripts}/**/*.{js,jsx,mjs,cjs,mts,cts}').filter(semTeste);
  const configs = listar('*.{ts,mts,cts,mjs,cjs,js}');

  it('a varredura enxerga o .mjs de src/vendor e as configurações da raiz (falha se o glob quebrar)', () => {
    expect(outros).toEqual(expect.arrayContaining(['src/vendor/construir/pedido.mjs']));
    expect(configs).toEqual(expect.arrayContaining(['next.config.ts', 'vitest.config.ts']));
  });

  it('nenhum deles cita registrar_andamento', () => {
    expect([...outros, ...configs].filter((a) => ler(a).includes('registrar_andamento'))).toEqual([]);
  });
});

describe('AN-01 (f): só a rota importa o serviço registrarAndamento', () => {
  const codigoQueRoda = listar('{src,scripts}/**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}').filter(semTeste);

  it('a varredura enxerga o código que roda, as Server Actions e o worker, e deixa os testes de fora', () => {
    expect(codigoQueRoda).toEqual(
      expect.arrayContaining(['src/modules/acesso/matriz.ts', 'src/app/(painel)/demandas/[id]/acoes.ts', 'src/worker/index.ts', 'scripts/seed-ficticio.ts']),
    );
    expect(codigoQueRoda.filter((a) => a.includes('.test.'))).toEqual([]);
  });

  it('fora de teste, nenhum arquivo além da rota nova importa registrar.ts por valor', () => {
    const importam = importadoresDoServico(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(importam.filter((a) => !IMPORTAM_REGISTRAR.includes(a))).toEqual([]);
  });

  it('o caminho é resolvido: relativo, apelido @/, extensão e index', () => {
    expect(moduloDe('src/app/api/pedidos-construcao/[decId]/andamento/route.ts', '../../../../../modules/andamento/registrar')).toBe(SERVICO);
    expect(moduloDe('src/modules/andamento/outro.ts', './registrar.ts')).toBe(SERVICO);
    expect(moduloDe('src/jobs/x.ts', '@/modules/andamento/registrar/index')).toBe(SERVICO);
    expect(moduloDe('src/jobs/x.ts', '../modules/andamento/registrar.js')).toBe(SERVICO);
    expect(moduloDe('src/jobs/x.ts', 'drizzle-orm')).toBe('drizzle-orm');
    expect(moduloDe('src/jobs/x.ts', './registrar')).toBe('src/jobs/registrar');
  });

  it('acha cada forma de importação plantada, e não conta tipo nem módulo de nome parecido', () => {
    const plantados = [
      ['src/app/(painel)/x/acoes.ts', "'use server';\nimport { registrarAndamento } from '@/modules/andamento/registrar';"],
      ['src/jobs/andamento.ts', "import { registrarAndamento as r } from '../modules/andamento/registrar';"],
      ['src/worker/x.ts', "const m = await import('../modules/andamento/registrar.ts');"],
      ['src/modules/andamento/indice.ts', "export * from './registrar';"],
      ['src/modules/andamento/vizinho.ts', "import { registrarAndamento } from './registrar';"],
      ['scripts/x.ts', "const { registrarAndamento } = require('../src/modules/andamento/registrar.js');"],
      ['src/lib/y.mjs', "import * as servico from '../modules/andamento/registrar.ts';"],
      ['src/app/tipo.ts', "import type { CorpoAndamento } from '@/modules/andamento/registrar';"],
      ['src/app/tipo2.ts', "import { type CorpoAndamento } from '@/modules/andamento/registrar';"],
      ['src/app/parecido.ts', "import { a } from '@/modules/andamento/registrar-antigo';\nimport { b } from '@/modules/historico/registrar';"],
      ['src/jobs/vizinho.ts', "import { c } from './registrar';"],
    ] as const;
    expect(importadoresDoServico(plantados)).toEqual([
      'src/app/(painel)/x/acoes.ts',
      'src/jobs/andamento.ts',
      'src/worker/x.ts',
      'src/modules/andamento/indice.ts',
      'src/modules/andamento/vizinho.ts',
      'scripts/x.ts',
      'src/lib/y.mjs',
    ]);
  });
});
