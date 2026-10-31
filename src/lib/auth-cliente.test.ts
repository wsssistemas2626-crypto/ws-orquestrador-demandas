// T37: o que as telas T01 e T02 fazem com a resposta do Better Auth. Os textos são os da 03, T01 e T02, por inteiro; o
// status e o código do erro decidem a mensagem, e nunca a mensagem em inglês do Better Auth (RNF-10).
import { describe, expect, it } from 'vitest';
import { MENSAGEM_ERRO_INTERNO } from './erros';
import {
  agruparDeQuatro,
  codigoDeSeisDigitos,
  MENSAGENS_2FA,
  MENSAGENS_ENTRAR,
  mensagemDoErro,
  segredoDoTotpUri,
} from './auth-cliente';

describe('textos da 03 (T01 e T02)', () => {
  it('T01 Entrar', () => {
    expect(MENSAGENS_ENTRAR).toEqual({
      preencha: 'Preencha o e-mail e a senha.',
      incorretos: 'E-mail ou senha incorretos.',
      seisDigitos: 'O código precisa ter 6 dígitos.',
      codigoInvalido: 'Código inválido ou expirado. Confira se o relógio do celular está certo e tente de novo.',
      recuperacaoInvalida: 'Código de recuperação inválido ou já usado.',
      muitasTentativas: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
      tempoAcabou: 'O tempo para digitar o código acabou. Entre de novo.',
    });
  });

  it('T02 Configurar verificação em duas etapas', () => {
    expect(MENSAGENS_2FA).toEqual({
      senhaIncorreta: 'Senha incorreta.',
      codigoInvalido: 'Código inválido. Confira se o relógio do celular está certo e digite o código atual.',
      marqueQueGuardou: 'Marque que guardou os códigos para concluir.',
      naoCopiou: 'Não foi possível copiar. Selecione os códigos e copie com Ctrl+C.',
      chaveCopiada: 'Chave copiada.',
      codigosCopiados: 'Códigos copiados.',
      ativada: 'Verificação em duas etapas ativada.',
    });
  });
});

describe('mensagemDoErro: do erro do Better Auth ao texto da tela', () => {
  it('senha (sign-in): 401 e 400 dão a mesma mensagem, para e-mail inexistente também', () => {
    expect(mensagemDoErro('senha', { status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' })).toEqual({ mensagem: MENSAGENS_ENTRAR.incorretos, expirou: false });
    expect(mensagemDoErro('senha', { status: 400, code: 'VALIDATION_ERROR' }).mensagem).toBe(MENSAGENS_ENTRAR.incorretos);
  });

  it('429 em qualquer etapa: "Muitas tentativas" (limite por IP e bloqueio da verificação)', () => {
    for (const etapa of ['senha', 'codigo', 'recuperacao', 'ativar', 'verificarAtivacao'] as const)
      expect(mensagemDoErro(etapa, { status: 429, code: 'VERIFICACAO_BLOQUEADA' }).mensagem).toBe(MENSAGENS_ENTRAR.muitasTentativas);
  });

  it('código do aplicativo no login: inválido, ou tempo acabado quando o cookie de dois fatores venceu', () => {
    expect(mensagemDoErro('codigo', { status: 401, code: 'INVALID_CODE' })).toEqual({ mensagem: MENSAGENS_ENTRAR.codigoInvalido, expirou: false });
    expect(mensagemDoErro('codigo', { status: 401, code: 'INVALID_TWO_FACTOR_COOKIE' })).toEqual({ mensagem: MENSAGENS_ENTRAR.tempoAcabou, expirou: true });
  });

  it('código de recuperação: inválido ou já usado; com o cookie vencido, tempo acabado', () => {
    expect(mensagemDoErro('recuperacao', { status: 401, code: 'INVALID_BACKUP_CODE' }).mensagem).toBe(MENSAGENS_ENTRAR.recuperacaoInvalida);
    expect(mensagemDoErro('recuperacao', { status: 401, code: 'INVALID_TWO_FACTOR_COOKIE' }).expirou).toBe(true);
  });

  it('T02: senha errada no passo 1 e código errado no passo 2', () => {
    expect(mensagemDoErro('ativar', { status: 400, code: 'INVALID_PASSWORD' }).mensagem).toBe(MENSAGENS_2FA.senhaIncorreta);
    expect(mensagemDoErro('ativar', { status: 401 }).mensagem).toBe(MENSAGENS_2FA.senhaIncorreta);
    expect(mensagemDoErro('verificarAtivacao', { status: 401, code: 'INVALID_CODE' }).mensagem).toBe(MENSAGENS_2FA.codigoInvalido);
  });

  it('5xx, rede e erro sem status: o texto da 2.8, nunca a mensagem que chegou', () => {
    for (const etapa of ['senha', 'codigo', 'recuperacao', 'ativar', 'verificarAtivacao'] as const) {
      expect(mensagemDoErro(etapa, { status: 500, code: 'SENTINELA-codigo', message: 'SENTINELA-mensagem' } as never).mensagem).toBe(MENSAGEM_ERRO_INTERNO);
      expect(mensagemDoErro(etapa, null).mensagem).toBe(MENSAGEM_ERRO_INTERNO);
      expect(mensagemDoErro(etapa, {}).mensagem).toBe(MENSAGEM_ERRO_INTERNO);
    }
  });
});

describe('codigoDeSeisDigitos', () => {
  it('aceita 6 dígitos, com espaços em volta ou no meio (colado do aplicativo)', () => {
    expect(codigoDeSeisDigitos('123456')).toBe('123456');
    expect(codigoDeSeisDigitos(' 123 456 ')).toBe('123456');
  });
  it('recusa vazio, menos ou mais de 6 e letra', () => {
    for (const t of ['', '12345', '1234567', '12345a', '１２３４５６']) expect(codigoDeSeisDigitos(t)).toBeNull();
  });
});

describe('chave TOTP em texto (03, T02: alternativa ao QR code)', () => {
  it('o segredo sai do parâmetro secret do totpURI', () => {
    const uri = 'otpauth://totp/WS%20Orquestrador%20de%20Demandas:pessoa%40ficticio.test?secret=ABCDEFGHIJKLMNOP&issuer=WS%20Orquestrador%20de%20Demandas&digits=6&period=30';
    expect(segredoDoTotpUri(uri)).toBe('ABCDEFGHIJKLMNOP');
  });
  it('URI sem segredo, de outro esquema ou inválida: null', () => {
    expect(segredoDoTotpUri('otpauth://totp/x?issuer=y')).toBeNull();
    expect(segredoDoTotpUri('https://ficticio.test/?secret=ABCD')).toBeNull();
    expect(segredoDoTotpUri('não é uma URI')).toBeNull();
  });
  it('agrupada de 4 em 4, separada por espaço', () => {
    expect(agruparDeQuatro('ABCDEFGHIJKLMNOP')).toBe('ABCD EFGH IJKL MNOP');
    expect(agruparDeQuatro('ABCDEF')).toBe('ABCD EF');
    expect(agruparDeQuatro('')).toBe('');
  });
});
