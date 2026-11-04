// Detectores de dado pessoal (C-28 no Pedido de Construção; a T24 usa os mesmos na minimização, C-23). Sem banco; só
// valores fictícios.
import { describe, expect, it } from 'vitest';
import { DETECTORES, encontrarDadosPessoais, type TipoDadoPessoal } from './detectores';

describe('encontrarDadosPessoais', () => {
  it.each([
    ['contato@exemplo.test', 'e-mail'],
    ['(11) 90000-0000', 'telefone'],
    ['11 90000-0000', 'telefone'],
    ['+55 11 90000-0000', 'telefone'],
    ['(11) 3000-0000', 'telefone'],
    ['123.456.789-09', 'CPF'],
    ['12345678909', 'CPF'],
    ['12.345.678/0001-90', 'CNPJ'],
    ['12345678000190', 'CNPJ'],
  ] as const)('%s é %s', (v, tipo) => {
    expect(encontrarDadosPessoais({ a: `texto ${v} texto` }, [tipo])).toEqual([{ caminho: 'a', tipo }]);
  });

  it('ids do sistema não são dado pessoal', () => {
    expect(
      encontrarDadosPessoais({ a: 'DEM-20261022-0042 ESP-DEM-20261022-0042-v2 RSK-DEM-20261022-0042-v1 2026-10-22' }, ['e-mail', 'telefone', 'CPF']),
    ).toEqual([]);
  });

  it('o repositório, o sistema alvo e a data do pedido não são dado pessoal', () => {
    expect(
      encontrarDadosPessoais(
        { r: 'wsssistemas2626-crypto/ws-orquestrador-demandas', d: 'DEC-DEM-20261022-0001-v1', e: '2026-10-22', n: 'pnpm test verde' },
        ['e-mail', 'telefone', 'CPF'],
      ),
    ).toEqual([]);
  });

  it('caminho aninhado com índice de lista', () => {
    expect(encontrarDadosPessoais({ criterios_aceite_preliminares: ['ok', 'ligar (11) 90000-0000'] }, ['telefone'])).toEqual([
      { caminho: 'criterios_aceite_preliminares[1]', tipo: 'telefone' },
    ]);
  });

  it('objeto dentro de objeto vira caminho com ponto; objeto dentro de lista, índice e ponto', () => {
    expect(
      encontrarDadosPessoais({ especificacao: { conteudo: 'x contato@exemplo.test' }, lista: [{ a: 'ok' }, { a: '123.456.789-09' }] }, ['e-mail', 'CPF']),
    ).toEqual([
      { caminho: 'especificacao.conteudo', tipo: 'e-mail' },
      { caminho: 'lista[1].a', tipo: 'CPF' },
    ]);
  });

  it('só procura os tipos pedidos: CNPJ fica de fora quando não está na lista', () => {
    expect(encontrarDadosPessoais({ a: 'CNPJ 12.345.678/0001-90' }, ['e-mail', 'telefone', 'CPF'])).toEqual([]);
  });

  it('um campo com vários tipos dá um item por tipo, na ordem pedida, sem repetir o mesmo tipo', () => {
    expect(
      encontrarDadosPessoais({ a: 'contato@exemplo.test, outra@exemplo.test e (11) 90000-0000' }, ['telefone', 'e-mail', 'CPF']),
    ).toEqual([
      { caminho: 'a', tipo: 'telefone' },
      { caminho: 'a', tipo: 'e-mail' },
    ]);
  });

  it('a ordem dos itens segue a ordem das chaves e da lista', () => {
    expect(encontrarDadosPessoais({ b: 'x@exemplo.test', a: ['y@exemplo.test'] }, ['e-mail']).map((i) => i.caminho)).toEqual(['b', 'a[0]']);
  });

  it('número, booleano e nulo não são lidos; só texto', () => {
    expect(encontrarDadosPessoais({ n: 12345678909, b: true, z: null, u: undefined }, ['CPF'])).toEqual([]);
  });

  it('texto solto na raiz usa o caminho dado, ou vazio', () => {
    expect(encontrarDadosPessoais('contato@exemplo.test', ['e-mail'])).toEqual([{ caminho: '', tipo: 'e-mail' }]);
    expect(encontrarDadosPessoais('contato@exemplo.test', ['e-mail'], 'campo')).toEqual([{ caminho: 'campo', tipo: 'e-mail' }]);
    expect(encontrarDadosPessoais({ a: 'contato@exemplo.test' }, ['e-mail'], 'raiz')).toEqual([{ caminho: 'raiz.a', tipo: 'e-mail' }]);
  });

  it('o resultado nunca leva o valor encontrado', () => {
    const r = encontrarDadosPessoais({ a: 'contato@exemplo.test (11) 90000-0000 123.456.789-09' }, ['e-mail', 'telefone', 'CPF']);
    expect(JSON.stringify(r)).not.toMatch(/exemplo\.test|90000|456\.789/);
  });

  it('as expressões globais não guardam estado entre chamadas (lastIndex)', () => {
    const valor = { a: 'contato@exemplo.test' };
    for (let i = 0; i < 3; i++) expect(encontrarDadosPessoais(valor, ['e-mail'])).toEqual([{ caminho: 'a', tipo: 'e-mail' }]);
    expect(DETECTORES['e-mail'].lastIndex).toBe(0);
  });

  it('os quatro detectores existem e são globais', () => {
    expect(Object.keys(DETECTORES).sort()).toEqual(['CNPJ', 'CPF', 'e-mail', 'telefone']);
    for (const tipo of Object.keys(DETECTORES) as TipoDadoPessoal[]) expect(DETECTORES[tipo].flags, tipo).toContain('g');
  });
});

// M-a e B-2 da revisão do 0011 (DEC-DEM-20261104-0012-v1): o detector de e-mail fica linear (início ancorado) e aceita
// letra com acento no usuário. Os e-mails detectados antes continuam detectados, terminando no mesmo lugar. Só valores
// fictícios, no domínio reservado exemplo.test.
describe('M-a e B-2 do 0011: detector de e-mail linear e com acento no usuário', () => {
  // A regex de antes da 0.1.11, copiada aqui só para a equivalência.
  const ANTIGA = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  // Os três tipos do Pedido de Construção (DADOS_PESSOAIS_DO_PEDIDO, pedido-construcao/gerar.ts:42).
  const DO_PEDIDO: TipoDadoPessoal[] = ['e-mail', 'telefone', 'CPF'];
  const LIMITE_MS = 200;

  const medir = <T>(f: () => T): { r: T; ms: number } => {
    const inicio = performance.now();
    const r = f();
    return { r, ms: performance.now() - inicio };
  };

  it.each([
    ['100 mil letras de usuário sem @', 'a'.repeat(100_000)],
    ['50 mil de usuário, @ e domínio de 49.999 sem ponto', 'a'.repeat(50_000) + '@' + 'b'.repeat(49_999)],
    ['"a@" repetido 50 mil vezes', 'a@'.repeat(50_000)],
    ['"a." repetido 50 mil vezes', 'a.'.repeat(50_000)],
    ['100 mil letras acentuadas', 'é'.repeat(100_000)],
    ['"a@" seguido de ".a" repetido', 'a@' + '.a'.repeat(49_999)],
  ])('tempo: %s, sem e-mail, em menos de 200 ms', (_nome, t) => {
    const { r, ms } = medir(() => t.search(DETECTORES['e-mail']));
    expect(r).toBe(-1);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it('tempo: detector do Pedido de Construção com 100 mil caracteres e 50 itens de 10 mil, em menos de 200 ms', () => {
    const pedido = {
      especificacao: { conteudo: 'a'.repeat(100_000) },
      criterios_aceite_preliminares: Array.from({ length: 50 }, () => 'a'.repeat(10_000)),
    };
    const { r, ms } = medir(() => encontrarDadosPessoais(pedido, DO_PEDIDO));
    expect(r).toEqual([]);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it('tempo: os 50 itens de 10 mil sozinhos, só e-mail, em menos de 200 ms', () => {
    const lista = Array.from({ length: 50 }, () => 'a'.repeat(10_000));
    const { r, ms } = medir(() => encontrarDadosPessoais({ criterios_aceite_preliminares: lista }, ['e-mail']));
    expect(r).toEqual([]);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it('a regex é global e Unicode (sem `u`, \\p{L} seria a classe dos caracteres "p{L}")', () => {
    expect(DETECTORES['e-mail'].flags).toContain('g');
    expect(DETECTORES['e-mail'].flags).toContain('u');
  });

  // Corpus curto: os casos de detectores.test.ts e de minimizar.test.ts que têm e-mail, e os formatos novos do B-2.
  const USUARIO_68 = 'contato.ficticio.departamento.de.atendimento.ao.cliente.exemplo.2026@exemplo.test';
  const FORMATOS = [
    'joão.ficticia@exemplo.test',
    'conceição.ficticia@exemplo.test',
    'érica@exemplo.test',
    'JOÃO.FICTICIO@exemplo.test',
    'joão.ficticia@exemplo.test'.normalize('NFD'),
    USUARIO_68,
    'nome.sobrenome@empresa.exemplo.test',
    'pessoa.ficticia+demanda@sub.exemplo.test',
    'n_s-1@exemplo.test',
    'a@b.co',
  ];
  const CORPUS = [
    'texto contato@exemplo.test texto',
    'texto (11) 90000-0000 texto',
    'texto 123.456.789-09 texto',
    'texto 12.345.678/0001-90 texto',
    'Antes contato@exemplo.test depois.',
    'Antes pessoa.ficticia+demanda@sub.exemplo.test depois.',
    'Escreva para ficticia@empresa-exemplo.test hoje',
    'Ou contato.ficticia@empresa-exemplo.test',
    'A: contato@exemplo.test; B: (11) 90000-0000; C: 123.456.789-09; D: 12.345.678/0001-90; E: x.',
    'Ficticia [e-mail removido] Ficticia',
    'Para ficticia.contato@empresa-exemplo.test e contato@ficticia.test, ou FICTICIA_2@exemplo.test',
    'Escreva para joana.ficticia@exemplo.test ou Joana@exemplo.test',
    ...FORMATOS.map((v) => `Antes ${v} depois.`),
    '<x@exemplo.test>',
    'mailto:x@exemplo.test',
    'x@exemplo.test.',
    'x@y@exemplo.test',
    '-'.repeat(70) + 'joana.ficticia@exemplo.test',
    '_'.repeat(70) + 'joana.ficticia@exemplo.test',
    'linha ' + '-'.repeat(70) + ' joana.ficticia@exemplo.test',
  ];

  it('o corpus é curto (menos de 200 caracteres por texto)', () => {
    for (const t of CORPUS) expect(t.length, t).toBeLessThan(200);
  });

  it.each(CORPUS)('equivalência com a regex de antes: %j', (t) => {
    const antes = [...t.matchAll(ANTIGA)];
    const depois = [...t.matchAll(DETECTORES['e-mail'])];
    expect(depois).toHaveLength(antes.length);
    antes.forEach((a, i) => {
      const d = depois[i]!;
      expect(d.index).toBeLessThanOrEqual(a.index);
      expect(d.index + d[0].length).toBe(a.index + a[0].length);
    });
  });

  it.each([USUARIO_68, 'joão.ficticia@exemplo.test', 'joão.ficticia@exemplo.test'.normalize('NFD')])(
    'Pedido de Construção: %j é e-mail',
    (v) => {
      expect(encontrarDadosPessoais({ especificacao: { conteudo: `texto ${v} texto` } }, DO_PEDIDO)).toEqual([
        { caminho: 'especificacao.conteudo', tipo: 'e-mail' },
      ]);
    },
  );
});
