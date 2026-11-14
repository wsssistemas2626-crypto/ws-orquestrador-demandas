// T44: regra da seção "Pedido de Construção" da T11 (03, T11; RF-22; 04, C-16 e C-28), sem tela: os textos da 03 e o
// aviso de C-28, quando a seção aparece (só com a decisão aprovada completa; Estudo sem botão), o link de baixar com o
// conteúdo exato e o que a tela mostra para cada erro da Server Action. As mensagens que o servidor também usa são cópia
// das de gerar.ts: este teste confere.
import { describe, expect, it } from 'vitest';
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO, MENSAGEM_NAO_ENCONTRADO } from '../lib/erros';
import { MENSAGENS_ACESSO } from '../modules/acesso/mensagens';
import type { PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { MENSAGENS_PEDIDO } from '../modules/pedido-construcao/gerar';
import { serializarPedido } from '../modules/pedido-construcao/serializar';
import { entradaDoPedido, erroDoPedido, hrefDoPedido, MENSAGENS_PEDIDO_DO_SERVIDOR, orientacaoDoPedido, secaoDoPedido, TEXTOS_PEDIDO } from './dados-do-pedido';

type Falha = Extract<ResultadoAcao<unknown>, { ok: false }>;

const APROVADO = new Date('2026-10-22T18:00:00Z');
const decidida = (opcaoEscolhida: 'A' | null) => ({ opcaoEscolhida, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO });
const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };

type Base = Pick<PacoteDecisaoVista, 'statusDecisao' | 'decisao' | 'demandaTipo' | 'aprovadores' | 'desatualizado' | 'substituidoPor'>;
const p = (extra: Partial<Base> = {}): Base => ({
  statusDecisao: 'pendente',
  decisao: null,
  demandaTipo: 'novo_projeto',
  aprovadores: [],
  desatualizado: false,
  substituidoPor: null,
  ...extra,
});

describe('textos (03, T11 "Pedido de Construção"; 04, C-28)', () => {
  it('os da 03, por inteiro, e o aviso de C-28 do plano', () => {
    expect(TEXTOS_PEDIDO).toMatchObject({
      titulo: 'Pedido de Construção',
      // 0.3.0 (T19 do DEC-DEM-20261111-0016-v1, CA-16.3): o texto da 03, 6.2, que não diz mais que o envio é só manual.
      texto:
        'Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.',
      // D3 do 0013: texto da 02-triagem, para revisão da ux-ui-design.
      avisoDadoPessoal:
        'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail, telefone ou CPF de qualquer pessoa ou do cliente no título, na descrição, na ESP nem no parecer de risco.',
      confirmacao:
        'Confirmo que o título, a descrição, a ESP e o parecer de risco deste pacote não têm dado pessoal de ninguém: nome, e-mail, telefone ou CPF.',
      semConfirmacao: 'Marque a confirmação para gerar o pedido.',
      gerar: 'Gerar Pedido de Construção',
      gerando: 'Gerando o pedido…',
      copiar: 'Copiar JSON',
      rotuloBloco: 'Conteúdo do Pedido de Construção',
      nota: 'O mesmo pacote gera sempre o mesmo pedido.',
      estudo: 'Demanda do tipo Estudo não gera Pedido de Construção.',
      gerado: 'Pedido de Construção gerado.',
      copiado: 'JSON copiado para a área de transferência.',
      naoCopiou: 'Não foi possível copiar. Selecione o conteúdo abaixo e copie com Ctrl+C.',
      naoPassou: 'O pedido não passou na validação do /construir. Nada foi entregue. Erros:',
      orientacao: 'Corrija criando uma versão nova da ESP e um pacote novo.',
    });
    expect(TEXTOS_PEDIDO.baixar('DEC-DEM-20261022-0042-v1.json')).toBe('Baixar DEC-DEM-20261022-0042-v1.json');
  });

  it('as mensagens do servidor copiadas para o navegador são as de gerar.ts', () => {
    expect(MENSAGENS_PEDIDO_DO_SERVIDOR).toEqual({
      estudo: MENSAGENS_PEDIDO.estudo,
      naoPassou: MENSAGENS_PEDIDO.naoPassou,
      semConfirmacao: MENSAGENS_PEDIDO.semConfirmacao,
    });
    expect(TEXTOS_PEDIDO.naoPassou).toBe(`${MENSAGENS_PEDIDO.naoPassou} Erros:`);
  });
});

describe('secaoDoPedido: só com a decisão aprovada completa', () => {
  it('pendente, aprovação parcial, devolvida e arquivada: sem seção', () => {
    expect(secaoDoPedido(p())).toBe('nenhuma');
    expect(secaoDoPedido(p({ aprovadores: [aprovacaoCto] }))).toBe('nenhuma');
    expect(secaoDoPedido(p({ statusDecisao: 'devolvida', decisao: decidida(null) }))).toBe('nenhuma');
    expect(secaoDoPedido(p({ statusDecisao: 'arquivada', decisao: decidida(null) }))).toBe('nenhuma');
    // Estudo pendente também não mostra a mensagem: a seção só existe depois de aprovado.
    expect(secaoDoPedido(p({ demandaTipo: 'estudo' }))).toBe('nenhuma');
  });

  it('aprovada: gerar, em todo tipo construído; Estudo (pelo tipo copiado no pacote): só a mensagem', () => {
    for (const demandaTipo of ['novo_projeto', 'melhoria', 'bug', 'produto_proprio'] as const)
      expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), demandaTipo })), demandaTipo).toBe('gerar');
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), demandaTipo: 'estudo' }))).toBe('estudo');
  });

  it('aprovada sem a linha da decisão (vista incoerente): sem seção', () => {
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: null }))).toBe('nenhuma');
  });

  it('A-03 (08-correcao): aprovada e desatualizada (ESP ou RSK mais nova depois da aprovação): sem seção nem botão', () => {
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), desatualizado: true }))).toBe('nenhuma');
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), demandaTipo: 'estudo', desatualizado: true }))).toBe('nenhuma');
  });

  it('0.1.13: aprovada e substituída por um aprovado mais novo: sem seção nem botão; sem substituto, gerar', () => {
    const v2 = 'DEC-DEM-20261104-0001-v2';
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), substituidoPor: v2 }))).toBe('nenhuma');
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), demandaTipo: 'estudo', substituidoPor: v2 }))).toBe('nenhuma');
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), desatualizado: true, substituidoPor: v2 }))).toBe('nenhuma');
    expect(secaoDoPedido(p({ statusDecisao: 'aprovada', decisao: decidida('A'), substituidoPor: null }))).toBe('gerar');
  });
});

describe('hrefDoPedido: o link de baixar leva o conteúdo exato', () => {
  it('data:application/json;charset=utf-8, com o JSON codificado, ida e volta sem perda (acentos, aspas, quebras, #, %)', () => {
    // O mesmo formato de serializarPedido (duas casas de recuo e a quebra de linha no fim).
    const json = `${JSON.stringify({ titulo: 'Situação "atual" #1 com 50% e /barra', lista: ['ç', 'ã', 'é'] }, null, 2)}\n`;
    expect(serializarPedido(JSON.parse(json))).toBe(json);
    const href = hrefDoPedido(json);
    expect(href.startsWith('data:application/json;charset=utf-8,')).toBe(true);
    const corpo = href.slice('data:application/json;charset=utf-8,'.length);
    // Nada que encerre o URL antes da hora (#), quebre o atributo (aspas, espaço) ou vire escape solto (%).
    expect(corpo).not.toMatch(/[#"\s]/);
    expect(corpo).not.toMatch(/%(?![0-9A-F]{2})/);
    expect(decodeURIComponent(corpo)).toBe(json);
  });
});

describe('erroDoPedido: o que a tela mostra para cada recusa', () => {
  const falha = (f: Omit<Partial<Falha>, 'ok'> & Pick<Falha, 'erro'>): Falha => ({ mensagem: '', ...f, ok: false });

  it('422 da validação (C-28 e validarPedido): o texto da 03 com "Erros:", a lista da API e a orientação por campo (D1 do 0013)', () => {
    const r = falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: e-mail', 'demanda.titulo: telefone'] });
    expect(erroDoPedido(r)).toEqual({
      texto: 'O pedido não passou na validação do /construir. Nada foi entregue. Erros:',
      erros: ['especificacao.conteudo: e-mail', 'demanda.titulo: telefone'],
      orientacao: [ORIENTACOES.titulo, ORIENTACOES.esp, ORIENTACOES.aviso],
    });
  });

  it('422 de Estudo: o texto da 03, sem lista nem orientação', () => {
    expect(erroDoPedido(falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.estudo }))).toEqual({
      texto: 'Demanda do tipo Estudo não gera Pedido de Construção.',
      erros: [],
      orientacao: [],
    });
  });

  it('D3 do 0013: 422 sem a confirmação: o texto do servidor, sem lista nem orientação', () => {
    expect(erroDoPedido(falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.semConfirmacao }))).toEqual({
      texto: 'Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue.',
      erros: [],
      orientacao: [],
    });
  });

  it('409, 403, 404 e erro interno: os textos da 2.8, nunca a mensagem crua do erro interno', () => {
    expect(erroDoPedido(falha({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado }))).toEqual({
      texto: `Não foi possível concluir: ${MENSAGENS_PEDIDO.naoAprovado}`,
      erros: [],
      orientacao: [],
    });
    expect(erroDoPedido(falha({ erro: 'sem_permissao', mensagem: 'x' })).texto).toBe(MENSAGENS_ACESSO.sem_permissao);
    expect(erroDoPedido(falha({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO })).texto).toBe(MENSAGEM_NAO_ENCONTRADO);
    expect(erroDoPedido(falha({ erro: 'erro_interno', mensagem: 'SENTINELA-DETALHE-INTERNO' })).texto).toBe(MENSAGEM_ERRO_INTERNO);
  });

  it('422 de outra origem e erro de campo (id fora do formato): sem lista vazia nem o "Corrija os campos"', () => {
    expect(erroDoPedido(falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou }))).toEqual({
      texto: 'O pedido não passou na validação do /construir. Nada foi entregue.',
      erros: [],
      orientacao: ['Corrija criando uma versão nova da ESP e um pacote novo.'],
    });
    expect(erroDoPedido(falha({ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos: [{ campo: 'decId', mensagem: 'Valor inválido.' }] }))).toEqual({
      texto: MENSAGEM_ERRO_INTERNO,
      erros: [],
      orientacao: [],
    });
  });
});

// D1 do 0013 (E5): a orientação do 422 diz que campo corrigir e onde e, desde a 0.1.13, que o pacote novo aprovado
// substitui este. Só as linhas que valem, nesta ordem; nenhuma traz valor do pedido.
const ORIENTACOES = {
  nome: 'O nome do solicitante, inteiro ou em parte com inicial maiúscula, está nos campos da lista. Tire o nome e gere de novo.',
  titulo: 'Título e descrição (demanda.titulo, demanda.descricao): corrija na demanda, em "Editar dados".',
  esp: 'ESP, critérios de aceite, definição de pronto, sistema e repositório: corrija numa versão nova da ESP.',
  risco: 'Parecer de risco (risco.conteudo): corrija num parecer de risco novo.',
  decisao: 'Opção escolhida (decisao.opcaoEscolhida): corrija num pacote novo.',
  // 0.4.1: texto da 03 do DEC-DEM-20261111-0018-v1, nível cto (o padrão de orientacaoDoPedido).
  aviso: 'Depois de corrigir, crie um pacote novo e aprove-o. Aprovado, ele substitui este e passa a ser o único que gera o Pedido de Construção.',
  geral: 'Corrija criando uma versão nova da ESP e um pacote novo.',
};

describe('orientacaoDoPedido (D1 do 0013)', () => {
  it('nome no título: a linha do nome, a do título e o aviso', () => {
    expect(orientacaoDoPedido(['demanda.titulo: nome'])).toEqual([ORIENTACOES.nome, ORIENTACOES.titulo, ORIENTACOES.aviso]);
  });

  it('e-mail na ESP: só a linha da ESP e o aviso', () => {
    expect(orientacaoDoPedido(['especificacao.conteudo: e-mail'])).toEqual([ORIENTACOES.esp, ORIENTACOES.aviso]);
  });

  it('erro do validarPedido em sistema_alvo: a linha da ESP e o aviso', () => {
    expect(orientacaoDoPedido(['sistema_alvo fora do formato: minúsculas, números e hífen, sem barra'])).toEqual([ORIENTACOES.esp, ORIENTACOES.aviso]);
  });

  it('todos os campos ao mesmo tempo: cada linha uma vez, na ordem', () => {
    const erros = [
      'demanda.descricao: telefone',
      'risco.conteudo: nome',
      'decisao.opcaoEscolhida: nome',
      'criterios_aceite_preliminares[1]: nome',
      'definicao_de_pronto[0]: CPF',
      'repositorio_destino: nome',
      'demanda.titulo: nome',
    ];
    expect(orientacaoDoPedido(erros)).toEqual([ORIENTACOES.nome, ORIENTACOES.titulo, ORIENTACOES.esp, ORIENTACOES.risco, ORIENTACOES.decisao, ORIENTACOES.aviso]);
  });

  it('lista vazia, ou erro de campo que não é do pedido: a frase de antes', () => {
    expect(orientacaoDoPedido([])).toEqual([ORIENTACOES.geral]);
    expect(orientacaoDoPedido(['pedido vazio'])).toEqual([ORIENTACOES.geral]);
  });

  it('nenhuma linha traz valor do pedido: são sempre as frases fixas', () => {
    const fixas = new Set(Object.values(ORIENTACOES));
    for (const erros of [['demanda.titulo: nome'], ['especificacao.conteudo: e-mail', 'risco.conteudo: telefone'], ['decisao.opcaoEscolhida: nome'], []])
      for (const linha of orientacaoDoPedido(erros)) expect(fixas.has(linha), linha).toBe(true);
  });
});

// D3 do 0013: a T11 só chama a Server Action com a caixa marcada, e manda a confirmação junto. Desmarcada, nada é
// chamado e a caixa mostra o erro.
describe('entradaDoPedido (D3 do 0013)', () => {
  it('caixa desmarcada: null (a tela não chama a ação)', () => {
    expect(entradaDoPedido('DEC-DEM-20261022-0042-v1', false)).toBeNull();
  });

  it('caixa marcada: o id e a confirmação', () => {
    expect(entradaDoPedido('DEC-DEM-20261022-0042-v1', true)).toEqual({ decId: 'DEC-DEM-20261022-0042-v1', confirmaSemDadoPessoal: true });
  });
});
