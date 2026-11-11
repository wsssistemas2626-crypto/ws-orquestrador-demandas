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

  // 0.2.0 (T03): os tokens da 03, 2.1 do pedido 0015 (os apelidos da 0.1.13 saíram na T16, D-01: ver abaixo).
  it.each([
    ['--color-marinho', '#12385f'],
    ['--color-marinho-luz', '#1f4f86'],
    ['--color-acao', '#1a6ae0'],
    ['--color-acao-escura', '#1354b4'],
    ['--color-azul-claro', '#7db0f5'],
    ['--color-nevoa', '#eaf1fd'],
    ['--color-tinta', '#0f1620'],
    ['--color-tinta-media', '#4a5763'],
    ['--color-tinta-suave', '#6b7885'],
    ['--color-linha', '#dfe4ea'],
    ['--color-superficie', '#f6f8fa'],
    ['--color-branco', '#ffffff'],
    ['--color-texto-claro', '#dfe6ee'],
    ['--color-texto-claro-apoio', '#b9c5d2'],
    ['--color-positivo', '#0f7a52'],
    ['--color-positivo-fundo', '#e7f4ee'],
    ['--color-atencao', '#8a5a00'],
    ['--color-atencao-fundo', '#fdf3e0'],
    ['--color-erro', '#b42318'],
    ['--color-erro-fundo', '#fdecea'],
    ['--color-selo-violeta', '#5b3fa0'],
    ['--color-selo-violeta-fundo', '#efe9fb'],
    ['--color-selo-petroleo', '#0b5d6b'],
    ['--color-selo-petroleo-fundo', '#ddf2f5'],
    ['--color-selo-verde', '#1d6b3a'],
    ['--color-selo-verde-fundo', '#e3f3e8'],
    ['--color-selo-marinho-fundo', '#e6edf5'],
    ['--color-selo-laranja', '#9a3412'],
    ['--color-selo-laranja-fundo', '#fdebdd'],
    ['--color-selo-cinza-fundo', '#eceff3'],
    ['--radius-campo', '10px'],
    ['--radius-cartao', '16px'],
  ])('token %s = %s, dentro do @theme', (token, valor) => {
    const tema = /@theme\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(tema).toMatch(new RegExp(`${token}:\\s*${valor.replace(/[()]/g, '\\$&')};`));
  });

  // 0.2.0 (T16, D-01): os apelidos da 0.1.13, que valiam só até a T16, saíram do @theme. Cada linha que conferia o apelido
  // agora confere que ele não existe mais (a varredura das classes fica em test/estatico/classes-antigas.test.ts).
  it.each([
    ['--color-texto', 'var(--color-tinta)'],
    ['--color-texto-suave', 'var(--color-tinta-media)'],
    ['--color-fundo', 'var(--color-branco)'],
    ['--color-fundo-suave', 'var(--color-superficie)'],
    ['--color-borda', 'var(--color-tinta-suave)'],
    ['--color-primaria', 'var(--color-acao-escura)'],
    ['--color-perigo', 'var(--color-erro)'],
    ['--color-sucesso', 'var(--color-positivo)'],
    ['--color-atencao-texto', 'var(--color-atencao)'],
  ])('apelido %s (era %s) não existe mais no globals.css', (token) => {
    expect(css).not.toMatch(new RegExp(`${token}\\s*:`));
  });

  it('foco visível: contorno de 2 px na cor primária, afastado 2 px; base de 16 px e altura de linha 1,5', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--cor-foco\);[^}]*outline-offset:\s*2px;/);
    expect(css).toMatch(/html\s*\{[^}]*font-size:\s*16px;[^}]*line-height:\s*1\.5;/);
    expect(css).toMatch(/scroll-padding-top:\s*var\(--altura-cabecalho\)/);
  });

  // 0.2.0 (T03; 03, 2.1): o foco tem token próprio, acao-escura no claro e branco dentro de superfície marinho.
  it('--cor-foco: acao-escura na raiz e branco em .superficie-escura; fundo da tela superficie e h1 marinho', () => {
    expect(css).toMatch(/:root\s*\{[^}]*--cor-foco:\s*var\(--color-acao-escura\);/);
    expect(css).toMatch(/\.superficie-escura\s*\{[^}]*--cor-foco:\s*var\(--color-branco\);/);
    expect(css).toMatch(/html\s*\{[^}]*color:\s*var\(--color-tinta\);[^}]*background-color:\s*var\(--color-superficie\);/);
    expect(css).toMatch(/h1\s*\{[^}]*color:\s*var\(--color-marinho\);/);
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
