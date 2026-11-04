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

// 03-correcao do 0012, 2ª volta: o e-mail colado no fim de outro é tentado logo no fim do anterior, como a regex de antes
// fazia, sem perder o custo linear. Cadeias longas de e-mails colados, e o casamento seguinte que falha logo depois de
// cada e-mail. Só valores fictícios, no domínio reservado exemplo.test.
describe('M-a do 0011 (03-correcao do 0012, 2ª volta): e-mail colado no fim de outro', () => {
  const ANTIGA = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const LIMITE_MS = 200;
  const casamentos = (t: string, re: RegExp) => [...t.matchAll(re)].map((m) => [m.index, m.index + m[0].length]);

  it.each([
    ['"+" entre os e-mails', 'ana@exemplo.test+'],
    ['"_" entre os e-mails', 'ana@exemplo.test_'],
    ['"-" entre os e-mails', 'ana@exemplo.test-'],
    ['"%" entre os e-mails', 'ana@exemplo.test%'],
  ])('cadeia de 20 mil e-mails colados com %s: os mesmos casamentos da regex de antes, em menos de 200 ms', (_nome, pedaco) => {
    const t = pedaco.repeat(20_000);
    const inicio = performance.now();
    const depois = casamentos(t, DETECTORES['e-mail']);
    const ms = performance.now() - inicio;
    expect(depois).toHaveLength(20_000);
    expect(depois).toEqual(casamentos(t, ANTIGA));
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it.each([
    ['e-mail seguido de 1.000 caracteres de usuário sem "@", 100 vezes', ('a@b.cc+' + 'x'.repeat(1_000) + ' ').repeat(100)],
    ['e-mail seguido de "+a@b" repetido 25 mil vezes', 'a@b.cc' + '+a@b'.repeat(25_000)],
    ['e-mail seguido de 100 mil letras sem "@"', 'a@b.cc' + 'x'.repeat(100_000)],
    ['"a@b.cc" colado em "a@b.cc" 15 mil vezes', 'a@b.cc'.repeat(15_000)],
  ])('tempo: %s, em menos de 200 ms', (_nome, t) => {
    const inicio = performance.now();
    const depois = casamentos(t, DETECTORES['e-mail']);
    const ms = performance.now() - inicio;
    expect(depois.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it('a busca ("tem?") continua começando do zero e não muda o lastIndex', () => {
    const re = DETECTORES['e-mail'];
    expect('x ana@exemplo.test+bia@exemplo.test'.search(re)).toBe(2);
    expect(re.lastIndex).toBe(0);
    expect('nada aqui'.search(re)).toBe(-1);
    expect(re.lastIndex).toBe(0);
  });

  it('a troca de todas as ocorrências deixa o lastIndex em zero', () => {
    const re = DETECTORES['e-mail'];
    expect('ana@exemplo.test+bia@exemplo.test'.replace(re, '[x]')).toBe('[x][x]');
    expect(re.lastIndex).toBe(0);
  });

  it('o detector continua sendo um RegExp global e Unicode, com o padrão ancorado', () => {
    const re = DETECTORES['e-mail'];
    expect(re).toBeInstanceOf(RegExp);
    expect(re.flags).toBe('gu');
    expect(re.source.startsWith('(?<!')).toBe(true);
  });
});

// 04-regressao do 0012, 2ª volta (qa-automacao): o detector de e-mail é uma subclasse de RegExp com `exec` próprio.
// Todos os caminhos do RegExp (`replace`, `replaceAll`, `matchAll`, `match`, `search`, `exec` e `test`) dão os mesmos
// casamentos, com o `lastIndex` coerente em cada um. Em texto ASCII, em que a classe do usuário é a mesma da regex de
// antes, `exec` e `test` a partir de qualquer `lastIndex` dão o mesmo que a regex de antes. Gerador com semente fixa; o
// relógio só mede o tempo da ESP. Só valores fictícios, no domínio reservado exemplo.test.
describe('M-a do 0011 (04-regressao do 0012, 2ª volta): o mesmo resultado em todos os caminhos do RegExp', () => {
  const ANTIGA = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const LIMITE_MS = 200;
  const MARCA = '[x]';
  type Faixa = [number, number];

  // Outra instância do detector, pelo mesmo construtor que `matchAll` usa (Symbol.species): mexer no `lastIndex` dela não
  // toca o detector compartilhado.
  const outra = (flags = DETECTORES['e-mail'].flags): RegExp => {
    const Detector = DETECTORES['e-mail'].constructor as unknown as new (origem: RegExp, flags: string) => RegExp;
    return new Detector(DETECTORES['e-mail'], flags);
  };

  const porMatchAll = (t: string): Faixa[] => [...t.matchAll(DETECTORES['e-mail'])].map((m) => [m.index, m.index + m[0].length]);

  const porExec = (t: string, re: RegExp): Faixa[] => {
    const r: Faixa[] = [];
    re.lastIndex = 0;
    for (let m = re.exec(t); m !== null; m = re.exec(t)) {
      expect(m.input).toBe(t);
      expect(re.lastIndex).toBe(m.index + m[0].length);
      expect(t.slice(m.index, re.lastIndex)).toBe(m[0]);
      r.push([m.index, re.lastIndex]);
    }
    expect(re.lastIndex).toBe(0);
    return r;
  };

  const porTest = (t: string, re: RegExp): number[] => {
    const fins: number[] = [];
    re.lastIndex = 0;
    while (re.test(t)) fins.push(re.lastIndex);
    expect(re.lastIndex).toBe(0);
    return fins;
  };

  const porTroca = (trocar: (re: RegExp, f: (m: string, inicio: number) => string) => string): Faixa[] => {
    const r: Faixa[] = [];
    trocar(DETECTORES['e-mail'], (m, inicio) => {
      r.push([inicio, inicio + m.length]);
      return MARCA;
    });
    expect(DETECTORES['e-mail'].lastIndex).toBe(0);
    return r;
  };

  const trocado = (t: string, faixas: Faixa[]): string => {
    let s = '';
    let ultimo = 0;
    for (const [i, f] of faixas) {
      s += t.slice(ultimo, i) + MARCA;
      ultimo = f;
    }
    return s + t.slice(ultimo);
  };

  // Os sete caminhos, no detector compartilhado e numa instância solta, contra as faixas do `matchAll`.
  const conferirCaminhos = (t: string): Faixa[] => {
    const faixas = porMatchAll(t);
    expect(porExec(t, DETECTORES['e-mail'])).toEqual(faixas);
    expect(porExec(t, outra())).toEqual(faixas);
    expect(porTest(t, DETECTORES['e-mail'])).toEqual(faixas.map(([, f]) => f));
    expect(porTroca((re, f) => t.replace(re, f))).toEqual(faixas);
    expect(porTroca((re, f) => t.replaceAll(re, f))).toEqual(faixas);
    expect(t.replace(DETECTORES['e-mail'], MARCA)).toBe(trocado(t, faixas));
    expect(t.match(DETECTORES['e-mail'])).toEqual(faixas.length === 0 ? null : faixas.map(([i, f]) => t.slice(i, f)));
    expect(t.search(DETECTORES['e-mail'])).toBe(faixas[0]?.[0] ?? -1);
    expect(DETECTORES['e-mail'].lastIndex).toBe(0);
    // `search` começa do zero mesmo com `lastIndex` > 0, e devolve o `lastIndex` de antes.
    const solta = outra();
    solta.lastIndex = 7;
    expect(t.search(solta)).toBe(faixas[0]?.[0] ?? -1);
    expect(solta.lastIndex).toBe(7);
    return faixas;
  };

  const TEXTOS = [
    'ana@exemplo.test+bia@exemplo.test',
    'joana.ficticia@exemplo.test+pedro.ficticio@exemplo.test',
    'joana.ficticia@exemplo.test_pedro.ficticio@exemplo.test',
    'joana.ficticia@exemplo.test%pedro.ficticio@exemplo.test',
    'joana.ficticia@exemplo.test-pedro@exemplo.test',
    'joana.ficticia@exemplo.test2pedro@exemplo.test',
    'joana.ficticia@exemplo.test.1pedro@exemplo.test',
    'ana@exemplo.test-bia@exemplo.test-caio@exemplo.test',
    'ana@exemplo.testébia@exemplo.test',
    'ana@exemplo.test' + 'ébia@exemplo.test'.normalize('NFD'),
    'Escreva para joão.ficticia@exemplo.test ou Joana@exemplo.test, hoje.',
    'x ana@exemplo.test y',
    'a@b.cc.a@b.cc',
    'a@b.cca@b.cc',
    'a@b.cc@b.cc',
    'x@y@exemplo.test',
    '-'.repeat(70) + 'joana.ficticia@exemplo.test',
    'nada aqui',
    '',
  ];

  it.each(TEXTOS)('%j: replace, replaceAll, matchAll, match, search, exec e test dão os mesmos casamentos', (t) => {
    conferirCaminhos(t);
  });

  it('os dois e-mails colados por "+" dão duas faixas, a segunda começando no fim da primeira', () => {
    expect(conferirCaminhos('ana@exemplo.test+bia@exemplo.test')).toEqual([
      [0, 16],
      [16, 33],
    ]);
  });

  it('exec passo a passo: o lastIndex fica no fim de cada casamento, pelos dois caminhos do exec, e volta a zero', () => {
    const re = outra();
    const t = 'ana@exemplo.test+bia@exemplo.test x caio@exemplo.test';
    const m1 = re.exec(t);
    expect([m1?.index, m1?.[0], re.lastIndex]).toEqual([0, 'ana@exemplo.test', 16]);
    const m2 = re.exec(t); // tentativa no fim do anterior (sticky)
    expect([m2?.index, m2?.[0], re.lastIndex]).toEqual([16, '+bia@exemplo.test', 33]);
    const m3 = re.exec(t); // a tentativa no fim do anterior falha (espaço); segue a regex ancorada
    expect([m3?.index, m3?.[0], re.lastIndex]).toEqual([36, 'caio@exemplo.test', 53]);
    expect(re.exec(t)).toBeNull();
    expect(re.lastIndex).toBe(0);
    expect(re.exec(t)?.index).toBe(0); // recomeça do zero, como qualquer RegExp global
  });

  it('test passo a passo: verdadeiro, verdadeiro, falso, com o mesmo lastIndex do exec', () => {
    const re = outra();
    const t = 'ana@exemplo.test+bia@exemplo.test';
    expect([re.test(t), re.lastIndex]).toEqual([true, 16]);
    expect([re.test(t), re.lastIndex]).toEqual([true, 33]);
    expect([re.test(t), re.lastIndex]).toEqual([false, 0]);
  });

  it.each([0, 1, 2, 16, 16.7, 17, 33, 34, 1_000, -1, Number.NaN])(
    'lastIndex %d posto à mão: exec e test dão o mesmo que a regex de antes',
    (k) => {
      const t = 'ana@exemplo.test+bia@exemplo.test';
      const re = outra();
      re.lastIndex = k;
      ANTIGA.lastIndex = k;
      const d = re.exec(t);
      const a = ANTIGA.exec(t);
      expect([d?.index, d?.[0], re.lastIndex]).toEqual([a?.index, a?.[0], ANTIGA.lastIndex]);
      re.lastIndex = k;
      ANTIGA.lastIndex = k;
      expect([re.test(t), re.lastIndex]).toEqual([ANTIGA.test(t), ANTIGA.lastIndex]);
      ANTIGA.lastIndex = 0;
    },
  );

  it('instância sem a flag g ignora o lastIndex e não o muda, como a regex de antes sem g', () => {
    const t = 'ana@exemplo.test+bia@exemplo.test';
    const re = outra('u');
    const antiga = new RegExp(ANTIGA.source);
    re.lastIndex = 16;
    antiga.lastIndex = 16;
    const d = re.exec(t);
    const a = antiga.exec(t);
    expect([d?.index, d?.[0], re.lastIndex]).toEqual([0, 'ana@exemplo.test', 16]);
    expect([a?.index, a?.[0], antiga.lastIndex]).toEqual([0, 'ana@exemplo.test', 16]);
  });

  it('buscas intercaladas não dividem estado: matchAll em andamento, troca no detector compartilhado e outra instância no meio', () => {
    const t = 'ana@exemplo.test+bia@exemplo.test+caio@exemplo.test';
    const esperado = porMatchAll(t);
    expect(esperado).toHaveLength(3);
    const iterador = t.matchAll(DETECTORES['e-mail']);
    const vistos: Faixa[] = [];
    const primeiro = iterador.next();
    if (!primeiro.done) vistos.push([primeiro.value.index, primeiro.value.index + primeiro.value[0].length]);
    expect('davi@exemplo.test_eva@exemplo.test'.replace(DETECTORES['e-mail'], MARCA)).toBe(MARCA + MARCA);
    const solta = outra();
    solta.lastIndex = 5;
    expect(solta.exec('zzzzz+w@exemplo.test')?.index).toBe(5);
    for (const m of iterador) vistos.push([m.index, m.index + m[0].length]);
    expect(vistos).toEqual(esperado);

    const r1 = outra();
    const r2 = outra();
    const t1 = 'ana@exemplo.test+bia@exemplo.test';
    const t2 = 'caio@exemplo.test_davi@exemplo.test';
    const seq = [r1.exec(t1), r2.exec(t2), r1.exec(t1), r2.exec(t2), r1.exec(t1), r2.exec(t2)].map((m) => (m ? [m.index, m[0]] : null));
    expect(seq).toEqual([[0, 'ana@exemplo.test'], [0, 'caio@exemplo.test'], [16, '+bia@exemplo.test'], [17, '_davi@exemplo.test'], null, null]);
  });

  // Gerador com semente fixa (mulberry32): o mesmo corpus em toda execução, sem Math.random.
  const gerador = (semente: number) => () => {
    semente = (semente + 0x6d2b79f5) | 0;
    let x = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const gerarTexto = (r: () => number, pedacos: readonly string[]): string => {
    const quantos = 2 + Math.floor(r() * 5);
    let t = '';
    for (let i = 0; i < quantos; i++) t += pedacos[Math.floor(r() * pedacos.length)];
    return t;
  };
  const ASCII = ['a@b.cc', 'ab@c.de', 'ana@exemplo.test', 'x', '1', '.', '-', '_', '+', '%', '@', ' ', ','];

  it('corpus ASCII gerado (3.000 textos): exec e test a partir de cada lastIndex dão o mesmo que a regex de antes', () => {
    const r = gerador(20261104);
    const re = outra();
    const falhas: string[] = [];
    for (let n = 0; n < 3_000 && falhas.length < 10; n++) {
      const t = gerarTexto(r, ASCII);
      for (let k = 0; k <= t.length + 1; k++) {
        re.lastIndex = k;
        ANTIGA.lastIndex = k;
        const d = re.exec(t);
        const a = ANTIGA.exec(t);
        const execIgual = d?.index === a?.index && d?.[0] === a?.[0] && re.lastIndex === ANTIGA.lastIndex;
        re.lastIndex = k;
        ANTIGA.lastIndex = k;
        const testIgual = re.test(t) === ANTIGA.test(t) && re.lastIndex === ANTIGA.lastIndex;
        if (!execIgual || !testIgual) {
          falhas.push(`${JSON.stringify(t)} lastIndex=${k}`);
          break;
        }
      }
    }
    ANTIGA.lastIndex = 0;
    expect(falhas).toEqual([]);
  });

  it('corpus gerado com acento e NFD (3.000 textos): os sete caminhos dão os mesmos casamentos', () => {
    const r = gerador(20261105);
    const pedacos = [...ASCII, 'é', 'é'.normalize('NFD'), 'joão@exemplo.test'];
    for (let n = 0; n < 3_000; n++) conferirCaminhos(gerarTexto(r, pedacos));
  });

  // Casos ruins para a tentativa no fim do casamento anterior: sequência longa logo depois de um e-mail, com e sem "@",
  // domínio sem ponto, cadeia de e-mails colados e domínio que volta atrás. Cada caminho, abaixo de 200 ms.
  const CASOS_RUINS: [string, string][] = [
    ['e-mail e 100 mil "x" colados, sem "@"', 'a@b.cc+' + 'x'.repeat(100_000)],
    ['e-mail, 1.000 de usuário, "@" e 1.000 de domínio sem ponto, 50 vezes', ('a@b.cc+' + 'x'.repeat(1_000) + '@' + 'y'.repeat(1_000) + ' ').repeat(50)],
    ['e-mails colados por "+", 102 mil caracteres', 'ana@exemplo.test+'.repeat(6_000)],
    ['e-mail e ".a" repetido 50 mil vezes', 'a@b.cc' + '.a'.repeat(50_000)],
    ['e-mail e "-a@b" repetido 25 mil vezes', 'a@b.cc' + '-a@b'.repeat(25_000)],
    ['"a@b.cc@" repetido 15 mil vezes', 'a@b.cc@'.repeat(15_000)],
    ['e-mail e "é" em NFD colado 50 mil vezes', 'a@b.cc' + 'é'.normalize('NFD').repeat(50_000)],
    ['e-mail e 100 mil dígitos', 'a@b.cc' + '1'.repeat(100_000)],
  ];

  it.each(CASOS_RUINS)('tempo: %s, em cada caminho, em menos de 200 ms', (_nome, t) => {
    const caminhos: [string, () => unknown][] = [
      ['replace', () => t.replace(DETECTORES['e-mail'], MARCA)],
      ['matchAll', () => [...t.matchAll(DETECTORES['e-mail'])].length],
      ['match', () => t.match(DETECTORES['e-mail'])?.length],
      ['search', () => t.search(DETECTORES['e-mail'])],
      [
        'exec',
        () => {
          const re = outra();
          let n = 0;
          while (re.exec(t)) n++;
          return n;
        },
      ],
      [
        'test',
        () => {
          const re = outra();
          let n = 0;
          while (re.test(t)) n++;
          return n;
        },
      ],
    ];
    for (const [nome, f] of caminhos) {
      const inicio = performance.now();
      f();
      const ms = performance.now() - inicio;
      expect(ms, nome).toBeLessThan(LIMITE_MS);
    }
    expect(DETECTORES['e-mail'].lastIndex).toBe(0);
  });

  it('tempo linear: 1 milhão de caracteres com os casos ruins juntos, troca de todas as ocorrências em menos de 2 s', () => {
    let t = '';
    for (let i = 0; t.length < 1_000_000; i++) t += CASOS_RUINS[i % CASOS_RUINS.length]![1].slice(0, 20_000) + ' ';
    const inicio = performance.now();
    const s = t.replace(DETECTORES['e-mail'], MARCA);
    const ms = performance.now() - inicio;
    expect(s).toContain(MARCA);
    expect(s).not.toContain('a@b.cc');
    expect(ms).toBeLessThan(10 * LIMITE_MS);
  });
});
