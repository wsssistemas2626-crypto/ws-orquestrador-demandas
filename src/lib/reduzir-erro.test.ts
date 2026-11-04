import { describe, expect, it } from 'vitest';
import { SENTINELAS } from '../../test/sentinelas';
import { CLASSES_DO_PROJETO, classeAceita, erroJaReduzido, lerCode, reduzirErro } from './reduzir-erro';

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

  it('as classes do projeto estão na lista e são aceitas', () => {
    expect([...CLASSES_DO_PROJETO].sort()).toEqual(
      ['AvisoNaoEnviado', 'ErroConfiguracao', 'ErroDominio', 'ErroEnvioEmail', 'ErroLeituraSessao', 'ErroProvedor', 'ExecucaoPerdida', 'TempoEsgotado'].sort(),
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
