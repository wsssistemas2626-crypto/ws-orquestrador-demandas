// T29: configuração do worker (C-27, C-31). Valores só fictícios; nenhuma chave real.
import { describe, expect, it } from 'vitest';
import { ErroConfiguracao } from './env';
import { lerConfigWorker } from './env-worker';

const base = {
  BETTER_AUTH_SECRET: 'x'.repeat(48),
  BETTER_AUTH_URL: 'http://127.0.0.1:3101',
  DATABASE_URL: 'postgres://u:p@127.0.0.1:5434/d',
};

it('C-31: RETENCAO_TEXTO_BRUTO_DIAS=400 não sobe', () => {
  expect(() => lerConfigWorker({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '400' })).toThrow(/RETENCAO_TEXTO_BRUTO_DIAS/);
});

it('sem chaves sobe, com as chaves ausentes', () => {
  const c = lerConfigWorker(base);
  expect(c.chaveAnthropic).toBeUndefined();
  expect(c.chaveResend).toBeUndefined();
  expect(c.emailRemetente).toBeUndefined();
  expect(c.emailAvisoDecisao).toBeUndefined();
});

describe('lerConfigWorker', () => {
  it('traz a configuração do app inteira, com os mesmos padrões', () => {
    expect(lerConfigWorker(base)).toEqual({
      urlBase: 'http://127.0.0.1:3101',
      segredoAuth: 'x'.repeat(48),
      cabecalhoIp: 'x-real-ip',
      retencaoDias: 90,
      producao: false,
      databaseUrl: 'postgres://u:p@127.0.0.1:5434/d',
    });
  });

  it('com as chaves e os e-mails, devolve os quatro (chave sem espaço nas pontas)', () => {
    const c = lerConfigWorker({
      ...base,
      ANTHROPIC_API_KEY: '  chave-ficticia-ia  ',
      RESEND_API_KEY: 'chave-ficticia-email',
      EMAIL_REMETENTE: 'avisos@orquestrador.exemplo.test',
      EMAIL_AVISO_DECISAO: 'decisao@orquestrador.exemplo.test',
    });
    expect(c).toMatchObject({
      chaveAnthropic: 'chave-ficticia-ia',
      chaveResend: 'chave-ficticia-email',
      emailRemetente: 'avisos@orquestrador.exemplo.test',
      emailAvisoDecisao: 'decisao@orquestrador.exemplo.test',
    });
  });

  it('variável vazia ou só com espaço conta como ausente', () => {
    const c = lerConfigWorker({ ...base, ANTHROPIC_API_KEY: '', RESEND_API_KEY: '   ', EMAIL_REMETENTE: '', EMAIL_AVISO_DECISAO: '' });
    expect(c.chaveAnthropic).toBeUndefined();
    expect(c.chaveResend).toBeUndefined();
    expect(c.emailRemetente).toBeUndefined();
    expect(c.emailAvisoDecisao).toBeUndefined();
  });

  it('e-mail fora do formato não sobe, e o erro cita só o nome', () => {
    let erro: unknown;
    try {
      lerConfigWorker({ ...base, EMAIL_AVISO_DECISAO: 'SENTINELA-nao-e-email' });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ErroConfiguracao);
    expect((erro as ErroConfiguracao).variaveis).toEqual(['EMAIL_AVISO_DECISAO']);
    const propriedades = Object.getOwnPropertyNames(erro).filter((p) => p !== 'stack');
    expect(JSON.stringify(erro, propriedades)).not.toContain('SENTINELA');
  });

  it('erro do app e do worker juntos: os nomes dos dois, em ordem, sem nenhum valor', () => {
    let erro: unknown;
    try {
      lerConfigWorker({ ...base, RETENCAO_TEXTO_BRUTO_DIAS: '400', EMAIL_REMETENTE: 'SENTINELA-remetente', ANTHROPIC_API_KEY: 'SENTINELA-CHAVE' });
    } catch (e) {
      erro = e;
    }
    expect((erro as ErroConfiguracao).variaveis).toEqual(['EMAIL_REMETENTE', 'RETENCAO_TEXTO_BRUTO_DIAS']);
    const propriedades = Object.getOwnPropertyNames(erro).filter((p) => p !== 'stack');
    expect(JSON.stringify(erro, propriedades)).not.toMatch(/SENTINELA|400/);
    expect((erro as Error).stack).not.toContain('SENTINELA');
  });

  it('obrigatória do app ausente também impede o worker de subir', () => {
    expect(() => lerConfigWorker({ BETTER_AUTH_URL: base.BETTER_AUTH_URL })).toThrow(/BETTER_AUTH_SECRET.*DATABASE_URL/);
  });
});
