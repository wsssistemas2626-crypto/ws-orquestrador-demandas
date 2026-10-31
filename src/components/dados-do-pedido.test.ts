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
import { erroDoPedido, hrefDoPedido, MENSAGENS_PEDIDO_DO_SERVIDOR, secaoDoPedido, TEXTOS_PEDIDO } from './dados-do-pedido';

type Falha = Extract<ResultadoAcao<unknown>, { ok: false }>;

const APROVADO = new Date('2026-10-22T18:00:00Z');
const decidida = (opcaoEscolhida: 'A' | null) => ({ opcaoEscolhida, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO });
const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };

type Base = Pick<PacoteDecisaoVista, 'statusDecisao' | 'decisao' | 'demandaTipo' | 'aprovadores' | 'desatualizado'>;
const p = (extra: Partial<Base> = {}): Base => ({ statusDecisao: 'pendente', decisao: null, demandaTipo: 'novo_projeto', aprovadores: [], desatualizado: false, ...extra });

describe('textos (03, T11 "Pedido de Construção"; 04, C-28)', () => {
  it('os da 03, por inteiro, e o aviso de C-28 do plano', () => {
    expect(TEXTOS_PEDIDO).toMatchObject({
      titulo: 'Pedido de Construção',
      texto: 'Gere o pedido, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma. O envio ao /construir é manual nesta versão.',
      avisoDadoPessoal: 'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail ou telefone de cliente na ESP nem no parecer de risco.',
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
    expect(MENSAGENS_PEDIDO_DO_SERVIDOR).toEqual({ estudo: MENSAGENS_PEDIDO.estudo, naoPassou: MENSAGENS_PEDIDO.naoPassou });
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

  it('422 da validação (C-28 e validarPedido): o texto da 03 com "Erros:", a lista da API e a orientação', () => {
    const r = falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: e-mail', 'demanda.titulo: telefone'] });
    expect(erroDoPedido(r)).toEqual({
      texto: 'O pedido não passou na validação do /construir. Nada foi entregue. Erros:',
      erros: ['especificacao.conteudo: e-mail', 'demanda.titulo: telefone'],
      orientacao: 'Corrija criando uma versão nova da ESP e um pacote novo.',
    });
  });

  it('422 de Estudo: o texto da 03, sem lista nem orientação', () => {
    expect(erroDoPedido(falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.estudo }))).toEqual({
      texto: 'Demanda do tipo Estudo não gera Pedido de Construção.',
      erros: [],
      orientacao: null,
    });
  });

  it('409, 403, 404 e erro interno: os textos da 2.8, nunca a mensagem crua do erro interno', () => {
    expect(erroDoPedido(falha({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado }))).toEqual({
      texto: `Não foi possível concluir: ${MENSAGENS_PEDIDO.naoAprovado}`,
      erros: [],
      orientacao: null,
    });
    expect(erroDoPedido(falha({ erro: 'sem_permissao', mensagem: 'x' })).texto).toBe(MENSAGENS_ACESSO.sem_permissao);
    expect(erroDoPedido(falha({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO })).texto).toBe(MENSAGEM_NAO_ENCONTRADO);
    expect(erroDoPedido(falha({ erro: 'erro_interno', mensagem: 'SENTINELA-DETALHE-INTERNO' })).texto).toBe(MENSAGEM_ERRO_INTERNO);
  });

  it('422 de outra origem e erro de campo (id fora do formato): sem lista vazia nem o "Corrija os campos"', () => {
    expect(erroDoPedido(falha({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou }))).toEqual({
      texto: 'O pedido não passou na validação do /construir. Nada foi entregue.',
      erros: [],
      orientacao: 'Corrija criando uma versão nova da ESP e um pacote novo.',
    });
    expect(erroDoPedido(falha({ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos: [{ campo: 'decId', mensagem: 'Valor inválido.' }] }))).toEqual({
      texto: MENSAGEM_ERRO_INTERNO,
      erros: [],
      orientacao: null,
    });
  });
});
