import { describe, expect, it } from 'vitest';
import { SENTINELAS } from '../../test/sentinelas';
import { CLASSES_DO_PROJETO, classeAceita, ehErro, erroJaReduzido, lerCode, lerDigest, reduzirErro } from './reduzir-erro';

it('tira mensagem e detail do Postgres', () => {
  const e = Object.assign(new Error(`duplicate key (${SENTINELAS.email})`), {
    code: '23505',
    detail: `Key (email)=(${SENTINELAS.email})`,
  });
  expect(reduzirErro(e)).toEqual({ classe: 'Error', code: '23505' });
});

it('desembrulha a causa do erro de consulta do Drizzle, que traz os parâmetros na mensagem', () => {
  const causa = Object.assign(new Error('x'), { code: '23514' });
  const e = Object.assign(new Error(`Failed query: insert ... params: ${SENTINELAS.texto}`), {
    cause: causa,
    name: 'DrizzleQueryError',
  });
  expect(reduzirErro(e)).toEqual({ classe: 'DrizzleQueryError', code: '23514' });
});

it('valor que não é Error vira classe desconhecida', () => {
  expect(reduzirErro(SENTINELAS.texto)).toEqual({ classe: 'desconhecido' });
  expect(reduzirErro({ message: SENTINELAS.texto, code: '23505' })).toEqual({ classe: 'desconhecido' });
});

it('code que não é texto curto de código não passa adiante', () => {
  const comNumero = Object.assign(new Error('x'), { code: 42 });
  expect(reduzirErro(comNumero)).toEqual({ classe: 'Error' });
  const comTexto = Object.assign(new Error('x'), { code: `falhou ${SENTINELAS.email}` });
  expect(reduzirErro(comTexto)).toEqual({ classe: 'Error' });
});

it('nome de classe com texto livre não passa adiante', () => {
  const e = new Error('x');
  e.name = `Erro de ${SENTINELAS.nome}`;
  expect(reduzirErro(e)).toEqual({ classe: 'Error' });
});

// B-1 do 0009 (DEC-DEM-20261104-0010-v1, C-21): o `code` não carrega número de documento nem telefone, e a classe não
// carrega nome de pessoa. Valores fictícios: 00000000191 no formato de CPF sem pontos, 11900000000 no de celular.
describe('B-1 do 0009: code com 10 ou mais dígitos seguidos é recusado', () => {
  const comCode = (code: string) => Object.assign(new Error('x'), { code });
  const comCausa = (code: string) => Object.assign(new Error('x'), { cause: Object.assign(new Error('y'), { code }) });

  it.each(['1234567890', '00000000191', '11900000000', '1234567890A', 'E1234567890', '12345678901234567890'])('code %s não sai, nem no erro nem na cause', (code) => {
    expect(reduzirErro(comCode(code))).toEqual({ classe: 'Error' });
    expect(reduzirErro(comCausa(code))).toEqual({ classe: 'Error' });
    expect(lerCode({ code })).toBeUndefined();
  });

  it.each(['23505', '23514', '57P01', '2200H', 'ECONNREFUSED', 'ERR_INVALID_ARG_TYPE', 'recusado', 'transitorio', 'aviso_nao_enviado', '123456789'])('code %s continua aceito', (code) => {
    expect(reduzirErro(comCode(code))).toEqual({ classe: 'Error', code });
    expect(reduzirErro(comCausa(code))).toEqual({ classe: 'Error', code });
    expect(lerCode({ code })).toBe(code);
  });

  it('no erro já reduzido, o code de 11 dígitos também some', () => {
    expect(erroJaReduzido({ classe: 'Error', code: '00000000191' })).toEqual({ classe: 'Error' });
  });
});

describe('B-1 do 0009: a classe é desconhecido, termina em Error ou Exception, ou é da lista do projeto', () => {
  const comNome = (nome: string) => {
    const e = new Error('x');
    e.name = nome;
    return e;
  };

  it.each(['Error', 'TypeError', 'RangeError', 'AggregateError', 'DrizzleQueryError', 'FooException', 'Exception', '$Error', '_Error'])('%s é aceita', (nome) => {
    expect(classeAceita(nome)).toBe(true);
    expect(reduzirErro(comNome(nome))).toEqual({ classe: nome });
    expect(erroJaReduzido({ classe: nome })).toEqual({ classe: nome });
  });

  // 0.3.1 (M-3 da 0019): entra PrazoDaTransacaoEsgotado (src/db/transacao.ts), pelo procedimento da lista fechada; a
  // classe não tem texto livre, e as outras ficam iguais.
  it('as classes do projeto estão na lista e são aceitas', () => {
    expect([...CLASSES_DO_PROJETO].sort()).toEqual(
      [
        'AvisoNaoEnviado',
        'ErroConfiguracao',
        'ErroDominio',
        'ErroEnvioEmail',
        'ErroLeituraSessao',
        'ErroProvedor',
        'ExecucaoPerdida',
        'PrazoDaTransacaoEsgotado',
        'TempoEsgotado',
      ].sort(),
    );
    for (const nome of CLASSES_DO_PROJETO) {
      expect(classeAceita(nome), nome).toBe(true);
      expect(reduzirErro(comNome(nome))).toEqual({ classe: nome });
      expect(erroJaReduzido({ classe: nome })).toEqual({ classe: nome });
    }
  });

  it.each(['Joana', 'ErrorJoana', 'Errorzinho', 'ErroJoana', 'ErroJoanaSilva', 'Exceptional', 'error', 'TypeError2', 'Joana Error', ''])('%s vira Error em reduzirErro e não é reconhecida no erro já reduzido', (nome) => {
    expect(classeAceita(nome)).toBe(false);
    expect(reduzirErro(comNome(nome))).toEqual({ classe: 'Error' });
    expect(erroJaReduzido({ classe: nome })).toBeNull();
  });

  it('desconhecido é aceita: no erro já reduzido e no name', () => {
    expect(classeAceita('desconhecido')).toBe(true);
    expect(erroJaReduzido({ classe: 'desconhecido', code: '23505' })).toEqual({ classe: 'desconhecido', code: '23505' });
    expect(reduzirErro(comNome('desconhecido'))).toEqual({ classe: 'desconhecido' });
  });

  it('identificador acima de 64 caracteres não passa, mesmo terminado em Error', () => {
    const longo = `${'A'.repeat(60)}Error`;
    expect(classeAceita(longo)).toBe(false);
    expect(reduzirErro(comNome(longo))).toEqual({ classe: 'Error' });
  });
});

// B-2 do 0010 (DEC-DEM-20261104-0011-v1, D-4): o `name` é lido uma vez só e usado só se for texto aceito. Um getter que
// muda entre leituras, um objeto com `toString` que muda e um array não passam. Nome fictício.
describe('B-2 do 0010: name que não é texto, ou que muda entre leituras, vira Error', () => {
  // A classe que sai é a da única leitura, a que foi conferida ('TypeError'), e nunca a da segunda ('Joana Ficticia').
  it('getter de name que muda entre a primeira e a segunda leitura: sai o valor conferido, nunca o seguinte', () => {
    const e = new Error('x');
    let n = 0;
    Object.defineProperty(e, 'name', { get: () => (n++ === 0 ? 'TypeError' : 'Joana Ficticia') });
    expect(reduzirErro(e)).toEqual({ classe: 'TypeError' });
  });

  it('getter de name que muda, com code: o code continua', () => {
    const e = Object.assign(new Error('x'), { code: '23505' });
    let n = 0;
    Object.defineProperty(e, 'name', { get: () => (n++ === 0 ? 'TypeError' : 'Joana Ficticia') });
    expect(reduzirErro(e)).toEqual({ classe: 'TypeError', code: '23505' });
  });

  it('getter de name que começa fora da regra e depois muda para uma classe aceita: Error', () => {
    const e = new Error('x');
    let n = 0;
    Object.defineProperty(e, 'name', { get: () => (n++ === 0 ? 'Joana Ficticia' : 'TypeError') });
    expect(reduzirErro(e)).toEqual({ classe: 'Error' });
  });

  it('objeto com toString que muda entre conversões', () => {
    const e = new Error('x');
    let n = 0;
    e.name = { toString: () => (n++ < 2 ? 'TypeError' : 'Joana Ficticia') } as never;
    const r = reduzirErro(e);
    expect(r).toEqual({ classe: 'Error' });
    expect(typeof r.classe).toBe('string');
  });

  it('array com um nome de classe aceito', () => {
    const e = new Error('x');
    e.name = ['TypeError'] as never;
    const r = reduzirErro(e);
    expect(r).toEqual({ classe: 'Error' });
    expect(typeof r.classe).toBe('string');
  });

  it('símbolo e número no name também viram Error, sem lançar', () => {
    const s = new Error('x');
    s.name = Symbol('TypeError') as never;
    expect(reduzirErro(s)).toEqual({ classe: 'Error' });
    const num = new Error('x');
    num.name = 42 as never;
    expect(reduzirErro(num)).toEqual({ classe: 'Error' });
  });

  it('o name é lido uma vez só', () => {
    const e = new Error('x');
    let leituras = 0;
    Object.defineProperty(e, 'name', {
      get: () => {
        leituras++;
        return 'TypeError';
      },
    });
    expect(reduzirErro(e)).toEqual({ classe: 'TypeError' });
    expect(leituras).toBe(1);
  });
});

// B-3 da revisão do 0011 (DEC-DEM-20261104-0012-v1): reduzirErro, lerCode, erroJaReduzido, ehErro e lerDigest nunca
// lançam. Exceção ao ler name, code ou cause de um Error sai { classe: 'Error' }; o que não dá para saber se é Error
// (Proxy com getPrototypeOf que lança) sai { classe: 'desconhecido' }. Erros e armadilhas fictícios.
describe('B-3 do 0011: getter que lança e Proxy não fazem reduzirErro lançar', () => {
  const lanca = () => {
    throw new Error('getter fictício');
  };
  const comGetter = (prop: string, base: object = new Error('falha fictícia')) => Object.defineProperty(base, prop, { get: lanca, configurable: true });
  const proxyGet = () => new Proxy(new Error('falha fictícia'), { get: lanca });
  const proxyHas = () => new Proxy(new Error('falha fictícia'), { has: lanca });
  const proxyPrototipo = () => new Proxy(new Error('falha fictícia'), { getPrototypeOf: lanca });
  const proxyOwnKeys = () => new Proxy({ classe: 'Error' }, { ownKeys: lanca });

  it('getter de name que lança: Error', () => {
    expect(reduzirErro(comGetter('name'))).toEqual({ classe: 'Error' });
  });

  it('getter de code que lança, com name TypeError válido: Error (não TypeError)', () => {
    const e = new TypeError('falha fictícia');
    expect(e.name).toBe('TypeError');
    expect(reduzirErro(comGetter('code', e))).toEqual({ classe: 'Error' });
  });

  it('getter de cause que lança: Error', () => {
    expect(reduzirErro(comGetter('cause'))).toEqual({ classe: 'Error' });
  });

  it('Proxy com get que lança e Proxy com has que lança: Error', () => {
    expect(reduzirErro(proxyGet())).toEqual({ classe: 'Error' });
    expect(reduzirErro(proxyHas())).toEqual({ classe: 'Error' });
  });

  it('Proxy com getPrototypeOf que lança: desconhecido', () => {
    expect(reduzirErro(proxyPrototipo())).toEqual({ classe: 'desconhecido' });
  });

  it('lerCode e erroJaReduzido: getter de code que lança e Proxy com ownKeys que lança', () => {
    expect(lerCode(comGetter('code', {}))).toBeUndefined();
    expect(lerCode(proxyOwnKeys())).toBeUndefined();
    expect(lerCode(proxyHas())).toBeUndefined();
    expect(erroJaReduzido(comGetter('code', { classe: 'Error' }))).toBeNull();
    expect(erroJaReduzido(proxyOwnKeys())).toBeNull();
  });

  it('ehErro e lerDigest não lançam com os mesmos Proxys', () => {
    for (const p of [proxyGet(), proxyHas(), proxyPrototipo(), proxyOwnKeys(), comGetter('digest', {})]) {
      expect(() => ehErro(p)).not.toThrow();
      expect(() => lerDigest(p)).not.toThrow();
      expect(lerDigest(p)).toBeUndefined();
    }
    expect(ehErro(proxyGet())).toBe(true);
    expect(ehErro(proxyPrototipo())).toBe(false);
  });

  it('ehErro e lerDigest no caso comum', () => {
    expect(ehErro(new TypeError('x'))).toBe(true);
    expect(ehErro({ name: 'Error', message: 'x' })).toBe(false);
    expect(ehErro('x')).toBe(false);
    expect(ehErro(null)).toBe(false);
    expect(lerDigest(Object.assign(new Error('x'), { digest: 'abc123' }))).toBe('abc123');
    expect(lerDigest(Object.assign(() => undefined, { digest: 'abc123' }))).toBe('abc123');
    expect(lerDigest(new Error('x'))).toBeUndefined();
    expect(lerDigest('abc123')).toBeUndefined();
    expect(lerDigest(null)).toBeUndefined();
  });
});
