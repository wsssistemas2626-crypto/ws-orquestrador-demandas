// T42: regra do formulário do RSK (03, T08) e da leitura (03, T10), sem tela: textos da 03, valores iniciais, validação
// no envio, a entrada que vai à Server Action, os erros da API campo a campo, o alerta de chegada na T05 e as seções da
// T10. A entrada montada aqui passa no schema real da API (ADR-09): a validação da tela é só conveniência.
import { describe, expect, it } from 'vitest';
import { NIVEIS_RISCO } from '../db/schema/versoes';
import { reIdVersao } from '../lib/rota';
import type { DemandaVista, PacoteResumo, VersaoResumo } from '../modules/demandas/consultas';
import { LIMITE_ITENS, LIMITE_TEXTO } from '../modules/demandas/schemas';
import type { ParecerRiscoVista } from '../modules/pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../modules/pareceres-risco/schemas';
import { RE_ID_VERSAO } from '../modules/versoes';
import { TEXTOS_ESP } from './dados-da-especificacao';
import {
  AVISO_PARECER,
  caminhoDeChegadaDoParecer,
  chegadaDoParecer,
  entradaDoParecer,
  errosDaApiRsk,
  LIMITE_CAMPO_RSK,
  NIVEIS_DO_PARECER,
  parecerSujo,
  RE_ID_RSK,
  RISCOS,
  secoesDoParecer,
  TEXTOS_RSK,
  validarParecer,
  valoresDoParecer,
  type ValoresDoParecer,
} from './dados-do-parecer';
import { idDoCampo } from './formulario';
import { idDoAdicionar, idDoItem, type ItemDaLista } from './lista-textos';

const ID = 'DEM-20261022-0042';
const CRIADA = new Date('2026-10-22T17:10:00Z');

const lista = (campo: string, ...valores: string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));

function preenchido(extra: Partial<ValoresDoParecer> = {}): ValoresDoParecer {
  return { ...valoresDoParecer(null), riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo', ...extra };
}

function rskVista(extra: Partial<ParecerRiscoVista> = {}): ParecerRiscoVista {
  return {
    id: `RSK-${ID}-v2`,
    demandaId: ID,
    versao: 2,
    resumo: 'Resumo fictício',
    riscoTecnicoNivel: 'alto',
    riscoTecnicoComentario: 'Comentário técnico fictício',
    riscoOperacionalNivel: 'medio',
    riscoOperacionalComentario: null,
    riscoJuridicoNivel: 'baixo',
    riscoJuridicoComentario: null,
    recomendacoesMitigacao: ['Mitigação A (fictício)', 'Mitigação B (fictício)'],
    preCondicoes: [],
    envolverJuridicoOuAdministradoraQuando: null,
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    criadaEm: CRIADA,
    ...extra,
  };
}

type Falha = Parameters<typeof errosDaApiRsk>[0];
const falha = (campos: { campo: string; mensagem: string }[]): Falha => ({ ok: false, erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos });

describe('textos e constantes', () => {
  it('níveis, limite e formato do id iguais aos do servidor', () => {
    expect([...NIVEIS_DO_PARECER]).toEqual([...NIVEIS_RISCO]);
    expect(LIMITE_CAMPO_RSK).toBe(LIMITE_TEXTO);
    for (const id of [`RSK-${ID}-v1`, `RSK-${ID}-v9999`, `ESP-${ID}-v1`, `DEC-${ID}-v1`, `RSK-${ID}-v12345`, `rsk-${ID}-v1`, `RSK-${ID}`, `RSK-${ID}-v1 `]) {
      const doServidor = RE_ID_VERSAO.test(id) && id.startsWith('RSK-');
      expect(RE_ID_RSK.test(id), id).toBe(doServidor);
      expect(RE_ID_RSK.test(id), id).toBe(reIdVersao('RSK').test(id));
    }
  });

  it('os três riscos, na ordem da tela, com a legend que traz o nome do risco (03, T08, Acessibilidade)', () => {
    expect(RISCOS.map((r) => [r.nivel, r.comentario, r.titulo, TEXTOS_RSK.legendaNivel(r.nome), TEXTOS_RSK.erros.nivel(r.nome)])).toEqual([
      ['riscoTecnicoNivel', 'riscoTecnicoComentario', 'Risco técnico', 'Nível do risco técnico (obrigatório)', 'Escolha o nível do risco técnico.'],
      ['riscoOperacionalNivel', 'riscoOperacionalComentario', 'Risco operacional', 'Nível do risco operacional (obrigatório)', 'Escolha o nível do risco operacional.'],
      ['riscoJuridicoNivel', 'riscoJuridicoComentario', 'Risco jurídico', 'Nível do risco jurídico (obrigatório)', 'Escolha o nível do risco jurídico.'],
    ]);
  });

  it('textos da 03, T08 e T10', () => {
    expect(TEXTOS_RSK.tituloNova).toBe('Novo parecer de risco');
    expect(TEXTOS_RSK.infoProxima(`RSK-${ID}-v2`, `ESP-${ID}-v3`)).toBe(`Este será o RSK-${ID}-v2. A especificação mais nova desta demanda é a ESP-${ID}-v3.`);
    expect(TEXTOS_RSK.semEspecificacao).toBe(
      'Esta demanda ainda não tem especificação técnica. Você pode gravar o parecer, mas o pacote de decisão vai exigir as duas.',
    );
    expect(TEXTOS_RSK.resumo).toBe('Resumo');
    expect(TEXTOS_RSK.comentario).toBe('Comentário');
    expect(TEXTOS_RSK.recomendacoes).toBe('Recomendações de mitigação');
    expect(TEXTOS_RSK.preCondicoes).toBe('Pré-condições');
    expect(TEXTOS_RSK.dicaPreCondicoes).toBe('Um item por pré-condição. O que precisa estar resolvido antes de construir.');
    expect(TEXTOS_RSK.envolver).toBe('Quando envolver o jurídico ou a administradora');
    expect(TEXTOS_RSK.dicaEnvolver).toBe('Situações em que a decisão precisa passar pelo jurídico ou pela administradora.');
    expect(TEXTOS_RSK.gravar(`RSK-${ID}-v2`)).toBe(`Gravar RSK-${ID}-v2`);
    expect(TEXTOS_RSK.sucesso(`RSK-${ID}-v2`)).toBe(`RSK-${ID}-v2 gravado.`);
    expect(TEXTOS_RSK.tituloVer(1, 'Pedidos duplicados')).toBe('Parecer de risco v1 — Pedidos duplicados');
    expect(TEXTOS_RSK.nivelEmTexto('Risco técnico', 'Alto')).toBe('Risco técnico: Alto');
    // Os comuns com a T07 e a T10 da ESP são os mesmos textos.
    for (const c of ['gravando', 'cancelar', 'criadaEm', 'naoMuda', 'maisNova', 'naoInformado', 'nenhumItem', 'criarAPartir', 'voltar', 'versaoNaoEncontrada'] as const)
      expect(TEXTOS_RSK[c], c).toBe(TEXTOS_ESP[c]);
    expect(TEXTOS_RSK.conflito(4)).toBe(TEXTOS_ESP.conflito(4));
    expect(TEXTOS_RSK.decDesatualizado(`DEC-${ID}-v1`)).toBe(TEXTOS_ESP.decDesatualizado(`DEC-${ID}-v1`));
    expect(TEXTOS_RSK.erros.campoLongo(LIMITE_TEXTO)).toBe(TEXTOS_ESP.erros.campoLongo(LIMITE_TEXTO));
  });
});

describe('valores iniciais', () => {
  it('sem RSK anterior: campos em branco, nenhum nível marcado, um item vazio em cada lista (03, T08, Vazio)', () => {
    const v = valoresDoParecer(null);
    expect(v.resumo).toBe('');
    expect([v.riscoTecnicoNivel, v.riscoOperacionalNivel, v.riscoJuridicoNivel]).toEqual(['', '', '']);
    expect(v.envolverJuridicoOuAdministradoraQuando).toBe('');
    for (const c of ['recomendacoesMitigacao', 'preCondicoes'] as const) expect(v[c]).toEqual([{ chave: `${c}-0`, valor: '' }]);
  });

  it('a partir de um RSK: os campos dele, níveis marcados e listas com um item por valor', () => {
    const v = valoresDoParecer(rskVista());
    expect(v).toMatchObject({
      resumo: 'Resumo fictício',
      riscoTecnicoNivel: 'alto',
      riscoTecnicoComentario: 'Comentário técnico fictício',
      riscoOperacionalNivel: 'medio',
      riscoOperacionalComentario: '',
      riscoJuridicoNivel: 'baixo',
      envolverJuridicoOuAdministradoraQuando: '',
    });
    expect(v.recomendacoesMitigacao.map((i) => i.valor)).toEqual(['Mitigação A (fictício)', 'Mitigação B (fictício)']);
    expect(v.preCondicoes.map((i) => i.valor)).toEqual(['']);
  });

  it('sujo: só quando algo visível mudou', () => {
    const v = preenchido();
    expect(parecerSujo(v, { ...v, preCondicoes: v.preCondicoes.map((i) => ({ ...i, chave: 'outra' })) })).toBe(false);
    expect(parecerSujo(v, { ...v, riscoJuridicoNivel: 'alto' })).toBe(true);
    expect(parecerSujo(v, { ...v, resumo: 'mudou' })).toBe(true);
    expect(parecerSujo(v, { ...v, preCondicoes: [...v.preCondicoes, { chave: 'n', valor: '' }] })).toBe(true);
  });
});

describe('validarParecer (no envio, na ordem da tela)', () => {
  it('com os três níveis: nenhum erro', () => {
    expect(validarParecer(preenchido())).toEqual([]);
  });

  it('sem nível: as três mensagens da 03, nesta ordem; o link leva à primeira opção do grupo', () => {
    const erros = validarParecer(valoresDoParecer(null));
    expect(erros.map((e) => [e.campo, e.idCampo, e.rotulo, e.mensagem])).toEqual([
      ['riscoTecnicoNivel', `${idDoCampo('riscoTecnicoNivel')}-baixo`, 'Nível do risco técnico', 'Escolha o nível do risco técnico.'],
      ['riscoOperacionalNivel', `${idDoCampo('riscoOperacionalNivel')}-baixo`, 'Nível do risco operacional', 'Escolha o nível do risco operacional.'],
      ['riscoJuridicoNivel', `${idDoCampo('riscoJuridicoNivel')}-baixo`, 'Nível do risco jurídico', 'Escolha o nível do risco jurídico.'],
    ]);
  });

  it('limite de 10.000 caracteres (RNF-04) em campo e em item, com o rótulo de cada um, na ordem da tela', () => {
    const longo = 'x'.repeat(LIMITE_TEXTO + 1);
    const erros = validarParecer(
      preenchido({
        resumo: longo,
        riscoOperacionalComentario: longo,
        recomendacoesMitigacao: lista('recomendacoesMitigacao', 'ok', longo),
        envolverJuridicoOuAdministradoraQuando: longo,
      }),
    );
    expect(erros.map((e) => [e.campo, e.idCampo, e.rotulo])).toEqual([
      ['resumo', idDoCampo('resumo'), 'Resumo'],
      ['riscoOperacionalComentario', idDoCampo('riscoOperacionalComentario'), 'Comentário do risco operacional'],
      ['recomendacoesMitigacao.1', idDoItem('recomendacoesMitigacao', 1), 'Item 2 de Recomendações de mitigação'],
      ['envolverJuridicoOuAdministradoraQuando', idDoCampo('envolverJuridicoOuAdministradoraQuando'), 'Quando envolver o jurídico ou a administradora'],
    ]);
    expect(new Set(erros.map((e) => e.mensagem))).toEqual(new Set(['Este campo aceita até 10.000 caracteres.']));
    expect(validarParecer(preenchido({ resumo: 'x'.repeat(LIMITE_TEXTO) }))).toEqual([]);
  });

  it('mais de 50 itens preenchidos: "Limite de 50 itens atingido." (só por adulteração; a tela não deixa)', () => {
    const muitos = Array.from({ length: LIMITE_ITENS + 1 }, (_, i) => ({ chave: `k${i}`, valor: `item ${i}` }));
    const erros = validarParecer(preenchido({ preCondicoes: muitos }));
    expect(erros.map((e) => [e.campo, e.mensagem])).toEqual([['preCondicoes', 'Limite de 50 itens atingido.']]);
    expect(validarParecer(preenchido({ preCondicoes: [] }))).toEqual([]);
  });
});

describe('entradaDoParecer (o que vai à Server Action)', () => {
  it('apara, descarta vazio e item vazio, guarda o índice da tela; passa no schema da API', () => {
    const v = preenchido({
      resumo: '  Resumo (fictício)  ',
      riscoTecnicoComentario: '   ',
      riscoJuridicoComentario: ' Contrato (fictício) ',
      recomendacoesMitigacao: lista('recomendacoesMitigacao', '', ' Revisar o contrato (fictício) '),
    });
    const { entrada, indices } = entradaDoParecer(v);
    expect(entrada).toEqual({
      resumo: 'Resumo (fictício)',
      riscoTecnicoNivel: 'alto',
      riscoOperacionalNivel: 'medio',
      riscoJuridicoNivel: 'baixo',
      riscoJuridicoComentario: 'Contrato (fictício)',
      recomendacoesMitigacao: ['Revisar o contrato (fictício)'],
      preCondicoes: [],
    });
    expect(indices).toEqual({ recomendacoesMitigacao: [1], preCondicoes: [] });
    expect(criarParecerRiscoSchema.safeParse(entrada).success).toBe(true);
  });

  it('nível não marcado não vai: o servidor recusa pelo campo', () => {
    const { entrada } = entradaDoParecer(valoresDoParecer(null));
    expect(entrada).not.toHaveProperty('riscoTecnicoNivel');
    const r = criarParecerRiscoSchema.safeParse(entrada);
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join('.'))).toEqual(['riscoTecnicoNivel', 'riscoOperacionalNivel', 'riscoJuridicoNivel']);
  });

  it('nenhum campo de autoria vai ao servidor (C-11)', () => {
    const { entrada } = entradaDoParecer(preenchido());
    for (const c of ['autorTipo', 'autorId', 'rascunhoAgente', 'demandaId', 'versao', 'id']) expect(entrada).not.toHaveProperty(c);
  });
});

describe('errosDaApiRsk (400 no mesmo resumo, campo a campo)', () => {
  const v = preenchido({ preCondicoes: lista('preCondicoes', '', 'a', '', 'b') });
  const indices = entradaDoParecer(v).indices;

  it('nível ausente ou inválido vira a mensagem da 03; índice do item enviado volta para a linha da tela', () => {
    const e = errosDaApiRsk(
      falha([
        { campo: 'riscoTecnicoNivel', mensagem: 'Campo obrigatório.' },
        { campo: 'riscoJuridicoNivel', mensagem: 'Valor inválido.' },
        { campo: 'preCondicoes.1', mensagem: 'Este campo aceita até 10.000 caracteres.' },
        { campo: 'resumo', mensagem: 'Este campo aceita até 10.000 caracteres.' },
      ]),
      { indices, valores: v },
    );
    expect(e.campos.map((c) => [c.campo, c.idCampo, c.rotulo, c.mensagem])).toEqual([
      ['riscoTecnicoNivel', `${idDoCampo('riscoTecnicoNivel')}-baixo`, 'Nível do risco técnico', 'Escolha o nível do risco técnico.'],
      ['riscoJuridicoNivel', `${idDoCampo('riscoJuridicoNivel')}-baixo`, 'Nível do risco jurídico', 'Escolha o nível do risco jurídico.'],
      ['preCondicoes.3', idDoItem('preCondicoes', 3), 'Item 4 de Pré-condições', 'Este campo aceita até 10.000 caracteres.'],
      ['resumo', idDoCampo('resumo'), 'Resumo', 'Este campo aceita até 10.000 caracteres.'],
    ]);
    expect(e.porCampo['preCondicoes.3']).toBe('Este campo aceita até 10.000 caracteres.');
    expect(e.alerta).toBeNull();
  });

  it('lista sem item na tela: o link leva ao "Adicionar item"', () => {
    const semItem = preenchido({ recomendacoesMitigacao: [] });
    const e = errosDaApiRsk(falha([{ campo: 'recomendacoesMitigacao', mensagem: 'Limite de 50 itens atingido.' }]), { indices: {}, valores: semItem });
    expect(e.campos.map((c) => c.idCampo)).toEqual([idDoAdicionar('recomendacoesMitigacao')]);
  });

  it('conflito, sem permissão e erro interno viram alerta, sem campo', () => {
    expect(errosDaApiRsk({ ok: false, erro: 'conflito', mensagem: 'Motivo fictício.' }, { indices, valores: v }).alerta).toBe('Não foi possível concluir: Motivo fictício.');
    expect(errosDaApiRsk({ ok: false, erro: 'erro_interno', mensagem: 'detalhe interno' }, { indices, valores: v }).alerta).toBe(
      'Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.',
    );
  });
});

describe('chegada na T05', () => {
  const versao = (v: number, demanda = ID): VersaoResumo => ({ id: `RSK-${demanda}-v${v}`, versao: v, criadaEm: CRIADA, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });
  const pacote = (extra: Partial<PacoteResumo> = {}): PacoteResumo => ({
    id: `DEC-${ID}-v1`,
    versao: 1,
    criadaEm: CRIADA,
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    statusDecisao: 'pendente',
    desatualizado: true,
    substituido: false,
    substituidoPor: null,
    ...extra,
  });
  const d = (extra: Partial<DemandaVista> = {}) => ({ pareceresRisco: [versao(2), versao(1)], pacotesDecisao: [pacote()], ...extra }) as Pick<DemandaVista, 'pareceresRisco' | 'pacotesDecisao'>;

  it('caminho de chegada: valores fixos de ?aviso=, a versão e o DEC só quando houver', () => {
    expect(caminhoDeChegadaDoParecer({ id: `RSK-${ID}-v2`, demandaId: ID, conflito: false, decDesatualizado: null })).toBe(
      `/demandas/${ID}?aviso=${AVISO_PARECER.gravado}&versao=RSK-${ID}-v2`,
    );
    expect(caminhoDeChegadaDoParecer({ id: `RSK-${ID}-v2`, demandaId: ID, conflito: true, decDesatualizado: `DEC-${ID}-v1` })).toBe(
      `/demandas/${ID}?aviso=${AVISO_PARECER.conflito}&versao=RSK-${ID}-v2&dec=DEC-${ID}-v1`,
    );
    expect(AVISO_PARECER).toEqual({ gravado: 'parecer-gravado', conflito: 'parecer-conflito' });
  });

  it('"RSK-…-vN gravado." e, com o DEC pendente desatualizado desta demanda, o aviso de T07', () => {
    expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: `RSK-${ID}-v2` }, d())).toEqual({ tipo: 'sucesso', texto: `RSK-${ID}-v2 gravado.` });
    expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: `RSK-${ID}-v2`, dec: `DEC-${ID}-v1` }, d())).toEqual({
      tipo: 'sucesso',
      texto: `RSK-${ID}-v2 gravado. O pacote DEC-${ID}-v1 ficou desatualizado. Crie um pacote novo para decidir.`,
    });
  });

  it('conflito: o texto da 03 num alerta de erro', () => {
    expect(chegadaDoParecer({ aviso: 'parecer-conflito', versao: `RSK-${ID}-v2` }, d())).toEqual({
      tipo: 'erro',
      texto: 'Outra versão foi gravada enquanto você editava. Sua versão foi gravada como v2; confira as duas no detalhe.',
    });
  });

  it('nada da URL vai para a tela: aviso fora da lista, versão de outra demanda ou que não existe, DEC decidido, em dia ou de outra demanda', () => {
    expect(chegadaDoParecer({ aviso: 'especificacao-gravada', versao: `RSK-${ID}-v2` }, d())).toBeNull();
    expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: `RSK-DEM-20261022-0001-v2` }, d())).toBeNull();
    expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: `RSK-${ID}-v9` }, d())).toBeNull();
    expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: [`RSK-${ID}-v2`] }, d())).toBeNull();
    for (const dec of [pacote({ statusDecisao: 'aprovada' }), pacote({ desatualizado: false })])
      expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: `RSK-${ID}-v2`, dec: `DEC-${ID}-v1` }, d({ pacotesDecisao: [dec] }))?.texto).toBe(`RSK-${ID}-v2 gravado.`);
    expect(chegadaDoParecer({ aviso: 'parecer-gravado', versao: `RSK-${ID}-v2`, dec: 'DEC-DEM-20261022-0001-v1' }, d())?.texto).toBe(`RSK-${ID}-v2 gravado.`);
  });
});

describe('secoesDoParecer (T10)', () => {
  it('um grupo por h2, com os rótulos de T08; níveis em texto ("Risco técnico: Alto"); vazio "Não informado.", lista vazia "Nenhum item."', () => {
    expect(secoesDoParecer(rskVista())).toEqual([
      { titulo: 'Resumo', itens: [{ termo: 'Resumo', valor: 'Resumo fictício' }] },
      {
        titulo: 'Risco técnico',
        itens: [
          { termo: 'Nível', valor: 'Risco técnico: Alto' },
          { termo: 'Comentário', valor: 'Comentário técnico fictício' },
        ],
      },
      {
        titulo: 'Risco operacional',
        itens: [
          { termo: 'Nível', valor: 'Risco operacional: Médio' },
          { termo: 'Comentário', valor: 'Não informado.' },
        ],
      },
      {
        titulo: 'Risco jurídico',
        itens: [
          { termo: 'Nível', valor: 'Risco jurídico: Baixo' },
          { termo: 'Comentário', valor: 'Não informado.' },
        ],
      },
      { titulo: 'Recomendações de mitigação', itens: [{ termo: 'Recomendações de mitigação', valor: ['Mitigação A (fictício)', 'Mitigação B (fictício)'] }] },
      { titulo: 'Pré-condições', itens: [{ termo: 'Pré-condições', valor: 'Nenhum item.' }] },
      { titulo: 'Quando envolver o jurídico ou a administradora', itens: [{ termo: 'Quando envolver o jurídico ou a administradora', valor: 'Não informado.' }] },
    ]);
  });
});
