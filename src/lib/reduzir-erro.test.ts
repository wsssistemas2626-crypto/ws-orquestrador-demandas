import { expect, it } from 'vitest';
import { SENTINELAS } from '../../test/sentinelas';
import { reduzirErro } from './reduzir-erro';

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
