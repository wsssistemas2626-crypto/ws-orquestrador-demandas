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

// 04-regressao do 0012 (qa-automacao): "os e-mails detectados hoje continuam detectados" conferido caractere a
// caractere, e mais casos ruins de tempo. Sem relógio real além da medição do tempo da ESP; o gerador é determinístico
// (semente fixa). Só valores fictícios, no domínio reservado exemplo.test.
describe('M-a do 0011 (04-regressao do 0012): nada que a regex de antes cobria fica descoberto', () => {
  const ANTIGA = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const LIMITE_MS = 200;

  // Índices do texto que caem dentro de algum casamento da regex.
  const cobertos = (t: string, re: RegExp): Set<number> => {
    const s = new Set<number>();
    for (const m of t.matchAll(re)) for (let i = m.index; i < m.index + m[0].length; i++) s.add(i);
    return s;
  };
  const descobertos = (t: string): number[] => {
    const depois = cobertos(t, DETECTORES['e-mail']);
    return [...cobertos(t, ANTIGA)].filter((i) => !depois.has(i));
  };

  // E-mail colado no fim de outro por um caractere que o domínio e o TLD não absorvem ("+", "_", "%"; "-" e número
  // quando o usuário seguinte não tem ponto). A regex de antes casa os dois; o segundo começa logo depois do fim do
  // primeiro.
  it.each([
    'joana.ficticia@exemplo.test+pedro.ficticio@exemplo.test',
    'joana.ficticia@exemplo.test_pedro.ficticio@exemplo.test',
    'joana.ficticia@exemplo.test%pedro.ficticio@exemplo.test',
    'joana.ficticia@exemplo.test-pedro@exemplo.test',
    'joana.ficticia@exemplo.test2pedro@exemplo.test',
    'joana.ficticia@exemplo.test.1pedro@exemplo.test',
    'ana@exemplo.test-bia@exemplo.test-caio@exemplo.test',
  ])('e-mails colados: %j fica coberto como antes', (t) => {
    expect([...t.matchAll(ANTIGA)].length).toBeGreaterThanOrEqual(2);
    expect(descobertos(t)).toEqual([]);
  });

  // Gerador congruencial com semente fixa (mulberry32): o mesmo corpus em toda execução, sem Math.random.
  const gerador = (semente: number) => () => {
    semente = (semente + 0x6d2b79f5) | 0;
    let x = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  // Pedaços de e-mail e separadores: os textos gerados juntam de 2 a 6 pedaços, para cair em e-mail colado em outro.
  const PEDACOS = ['a@b.cc', 'ab@c.de', 'x', '1', '.', '-', '_', '+', '%', '@', ' ', ',', 'é'];

  it('corpus gerado de 5.000 textos curtos: todo caractere coberto pela regex de antes continua coberto', () => {
    const r = gerador(20261104);
    const falhas: string[] = [];
    for (let n = 0; n < 5_000; n++) {
      const quantos = 2 + Math.floor(r() * 5);
      let t = '';
      for (let i = 0; i < quantos; i++) t += PEDACOS[Math.floor(r() * PEDACOS.length)];
      if (descobertos(t).length > 0) falhas.push(t);
    }
    expect(falhas.slice(0, 10)).toEqual([]);
  });

  it.each([
    ['100 mil hífens', '-'.repeat(100_000)],
    ['100 mil pontos', '.'.repeat(100_000)],
    ['"a@" e 99.998 hífens', 'a@' + '-'.repeat(99_998)],
    ['"a@" e "b." repetido', 'a@' + 'b.'.repeat(49_999)],
    ['"@a" repetido 50 mil vezes', '@a'.repeat(50_000)],
    ['"é" em NFD repetido (letra e marca)', 'é'.normalize('NFD').repeat(50_000)],
    ['dígitos e letras alternados', 'a1'.repeat(50_000)],
  ])('tempo: %s, sem e-mail, em menos de 200 ms', (_nome, t) => {
    const inicio = performance.now();
    const r = t.search(DETECTORES['e-mail']);
    const ms = performance.now() - inicio;
    expect(r).toBe(-1);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it('tempo: 100 mil caracteres de usuário e um e-mail no fim, achado em menos de 200 ms', () => {
    const t = 'a'.repeat(100_000) + ' contato@exemplo.test';
    const inicio = performance.now();
    const r = t.search(DETECTORES['e-mail']);
    const ms = performance.now() - inicio;
    expect(r).toBe(100_001);
    expect(ms).toBeLessThan(LIMITE_MS);
  });
});
