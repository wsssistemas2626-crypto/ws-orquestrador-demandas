// src/modules/pedido-construcao/textos-da-criacao.test.ts — T04 do DEC-DEM-20261111-0018-v1 (S-03, ADR-37; SB-08 c e f).
// textosDaCriacao e textosDoPedido saem da mesma função interna, e a tradução dos caminhos da criação dá o mesmo conjunto
// (igualdade, não subconjunto) de caminhos e valores do pedido do mesmo DEC aprovado com cada opção. A leitura da coluna
// falha fechada, com mensagem fixa e sem o valor; a regex da lista de permissão não guarda estado. Testes unitários, sem
// banco; vistas só fictícias, sem nome de pessoa nos textos, para o nome de cada caso ser o único que casa.
import { describe, expect, it } from 'vitest';
import type { EspecificacaoVista } from '../especificacoes/consultas';
import type { PacoteDecisaoVista } from '../pacotes-decisao/consultas';
import type { ParecerRiscoVista } from '../pareceres-risco/consultas';
import {
  caminhosComNomeNaCriacao,
  caminhosDaCriacaoNoPedido,
  lerCaminhosDaCriacao,
  MAXIMO_DE_CAMINHOS,
  MENSAGEM_CAMINHOS_INVALIDOS,
  RE_CAMINHO_DA_CRIACAO,
} from './caminhos-da-criacao';
import { CAMINHO_DA_OPCAO, textosDaCriacao, textosDoPedido, type TextoDoPedido } from './montar';

const autor = { tipo: 'pessoa' as const, nome: 'Autora da vista' };
const criadaEm = new Date('2026-11-14T12:00:00Z');

const DEC: PacoteDecisaoVista = {
  id: 'DEC-DEM-20261114-0001-v1',
  demandaId: 'DEM-20261114-0001',
  versao: 1,
  especificacaoId: 'ESP-DEM-20261114-0001-v1',
  parecerRiscoId: 'RSK-DEM-20261114-0001-v1',
  demandaTipo: 'melhoria',
  demandaTitulo: 'Pedidos duplicados na importação',
  demandaDescricao: 'Contexto: Importação diária do ERP\n\nProblema: Pedidos aparecem duas vezes',
  resumoExecutivo: 'Resumo da decisão',
  opcaoA: { descricao: 'Corrigir no importador', vantagens: 'Rápido' },
  opcaoB: { descricao: 'Refazer a integração' },
  recomendacao: 'Recomendo a A',
  nivelAprovacaoRequerido: 'cto',
  autor,
  rascunhoAgente: false,
  criadaEm,
  statusDecisao: 'pendente',
  aprovadores: [],
  desatualizado: false,
  substituido: false,
  substituidoPor: null,
  decisao: null,
  rascunhosCitados: [],
  especificacaoCitada: { sistemaAlvo: 'sistema-exemplo', repositorioDestino: 'dono/sistema-exemplo', criteriosAceitePreliminares: ['Um critério'], definicaoDePronto: ['pnpm test verde'] },
  niveisRisco: { tecnico: 'baixo', operacional: 'medio', juridico: 'alto' },
};

function espVista(over: Partial<EspecificacaoVista> = {}): EspecificacaoVista {
  return {
    id: 'ESP-DEM-20261114-0001-v1',
    demandaId: 'DEM-20261114-0001',
    versao: 1,
    descricaoObjetiva: 'Corrigir pedidos duplicados',
    situacaoAtual: 'Pedido entra duas vezes',
    situacaoDesejada: 'Pedido entra uma vez',
    escopoInclui: ['Importação de pedidos', 'Conferência do estoque'],
    escopoExclui: ['Faturamento'],
    sistemasErp: 'ERP do cliente',
    sistemasEcommerceMarketplace: null,
    sistemasApisTerceiros: 'API do marketplace',
    sistemasServicosInternos: null,
    dadosEntidades: 'Pedido e item',
    dadosCamposCriticos: 'Número do pedido',
    restricoesTecnicas: 'Sem parada da loja',
    duvidasEmAberto: ['Janela de manutenção'],
    sistemaAlvo: 'sistema-exemplo',
    repositorioDestino: 'dono/sistema-exemplo',
    criteriosAceitePreliminares: ['Pedido importado uma vez só', 'Estoque bate com o ERP'],
    definicaoDePronto: ['pnpm test verde', 'Revisão feita'],
    autor,
    rascunhoAgente: false,
    criadaEm,
    ...over,
  };
}

const RSK: ParecerRiscoVista = {
  id: 'RSK-DEM-20261114-0001-v1',
  demandaId: 'DEM-20261114-0001',
  versao: 1,
  resumo: 'Risco controlado',
  riscoTecnicoNivel: 'baixo',
  riscoTecnicoComentario: 'Mudança pequena',
  riscoOperacionalNivel: 'medio',
  riscoOperacionalComentario: null,
  riscoJuridicoNivel: 'alto',
  riscoJuridicoComentario: 'Contrato de serviço',
  recomendacoesMitigacao: ['Testar em homologação'],
  preCondicoes: ['Backup antes'],
  envolverJuridicoOuAdministradoraQuando: 'Se mudar o contrato',
  autor,
  rascunhoAgente: false,
  criadaEm,
};

const ESP_CHEIA = espVista();
const ESP_SEM_OPCIONAIS = espVista({ sistemaAlvo: null, repositorioDestino: null });
const ESP_LISTAS_VAZIAS = espVista({ criteriosAceitePreliminares: [], definicaoDePronto: [] });
const ESP_LISTAS_NULAS = espVista({ sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: null });
const ESP_COM_50_E_50 = espVista({
  criteriosAceitePreliminares: Array.from({ length: 50 }, (_, i) => `Critério ${i}`),
  definicaoDePronto: Array.from({ length: 50 }, (_, i) => `Item ${i}`),
});

const aprovadoCom = (dec: PacoteDecisaoVista, opcao: 'A' | 'B'): PacoteDecisaoVista => ({
  ...dec,
  statusDecisao: 'aprovada',
  decisao: { opcaoEscolhida: opcao, comentarios: null, decididaPor: null, decididaEm: new Date('2026-11-14T13:00:00Z') },
});

// Os textos da criação traduzidos por caminhosDaCriacaoNoPedido, com todos os caminhos marcados: a opção X vira
// decisao.opcaoEscolhida (com o mesmo valor), a outra sai, o resto fica, na ordem da criação.
function traduzidos(textos: readonly TextoDoPedido[], opcao: 'A' | 'B'): TextoDoPedido[] {
  const marcados = caminhosDaCriacaoNoPedido(textos.map((t) => t.caminho), opcao);
  return textos.flatMap((t) =>
    t.caminho === CAMINHO_DA_OPCAO[opcao] ? [{ caminho: 'decisao.opcaoEscolhida', valores: t.valores }] : marcados.has(t.caminho) ? [t] : [],
  );
}

describe('SB-08 (c): igualdade entre textosDaCriacao traduzido e textosDoPedido', () => {
  it.each([
    ['com sistema_alvo e repositório, listas cheias', ESP_CHEIA],
    ['sem sistema_alvo nem repositório', ESP_SEM_OPCIONAIS],
    ['listas vazias', ESP_LISTAS_VAZIAS],
    ['listas nulas', ESP_LISTAS_NULAS],
    ['50 critérios e 50 itens de pronto', ESP_COM_50_E_50],
  ])('%s: para A e para B, os mesmos caminhos, na mesma ordem, com os mesmos valores', (_nome, esp) => {
    for (const opcao of ['A', 'B'] as const) {
      const criacao = textosDaCriacao({ dec: DEC, esp, rsk: RSK });
      expect(traduzidos(criacao, opcao), opcao).toEqual(textosDoPedido({ dec: aprovadoCom(DEC, opcao), esp, rsk: RSK }));
      // O conjunto de caminhos traduzidos (sem a ajuda dos valores) é igual ao do pedido.
      const caminhosTraduzidos = [...caminhosDaCriacaoNoPedido(criacao.map((t) => t.caminho), opcao)].sort();
      const caminhosDoPedido = textosDoPedido({ dec: aprovadoCom(DEC, opcao), esp, rsk: RSK }).map((t) => t.caminho).sort();
      expect(caminhosTraduzidos, opcao).toEqual(caminhosDoPedido);
    }
  });

  it('na criação, as duas opções ficam no lugar da escolhida, na ordem do pedido', () => {
    expect(textosDaCriacao({ dec: DEC, esp: ESP_CHEIA, rsk: RSK }).map((t) => t.caminho)).toEqual([
      'demanda.titulo',
      'demanda.descricao',
      'especificacao.conteudo',
      'risco.conteudo',
      'opcaoA.descricao',
      'opcaoB.descricao',
      'sistema_alvo',
      'repositorio_destino',
      'criterios_aceite_preliminares[0]',
      'criterios_aceite_preliminares[1]',
      'definicao_de_pronto[0]',
      'definicao_de_pronto[1]',
    ]);
    expect(CAMINHO_DA_OPCAO).toEqual({ A: 'opcaoA.descricao', B: 'opcaoB.descricao' });
    expect(Object.isFrozen(CAMINHO_DA_OPCAO)).toBe(true);
  });

  it('a descrição entra sem os rótulos, como no pedido; um DEC pendente não lança', () => {
    const t = textosDaCriacao({ dec: DEC, esp: ESP_CHEIA, rsk: RSK });
    expect(t.find((x) => x.caminho === 'demanda.descricao')?.valores).toEqual(['Importação diária do ERP\n\nPedidos aparecem duas vezes']);
    expect(t.find((x) => x.caminho === 'opcaoB.descricao')?.valores).toEqual(['Refazer a integração']);
  });

  it('todo caminho de textosDaCriacao casa RE_CAMINHO_DA_CRIACAO; o total cabe em MAXIMO_DE_CAMINHOS', () => {
    const t = textosDaCriacao({ dec: DEC, esp: ESP_COM_50_E_50, rsk: RSK });
    for (const { caminho } of t) expect(RE_CAMINHO_DA_CRIACAO.test(caminho), caminho).toBe(true);
    expect(t.length).toBeLessThanOrEqual(MAXIMO_DE_CAMINHOS);
    expect(t.length).toBe(MAXIMO_DE_CAMINHOS);
    expect(MAXIMO_DE_CAMINHOS).toBe(108);
  });
});

describe('caminhosDaCriacaoNoPedido: só a opção escolhida vira decisao.opcaoEscolhida', () => {
  it('a opção não escolhida some; os outros caminhos ficam', () => {
    expect([...caminhosDaCriacaoNoPedido(['demanda.titulo', 'opcaoA.descricao', 'opcaoB.descricao', 'risco.conteudo'], 'B')].sort()).toEqual([
      'decisao.opcaoEscolhida',
      'demanda.titulo',
      'risco.conteudo',
    ]);
    expect([...caminhosDaCriacaoNoPedido(['opcaoA.descricao'], 'B')]).toEqual([]);
    expect([...caminhosDaCriacaoNoPedido(['opcaoA.descricao'], 'A')]).toEqual(['decisao.opcaoEscolhida']);
    expect([...caminhosDaCriacaoNoPedido([], 'A')]).toEqual([]);
  });
});

describe('caminhosComNomeNaCriacao', () => {
  it('os caminhos dos textos que contêm o nome, sem o valor; sem nome: lista vazia', () => {
    const t = textosDaCriacao({ dec: { ...DEC, opcaoB: { descricao: 'Falar com a Joaquina' } }, esp: ESP_CHEIA, rsk: RSK });
    expect(caminhosComNomeNaCriacao(t, ['Joaquina'])).toEqual(['opcaoB.descricao']);
    expect(caminhosComNomeNaCriacao(t, [])).toEqual([]);
    expect(JSON.stringify(caminhosComNomeNaCriacao(t, ['Joaquina']))).not.toContain('Falar');
    expect(JSON.stringify(caminhosComNomeNaCriacao(t, ['Joaquina']))).not.toContain('Joaquina');
  });

  it('uma parte do nome marca o caminho, na ordem dos textos; item de lista pelo índice', () => {
    const esp = espVista({ situacaoAtual: 'Conversar com Lima sobre o estoque', definicaoDePronto: ['pnpm test verde', 'Aceite da Joaquina'] });
    const t = textosDaCriacao({ dec: DEC, esp, rsk: RSK });
    expect(caminhosComNomeNaCriacao(t, ['Joaquina Teste Lima'])).toEqual(['especificacao.conteudo', 'definicao_de_pronto[1]']);
    for (const c of caminhosComNomeNaCriacao(t, ['Joaquina Teste Lima'])) expect(RE_CAMINHO_DA_CRIACAO.test(c), c).toBe(true);
  });
});

describe('SB-08 (e, f): lerCaminhosDaCriacao falha fechado; a regex não tem estado', () => {
  it('null fica null; lista válida passa, inclusive a vazia', () => {
    expect(lerCaminhosDaCriacao(null)).toBeNull();
    expect(lerCaminhosDaCriacao([])).toEqual([]);
    expect(lerCaminhosDaCriacao(['demanda.titulo', 'definicao_de_pronto[3]'])).toEqual(['demanda.titulo', 'definicao_de_pronto[3]']);
  });

  it('fora do formato lança o erro fixo, sem o valor e sem as issues do Zod', () => {
    const ruins: unknown[] = [
      ['__proto__'],
      ['demanda.titulo '],
      ['x'],
      ['criterios_aceite_preliminares[12345]'],
      ['decisao.opcaoEscolhida'],
      'demanda.titulo',
      [1],
      undefined,
      Array(MAXIMO_DE_CAMINHOS + 1).fill('demanda.titulo'),
    ];
    for (const ruim of ruins) {
      const e = (() => {
        try {
          lerCaminhosDaCriacao(ruim);
          return null;
        } catch (x) {
          return x as Error;
        }
      })();
      expect(e?.message, String(JSON.stringify(ruim)).slice(0, 40)).toBe(MENSAGEM_CAMINHOS_INVALIDOS);
      expect(e).not.toHaveProperty('issues');
    }
    expect(MENSAGEM_CAMINHOS_INVALIDOS).toBe('caminhos da criação do DEC fora do formato');
  });

  it('sem flag g nem y; com âncoras; duas chamadas seguidas dão o mesmo resultado', () => {
    expect(RE_CAMINHO_DA_CRIACAO.flags).toBe('');
    expect(RE_CAMINHO_DA_CRIACAO.source.startsWith('^')).toBe(true);
    expect(RE_CAMINHO_DA_CRIACAO.source.endsWith('$')).toBe(true);
    for (const v of ['demanda.titulo', 'x', 'opcaoB.descricao']) expect(RE_CAMINHO_DA_CRIACAO.test(v)).toBe(RE_CAMINHO_DA_CRIACAO.test(v));
    expect(RE_CAMINHO_DA_CRIACAO.test('xdemanda.titulo')).toBe(false);
    expect(RE_CAMINHO_DA_CRIACAO.test('demanda.tituloX')).toBe(false);
  });
});
