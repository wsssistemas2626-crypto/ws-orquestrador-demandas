// T43: regra do formulário do pacote de decisão (03, T09), sem tela: textos da 03, valores iniciais (em branco), validação
// no envio, a entrada que vai à Server Action, os erros da API campo a campo e o "falta" da 03, e o caminho de chegada na
// T11. A entrada montada aqui passa no schema real da API (ADR-09): a validação da tela é só conveniência.
import { describe, expect, it } from 'vitest';
import { NIVEIS_APROVACAO } from '../db/schema/decisao';
import { reIdVersao } from '../lib/rota';
import { LIMITE_TEXTO } from '../modules/demandas/schemas';
import { MENSAGEM_FALTAM_ITENS } from '../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../modules/pacotes-decisao/schemas';
import { RE_ID_VERSAO } from '../modules/versoes';
import {
  AVISO_PACOTE,
  caminhoDeChegadaDoPacote,
  CAMPOS_TEXTO_DEC,
  entradaDoPacote,
  errosDaApiDec,
  faltaParaCriar,
  LIMITE_CAMPO_DEC,
  NIVEIS_DO_PACOTE,
  pacoteSujo,
  RE_ID_DEC,
  TEXTOS_DEC,
  validarPacote,
  valoresDoPacote,
  type ValoresDoPacote,
} from './dados-do-pacote';
import { idDoCampo } from './formulario';

const ID = 'DEM-20261022-0042';

function preenchido(extra: Partial<ValoresDoPacote> = {}): ValoresDoPacote {
  return {
    ...valoresDoPacote(),
    resumoExecutivo: 'Resumo fictício.',
    'opcaoA.descricao': 'Opção A fictícia',
    'opcaoB.descricao': 'Opção B fictícia',
    nivelAprovacaoRequerido: 'cto',
    ...extra,
  };
}

type Falha = Parameters<typeof errosDaApiDec>[0];
const falha = (campos: { campo: string; mensagem: string }[]): Falha => ({ ok: false, erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos });

describe('textos e constantes', () => {
  it('níveis, limite e formato do id iguais aos do servidor', () => {
    expect([...NIVEIS_DO_PACOTE]).toEqual([...NIVEIS_APROVACAO]);
    expect(LIMITE_CAMPO_DEC).toBe(LIMITE_TEXTO);
    for (const id of [`DEC-${ID}-v1`, `DEC-${ID}-v9999`, `ESP-${ID}-v1`, `RSK-${ID}-v1`, `DEC-${ID}-v12345`, `dec-${ID}-v1`, `DEC-${ID}`, `DEC-${ID}-v1 `]) {
      const doServidor = RE_ID_VERSAO.test(id) && id.startsWith('DEC-');
      expect(RE_ID_DEC.test(id), id).toBe(doServidor);
      expect(RE_ID_DEC.test(id), id).toBe(reIdVersao('DEC').test(id));
    }
  });

  it('textos da 03, T09', () => {
    const t = TEXTOS_DEC;
    expect(t.tituloNovo).toBe('Novo pacote de decisão');
    expect(t.infoProxima(`DEC-${ID}-v2`, `ESP-${ID}-v3`, `RSK-${ID}-v2`)).toBe(
      `Este será o DEC-${ID}-v2. Ele vai citar a ESP-${ID}-v3 e o RSK-${ID}-v2, as versões mais novas desta demanda. Os dados da demanda são copiados para o pacote e não mudam depois.`,
    );
    expect(t.resumoExecutivo).toBe('Resumo executivo (obrigatório)');
    expect(t.opcao('A')).toBe('Opção A');
    expect([t.descricao('B'), t.vantagens('B'), t.desvantagens('B'), t.quandoEscolher('B')]).toEqual([
      'Descrição da opção B (obrigatório)',
      'Vantagens da opção B',
      'Desvantagens da opção B',
      'Quando escolher a opção B',
    ]);
    expect(t.recomendacao).toBe('Recomendação');
    expect(t.dicaRecomendacao).toBe('Qual opção você recomenda e por quê.');
    expect(t.nivel).toBe('Nível de aprovação requerido (obrigatório)');
    expect(t.dicaNivel).toBe('Use CTO e administradora quando a decisão gerar compromisso que exija a assinatura da administradora.');
    expect(t.gravar(`DEC-${ID}-v2`)).toBe(`Gravar DEC-${ID}-v2`);
    expect([t.gravando, t.cancelar, t.novaEsp, t.novoRsk]).toEqual(['Gravando…', 'Cancelar', 'Nova versão da ESP', 'Novo parecer de risco']);
    expect([t.erros.resumo, t.erros.descricao('A'), t.erros.descricao('B'), t.erros.nivel]).toEqual([
      'Informe o resumo executivo.',
      'Descreva a opção A.',
      'Descreva a opção B.',
      'Escolha o nível de aprovação requerido.',
    ]);
    expect(t.criado(`DEC-${ID}-v2`)).toBe(`DEC-${ID}-v2 criado. A demanda está pronta para decisão e o aviso por e-mail entrou na fila de envio.`);
  });

  it('"Ainda não dá para criar o pacote. Falta: …" lista só o que falta, com o botão de cada um', () => {
    expect(faltaParaCriar({ especificacoes: [], pareceresRisco: [] }, ID)).toEqual({
      texto: 'Ainda não dá para criar o pacote. Falta: especificação técnica e parecer de risco.',
      botoes: [
        { rotulo: 'Nova versão da ESP', href: `/demandas/${ID}/especificacoes/nova` },
        { rotulo: 'Novo parecer de risco', href: `/demandas/${ID}/pareceres-risco/novo` },
      ],
    });
    expect(faltaParaCriar({ especificacoes: [{ id: 'x' }], pareceresRisco: [] }, ID)).toEqual({
      texto: 'Ainda não dá para criar o pacote. Falta: parecer de risco.',
      botoes: [{ rotulo: 'Novo parecer de risco', href: `/demandas/${ID}/pareceres-risco/novo` }],
    });
    expect(faltaParaCriar({ especificacoes: [], pareceresRisco: [{ id: 'y' }] }, ID)?.texto).toBe('Ainda não dá para criar o pacote. Falta: especificação técnica.');
    expect(faltaParaCriar({ especificacoes: [{ id: 'x' }], pareceresRisco: [{ id: 'y' }] }, ID)).toBeNull();
  });
});

describe('valores e validação no envio (03, T09 e 2.5)', () => {
  it('vazio: todos os campos em branco e nenhum nível marcado (o pacote não parte do anterior)', () => {
    const v = valoresDoPacote();
    for (const c of CAMPOS_TEXTO_DEC) expect(v[c]).toBe('');
    expect(v.nivelAprovacaoRequerido).toBe('');
    expect(pacoteSujo(v, valoresDoPacote())).toBe(false);
    expect(pacoteSujo(v, { ...v, 'opcaoB.vantagens': 'x' })).toBe(true);
  });

  it('erros na ordem da tela, com o link levando ao campo (no nível, à primeira opção)', () => {
    const erros = validarPacote(valoresDoPacote());
    expect(erros.map((e) => [e.campo, e.rotulo, e.mensagem, e.idCampo])).toEqual([
      ['resumoExecutivo', 'Resumo executivo', 'Informe o resumo executivo.', idDoCampo('resumoExecutivo')],
      ['opcaoA.descricao', 'Descrição da opção A', 'Descreva a opção A.', idDoCampo('opcaoA.descricao')],
      ['opcaoB.descricao', 'Descrição da opção B', 'Descreva a opção B.', idDoCampo('opcaoB.descricao')],
      ['nivelAprovacaoRequerido', 'Nível de aprovação requerido', 'Escolha o nível de aprovação requerido.', `${idDoCampo('nivelAprovacaoRequerido')}-cto`],
    ]);
  });

  it('só espaço conta como vazio; texto acima do limite da RNF-04 em qualquer campo', () => {
    expect(validarPacote(preenchido({ resumoExecutivo: '   ' })).map((e) => e.mensagem)).toEqual(['Informe o resumo executivo.']);
    const longo = 'x'.repeat(LIMITE_TEXTO + 1);
    const erros = validarPacote(preenchido({ 'opcaoA.vantagens': longo, recomendacao: longo }));
    expect(erros.map((e) => [e.campo, e.mensagem])).toEqual([
      ['opcaoA.vantagens', 'Este campo aceita até 10.000 caracteres.'],
      ['recomendacao', 'Este campo aceita até 10.000 caracteres.'],
    ]);
    expect(validarPacote(preenchido())).toEqual([]);
  });
});

describe('entrada da Server Action', () => {
  it('passa no schema da API, sem campo vazio e sem nenhum campo de autoria (C-11)', () => {
    const entrada = entradaDoPacote(preenchido({ 'opcaoA.vantagens': '  Mais rápida (fictício)  ', recomendacao: '' }));
    expect(entrada).toEqual({
      resumoExecutivo: 'Resumo fictício.',
      opcaoA: { descricao: 'Opção A fictícia', vantagens: 'Mais rápida (fictício)' },
      opcaoB: { descricao: 'Opção B fictícia' },
      nivelAprovacaoRequerido: 'cto',
    });
    expect(criarPacoteDecisaoSchema.safeParse(entrada).success).toBe(true);
    for (const proibido of ['autorTipo', 'autorId', 'rascunhoAgente', 'decididaPor']) expect(entrada).not.toHaveProperty(proibido);
  });

  it('sem nível e sem descrição, o servidor é que recusa (a tela não inventa valor)', () => {
    const entrada = entradaDoPacote(valoresDoPacote());
    expect(entrada).toEqual({ opcaoA: {}, opcaoB: {} });
    expect(criarPacoteDecisaoSchema.safeParse(entrada).success).toBe(false);
  });
});

describe('erros da API', () => {
  it('campo obrigatório e valor inválido viram as mensagens da 03; a opção sem objeto vai à descrição', () => {
    const e = errosDaApiDec(
      falha([
        { campo: 'resumoExecutivo', mensagem: 'Campo obrigatório.' },
        { campo: 'opcaoA', mensagem: 'Campo obrigatório.' },
        { campo: 'opcaoB.descricao', mensagem: 'Campo obrigatório.' },
        { campo: 'opcaoB.vantagens', mensagem: 'Este campo aceita até 10.000 caracteres.' },
        { campo: 'nivelAprovacaoRequerido', mensagem: 'Valor inválido.' },
      ]),
    );
    expect(e.campos.map((c) => [c.campo, c.rotulo, c.mensagem, c.idCampo])).toEqual([
      ['resumoExecutivo', 'Resumo executivo', 'Informe o resumo executivo.', idDoCampo('resumoExecutivo')],
      ['opcaoA.descricao', 'Descrição da opção A', 'Descreva a opção A.', idDoCampo('opcaoA.descricao')],
      ['opcaoB.descricao', 'Descrição da opção B', 'Descreva a opção B.', idDoCampo('opcaoB.descricao')],
      ['opcaoB.vantagens', 'Vantagens da opção B', 'Este campo aceita até 10.000 caracteres.', idDoCampo('opcaoB.vantagens')],
      ['nivelAprovacaoRequerido', 'Nível de aprovação requerido', 'Escolha o nível de aprovação requerido.', `${idDoCampo('nivelAprovacaoRequerido')}-cto`],
    ]);
    expect(e.porCampo['opcaoA.descricao']).toBe('Descreva a opção A.');
    expect(e.alerta).toBeNull();
  });

  it('400 com `faltando`: "Faltam itens para o pacote: parecer de risco." (03, T09), sem valor nenhum da entrada', () => {
    const r: Falha = { ok: false, erro: 'entrada_invalida', mensagem: MENSAGEM_FALTAM_ITENS, faltando: ['parecer_risco'] };
    expect(errosDaApiDec(r)).toMatchObject({ campos: [], alerta: 'Faltam itens para o pacote: parecer de risco.' });
    const duas: Falha = { ...r, faltando: ['especificacao', 'parecer_risco', 'outra-coisa'] };
    expect(errosDaApiDec(duas).alerta).toBe('Faltam itens para o pacote: especificação técnica e parecer de risco.');
  });

  it('409, 403 e erro do servidor: o alerta da 2.8', () => {
    expect(errosDaApiDec({ ok: false, erro: 'conflito', mensagem: 'motivo fictício.' }).alerta).toBe('Não foi possível concluir: motivo fictício.');
    expect(errosDaApiDec({ ok: false, erro: 'erro_interno', mensagem: 'pilha' }).alerta).toBe('Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.');
  });
});

describe('chegada na T11', () => {
  it('só o valor fixo de ?aviso= vai na URL, com o id do pacote', () => {
    expect(caminhoDeChegadaDoPacote(`DEC-${ID}-v2`)).toBe(`/pacotes-decisao/DEC-${ID}-v2?aviso=${AVISO_PACOTE.criado}`);
    expect(AVISO_PACOTE.criado).toBe('pacote-criado');
  });
});
