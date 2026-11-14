// test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts — 06-T03-testes do DEC-DEM-20261111-0018-v1
// (qa-automacao; SB-09 na coluna nova da T03). `pacote_decisao.caminhos_com_nome_na_criacao` nunca sai em vista nem saída:
// com a coluna do DEC do cenário preenchida pelo migrator com uma sentinela, (1) toda leitura GET que a matriz dá à pessoa
// e (2) toda rota de toda ação com agente na linha da `MATRIZ`, chamada pelos quatro agentes, respondem sem a chave da
// coluna (camelCase ou snake_case) e sem a sentinela; (3) a entrada montada para o provedor falso, nos quatro agentes,
// também não as tem; (4) nenhum evento (antes/depois) e nenhuma linha de log as tem. A varredura parte de `MATRIZ` e das
// rotas do disco (molde do AN-09, test/transversal/visibilidade-andamento.test.ts), e não de lista escrita à mão; ela não
// passa no vazio: a leitura do DEC pela pessoa e as leituras de agente que a matriz dá respondem 200. A T04 (SB-09 a e b)
// tem o arquivo próprio, test/transversal/visibilidade-caminhos-da-criacao.test.ts (D-05): este não o substitui.
// Rotas, tokens e Postgres reais (Testcontainers); tokens só gerados em tempo de teste e nunca em mensagem de expect.
// Relógio fixo, dados fictícios. A sentinela não é caminho da lista fechada de propósito: ela só existe neste banco.
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDec from '../../src/app/api/pacotes-decisao/[decId]/route';
import { entradaPendente } from '../../src/db/schema';
import { comTransacao } from '../../src/db/transacao';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { relogioFixo } from '../../src/lib/relogio';
import type { HandlerRota } from '../../src/lib/rota';
import { AGENTES, type Agente } from '../../src/modules/acesso/ator';
import { ACOES, MATRIZ, type Acao } from '../../src/modules/acesso/matriz';
import { criarTokenServico } from '../../src/modules/acesso/tokens-servico';
import { montarEntrada } from '../../src/modules/agentes/entrada-agente';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { DEC_DO_PEDIDO, ESP_DO_PEDIDO, RSK_DO_PEDIDO, preparadorDePedidos } from '../pedidos-construcao';
import { METODOS, caminhoCom, chamarRota } from '../requisicao';
import { criarPessoa } from '../sessao';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = globSync('src/app/api/**/route.ts', { cwd: raiz })
  .filter((a) => !/^src\/app\/api\/(auth|saude)\//.test(a))
  .sort();

// A chave da coluna, nos dois nomes (o do Drizzle e o do banco), e a sentinela gravada no DEC do cenário.
const CHAVE = /caminhos_?com_?nome/i;
const SENTINELA = 'sentinela.qa-caminho-da-criacao-5517';

// Corpo válido por ação que grava (o mesmo do AN-09): o agente dono da ação recebe 2xx, e o 201 dele também é conferido.
const CORPO_VALIDO: Partial<Record<Acao, unknown>> = {
  criar_demanda: { titulo: 'Demanda do orquestrador (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' },
  criar_especificacao: ESP_DO_PEDIDO,
  criar_parecer_risco: RSK_DO_PEDIDO,
  criar_pacote_decisao: DEC_DO_PEDIDO,
};

const relogio = relogioFixo('2026-11-14T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
let usuarioId: string;
let cookie: string;
const linhasDoLog: string[] = [];
const tokens = {} as Record<Agente, string>;
const cenario = { demandaId: '', espId: '', rskId: '', decId: '' };
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'visibilidade-caminhos-qa',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

function paramsDoCenario(padrao: string): Record<string, string> {
  const valores: Record<string, string> = { id: cenario.demandaId, espId: cenario.espId, rskId: cenario.rskId, decId: cenario.decId, agente: 'risco' };
  const nomes = [...padrao.matchAll(/\[(?:\.\.\.)?([A-Za-z]+)\]/g)].map((m) => m[1]!);
  for (const n of nomes) if (!(n in valores)) throw new Error(`parâmetro sem valor no cenário: ${n}`);
  return Object.fromEntries(nomes.map((n) => [n, valores[n]!]));
}

const primeiroId = async (consulta: string, demandaId: string): Promise<string> => (await b.poolMigrator.query<{ id: string }>(consulta, [demandaId])).rows[0]!.id;

function semACol(texto: string, rotulo: string): void {
  expect(texto, rotulo).not.toMatch(CHAVE);
  expect(texto, rotulo).not.toContain(SENTINELA);
}

const handlerDe = async (arquivo: string, metodo: string) => ((await import(`${raiz}${arquivo}`)) as Record<string, HandlerRota | undefined>)[metodo];

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  for (const agente of AGENTES) tokens[agente] = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, relogio))).token;
  const p = await criarPessoa(deps, { papel: 'cto' });
  usuarioId = p.usuarioId;
  cookie = p.cookie;
  const { demandaId, decId } = await preparador.prepararDec({ gerar: false });
  cenario.demandaId = demandaId;
  cenario.decId = decId;
  cenario.espId = await primeiroId('select id from especificacao_tecnica where demanda_id = $1 order by versao desc limit 1', demandaId);
  cenario.rskId = await primeiroId('select id from parecer_risco where demanda_id = $1 order by versao desc limit 1', demandaId);
  // Pelo migrator (o app não tem UPDATE em pacote_decisao, SB-07 d): a coluna do DEC do cenário passa a ter a sentinela.
  await b.poolMigrator.query('update pacote_decisao set caminhos_com_nome_na_criacao = $1 where id = $2', [[SENTINELA], decId]);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('SB-09: a coluna caminhos_com_nome_na_criacao não sai em vista nem saída (T03)', () => {
  it('controle do detector: a chave nos dois nomes e a sentinela sozinha são pegas', () => {
    expect(() => semACol(JSON.stringify({ caminhosComNomeNaCriacao: null }), 'camelCase')).toThrow();
    expect(() => semACol(JSON.stringify({ caminhos_com_nome_na_criacao: null }), 'snake_case')).toThrow();
    expect(() => semACol(JSON.stringify({ outra: [SENTINELA] }), 'sentinela')).toThrow();
    expect(() => semACol(JSON.stringify({ id: 'DEC-DEM-20261114-0001-v1', caminhos: [] }), 'limpo')).not.toThrow();
  });

  it('controle: o DEC do cenário tem a sentinela na coluna, no banco', async () => {
    const { rows } = await b.poolMigrator.query('select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1', [cenario.decId]);
    expect(rows).toEqual([{ c: [SENTINELA] }]);
  });

  it('controle: a pessoa lê o DEC do cenário (200, a vista inteira), e a resposta não tem a chave nem a sentinela', async () => {
    const r = await chamarRota(rotaDec.GET, { caminho: `/api/pacotes-decisao/${cenario.decId}`, params: { decId: cenario.decId }, cookie });
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).toContain(`"id":"${cenario.decId}"`);
    expect(texto).toContain('"resumoExecutivo"');
    semACol(texto, 'GET /api/pacotes-decisao/[decId] pessoa');
  });

  it('toda leitura GET que a matriz dá à pessoa responde 200 sem a chave nem a sentinela', async () => {
    const lidas = new Set<string>();
    for (const arquivo of arquivos) {
      const h = await handlerDe(arquivo, 'GET');
      if (!h || MATRIZ[h.meta.acao].pessoa === null) continue;
      const params = paramsDoCenario(h.meta.rota);
      const r = await chamarRota(h, { caminho: caminhoCom(h.meta.rota, params), params, cookie });
      expect(r.status, `GET ${arquivo} pessoa`).toBe(200);
      semACol(await r.text(), `GET ${arquivo} pessoa`);
      lidas.add(arquivo);
    }
    // A varredura não passa no vazio: as três leituras de DEC (o DEC, a listagem e os DEC da demanda) estão nela.
    expect([...lidas]).toEqual(
      expect.arrayContaining([
        'src/app/api/pacotes-decisao/[decId]/route.ts',
        'src/app/api/pacotes-decisao/route.ts',
        'src/app/api/demandas/[id]/pacotes-decisao/route.ts',
      ]),
    );
  });

  it('varre MATRIZ × rotas × quatro agentes: nenhuma resposta tem a chave nem a sentinela', async () => {
    const acoesComAgente = ACOES.filter((a) => MATRIZ[a].agentes.length > 0);
    expect(acoesComAgente.length).toBeGreaterThan(0);
    const chamadas = new Set<Acao>();
    const com2xx = new Set<Acao>();
    for (const arquivo of arquivos)
      for (const metodo of METODOS) {
        const h = await handlerDe(arquivo, metodo);
        if (!h || MATRIZ[h.meta.acao].agentes.length === 0) continue;
        const params = paramsDoCenario(h.meta.rota);
        for (const agente of AGENTES) {
          const r = await chamarRota(h, {
            metodo,
            caminho: caminhoCom(h.meta.rota, params),
            params,
            bearer: tokens[agente],
            semOrigin: true,
            corpo: metodo === 'GET' ? undefined : (CORPO_VALIDO[h.meta.acao] ?? {}),
          });
          semACol(await r.text(), `${metodo} ${arquivo} ${agente}`);
          if (r.status >= 200 && r.status < 300) com2xx.add(h.meta.acao);
          // A leitura que a matriz dá ao agente responde 200 sobre o cenário: o "sem a coluna" não é de um 404 ou 403.
          if (metodo === 'GET' && MATRIZ[h.meta.acao].agentes.includes(agente)) expect(r.status, `${metodo} ${arquivo} ${agente}`).toBe(200);
        }
        chamadas.add(h.meta.acao);
      }
    expect([...chamadas].sort()).toEqual([...acoesComAgente].sort());
    expect([...com2xx].sort()).toEqual([...acoesComAgente].sort());
    // As leituras de DEC com agente na linha estão na varredura (a vista mínima é a que um `...p` exporia primeiro).
    expect([...chamadas]).toEqual(expect.arrayContaining(['ler_pacote_decisao']));
  });

  it('a entrada montada para o provedor falso, nos quatro agentes, não tem a chave nem a sentinela', async () => {
    const [pendente] = await b.db
      .insert(entradaPendente)
      .values({
        texto: 'Pedido fictício sobre a importação',
        origem: { canal: 'email', referencia: 'REF-FICTICIA' },
        solicitanteNome: 'Pessoa Ficticia',
        solicitantePapel: 'financeiro',
        registradaPor: usuarioId,
        recebidaEm: relogio.agora(),
      })
      .returning({ id: entradaPendente.id });
    const chaves: Record<Agente, string> = {
      orquestrador: `entrada:${pendente!.id}`,
      insumo_tecnico: `demanda:${cenario.demandaId}`,
      risco: `esp:${cenario.espId}`,
      consolidacao: `rsk:${cenario.rskId}`,
    };
    for (const agente of AGENTES) {
      const { conteudo, demandaId } = await montarEntrada(b.db, agente, chaves[agente]);
      if (agente !== 'orquestrador') expect(demandaId, agente).toBe(cenario.demandaId);
      semACol(conteudo, agente);
    }
  });

  it('nenhum evento (antes ou depois) e nenhuma linha de log têm a chave ou a sentinela', async () => {
    const { rows } = await b.poolMigrator.query<{ texto: string }>(
      `select coalesce(antes::text, '') || ' ' || coalesce(depois::text, '') as texto from evento`,
    );
    // Controle: o DEC do cenário gravou o pacote_decisao_criado (a varredura de eventos não é sobre tabela vazia).
    const criados = await b.poolMigrator.query(`select 1 from evento where entidade = 'pacote_decisao' and entidade_id = $1 and acao = 'pacote_decisao_criado'`, [
      cenario.decId,
    ]);
    expect(criados.rowCount).toBe(1);
    semACol(rows.map((r) => r.texto).join('\n'), 'evento');
    semACol(linhasDoLog.join('\n'), 'log');
  });
});
