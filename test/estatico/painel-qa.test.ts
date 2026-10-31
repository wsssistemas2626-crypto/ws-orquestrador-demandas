// Escrito na 06-T36-testes (qa-automacao). Estáticos da T36 que nenhum teste confere:
//   - os tokens de globals.css são os da 03, 2.1, o foco visível é o da tabela e nada no painel remove o contorno de
//     foco (03, 2.1: "nunca removido");
//   - a exceção que a T36 abriu na varredura de C-04 (varreduras-qa.test.ts aceita /sem-permissao sem
//     exigirPessoaNaPagina) só vale enquanto a página não ler sessão nem banco: este teste trava isso, e também na 404;
//   - error.tsx não lê a mensagem, a pilha nem o digest do erro (RNF-10).
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const listar = (padrao: string) => globSync(padrao, { cwd: raiz }).sort();
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');
// O código sem os comentários de bloco e de linha inteira: o comentário pode citar o que o código não faz.
const codigo = (arquivo: string) =>
  ler(arquivo)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('design system (03, 2.1)', () => {
  const css = ler('src/app/globals.css');

  it.each([
    ['--color-texto', '#1f2937'],
    ['--color-texto-suave', '#4b5563'],
    ['--color-fundo', '#ffffff'],
    ['--color-fundo-suave', '#f3f4f6'],
    ['--color-borda', '#6b7280'],
    ['--color-primaria', '#1d4ed8'],
    ['--color-perigo', '#b91c1c'],
    ['--color-sucesso', '#166534'],
    ['--color-atencao-texto', '#78350f'],
    ['--color-atencao-fundo', '#fef3c7'],
    ['--radius-campo', '6px'],
  ])('token %s = %s, dentro do @theme', (token, valor) => {
    const tema = /@theme\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(tema).toMatch(new RegExp(`${token}:\\s*${valor};`));
  });

  it('foco visível: contorno de 2 px na cor primária, afastado 2 px; base de 16 px e altura de linha 1,5', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-primaria\);[^}]*outline-offset:\s*2px;/);
    expect(css).toMatch(/html\s*\{[^}]*font-size:\s*16px;[^}]*line-height:\s*1\.5;/);
    expect(css).toMatch(/scroll-padding-top:\s*var\(--altura-cabecalho\)/);
  });

  it('o layout raiz carrega o globals.css', () => {
    expect(ler('src/app/layout.tsx')).toMatch(/^import ['"]\.\/globals\.css['"];$/m);
  });

  it('nada no painel remove o contorno de foco', () => {
    const arquivos = listar('src/{app,components}/**/*.{tsx,ts,css}').filter((x) => !/\.test\.tsx?$/.test(x));
    expect(arquivos).toEqual(expect.arrayContaining(['src/app/globals.css', 'src/components/Botao.tsx']));
    const REMOVE_FOCO = /outline-none|outline-hidden|outline:\s*(?:none|0)\b|focus:outline-0|focus-visible:outline-0/;
    expect(arquivos.filter((a) => REMOVE_FOCO.test(ler(a)))).toEqual([]);
    // A regra pega as formas proibidas e deixa passar a do globals.css.
    for (const proibido of ['className="outline-none"', 'focus:outline-0', 'outline: none;', 'outline: 0;', 'outline-hidden'])
      expect(proibido).toMatch(REMOVE_FOCO);
    expect('outline: 2px solid var(--color-primaria);').not.toMatch(REMOVE_FOCO);
  });
});

describe('páginas fora do painel não leem sessão nem banco (exceção de C-04 aberta na T36)', () => {
  const LEITURA = [
    /\bobterDeps\b/,
    /\bexigirPessoa\w*\b/,
    /\bexigirSessao\w*\b/,
    /from ['"]next\/headers['"]/,
    /\bheaders\(\)/,
    /\bcookies\(\)/,
    /from ['"][^'"]*\/db(?:\/[^'"]*)?['"]/,
    /from ['"][^'"]*\/lib\/deps['"]/,
    /from ['"][^'"]*\/acesso\/auth['"]/,
  ];
  const lidas = (arquivo: string) => {
    const fonte = codigo(arquivo);
    return LEITURA.filter((r) => r.test(fonte)).map(String);
  };

  it.each(['src/app/sem-permissao/page.tsx', 'src/app/not-found.tsx', 'src/app/error.tsx'])('%s: só texto fixo', (arquivo) => {
    expect(lidas(arquivo)).toEqual([]);
  });

  it('a regra pega cada forma de leitura', () => {
    for (const fonte of [
      "import { obterDeps } from '../../lib/deps';",
      "import { exigirPessoaNaPagina } from '../../modules/acesso/exigir-pessoa';",
      "import { headers } from 'next/headers';",
      'const c = await cookies();',
      "import { demanda } from '../../db/schema';",
      "import { criarAuth } from '../modules/acesso/auth';",
    ])
      expect(LEITURA.some((r) => r.test(fonte)), fonte).toBe(true);
    expect(LEITURA.some((r) => r.test("import { MENSAGENS_ACESSO } from '../../modules/acesso/mensagens';"))).toBe(false);
  });
});

describe('error.tsx não lê o conteúdo do erro (RNF-10)', () => {
  it('nem mensagem, nem pilha, nem digest, nem causa', () => {
    const fonte = codigo('src/app/error.tsx');
    expect(fonte).not.toMatch(/\.(?:message|stack|digest|cause)\b/);
    expect(fonte).not.toMatch(/\{\s*error\b[^}]*\}\s*:/);
  });
});
