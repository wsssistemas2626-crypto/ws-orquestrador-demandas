import { describe, expect, it } from 'vitest';
import { ErroConfiguracao, lerConfigApp } from './env';

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

  // 08-correcao: o cookie Secure segue o protocolo do BETTER_AUTH_URL (auth.ts). Para isso não afrouxar a produção, ela
  // só sobe com https, ou com http no próprio computador (loopback, que não passa pela rede: o e2e com `next start`).
  it('produção com http fora do loopback não sobe; com https ou com http em 127.0.0.1, localhost ou ::1, sobe', () => {
    for (const url of ['http://orquestrador.exemplo.test', 'http://10.0.0.5:3101', 'http://192.168.0.10']) {
      expect(() => lerConfigApp({ ...base, BETTER_AUTH_URL: url, NODE_ENV: 'production' }), url).toThrow(/BETTER_AUTH_URL/);
    }
    for (const url of ['https://orquestrador.exemplo.test', 'http://127.0.0.1:3101', 'http://localhost:3101', 'http://[::1]:3101']) {
      expect(lerConfigApp({ ...base, BETTER_AUTH_URL: url, NODE_ENV: 'production' }).producao, url).toBe(true);
    }
    // Fora da produção, http em qualquer host continua aceito (desenvolvimento e teste).
    expect(lerConfigApp({ ...base, BETTER_AUTH_URL: 'http://orquestrador.exemplo.test' }).urlBase).toBe('http://orquestrador.exemplo.test');
  });

  it('C-06: cabeçalho do IP configurável, em minúsculas, e recusado se não for nome de cabeçalho', () => {
    expect(lerConfigApp({ ...base, CABECALHO_IP_CLIENTE: 'X-Forwarded-Client-IP' }).cabecalhoIp).toBe('x-forwarded-client-ip');
    expect(() => lerConfigApp({ ...base, CABECALHO_IP_CLIENTE: 'x real ip' })).toThrow(/CABECALHO_IP_CLIENTE/);
  });

  // Testes da etapa 06-T08-testes (qa-automacao).
  it('C-33: o segredo é medido em bytes, não em caracteres', () => {
    // 'é' tem 2 bytes em UTF-8: 16 caracteres dão 32 bytes (aceito); 15 dão 30 (recusado).
    expect(lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'é'.repeat(16) }).segredoAuth).toBe('é'.repeat(16));
    expect(() => lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'é'.repeat(15) })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => lerConfigApp({ ...base, BETTER_AUTH_SECRET: 'x'.repeat(16) })).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('variável vazia conta como ausente: a obrigatória falha e a opcional fica no padrão', () => {
    expect(() => lerConfigApp({ ...base, BETTER_AUTH_SECRET: '' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => lerConfigApp({ ...base, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
    expect(lerConfigApp({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '', CABECALHO_IP_CLIENTE: '' })).toMatchObject({
      retencaoDias: 90,
      cabecalhoIp: 'x-real-ip',
    });
  });

  it('erro de várias variáveis traz só os nomes, em ordem, sem nenhum dos valores', () => {
    let erro: unknown;
    try {
      lerConfigApp({
        BETTER_AUTH_SECRET: 'SENTINELA-SEGREDO',
        BETTER_AUTH_URL: 'SENTINELA-URL',
        DATABASE_URL: 'postgres://u:SENTINELA-SENHA@127.0.0.1:5434/d',
        RETENCAO_TEXTO_BRUTO_DIAS: '999',
      });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ErroConfiguracao);
    expect((erro as ErroConfiguracao).variaveis).toEqual(['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'RETENCAO_TEXTO_BRUTO_DIAS']);
    // Sem a pilha, cujos números de linha não têm a ver com o valor.
    const propriedades = Object.getOwnPropertyNames(erro).filter((p) => p !== 'stack');
    expect(JSON.stringify(erro, propriedades)).not.toMatch(/SENTINELA|999/);
    expect((erro as Error).stack).not.toContain('SENTINELA');
    expect((erro as Error).cause).toBeUndefined();
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
