// C-04 (b): `exigirPessoa` dentro de cada Server Action e de cada página do painel, e `rota()` em cada route.ts da API
// (G3.6). O proxy é só conveniência; quem decide acesso é a própria rota, ação ou página. Cresce sozinho: todo arquivo
// novo em src/app entra na varredura sem mudar este teste.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const listar = (padrao: string) => globSync(padrao, { cwd: raiz }).sort();
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');

// Rotas públicas, fora da matriz: o Better Auth (que confere a própria sessão) e a saúde (sem dado).
const PUBLICAS = /^src\/app\/api\/(auth|saude)\//;

describe('C-04 b: exigirPessoa e rota() em todo ponto de entrada de src/app', () => {
  it('a varredura enxerga src/app (falha se o glob quebrar)', () => {
    expect(listar('src/app/**/*.{ts,tsx}')).toEqual(expect.arrayContaining(['src/app/layout.tsx', 'src/app/api/saude/route.ts']));
  });

  it('todo arquivo com "use server" usa acaoDoPainel ou exigirPessoa', () => {
    const arquivos = listar('src/app/**/*.{ts,tsx}').filter((a) => /^\s*['"]use server['"]/m.test(ler(a)));
    expect(arquivos.filter((a) => !/\bacaoDoPainel\(|\bexigirPessoa\(/.test(ler(a)))).toEqual([]);
  });

  it('toda page.tsx do painel chama exigirPessoaNaPagina', () => {
    expect(listar('src/app/(painel)/**/page.tsx').filter((p) => !/\bexigirPessoaNaPagina\(/.test(ler(p)))).toEqual([]);
  });

  it('toda route.ts da API usa rota(), exceto auth e saúde', () => {
    const rotas = listar('src/app/api/**/route.ts').filter((x) => !PUBLICAS.test(x));
    expect(rotas.filter((r) => !/\brota\(/.test(ler(r)))).toEqual([]);
  });
});
