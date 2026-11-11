// test/estatico/dados-das-etapas.test.ts — T10 do DEC-DEM-20261110-0015-v1: CV-09 (parte estática) e CA-09.4.
// 1) `src/components/dados-das-etapas.ts` importa por lista de permissão: de `src/modules/` só `import type`; valor só de
//    `./rotulos` e `./dados-do-pacote`; nunca nada (nem tipo) de `acesso`, `db`, `lib/deps`, `acoes`, `drizzle-orm` ou
//    `next`.
// 2) `etapasDaDemanda` e `proximaAcao` só são chamadas (ou importadas por valor) em `src/app/**/page.tsx`, fora dos
//    testes: nunca por Server Action, rota, componente ou módulo de regra.
// Cada regra tem um caso plantado que a faz reprovar (padrão técnico, seção 7). As importações são lidas pela árvore do
// TypeScript (não por regex): a importação em várias linhas e o `type` por especificador contam certo.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');

const MODULO = 'src/components/dados-das-etapas.ts';
const FUNCOES = ['etapasDaDemanda', 'proximaAcao'] as const;

// Lista de permissão das importações por valor do módulo.
const VALOR_PERMITIDO: readonly string[] = ['./rotulos', './dados-do-pacote'];
// Origem vetada por inteiro, até para tipo (CV-09 e G3.7): acesso, banco, deps, Server Actions, ORM e Next.
const VETADA = /(^|\/)(acesso|db)(\/|$)|(^|\/)lib\/deps(\.[cm]?[jt]sx?)?$|(^|\/)acoes(-[\w-]+)?(\.[cm]?[jt]sx?)?$|^drizzle-orm(\/|$)|^next(\/|$)/;
const DE_MODULOS = /(^|\/)modules\//;

const ehPagina = (arquivo: string): boolean => /^src\/app\/(.+\/)?page\.tsx$/.test(arquivo);
const apontaParaOModulo = (origem: string): boolean => /(^|\/)dados-das-etapas(\.[cm]?[jt]sx?)?$/.test(origem);

type Importacao = { origem: string; nomes: string[]; namespace: boolean; soTipo: boolean };

const fonteTs = (arquivo: string, fonte: string) =>
  ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, arquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

// Importações e reexportações estáticas, `import()` e `require()`.
function importacoesDe(arquivo: string, fonte: string): Importacao[] {
  const raizDoArquivo = fonteTs(arquivo, fonte);
  const r: Importacao[] = [];
  const visitar = (no: ts.Node): void => {
    if (ts.isImportDeclaration(no) && ts.isStringLiteral(no.moduleSpecifier)) {
      const clausula = no.importClause;
      const ligacoes = clausula?.namedBindings;
      const nomeados = ligacoes && ts.isNamedImports(ligacoes) ? [...ligacoes.elements] : [];
      const todosTipo = !clausula?.name && nomeados.length > 0 && nomeados.every((x) => x.isTypeOnly);
      r.push({
        origem: no.moduleSpecifier.text,
        nomes: nomeados.filter((x) => !x.isTypeOnly).map((x) => (x.propertyName ?? x.name).text),
        namespace: !!ligacoes && ts.isNamespaceImport(ligacoes),
        soTipo: !!clausula?.isTypeOnly || todosTipo,
      });
    } else if (ts.isExportDeclaration(no) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) {
      const nomeados = no.exportClause && ts.isNamedExports(no.exportClause) ? [...no.exportClause.elements] : [];
      r.push({
        origem: no.moduleSpecifier.text,
        nomes: nomeados.filter((x) => !x.isTypeOnly).map((x) => (x.propertyName ?? x.name).text),
        namespace: !no.exportClause || ts.isNamespaceExport(no.exportClause),
        soTipo: no.isTypeOnly || (nomeados.length > 0 && nomeados.every((x) => x.isTypeOnly)),
      });
    } else if (
      ts.isCallExpression(no) &&
      (no.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(no.expression) && no.expression.text === 'require'))
    ) {
      const [arg] = no.arguments;
      // Caminho que não é literal não dá para conferir: entra como importação de tudo, com a origem crua.
      r.push({ origem: arg && ts.isStringLiteralLike(arg) ? arg.text : (arg?.getText(raizDoArquivo) ?? ''), nomes: [], namespace: true, soTipo: false });
    }
    ts.forEachChild(no, visitar);
  };
  visitar(raizDoArquivo);
  return r;
}

// O que reprova nas importações do módulo; lista vazia = importações certas.
export function achadosDasImportacoes(fonte: string): string[] {
  const achados: string[] = [];
  for (const i of importacoesDe(MODULO, fonte)) {
    if (VETADA.test(i.origem)) achados.push(`vetada: ${i.origem}`);
    else if (DE_MODULOS.test(i.origem)) {
      if (!i.soTipo) achados.push(`valor de src/modules: ${i.origem}`);
    } else if (!i.soTipo && !VALOR_PERMITIDO.includes(i.origem)) achados.push(`valor fora da lista: ${i.origem}`);
  }
  return achados;
}

// Arquivos que usam as duas funções: chamada pelo nome (ou por `x.proximaAcao(`), importação por valor delas, ou
// importação de tudo do módulo (namespace, `export *`, `import()` e `require()`).
export function usuariosDasFuncoes(arquivos: ReadonlyArray<readonly [string, string]>): string[] {
  const nomes: readonly string[] = FUNCOES;
  return arquivos
    .filter(([arquivo, fonte]) => {
      const importa = importacoesDe(arquivo, fonte).some((i) => !i.soTipo && apontaParaOModulo(i.origem) && (i.namespace || i.nomes.some((n) => nomes.includes(n))));
      let chama = false;
      const visitar = (no: ts.Node): void => {
        if (ts.isCallExpression(no)) {
          const f = no.expression;
          const nome = ts.isIdentifier(f) ? f.text : ts.isPropertyAccessExpression(f) ? f.name.text : null;
          if (nome && nomes.includes(nome)) chama = true;
        }
        ts.forEachChild(no, visitar);
      };
      visitar(fonteTs(arquivo, fonte));
      return importa || chama;
    })
    .map(([arquivo]) => arquivo);
}

const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a) && a !== MODULO)
  .sort();

describe('CV-09: o que dados-das-etapas.ts importa', () => {
  it('o módulo existe e não tem achado', () => {
    expect(achadosDasImportacoes(ler(MODULO))).toEqual([]);
  });

  it('reprova cada importação plantada', () => {
    expect(achadosDasImportacoes("import { autorizar } from '../modules/acesso/matriz';")).toEqual(['vetada: ../modules/acesso/matriz']);
    expect(achadosDasImportacoes("import type { Agente } from '../modules/acesso/ator';")).toEqual(['vetada: ../modules/acesso/ator']);
    expect(achadosDasImportacoes("import type { Db } from '../db';")).toEqual(['vetada: ../db']);
    expect(achadosDasImportacoes("import type { OpcaoDecisao } from '../db/schema/decisao';")).toEqual(['vetada: ../db/schema/decisao']);
    expect(achadosDasImportacoes("import { obterDeps } from '../lib/deps';")).toEqual(['vetada: ../lib/deps']);
    expect(achadosDasImportacoes("import { obterDeps } from '@/lib/deps';")).toEqual(['vetada: @/lib/deps']);
    expect(achadosDasImportacoes("import { decidir } from '../app/(painel)/pacotes-decisao/[decId]/acoes';")).toEqual(['vetada: ../app/(painel)/pacotes-decisao/[decId]/acoes']);
    expect(achadosDasImportacoes("import { gerar } from '../app/(painel)/pacotes-decisao/[decId]/acoes-pedido';")).toEqual([
      'vetada: ../app/(painel)/pacotes-decisao/[decId]/acoes-pedido',
    ]);
    expect(achadosDasImportacoes("import { eq } from 'drizzle-orm';")).toEqual(['vetada: drizzle-orm']);
    expect(achadosDasImportacoes("import { redirect } from 'next/navigation';")).toEqual(['vetada: next/navigation']);
    expect(achadosDasImportacoes("import { obterDemanda } from '../modules/demandas/consultas';")).toEqual(['valor de src/modules: ../modules/demandas/consultas']);
    expect(achadosDasImportacoes("import {\n  type DemandaVista,\n  obterDemanda,\n} from '../modules/demandas/consultas';")).toEqual([
      'valor de src/modules: ../modules/demandas/consultas',
    ]);
    expect(achadosDasImportacoes("import * as m from '../modules/demandas/consultas';")).toEqual(['valor de src/modules: ../modules/demandas/consultas']);
    expect(achadosDasImportacoes("const m = await import('../modules/demandas/consultas');")).toEqual(['valor de src/modules: ../modules/demandas/consultas']);
    expect(achadosDasImportacoes("import { ID_SECAO } from '../app/(painel)/demandas/[id]/detalhe';")).toEqual(['valor fora da lista: ../app/(painel)/demandas/[id]/detalhe']);
    expect(achadosDasImportacoes("import { formatarData } from '../lib/fuso';")).toEqual(['valor fora da lista: ../lib/fuso']);
    expect(achadosDasImportacoes("import './efeito';")).toEqual(['valor fora da lista: ./efeito']);
  });

  it('aceita tipo de src/modules (fora de acesso) e valor da lista de permissão', () => {
    const certo = [
      "import type { DemandaVista } from '../modules/demandas/consultas';",
      "import { type EventoVisivel } from '../modules/historico/consultas';",
      "import type { Aprovador, PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';",
      "import { RE_ID_DEC } from './dados-do-pacote';",
      "import { ARTEFATO_DO_AGENTE, agenteNaFrase, NOME_AGENTE } from './rotulos';",
      "import type { CorSelo } from './rotulos';",
    ].join('\n');
    expect(achadosDasImportacoes(certo)).toEqual([]);
  });
});

describe('CA-09.4: etapasDaDemanda e proximaAcao só em página', () => {
  it('a varredura enxerga o código que roda e deixa os testes de fora (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining(['src/app/(painel)/demandas/[id]/page.tsx', 'src/components/rotulos.ts', 'scripts/seed-ficticio.ts']));
    expect(codigoQueRoda.filter((a) => a.includes('.test.'))).toEqual([]);
    expect(codigoQueRoda).not.toContain(MODULO);
  });

  it('quem usa as funções no código que roda é página (src/app/**/page.tsx)', () => {
    const usuarios = usuariosDasFuncoes(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(usuarios.filter((a) => !ehPagina(a))).toEqual([]);
  });

  it('acha cada uso plantado, e não conta tipo, outro nome nem propriedade com o mesmo nome', () => {
    const plantados = [
      ['src/app/(painel)/demandas/[id]/acoes.ts', "import { proximaAcao } from '../../../../components/dados-das-etapas';\nproximaAcao(x);"],
      ['src/app/api/demandas/route.ts', "import { etapasDaDemanda } from '@/components/dados-das-etapas';"],
      ['src/modules/demandas/x.ts', "import * as e from '../../components/dados-das-etapas';\ne.proximaAcao(x);"],
      ['src/components/Cartao.tsx', "import {\n  type ProximaAcao,\n  proximaAcao,\n} from './dados-das-etapas';"],
      ['src/components/Reexporta.ts', "export * from './dados-das-etapas';"],
      ['src/components/Dinamico.ts', "const m = await import('./dados-das-etapas');"],
      ['src/lib/chama.ts', 'const r = proximaAcao(dados);'],
      ['src/app/(painel)/demandas/[id]/page.tsx', "import { etapasDaDemanda, proximaAcao } from '../../../../components/dados-das-etapas';\netapasDaDemanda(x);\nproximaAcao(x);"],
      ['src/components/Tipo.tsx', "import type { ProximaAcao } from './dados-das-etapas';\ntype P = { proximaAcao: ProximaAcao };"],
      ['src/components/Textos.tsx', "import { TEXTOS_ETAPAS } from './dados-das-etapas';\nconst x = { proximaAcao: 1 };"],
      ['src/components/Outro.ts', "import { proximaAcao } from './dados-das-etapas-antigo';"],
    ] as const;
    const usuarios = usuariosDasFuncoes(plantados);
    expect(usuarios).toEqual([
      'src/app/(painel)/demandas/[id]/acoes.ts',
      'src/app/api/demandas/route.ts',
      'src/modules/demandas/x.ts',
      'src/components/Cartao.tsx',
      'src/components/Reexporta.ts',
      'src/components/Dinamico.ts',
      'src/lib/chama.ts',
      'src/app/(painel)/demandas/[id]/page.tsx',
    ]);
    expect(usuarios.filter((a) => !ehPagina(a))).toHaveLength(7);
  });

  it('página é só src/app/**/page.tsx', () => {
    expect(ehPagina('src/app/(painel)/demandas/[id]/page.tsx')).toBe(true);
    expect(ehPagina('src/app/page.tsx')).toBe(true);
    expect(ehPagina('src/app/(painel)/demandas/[id]/CartaoProximaAcao.tsx')).toBe(false);
    expect(ehPagina('src/app/api/demandas/route.ts')).toBe(false);
    expect(ehPagina('src/app/(painel)/demandas/[id]/page.ts')).toBe(false);
    expect(ehPagina('src/components/page.tsx')).toBe(false);
  });
});
