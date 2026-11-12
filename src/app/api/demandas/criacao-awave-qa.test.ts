// QA da T06 (06-T06-testes): o que a criação pelo Awave não pode ter mudado para os outros autores, e as bordas da
// função. A T06 trocou o INSERT por `camposDaEntrada` campo a campo, o disparo por `dispararAoCriar` e o rascunho por
// `autorTipo !== 'pessoa'`; estes casos pegam troca de coluna, perda de campo e perda de disparo na pessoa e no agente
// (RF-04, RF-05, RNF-09), a lista de permissão do Awave quando a chamada vem direto à função (IN-05) e o limite no
// sentido contrário do CA-08.3 (RF-08). Cada describe tem banco, relógio fixo e tokens próprios: não depende de ordem
// nem do relógio real. Dados fictícios; o token só nasce em tempo de teste e nunca vai a mensagem de expect.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemandas from './route';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { MENSAGEM_LIMITE, MENSAGEM_LIMITE_AWAVE } from '../../../modules/limites';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, atorDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

// Cada campo opcional com um valor que só ele tem: uma troca de coluna no INSERT aparece na comparação.
const CORPO_COMPLETO = Object.freeze({
  titulo: 'Campos completos (fictício)',
  tipo: 'bug',
  solicitanteNome: 'Pessoa Ficticia Solicitante',
  solicitantePapel: 'financeiro',
  linhaServicoProvavel: 'automacao_integracao',
  urgencia: 'media',
  justificativaUrgencia: 'QA-JUSTIFICATIVA-c71e',
  contexto: 'QA-CONTEXTO-c71e',
  descricaoProblema: 'QA-DESCRICAO-c71e',
  impactoPercebido: 'QA-IMPACTO-c71e',
  anexos: [{ tipo: 'url', referencia: 'https://qa-c71e.test/anexo', descricao: 'Anexo fictício' }],
});
const COLUNAS_DO_CORPO_COMPLETO = {
  titulo: CORPO_COMPLETO.titulo,
  tipo: 'bug',
  status: 'nova',
  solicitante_nome: CORPO_COMPLETO.solicitanteNome,
  solicitante_papel: 'financeiro',
  linha_servico_provavel: 'automacao_integracao',
  urgencia: 'media',
  justificativa_urgencia: 'QA-JUSTIFICATIVA-c71e',
  contexto: 'QA-CONTEXTO-c71e',
  descricao_problema: 'QA-DESCRICAO-c71e',
  impacto_percebido: 'QA-IMPACTO-c71e',
  anexos: [{ tipo: 'url', referencia: 'https://qa-c71e.test/anexo', descricao: 'Anexo fictício' }],
  duvidas_entrada: [],
};

type Ambiente = { b: BancoDeTeste; deps: Deps; relogio: RelogioFixo; awave: string };

function ambiente(inicio = '2026-11-12T09:00:00Z'): Ambiente {
  const a = {} as Ambiente;
  beforeAll(async () => {
    a.b = await novoBanco();
    a.relogio = relogioFixo(inicio);
    a.deps = await criarDepsDeTeste(a.b, { relogio: a.relogio });
    definirDepsParaTeste(a.deps);
    a.awave = await tokenDeIntegracao(a.deps, 'awave');
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    await a.deps.fila.parar();
    await a.b.fechar();
  });
  return a;
}

const porToken = (bearer: string, corpo: unknown = CORPO_DO_AWAVE) =>
  chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer, corpo, semOrigin: true });
const porSessao = (cookie: string, corpo: unknown) => chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', cookie, corpo });

const idDo = async (r: Response) => ((await r.json()) as { id: string }).id;

async function contar(b: BancoDeTeste, consulta: string, params: unknown[] = []): Promise<number> {
  return (await b.poolMigrator.query<{ n: number }>(consulta, params)).rows[0]!.n;
}

async function foto(b: BancoDeTeste) {
  const seq = (await b.poolMigrator.query<{ last_value: string; is_called: boolean }>('select last_value, is_called from demanda_seq')).rows[0];
  return {
    seq,
    demandas: await contar(b, 'select count(*)::int as n from demanda'),
    eventos: await contar(b, 'select count(*)::int as n from evento'),
    tokens: await contar(b, 'select count(*)::int as n from token_servico'),
  };
}

const linhaDaDemanda = async (b: BancoDeTeste, id: string) =>
  (await b.poolMigrator.query<{ l: Record<string, unknown> }>('select row_to_json(d) as l from demanda d where id = $1', [id])).rows[0]?.l;
const eventosDa = async (b: BancoDeTeste, id: string) =>
  (await b.poolMigrator.query<{ l: Record<string, unknown> }>('select row_to_json(e) as l from evento e where entidade_id = $1 order by id', [id])).rows.map(
    (r) => r.l,
  );

describe('RF-04, RF-05 e RNF-09: pessoa e agente criam como antes da T06', () => {
  const a = ambiente();
  const MODELO = 'modelo-ficticio-qa';
  beforeAll(async () => {
    // O insumo técnico ligado, com preço vigente e teto livre (o mesmo preparo de gatilhos.test.ts).
    await a.b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
      MODELO,
      '2026-10-01T03:00:00Z',
    ]);
    await a.b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
    await a.b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1 where agente = 'insumo_tecnico'`, [MODELO]);
  });

  const execucoesDa = (id: string) => contar(a.b, 'select count(*)::int as n from execucao_agente where chave_entrada = $1', [`demanda:${id}`]);
  const jobs = () => contar(a.b, `select count(*)::int as n from pgboss.job where name = 'agente.executar'`);

  it('pessoa: cada campo do corpo vai à própria coluna, o solicitante é o do corpo, fora de rascunho, e o insumo técnico dispara', async () => {
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    const jobsAntes = await jobs();
    const r = await porSessao(cookie, CORPO_COMPLETO);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    const l = await linhaDaDemanda(a.b, id);
    expect(l).toMatchObject({ ...COLUNAS_DO_CORPO_COMPLETO, autor_tipo: 'pessoa', rascunho_agente: false });
    expect(l!.autor_id).not.toBe('awave');
    expect(await execucoesDa(id)).toBe(1);
    expect(await jobs()).toBe(jobsAntes + 1);
  });

  it('agente orquestrador: os mesmos campos, o solicitante do corpo (não "Awave"), rascunho, o prefixo do token no evento, e o insumo técnico dispara', async () => {
    const { token, prefixo } = await comTransacao(a.deps.pool, (t) => criarTokenServico(t, 'orquestrador', a.relogio));
    const jobsAntes = await jobs();
    const r = await porToken(token, CORPO_COMPLETO);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    expect(await linhaDaDemanda(a.b, id)).toMatchObject({ ...COLUNAS_DO_CORPO_COMPLETO, autor_tipo: 'agente', autor_id: 'orquestrador', rascunho_agente: true });
    const evs = await eventosDa(a.b, id);
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ ator_tipo: 'agente', ator_id: 'orquestrador', acao: 'demanda_criada', depois: { status: 'nova', tipo: 'bug' } });
    expect(evs[0]!.ator_token_prefixo === prefixo).toBe(true);
    expect(await execucoesDa(id)).toBe(1);
    expect(await jobs()).toBe(jobsAntes + 1);
  });

  it('awave com o mesmo corpo completo: só os cinco campos da lista ficam, e nada dispara (contraprova no mesmo banco)', async () => {
    const jobsAntes = await jobs();
    const r = await porToken(a.awave, CORPO_COMPLETO);
    expect(r.status).toBe(201);
    const id = await idDo(r);
    expect(await linhaDaDemanda(a.b, id)).toMatchObject({
      titulo: CORPO_COMPLETO.titulo,
      tipo: 'bug',
      solicitante_nome: 'Awave',
      solicitante_papel: 'financeiro',
      contexto: 'QA-CONTEXTO-c71e',
      descricao_problema: 'QA-DESCRICAO-c71e',
      linha_servico_provavel: null,
      urgencia: null,
      justificativa_urgencia: null,
      impacto_percebido: null,
      anexos: [],
      duvidas_entrada: [],
      autor_tipo: 'integracao',
      autor_id: 'awave',
      rascunho_agente: true,
    });
    expect(await execucoesDa(id)).toBe(0);
    expect(await jobs()).toBe(jobsAntes);
  });
});

describe('IN-05 pela função: a lista de permissão do Awave vale sem a rota', () => {
  const a = ambiente();
  const awave = atorDeIntegracao('awave');

  it('dúvidas do chamador são descartadas, e os opcionais ausentes ficam nulos', async () => {
    const entrada = criarDemandaSchema.parse({ titulo: 'Só o mínimo (fictício)', tipo: 'estudo', solicitanteNome: 'Pessoa Ficticia Qualquer' });
    const d = await criarDemanda(a.deps, awave, entrada, undefined, { duvidasEntrada: ['QA-DUVIDA-c71e'] });
    expect(await linhaDaDemanda(a.b, d.id)).toMatchObject({
      tipo: 'estudo',
      solicitante_nome: 'Awave',
      solicitante_papel: null,
      contexto: null,
      descricao_problema: null,
      duvidas_entrada: [],
      anexos: [],
      autor_tipo: 'integracao',
      autor_id: 'awave',
      rascunho_agente: true,
    });
    expect(JSON.stringify(await linhaDaDemanda(a.b, d.id))).not.toMatch(/QA-DUVIDA|Pessoa Ficticia Qualquer/);
  });

  it('com a transação do chamador desfeita, a demanda e o evento do Awave somem', async () => {
    const entrada = criarDemandaSchema.parse(CORPO_DO_AWAVE);
    let id = '';
    await expect(
      comTransacao(a.deps.pool, async (t) => {
        id = (await criarDemanda(a.deps, awave, entrada, t)).id;
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(id).toMatch(/^DEM-\d{8}-\d{4}$/);
    expect(await linhaDaDemanda(a.b, id)).toBeUndefined();
    expect(await eventosDa(a.b, id)).toEqual([]);
  });

  it('o /construir não cria demanda, nem pela função nem pela rota, e nada é gravado', async () => {
    const entrada = criarDemandaSchema.parse(CORPO_DO_AWAVE);
    const antes = await foto(a.b);
    await expect(criarDemanda(a.deps, atorDeIntegracao('construir'), entrada)).rejects.toEqual(SEM_PERMISSAO);
    expect(await foto(a.b)).toEqual(antes);
    const construir = await tokenDeIntegracao(a.deps, 'construir');
    const depoisDoToken = await foto(a.b);
    const r = await porToken(construir);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await foto(a.b)).toEqual(depoisDoToken);
  });
});

describe('RF-08 no sentido contrário do CA-08.3: o limite das pessoas não consome o do Awave', () => {
  const a = ambiente();

  it('com uma pessoa no limite de 30, o Awave ainda cria dez e recebe 429 só na 11ª; o agente orquestrador segue com o dele', async () => {
    const { cookie } = await criarPessoa(a.deps, { papel: 'cto' });
    const corpoDePessoa = { titulo: 'Demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' };
    for (let n = 1; n <= 30; n++) expect((await porSessao(cookie, corpoDePessoa)).status, `pessoa ${n}`).toBe(201);
    expect((await porSessao(cookie, corpoDePessoa)).status).toBe(429);

    for (let n = 1; n <= 10; n++) expect((await porToken(a.awave)).status, `awave ${n}`).toBe(201);
    const r = await porToken(a.awave);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE });
    expect(MENSAGEM_LIMITE_AWAVE).not.toBe(MENSAGEM_LIMITE.demanda);

    const orquestrador = (await comTransacao(a.deps.pool, (t) => criarTokenServico(t, 'orquestrador', a.relogio))).token;
    expect((await porToken(orquestrador, corpoDePessoa)).status).toBe(201);
    expect(await contar(a.b, `select count(*)::int as n from demanda where autor_tipo = 'integracao' and autor_id = 'awave'`)).toBe(10);
  });
});
