// src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts — 06-T05-testes do DEC-DEM-20261111-0018-v1
// (qa-automacao; S-03, RF-02; CA-02.2, CA-02.3, CA-02.5; SB-08 a, b, d, e; SB-09 d; RNF-09). Adversarial sobre o D1 com o
// nome da criação, nos cinco caminhos que geram ou entregam o pedido (gerarPedido, a rota da pessoa, a Server Action do
// painel, entregarPedido e a rota de entrega do /construir), além do que conferir-nome-da-criacao.test.ts já cobre:
//   1. o D1 nunca fica mais fraco que na 0.4.0: com a coluna em qualquer valor válido (nula, vazia, só a opção não
//      escolhida, índices que o DEC não tem, outros caminhos), o nome atual continua recusando, nos cinco caminhos, e a
//      marcação só soma caminhos (o OU não vira E, e a coluna não substitui a conferência do nome atual);
//   2. o DEC recusado continua recusado em toda troca do solicitanteNome: várias trocas seguidas, nome curto que não
//      confere nada, só uma parte do nome antigo, o nome antigo em maiúsculas e a volta ao nome da criação;
//   3. a troca do nome ao mesmo tempo que a geração e a entrega: as duas recusam pelo mesmo caminho, em qualquer ordem;
//   4. o nome em vigor é o da criação do DEC, e não o da criação da demanda;
//   5. a Server Action do painel também falha fechada (500) com a coluna fora do formato, sem o valor;
//   6. sentinelas com controle do Sentry (parecer 1 da 06-T05-revisao): as recusas do D1 e um 500 controlado sobre a
//      mesma demanda, e nem o nome antigo nem o atual aparecem nas respostas, no pino, no console, no Sentry ou no
//      histórico; o Sentry recebeu ao menos um envelope.
// Postgres real (Testcontainers), papel do app; a coluna é trocada pelo migrator. Relógio fixo, uma autora por demanda
// (C-36), dados só fictícios; o token só nasce em tempo de teste.
import { format } from 'node:util';
import * as Sentry from '@sentry/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));

import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { CONFIRMADO, chamadasDoConstruir, inserirEventoDoPedido } from '../../../test/pedidos-construcao';
import { chamarRota } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { gerarPedidoNoPainel } from '../../app/(painel)/pacotes-decisao/[decId]/acoes-pedido';
import { POST as POST_PEDIDO } from '../../app/api/pacotes-decisao/[decId]/pedido-construcao/route';
import { user } from '../../db/schema';
import type { OpcaoDecisao } from '../../db/schema/decisao';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_ERRO_INTERNO } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { iniciarSentry } from '../../lib/sentry';
import type { AtorIntegracao, AtorPessoa } from '../acesso/ator';
import { criarTokenDeIntegracao } from '../acesso/tokens-servico';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { MENSAGEM_CAMINHOS_INVALIDOS } from './caminhos-da-criacao';
import { entregarPedido } from './entregar';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';

const NOME = 'Joana Ficticia Lima';
const NOME_ATUAL = 'Rosa Quintela Souza';
// Nenhum nome do arquivo (antigo, atual ou das trocas) pode sair em resposta, erro ou resultado.
const NOMES_DO_ARQUIVO = /joana|ficticia|lima|rosa|quintela|souza|outra|pessoa|sentinelaqwx|novaqwk/i;
const construirAtor: AtorIntegracao = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'ficticio' };
const geradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-t05qa-geradora', nome: 'Geradora T05 QA', papel: 'cto' };

const DEMANDA = { titulo: 'Pedidos duplicados (fictício)', tipo: 'bug', solicitanteNome: NOME, contexto: 'Importação diária do ERP', descricaoProblema: 'Pedidos aparecem duas vezes' };
const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
// Só a parte "Lima" do nome da criação, num campo da ESP.
const ESP_COM_NOME = { ...ESP, situacaoAtual: 'Conversar com Lima sobre o estoque' };
// Só a parte "Quintela" do nome que vai ser o atual: não é parte do nome da criação, então a coluna nasce vazia.
const ESP_COM_ATUAL = { ...ESP, situacaoAtual: 'Conversar com Quintela sobre o estoque' };
const RSK = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const DEC = { resumoExecutivo: 'Corrigir a importação de pedidos', opcaoA: { descricao: 'Corrigir no importador' }, opcaoB: { descricao: 'Refazer a integração' }, nivelAprovacaoRequerido: 'cto' };

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let tokenConstruir: string;
let autoras = 0;
const linhasDoLog: string[] = [];
const linhasDoConsole: string[] = [];
const envelopesDoSentry: string[] = [];
const transporteFalso = () => ({
  send: async (envelope: unknown) => {
    envelopesDoSentry.push(JSON.stringify(envelope));
    return {};
  },
  flush: async () => true,
});
const espioes: Array<{ mockRestore(): void }> = [];
const construir = chamadasDoConstruir(() => tokenConstruir);
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-t05qa-autora-${++autoras}`, nome: 'Autora T05 QA', papel: 'cto' });

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  for (const metodo of ['log', 'info', 'warn', 'error', 'debug'] as const) {
    espioes.push(vi.spyOn(console, metodo).mockImplementation((...args: unknown[]) => void linhasDoConsole.push(format(...args))));
  }
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte: transporteFalso });
  b = await novoBanco();
  await b.db.insert(user).values([{ id: geradora.usuarioId, name: geradora.nome, email: 't05qa-geradora@exemplo.test', papel: 'cto' }]);
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-14T20:00:00Z') });
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenConstruir = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  for (const e of espioes) e.mockRestore();
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  pedido.cabecalhos = new Headers({ cookie });
});

type Cenario = { demanda?: Record<string, unknown>; esp?: Record<string, unknown>; rsk?: Record<string, unknown>; dec?: Record<string, unknown>; opcao?: OpcaoDecisao };

const aprovar = (decId: string, opcao: OpcaoDecisao) =>
  registrarDecisao(deps, geradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: opcao }));

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

const trocarNome = (autora: AtorPessoa, demandaId: string, nome: string) =>
  alterarDemanda(deps, autora, demandaId, alterarDemandaSchema.parse({ solicitanteNome: nome }));

const colunaDo = async (decId: string): Promise<unknown> =>
  (await b.poolMigrator.query<{ c: unknown }>('select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1', [decId])).rows[0]?.c;

const trocarColuna = (decId: string, valor: string[] | null) =>
  b.poolMigrator.query('update pacote_decisao set caminhos_com_nome_na_criacao = $1 where id = $2', [valor, decId]);

const eventos = async (decId: string, acao: 'pedido_gerado' | 'pedido_entregue'): Promise<number> =>
  (await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from evento where entidade_id = $1 and acao = $2', [decId, acao])).rows[0]!.n;

// O pedido_gerado de pessoa, pelo migrator: deixa a entrega alcançável sem que a geração precise passar.
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

const gerarPelaRota = (decId: string) =>
  chamarRota(POST_PEDIDO, { metodo: 'POST', caminho: `/api/pacotes-decisao/${decId}/pedido-construcao`, params: { decId }, cookie, corpo: CONFIRMADO });

// Os cinco caminhos que geram ou entregam o pedido recusam com o mesmo 422 do D1 (a lista `erros` exata), sem nome em
// lugar nenhum e sem pedido_gerado nem pedido_entregue novos. O DEC já tem um pedido_gerado de pessoa (a entrega é
// alcançável). Devolve o texto de cada saída, para as varreduras de sentinela.
async function recusaEmTodosOsCaminhos(decId: string, erros: string[]): Promise<string[]> {
  const gerados = await eventos(decId, 'pedido_gerado');
  const corpo422 = { erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros };
  const saidas: string[] = [];

  const naGeracao = await falhaDe(gerarPedido(deps, geradora, decId, CONFIRMADO));
  expect(naGeracao, 'gerarPedido').toBeInstanceOf(ErroDominio);
  expect([(naGeracao as ErroDominio).codigo, (naGeracao as ErroDominio).extras], 'gerarPedido').toEqual(['nao_processavel', { erros }]);
  saidas.push(JSON.stringify((naGeracao as ErroDominio).extras));

  const rg = await gerarPelaRota(decId);
  const textoRg = await rg.text();
  expect([rg.status, JSON.parse(textoRg)], 'rota de geração').toEqual([422, corpo422]);
  saidas.push(textoRg);

  const acao = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
  expect(acao, 'Server Action do painel').toEqual({ ok: false, ...corpo422 });
  saidas.push(JSON.stringify(acao));

  const naEntrega = await falhaDe(entregarPedido(deps, construirAtor, decId));
  expect(naEntrega, 'entregarPedido').toBeInstanceOf(ErroDominio);
  expect([(naEntrega as ErroDominio).codigo, (naEntrega as ErroDominio).extras], 'entregarPedido').toEqual(['nao_processavel', { erros }]);
  saidas.push(JSON.stringify((naEntrega as ErroDominio).extras));

  const re = await construir.entregar(decId);
  const textoRe = await re.text();
  expect([re.status, JSON.parse(textoRe)], 'rota de entrega').toEqual([422, corpo422]);
  saidas.push(textoRe);

  expect(saidas.join('\n')).not.toMatch(NOMES_DO_ARQUIVO);
  expect([await eventos(decId, 'pedido_gerado'), await eventos(decId, 'pedido_entregue')], 'nada gravado').toEqual([gerados, 0]);
  return saidas;
}

// SB-08: a coluna só soma caminhos. O DEC nasce com a coluna vazia (o nome da criação não está em texto algum), o
// solicitante passa a ser um nome que está na ESP (regra da 0.4.0), e o migrator põe na coluna cada valor válido.
const COLUNAS_VALIDAS: ReadonlyArray<readonly [string, string[] | null, string[]]> = [
  ['nula (DEC anterior à 0.4.1)', null, ['especificacao.conteudo: nome']],
  ['vazia', [], ['especificacao.conteudo: nome']],
  ['só a opção não escolhida', ['opcaoB.descricao'], ['especificacao.conteudo: nome']],
  ['índices que o DEC não tem', ['criterios_aceite_preliminares[49]', 'definicao_de_pronto[7]'], ['especificacao.conteudo: nome']],
  ['outros caminhos, sem o da ESP', ['demanda.titulo', 'opcaoA.descricao'], ['demanda.titulo: nome', 'especificacao.conteudo: nome', 'decisao.opcaoEscolhida: nome']],
];

describe('SB-08: o D1 nunca fica mais fraco que na 0.4.0, em nenhum dos cinco caminhos de geração e entrega', () => {
  it.each(COLUNAS_VALIDAS)('coluna %s: o nome atual na ESP continua recusando, e a coluna só soma caminhos', async (_rotulo, coluna, esperados) => {
    const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_ATUAL });
    expect(await colunaDo(decId)).toEqual([]);
    await trocarNome(autora, demandaId, NOME_ATUAL);
    await trocarColuna(decId, coluna);
    expect(await colunaDo(decId)).toEqual(coluna);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    await recusaEmTodosOsCaminhos(decId, esperados);
  });

  it('sem troca de nome: com a coluna nula ou vazia, o nome da criação, que ainda é o atual, recusa como na 0.4.0', async () => {
    for (const coluna of [null, []]) {
      const { demandaId, decId } = await decAprovado({ esp: ESP_COM_NOME });
      await trocarColuna(decId, coluna);
      await pedidoGeradoPeloMigrator(demandaId, decId);
      await recusaEmTodosOsCaminhos(decId, ['especificacao.conteudo: nome']);
    }
  });
});

describe('critério 2 do pedido: o DEC recusado pelo D1 continua recusado em toda troca do solicitanteNome', () => {
  it('cinco trocas seguidas (outro nome, nome curto, só a parte antiga, o antigo em maiúsculas e a volta ao da criação): a mesma recusa nos cinco caminhos, cada caminho uma vez', async () => {
    const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_NOME });
    expect(await colunaDo(decId)).toEqual(['especificacao.conteudo']);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    await recusaEmTodosOsCaminhos(decId, ['especificacao.conteudo: nome']);
    for (const nome of ['Outra Pessoa', 'Xu', 'Lima', 'JOANA FICTICIA LIMA', NOME]) {
      await trocarNome(autora, demandaId, nome);
      await recusaEmTodosOsCaminhos(decId, ['especificacao.conteudo: nome']);
    }
    // A coluna é da criação: nenhuma troca a reescreve.
    expect(await colunaDo(decId)).toEqual(['especificacao.conteudo']);
  });

  it('a opção escolhida com o nome antigo continua recusando depois de trocar o nome duas vezes', async () => {
    const { demandaId, decId, autora } = await decAprovado({ dec: { opcaoB: { descricao: 'Falar com a Lima' } }, opcao: 'B' });
    expect(await colunaDo(decId)).toEqual(['opcaoB.descricao']);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    for (const nome of ['Outra Pessoa', NOME_ATUAL]) {
      await trocarNome(autora, demandaId, nome);
      await recusaEmTodosOsCaminhos(decId, ['decisao.opcaoEscolhida: nome']);
    }
  });

  it.each(['troca antes', 'troca depois'] as const)(
    'a troca do nome ao mesmo tempo que a geração e a entrega (%s na fila): as duas recusam pelo mesmo caminho, sem gravar nada',
    async (ordem) => {
      const { demandaId, decId, autora } = await decAprovado({ esp: ESP_COM_NOME });
      await pedidoGeradoPeloMigrator(demandaId, decId);
      const troca = () => trocarNome(autora, demandaId, 'Outra Pessoa');
      const geracao = () => gerarPedido(deps, geradora, decId, CONFIRMADO);
      const entrega = () => entregarPedido(deps, construirAtor, decId);
      const chamadas = ordem === 'troca antes' ? [troca(), geracao(), entrega()] : [geracao(), entrega(), troca()];
      const resultados = await Promise.allSettled(chamadas);
      const [rTroca, rGeracao, rEntrega] = ordem === 'troca antes' ? resultados : [resultados[2]!, resultados[0]!, resultados[1]!];
      expect(rTroca!.status).toBe('fulfilled');
      for (const [onde, r] of [
        ['geração', rGeracao],
        ['entrega', rEntrega],
      ] as const) {
        expect(r!.status, onde).toBe('rejected');
        const motivo = (r as PromiseRejectedResult).reason as unknown;
        expect(motivo, onde).toBeInstanceOf(ErroDominio);
        expect((motivo as ErroDominio).extras, onde).toEqual({ erros: ['especificacao.conteudo: nome'] });
      }
      expect([await eventos(decId, 'pedido_gerado'), await eventos(decId, 'pedido_entregue')]).toEqual([1, 0]);
      // Depois da corrida, o estado é o mesmo do CA-02.2.
      await recusaEmTodosOsCaminhos(decId, ['especificacao.conteudo: nome']);
    },
  );

  it('o nome em vigor é o da criação do DEC, e não o da criação da demanda: trocado antes do DEC, ele marca; trocado depois, continua recusando', async () => {
    const autora = novaAutora();
    const demandaId = (await criarDemanda(deps, autora, criarDemandaSchema.parse({ ...DEMANDA, solicitanteNome: NOME_ATUAL }))).id;
    await criarEspecificacao(deps, autora, demandaId, criarEspecificacaoSchema.parse(ESP_COM_NOME));
    await criarParecerRisco(deps, autora, demandaId, criarParecerRiscoSchema.parse(RSK));
    await trocarNome(autora, demandaId, NOME);
    const decId = (await criarPacoteDecisao(deps, autora, demandaId, criarPacoteDecisaoSchema.parse(DEC))).id;
    await aprovar(decId, 'A');
    expect(await colunaDo(decId)).toEqual(['especificacao.conteudo']);
    // De volta ao nome com que a demanda nasceu, que não está em texto algum.
    await trocarNome(autora, demandaId, NOME_ATUAL);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    await recusaEmTodosOsCaminhos(decId, ['especificacao.conteudo: nome']);
  });
});

describe('SB-08 (e) na Server Action do painel: a coluna fora do formato falha fechada, sem o valor', () => {
  it.each([[['x']], [['__proto__']], [['demanda.titulo ']]])('coluna %j: { ok: false, erro_interno } sem pedido_gerado e sem o valor', async (valor) => {
    const { decId } = await decAprovado();
    await trocarColuna(decId, valor);
    const r = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    expect(r).toEqual({ ok: false, erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    const texto = JSON.stringify(r);
    for (const pedaco of [...valor, MENSAGEM_CAMINHOS_INVALIDOS]) expect(texto.includes(pedaco), pedaco).toBe(false);
    expect(await eventos(decId, 'pedido_gerado')).toBe(0);
  });
});

describe('CA-02.5, RNF-09 e SB-09 (d): sentinelas com o Sentry exercitado', () => {
  it('as recusas do D1 nos cinco caminhos e um 500 controlado sobre a mesma demanda: nenhum dos dois nomes nas saídas, e o Sentry recebeu envelope', async () => {
    const SENTINELA_ANTIGA = 'Sentinelaqwx';
    const SENTINELA_ATUAL = 'Novaqwk';
    const inicioDoLog = linhasDoLog.length;
    const inicioDoConsole = linhasDoConsole.length;
    const inicioDoSentry = envelopesDoSentry.length;

    const { demandaId, decId, autora } = await decAprovado({
      demanda: { solicitanteNome: `Pessoa ${SENTINELA_ANTIGA} Ficticia` },
      esp: { ...ESP, situacaoAtual: `Conversar com ${SENTINELA_ANTIGA} sobre o estoque` },
      rsk: { ...RSK, resumo: `${SENTINELA_ATUAL} acompanha a virada` },
    });
    expect(await colunaDo(decId)).toEqual(['especificacao.conteudo']);
    await trocarNome(autora, demandaId, `Outra ${SENTINELA_ATUAL} Ficticia`);
    await pedidoGeradoPeloMigrator(demandaId, decId);
    const saidas = await recusaEmTodosOsCaminhos(decId, ['especificacao.conteudo: nome', 'risco.conteudo: nome']);

    // O 500 controlado: a mesma demanda, a coluna fora do formato, pela rota, pela Server Action e pela entrega.
    await trocarColuna(decId, ['x']);
    const rg = await gerarPelaRota(decId);
    const acao = await gerarPedidoNoPainel({ decId, ...CONFIRMADO });
    const re = await construir.entregar(decId);
    const corpos500 = [await rg.text(), JSON.stringify(acao), await re.text()];
    expect([rg.status, re.status]).toEqual([500, 500]);
    expect(acao).toEqual({ ok: false, erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    saidas.push(...corpos500);

    await Sentry.flush(2_000);
    // Controles: o Sentry recebeu os 500 e o pino registrou as seis chamadas das rotas e da Server Action.
    expect(envelopesDoSentry.length - inicioDoSentry).toBeGreaterThanOrEqual(1);
    const chamadasNoLog = linhasDoLog
      .slice(inicioDoLog)
      .map((l) => JSON.parse(l) as { evento?: string; rota?: string; status?: number; codigoErro?: string })
      .filter((l) => l.evento === 'requisicao' || l.evento === 'acao_painel')
      .map((l) => [l.rota, l.evento === 'requisicao' ? l.status : l.codigoErro]);
    expect(chamadasNoLog).toEqual([
      ['/api/pacotes-decisao/[decId]/pedido-construcao', 422],
      ['gerar_pedido_construcao', 'nao_processavel'],
      ['/api/pedidos-construcao/[decId]/entrega', 422],
      ['/api/pacotes-decisao/[decId]/pedido-construcao', 500],
      ['gerar_pedido_construcao', 'erro_interno'],
      ['/api/pedidos-construcao/[decId]/entrega', 500],
    ]);

    const historico = await b.poolMigrator.query<{ antes: string | null; depois: string | null }>('select antes::text as antes, depois::text as depois from evento where demanda_id = $1', [
      demandaId,
    ]);
    expect(historico.rows.length).toBeGreaterThanOrEqual(1);
    const varreduras: Array<[string, string]> = [
      ['respostas e resultados', saidas.join('\n')],
      ['pino', linhasDoLog.slice(inicioDoLog).join('\n')],
      ['console', linhasDoConsole.slice(inicioDoConsole).join('\n')],
      ['Sentry', envelopesDoSentry.slice(inicioDoSentry).join('\n')],
      ['evento', JSON.stringify(historico.rows)],
    ];
    for (const [onde, texto] of varreduras) {
      for (const sentinela of [SENTINELA_ANTIGA, SENTINELA_ATUAL]) expect(texto.toLowerCase().includes(sentinela.toLowerCase()), `${sentinela} em ${onde}`).toBe(false);
    }
  });
});
