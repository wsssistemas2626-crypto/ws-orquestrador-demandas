// test/estatico/vigia-qa.test.ts — CV-02, CV-03 e CA-02.3, complemento do qa-automacao na 06-T01-testes:
//   - bordas de origemDaUrl (wss, porta, esquema) que o vigia.test.ts não cobre;
//   - a vigia continua automática e reprovando no fim (sem isso, o teste negativo e2e é a única guarda);
//   - nenhum e2e abre contexto ou navegador novo, que a vigia não alcançaria (plano, T01);
//   - o e2e roda contra `next build` + `next start`, nunca `next dev` (CV-03);
//   - CA-02.3: public/ e toda configuração da raiz sem Google Fonts nem a fonte do Google do Next, e o PostCSS na
//     varredura do CV-02.
// Os endereços e nomes vetados são montados por partes: este arquivo também é varrido pelo sem-recurso-externo.test.ts.
import { existsSync, globSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { origemDaUrl, problemasDaVigia } from '../../e2e/vigia';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');

const DOMINIO_GOOGLE_FONTS = new RegExp(['fonts', '(?:googleapis|gstatic)', 'com'].join('\\.'), 'i');
const FONTE_DO_GOOGLE_NO_NEXT = new RegExp(['next', 'font', 'google'].join('\\/'));
const vetado = (fonte: string) => DOMINIO_GOOGLE_FONTS.test(fonte) || FONTE_DO_GOOGLE_NO_NEXT.test(fonte);

describe('vigia de origem e CSP: bordas (CV-03)', () => {
  it('wss é a origem https do mesmo host; ws e wss de outro host são outra origem', () => {
    expect(origemDaUrl('wss://127.0.0.1:3101/_next/x')).toBe('https://127.0.0.1:3101');
    expect(origemDaUrl('ws://exemplo.test/x')).toBe('http://exemplo.test');
    expect(origemDaUrl('ws://exemplo.test/x')).not.toBe(new URL('http://127.0.0.1:3101').origin);
  });

  it('outra porta e outro esquema do mesmo host são outra origem', () => {
    const doApp = new URL('http://127.0.0.1:3101').origin;
    expect(origemDaUrl('http://127.0.0.1:3102/x')).not.toBe(doApp);
    expect(origemDaUrl('https://127.0.0.1:3101/x')).not.toBe(doApp);
    expect(origemDaUrl('http://localhost:3101/x')).not.toBe(doApp);
  });

  it('a origem casa com a da baseURL quando a porta é a padrão ou o host vem em maiúsculas', () => {
    expect(origemDaUrl('http://exemplo.test:80/x')).toBe(new URL('http://exemplo.test').origin);
    expect(origemDaUrl('https://exemplo.test:443/x')).toBe(new URL('https://exemplo.test').origin);
    expect(origemDaUrl('http://EXEMPLO.test:3101/x')).toBe(new URL('http://exemplo.test:3101').origin);
  });

  it('problemasDaVigia lista cada item, na ordem: outra origem antes de CSP', () => {
    expect(problemasDaVigia({ outraOrigem: ['https://a.exemplo.test/1', 'https://b.exemplo.test/2'], csp: ['x'] })).toEqual([
      'requisição a outra origem: https://a.exemplo.test/1',
      'requisição a outra origem: https://b.exemplo.test/2',
      'violação de CSP: x',
    ]);
  });
});

describe('vigia de origem e CSP: ligada em todo e2e (CV-03)', () => {
  it('a fixture é automática e reprova no fim do teste com o coletor não vazio', () => {
    const apoio = ler('e2e/apoio.ts');
    expect(apoio).toMatch(/\{\s*auto:\s*true\s*\}/);
    expect(apoio).toMatch(/await use\(c\);\s*expectBase\(problemasDaVigia\(c\)[^\n]*\)\.toEqual\(\[\]\);/);
  });

  it('nenhum arquivo de e2e abre contexto ou navegador novo, fora do alcance da vigia', () => {
    const arquivos = globSync('e2e/**/*.ts', { cwd: raiz }).sort();
    expect(arquivos).toEqual(expect.arrayContaining(['e2e/apoio.ts', 'e2e/vigia.spec.ts']));
    const abrem = arquivos.filter((a) => /\bbrowser\s*\.\s*newContext\s*\(|\.launch(?:PersistentContext)?\s*\(|\.connect(?:OverCDP)?\s*\(/.test(ler(a)));
    expect(abrem).toEqual([]);
  });

  it('sem BASE_URL, o e2e sobe o build de produção (next build e next start), nunca o next dev', () => {
    expect(ler('playwright.config.ts')).toMatch(/command:\s*'pnpm exec tsx e2e\/servidor\.ts'/);
    const servidor = ler('e2e/servidor.ts');
    expect(servidor).toMatch(/\[binNext\(\), 'build'\]/);
    expect(servidor).toMatch(/\[binNext\(\), 'start', '-p', PORTA, '-H', HOST\]/);
    expect(servidor).not.toMatch(/\[binNext\(\), 'dev'/);
  });
});

describe('CA-02.3: Google Fonts fora de public/ e da configuração', () => {
  it('a regra reprova a forma plantada e deixa passar o que é da casa', () => {
    const https = ['https:', '', ''].join('/');
    expect(vetado(`@import url('${https}${['fonts', 'googleapis', 'com'].join('.')}/css2');`)).toBe(true);
    expect(vetado(`<${'link'} href="${https}${['fonts', 'gstatic', 'com'].join('.')}/s/x.woff2">`)).toBe(true);
    expect(vetado(`import { Noto_Sans } from '${['next', 'font', 'google'].join('/')}';`)).toBe(true);
    expect(vetado("import localFont from 'next/font/local';")).toBe(false);
    expect(vetado("@import 'tailwindcss';")).toBe(false);
  });

  it('a varredura do CV-02 inclui a configuração do PostCSS', () => {
    expect(globSync('{next,playwright,postcss}.config.*', { cwd: raiz }).sort()).toEqual(['next.config.ts', 'playwright.config.ts', 'postcss.config.mjs']);
  });

  it('nenhum arquivo de public/ nem de configuração da raiz cita Google Fonts', () => {
    const publicos = existsSync(`${raiz}public`) ? globSync('public/**/*', { cwd: raiz }) : [];
    const configuracao = globSync('{*.config.*,tsconfig.json,package.json,Dockerfile,docker-compose*.yml}', { cwd: raiz });
    expect(configuracao).toEqual(expect.arrayContaining(['next.config.ts', 'package.json', 'Dockerfile']));
    const arquivos = [...publicos, ...configuracao].filter((a) => statSync(`${raiz}${a}`).isFile() && !/\.(?:png|jpe?g|ico|woff2?)$/i.test(a));
    expect(arquivos.filter((a) => vetado(ler(a)))).toEqual([]);
  });
});
