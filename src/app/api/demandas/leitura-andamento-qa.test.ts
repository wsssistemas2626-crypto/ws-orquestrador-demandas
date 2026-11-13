// src/app/api/demandas/leitura-andamento-qa.test.ts — 06-T09-testes do DEC-DEM-20261111-0017-v1 (qa-automacao; RF-10,
// RF-11, AN-09, ADR-35). O que os testes da T09 não cobriam: com mais de uma demanda com andamento, cada leitura traz o
// da própria demanda e o último dela (sem vazar o de outra, nem o último da tabela); a pessoa recebe `andamento: null`
// com a chave presente e a vista inteira sem perder chave; a lista de permissão da vista vale para os quatro agentes e
// para o sistema, e a integração fora da autoria não recebe vista nenhuma. Rotas, tokens e Postgres reais
// (Testcontainers); a demanda do Awave nasce pelo POST dele e o andamento entra pela rota do /construir. Tokens só
// gerados em tempo de teste e nunca em mensagem de expect. Relógio fixo, dados fictícios. Cada caso usa as próprias
// demandas e lê as datas do relógio no momento do caso: o arquivo não depende de ordem.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as rotaDemanda from './[id]/route';
import * as rotaDemandas from './route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { ErroDominio } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { AGENTES, type Ator, type AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import type { CorpoAndamento } from '../../../modules/andamento/schemas';
import { confirmarDemanda } from '../../../modules/demandas/confirmar';
import { lerDemandaPara, obterDemanda, vistaDaDemandaPara, type DemandaVista } from '../../../modules/demandas/consultas';
import { alterarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { gerarPedido } from '../../../modules/pedido-construcao/gerar';
import { corpo } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, atorDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { CONFIRMADO, ESP_DO_PEDIDO, RSK_DO_PEDIDO, chamadasDoConstruir, preparadorDePedidos } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const SETE = ['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo'];
const SEIS_DA_PESSOA = ['atualizadoEm', 'decId', 'fase', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal'];
// A vista mínima da 0.3.1 (vistaMinimaDaDemanda), sem `andamento` (CA-11.2).
const VISTA_MINIMA = [
  'agentesEmAndamento',
  'atualizadaEm',
  'contexto',
  'criadaEm',
  'descricaoProblema',
  'duvidasEntrada',
  'especificacoes',
  'id',
  'impactoPercebido',
  'justificativaUrgencia',
  'linhaServicoProvavel',
  'pacotesDecisao',
  'pareceresRisco',
  'rascunhoAgente',
  'responsavel',
  'solicitantePapel',
  'status',
  'tipo',
  'titulo',
  'urgencia',
].sort();
// A vista inteira da pessoa (0.4.0): a mínima, mais o que só a pessoa vê (nome do solicitante, anexos) e o andamento.
const VISTA_DA_PESSOA = [...VISTA_MINIMA, 'andamento', 'anexos', 'solicitanteNome'].sort();
const CHAVES_DO_ANDAMENTO = ['"andamento"', '"fase"', '"tarefasProntas"', '"tarefasTotal"', '"statusConstrucao"', '"atualizadoEm"'];
const NUMEROS = /\b98[78]\b/;

const relogio = relogioFixo('2026-11-13T12:00:00Z');
const agoraIso = () => relogio.agora().toISOString();
const awave = atorDeIntegracao('awave');
const construirAtor = atorDeIntegracao('construir');
const sistema: Ator = { tipo: 'sistema' };

let b: BancoDeTeste;
let deps: Deps;
let tokenAwave: string;
let tokenConstruir: string;
let cookie: string;
let pessoa: AtorPessoa;

const construir = chamadasDoConstruir(() => tokenConstruir);
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'leitura-andamento-qa',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

type Credencial = { bearer: string } | { cookie: string };
type Obj = Record<string, unknown>;

const doAwave = (): Credencial => ({ bearer: tokenAwave });
const daPessoa = (): Credencial => ({ cookie });

const ler = (id: string, c: Credencial) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, ...c, semOrigin: 'bearer' in c });

async function lerJson(id: string, c: Credencial): Promise<{ texto: string; corpo: Obj }> {
  const r = await ler(id, c);
  expect(r.status, id).toBe(200);
  const texto = await r.text();
  return { texto, corpo: JSON.parse(texto) as Obj };
}

const andamentoLido = async (id: string, c: Credencial): Promise<unknown> => (await lerJson(id, c)).corpo.andamento;

async function criarDoAwave(): Promise<string> {
  const r = await chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: tokenAwave, corpo: CORPO_DO_AWAVE, semOrigin: true });
  expect(r.status).toBe(201);
  return ((await r.json()) as Obj).id as string;
}

// O mesmo caminho da T09: a demanda do Awave confirmada pela pessoa, com ESP, RSK e DEC dela, o DEC aprovado, o pedido
// gerado e a demanda em `aprovada`.
async function pedidoDoAwave(): Promise<{ id: string; decId: string }> {
  const id = await criarDoAwave();
  await confirmarDemanda(deps, pessoa, id);
  await alterarDemanda(deps, pessoa, id, alterarDemandaSchema.parse({ contexto: 'Importação diária do ERP (fictício)' }));
  const autora = preparador.novaAutora();
  await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(ESP_DO_PEDIDO));
  await criarParecerRisco(deps, autora, id, criarParecerRiscoSchema.parse(RSK_DO_PEDIDO));
  const decId = await preparador.novoDec(autora, id);
  await preparador.aprovar(decId);
  await gerarPedido(deps, preparador.geradora, decId, CONFIRMADO);
  await alterarDemanda(deps, pessoa, id, alterarDemandaSchema.parse({ status: 'aprovada' }));
  return { id, decId };
}

async function enviar(decId: string, c: Partial<CorpoAndamento> = {}): Promise<void> {
  const r = await construir.andamento(decId, corpo(c));
  expect(r.status).toBe(204);
}

// O erro lançado por uma função síncrona, sem try/catch no corpo do teste.
function erroDe(f: () => unknown): unknown {
  try {
    f();
  } catch (e) {
    return e;
  }
  return undefined;
}

function semAndamento(texto: string, rotulo: string): void {
  for (const k of CHAVES_DO_ANDAMENTO) expect(texto, `${rotulo} ${k}`).not.toContain(k);
  expect(texto, rotulo).not.toMatch(NUMEROS);
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  pessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
// Cada caso numa janela de uma hora própria: o limite de 10 demandas por hora do Awave (C-36) não pesa de um caso no outro.
beforeEach(() => {
  relogio.avancar(2 * 3_600_000);
});

describe('RF-10 e RF-11: o andamento lido é o da própria demanda, e o último dela', () => {
  it('duas demandas do Awave com andamento e uma sem: cada leitura traz o próprio; o último envio vence, mesmo com números menores', async () => {
    const a = await pedidoDoAwave();
    const outra = await pedidoDoAwave();
    const semNenhum = await criarDoAwave();

    await enviar(a.decId, { tarefasProntas: 3, tarefasTotal: 5 });
    const emA1 = agoraIso();
    relogio.avancar(60_000);
    // O de `outra` é a linha mais nova da tabela: a leitura de `a` não pode trazê-lo.
    await enviar(outra.decId, { fase: 'testando', tarefasProntas: 7, tarefasTotal: 8 });
    const emOutra = agoraIso();

    expect(await andamentoLido(a.id, doAwave())).toEqual({ fase: 'construindo', tarefasProntas: 3, tarefasTotal: 5, atualizadoEm: emA1 });
    expect(await andamentoLido(outra.id, doAwave())).toEqual({ fase: 'testando', tarefasProntas: 7, tarefasTotal: 8, atualizadoEm: emOutra });
    expect(await andamentoLido(semNenhum, doAwave())).toBeNull();

    // Replanejamento (RF-04): os números descem, e a leitura traz o último envio, não o maior.
    relogio.avancar(60_000);
    await enviar(a.decId, { fase: 'testando', tarefasProntas: 2, tarefasTotal: 19 });
    const emA2 = agoraIso();
    expect(await andamentoLido(a.id, doAwave())).toEqual({ fase: 'testando', tarefasProntas: 2, tarefasTotal: 19, atualizadoEm: emA2 });
    expect(await andamentoLido(outra.id, doAwave())).toEqual({ fase: 'testando', tarefasProntas: 7, tarefasTotal: 8, atualizadoEm: emOutra });

    // A pessoa lê as mesmas três, com o DEC de cada uma e sem o DEC da outra.
    const daA = await lerJson(a.id, daPessoa());
    expect(daA.corpo.andamento).toEqual({ decId: a.decId, fase: 'testando', tarefasProntas: 2, tarefasTotal: 19, statusConstrucao: 'em_construcao', atualizadoEm: emA2 });
    expect(daA.texto).not.toContain(outra.decId);
    const daOutra = await lerJson(outra.id, daPessoa());
    expect(daOutra.corpo.andamento).toEqual({ decId: outra.decId, fase: 'testando', tarefasProntas: 7, tarefasTotal: 8, statusConstrucao: 'em_construcao', atualizadoEm: emOutra });
    expect(daOutra.texto).not.toContain(a.decId);
    expect(await andamentoLido(semNenhum, daPessoa())).toBeNull();
  });

  it('a pessoa recebe a vista inteira, com a chave `andamento` presente e `null`, na demanda sem andamento (com e sem pedido gerado)', async () => {
    const semPedido = await preparador.prepararDec({ gerar: false });
    const comPedido = await preparador.prepararDec();
    for (const id of [semPedido.demandaId, comPedido.demandaId]) {
      const { corpo: v } = await lerJson(id, daPessoa());
      expect(Object.keys(v).sort(), id).toEqual(VISTA_DA_PESSOA);
      expect(v.andamento, id).toBeNull();
    }
    // Controle: com andamento, a mesma vista inteira, agora com os seis campos.
    await enviar(comPedido.decId);
    const { corpo: v } = await lerJson(comPedido.demandaId, daPessoa());
    expect(Object.keys(v).sort()).toEqual(VISTA_DA_PESSOA);
    expect(Object.keys(v.andamento as Obj).sort()).toEqual(SEIS_DA_PESSOA);
  });
});

describe('AN-09: a lista de permissão da vista vale para todo ator que não é pessoa', () => {
  it('os quatro agentes e o sistema recebem a vista mínima exata, sem o andamento; a pessoa, a vista inteira com os seis campos', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await enviar(decId, { fase: 'testando', tarefasProntas: 987, tarefasTotal: 988 });
    const d = await obterDemanda(deps.db, demandaId);
    // Controle: a vista lida do banco tem o andamento inteiro.
    expect(d.andamento).toEqual({ decId, fase: 'testando', tarefasProntas: 987, tarefasTotal: 988, statusConstrucao: 'em_construcao', atualizadoEm: relogio.agora() });
    expect(Object.keys(vistaDaDemandaPara(pessoa, d)).sort()).toEqual(VISTA_DA_PESSOA);
    expect(vistaDaDemandaPara(pessoa, d)).toEqual(d);

    const atores: Array<[string, Ator]> = [...AGENTES.map((agente): [string, Ator] => [agente, { tipo: 'agente', agente, prefixoToken: 'ficticio' }]), ['sistema', sistema]];
    expect(atores).toHaveLength(5);
    for (const [rotulo, ator] of atores) {
      const v = vistaDaDemandaPara(ator, d);
      expect(Object.keys(v).sort(), rotulo).toEqual(VISTA_MINIMA);
      semAndamento(JSON.stringify(v), rotulo);
    }
  });

  it('lerDemandaPara com o sistema e com um agente, sobre o banco real: a vista mínima exata, sem o andamento', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await enviar(decId, { fase: 'testando', tarefasProntas: 987, tarefasTotal: 988 });
    const agente: Ator = { tipo: 'agente', agente: 'consolidacao', prefixoToken: 'ficticio' };
    for (const [rotulo, ator] of [
      ['sistema', sistema],
      ['agente', agente],
    ] as const) {
      const v = await lerDemandaPara({ db: deps.db, pool: deps.pool }, ator, demandaId);
      expect(Object.keys(v).sort(), rotulo).toEqual(VISTA_MINIMA);
      semAndamento(JSON.stringify(v), rotulo);
    }
    // Controle: a pessoa, pelo mesmo caminho, lê os números.
    expect(JSON.stringify(await lerDemandaPara({ db: deps.db, pool: deps.pool }, pessoa, demandaId))).toMatch(NUMEROS);
  });

  it('integração fora da autoria não recebe vista: o awave com a demanda de pessoa e o construir com a do Awave dão sem_permissao', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await enviar(decId, { fase: 'testando', tarefasProntas: 987, tarefasTotal: 988 });
    const daPessoaComAndamento = await obterDemanda(deps.db, demandaId);
    const esperado = { codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };

    const doAwaveSobrePessoa = erroDe(() => vistaDaDemandaPara(awave, daPessoaComAndamento));
    expect(doAwaveSobrePessoa).toBeInstanceOf(ErroDominio);
    expect(doAwaveSobrePessoa).toMatchObject(esperado);

    // A mesma vista com a autoria do Awave: o construir não é o autor (lê nada), o awave é (sete chaves, andamento em quatro).
    const comAutoriaDoAwave = { ...daPessoaComAndamento, responsavel: { tipo: 'integracao', integracao: 'awave' } } as DemandaVista;
    const doConstruir = erroDe(() => vistaDaDemandaPara(construirAtor, comAutoriaDoAwave));
    expect(doConstruir).toBeInstanceOf(ErroDominio);
    expect(doConstruir).toMatchObject(esperado);
    const controle = vistaDaDemandaPara(awave, comAutoriaDoAwave) as unknown as Obj;
    expect(Object.keys(controle).sort()).toEqual(SETE);
    expect(controle.andamento).toEqual({ fase: 'testando', tarefasProntas: 987, tarefasTotal: 988, atualizadoEm: relogio.agora() });
  });
});
