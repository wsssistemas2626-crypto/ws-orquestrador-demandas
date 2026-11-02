// T41: regra do formulário da ESP (03, T07) e da leitura (03, T10), sem tela: textos da 03, valores iniciais, validação
// no envio, a entrada que vai à Server Action, os erros da API campo a campo, o alerta de chegada na T05 e as seções da
// T10. A entrada montada aqui passa no schema real da API e na regra de construção do servidor (ADR-09): a validação
// da tela é só conveniência.
import { describe, expect, it } from 'vitest';
import { LIMITE_ITENS, LIMITE_TEXTO } from '../modules/demandas/schemas';
import type { DemandaVista, PacoteResumo, VersaoResumo } from '../modules/demandas/consultas';
import type { EspecificacaoVista } from '../modules/especificacoes/consultas';
import { criarEspecificacaoSchema, MENSAGENS_CONSTRUCAO, validarCamposDeConstrucao } from '../modules/especificacoes/schemas';
import { DONOS_REPOSITORIO } from '../vendor/construir/pedido.mjs';
import {
  AVISO_ESPECIFICACAO,
  caminhoDeChegada,
  chegadaDaEspecificacao,
  CONTA_PADRAO,
  CONTAS_REPOSITORIO,
  entradaDaEspecificacao,
  errosDaApiEsp,
  especificacaoSuja,
  ID_REPOSITORIO_DESTINO,
  LIMITE_CAMPO_ESP,
  LIMITE_SISTEMA_ALVO,
  repositorioDe,
  rotulosDaConstrucao,
  secoesDaVista,
  temDuvidas,
  TEXTOS_ESP,
  validarEspecificacao,
  valoresDaEspecificacao,
  type ValoresDaEspecificacao,
} from './dados-da-especificacao';
import { idDoCampo } from './formulario';
import { idDoAdicionar, idDoItem, type ItemDaLista } from './lista-textos';

const ID = 'DEM-20261022-0042';
const CRIADA = new Date('2026-10-22T17:10:00Z');

const lista = (campo: string, ...valores: string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));

function preenchida(extra: Partial<ValoresDaEspecificacao> = {}): ValoresDaEspecificacao {
  return {
    ...valoresDaEspecificacao(null),
    descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
    escopoInclui: lista('escopoInclui', 'Conferir o id do pedido (fictício)'),
    sistemaAlvo: 'sistema-ficticio',
    criteriosAceitePreliminares: lista('criteriosAceitePreliminares', 'O mesmo pedido não aparece duas vezes (fictício)'),
    definicaoDePronto: lista('definicaoDePronto', 'Testes verdes (fictício)'),
    ...extra,
  };
}

function espVista(extra: Partial<EspecificacaoVista> = {}): EspecificacaoVista & { versaoMaisNova: string } {
  return {
    id: `ESP-${ID}-v2`,
    demandaId: ID,
    versao: 2,
    descricaoObjetiva: 'Descrição fictícia',
    situacaoAtual: 'Situação atual fictícia',
    situacaoDesejada: null,
    escopoInclui: ['Inclui A (fictício)', 'Inclui B (fictício)'],
    escopoExclui: [],
    sistemasErp: 'ERP fictício',
    sistemasEcommerceMarketplace: null,
    sistemasApisTerceiros: null,
    sistemasServicosInternos: null,
    dadosEntidades: null,
    dadosCamposCriticos: null,
    restricoesTecnicas: null,
    duvidasEmAberto: [],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'fabianojp06/sistema-ficticio',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: ['Pronto fictício'],
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    criadaEm: CRIADA,
    versaoMaisNova: `ESP-${ID}-v2`,
    ...extra,
  };
}

type Falha = Parameters<typeof errosDaApiEsp>[0];
const falha = (campos: { campo: string; mensagem: string }[]): Falha => ({ ok: false, erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos });

describe('textos e constantes', () => {
  it('as mensagens de construção são as do servidor, que são as da 03 (T07, Erro)', () => {
    expect(TEXTOS_ESP.erros.sistemaAlvo).toBe(MENSAGENS_CONSTRUCAO.sistemaAlvo);
    expect(TEXTOS_ESP.erros.criterios).toBe(MENSAGENS_CONSTRUCAO.criteriosAceitePreliminares);
    expect(TEXTOS_ESP.erros.definicao).toBe(MENSAGENS_CONSTRUCAO.definicaoDePronto);
    expect(TEXTOS_ESP.erros.repositorioSemSistema).toBe(MENSAGENS_CONSTRUCAO.repositorioSemSistema);
    expect(TEXTOS_ESP.erros.sistemaAlvo).toBe('Informe o sistema alvo.');
    expect(TEXTOS_ESP.erros.sistemaAlvoFormato).toBe('Sistema alvo aceita só letras minúsculas, números e hífen.');
    expect(TEXTOS_ESP.erros.repositorioSemSistema).toBe('O repositório destino precisa terminar com o sistema alvo.');
  });

  it('limites iguais aos do servidor (RNF-04; sistema alvo até 100)', () => {
    expect(LIMITE_CAMPO_ESP).toBe(LIMITE_TEXTO);
    expect(LIMITE_SISTEMA_ALVO).toBe(100);
    expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: [], sistemaAlvo: 'a'.repeat(101) }).success).toBe(false);
    expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: [], sistemaAlvo: 'a'.repeat(100) }).success).toBe(true);
  });

  it('contas do repositório: as do validarPedido (vendor), com a da empresa primeiro (03, T07)', () => {
    expect([...CONTAS_REPOSITORIO].sort()).toEqual([...DONOS_REPOSITORIO].sort());
    expect(CONTAS_REPOSITORIO[0]).toBe(CONTA_PADRAO);
    expect(CONTA_PADRAO).toBe('wsssistemas2626-crypto');
  });

  it('textos da 03, T07 e T10', () => {
    expect(TEXTOS_ESP.tituloNova).toBe('Nova versão da especificação técnica');
    expect(TEXTOS_ESP.infoProxima(`ESP-${ID}-v3`, 2)).toBe(`Esta será a ESP-${ID}-v3. A v2 continua guardada e não muda.`);
    expect(TEXTOS_ESP.infoPrimeira).toBe('Esta será a primeira especificação técnica desta demanda, a v1.');
    expect(TEXTOS_ESP.infoRascunho(2)).toBe('Os campos vieram da v2, um rascunho do agente de insumo técnico. Revise antes de gravar.');
    expect(TEXTOS_ESP.gravar(`ESP-${ID}-v3`)).toBe(`Gravar ESP-${ID}-v3`);
    expect(TEXTOS_ESP.repositorioDestino('wsssistemas2626-crypto/ws-exemplo')).toBe('Repositório destino: wsssistemas2626-crypto/ws-exemplo');
    expect(TEXTOS_ESP.construcaoObrigatoria).toBe('Construção (obrigatório, exceto para Estudo)');
    expect(TEXTOS_ESP.construcaoEstudo).toBe('Construção (opcional: demanda do tipo Estudo não gera Pedido de Construção)');
    expect(TEXTOS_ESP.dialogoTitulo).toBe('Gravar com dúvidas em aberto?');
    expect(TEXTOS_ESP.dialogoTexto).toBe('A demanda vai para Aguardando informação. Nenhuma mensagem é enviada ao solicitante.');
    expect(TEXTOS_ESP.tituloVer(2, 'Pedidos duplicados')).toBe('Especificação técnica v2 — Pedidos duplicados');
    expect(TEXTOS_ESP.naoMuda).toBe('Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.');
    expect(TEXTOS_ESP.rascunhoVer).toBe('Rascunho do agente de insumo técnico. Leia com atenção: o conteúdo foi gerado por IA a partir do texto do pedido.');
  });

  it('rótulos da Construção: obrigatórios fora do Estudo; no Estudo, sem "(obrigatório)" e sem a dica de ao menos um item', () => {
    expect(rotulosDaConstrucao('melhoria')).toEqual({
      legenda: 'Construção (obrigatório, exceto para Estudo)',
      sistemaAlvo: 'Sistema alvo (obrigatório)',
      conta: 'Conta do repositório (obrigatório)',
      criterios: 'Critérios de aceite preliminares (obrigatório)',
      definicao: 'Definição de pronto (obrigatório)',
      dicaLista: 'Ao menos um item.',
    });
    expect(rotulosDaConstrucao('estudo')).toEqual({
      legenda: 'Construção (opcional: demanda do tipo Estudo não gera Pedido de Construção)',
      sistemaAlvo: 'Sistema alvo',
      conta: 'Conta do repositório',
      criterios: 'Critérios de aceite preliminares',
      definicao: 'Definição de pronto',
      dicaLista: undefined,
    });
  });
});

describe('valores iniciais', () => {
  it('sem ESP anterior: campos em branco, um item vazio em cada lista, conta da empresa (03, T07, Vazio)', () => {
    const v = valoresDaEspecificacao(null);
    expect(v.descricaoObjetiva).toBe('');
    expect(v.sistemaAlvo).toBe('');
    expect(v.contaRepositorio).toBe(CONTA_PADRAO);
    for (const c of ['escopoInclui', 'escopoExclui', 'duvidasEmAberto', 'criteriosAceitePreliminares', 'definicaoDePronto'] as const)
      expect(v[c]).toEqual([{ chave: `${c}-0`, valor: '' }]);
  });

  it('a partir de uma ESP: os campos dela, listas com um item por valor, conta tirada do repositório destino', () => {
    const v = valoresDaEspecificacao(espVista());
    expect(v.descricaoObjetiva).toBe('Descrição fictícia');
    expect(v.situacaoAtual).toBe('Situação atual fictícia');
    expect(v.situacaoDesejada).toBe('');
    expect(v.sistemasErp).toBe('ERP fictício');
    expect(v.escopoInclui.map((i) => i.valor)).toEqual(['Inclui A (fictício)', 'Inclui B (fictício)']);
    expect(v.escopoExclui.map((i) => i.valor)).toEqual(['']);
    expect(v.sistemaAlvo).toBe('sistema-ficticio');
    expect(v.contaRepositorio).toBe('fabianojp06');
    expect(repositorioDe(v)).toBe('fabianojp06/sistema-ficticio');
  });

  it('repositório de conta fora da lista, ou nulo: a conta da empresa; critérios nulos (Estudo): um item vazio', () => {
    const v = valoresDaEspecificacao(espVista({ repositorioDestino: 'outra-conta/x', criteriosAceitePreliminares: null, sistemaAlvo: null }));
    expect(v.contaRepositorio).toBe(CONTA_PADRAO);
    expect(v.sistemaAlvo).toBe('');
    expect(v.criteriosAceitePreliminares.map((i) => i.valor)).toEqual(['']);
    expect(valoresDaEspecificacao(espVista({ repositorioDestino: null })).contaRepositorio).toBe(CONTA_PADRAO);
  });

  it('repositório destino: conta + sistema alvo aparado (atualizado ao digitar)', () => {
    expect(repositorioDe(preenchida({ sistemaAlvo: '  ws-exemplo ' }))).toBe('wsssistemas2626-crypto/ws-exemplo');
    expect(repositorioDe(preenchida({ sistemaAlvo: '' }))).toBe('wsssistemas2626-crypto/');
  });

  it('suja: só quando algo visível mudou', () => {
    const v = preenchida();
    expect(especificacaoSuja(v, { ...v, escopoInclui: v.escopoInclui.map((i) => ({ ...i, chave: 'outra' })) })).toBe(false);
    expect(especificacaoSuja(v, { ...v, situacaoAtual: 'mudou' })).toBe(true);
    expect(especificacaoSuja(v, { ...v, contaRepositorio: 'fabianojp06' })).toBe(true);
    expect(especificacaoSuja(v, { ...v, escopoExclui: [...v.escopoExclui, { chave: 'n', valor: '' }] })).toBe(true);
  });

  it('temDuvidas: só com item preenchido', () => {
    expect(temDuvidas(preenchida())).toBe(false);
    expect(temDuvidas(preenchida({ duvidasEmAberto: lista('duvidasEmAberto', '  ') }))).toBe(false);
    expect(temDuvidas(preenchida({ duvidasEmAberto: lista('duvidasEmAberto', '', 'Qual o volume? (fictício)') }))).toBe(true);
  });
});

describe('validarEspecificacao (no envio, na ordem da tela)', () => {
  it('preenchida: nenhum erro', () => {
    expect(validarEspecificacao(preenchida(), 'melhoria')).toEqual([]);
  });

  it('tudo vazio num tipo construído: descrição, sistema alvo, critérios e definição de pronto, nesta ordem', () => {
    const erros = validarEspecificacao(valoresDaEspecificacao(null), 'bug');
    expect(erros.map((e) => [e.campo, e.idCampo, e.rotulo, e.mensagem])).toEqual([
      ['descricaoObjetiva', idDoCampo('descricaoObjetiva'), 'Descrição objetiva', 'Informe a descrição objetiva.'],
      ['sistemaAlvo', idDoCampo('sistemaAlvo'), 'Sistema alvo', 'Informe o sistema alvo.'],
      ['criteriosAceitePreliminares', idDoItem('criteriosAceitePreliminares', 0), 'Critérios de aceite preliminares', 'Informe ao menos um critério de aceite preliminar.'],
      ['definicaoDePronto', idDoItem('definicaoDePronto', 0), 'Definição de pronto', 'Informe ao menos um item da definição de pronto.'],
    ]);
  });

  it('Estudo: a Construção é opcional; o que for preenchido segue a regra', () => {
    const vazia = { ...valoresDaEspecificacao(null), descricaoObjetiva: 'Estudo fictício' };
    expect(validarEspecificacao(vazia, 'estudo')).toEqual([]);
    expect(validarEspecificacao({ ...vazia, sistemaAlvo: 'Com Maiúscula' }, 'estudo').map((e) => e.mensagem)).toEqual([
      'Sistema alvo aceita só letras minúsculas, números e hífen.',
    ]);
  });

  it('formato e tamanho do sistema alvo; lista sem item mira o "Adicionar item"', () => {
    expect(validarEspecificacao(preenchida({ sistemaAlvo: '-comeca-com-hifen' }), 'melhoria').map((e) => e.mensagem)).toEqual([
      'Sistema alvo aceita só letras minúsculas, números e hífen.',
    ]);
    expect(validarEspecificacao(preenchida({ sistemaAlvo: 'a'.repeat(101) }), 'melhoria').map((e) => e.mensagem)).toEqual(['Este campo aceita até 100 caracteres.']);
    const semItem = validarEspecificacao(preenchida({ definicaoDePronto: [] }), 'melhoria');
    expect(semItem.map((e) => [e.campo, e.idCampo])).toEqual([['definicaoDePronto', idDoAdicionar('definicaoDePronto')]]);
  });

  it('limite de 10.000 caracteres em campo e em item, com o rótulo do item', () => {
    const longo = 'x'.repeat(LIMITE_TEXTO + 1);
    const erros = validarEspecificacao(preenchida({ restricoesTecnicas: longo, escopoExclui: lista('escopoExclui', '', longo) }), 'melhoria');
    expect(erros.map((e) => [e.campo, e.idCampo, e.rotulo, e.mensagem])).toEqual([
      ['escopoExclui.1', idDoItem('escopoExclui', 1), 'Item 2 de Escopo exclui', 'Este campo aceita até 10.000 caracteres.'],
      ['restricoesTecnicas', idDoCampo('restricoesTecnicas'), 'Restrições técnicas', 'Este campo aceita até 10.000 caracteres.'],
    ]);
  });

  it('mais de 50 itens preenchidos: "Limite de 50 itens atingido." (só por adulteração; a tela não deixa)', () => {
    const muitos = Array.from({ length: LIMITE_ITENS + 1 }, (_, i) => ({ chave: `k${i}`, valor: `item ${i}` }));
    expect(validarEspecificacao(preenchida({ escopoInclui: muitos }), 'melhoria').map((e) => e.mensagem)).toEqual(['Limite de 50 itens atingido.']);
  });
});

describe('entradaDaEspecificacao (o que vai à Server Action)', () => {
  it('apara, descarta vazio e item vazio, guarda o índice da tela; passa no schema da API e na regra de construção', () => {
    const v = preenchida({
      situacaoAtual: '  ',
      sistemasErp: '  ERP fictício  ',
      escopoInclui: lista('escopoInclui', '', ' Inclui (fictício) '),
      duvidasEmAberto: lista('duvidasEmAberto', ''),
    });
    const { entrada, indices } = entradaDaEspecificacao(v, 'melhoria');
    expect(entrada).toEqual({
      descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
      sistemasErp: 'ERP fictício',
      escopoInclui: ['Inclui (fictício)'],
      escopoExclui: [],
      duvidasEmAberto: [],
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
      definicaoDePronto: ['Testes verdes (fictício)'],
    });
    expect(indices.escopoInclui).toEqual([1]);
    const r = criarEspecificacaoSchema.safeParse(entrada);
    expect(r.success).toBe(true);
    expect(validarCamposDeConstrucao('melhoria', r.data!)).toEqual([]);
  });

  it('tipo construído sem sistema alvo: vai só o repositório "<conta>/", e o servidor responde só pelo sistema alvo', () => {
    const { entrada } = entradaDaEspecificacao(preenchida({ sistemaAlvo: '' }), 'novo_projeto');
    expect(entrada.sistemaAlvo).toBeUndefined();
    expect(entrada.repositorioDestino).toBe('wsssistemas2626-crypto/');
    expect(validarCamposDeConstrucao('novo_projeto', criarEspecificacaoSchema.parse(entrada)).map((c) => c.campo)).toEqual(['sistemaAlvo']);
  });

  it('Estudo sem nada da Construção: nada de construção vai, e o servidor aceita', () => {
    const v = { ...valoresDaEspecificacao(null), descricaoObjetiva: 'Estudo fictício' };
    const { entrada } = entradaDaEspecificacao(v, 'estudo');
    expect(entrada).toEqual({ descricaoObjetiva: 'Estudo fictício', escopoInclui: [], escopoExclui: [], duvidasEmAberto: [] });
    expect(validarCamposDeConstrucao('estudo', criarEspecificacaoSchema.parse(entrada))).toEqual([]);
  });

  it('Estudo com sistema alvo: vai o repositório também', () => {
    const v = { ...valoresDaEspecificacao(null), descricaoObjetiva: 'Estudo fictício', sistemaAlvo: 'ws-estudo', contaRepositorio: 'fabianojp06' };
    const { entrada } = entradaDaEspecificacao(v, 'estudo');
    expect(entrada).toMatchObject({ sistemaAlvo: 'ws-estudo', repositorioDestino: 'fabianojp06/ws-estudo' });
    expect(validarCamposDeConstrucao('estudo', criarEspecificacaoSchema.parse(entrada))).toEqual([]);
  });

  it('nenhum campo de autoria vai ao servidor (C-11)', () => {
    const { entrada } = entradaDaEspecificacao(preenchida(), 'bug');
    for (const c of ['autorTipo', 'autorId', 'rascunhoAgente', 'demandaId', 'versao', 'id', 'contaRepositorio']) expect(entrada).not.toHaveProperty(c);
  });
});

describe('errosDaApiEsp (400 no mesmo resumo, campo a campo)', () => {
  const v = preenchida({ escopoInclui: lista('escopoInclui', '', 'a', '', 'b') });
  const indices = entradaDaEspecificacao(v, 'melhoria').indices;

  it('índice do item enviado volta para a linha da tela; mensagem genérica do mapeador vira a da 03', () => {
    const e = errosDaApiEsp(
      falha([
        { campo: 'descricaoObjetiva', mensagem: 'Campo obrigatório.' },
        { campo: 'escopoInclui.1', mensagem: 'Este campo aceita até 10.000 caracteres.' },
        { campo: 'sistemaAlvo', mensagem: 'Valor inválido.' },
      ]),
      { indices, valores: v },
    );
    expect(e.campos.map((c) => [c.campo, c.idCampo, c.rotulo, c.mensagem])).toEqual([
      ['descricaoObjetiva', idDoCampo('descricaoObjetiva'), 'Descrição objetiva', 'Informe a descrição objetiva.'],
      ['escopoInclui.3', idDoItem('escopoInclui', 3), 'Item 4 de Escopo inclui', 'Este campo aceita até 10.000 caracteres.'],
      ['sistemaAlvo', idDoCampo('sistemaAlvo'), 'Sistema alvo', 'Sistema alvo aceita só letras minúsculas, números e hífen.'],
    ]);
    expect(e.porCampo['escopoInclui.3']).toBe('Este campo aceita até 10.000 caracteres.');
    expect(e.alerta).toBeNull();
  });

  it('erros de construção da API (tipo mudou fora da tela): critérios e definição miram o primeiro item; o do repositório, sem sistema alvo, sai', () => {
    const e = errosDaApiEsp(
      falha([
        { campo: 'sistemaAlvo', mensagem: 'Informe o sistema alvo.' },
        { campo: 'repositorioDestino', mensagem: 'Informe o repositório destino.' },
        { campo: 'criteriosAceitePreliminares', mensagem: 'Informe ao menos um critério de aceite preliminar.' },
        { campo: 'definicaoDePronto', mensagem: 'Informe ao menos um item da definição de pronto.' },
      ]),
      { indices: {}, valores: valoresDaEspecificacao(null) },
    );
    expect(e.campos.map((c) => [c.campo, c.idCampo, c.mensagem])).toEqual([
      ['sistemaAlvo', idDoCampo('sistemaAlvo'), 'Informe o sistema alvo.'],
      ['criteriosAceitePreliminares', idDoItem('criteriosAceitePreliminares', 0), 'Informe ao menos um critério de aceite preliminar.'],
      ['definicaoDePronto', idDoItem('definicaoDePronto', 0), 'Informe ao menos um item da definição de pronto.'],
    ]);
  });

  it('"O repositório destino precisa terminar com o sistema alvo." aparece na conta do repositório', () => {
    const e = errosDaApiEsp(falha([{ campo: 'repositorioDestino', mensagem: MENSAGENS_CONSTRUCAO.repositorioSemSistema }]), { indices: {}, valores: preenchida() });
    expect(e.campos.map((c) => [c.campo, c.idCampo, c.rotulo, c.mensagem])).toEqual([
      ['contaRepositorio', idDoCampo('contaRepositorio'), 'Repositório destino', 'O repositório destino precisa terminar com o sistema alvo.'],
    ]);
    expect(e.porCampo.contaRepositorio).toBe('O repositório destino precisa terminar com o sistema alvo.');
  });

  it('o resto vira alerta, com os textos da 2.8 (conflito com o prefixo; 5xx nunca com a mensagem que chegou)', () => {
    expect(errosDaApiEsp({ ok: false, erro: 'limite_excedido', mensagem: 'Limite de 60 versões por hora atingido.' }, { indices: {}, valores: v }).alerta).toBe(
      'Limite de 60 versões por hora atingido.',
    );
    expect(errosDaApiEsp({ ok: false, erro: 'erro_interno', mensagem: 'detalhe interno' }, { indices: {}, valores: v }).alerta).toBe(
      'Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.',
    );
  });
});

describe('chegada na T05', () => {
  const versaoResumo = (v: number): VersaoResumo => ({ id: `ESP-${ID}-v${v}`, versao: v, criadaEm: CRIADA, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });
  const pacote = (v: number, extra: Partial<PacoteResumo> = {}): PacoteResumo => ({ ...versaoResumo(v), id: `DEC-${ID}-v${v}`, statusDecisao: 'pendente', desatualizado: true, ...extra });
  const demanda = (extra: Partial<DemandaVista> = {}): Pick<DemandaVista, 'status' | 'especificacoes' | 'pacotesDecisao'> => ({
    status: 'nova',
    especificacoes: [versaoResumo(3), versaoResumo(2), versaoResumo(1)],
    pacotesDecisao: [],
    ...extra,
  });
  const esp3 = { id: `ESP-${ID}-v3`, duvidasEmAberto: [] as string[] };

  it('caminho: valores fixos de aviso, o id da versão e, se houver, o DEC que ficou desatualizado', () => {
    expect(caminhoDeChegada({ id: `ESP-${ID}-v3`, demandaId: ID, conflito: false, decDesatualizado: null })).toBe(
      `/demandas/${ID}?aviso=${AVISO_ESPECIFICACAO.gravada}&versao=ESP-${ID}-v3`,
    );
    expect(caminhoDeChegada({ id: `ESP-${ID}-v4`, demandaId: ID, conflito: true, decDesatualizado: `DEC-${ID}-v1` })).toBe(
      `/demandas/${ID}?aviso=${AVISO_ESPECIFICACAO.conflito}&versao=ESP-${ID}-v4&dec=DEC-${ID}-v1`,
    );
  });

  it('"ESP-…-v3 gravada." e, com a ESP mais nova com dúvida e a demanda aguardando, "A demanda foi para Aguardando informação."', () => {
    const p = { aviso: AVISO_ESPECIFICACAO.gravada, versao: `ESP-${ID}-v3` };
    expect(chegadaDaEspecificacao(p, demanda(), esp3)).toEqual({ tipo: 'sucesso', texto: `ESP-${ID}-v3 gravada.` });
    expect(chegadaDaEspecificacao(p, demanda({ status: 'aguardando_informacao' }), { ...esp3, duvidasEmAberto: ['Dúvida fictícia'] })).toEqual({
      tipo: 'sucesso',
      texto: `ESP-${ID}-v3 gravada. A demanda foi para Aguardando informação.`,
    });
    // A demanda já saiu de aguardando (outra pessoa mudou): o complemento não é verdade e não aparece.
    expect(chegadaDaEspecificacao(p, demanda({ status: 'em_analise' }), { ...esp3, duvidasEmAberto: ['Dúvida fictícia'] })?.texto).toBe(`ESP-${ID}-v3 gravada.`);
  });

  it('DEC pendente que ficou desatualizado: o aviso de 03; DEC que não é da demanda, já decidido ou em dia, não', () => {
    const p = { aviso: AVISO_ESPECIFICACAO.gravada, versao: `ESP-${ID}-v3`, dec: `DEC-${ID}-v1` };
    expect(chegadaDaEspecificacao(p, demanda({ pacotesDecisao: [pacote(1)] }), esp3)?.texto).toBe(
      `ESP-${ID}-v3 gravada. O pacote DEC-${ID}-v1 ficou desatualizado. Crie um pacote novo para decidir.`,
    );
    for (const pacotes of [[], [pacote(1, { statusDecisao: 'aprovada' })], [pacote(1, { desatualizado: false })], [pacote(2)]])
      expect(chegadaDaEspecificacao(p, demanda({ pacotesDecisao: pacotes }), esp3)?.texto).toBe(`ESP-${ID}-v3 gravada.`);
  });

  it('conflito de versão: o texto da 03 com o número gravado, em alerta de erro', () => {
    expect(chegadaDaEspecificacao({ aviso: AVISO_ESPECIFICACAO.conflito, versao: `ESP-${ID}-v3` }, demanda(), esp3)).toEqual({
      tipo: 'erro',
      texto: 'Outra versão foi gravada enquanto você editava. Sua versão foi gravada como v3; confira as duas no detalhe.',
    });
  });

  it('nada da URL vai para a tela: aviso desconhecido, versão de outra demanda, repetida ou fora do formato não mostram nada', () => {
    for (const p of [
      {},
      { aviso: 'outro', versao: `ESP-${ID}-v3` },
      { aviso: AVISO_ESPECIFICACAO.gravada },
      { aviso: AVISO_ESPECIFICACAO.gravada, versao: 'ESP-DEM-20261022-0001-v3' },
      { aviso: AVISO_ESPECIFICACAO.gravada, versao: [`ESP-${ID}-v3`, `ESP-${ID}-v2`] },
      { aviso: AVISO_ESPECIFICACAO.gravada, versao: '<script>alert(1)</script>' },
    ])
      expect(chegadaDaEspecificacao(p, demanda(), esp3)).toBeNull();
  });
});

describe('secoesDaVista (T10)', () => {
  it('h2 por grupo, na ordem da T07; campo vazio "Não informado."; lista vazia "Nenhum item."', () => {
    const s = secoesDaVista(espVista({ criteriosAceitePreliminares: null }));
    expect(s.map((x) => x.titulo)).toEqual(['Problema', 'Escopo', 'Sistemas envolvidos', 'Dados', 'Restrições técnicas', 'Dúvidas em aberto', 'Construção']);
    expect(s[0]!.itens).toEqual([
      { termo: 'Descrição objetiva', valor: 'Descrição fictícia' },
      { termo: 'Situação atual', valor: 'Situação atual fictícia' },
      { termo: 'Situação desejada', valor: 'Não informado.' },
    ]);
    expect(s[1]!.itens).toEqual([
      { termo: 'Escopo inclui', valor: ['Inclui A (fictício)', 'Inclui B (fictício)'] },
      { termo: 'Escopo exclui', valor: 'Nenhum item.' },
    ]);
    expect(s[2]!.itens.map((i) => i.termo)).toEqual(['ERP', 'E-commerce e marketplace', 'APIs de terceiros', 'Serviços internos da WS']);
    expect(s[3]!.itens.map((i) => i.termo)).toEqual(['Entidades', 'Campos críticos']);
    expect(s[4]!.itens).toEqual([{ termo: 'Restrições técnicas', valor: 'Não informado.' }]);
    expect(s[5]!.itens).toEqual([{ termo: 'Dúvidas em aberto', valor: 'Nenhum item.' }]);
    expect(s[6]!.itens).toEqual([
      { termo: 'Sistema alvo', valor: 'sistema-ficticio' },
      { termo: 'Repositório destino', valor: 'fabianojp06/sistema-ficticio' },
      { termo: 'Critérios de aceite preliminares', valor: 'Nenhum item.' },
      { termo: 'Definição de pronto', valor: ['Pronto fictício'] },
    ]);
  });

  it('id do texto do repositório destino, ligado ao sistema alvo', () => {
    expect(ID_REPOSITORIO_DESTINO).toBe('repositorio-destino');
  });
});
