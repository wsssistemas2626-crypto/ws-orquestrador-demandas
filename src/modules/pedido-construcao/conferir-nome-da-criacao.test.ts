// src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts — T05 do DEC-DEM-20261111-0018-v1 (S-03, RF-02; CA-02.1
// a CA-02.4; SB-08 a, b, d, e). O D1 da geração e da entrega (conferirEMontarPedido) recusa o texto com o nome atual do
// solicitante **ou** com o nome em vigor na criação do DEC, lido da coluna `caminhos_com_nome_na_criacao` (gravada pela
// T04) e traduzido para os caminhos do pedido: a opção escolhida vira decisao.opcaoEscolhida e a outra não recusa. Coluna
// nula (DEC anterior à 0.4.1) confere só o nome atual; coluna fora do formato é erro interno (500), sem gerar, sem
// entregar e sem o valor no Sentry. O JSON do pedido não muda. Os cinco caminhos que criam DEC (06-T04-testes) passam pela
// mesma regra.
// Postgres real (Testcontainers), papel do app, rotas, Server Action e tokens reais; a coluna é trocada pelo migrator.
// Relógio fixo, uma autora por demanda (C-36), dados só fictícios; o token só nasce em tempo de teste.
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));

import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { CONFIRMADO, chamadasDoConstruir, inserirEventoDoPedido } from '../../../test/pedidos-construcao';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { chamarRota } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { PROMPTS } from '../../agents';
import { gravarPacoteNoPainel } from '../../app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes';
import { POST as POST_DEC } from '../../app/api/demandas/[id]/pacotes-decisao/route';
import { POST as POST_PEDIDO } from '../../app/api/pacotes-decisao/[decId]/pedido-construcao/route';
import { user } from '../../db/schema';
import type { OpcaoDecisao } from '../../db/schema/decisao';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_ERRO_INTERNO, mapearErro } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { iniciarSentry } from '../../lib/sentry';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { AtorAgente, AtorIntegracao, AtorPessoa } from '../acesso/ator';
import { criarTokenDeIntegracao, criarTokenServico } from '../acesso/tokens-servico';
import { criarExecucao } from '../agentes/execucoes';
import { executarAgente } from '../agentes/executar';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { obterEspecificacao } from '../especificacoes/consultas';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { obterPacoteDecisao } from '../pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { MAXIMO_DE_CAMINHOS, MENSAGEM_CAMINHOS_INVALIDOS } from './caminhos-da-criacao';
import { entregarPedido } from './entregar';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';
import { montarPedido } from './montar';
import { serializarPedido } from './serializar';

const NOME = 'Joana Ficticia Lima';
const OUTRO_NOME = 'Outra Pessoa';
const MODELO = 'modelo-ficticio-t05';
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };
const construirAtor: AtorIntegracao = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'ficticio' };
const geradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-t05-geradora', nome: 'Pessoa Ficticia Geradora', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-t05-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

const DEMANDA = { titulo: 'Pedidos duplicados (fictício)', tipo: 'bug', solicitanteNome: NOME, contexto: 'Importação diária do ERP', descricaoProblema: 'Pedidos aparecem duas vezes' };
const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
// Só a parte "Lima" do solicitante, num campo do texto da ESP.
const ESP_COM_NOME = { ...ESP, situacaoAtual: 'Conversar com Lima sobre o estoque' };
const RSK = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const DEC = { resumoExecutivo: 'Corrigir a importação de pedidos', opcaoA: { descricao: 'Corrigir no importador' }, opcaoB: { descricao: 'Refazer a integração' }, nivelAprovacaoRequerido: 'cto' };

// Valores fora do formato, gravados pelo migrator (SB-08 e): nenhum pode virar null nem lista vazia.
const COLUNAS_RUINS: ReadonlyArray<readonly [string, string[]]> = [
  ['__proto__', ['__proto__']],
  ['caminho com espaço no fim', ['demanda.titulo ']],
  ['caminho fora da lista', ['x']],
  ['índice com 5 dígitos', ['criterios_aceite_preliminares[12345]']],
  ['um item além do máximo', Array<string>(MAXIMO_DE_CAMINHOS + 1).fill('demanda.titulo')],
];

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let tokenConsolidacao: string;
let tokenConstruir: string;
let autoras = 0;
const envelopesDoSentry: string[] = [];
const transporteFalso = () => ({
  send: async (envelope: unknown) => {
    envelopesDoSentry.push(JSON.stringify(envelope));
    return {};
  },
  flush: async () => true,
});
const construir = chamadasDoConstruir(() => tokenConstruir);
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-t05-autora-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte: transporteFalso });
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: geradora.usuarioId, name: geradora.nome, email: 't05-geradora@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 't05-adm@exemplo.test', papel: 'administradora' },
  ]);
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-14T18:00:00Z') });
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
  tokenConstruir = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  pedido.cabecalhos = new Headers({ cookie });
});

type Cenario = { demanda?: Record<string, unknown>; esp?: Record<string, unknown>; rsk?: Record<string, unknown>; dec?: Record<string, unknown>; opcao?: OpcaoDecisao };

// O DEC do agente pode pedir a dupla aprovação: a administradora aprova também, com o documento fictício.
async function aprovar(decId: string, opcao: OpcaoDecisao): Promise<void> {
  await registrarDecisao(deps, geradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, revisouRascunhosDeAgente: true }));
  if ((await obterPacoteDecisao(b.db, decId)).nivelAprovacaoRequerido !== 'cto_e_administradora') return;
  await registrarDecisao(
    deps,
    administradora,
    decId,
    registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, revisouRascunhosDeAgente: true, referenciaDocumento: 'DOC-FICTICIO-T05', dataDocumento: '2026-11-14' }),
  );
}

// Demanda, ESP v1, RSK v1 e DEC v1 de uma autora própria (C-36), o DEC aprovado com a opção do cenário (A por padrão).
async function decAprovado(c: Cenario = {}): Promise<{ demandaId: string; decId: string; autora: AtorPessoa }> {
  const autora = novaAutora();
  const demandaId = (await criarDemanda(deps, autora, criarDemandaSchema.parse({ ...DEMANDA, ...c.demanda }))).id;
  await criarEspecificacao(deps, autora, demandaId, criarEspecificacaoSchema.parse(c.esp ?? ESP));
  await criarParecerRisco(deps, autora, demandaId, criarParecerRiscoSchema.parse(c.rsk ?? RSK));
  const decId = (await criarPacoteDecisao(deps, autora, demandaId, criarPacoteDecisaoSchema.parse({ ...DEC, ...c.dec }))).id;
  await aprovar(decId, c.opcao ?? 'A');
  return { demandaId, decId, autora };
}

const trocarNome = (autora: AtorPessoa, demandaId: string, nome = OUTRO_NOME) =>
  alterarDemanda(deps, autora, demandaId, alterarDemandaSchema.parse({ solicitanteNome: nome }));

const colunaDo = async (decId: string): Promise<unknown> =>
  (await b.poolMigrator.query<{ c: unknown }>('select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1', [decId])).rows[0]?.c;

const trocarColuna = (decId: string, valor: string[] | null) =>
  b.poolMigrator.query('update pacote_decisao set caminhos_com_nome_na_criacao = $1 where id = $2', [valor, decId]);

const eventos = async (decId: string, acao: 'pedido_gerado' | 'pedido_entregue'): Promise<number> =>
  (await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from evento where entidade_id = $1 and acao = $2', [decId, acao])).rows[0]!.n;

const pedidoGeradoPeloMigrator = (demandaId: string, decId: string) =>
  inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId, demandaId, atorTipo: 'pessoa', atorId: geradora.usuarioId, prefixo: null, depois: CONFIRMADO });

async function falhaDe(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => {
      throw new Error('era para recusar');
    },
    (x: unknown) => x,
  );
}

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await falhaDe(p);
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

// O 422 do D1, com a lista dada, sem o nome (antigo nem atual) e sem pedido_gerado.
async function recusaNaGeracao(decId: string, erros: string[]): Promise<void> {
  const e = await erroDe(gerarPedido(deps, geradora, decId, CONFIRMADO));
  expect(e.codigo, e.mensagem).toBe('nao_processavel');
  expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
  expect(e.extras).toEqual({ erros });
  expect(JSON.stringify(e.extras)).not.toMatch(/joana|ficticia|lima|outra|pessoa|quintela|souza/i);
  expect(await eventos(decId, 'pedido_gerado')).toBe(0);
}

async function gera(decId: string): Promise<string> {
  const { json } = await gerarPedido(deps, geradora, decId, CONFIRMADO);
  expect(validarPedido(JSON.parse(json))).toEqual({ ok: true, erros: [] });
  return json;
}

describe('CA-02.1 a CA-02.3: o nome da criação continua recusando depois da troca do solicitante', () => {
  it('CA-02.1: DEC criado com o nome e a ESP com "Lima" → 422 com especificacao.conteudo: nome, sem pedido_gerado', async () => {
    const { decId } = await decAprovado({ esp: ESP_COM_NOME });
    expect(await colunaDo(decId)).toEqual(['especificacao.conteudo']);
    await recusaNaGeracao(decId, ['especificacao.conteudo: nome']);
  });

  it('CA-02.2: o solicitante trocado para "Outra Pessoa" → o mesmo 422, com o mesmo caminho, sem pedido_gerado', async () => {
    const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_NOME });
    await trocarNome(autora, demandaId);
    await recusaNaGeracao(decId, ['especificacao.conteudo: nome']);
    // Duas vezes seguidas: a recusa não depende de estado guardado entre chamadas.
    await recusaNaGeracao(decId, ['especificacao.conteudo: nome']);
  });

  it('CA-02.3: com um pedido_gerado de pessoa anterior, a entrega ao /construir é recusada pela mesma regra, sem pedido_entregue', async () => {
    const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_NOME });
    await trocarNome(autora, demandaId);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    const e = await erroDe(entregarPedido(deps, construirAtor, decId));
    expect(e.codigo).toBe('nao_processavel');
    expect(e.extras).toEqual({ erros: ['especificacao.conteudo: nome'] });
    const r = await construir.entregar(decId);
    expect(r.status).toBe(422);
    const corpo = await r.text();
    expect(JSON.parse(corpo)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: nome'] });
    expect(corpo).not.toMatch(/joana|ficticia|lima|outra|pessoa/i);
    expect(await eventos(decId, 'pedido_entregue')).toBe(0);
  });

  it('pela rota de pessoa: o 422 da geração depois da troca é o mesmo do serviço, sem o nome', async () => {
    const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_NOME });
    await trocarNome(autora, demandaId);
    const r = await chamarRota(POST_PEDIDO, { metodo: 'POST', caminho: `/api/pacotes-decisao/${decId}/pedido-construcao`, params: { decId }, cookie, corpo: CONFIRMADO });
    expect(r.status).toBe(422);
    const corpo = await r.text();
    expect(JSON.parse(corpo)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: nome'] });
    expect(corpo).not.toMatch(/joana|ficticia|lima|outra|pessoa/i);
    expect(await eventos(decId, 'pedido_gerado')).toBe(0);
  });
});

describe('SB-08 (d): a opção não escolhida não recusa; a escolhida vira decisao.opcaoEscolhida', () => {
  it('o nome antigo só na opção B, com a A aprovada, e o nome trocado → o pedido sai', async () => {
    const { demandaId, decId, autora } = await decAprovado({ dec: { opcaoB: { descricao: 'Falar com a Lima' } }, opcao: 'A' });
    expect(await colunaDo(decId)).toEqual(['opcaoB.descricao']);
    await trocarNome(autora, demandaId);
    await gera(decId);
    expect(await eventos(decId, 'pedido_gerado')).toBe(1);
  });

  it('o nome antigo só na opção A, com a B aprovada, e o nome trocado → o pedido sai', async () => {
    const { demandaId, decId, autora } = await decAprovado({ dec: { opcaoA: { descricao: 'Falar com a Lima' } }, opcao: 'B' });
    expect(await colunaDo(decId)).toEqual(['opcaoA.descricao']);
    await trocarNome(autora, demandaId);
    await gera(decId);
  });

  it.each(['A', 'B'] as const)('o nome antigo na opção %s, aprovada, e o nome trocado → 422 com decisao.opcaoEscolhida: nome', async (opcao) => {
    const dec = opcao === 'A' ? { opcaoA: { descricao: 'Falar com a Lima' } } : { opcaoB: { descricao: 'Falar com a Lima' } };
    const { demandaId, decId, autora } = await decAprovado({ dec, opcao });
    await trocarNome(autora, demandaId);
    await recusaNaGeracao(decId, ['decisao.opcaoEscolhida: nome']);
  });
});

describe('coluna nula (DEC anterior à 0.4.1, opção a da 7.2, item 1): só o nome atual', () => {
  it('nome antigo na ESP e o solicitante trocado → o pedido sai', async () => {
    const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_NOME });
    await trocarColuna(decId, null);
    await trocarNome(autora, demandaId);
    await gera(decId);
  });

  it('nome atual na ESP → 422 como na 0.4.0', async () => {
    const { decId } = await decAprovado({ esp: ESP_COM_NOME });
    await trocarColuna(decId, null);
    await recusaNaGeracao(decId, ['especificacao.conteudo: nome']);
  });
});

describe('SB-08 (e): coluna fora do formato falha fechada (500), sem gerar nem entregar, sem o valor no Sentry', () => {
  it.each(COLUNAS_RUINS)('%s: gerarPedido e entregarPedido lançam o erro fixo, que não é ErroDominio e vira 500 erro_interno', async (_rotulo, valor) => {
    const { demandaId, decId } = await decAprovado();
    await trocarColuna(decId, valor);
    expect(await colunaDo(decId)).toEqual(valor);

    const naGeracao = await falhaDe(gerarPedido(deps, geradora, decId, CONFIRMADO));
    expect(naGeracao).not.toBeInstanceOf(ErroDominio);
    expect((naGeracao as Error).message).toBe(MENSAGEM_CAMINHOS_INVALIDOS);
    expect(naGeracao).not.toHaveProperty('issues');
    expect(mapearErro(naGeracao)).toEqual({ status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO } });
    expect(await eventos(decId, 'pedido_gerado')).toBe(0);

    await pedidoGeradoPeloMigrator(demandaId, decId);
    const naEntrega = await falhaDe(entregarPedido(deps, construirAtor, decId));
    expect(naEntrega).not.toBeInstanceOf(ErroDominio);
    expect((naEntrega as Error).message).toBe(MENSAGEM_CAMINHOS_INVALIDOS);
    expect(mapearErro(naEntrega).status).toBe(500);
    expect(await eventos(decId, 'pedido_entregue')).toBe(0);
    expect(await eventos(decId, 'pedido_gerado')).toBe(1);
  });

  it('pelas rotas de geração (pessoa) e de entrega (construir): 500 erro_interno, nada gravado, e o Sentry sem o valor nem a mensagem', async () => {
    const decs: string[] = [];
    for (const [, valor] of COLUNAS_RUINS) {
      const { demandaId, decId } = await decAprovado();
      await trocarColuna(decId, valor);
      await pedidoGeradoPeloMigrator(demandaId, decId);
      decs.push(decId);
    }
    const inicioDoSentry = envelopesDoSentry.length;
    const corpos: string[] = [];
    for (const decId of decs) {
      const rg = await chamarRota(POST_PEDIDO, { metodo: 'POST', caminho: `/api/pacotes-decisao/${decId}/pedido-construcao`, params: { decId }, cookie, corpo: CONFIRMADO });
      const re = await construir.entregar(decId);
      expect([rg.status, re.status], decId).toEqual([500, 500]);
      for (const r of [rg, re]) {
        const corpo = await r.text();
        expect(JSON.parse(corpo)).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
        corpos.push(corpo);
      }
      expect(await eventos(decId, 'pedido_gerado')).toBe(1);
      expect(await eventos(decId, 'pedido_entregue')).toBe(0);
    }
    await Sentry.flush(2_000);
    const sentry = envelopesDoSentry.slice(inicioDoSentry).join('\n');
    // O teste só prova algo se o Sentry recebeu os 500.
    expect(envelopesDoSentry.length - inicioDoSentry).toBeGreaterThanOrEqual(1);
    for (const pedaco of ['__proto__', 'demanda.titulo ', '12345', 'criterios_aceite_preliminares', MENSAGEM_CAMINHOS_INVALIDOS, 'fora do formato']) {
      expect(sentry.includes(pedaco), `Sentry com "${pedaco}"`).toBe(false);
      expect(corpos.join('\n').includes(pedaco), `resposta com "${pedaco}"`).toBe(false);
    }
  });
});

describe('SB-08 (b) e CA-02.4: o JSON do pedido não muda', () => {
  it('DEC sem nome em texto algum: o JSON é o de montarPedido + serializarPedido sobre a vista, sem "caminhos", e igual depois da troca do nome', async () => {
    const { demandaId, decId, autora } = await decAprovado();
    expect(await colunaDo(decId)).toEqual([]);
    const json = await gera(decId);
    const dec = await obterPacoteDecisao(b.db, decId);
    const esp = await obterEspecificacao(b.db, dec.especificacaoId);
    const rsk = await obterParecerRisco(b.db, dec.parecerRiscoId);
    expect(json).toBe(serializarPedido(montarPedido({ dec, esp, rsk })));
    expect(json).not.toMatch(/caminhos/i);
    await trocarNome(autora, demandaId);
    expect(await gera(decId)).toBe(json);
  });
});

describe('ordem dos erros: o C-28 primeiro, depois os caminhos com nome na ordem de textosDoPedido, sem repetir', () => {
  it('e-mail na ESP, o nome antigo no título e no contexto, o atual no título e no RSK → cada caminho uma vez', async () => {
    const { demandaId, decId, autora } = await decAprovado({
      demanda: { titulo: 'Pedido da Lima e da Quintela (fictício)', contexto: 'Combinado com a Joana' },
      esp: { ...ESP, situacaoAtual: 'Falar com contato@exemplo.test' },
      rsk: { ...RSK, resumo: 'Quintela acompanha a virada' },
    });
    expect(await colunaDo(decId)).toEqual(['demanda.titulo', 'demanda.descricao']);
    await trocarNome(autora, demandaId, 'Rosa Quintela Souza');
    await recusaNaGeracao(decId, ['especificacao.conteudo: e-mail', 'demanda.titulo: nome', 'demanda.descricao: nome', 'risco.conteudo: nome']);
  });
});

// 06-T04-testes: cinco caminhos criam DEC. Todos gravam a coluna, e o D1 a lê do mesmo jeito: com o nome espalhado pelos
// sete textos que vão ao pedido (e por três que não vão), depois da troca do solicitante, o 422 lista os sete caminhos.
describe('os cinco caminhos de criação: o D1 recusa pelo nome da criação depois da troca', () => {
  const DEMANDA_ESPALHADA = { titulo: 'Pedido da Lima (fictício)', contexto: 'Combinado com a Joana' };
  const ESP_ESPALHADA = { ...ESP_COM_NOME, criteriosAceitePreliminares: ['Pedido importado uma vez só', 'Aceite da Joana'], definicaoDePronto: ['Revisado pela Ficticia', 'pnpm test verde'] };
  const RSK_ESPALHADO = { ...RSK, riscoTecnicoComentario: 'Lima acompanha a virada' };
  const SAIDA_DO_MODELO = {
    ...(PROMPTS.consolidacao.exemploSaida as object),
    resumoExecutivo: 'Resumo com a Lima',
    opcaoA: { descricao: 'Falar com a Joana antes' },
    opcaoB: { descricao: 'Refazer a integração', vantagens: 'Lima gosta' },
    recomendacao: 'Joana prefere A',
  };
  const CORPO_DEC = { ...SAIDA_DO_MODELO, nivelAprovacaoRequerido: 'cto' };
  const CAMINHOS = ['rota de pessoa', 'rota do agente consolidacao', 'Server Action do painel', 'worker com extras', 'worker de verdade (executarAgente)'] as const;
  type Caminho = (typeof CAMINHOS)[number];

  const postDec = (demandaId: string, credencial: { cookie: string } | { bearer: string }) =>
    chamarRota(POST_DEC, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pacotes-decisao`, params: { id: demandaId }, corpo: CORPO_DEC, ...credencial });

  async function criarPor(caminho: Caminho, demandaId: string): Promise<string> {
    switch (caminho) {
      case 'rota de pessoa':
      case 'rota do agente consolidacao': {
        const r = await postDec(demandaId, caminho === 'rota de pessoa' ? { cookie } : { bearer: tokenConsolidacao });
        expect(r.status, caminho).toBe(201);
        return ((await r.json()) as { id: string }).id;
      }
      case 'Server Action do painel': {
        const r = await gravarPacoteNoPainel({ ...CORPO_DEC, demandaId });
        if (!r.ok) throw new Error(`a Server Action recusou: ${r.erro}`);
        return r.dados.id;
      }
      case 'worker com extras':
        return (
          await comTransacao(b.poolApp, (t) =>
            criarPacoteDecisao(deps, consolidacao, demandaId, criarPacoteDecisaoSchema.parse(CORPO_DEC), t, {
              execucaoAgenteId: '00000000-0000-4000-8000-000000000505',
              especificacaoId: idVersao('ESP', demandaId, 1),
              parecerRiscoId: idVersao('RSK', demandaId, 1),
            }),
          )
        ).id;
      case 'worker de verdade (executarAgente)': {
        await b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1 where agente = 'consolidacao'`, [MODELO]);
        try {
          const execId = await comTransacao(b.poolApp, (t) => criarExecucao(t, deps, { agente: 'consolidacao', chaveEntrada: `rsk:${idVersao('RSK', demandaId, 1)}`, demandaId }));
          if (!execId) throw new Error('a execução da consolidação já existia');
          const provedor = new ProvedorFalso();
          provedor.respostas.push({ texto: JSON.stringify(SAIDA_DO_MODELO), modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 });
          expect(await executarAgente({ ...deps, provedor }, execId)).toBe('concluida');
          const { rows } = await b.poolMigrator.query<{ a: string }>('select artefato_id as a from execucao_agente where id = $1', [execId]);
          return rows[0]!.a;
        } finally {
          await b.poolMigrator.query(`update configuracao_agente set ligado = false, modelo = null where agente = 'consolidacao'`);
        }
      }
    }
  }

  it.each(CAMINHOS)('%s: aprovado com A, o solicitante trocado → 422 com os sete caminhos, sem pedido_gerado; a entrega também recusa', async (caminho) => {
    const autora = novaAutora();
    const demandaId = (await criarDemanda(deps, autora, criarDemandaSchema.parse({ ...DEMANDA, ...DEMANDA_ESPALHADA }))).id;
    await criarEspecificacao(deps, autora, demandaId, criarEspecificacaoSchema.parse(ESP_ESPALHADA));
    await criarParecerRisco(deps, autora, demandaId, criarParecerRiscoSchema.parse(RSK_ESPALHADO));
    const decId = await criarPor(caminho, demandaId);
    await aprovar(decId, 'A');
    await trocarNome(autora, demandaId);
    const esperados = [
      'demanda.titulo: nome',
      'demanda.descricao: nome',
      'especificacao.conteudo: nome',
      'risco.conteudo: nome',
      'decisao.opcaoEscolhida: nome',
      'criterios_aceite_preliminares[1]: nome',
      'definicao_de_pronto[0]: nome',
    ];
    await recusaNaGeracao(decId, esperados);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    expect((await erroDe(entregarPedido(deps, construirAtor, decId))).extras).toEqual({ erros: esperados });
    expect(await eventos(decId, 'pedido_entregue')).toBe(0);
  });
});
