// Minimização do texto que vai ao provedor de IA (RF-20, C-23): e-mail, telefone, CPF e CNPJ viram marcadores, e as
// linhas de cabeçalho de e-mail encaminhado saem inteiras. Sem banco; só valores fictícios.
import { describe, expect, it } from 'vitest';
import { SENTINELAS } from '../../../test/sentinelas';
import { DETECTORES, encontrarDadosPessoais, type TipoDadoPessoal } from './detectores';
import { CABECALHOS_DE_EMAIL, MARCADOR_NOME, MARCADORES, minimizar } from './minimizar';

const TIPOS: TipoDadoPessoal[] = ['e-mail', 'telefone', 'CPF', 'CNPJ'];

describe('minimizar: dado pessoal vira marcador', () => {
  it('CA-20.1: e-mail, telefone e CPF fictícios viram marcadores', () => {
    const s = minimizar('Fale com contato@exemplo.test ou (11) 90000-0000, CPF 123.456.789-09, CNPJ 12.345.678/0001-90.');
    for (const v of ['contato@exemplo.test', '90000-0000', '123.456.789-09', '12.345.678/0001-90']) expect(s).not.toContain(v);
    expect(s).toContain('[e-mail removido]');
    expect(s).toContain('[CNPJ removido]');
  });

  it('os quatro marcadores são os do plano', () => {
    expect(MARCADORES).toEqual({
      'e-mail': '[e-mail removido]',
      telefone: '[telefone removido]',
      CPF: '[CPF removido]',
      CNPJ: '[CNPJ removido]',
    });
  });

  it.each([
    ['contato@exemplo.test', '[e-mail removido]'],
    ['pessoa.ficticia+demanda@sub.exemplo.test', '[e-mail removido]'],
    ['(11) 90000-0000', '[telefone removido]'],
    ['11 90000-0000', '[telefone removido]'],
    ['+55 11 90000-0000', '[telefone removido]'],
    ['(11) 3000-0000', '[telefone removido]'],
    ['123.456.789-09', '[CPF removido]'],
    ['12345678909', '[CPF removido]'],
    ['12.345.678/0001-90', '[CNPJ removido]'],
    ['12345678000190', '[CNPJ removido]'],
  ])('%s vira %s, e o resto do texto fica', (valor, marcador) => {
    expect(minimizar(`Antes ${valor} depois.`)).toBe(`Antes ${marcador} depois.`);
  });

  it('todas as ocorrências, não só a primeira', () => {
    const s = minimizar('a@exemplo.test, b@exemplo.test e c@exemplo.test; (11) 90000-0000 e (21) 90000-0001');
    expect(s).toBe('[e-mail removido], [e-mail removido] e [e-mail removido]; [telefone removido] e [telefone removido]');
  });

  it('nada dos quatro tipos sobra no resultado, pelos próprios detectores', () => {
    const s = minimizar(
      `Contato ${SENTINELAS.email}, ${SENTINELAS.telefone}, 123.456.789-09, 12345678909, 12.345.678/0001-90 e 12345678000190.`,
    );
    expect(encontrarDadosPessoais(s, TIPOS)).toEqual([]);
  });

  it('texto sem dado pessoal passa igual, ids do sistema inclusive', () => {
    const t = 'Corrigir o importador do ERP. DEM-20261022-0042, ESP-DEM-20261022-0042-v2, em 2026-10-22, versão 16.3.8.';
    expect(minimizar(t)).toBe(t);
  });

  it('é idempotente, e chamar de novo dá o mesmo resultado (os detectores globais não guardam estado)', () => {
    const t = 'Fale com contato@exemplo.test ou (11) 90000-0000.';
    const uma = minimizar(t);
    expect(minimizar(t)).toBe(uma);
    expect(minimizar(uma)).toBe(uma);
    for (const tipo of TIPOS) expect(DETECTORES[tipo].lastIndex).toBe(0);
  });

  it('texto vazio continua vazio', () => {
    expect(minimizar('')).toBe('');
  });
});

describe('minimizar: cabeçalho de e-mail encaminhado (C-23)', () => {
  it('C-23: linhas de cabeçalho de e-mail encaminhado saem inteiras, em pt-BR e em inglês', () => {
    const s = minimizar(
      '---------- Mensagem encaminhada ----------\nDe: Pessoa Ficticia <x@exemplo.test>\nPara: Outra Pessoa\nEnviado: 22/10\nFrom: A\nTo: B\nReply-To: C\nO pedido é este.',
    );
    expect(s).not.toMatch(/Pessoa Ficticia|Outra Pessoa|^From:|^To:|^Reply-To:/m);
    expect(s).toContain('O pedido é este.');
  });

  it.each([
    'De',
    'Para',
    'Cc',
    'Cco',
    'Enviado',
    'Enviado em',
    'Responder para',
    'From',
    'To',
    'Bcc',
    'Sent',
    'Reply-To',
  ])('a linha "%s: ..." sai inteira, com a quebra de linha', (cabecalho) => {
    expect(minimizar(`Antes\n${cabecalho}: ${SENTINELAS.nome}\nDepois`)).toBe('Antes\nDepois');
  });

  it('maiúscula ou minúscula, com espaço antes dos dois-pontos, citado com ">" e em negrito', () => {
    const t = ['FROM: Pessoa A', 'de : Pessoa B', '> De: Pessoa C', '>> To: Pessoa D', '  Para: Pessoa E', '*De:* Pessoa F', '**From:** Pessoa G', 'Fica.'].join(
      '\n',
    );
    expect(minimizar(t)).toBe('Fica.');
  });

  it('quebra de linha CRLF: a linha sai sem deixar o \\r', () => {
    expect(minimizar('Antes\r\nDe: Pessoa Ficticia\r\nDepois')).toBe('Antes\r\nDepois');
  });

  it('cabeçalho na última linha, sem quebra no fim', () => {
    expect(minimizar('Antes\nPara: Pessoa Ficticia')).toBe('Antes\n');
  });

  it('"De:" no meio da linha não é cabeçalho, e "Assunto:" e "Data:" ficam', () => {
    const t = 'A tela mostra os campos De: e Para: lado a lado.\nAssunto: pedidos duplicados\nData: 22/10/2026';
    expect(minimizar(t)).toBe(t);
  });

  it('palavra que só começa igual ao cabeçalho não é cabeçalho', () => {
    const t = 'Desde: ontem\nParabéns: entregue\nToday: ok\nSentido: norte';
    expect(minimizar(t)).toBe(t);
  });

  it('o cabeçalho sai antes dos detectores: nome e e-mail da linha não sobram nem como marcador', () => {
    const s = minimizar(`De: ${SENTINELAS.nome} <${SENTINELAS.email}>\nTexto`);
    expect(s).toBe('Texto');
  });

  it('CABECALHOS_DE_EMAIL é a regex exportada, global e por linha', () => {
    expect(CABECALHOS_DE_EMAIL.flags).toContain('g');
    expect(CABECALHOS_DE_EMAIL.flags).toContain('m');
    expect('Antes\nDe: X\nDepois'.replace(CABECALHOS_DE_EMAIL, '')).toBe('Antes\nDepois');
  });
});

describe('minimizar: nome conhecido do solicitante (RF-20)', () => {
  it('o nome inteiro vira marcador, sem diferença de caixa e com espaço variável', () => {
    const s = minimizar(`Att.,\n${SENTINELAS.nome}\nfalei com PESSOA  FICTICIA   SENTINELA ontem`, { nomes: [SENTINELAS.nome] });
    expect(s).toBe(`Att.,\n${MARCADOR_NOME}\nfalei com ${MARCADOR_NOME} ontem`);
    expect(MARCADOR_NOME).toBe('[nome removido]');
  });

  it('parte de outra palavra não é o nome', () => {
    expect(minimizar('Anabela e Ana e Banana', { nomes: ['Ana'] })).toBe(`Anabela e ${MARCADOR_NOME} e Banana`);
  });

  it('caractere especial do nome é literal, não regex', () => {
    expect(minimizar('Fale com Pessoa (Ficticia) e PessoaXFicticia', { nomes: ['Pessoa (Ficticia)'] })).toBe(
      `Fale com ${MARCADOR_NOME} e PessoaXFicticia`,
    );
    expect(minimizar('a.b e axb', { nomes: ['a.b'] })).toBe(`${MARCADOR_NOME} e axb`);
  });

  it('nome com menos de 3 letras não é trocado (seria palavra comum)', () => {
    expect(minimizar('Ele e eu, a casa', { nomes: ['Eu', 'a', '  ', ''] })).toBe('Ele e eu, a casa');
  });

  it('sem nomes, nada muda além dos detectores', () => {
    expect(minimizar('Pessoa Ficticia', { nomes: [] })).toBe('Pessoa Ficticia');
    expect(minimizar('Pessoa Ficticia')).toBe('Pessoa Ficticia');
  });

  // 06-T24-testes (qa-automacao): casos de borda acrescentados.
  it('nome com acento em maiúscula também vira marcador', () => {
    expect(minimizar('Falei com PESSOA FICTÍCIA ontem', { nomes: ['Pessoa Fictícia'] })).toBe(`Falei com ${MARCADOR_NOME} ontem`);
  });

  it('letra acentuada colada ao nome conta como parte de outra palavra', () => {
    expect(minimizar('Ana, éAna e Anaé', { nomes: ['Ana'] })).toBe(`${MARCADOR_NOME}, éAna e Anaé`);
  });

  it('regressão RF-20: e-mail cujo usuário é o nome do solicitante vira o marcador de e-mail, sem sobrar o domínio', () => {
    expect(minimizar('Escreva para ficticia@empresa-exemplo.test hoje', { nomes: ['Ficticia'] })).toBe('Escreva para [e-mail removido] hoje');
    expect(minimizar('Ou contato.ficticia@empresa-exemplo.test', { nomes: ['Ficticia'] })).toBe('Ou [e-mail removido]');
  });

  // 06-T24-construcao (2ª volta): o nome é trocado depois dos detectores, e nunca dentro de um marcador.
  it.each(['removido', 'Removido', 'e-mail', 'telefone', 'CPF', 'CNPJ', 'nome removido', 'e-mail removido'])(
    'nome igual a palavra de marcador ("%s") não estraga marcador, nem chamando de novo',
    (nome) => {
      const op = { nomes: [nome] };
      const s = minimizar(`A: contato@exemplo.test; B: (11) 90000-0000; C: 123.456.789-09; D: 12.345.678/0001-90; E: ${nome}.`, op);
      expect(s).toBe(`A: [e-mail removido]; B: [telefone removido]; C: [CPF removido]; D: [CNPJ removido]; E: ${MARCADOR_NOME}.`);
      expect(minimizar(s, op)).toBe(s);
    },
  );

  it('o nome colado a um marcador, fora dele, ainda vira marcador', () => {
    expect(minimizar('Ficticia [e-mail removido] Ficticia', { nomes: ['Ficticia'] })).toBe(
      `${MARCADOR_NOME} [e-mail removido] ${MARCADOR_NOME}`,
    );
  });
});
