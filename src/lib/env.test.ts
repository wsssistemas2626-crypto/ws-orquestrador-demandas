import { describe, expect, it } from 'vitest';
import { lerConfigApp } from './env';

const base = {
  BETTER_AUTH_SECRET: 'x'.repeat(48),
  BETTER_AUTH_URL: 'http://127.0.0.1:3101',
  DATABASE_URL: 'postgres://u:p@127.0.0.1:5434/d',
};

it('C-33: segredo com menos de 32 bytes não sobe', () => {
  expect(() => lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'curto' })).toThrow();
  expect(() => lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'x'.repeat(31) })).toThrow();
  expect(lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'x'.repeat(32) }).segredoAuth).toHaveLength(32);
});

it('C-31: retenção fora de 1..365 não sobe', () => {
  expect(() => lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '400' })).toThrow();
  expect(() => lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '366' })).toThrow();
  expect(() => lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '0' })).toThrow();
  expect(() => lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '9.5' })).toThrow();
  expect(() => lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: 'noventa' })).toThrow();
  expect(lerConfigApp(base).retencaoDias).toBe(90);
  expect(lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '1' }).retencaoDias).toBe(1);
  expect(lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '365' }).retencaoDias).toBe(365);
});

it('a mensagem de erro cita só o nome da variável', () => {
  let erro: unknown;
  try {
    lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'curto-SENTINELA' });
  } catch (e) {
    erro = e;
  }
  expect(String(erro)).toContain('BETTER_AUTH_SECRET');
  expect(String(erro)).not.toContain('SENTINELA');
  expect(JSON.stringify(erro, Object.getOwnPropertyNames(erro))).not.toContain('SENTINELA');
});

it('variável obrigatória ausente não sobe, e o erro lista os nomes', () => {
  let erro: unknown;
  try {
    lerConfigApp({});
  } catch (e) {
    erro = e;
  }
  expect(String(erro)).toContain('BETTER_AUTH_SECRET');
  expect(String(erro)).toContain('BETTER_AUTH_URL');
  expect(String(erro)).toContain('DATABASE_URL');
});

describe('lerConfigApp', () => {
  it('devolve a configuração com os padrões', () => {
    expect(lerConfigApp(base)).toEqual({
      urlBase: 'http://127.0.0.1:3101',
      segredoAuth: 'x'.repeat(48),
      cabecalhoIp: 'x-real-ip',
      retencaoDias: 90,
      producao: false,
      databaseUrl: 'postgres://u:p@127.0.0.1:5434/d',
    });
  });

  it('BETTER_AUTH_URL só com http ou https, guardada como origem', () => {
    expect(() => lerConfigApp({ ...base, BETTER_AUTH_URL: 'nao-e-url' })).toThrow(/BETTER_AUTH_URL/);
    expect(() => lerConfigApp({ ...base, BETTER_AUTH_URL: 'ftp://exemplo.test' })).toThrow(/BETTER_AUTH_URL/);
    expect(lerConfigApp({ ...base, BETTER_AUTH_URL: 'https://orquestrador.exemplo.test/' }).urlBase).toBe(
      'https://orquestrador.exemplo.test',
    );
  });

  it('produção só com NODE_ENV=production', () => {
    expect(lerConfigApp({ ...base, NODE_ENV: 'production' }).producao).toBe(true);
    expect(lerConfigApp({ ...base, NODE_ENV: 'test' }).producao).toBe(false);
  });

  it('C-06: cabeçalho do IP configurável, em minúsculas, e recusado se não for nome de cabeçalho', () => {
    expect(lerConfigApp({ ...base, CABECALHO_IP_CLIENTE: 'X-Forwarded-Client-IP' }).cabecalhoIp).toBe('x-forwarded-client-ip');
    expect(() => lerConfigApp({ ...base, CABECALHO_IP_CLIENTE: 'x real ip' })).toThrow(/CABECALHO_IP_CLIENTE/);
  });

  it('sem argumento lê process.env', () => {
    const antes = { ...process.env };
    try {
      Object.assign(process.env, base);
      delete process.env.RETENCAO_TEXTO_BRUTO_DIAS;
      delete process.env.CABECALHO_IP_CLIENTE;
      expect(lerConfigApp().urlBase).toBe('http://127.0.0.1:3101');
    } finally {
      for (const k of Object.keys(process.env)) if (!(k in antes)) delete process.env[k];
      Object.assign(process.env, antes);
    }
  });
});
