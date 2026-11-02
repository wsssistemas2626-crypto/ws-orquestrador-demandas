// Escrito na 04-regressao do DEC-DEM-20261102-0005-v1 (qa-automacao). Trava em teste de unidade os dois defeitos do
// pedido, que o e2e sozinho não pega:
//   - D-1: o "Arquivar" de e2e/decisao.spec.ts passa pelo axe na tela arquivada, depois das conferências de status e
//     sem navegação no meio; a pré-condição e as conferências da 0.1.3 continuam; nenhum e2e desliga, filtra ou
//     restringe o axe, e o `semViolacoes` de e2e/apoio.ts segue com as tags de TAGS_AXE;
//   - D-2: o comentário de cabeçalho da decisao.spec.ts tem linhas de até 120 caracteres (o printWidth do .prettierrc,
//     que o Prettier não aplica a comentário), nenhuma linha órfã, e a frase do axe cita o arquivado.
// Cada regra tem um teste que prova que ela reprova o cabeçalho da 0.1.3 (main 00a924e) e deixa passar a forma certa.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');
const listar = (padrao: string) => globSync(padrao, { cwd: raiz }).sort();
// O código sem os comentários de bloco e de linha inteira: o comentário pode citar o que o código não faz.
const codigo = (fonte: string) => fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const SPEC = 'e2e/decisao.spec.ts';
const LARGURA = 120;
// Linha que não é a última do parágrafo e ocupa menos da metade da largura: sobra uma palavra ou um fragmento que a
// linha de cima comportaria (a linha 7 da 0.1.3 tinha 30 caracteres).
const ORFA_ABAIXO_DE = LARGURA / 2;

// Largura em caracteres, como o printWidth mede: acento conta um.
const largura = (linha: string) => [...linha.normalize('NFC')].length;

const cabecalho = (fonte: string) => {
  const linhas = fonte.split('\n');
  const fim = linhas.findIndex((l) => !l.startsWith('//'));
  return linhas.slice(0, fim === -1 ? linhas.length : fim);
};

// Recuo do texto depois de `//` e se a linha abre item de lista (`//   - `).
const recuo = (linha: string) => {
  const m = /^\/\/( *)(- )?/.exec(linha);
  return { espacos: m?.[1]?.length ?? 0, item: Boolean(m?.[2]) };
};

// A linha seguinte continua o parágrafo da atual: tem texto, não abre item e está no recuo de continuação (o mesmo
// recuo, ou dois a mais quando a atual abre item).
function continua(atual: string, seguinte: string | undefined): boolean {
  if (seguinte === undefined || seguinte.trim() === '//' || atual.trim() === '//') return false;
  const a = recuo(atual);
  const s = recuo(seguinte);
  return !s.item && s.espacos === a.espacos + (a.item ? 2 : 0);
}

function problemasDoCabecalho(linhas: string[]): string[] {
  const problemas: string[] = [];
  linhas.forEach((linha, i) => {
    const n = largura(linha);
    if (n > LARGURA) problemas.push(`linha ${i + 1}: ${n} caracteres`);
    if (n < ORFA_ABAIXO_DE && continua(linha, linhas[i + 1])) problemas.push(`linha ${i + 1}: órfã (${n} caracteres)`);
  });
  return problemas;
}

// A frase do cabeçalho que diz onde o axe roda, com as linhas juntadas.
function fraseDoAxe(linhas: string[]): string {
  const texto = linhas.map((l) => l.replace(/^\/\/\s?/, '').trim()).join(' ');
  return /O axe roda[^.]*\./.exec(texto)?.[0] ?? '';
}

function corpoDoTeste(fonte: string, inicioDoTitulo: string): string {
  const inicio = fonte.indexOf(`test('${inicioDoTitulo}`);
  if (inicio === -1) return '';
  const fim = fonte.indexOf('\n});', inicio);
  return fonte.slice(inicio, fim === -1 ? undefined : fim);
}

// Trecho real do cabeçalho da 0.1.3 (linhas 1 a 11), para provar que as regras reprovam o que o pedido corrigiu.
const CABECALHO_0_1_3 = [
  '// T43: T11 Decisão do pacote (03, T11; RF-12 a RF-14; 04, C-14; P1-a, P1-b, P1-d). Os pacotes são criados pela API com a',
  '// sessão da conta fictícia "cto", um DEC novo por teste, todos sobre uma demanda só desta spec (do seed, com a ESP e o',
  '// RSK gravados na primeira vez que um teste precisa). Uma demanda por teste estourava o limite por ator da suíte inteira (C-36: 30',
  '// demandas por hora por conta). A ordem do arquivo é a do fluxo: aprovar e a dupla aprovação deixam a demanda em Pronta',
  '// para decisão; devolver a leva a Em análise; arquivar, a Encerrada; depois, o 404 e a sessão, sem mudar o banco. Cada',
  '// teste roda também sozinho. O pacote de rascunho de agente é o do seed fictício (T33), que nasce "CTO e administradora"',
  '// (08-correcao, A-04: o nível',
  '// do DEC de agente é da regra do servidor), e nenhum teste daqui registra decisão nele. O P1-b usa um DEC de pessoa de',
  '// nível "Só o CTO", criado pela "cto". Com A-02 (só um DEC aprovado por demanda), a dupla aprovação usa uma demanda',
  '// própria, que vem do seed (TITULOS_DO_E2E.duplaAprovacao) e não da API, pelo mesmo limite C-36; ela troca a sessão da',
  '// página da "cto" para a "administradora". O axe roda pendente, desatualizado, com erro e decidido.',
];

describe('D-2: cabeçalho de e2e/decisao.spec.ts', () => {
  const linhas = cabecalho(ler(SPEC));

  it('o cabeçalho é o comentário antes do primeiro import (falha se a extração quebrar)', () => {
    expect(linhas.length).toBeGreaterThan(20);
    expect(linhas[0]).toMatch(/^\/\/ T43: T11 Decisão do pacote/);
    expect(linhas.at(-1)).toMatch(/^\/\/ Uso por conta deste arquivo:/);
  });

  it(`nenhuma linha passa de ${LARGURA} caracteres nem fica órfã`, () => {
    expect(problemasDoCabecalho(linhas)).toEqual([]);
  });

  it('a frase do axe cita o arquivado e os outros estados decididos', () => {
    const frase = fraseDoAxe(linhas);
    expect(frase).not.toBe('');
    for (const estado of ['pendente', 'com erro', 'desatualizado', 'aprovado', 'devolvido', 'arquivado']) expect(frase, estado).toContain(estado);
  });

  it('as regras reprovam o cabeçalho da 0.1.3: linhas largas, a órfã da linha 7 e a frase sem o arquivado', () => {
    expect(problemasDoCabecalho(CABECALHO_0_1_3)).toEqual([
      'linha 1: 121 caracteres',
      'linha 3: 131 caracteres',
      'linha 6: 121 caracteres',
      'linha 7: órfã (30 caracteres)',
    ]);
    expect(fraseDoAxe(CABECALHO_0_1_3)).toBe('O axe roda pendente, desatualizado, com erro e decidido.');
    expect(fraseDoAxe(CABECALHO_0_1_3)).not.toContain('arquivado');
  });

  it('as regras deixam passar o fim de parágrafo curto, a lista e a mudança de recuo', () => {
    expect(
      problemasDoCabecalho([
        `// ${'a'.repeat(LARGURA - 3)}`,
        '// fim curto.',
        '//',
        '// abre a lista:',
        '//   - item curto;',
        `//   - ${'c'.repeat(100)}`,
        '//     fim do item.',
        '// Outro parágrafo, sem linha em branco antes.',
      ]),
    ).toEqual([]);
    // Acento conta um caractere, também em forma decomposta.
    expect(problemasDoCabecalho([`// ${'é'.repeat(LARGURA - 3)}`, `// ${'é'.repeat(LARGURA - 3)}`])).toEqual([]);
    expect(problemasDoCabecalho([`// ${'é'.repeat(LARGURA - 2)}`])).toEqual([`linha 1: ${LARGURA + 1} caracteres`]);
    // A órfã dentro de um item da lista também reprova.
    expect(problemasDoCabecalho(['//   - item que quebra cedo', `//     ${'b'.repeat(80)}`])).toEqual(['linha 1: órfã (27 caracteres)']);
  });
});

describe('D-1: o "Arquivar" passa pelo axe na tela arquivada', () => {
  const fonte = ler(SPEC);
  const corpo = corpoDoTeste(fonte, 'Arquivar → ');
  const AXE = "await semViolacoes(page, 'T11 arquivado');";
  const ALERTA = "toHaveText('Pacote arquivado. A demanda foi para Encerrada.')";

  it('o teste existe e o corpo foi achado (falha se a extração quebrar)', () => {
    expect(corpo).toMatch(/^test\('Arquivar → "Pacote arquivado\. A demanda foi para Encerrada\."'/);
    expect(corpo).toContain('await confirmar(page);');
  });

  it("chama semViolacoes(page, 'T11 arquivado') uma vez, depois do alerta e das três conferências de status", () => {
    expect(corpo.split(AXE)).toHaveLength(2);
    const axe = corpo.indexOf(AXE);
    for (const antes of [ALERTA, ".toBe('arquivada')", ".toBe('encerrada')"]) {
      expect(corpo.indexOf(antes), antes).toBeGreaterThan(-1);
      expect(corpo.indexOf(antes), antes).toBeLessThan(axe);
    }
  });

  it('entre o alerta e o axe não há navegação nem ação na página', () => {
    expect(corpo.indexOf(AXE)).toBeGreaterThan(corpo.indexOf(ALERTA));
    const entre = corpo.slice(corpo.indexOf(ALERTA), corpo.indexOf(AXE));
    expect(entre).not.toMatch(/\.goto\(|\.reload\(|\.click\(|\.check\(|\.fill\(|confirmar\(|entrarComo\(|clearCookies\(/);
  });

  it('a pré-condição e as conferências de status da 0.1.3 continuam', () => {
    expect(corpo).toContain('exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), `a demanda ${demandaId} está ${status}, e o arquivamento');
    expect(corpo).toMatch(/expect\(await statusDa\(page, demandaId\), `status da demanda \$\{demandaId\} antes de arquivar`\)\.toBe\('pronta_para_decisao'\);/);
    expect(corpo).toContain("expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('arquivada');");
    expect(corpo).toMatch(/expect\(await statusDa\(page, demandaId\), `status da demanda \$\{demandaId\} depois de arquivar`\)\.toBe\('encerrada'\);/);
    expect(fonte).toContain("const ORIGENS_DO_FLUXO: readonly string[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao'];");
    expect(fonte).toContain('  if (process.env.CI) expect(condicao, mensagem).toBe(true);\n  else test.skip(!condicao, mensagem);');
    expect(fonte).toContain('const mensagem = `exige banco recém-semeado: ${motivo}`;');
  });

  it('a spec só pula pela pré-condição, com mensagem, e não tem only, fixme nem todo', () => {
    const fonteSemComentario = codigo(fonte);
    expect(fonteSemComentario.match(/\btest\s*\.\s*(?:skip|fixme|only|todo)\b|\b(?:it|describe)\s*\.\s*(?:skip|only|todo)\b/g)).toEqual(['test.skip']);
    expect(fonteSemComentario).toContain('test.skip(!condicao, mensagem)');
  });
});

describe('nenhum e2e desliga, filtra ou restringe o axe', () => {
  const SILENCIA = /\bdisableRules\b|\.\s*exclude\s*\(|\.\s*include\s*\(|\bwithRules\b|\.\s*options\s*\(|\bdisableOtherRules\b/;
  const arquivos = listar('e2e/**/*.ts');

  it('a varredura enxerga e2e/ (falha se o glob quebrar)', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['e2e/apoio.ts', SPEC, 'e2e/sem-violacoes.spec.ts']));
  });

  it('nenhum arquivo de e2e/ usa disableRules, exclude, include, withRules nem options do axe', () => {
    expect(arquivos.filter((a) => SILENCIA.test(codigo(ler(a))))).toEqual([]);
  });

  it('só e2e/apoio.ts monta o AxeBuilder, com as tags de TAGS_AXE, e reprova com qualquer violação', () => {
    expect(arquivos.filter((a) => /\bAxeBuilder\b/.test(codigo(ler(a))))).toEqual(['e2e/apoio.ts']);
    const apoio = codigo(ler('e2e/apoio.ts'));
    expect(apoio).toContain("export const TAGS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;");
    expect(apoio).toContain('await new AxeBuilder({ page }).withTags([...TAGS_AXE]).analyze();');
    expect(apoio).toMatch(/expect\(violacoes, `axe em \$\{rotulo\}[^`]*`\)\.toEqual\(\[\]\);/);
  });

  it('a regra pega as formas de silenciar e deixa passar o includes de array', () => {
    for (const t of [
      "new AxeBuilder({ page }).disableRules(['color-contrast'])",
      "builder.exclude('#alerta')",
      "builder.include('main')",
      "builder.withRules(['image-alt'])",
      'builder.options({ runOnly: [] })',
    ])
      expect(t).toMatch(SILENCIA);
    for (const t of ['ORIGENS_DO_FLUXO.includes(status)', 'texto.includes(x)', "new AxeBuilder({ page }).withTags([...TAGS_AXE]).analyze()"])
      expect(t).not.toMatch(SILENCIA);
  });
});
