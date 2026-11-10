// Escrito na 06-T03-testes (qa-automacao, pedido 0015). Liga os tokens do @theme ao que os componentes base de fato
// usam. O contraste-tokens.test.ts confere a lista de pares da 03, 2.2; este confere, lendo o próprio código:
//   1. toda classe de cor dos componentes base é um token declarado no @theme (classe com nome errado o Tailwind ignora
//      sem avisar, e a cor some da tela sem nenhum teste reprovar);
//   2. todo token do @theme tem valor hexadecimal, direto ou pelos apelidos do D-01, e todo var(--color-…) do
//      globals.css aponta para token que existe;
//   3. cada par texto/fundo e cada borda, trilho ou anel de foco que os componentes e a base do globals.css usam passa no
//      mínimo de RNF-01 (texto, 4,5:1) e de RNF-02 (não textual, 3:1), com a cor tirada do HTML ou do CSS, não de uma
//      lista à parte;
//   4. o contorno de foco tem ao menos 2 px (RNF-04) e o bloco de prefers-reduced-motion continua (RNF-11).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Alerta, type TipoAlerta } from './Alerta';
import { BlocoJson } from './BlocoJson';
import { classeDoBotao, type VarianteBotao } from './Botao';
import { CaixaSelecao } from './CaixaSelecao';
import { classeDoCampo, Dica, MensagemDeErro } from './CampoTexto';
import { GrupoOpcoes } from './GrupoOpcoes';
import { Interruptor } from './Interruptor';
import { Paginacao } from './Paginacao';
import { COR_DECISAO, COR_NIVEL, COR_STATUS, SELO_DESATUALIZADO, SELO_RASCUNHO, SELO_SUBSTITUIDO, type CorSelo } from './rotulos';
import { Selo } from './Selo';
import { Tabela } from './Tabela';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const CSS = ler('src/app/globals.css');
const BLOCO_TEMA = /@theme\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? '';

// --color-<nome>: <valor>; do primeiro @theme (o `@theme inline` das famílias não tem cor).
const DECLARADOS: ReadonlyMap<string, string> = new Map(
  [...BLOCO_TEMA.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/gi)].map((m) => [m[1]!, m[2]!.trim()] as const),
);
const TOKENS: ReadonlySet<string> = new Set(DECLARADOS.keys());

// O hexadecimal de um token, seguindo os apelidos `var(--color-…)`; null se faltar o alvo ou houver ciclo.
export function resolver(declarados: ReadonlyMap<string, string>, nome: string, vistos: readonly string[] = []): string | null {
  const v = declarados.get(nome);
  if (v === undefined || vistos.includes(nome)) return null;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  const alvo = /^var\(--color-([a-z0-9-]+)\)$/.exec(v)?.[1];
  return alvo ? resolver(declarados, alvo, [...vistos, nome]) : null;
}
const hex = (nome: string): string => {
  const v = resolver(DECLARADOS, nome);
  if (!v) throw new Error(`--color-${nome} sem valor no @theme`);
  return v;
};

// Razão de contraste da WCAG 2.2 (a mesma fórmula do contraste-tokens.test.ts).
const canal = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminancia = (cor: string) => {
  const n = Number.parseInt(cor.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
const razao = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
const TEXTO = 4.5;
const NAO_TEXTUAL = 3;
// Confere o par pelo nome dos tokens, com o par na mensagem para a falha dizer qual foi.
function conferir(frente: string | null, fundo: string | null, minimo: number, onde: string) {
  expect(frente, `${onde}: cor de frente`).not.toBeNull();
  expect(fundo, `${onde}: cor de fundo`).not.toBeNull();
  expect(razao(hex(frente!), hex(fundo!)), `${onde}: ${frente} sobre ${fundo} ≥ ${minimo}`).toBeGreaterThanOrEqual(minimo);
}

// A variante (hover:, aria-disabled:, has-[:checked]:, md:) e a base da classe, sem a opacidade (/50).
export function utilitario(classe: string): { variante: string; base: string } {
  let profundidade = 0;
  let corte = -1;
  for (let i = 0; i < classe.length; i++) {
    const c = classe[i];
    if (c === '[') profundidade++;
    else if (c === ']') profundidade--;
    else if (c === ':' && profundidade === 0) corte = i;
  }
  return { variante: classe.slice(0, corte + 1), base: classe.slice(corte + 1).replace(/\/\d+$/, '') };
}

// Utilitários com prefixo de cor que não são cor: tamanho e alinhamento de texto, lado, largura e estilo de borda,
// fundo transparente e valor arbitrário entre colchetes.
const NAO_COR =
  /^(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)|border(?:-[trblxyse])?(?:-\d+)?|border-(?:solid|dashed|dotted|double|hidden|none|collapse|separate)|bg-(?:transparent|none)|(?:text|bg|border|accent)-\[[^\]]*\])$/;

// As palavras do código-fonte que têm cara de classe de cor (bg-, text-, border-, accent-), fora dos comentários.
export function palavrasDeClasse(fonte: string): string[] {
  const semComentario = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return semComentario.split(/[\s'"`{}()$,;?]+/).filter((p) => /^(?:[a-z-]+(?:-\[[^\]]*\])?:)*(?:bg|text|border|accent)-\S+$/.test(p));
}

// As classes de cor que não são token do @theme (nome errado, paleta do Tailwind, white/black literais).
export function classesDeCorSemToken(classes: readonly string[], tokens: ReadonlySet<string>): string[] {
  return classes.filter((c) => {
    const { base } = utilitario(c);
    const m = /^(?:bg|text|border|accent)-(.+)$/.exec(base);
    if (!m || NAO_COR.test(base)) return false;
    return !tokens.has(m[1]!);
  });
}

// O token da classe de cor `prefixo` com exatamente a variante pedida (sem variante, por padrão).
function corDe(classes: readonly string[], prefixo: 'bg' | 'text' | 'border' | 'accent', variante = ''): string | null {
  const achadas = classes
    .map(utilitario)
    .filter((u) => u.variante === variante && u.base.startsWith(`${prefixo}-`) && TOKENS.has(u.base.slice(prefixo.length + 1)))
    .map((u) => u.base.slice(prefixo.length + 1));
  const unicas = [...new Set(achadas)];
  if (unicas.length > 1) throw new Error(`mais de uma cor ${variante}${prefixo}-: ${unicas.join(', ')}`);
  return unicas[0] ?? null;
}

const html = (el: ReactElement) => renderToStaticMarkup(el);
const separar = (classe: string) => classe.split(/\s+/).filter(Boolean);
// As classes de cada elemento `tag` do HTML, na ordem em que aparecem.
const classesPorElemento = (s: string, tag: string) => [...s.matchAll(new RegExp(`<${tag}\\b[^>]*\\bclass="([^"]*)"`, 'g'))].map((m) => separar(m[1]!));
const todasAsClasses = (s: string) => [...s.matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => separar(m[1]!));

// Regra do globals.css pelo seletor no começo da linha (a primeira, que é a da base).
const regra = (seletor: string) => new RegExp(`^\\s*${seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm').exec(CSS)?.[1] ?? '';
const corDaPropriedade = (corpo: string, propriedade: string) =>
  new RegExp(`(?:^|[;\\s])${propriedade}:\\s*var\\(--color-([a-z0-9-]+)\\)`).exec(corpo)?.[1] ?? null;

// Onde os componentes ficam: a tela (html), o cartão e os campos (branco) e o cartão marcado ou alerta de informação.
const FUNDO_DA_TELA = corDaPropriedade(regra('html'), 'background-color');
const SUPERFICIES_CLARAS = ['branco', 'superficie', 'nevoa'] as const;
const SUPERFICIES_ESCURAS = ['marinho', 'marinho-luz'] as const;

const COMPONENTES_BASE = [
  'Alerta',
  'AreaTexto',
  'BlocoJson',
  'Botao',
  'CaixaSelecao',
  'CampoTexto',
  'Cartao',
  'DialogoConfirmacao',
  'Esqueleto',
  'GrupoOpcoes',
  'Interruptor',
  'ListaTextos',
  'Paginacao',
  'Selecao',
  'Selo',
  'Tabela',
].map((n) => `src/components/${n}.tsx`);

describe('toda classe de cor dos componentes base é um token do @theme (RF-01, G3.5)', () => {
  it('a regra reprova nome errado, paleta do Tailwind e branco literal, e deixa passar o que não é cor', () => {
    expect(classesDeCorSemToken(palavrasDeClasse('className="bg-selo-violetta-fundo text-sm border-l-4 hover:bg-acao-escura"'), TOKENS)).toEqual([
      'bg-selo-violetta-fundo',
    ]);
    expect(
      classesDeCorSemToken(
        palavrasDeClasse("`${x ? 'bg-red-50 text-white aria-disabled:border-gray-500' : 'has-[:checked]:border-2 backdrop:bg-tinta/50 text-[0.8125rem] border-collapse bg-transparent'}`"),
        TOKENS,
      ),
    ).toEqual(['bg-red-50', 'text-white', 'aria-disabled:border-gray-500']);
    expect(palavrasDeClasse('// usa bg-red-50\n/* e text-white */\nconst a = 1;')).toEqual([]);
    expect(utilitario('has-[:checked]:border-marinho')).toEqual({ variante: 'has-[:checked]:', base: 'border-marinho' });
    expect(utilitario('backdrop:bg-tinta/50')).toEqual({ variante: 'backdrop:', base: 'bg-tinta' });
  });

  it('a varredura enxerga as classes de cor dos componentes base (Selecao herda as de classeDoCampo)', () => {
    const porArquivo = Object.fromEntries(COMPONENTES_BASE.map((a) => [a, palavrasDeClasse(ler(a)).length]));
    for (const a of COMPONENTES_BASE.filter((x) => !x.endsWith('/Selecao.tsx'))) expect(porArquivo[a], a).toBeGreaterThan(0);
    expect(Object.values(porArquivo).reduce((x, y) => x + y, 0)).toBeGreaterThan(60);
    expect(palavrasDeClasse(ler('src/components/Selo.tsx'))).toEqual(expect.arrayContaining(['bg-selo-violeta-fundo', 'text-selo-violeta', 'text-[0.8125rem]']));
    expect(TOKENS.size).toBeGreaterThanOrEqual(39);
  });

  it('nenhuma classe de cor dos componentes base fica sem token', () => {
    expect(COMPONENTES_BASE.flatMap((a) => classesDeCorSemToken(palavrasDeClasse(ler(a)), TOKENS).map((c) => `${a}: ${c}`))).toEqual([]);
  });
});

describe('apelidos e var() do globals.css (D-01)', () => {
  it('a resolução segue a cadeia e devolve null para alvo ausente ou ciclo', () => {
    const m = new Map([
      ['a', 'var(--color-b)'],
      ['b', '#12385F'],
      ['c', 'var(--color-x)'],
      ['d', 'var(--color-e)'],
      ['e', 'var(--color-d)'],
    ]);
    expect(resolver(m, 'a')).toBe('#12385f');
    expect(resolver(m, 'c')).toBeNull();
    expect(resolver(m, 'd')).toBeNull();
    expect(resolver(m, 'z')).toBeNull();
  });

  it('todo --color-* do @theme tem valor hexadecimal, direto ou por apelido, e os nove apelidos da 0.1.13 existem', () => {
    expect([...TOKENS].filter((t) => resolver(DECLARADOS, t) === null)).toEqual([]);
    for (const apelido of ['texto', 'texto-suave', 'fundo', 'fundo-suave', 'borda', 'primaria', 'perigo', 'sucesso', 'atencao-texto'])
      expect(DECLARADOS.get(apelido), apelido).toMatch(/^var\(--color-[a-z0-9-]+\)$/);
  });

  it('todo var(--color-…) do globals.css, dentro ou fora do @theme, aponta para token declarado', () => {
    const usados = [...CSS.matchAll(/var\(--color-([a-z0-9-]+)\)/g)].map((m) => m[1]!);
    expect(usados.length).toBeGreaterThan(9);
    expect(usados.filter((u) => !TOKENS.has(u))).toEqual([]);
  });
});

describe('contraste do que os componentes usam (RNF-01, RNF-02)', () => {
  const SELOS_USADOS: readonly CorSelo[] = [
    ...new Set<CorSelo>([
      ...Object.values(COR_STATUS),
      ...Object.values(COR_DECISAO),
      ...Object.values(COR_NIVEL),
      SELO_RASCUNHO.cor,
      SELO_DESATUALIZADO.cor,
      SELO_SUBSTITUIDO.cor,
    ]),
  ].sort();

  it('a conferência discrimina: preto sobre branco dá 21, e linha sobre branco (divisória decorativa) fica abaixo de 3:1', () => {
    expect(razao('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(razao(hex('linha'), hex('branco'))).toBeLessThan(NAO_TEXTUAL);
    expect(corDe(['bg-acao', 'hover:bg-acao-escura', 'text-sm', 'text-branco'], 'bg', 'hover:')).toBe('acao-escura');
    expect(corDe(['text-sm', 'bg-transparent'], 'bg')).toBeNull();
    expect(() => corDe(['bg-acao', 'bg-erro'], 'bg')).toThrow(/mais de uma cor/);
  });

  it('os mapas de cor usam as dez cores de selo', () => {
    expect(SELOS_USADOS).toHaveLength(10);
  });

  it.each(SELOS_USADOS)('Selo %s: texto sobre o próprio fundo ≥ 4,5:1', (cor) => {
    const c = todasAsClasses(html(h(Selo, { cor, children: 'Texto' })));
    conferir(corDe(c, 'text'), corDe(c, 'bg'), TEXTO, `Selo ${cor}`);
  });

  it.each([SELO_RASCUNHO, SELO_DESATUALIZADO, SELO_SUBSTITUIDO].filter((s) => s.tracejado).map((s) => [s.texto, s] as const))(
    'selo tracejado "%s": a borda que o distingue ≥ 3:1 contra o fundo do selo',
    (_texto, s) => {
      const c = todasAsClasses(html(h(Selo, { cor: s.cor, tracejado: true, children: s.texto })));
      expect(c).toContain('border-dashed');
      conferir(corDe(c, 'border'), corDe(c, 'bg'), NAO_TEXTUAL, `Selo ${s.texto}`);
    },
  );

  const ALERTAS: readonly TipoAlerta[] = ['informacao', 'atencao', 'erro', 'sucesso'];
  it.each(ALERTAS)('Alerta %s: texto e link (cor do `a` do globals.css) sobre o fundo do alerta ≥ 4,5:1', (tipo) => {
    const c = todasAsClasses(html(h(Alerta, { tipo, children: 'Texto.' })));
    const fundo = corDe(c, 'bg');
    conferir(corDe(c, 'text'), fundo, TEXTO, `Alerta ${tipo}`);
    conferir(corDaPropriedade(regra('a'), 'color'), fundo, TEXTO, `link no Alerta ${tipo}`);
  });

  // Onde cada variante do botão fica: as claras na tela e no cartão; as "sobre escuro" na casca e na Próxima ação.
  const ONDE_FICA: Readonly<Record<VarianteBotao, readonly string[]>> = {
    primario: ['branco', 'superficie'],
    secundario: ['branco', 'superficie'],
    perigo: ['branco', 'superficie'],
    link: ['branco', 'superficie', 'nevoa'],
    'sobre-escuro': ['marinho'],
    'claro-sobre-escuro': ['marinho'],
  };
  it.each(Object.keys(ONDE_FICA) as VarianteBotao[])(
    'Botao %s: texto ≥ 4,5:1 sobre o fundo (e no hover), e o contorno do botão ≥ 3:1 contra onde ele fica',
    (variante) => {
      const c = separar(classeDoBotao(variante));
      const texto = corDe(c, 'text');
      const fundo = corDe(c, 'bg');
      const contorno = corDe(c, 'border') ?? fundo;
      for (const sup of ONDE_FICA[variante]) {
        conferir(texto, fundo ?? sup, TEXTO, `Botao ${variante} em ${sup}`);
        if (contorno) conferir(contorno, sup, NAO_TEXTUAL, `contorno do Botao ${variante} em ${sup}`);
      }
      const fundoNoHover = corDe(c, 'bg', 'hover:');
      if (fundoNoHover) conferir(texto, fundoNoHover, TEXTO, `Botao ${variante} no hover`);
    },
  );

  it.each(Object.keys(ONDE_FICA) as VarianteBotao[])('Botao %s indisponível (aria-disabled): texto ≥ 4,5:1 sobre o fundo cinza', (variante) => {
    const c = separar(classeDoBotao(variante));
    conferir(corDe(c, 'text', 'aria-disabled:'), corDe(c, 'bg', 'aria-disabled:'), TEXTO, `Botao ${variante} aria-disabled`);
  });

  it('campos: texto ≥ 4,5:1 sobre o fundo do campo; borda (e borda de erro) ≥ 3:1 contra o campo e contra a tela', () => {
    const limpo = separar(classeDoCampo(false));
    const comErro = separar(classeDoCampo(true));
    conferir(corDe(limpo, 'text'), corDe(limpo, 'bg'), TEXTO, 'campo');
    for (const [c, nome] of [
      [limpo, 'borda do campo'],
      [comErro, 'borda do campo com erro'],
    ] as const)
      for (const sup of [corDe(c, 'bg'), FUNDO_DA_TELA, 'branco']) conferir(corDe(c, 'border'), sup, NAO_TEXTUAL, `${nome} contra ${sup}`);
  });

  it('dica e mensagem de erro dos campos: texto ≥ 4,5:1 na tela, no cartão e na névoa', () => {
    for (const [el, nome] of [
      [h(Dica, { id: 'x', children: 'Dica.' }), 'Dica'],
      [h(MensagemDeErro, { id: 'x', children: 'Erro.' }), 'MensagemDeErro'],
    ] as const) {
      const c = todasAsClasses(html(el));
      for (const sup of [FUNDO_DA_TELA, ...SUPERFICIES_CLARAS]) conferir(corDe(c, 'text'), sup, TEXTO, `${nome} em ${sup}`);
    }
  });

  it('Tabela: cabeçalho ≥ 4,5:1 sobre o fundo do cabeçalho; corpo (texto da página) ≥ 4,5:1 sobre o fundo da tabela', () => {
    const s = html(h(Tabela, { legenda: 'Legenda', rotuloRegiao: 'Região', colunas: ['A'], linhas: [['1']] }));
    const cabecalho = classesPorElemento(s, 'thead')[0]!;
    conferir(corDe(cabecalho, 'text'), corDe(cabecalho, 'bg'), TEXTO, 'thead');
    conferir(corDaPropriedade(regra('html'), 'color'), corDe(classesPorElemento(s, 'table')[0]!, 'bg'), TEXTO, 'tbody');
  });

  it('Interruptor: trilho e botão ≥ 3:1, ligado e desligado (o estado também está em texto)', () => {
    for (const ligado of [true, false]) {
      const s = html(h(Interruptor, { rotulo: 'Agente (fictício)', ligado, onAlternar: () => undefined }));
      const [trilho, botao] = classesPorElemento(s, 'span') as [string[], string[]];
      const fundoDoTrilho = corDe(trilho, 'bg');
      for (const sup of [FUNDO_DA_TELA, 'branco']) conferir(corDe(trilho, 'border'), sup, NAO_TEXTUAL, `trilho ${ligado ? 'ligado' : 'desligado'} em ${sup}`);
      // Ligado, o botão branco se distingue pelo fundo; desligado, pela borda.
      const limiteDoBotao = ligado ? corDe(botao, 'bg') : corDe(botao, 'border');
      conferir(limiteDoBotao, fundoDoTrilho, NAO_TEXTUAL, `botão ${ligado ? 'ligado' : 'desligado'} no trilho`);
      expect(s).toContain(ligado ? '>Ligado</span>' : '>Desligado</span>');
    }
  });

  it('GrupoOpcoes cartão: borda ≥ 3:1 contra o cartão e a tela; marcado, borda ≥ 3:1 e texto e dica ≥ 4,5:1 na névoa', () => {
    const s = html(
      h(GrupoOpcoes, {
        nome: 'opcao',
        legenda: 'Opção',
        variante: 'cartao',
        opcoes: [{ valor: 'A', rotulo: 'Opção A', dica: 'Dica da opção (fictícia).' }],
      }),
    );
    const c = todasAsClasses(s);
    const fundo = corDe(c, 'bg');
    const fundoMarcado = corDe(c, 'bg', 'has-[:checked]:');
    for (const sup of [fundo, FUNDO_DA_TELA, 'branco']) conferir(corDe(c, 'border'), sup, NAO_TEXTUAL, `borda do cartão contra ${sup}`);
    conferir(corDe(c, 'border', 'has-[:checked]:'), fundoMarcado, NAO_TEXTUAL, 'borda do cartão marcado');
    conferir(corDe(c, 'border', 'has-[:checked]:'), FUNDO_DA_TELA, NAO_TEXTUAL, 'borda do cartão marcado contra a tela');
    conferir(corDaPropriedade(regra('html'), 'color'), fundoMarcado, TEXTO, 'rótulo no cartão marcado');
    conferir(corDe(c, 'text'), fundoMarcado, TEXTO, 'dica no cartão marcado');
    for (const sup of [fundo, fundoMarcado]) conferir(corDe(c, 'accent'), sup, NAO_TEXTUAL, `rádio em ${sup}`);
  });

  it('CaixaSelecao: a marca da caixa ≥ 3:1 na tela e no cartão', () => {
    const c = todasAsClasses(html(h(CaixaSelecao, { id: 'x', rotulo: 'Revisei (fictício)' })));
    for (const sup of [FUNDO_DA_TELA, 'branco']) conferir(corDe(c, 'accent'), sup, NAO_TEXTUAL, `caixa em ${sup}`);
  });

  it('BlocoJson: texto ≥ 4,5:1 sobre o fundo do bloco; borda ≥ 3:1 contra o cartão', () => {
    const c = todasAsClasses(html(h(BlocoJson, { rotulo: 'JSON', conteudo: '{}' })));
    conferir(corDe(c, 'text'), corDe(c, 'bg'), TEXTO, 'BlocoJson');
    conferir(corDe(c, 'border'), 'branco', NAO_TEXTUAL, 'borda do BlocoJson no cartão');
  });

  it('Paginacao: link ≥ 4,5:1 sobre o próprio fundo, contorno ≥ 3:1 na tela; indisponível ≥ 4,5:1 na tela e no cartão', () => {
    const s = html(h(Paginacao, { pagina: 1, hrefAnterior: null, hrefProxima: '/demandas?offset=20' }));
    const [indisponivel, link] = classesPorElemento(s, 'a') as [string[], string[]];
    expect(indisponivel).toContain('cursor-not-allowed');
    conferir(corDe(link, 'text'), corDe(link, 'bg'), TEXTO, 'link da paginação');
    conferir(corDe(link, 'border'), FUNDO_DA_TELA, NAO_TEXTUAL, 'contorno do link da paginação');
    for (const sup of [FUNDO_DA_TELA, 'branco']) conferir(corDe(indisponivel, 'text'), sup, TEXTO, `paginação indisponível em ${sup}`);
  });
});

describe('base do globals.css e anel de foco (RNF-01, RNF-02, RNF-04, RNF-11)', () => {
  it('texto da página, h1 e link ≥ 4,5:1 na tela e nas superfícies claras', () => {
    expect(FUNDO_DA_TELA).not.toBeNull();
    for (const [seletor, nome] of [
      ['html', 'texto da página'],
      ['h1', 'h1'],
      ['a', 'link'],
    ] as const)
      for (const sup of [FUNDO_DA_TELA, ...SUPERFICIES_CLARAS]) conferir(corDaPropriedade(regra(seletor), 'color'), sup, TEXTO, `${nome} em ${sup}`);
  });

  it('anel de foco: ≥ 2 px com --cor-foco; no claro ≥ 3:1 na tela e nas superfícies claras; em .superficie-escura ≥ 3:1 no marinho', () => {
    const foco = regra(':focus-visible');
    const largura = /outline:\s*(\d+(?:\.\d+)?)px\s+solid\s+var\(--cor-foco\)/.exec(foco)?.[1];
    expect(largura, 'outline com var(--cor-foco)').toBeDefined();
    expect(Number(largura)).toBeGreaterThanOrEqual(2);
    const noClaro = corDaPropriedade(regra(':root'), '--cor-foco');
    const noEscuro = corDaPropriedade(regra('.superficie-escura'), '--cor-foco');
    for (const sup of [FUNDO_DA_TELA, ...SUPERFICIES_CLARAS]) conferir(noClaro, sup, NAO_TEXTUAL, `foco no claro em ${sup}`);
    for (const sup of SUPERFICIES_ESCURAS) conferir(noEscuro, sup, NAO_TEXTUAL, `foco no escuro em ${sup}`);
  });

  it('o bloco de prefers-reduced-motion continua zerando animação e transição', () => {
    const bloco = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\}\s*\}/.exec(CSS)?.[1] ?? '';
    expect(bloco).toMatch(/animation-duration:\s*0\.01ms\s*!important;/);
    expect(bloco).toMatch(/transition-duration:\s*0\.01ms\s*!important;/);
    expect(bloco).toMatch(/scroll-behavior:\s*auto\s*!important;/);
  });
});
