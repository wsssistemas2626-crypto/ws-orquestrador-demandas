// T45: regra da T12 Agentes e teto de gasto (03, T12; RF-17 a RF-19; 04, C-12, C-26 e C-31; RNF-05; P1-f), sem tela: os
// textos da 03 e os que a tarefa escreveu no estilo da 2.8 (worker e expurgo), a linha do gasto do mês, o alerta do teto
// (um por vez), o valor do campo, a validação que espelha a do servidor, o diálogo de cada agente, a última mudança, o
// último expurgo, os alertas do worker e o que a tela mostra quando a Server Action recusa. As mensagens que o servidor
// também usa são cópia das de teto.ts e configuracao.ts: este teste confere.
import { describe, expect, it } from 'vitest';
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { AGENTES } from '../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../modules/acesso/mensagens';
import { mensagemNaoLigou as naoLigouDoServidor } from '../modules/agentes/configuracao';
import { definirTetoSchema, MENSAGENS_TETO } from '../modules/agentes/teto';
import {
  alertaDoTeto,
  alertasDoWorker,
  avisoDeAlternancia,
  erroDeAlternar,
  errosDoTeto,
  ID_CAMPO_TETO,
  linhaDoGasto,
  linhasDosAgentes,
  MENSAGENS_TETO_DO_SERVIDOR,
  mensagemNaoLigou,
  mesPorExtenso,
  textoDoDialogo,
  textoDoExpurgo,
  TEXTOS_AGENTES,
  tituloDoDialogo,
  validarTeto,
  valorDoTeto,
} from './dados-dos-agentes';
import { idDoCampo } from './formulario';

type Falha = Extract<ResultadoAcao<unknown>, { ok: false }>;

const OUTUBRO = { mesReferencia: '2026-10', viraEm: new Date('2026-11-01T03:00:00Z') };

describe('textos (03, T12; plano, T45)', () => {
  it('os da 03, por inteiro', () => {
    expect(TEXTOS_AGENTES).toMatchObject({
      tituloAba: 'Agentes e teto de gasto',
      titulo: 'Agentes e teto de gasto',
      introducao:
        'Agente ligado prepara rascunhos por IA, dentro do teto mensal. Desligado, você preenche os mesmos campos à mão. Nenhum agente decide nem envia nada para fora.',
      tetoNaoDefinido: 'Teto não definido: com US$ 0,00, nenhum agente chama o provedor, mesmo ligado. Defina o teto para usar os agentes.',
      gastoDoMes: 'Gasto do mês',
      rotuloTeto: 'Teto mensal de gasto (US$)',
      dicaTeto: 'Valor na moeda da cobrança do provedor de IA. O gasto conta do dia 1 ao último dia do mês.',
      salvarTeto: 'Salvar teto',
      salvando: 'Salvando…',
      agentes: 'Agentes',
      legendaTabela: 'Agentes de IA',
      colunas: ['Agente', 'Situação', 'Última mudança'],
      nuncaAlterado: 'Nunca alterado',
      ligarAgente: 'Ligar agente',
      cancelar: 'Cancelar',
      somenteCto: 'Só o CTO altera esta configuração.',
    });
    expect(TEXTOS_AGENTES.tetoSalvo(10)).toBe('Teto salvo: US$ 10,00.');
    expect(TEXTOS_AGENTES.tetoSalvo(1234.5)).toBe('Teto salvo: US$ 1.234,50.');
  });

  it('os que a tarefa escreveu no estilo da 2.8, porque a 03 não os previu (plano, T45)', () => {
    expect(TEXTOS_AGENTES).toMatchObject({
      workerSemSinal: 'O worker não dá sinal há mais de 5 minutos.',
      workerDuplicado: 'Há duas instâncias do worker rodando. Deixe só uma: com duas, o teto pode ser ultrapassado.',
      expurgoNaoRodou: 'O expurgo ainda não rodou.',
      ultimoExpurgo: 'Último expurgo do texto recebido: ',
    });
  });

  it('as mensagens do teto são as de teto.ts, e a de "não ligou" é a de configuracao.ts, para os quatro agentes', () => {
    expect(MENSAGENS_TETO_DO_SERVIDOR).toEqual(MENSAGENS_TETO);
    for (const a of AGENTES) expect(mensagemNaoLigou(a)).toBe(naoLigouDoServidor(a));
    expect(mensagemNaoLigou('risco')).toBe('Não foi possível ligar o agente de risco. Ele continua desligado.');
  });
});

describe('diálogo ao ligar e avisos (03, T12)', () => {
  it('risco: o título e o texto da 03, por inteiro', () => {
    expect(tituloDoDialogo('risco')).toBe('Ligar o agente de risco?');
    expect(textoDoDialogo('risco')).toBe(
      'Ele passa a chamar o provedor de IA a cada especificação técnica sem dúvida gravada, dentro do teto mensal. O resultado é sempre um rascunho que uma pessoa revisa.',
    );
  });

  it('os outros agentes trocam o nome e o gatilho', () => {
    expect(tituloDoDialogo('orquestrador')).toBe('Ligar o agente orquestrador?');
    expect(tituloDoDialogo('insumo_tecnico')).toBe('Ligar o agente de insumo técnico?');
    expect(tituloDoDialogo('consolidacao')).toBe('Ligar o agente de consolidação?');
    const fim = ', dentro do teto mensal. O resultado é sempre um rascunho que uma pessoa revisa.';
    expect(textoDoDialogo('orquestrador')).toBe(`Ele passa a chamar o provedor de IA a cada texto enviado na Nova demanda${fim}`);
    expect(textoDoDialogo('insumo_tecnico')).toBe(`Ele passa a chamar o provedor de IA a cada demanda criada${fim}`);
    expect(textoDoDialogo('consolidacao')).toBe(`Ele passa a chamar o provedor de IA a cada parecer de risco gravado com especificação${fim}`);
  });

  it('ligado e desligado, na região de aviso', () => {
    expect(avisoDeAlternancia('risco', true)).toBe('Agente de risco ligado.');
    expect(avisoDeAlternancia('risco', false)).toBe('Agente de risco desligado.');
    expect(avisoDeAlternancia('orquestrador', true)).toBe('Agente orquestrador ligado.');
    expect(avisoDeAlternancia('consolidacao', false)).toBe('Agente de consolidação desligado.');
  });
});

describe('gasto do mês (03, T12; P1-f)', () => {
  it('o mês por extenso, com maiúscula, do mês civil de São Paulo', () => {
    expect(mesPorExtenso('2026-10')).toBe('Outubro de 2026');
    expect(mesPorExtenso('2027-03')).toBe('Março de 2027');
    expect(mesPorExtenso('2026-12')).toBe('Dezembro de 2026');
  });

  it('com gasto: "<Mês de ano>: US$ 3,20 de US$ 10,00 (32 %)"', () => {
    expect(linhaDoGasto({ ...OUTUBRO, tetoMensal: 10, gastoDoMes: 3.2, percentual: 32 })).toBe('Outubro de 2026: US$ 3,20 de US$ 10,00 (32 %)');
    expect(linhaDoGasto({ ...OUTUBRO, tetoMensal: 10, gastoDoMes: 10.5, percentual: 105 })).toBe('Outubro de 2026: US$ 10,50 de US$ 10,00 (105 %)');
  });

  it('sem gasto: "<Mês de ano>: US$ 0,00 de US$ <teto>. Nenhuma chamada este mês."', () => {
    expect(linhaDoGasto({ ...OUTUBRO, tetoMensal: 10, gastoDoMes: 0, percentual: 0 })).toBe('Outubro de 2026: US$ 0,00 de US$ 10,00. Nenhuma chamada este mês.');
    expect(linhaDoGasto({ ...OUTUBRO, tetoMensal: 0, gastoDoMes: 0, percentual: 0 })).toBe('Outubro de 2026: US$ 0,00 de US$ 0,00. Nenhuma chamada este mês.');
  });

  it('com gasto e teto 0 (teto baixado no meio do mês): sem porcentagem, que não existe', () => {
    expect(linhaDoGasto({ ...OUTUBRO, tetoMensal: 0, gastoDoMes: 3.2, percentual: 0 })).toBe('Outubro de 2026: US$ 3,20 de US$ 0,00');
  });
});

describe('alerta do teto, um por vez (03, T12)', () => {
  it('teto 0: o de atenção, mesmo com gasto', () => {
    expect(alertaDoTeto({ ...OUTUBRO, tetoMensal: 0, gastoDoMes: 0, suspenso: true })).toEqual({ tipo: 'atencao', texto: TEXTOS_AGENTES.tetoNaoDefinido });
    expect(alertaDoTeto({ ...OUTUBRO, tetoMensal: 0, gastoDoMes: 4, suspenso: true })).toEqual({ tipo: 'atencao', texto: TEXTOS_AGENTES.tetoNaoDefinido });
  });

  it('teto definido e atingido: o de erro, com o gasto, o teto e o dia em que o mês vira', () => {
    expect(alertaDoTeto({ ...OUTUBRO, tetoMensal: 10, gastoDoMes: 10, suspenso: true })).toEqual({
      tipo: 'erro',
      texto: 'Agentes suspensos: o gasto do mês (US$ 10,00) atingiu o teto (US$ 10,00). Nada é chamado até o teto subir ou o mês virar em 01/11/2026.',
    });
    expect(alertaDoTeto({ viraEm: new Date('2027-01-01T03:00:00Z'), tetoMensal: 5, gastoDoMes: 5.31, suspenso: true })?.texto).toBe(
      'Agentes suspensos: o gasto do mês (US$ 5,31) atingiu o teto (US$ 5,00). Nada é chamado até o teto subir ou o mês virar em 01/01/2027.',
    );
  });

  it('teto definido e não atingido: nenhum alerta', () => {
    expect(alertaDoTeto({ ...OUTUBRO, tetoMensal: 10, gastoDoMes: 3.2, suspenso: false })).toBeNull();
  });
});

describe('campo do teto (03, T12 e 2.5)', () => {
  it('o valor gravado vira o texto do campo, com vírgula e duas casas, sem ponto de milhar (o servidor recusa)', () => {
    expect(valorDoTeto(0)).toBe('0,00');
    expect(valorDoTeto(10)).toBe('10,00');
    expect(valorDoTeto(3.2)).toBe('3,20');
    expect(valorDoTeto(1234567.89)).toBe('1234567,89');
    for (const v of [0, 10, 3.2, 1234567.89]) expect(definirTetoSchema.safeParse({ tetoMensal: valorDoTeto(v) }).success).toBe(true);
  });

  it('o id do campo é o do Resumo de erros', () => {
    expect(ID_CAMPO_TETO).toBe(idDoCampo('tetoMensal'));
  });

  it('a validação no navegador dá o mesmo que definirTetoSchema, valor a valor (a regra que vale é a do servidor)', () => {
    const amostras = ['10,00', '10.00', '10', '0', '0,5', ' 7,25 ', '', '   ', '-1', '-1,00', ' -3 ', '-', '-abc', '10,123', '1.000,00', 'abc', '10,', ',5', '12345678901', '1e3', '١٠'];
    for (const v of amostras) {
      const r = definirTetoSchema.safeParse({ tetoMensal: v });
      const doServidor = r.success ? null : (r.error.issues[0]?.message ?? null);
      expect(validarTeto(v), JSON.stringify(v)).toBe(doServidor);
    }
    expect(validarTeto('-1')).toBe('O teto não pode ser negativo.');
    expect(validarTeto('10,123')).toBe('Informe o teto com até duas casas decimais, por exemplo 10,00.');
  });

  it('a recusa da Server Action: o 400 vai ao campo e ao Resumo de erros; o resto, ao alerta da 2.8', () => {
    const invalido: Falha = { ok: false, erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos: [{ campo: 'tetoMensal', mensagem: MENSAGENS_TETO.negativo }] };
    expect(errosDoTeto(invalido)).toMatchObject({
      campos: [{ campo: 'tetoMensal', idCampo: ID_CAMPO_TETO, rotulo: 'Teto mensal de gasto (US$)', mensagem: 'O teto não pode ser negativo.' }],
      porCampo: { tetoMensal: 'O teto não pode ser negativo.' },
      alerta: null,
    });
    expect(errosDoTeto({ ok: false, erro: 'sem_permissao', mensagem: 'qualquer' }).alerta).toBe(MENSAGENS_ACESSO.sem_permissao);
    expect(errosDoTeto({ ok: false, erro: 'erro_interno', mensagem: 'SENTINELA-mensagem-crua' }).alerta).toBe(MENSAGEM_ERRO_INTERNO);
  });
});

describe('interruptor: o que a tela mostra quando a Server Action recusa (03, T12)', () => {
  it('ligar com 409 (sem modelo com preço vigente): a frase da 03 com o nome do agente, sem "Não foi possível concluir: "', () => {
    expect(erroDeAlternar('risco', true, { ok: false, erro: 'conflito', mensagem: naoLigouDoServidor('risco') })).toBe(
      'Não foi possível ligar o agente de risco. Ele continua desligado.',
    );
    expect(erroDeAlternar('orquestrador', true, { ok: false, erro: 'conflito', mensagem: 'outra' })).toBe(mensagemNaoLigou('orquestrador'));
  });

  it('403 e erro do servidor: os textos da 2.8, nunca a mensagem crua', () => {
    expect(erroDeAlternar('risco', true, { ok: false, erro: 'sem_permissao', mensagem: 'qualquer' })).toBe(MENSAGENS_ACESSO.sem_permissao);
    expect(erroDeAlternar('risco', false, { ok: false, erro: 'erro_interno', mensagem: 'SENTINELA-mensagem-crua' })).toBe(MENSAGEM_ERRO_INTERNO);
    expect(erroDeAlternar('risco', true, { ok: false, erro: 'erro_interno', mensagem: 'SENTINELA-mensagem-crua' })).toBe(MENSAGEM_ERRO_INTERNO);
  });
});

describe('tabela de agentes (03, T12)', () => {
  it('na ordem recebida, com o rótulo da 2.6, o estado e "Nunca alterado" ou "<nome>, <data>"', () => {
    const em = new Date('2026-10-22T13:00:00Z');
    expect(
      linhasDosAgentes([
        { agente: 'orquestrador', ligado: false, atualizadoEm: null, atualizadoPor: null },
        { agente: 'insumo_tecnico', ligado: true, atualizadoEm: em, atualizadoPor: { nome: 'Pessoa Ficticia CTO' } },
        { agente: 'risco', ligado: false, atualizadoEm: em, atualizadoPor: null },
      ]),
    ).toEqual([
      { agente: 'orquestrador', rotulo: 'Agente orquestrador (entrada)', ligado: false, ultimaMudanca: null },
      {
        agente: 'insumo_tecnico',
        rotulo: 'Agente de insumo técnico (ESP)',
        ligado: true,
        ultimaMudanca: { quem: 'Pessoa Ficticia CTO', iso: '2026-10-22T13:00:00.000Z', quando: '22/10/2026 às 10:00' },
      },
      // A conta que alterou não existe mais (o app não apaga conta): fica a data.
      { agente: 'risco', rotulo: 'Agente de risco (RSK)', ligado: false, ultimaMudanca: { quem: null, iso: '2026-10-22T13:00:00.000Z', quando: '22/10/2026 às 10:00' } },
    ]);
  });
});

describe('último expurgo (C-31) e worker (RNF-05)', () => {
  it('a data do último expurgo, ou "O expurgo ainda não rodou."', () => {
    expect(textoDoExpurgo(null)).toEqual({ texto: 'O expurgo ainda não rodou.', data: null });
    expect(textoDoExpurgo({ em: new Date('2026-10-22T06:00:00Z'), quantidade: 3 })).toEqual({
      texto: 'Último expurgo do texto recebido: ',
      data: { iso: '2026-10-22T06:00:00.000Z', quando: '22/10/2026 às 03:00' },
    });
  });

  it('worker sem sinal e duas instâncias, cada um no seu alerta; tudo certo, nenhum', () => {
    const ok = { ultimoBatimento: new Date('2026-10-22T13:00:00Z'), atrasado: false, instanciasRecentes: 1, duasInstancias: false };
    expect(alertasDoWorker(ok)).toEqual([]);
    expect(alertasDoWorker({ ...ok, ultimoBatimento: null, atrasado: true, instanciasRecentes: 0 })).toEqual([{ tipo: 'atencao', texto: TEXTOS_AGENTES.workerSemSinal }]);
    expect(alertasDoWorker({ ...ok, instanciasRecentes: 2, duasInstancias: true })).toEqual([{ tipo: 'erro', texto: TEXTOS_AGENTES.workerDuplicado }]);
  });
});
