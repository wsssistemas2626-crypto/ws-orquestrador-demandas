// Minimização do texto que vai ao provedor de IA (RF-20, C-23): e-mail, telefone, CPF e CNPJ viram marcadores, e as
// linhas de cabeçalho de e-mail encaminhado saem inteiras. Sem banco; só valores fictícios.
import { describe, expect, it } from 'vitest';
import { SENTINELAS } from '../../../test/sentinelas';
import { DETECTORES, encontrarDadosPessoais, type TipoDadoPessoal } from './detectores';
import { CABECALHOS_DE_EMAIL, MARCADOR_NOME, MARCADORES, PARTICULAS_DO_NOME, minimizar, minimizarValor, partesDoNome } from './minimizar';

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

  // 06-T24-testes, 2ª passada (qa-automacao): bordas da ordem nova (detectores antes do nome) e da partição.
  it('regressão RF-20: nome no começo do usuário (nome.x@) ou no domínio do e-mail não desmonta o e-mail', () => {
    const op = { nomes: ['Ficticia'] };
    const s = minimizar('Para ficticia.contato@empresa-exemplo.test e contato@ficticia.test, ou FICTICIA_2@exemplo.test', op);
    expect(s).toBe('Para [e-mail removido] e [e-mail removido], ou [e-mail removido]');
    expect(minimizar(s, op)).toBe(s);
  });

  it.each<[string[], string]>([
    [['Pessoa Ficticia', 'nome'], `${MARCADOR_NOME} assinou; ${MARCADOR_NOME} também.`],
    [['nome', 'Pessoa Ficticia'], `${MARCADOR_NOME} assinou; ${MARCADOR_NOME} também.`],
    // M-1 do 0009 (DEC-DEM-20261104-0011-v1): a parte "nome" de "nome removido" troca "Nome", que começa por maiúscula.
    [['Pessoa Ficticia', 'nome removido', 'removido'], `${MARCADOR_NOME} assinou; ${MARCADOR_NOME} também.`],
  ])('vários nomes (%j): o marcador posto por um não é estragado pelo seguinte', (nomes, esperado) => {
    const s = minimizar('Pessoa Ficticia assinou; Nome também.', { nomes });
    expect(s).toBe(esperado);
    expect(minimizar(s, { nomes })).toBe(s);
  });

  it('cabeçalho, e-mail com o nome, telefone e o nome solto juntos: a ordem completa num texto só', () => {
    const op = { nomes: ['Ficticia'] };
    const t = 'De: Ficticia <ficticia@empresa-exemplo.test>\nOi, aqui é Ficticia (ficticia@empresa-exemplo.test, (11) 90000-0000).';
    const s = minimizar(t, op);
    expect(s).toBe(`Oi, aqui é ${MARCADOR_NOME} ([e-mail removido], [telefone removido]).`);
    expect(s).not.toMatch(/empresa-exemplo|ficticia/i);
    expect(minimizar(s, op)).toBe(s);
  });

  it('texto que só tem marcadores, com o nome igual a palavra de marcador, passa igual', () => {
    const t = `${MARCADOR_NOME}${MARCADORES['e-mail']}${MARCADORES.CPF}`;
    expect(minimizar(t, { nomes: ['removido', 'nome removido'] })).toBe(t);
  });
});

// 04-regressao do DEC-DEM-20261103-0008-v1 (qa-automacao): `minimizarValor` saiu da entrada do agente e passou a ser a
// regra única também da vista da API para quem não é pessoa (M-1). Dados fictícios da 01 do 0008.
describe('minimizarValor: a regra única da entrada do agente e da vista da API (M-1 do 0008)', () => {
  const NOME = 'Maria Ficticia Teste';
  const T = 'Falar com Maria Ficticia Teste, maria.teste@exemplo.invalid, CPF 123.456.789-09, tel (11) 90000-0000';
  const T_MIN = 'Falar com [nome removido], [e-mail removido], CPF [CPF removido], tel [telefone removido]';

  it('texto: o mesmo resultado de minimizar com os nomes', () => {
    expect(minimizarValor(T, [NOME])).toBe(T_MIN);
    expect(minimizarValor(T, [NOME])).toBe(minimizar(T, { nomes: [NOME] }));
  });

  it('lista, inclusive aninhada: cada texto minimizado, na mesma ordem; o que não é texto fica', () => {
    expect(minimizarValor([T, 'Dúvida sem dado', [T], 7, null], [NOME])).toEqual([T_MIN, 'Dúvida sem dado', [T_MIN], 7, null]);
    expect(minimizarValor([], [NOME])).toEqual([]);
  });

  it('nulo, número, booleano e indefinido saem como estão', () => {
    for (const v of [null, undefined, 0, 42, true, false]) expect(minimizarValor(v, [NOME])).toBe(v);
  });

  it('sem nome na lista, só os detectores: o nome do solicitante fica, e-mail, CPF e telefone saem', () => {
    expect(minimizarValor(T, [])).toBe('Falar com Maria Ficticia Teste, [e-mail removido], CPF [CPF removido], tel [telefone removido]');
  });

  // M-1 do 0009 (DEC-DEM-20261104-0011-v1, decisão 3 do maestro): a parte em comum ("Exemplo") também sai; o resto do
  // nome do outro fica.
  it('o nome de outro solicitante não troca o nome deste (cada item da listagem usa o seu), salvo a parte em comum', () => {
    expect(minimizarValor('Pedido de Ana Exemplo Lima', ['Bruno Exemplo Rocha'])).toBe('Pedido de Ana [nome removido] Lima');
  });

  it('nome com menos de 3 letras não é trocado; com espaço duplo e caixa diferente, é', () => {
    expect(minimizarValor('Eu e a casa', ['Eu'])).toBe('Eu e a casa');
    expect(minimizarValor('falar com MARIA  FICTICIA   TESTE', [NOME])).toBe('falar com [nome removido]');
  });

  it('é idempotente: o texto já minimizado passa igual', () => {
    expect(minimizarValor(T_MIN, [NOME])).toBe(T_MIN);
  });
});

// M-1 do 0009 (DEC-DEM-20261104-0011-v1, D-1): além do nome completo, cada parte do nome do solicitante com 3 letras ou
// mais vira marcador, se no texto começar por maiúscula; partícula e sufixo de parentesco ficam; sem diferença de acento
// nos dois sentidos. Casos da 01 e da 02 do pedido; todos os nomes são fictícios.
describe('M-1 do 0009: cada parte do nome', () => {
  const M = MARCADOR_NOME;
  const NFD = (s: string) => s.normalize('NFD');

  const CASOS: [string, string, string][] = [
    // Tabela do D-1 da 01.
    ['Joana Ficticia', 'Joana Ficticia confirmou', `${M} confirmou`],
    ['Ana dos Santos', 'A Ana pediu os dados dos clientes; Santos aprovou.', `A ${M} pediu os dados dos clientes; ${M} aprovou.`],
    ['Bruno Dias Lima', 'Prazo de 30 dias; suco de lima; Lima aprovou.', `Prazo de 30 dias; suco de lima; ${M} aprovou.`],
    ['Bruno Dias Lima', 'Dias depois o Bruno ligou.', `${M} depois o ${M} ligou.`],
    [
      'Carla Rosa Campos',
      'camisa rosa, os campos do formulário; Rosa e Campos assinaram',
      `camisa rosa, os campos do formulário; ${M} e ${M} assinaram`,
    ],
    ['Joana Ficticia', 'JOANA pediu', `${M} pediu`],
    ['Joana Ficticia', 'a joana pediu', 'a joana pediu'],
    ['Joana Ficticia', 'Escreva para joana.ficticia@exemplo.test ou Joana@exemplo.test', 'Escreva para [e-mail removido] ou [e-mail removido]'],
    ['Joana Conceição Ficticia', 'a Conceição pediu; CONCEIÇÃO aprovou', `a ${M} pediu; ${M} aprovou`],
    ['Joana Conceição Ficticia', 'a Conceicao pediu', `a ${M} pediu`],
    ['Removido Ficticia', '[e-mail removido] Removido', `[e-mail removido] ${M}`],
    ['Joana Ficticia', 'Joanabela e Ficticias', 'Joanabela e Ficticias'],
    // Casos da 02.
    [
      'Joana Ficticia',
      'A Joana pediu o relatório. Falei com a Ficticia ontem. Joana Ficticia confirmou.',
      `A ${M} pediu o relatório. Falei com a ${M} ontem. ${M} confirmou.`,
    ],
    ['Joana Conceicao Ficticia', 'a Conceição pediu; CONCEIÇÃO aprovou', `a ${M} pediu; ${M} aprovou`],
    ['Joana Conceição Ficticia', 'joana conceicao ficticia ligou', `${M} ligou`],
    ['Joana Conceição Ficticia', NFD('a Conceição pediu'), `a ${M} pediu`],
    ['Érica Ícaro Ficticia', 'a Érica e o ÍCARO', `a ${M} e o ${M}`],
    ["Ana-Clara D'Ávila", "a Clara e a Ávila; D'Ávila assinou", `a ${M} e a ${M}; D'${M} assinou`],
    ['Carlos Ficticio Neto', 'o Neto do cliente e o Carlos', `o Neto do cliente e o ${M}`],
    ['Ana dos Santos', 'Dos Santos e Da Silva', `Dos ${M} e Da Silva`],
    // Bordas a mais: nome em NFD com texto em NFC, sufixo com acento, nome completo em NFD no texto.
    [NFD('Joana Conceição Ficticia'), 'a Conceição pediu', `a ${M} pediu`],
    ['Carlos Ficticio Júnior', 'o Júnior e o Junior; Carlos ligou', `o Júnior e o Junior; ${M} ligou`],
    ['Joana Conceição Ficticia', NFD('JOANA CONCEIÇÃO FICTICIA ligou'), `${M} ligou`],
  ];

  it.each(CASOS)('nome %j, texto %j', (nome, texto, esperado) => {
    const op = { nomes: [nome] };
    const s = minimizar(texto, op);
    expect(s).toBe(esperado);
    expect(minimizar(s, op)).toBe(s);
  });

  it('o resto do texto não é normalizado: o acento decomposto fora do nome fica como veio', () => {
    const t = NFD('Conceição pediu a revisão da ação');
    const s = minimizar(t, { nomes: ['Joana Conceição Ficticia'] });
    expect(s).toBe(`${M}${NFD(' pediu a revisão da ação')}`);
  });

  it('PARTICULAS_DO_NOME é a lista fechada da triagem, minúscula e sem acento', () => {
    expect([...PARTICULAS_DO_NOME].sort()).toEqual(
      [
        'da',
        'das',
        'de',
        'do',
        'dos',
        'du',
        'del',
        'della',
        'di',
        'van',
        'von',
        'der',
        'den',
        'le',
        'la',
        'e',
        'y',
        'filho',
        'filha',
        'neto',
        'neta',
        'junior',
        'sobrinho',
      ].sort(),
    );
  });

  it.each<[string, string[]]>([
    ['Ana dos Santos Filho', ['Ana', 'Santos']],
    ['Joana Ficticia', ['Joana', 'Ficticia']],
    ["Ana-Clara D'Ávila", ['Ana', 'Clara', 'Ávila']],
    ['Pessoa (Ficticia)', ['Pessoa', 'Ficticia']],
    ['Ana Ana ANA', ['Ana']],
    ['Eu a', []],
    ['  ', []],
    ['Carlos Van Der Berg Júnior', ['Carlos', 'Berg']],
    ['Joana  Ficticia‐Teste’Lima', ['Joana', 'Ficticia', 'Teste', 'Lima']],
  ])('partesDoNome(%j) é %j', (nome, partes) => {
    expect(partesDoNome(nome)).toEqual(partes);
  });

  it('vários nomes: todos os nomes completos antes das partes, e um marcador por nome completo', () => {
    const op = { nomes: ['Ana Exemplo Lima', 'Bruno Exemplo Rocha'] };
    const s = minimizar('Ana Exemplo Lima falou com Bruno Exemplo Rocha; Exemplo e Rocha assinaram.', op);
    expect(s).toBe(`${M} falou com ${M}; ${M} e ${M} assinaram.`);
    expect(minimizar(s, op)).toBe(s);
  });

  it('as partes "Nome" e "Removido" não estragam nenhum marcador', () => {
    const op = { nomes: ['Nome Removido Telefone'] };
    const t = 'Fale com contato@exemplo.test, (11) 90000-0000, CPF 123.456.789-09; Nome e Removido e Telefone.';
    const s = minimizar(t, op);
    expect(s).toBe(`Fale com [e-mail removido], [telefone removido], CPF [CPF removido]; ${M} e ${M} e ${M}.`);
    expect(minimizar(s, op)).toBe(s);
  });

  it('tempo: nome de 200 caracteres com muitas partes, sobre texto de 100.000 caracteres, em menos de 1 s', () => {
    const letras = 'bcdfghjklmnpqrstvz';
    const partes: string[] = [];
    for (let i = 0; partes.join(' ').length < 196; i++) partes.push(`A${letras[i % letras.length]}${letras[Math.floor(i / letras.length) % letras.length]}`);
    const nome = partes.join(' ').slice(0, 200);
    const t = 'Texto fictício com palavras Comuns e Abc minúsculas, Conceição e ação; '.repeat(1500).slice(0, 100_000);
    expect(t.length).toBe(100_000);
    const inicio = performance.now();
    minimizar(t, { nomes: [nome] });
    expect(performance.now() - inicio).toBeLessThan(1000);
  });
});
