// test/estatico/vigencia-t11.test.ts — guardas estáticas da vigência na T11 (T12 do DEC-DEM-20261111-0018-v1; SB-12,
// D-06, D-11; G9). Em page.tsx, a leitura nova (vigenteDaDemanda) vem depois de exigirPessoaNaPagina, de
// autorizar(pessoa, 'ler_pacote_decisao') e do notFound() do pacote, uma vez; a leitura do DEC mais novo
// (lerPacoteDaPagina(maisNovo.id)) vem depois dela. Nenhum dangerouslySetInnerHTML em page.tsx, FormularioDecisao.tsx e
// dados-da-decisao.ts; dados-da-decisao.ts vai ao navegador e não importa valor de src/modules/ (só tipo). Cada regra tem
// um caso plantado que a reprova. Não importa de outro *.test.ts: usa ./importacoes e o typescript, como
// arquivamento.test.ts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { fonteTs, importacoesDe } from './importacoes';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');

const PAGINA = 'src/app/(painel)/pacotes-decisao/[decId]/page.tsx';
const FORMULARIO = 'src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx';
const DADOS = 'src/components/dados-da-decisao.ts';

// O corpo da função declarada no nível do arquivo (inclusive `export default async function`); vazio se não existir.
function corpoDaFuncao(arquivo: string, fonte: string, nome: string): string {
  const sf = fonteTs(arquivo, fonte);
  let corpo = '';
  ts.forEachChild(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === nome && n.body) corpo = n.body.getText(sf);
  });
  return corpo;
}

// A ordem pedida: cada padrão é procurado a partir do fim do anterior; -1 no que faltar.
const ORDEM_DA_LEITURA: readonly RegExp[] = [
  /\bexigirPessoaNaPagina\s*\(/,
  /\bautorizar\(\s*pessoa\s*,\s*'ler_pacote_decisao'\s*\)/,
  /\blerPacoteDaPagina\(\s*decId\s*\)/,
  /\bnotFound\(\s*\)/,
  /\bvigenteDaDemanda\s*\(/,
  /\blerPacoteDaPagina\(\s*maisNovo\.id\s*\)/,
];

function posicoesEmSequencia(corpo: string, padroes: readonly RegExp[]): number[] {
  let desde = 0;
  return padroes.map((p) => {
    if (desde < 0) return -1;
    const i = corpo.slice(desde).search(p);
    desde = i < 0 ? -1 : desde + i + 1;
    return i < 0 ? -1 : desde - 1;
  });
}

// true se cada padrão aparece depois do anterior e a leitura do vigente não aparece antes do notFound() do pacote.
function vigenteNaOrdem(corpo: string): boolean {
  const p = posicoesEmSequencia(corpo, ORDEM_DA_LEITURA);
  if (p.some((x) => x < 0)) return false;
  // A primeira chamada da leitura nova, onde quer que esteja, tem de ser a da sequência.
  return corpo.search(/\bvigenteDaDemanda\s*\(/) === p[4];
}

const quantas = (corpo: string, padrao: RegExp): number => (corpo.match(new RegExp(padrao.source, 'g')) ?? []).length;

// O que reprova em dados-da-decisao.ts: importação por valor de src/modules/ (D-11).
function valoresDeModulos(arquivo: string, fonte: string): string[] {
  return importacoesDe(arquivo, fonte)
    .filter((i) => /(^|\/)modules(\/|$)/.test(i.origem) && !i.soTipo)
    .map((i) => i.origem);
}

describe('SB-12 e G9: a leitura do vigente em page.tsx só depois de autorizar e de achar o pacote', () => {
  const corpo = corpoDaFuncao(PAGINA, ler(PAGINA), 'PaginaDecisao');

  it('o corpo da página foi achado', () => {
    expect(corpo.length).toBeGreaterThan(0);
  });
  it('exigirPessoaNaPagina → autorizar ler_pacote_decisao → lerPacoteDaPagina(decId) → notFound() → vigenteDaDemanda → lerPacoteDaPagina(maisNovo.id)', () => {
    expect(posicoesEmSequencia(corpo, ORDEM_DA_LEITURA).every((x) => x >= 0)).toBe(true);
    expect(vigenteNaOrdem(corpo)).toBe(true);
  });
  it('o vigente é lido uma vez, e o mais novo no máximo uma', () => {
    expect(quantas(corpo, /\bvigenteDaDemanda\s*\(/)).toBe(1);
    expect(quantas(corpo, /\blerPacoteDaPagina\(\s*maisNovo\.id\s*\)/)).toBe(1);
  });
  it('vigenteDaDemanda vem de modules/pacotes-decisao/substituido', () => {
    const origem = importacoesDe(PAGINA, ler(PAGINA)).find((i) => i.nomes.includes('vigenteDaDemanda'))?.origem;
    expect(origem).toBe('../../../../modules/pacotes-decisao/substituido');
  });
});

describe('SB-12: nenhum dangerouslySetInnerHTML nos arquivos da T11', () => {
  it.each([PAGINA, FORMULARIO, DADOS])('%s', (arquivo) => {
    const f = ler(arquivo);
    expect(f.length).toBeGreaterThan(0);
    expect(f).not.toContain('dangerouslySetInnerHTML');
  });
});

describe('D-11: dados-da-decisao.ts não importa valor de src/modules/', () => {
  it('só tipos de src/modules/, e importa ao menos um', () => {
    const f = ler(DADOS);
    expect(valoresDeModulos(DADOS, f)).toEqual([]);
    expect(importacoesDe(DADOS, f).some((i) => /(^|\/)modules\//.test(i.origem) && i.soTipo)).toBe(true);
  });
});

describe('as regras pegam o caso plantado', () => {
  const certo = [
    "const pessoa = await exigirPessoaNaPagina('/x');",
    "autorizar(pessoa, 'ler_pacote_decisao');",
    'const p = await lerPacoteDaPagina(decId);',
    'if (!p) notFound();',
    'const vigente = await vigenteDaDemanda(db, p.demandaId);',
    'const pendente = cond ? await lerPacoteDaPagina(maisNovo.id) : null;',
  ];
  it('a ordem certa passa', () => {
    expect(vigenteNaOrdem(certo.join('\n'))).toBe(true);
  });
  it('o vigente lido antes da pessoa, da autorização ou do notFound() do pacote reprova', () => {
    const antes = (i: number) => [...certo.slice(0, i), certo[4]!, ...certo.slice(i, 4), certo[5]!].join('\n');
    for (const i of [0, 1, 2, 3]) expect(vigenteNaOrdem(antes(i)), `antes da linha ${i}`).toBe(false);
  });
  it('uma leitura do vigente a mais antes do notFound() reprova, mesmo com a da sequência no lugar', () => {
    expect(vigenteNaOrdem([certo[0], certo[1], 'void vigenteDaDemanda(db, id);', ...certo.slice(2)].join('\n'))).toBe(false);
  });
  it('sem a autorização, sem o notFound() ou com o mais novo lido antes do vigente reprova', () => {
    expect(vigenteNaOrdem(certo.filter((_, i) => i !== 1).join('\n'))).toBe(false);
    expect(vigenteNaOrdem(certo.filter((_, i) => i !== 3).join('\n'))).toBe(false);
    expect(vigenteNaOrdem([...certo.slice(0, 4), certo[5]!, certo[4]!].join('\n'))).toBe(false);
  });
  it('corpoDaFuncao acha a página exportada por padrão e só ela', () => {
    const plantada = "export default async function PaginaDecisao() {\n  autorizar(pessoa, 'x');\n}\nfunction Outra() { vigenteDaDemanda(db, id); }\n";
    expect(corpoDaFuncao('x.tsx', plantada, 'PaginaDecisao')).toContain("autorizar(pessoa, 'x')");
    expect(corpoDaFuncao('x.tsx', plantada, 'PaginaDecisao')).not.toContain('vigenteDaDemanda');
    expect(corpoDaFuncao('x.tsx', plantada, 'Nenhuma')).toBe('');
  });
  it('importação por valor de src/modules/ reprova; de tipo, não', () => {
    expect(valoresDeModulos('x.ts', "import type { Status } from '../modules/demandas/schemas';")).toEqual([]);
    expect(valoresDeModulos('x.ts', "import { type Status } from '../modules/demandas/schemas';")).toEqual([]);
    expect(valoresDeModulos('x.ts', "import { destinoDoArquivamento } from '../modules/demandas/arquivamento';")).toEqual(['../modules/demandas/arquivamento']);
    expect(valoresDeModulos('x.ts', "import { RE_ID_DEC } from './dados-do-pacote';")).toEqual([]);
    expect(valoresDeModulos('x.ts', "const m = await import('../modules/demandas/arquivamento');")).toEqual(['../modules/demandas/arquivamento']);
  });
  it('o texto plantado com dangerouslySetInnerHTML é achado', () => {
    expect('<div dangerouslySetInnerHTML={{ __html: t }} />').toContain('dangerouslySetInnerHTML');
  });
});
