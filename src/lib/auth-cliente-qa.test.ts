// Escrito na 06-T37-testes (qa-automacao). Bordas de mensagemDoErro e dos ajudantes da T02 que auth-cliente.test.ts
// não prova: o "tempo acabou" (que manda a tela de volta ao passo 1) só vale nas duas etapas do passo do código; status
// fora de 400, 401 e 429 nunca vira texto de recusa; e o cliente do Better Auth não nasce só por importar o módulo
// (C-27, RNF-10).
import { describe, expect, it } from 'vitest';
import { MENSAGEM_ERRO_INTERNO } from './erros';
import * as modulo from './auth-cliente';
import { agruparDeQuatro, codigoDeSeisDigitos, MENSAGENS_2FA, MENSAGENS_ENTRAR, mensagemDoErro, segredoDoTotpUri } from './auth-cliente';

const COOKIE_VENCIDO = { status: 401, code: 'INVALID_TWO_FACTOR_COOKIE' };

describe('mensagemDoErro: bordas', () => {
  it('o cookie de dois fatores vencido só volta ao passo 1 no login (código e recuperação), nunca na senha nem na ativação', () => {
    expect(mensagemDoErro('senha', COOKIE_VENCIDO)).toEqual({ mensagem: MENSAGENS_ENTRAR.incorretos, expirou: false });
    expect(mensagemDoErro('ativar', COOKIE_VENCIDO)).toEqual({ mensagem: MENSAGENS_2FA.senhaIncorreta, expirou: false });
    expect(mensagemDoErro('verificarAtivacao', COOKIE_VENCIDO)).toEqual({ mensagem: MENSAGENS_2FA.codigoInvalido, expirou: false });
    expect(mensagemDoErro('codigo', { status: 400, code: 'INVALID_TWO_FACTOR_COOKIE' })).toEqual({ mensagem: MENSAGENS_ENTRAR.tempoAcabou, expirou: true });
  });

  it('o 429 vence o código do cookie vencido: "Muitas tentativas", sem voltar ao passo 1', () => {
    expect(mensagemDoErro('codigo', { status: 429, code: 'INVALID_TWO_FACTOR_COOKIE' })).toEqual({ mensagem: MENSAGENS_ENTRAR.muitasTentativas, expirou: false });
  });

  it('403, 404, 409, 422 e 503: o texto da 2.8, e nunca o código que veio do servidor', () => {
    for (const status of [403, 404, 409, 422, 503])
      for (const etapa of ['senha', 'codigo', 'recuperacao', 'ativar', 'verificarAtivacao'] as const) {
        const r = mensagemDoErro(etapa, { status, code: 'SENTINELA-codigo' });
        expect(r, `${etapa} ${status}`).toEqual({ mensagem: MENSAGEM_ERRO_INTERNO, expirou: false });
      }
  });

  it('nenhum texto de mensagemDoErro é a mensagem em inglês do Better Auth', () => {
    const textos = new Set<string>();
    for (const status of [400, 401, 429, 500, undefined])
      for (const etapa of ['senha', 'codigo', 'recuperacao', 'ativar', 'verificarAtivacao'] as const)
        for (const code of ['INVALID_CODE', 'INVALID_TWO_FACTOR_COOKIE', undefined]) textos.add(mensagemDoErro(etapa, { status, code }).mensagem);
    const permitidos = new Set<string>([...Object.values(MENSAGENS_ENTRAR), ...Object.values(MENSAGENS_2FA), MENSAGEM_ERRO_INTERNO]);
    expect([...textos].filter((t) => !permitidos.has(t))).toEqual([]);
  });
});

describe('ajudantes da T02: bordas', () => {
  it('código com tabulação ou quebra de linha colada também vale; dígito de outro alfabeto não', () => {
    expect(codigoDeSeisDigitos('\t123456\n')).toBe('123456');
    expect(codigoDeSeisDigitos('١٢٣٤٥٦')).toBeNull();
    expect(codigoDeSeisDigitos('12 34 5')).toBeNull();
  });

  it('segredo vazio no totpURI é "sem segredo"; a chave agrupada, sem os espaços, volta a ser a chave', () => {
    expect(segredoDoTotpUri('otpauth://totp/x?secret=&issuer=y')).toBeNull();
    const chave = 'IZUWG5DJMNUW6VDPORYEQ3LMINZGIU3PNVSW45DFKRSXG5DFGAZQ';
    const agrupada = agruparDeQuatro(chave);
    expect(agrupada).toMatch(/^(?:[A-Z2-7]{4} )*[A-Z2-7]{1,4}$/);
    expect(agrupada.replace(/ /g, '')).toBe(chave);
  });
});

describe('o cliente do Better Auth (C-27)', () => {
  it('importar o módulo fora do navegador não cria o cliente: só a primeira chamada de authClient() cria, e precisa de window', () => {
    expect(typeof modulo.authClient).toBe('function');
    expect(typeof globalThis.window).toBe('undefined');
    expect(() => modulo.authClient()).toThrow();
  });
});
