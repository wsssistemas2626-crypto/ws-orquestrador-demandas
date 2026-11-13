// test/estatico/dados-do-andamento.test.ts — 06-T11-testes do DEC-DEM-20261111-0017-v1 (qa-automacao; M3 da revisão da
// T11; CV-09): `src/components/dados-do-andamento.ts` vai ao navegador (o selo da fila e a seção do detalhe), então importa
// por lista de permissão:
//   - por valor, só `./rotulos` e `./dados-do-pacote`;
//   - de `src/modules/` e de `src/db/schema/`, só `import type`;
//   - nunca nada (nem tipo) de `acesso`, de `db` fora de `db/schema`, de `lib/deps`, de Server Action (`acoes`), de
//     `drizzle-orm` nem de `next`.
// Cada regra tem um caso plantado que a faz reprovar (padrão técnico, seção 7). O leitor de importações é o de
// ./importacoes (D-T10-01): pela árvore do TypeScript, não por regex.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importacoesDe } from './importacoes';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const MODULO = 'src/components/dados-do-andamento.ts';

const VALOR_PERMITIDO: readonly string[] = ['./rotulos', './dados-do-pacote'];
// Vetada até para tipo: acesso, banco fora do esquema, deps, Server Actions, ORM e Next.
const VETADA =
  /(^|\/)acesso(\/|$)|(^|\/)db(\/(?!schema\/)|$)|(^|\/)db\/schema$|(^|\/)lib\/deps(\.[cm]?[jt]sx?)?$|(^|\/)acoes(-[\w-]+)?(\.[cm]?[jt]sx?)?$|^drizzle-orm(\/|$)|^next(\/|$)/;
const SO_TIPO = /(^|\/)modules\/|(^|\/)db\/schema\//;

export function achadosDasImportacoes(fonte: string): string[] {
  const achados: string[] = [];
  for (const i of importacoesDe(MODULO, fonte)) {
    if (VETADA.test(i.origem)) achados.push(`vetada: ${i.origem}`);
    else if (SO_TIPO.test(i.origem)) {
      if (!i.soTipo) achados.push(`valor de módulo ou esquema: ${i.origem}`);
    } else if (!i.soTipo && !VALOR_PERMITIDO.includes(i.origem)) achados.push(`valor fora da lista: ${i.origem}`);
  }
  return achados;
}

describe('CV-09: o que dados-do-andamento.ts importa', () => {
  it('o módulo existe, tem importações e não tem achado', () => {
    const fonte = readFileSync(`${raiz}${MODULO}`, 'utf8');
    expect(importacoesDe(MODULO, fonte).length).toBeGreaterThan(0);
    expect(achadosDasImportacoes(fonte)).toEqual([]);
  });

  it('reprova cada importação plantada', () => {
    expect(achadosDasImportacoes("import { autorizar } from '../modules/acesso/matriz';")).toEqual(['vetada: ../modules/acesso/matriz']);
    expect(achadosDasImportacoes("import type { Integracao } from '../modules/acesso/ator';")).toEqual(['vetada: ../modules/acesso/ator']);
    expect(achadosDasImportacoes("import type { Db } from '../db';")).toEqual(['vetada: ../db']);
    expect(achadosDasImportacoes("import { db } from '../db/index';")).toEqual(['vetada: ../db/index']);
    expect(achadosDasImportacoes("import type { Tx } from '../db/transacao';")).toEqual(['vetada: ../db/transacao']);
    expect(achadosDasImportacoes("import * as esquema from '../db/schema';")).toEqual(['vetada: ../db/schema']);
    expect(achadosDasImportacoes("import { obterDeps } from '../lib/deps';")).toEqual(['vetada: ../lib/deps']);
    expect(achadosDasImportacoes("import { obterDeps } from '@/lib/deps';")).toEqual(['vetada: @/lib/deps']);
    expect(achadosDasImportacoes("import { mudar } from '../app/(painel)/demandas/[id]/acoes';")).toEqual(['vetada: ../app/(painel)/demandas/[id]/acoes']);
    expect(achadosDasImportacoes("import { eq } from 'drizzle-orm';")).toEqual(['vetada: drizzle-orm']);
    expect(achadosDasImportacoes("import { notFound } from 'next/navigation';")).toEqual(['vetada: next/navigation']);
    expect(achadosDasImportacoes("import { FASES_ANDAMENTO } from '../db/schema/andamento';")).toEqual(['valor de módulo ou esquema: ../db/schema/andamento']);
    expect(achadosDasImportacoes("import { lerAndamento } from '../modules/andamento/regras';")).toEqual(['valor de módulo ou esquema: ../modules/andamento/regras']);
    expect(achadosDasImportacoes("import {\n  type AndamentoVista,\n  esquemaAndamento,\n} from '../modules/andamento/schemas';")).toEqual([
      'valor de módulo ou esquema: ../modules/andamento/schemas',
    ]);
    expect(achadosDasImportacoes("const m = await import('../modules/andamento/consultas');")).toEqual(['valor de módulo ou esquema: ../modules/andamento/consultas']);
    expect(achadosDasImportacoes("export * from '../modules/andamento/schemas';")).toEqual(['valor de módulo ou esquema: ../modules/andamento/schemas']);
    expect(achadosDasImportacoes("import { formatarDataHora } from '../lib/fuso';")).toEqual(['valor fora da lista: ../lib/fuso']);
    expect(achadosDasImportacoes("import { campo } from './formulario';")).toEqual(['valor fora da lista: ./formulario']);
    expect(achadosDasImportacoes("import './efeito';")).toEqual(['valor fora da lista: ./efeito']);
  });

  it('aceita tipo de src/modules (fora de acesso) e de src/db/schema, e valor da lista de permissão', () => {
    const certo = [
      "import type { StatusConstrucao } from '../db/schema/andamento';",
      "import type { StatusDemanda } from '../db/schema/demandas';",
      "import type { AndamentoVista } from '../modules/andamento/schemas';",
      "import { type PacoteResumo } from '../modules/demandas/consultas';",
      "import { RE_ID_DEC } from './dados-do-pacote';",
      "import { faseNaTela, ROTULO_SITUACAO_CONSTRUCAO, situacaoNaTela, tarefaNaTela, tarefasEmTexto } from './rotulos';",
    ].join('\n');
    expect(achadosDasImportacoes(certo)).toEqual([]);
  });
});
