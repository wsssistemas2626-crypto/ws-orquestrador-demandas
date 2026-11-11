// test/estatico/capturas-qa.test.ts — RF-17 (CA-17.2), CV-17 (04), RNF-14 e D-04, complemento do qa-automacao na
// 06-T17-testes (DEC-DEM-20261110-0015-v1). O capturas.test.ts confere as regras puras de e2e/capturas.ts e a forma do
// spec; aqui ficam:
//   - as nove PNG existem de fato na pasta do manual, e a pasta só tem elas: no CI o spec é pulado (CV-17), e sem este
//     teste uma captura apagada, ou uma décima sem a conferência do CV-17, passaria sem ninguém ver;
//   - cada PNG é um PNG inteiro, com o tamanho da janela do nome (1280 × 720 ou 390 × 844) e sem bloco de metadado de
//     texto (tEXt, zTXt, iTXt, eXIf, tIME), onde caberia caminho de máquina ou outro dado fora da imagem;
//   - o spec só lê, por lista de permissão: só as contas cto e administradora, só as quatro rotas das capturas, nenhuma
//     ação na página (clique, preenchimento, API) e só os auxiliares de leitura de e2e/apoio.ts (C-36, G3.10);
//   - todo teste do spec decide o D-04 (arquivoDa) antes de entrar ou navegar;
//   - podeCapturar com usuário e senha na URL, maiúsculas, outro endereço de loopback e esquema que não é http.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CAPTURAS, PASTA_DAS_CAPTURAS, podeCapturar } from '../../e2e/capturas';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const spec = readFileSync(`${raiz}e2e/capturas.spec.ts`, 'utf8');

// --- PNG -------------------------------------------------------------------------------------------------------------

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const METADADO_DE_TEXTO: ReadonlySet<string> = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

type LeituraPng = { largura: number; altura: number; blocos: string[]; sobra: number } | { erro: string };

// Lê a assinatura e a sequência de blocos (comprimento, tipo, dados, CRC) até o IEND. `sobra` é o que vem depois dele.
export function lerPng(b: Buffer): LeituraPng {
  if (b.length < 33 || !b.subarray(0, 8).equals(ASSINATURA_PNG)) return { erro: 'sem assinatura PNG' };
  const blocos: string[] = [];
  let i = 8;
  while (i + 12 <= b.length) {
    const tamanho = b.readUInt32BE(i);
    const tipo = b.toString('latin1', i + 4, i + 8);
    blocos.push(tipo);
    i += 12 + tamanho;
    if (i > b.length) return { erro: `bloco ${tipo} cortado` };
    if (tipo === 'IEND') break;
  }
  if (blocos[0] !== 'IHDR') return { erro: 'o primeiro bloco não é IHDR' };
  if (blocos.at(-1) !== 'IEND') return { erro: 'sem IEND' };
  return { largura: b.readUInt32BE(16), altura: b.readUInt32BE(20), blocos, sobra: b.length - i };
}

const JANELA: Readonly<Record<string, { largura: number; altura: number }>> = {
  '1280': { largura: 1280, altura: 720 },
  '390': { largura: 390, altura: 844 },
};

// Um PNG mínimo montado no teste (sem CRC verdadeiro: a leitura não o confere), para os casos plantados.
function pngPlantado(largura: number, altura: number, extras: string[] = []): Buffer {
  const bloco = (tipo: string, dados: Buffer) => {
    const t = Buffer.alloc(4);
    t.writeUInt32BE(dados.length);
    return Buffer.concat([t, Buffer.from(tipo, 'latin1'), dados, Buffer.alloc(4)]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  return Buffer.concat([
    ASSINATURA_PNG,
    bloco('IHDR', ihdr),
    ...extras.map((tipo) => bloco(tipo, Buffer.from('x'))),
    bloco('IDAT', Buffer.alloc(2)),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

describe('lerPng: a leitura reprova o que não é PNG inteiro (casos plantados)', () => {
  it('lê largura, altura e blocos de um PNG montado', () => {
    expect(lerPng(pngPlantado(390, 844, ['tEXt']))).toEqual({ largura: 390, altura: 844, blocos: ['IHDR', 'tEXt', 'IDAT', 'IEND'], sobra: 0 });
  });

  it('acusa assinatura errada, arquivo cortado e bytes depois do IEND', () => {
    expect(lerPng(Buffer.from('não é png, só texto com mais de trinta e três bytes'))).toEqual({ erro: 'sem assinatura PNG' });
    const inteiro = pngPlantado(1280, 720);
    expect(lerPng(inteiro.subarray(0, inteiro.length - 6))).toHaveProperty('erro');
    expect(lerPng(Buffer.concat([inteiro, Buffer.from('resto')]))).toMatchObject({ sobra: 5 });
  });
});

describe('RF-17 (CA-17.2) e CV-17: as nove PNG no repositório', () => {
  it('a pasta do manual tem exatamente as nove capturas da lista, e nenhum outro arquivo', () => {
    const naPasta = readdirSync(PASTA_DAS_CAPTURAS).sort();
    expect(naPasta).toEqual(CAPTURAS.map((n) => `${n}.png`).sort());
  });

  for (const nome of CAPTURAS) {
    it(`${nome}.png: PNG inteiro, com o tamanho da janela do nome e sem metadado de texto`, () => {
      const largura = /-(\d+)$/.exec(nome)?.[1] ?? '';
      const esperado = JANELA[largura];
      expect(esperado, `largura do nome ${nome}`).toBeDefined();
      const png = lerPng(readFileSync(`${PASTA_DAS_CAPTURAS}${nome}.png`));
      expect(png).not.toHaveProperty('erro');
      if ('erro' in png) return;
      expect({ largura: png.largura, altura: png.altura, sobra: png.sobra }).toEqual({ ...esperado, sobra: 0 });
      expect(png.blocos.filter((b) => METADADO_DE_TEXTO.has(b))).toEqual([]);
      expect(png.blocos).toContain('IDAT');
    });
  }
});

// --- O spec só lê --------------------------------------------------------------------------------------------------

const CONTAS_PERMITIDAS: ReadonlySet<string> = new Set(['cto', 'administradora']);
const ROTAS_PERMITIDAS: ReadonlySet<string> = new Set(["'/entrar'", "'/demandas'", '`/demandas/${id}`', '`/pacotes-decisao/DEC-${id}-v1`']);
const AUXILIARES_PERMITIDOS: ReadonlySet<string> = new Set(['abrirGaveta', 'demandaDoSeed', 'entrarComo', 'expect', 'test']);
const MODULOS_PERMITIDOS: ReadonlySet<string> = new Set(['node:fs', '@playwright/test', '../scripts/seed-ficticio', './apoio', './capturas']);
// Ação na página ou fora dela: clique, teclado, preenchimento, envio de arquivo, chamada à API e requisição direta.
const ACAO =
  /\.(?:click|dblclick|tap|fill|type|press|pressSequentially|check|uncheck|setChecked|selectOption|setInputFiles|dispatchEvent|dragTo|submit)\(|\b(?:api|fetch)\(|\.request\b|\bmethod\s*:/;

// Os desvios da lista de permissão, como texto: contas, rotas, auxiliares, módulos e ações fora dela.
export function desviosDoSpec(fonte: string): string[] {
  const d: string[] = [];
  const entradas = [...fonte.matchAll(/\bentrarComo\(([^)]*)\)/g)];
  for (const [, args] of entradas) {
    const conta = /^\s*page\s*,\s*'([^']+)'\s*$/.exec(args ?? '')?.[1];
    if (!conta || !CONTAS_PERMITIDAS.has(conta)) d.push(`conta: ${args}`);
  }
  for (const [, alvo] of fonte.matchAll(/\.goto\(([^)]*)\)/g)) if (!ROTAS_PERMITIDAS.has((alvo ?? '').trim())) d.push(`rota: ${alvo}`);
  for (const [, nomes] of fonte.matchAll(/import\s*\{([^}]*)\}\s*from\s*'\.\/apoio'/g))
    for (const n of (nomes ?? '').split(',').map((x) => x.trim().replace(/^type\s+/, '')))
      if (n !== '' && !AUXILIARES_PERMITIDOS.has(n)) d.push(`auxiliar: ${n}`);
  for (const [, modulo] of fonte.matchAll(/^import\b[^;]*?from\s*'([^']+)'/gms)) if (!MODULOS_PERMITIDOS.has(modulo ?? '')) d.push(`módulo: ${modulo}`);
  for (const linha of fonte.split('\n')) if (!/^\s*\/\//.test(linha) && ACAO.test(linha)) d.push(`ação: ${linha.trim()}`);
  return d;
}

// Os testes do spec cuja primeira linha não é a decisão do D-04 (`const arquivo = arquivoDa(...)`).
export function testesSemD04Primeiro(fonte: string): string[] {
  const testes = [...fonte.matchAll(/\btest\(\s*'([^']+)'\s*,\s*async\s*\(\{[^}]*\}\)\s*=>\s*\{\s*([^\n]*)/g)];
  return testes.filter(([, , primeira]) => !/^const arquivo = arquivoDa\(/.test(primeira ?? '')).map(([, nome]) => nome ?? '');
}

describe('CV-17 e C-36: o spec das capturas só lê (lista de permissão)', () => {
  it('casos plantados: conta, rota, auxiliar, módulo e ação fora da lista são acusados', () => {
    expect(desviosDoSpec("await entrarComo(page, 'cto');\nawait page.goto('/demandas');")).toEqual([]);
    expect(desviosDoSpec("await entrarComo(page, 'produto');")).toEqual(["conta: page, 'produto'"]);
    expect(desviosDoSpec('await entrarComo(page, conta);')).toEqual(['conta: page, conta']);
    expect(desviosDoSpec("await page.goto('/configurar-2fa');")).toEqual(["rota: '/configurar-2fa'"]);
    expect(desviosDoSpec('await page.goto(destino);')).toEqual(['rota: destino']);
    expect(desviosDoSpec("import { api, entrarComo, test } from './apoio';")).toEqual(['auxiliar: api']);
    expect(desviosDoSpec("import { writeFileSync } from 'node:fs';\nimport x from 'node:child_process';")).toEqual(['módulo: node:child_process']);
    for (const acao of [
      "await page.getByRole('button', { name: 'Aprovar a opção A' }).click();",
      "await page.getByLabel('Comentários').fill('x');",
      "await page.keyboard.press('Enter');",
      "await page.getByLabel('Revisei').check();",
      "await api(page, 'POST', '/api/demandas', {});",
      "await page.request.post('/api/auth/sign-in/email');",
      "await fetch('/api/demandas', { method: 'POST' });",
    ])
      expect(desviosDoSpec(acao), acao).not.toEqual([]);
    // Comentário não é ação.
    expect(desviosDoSpec('// sem .click() aqui')).toEqual([]);
  });

  it('e2e/capturas.spec.ts não tem nenhum desvio', () => {
    expect(desviosDoSpec(spec)).toEqual([]);
  });

  it('a varredura enxerga o spec de hoje: duas contas, as quatro rotas e os cinco testes (falha se a leitura quebrar)', () => {
    expect(new Set([...spec.matchAll(/\bentrarComo\(\s*page\s*,\s*'([^']+)'/g)].map((m) => m[1]))).toEqual(new Set(['cto', 'administradora']));
    expect(new Set([...spec.matchAll(/\.goto\(([^)]*)\)/g)].map((m) => m[1]))).toEqual(ROTAS_PERMITIDAS);
    expect([...spec.matchAll(/\btest\(\s*'([^']+)'/g)].map((m) => m[1])).toEqual([
      'T01 Entrar',
      'T03 Fila',
      'T05 Detalhe da demanda',
      'T11 Decisão',
      'Gaveta do menu aberta',
    ]);
  });
});

describe('D-04: todo teste decide se grava antes de entrar ou navegar', () => {
  it('casos plantados: o teste que entra antes de decidir é acusado', () => {
    expect(testesSemD04Primeiro("test('A', async ({ page }) => {\n  const arquivo = arquivoDa('t01-entrar-390');\n  await page.goto('/entrar');")).toEqual([]);
    expect(testesSemD04Primeiro("test('B', async ({ page }) => {\n  await entrarComo(page, 'cto');\n  const arquivo = arquivoDa('t03-fila-390');")).toEqual(['B']);
  });

  it('os cinco testes de e2e/capturas.spec.ts começam por arquivoDa', () => {
    expect([...spec.matchAll(/\btest\(\s*'/g)]).toHaveLength(5);
    expect(testesSemD04Primeiro(spec)).toEqual([]);
  });
});

describe('CV-17: podeCapturar nas bordas da URL', () => {
  it('recusa loopback só no usuário da URL, outro endereço de loopback e esquema que não é http', () => {
    for (const u of [
      'http://127.0.0.1:3101@exemplo.test/',
      'http://localhost:3101@exemplo.test',
      'http://127.0.0.2:3101',
      'http://localhost:3101.exemplo.test',
      'file:///tmp/127.0.0.1',
    ])
      expect(podeCapturar(u, undefined), u).toBe(false);
  });

  it('aceita o loopback de verdade escrito em maiúsculas (o URL normaliza o host)', () => {
    expect(podeCapturar('http://LOCALHOST:3101', undefined)).toBe(true);
    expect(podeCapturar('http://LOCALHOST:3101', 'true')).toBe(false);
  });
});
