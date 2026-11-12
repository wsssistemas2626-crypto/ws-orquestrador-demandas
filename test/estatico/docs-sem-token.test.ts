// test/estatico/docs-sem-token.test.ts — T14 do DEC-DEM-20261111-0016-v1: IN-18 (parte verificável, D-20) e C-39.
// Nenhum valor no formato do token de serviço (`wsod_` + 43 caracteres base64url) em `docs/`, `CHANGELOG.md` e
// `README.md`. A guarda vale desde a 06 para o texto de emissão, troca (a cada 12 meses, P-04) e revogação dos tokens
// que a 10-documentacao escrever. O token plantado do teste da regex é montado por código, nunca digitado.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = [...globSync('docs/**/*.md', { cwd: raiz }), 'CHANGELOG.md', 'README.md'].sort();
const TOKEN = /wsod_[A-Za-z0-9_-]{43}/;

// Só o lugar do achado (arquivo e linha), nunca o valor: a falha não reimprime o token.
export function achados(arquivo: string, texto: string): string[] {
  return texto.split('\n').flatMap((linha, i) => (TOKEN.test(linha) ? [`${arquivo}:${i + 1}`] : []));
}

describe('documentação sem valor de token (IN-18, D-20, C-39)', () => {
  it('a varredura enxerga docs/ (falha se o glob quebrar)', () => {
    expect(arquivos.length).toBeGreaterThan(5);
    expect(arquivos).toEqual(expect.arrayContaining(['CHANGELOG.md', 'README.md']));
    expect(arquivos.some((a) => a.startsWith('docs/manual-tecnico/'))).toBe(true);
  });

  it('reprova um token plantado e aceita o que só lembra o formato', () => {
    const plantado = `wsod_${'A1_-'.repeat(10)}xyz`;
    expect(achados('docs/x.md', `linha 1\nToken: ${plantado}\n`)).toEqual(['docs/x.md:2']);
    // O prefixo de 8 caracteres, o nome do formato e um valor curto demais não são token.
    expect(achados('docs/x.md', 'Revogue pelo prefixo Ab3_-xY9.\nO token começa com `wsod_`.\nwsod_curto')).toEqual([]);
  });

  it.each(arquivos)('%s não tem valor de token', (a) => {
    expect(achados(a, readFileSync(`${raiz}${a}`, 'utf8'))).toEqual([]);
  });
});
