// test/transversal/visibilidade-andamento.test.ts — T09 do DEC-DEM-20261111-0017-v1, AN-09 (a lição da listagem de DEC
// da 0019: a varredura parte de `MATRIZ`, e não de uma lista escrita à mão). Nenhuma leitura de agente devolve o
// andamento. Para toda ação com agente na linha da matriz, cada rota dessa ação é chamada pelos quatro agentes sobre uma
// demanda de pessoa com andamento `testando 987/988`; nenhuma resposta tem as chaves do andamento nem os números. Toda
// ação com agente tem ao menos uma rota chamada, e ao menos um agente recebe 2xx nela (a varredura não passa no vazio).
// A entrada montada para o provedor falso também não tem o andamento. Rotas, tokens e Postgres reais (Testcontainers);
// tokens só gerados em tempo de teste e nunca em mensagem de expect. Relógio fixo, dados fictícios.
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from '../../src/app/api/demandas/[id]/route';
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
import { inserirAndamento } from '../andamento';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { DEC_DO_PEDIDO, ESP_DO_PEDIDO, RSK_DO_PEDIDO, preparadorDePedidos } from '../pedidos-construcao';
import { METODOS, caminhoCom, chamarRota } from '../requisicao';
import { criarPessoa } from '../sessao';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = globSync('src/app/api/**/route.ts', { cwd: raiz })
  .filter((a) => !/^src\/app\/api\/(auth|saude)\//.test(a))
  .sort();

// As chaves que só o andamento tem, com aspas (como saem no JSON), e os números da linha sentinela.
const CHAVES = ['"andamento"', '"fase"', '"tarefasProntas"', '"tarefasTotal"', '"statusConstrucao"', '"atualizadoEm"'];
const NUMEROS = /\b98[78]\b/;

// Corpo válido por ação que grava: o agente dono da ação recebe 2xx, e o 201 dele também é conferido. Ação nova com
// agente e sem corpo aqui vai com `{}` e reprova o "ao menos um 2xx" abaixo: quem a criar acrescenta o corpo.
const CORPO_VALIDO: Partial<Record<Acao, unknown>> = {
  criar_demanda: { titulo: 'Demanda do orquestrador (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' },
  criar_especificacao: ESP_DO_PEDIDO,
  criar_parecer_risco: RSK_DO_PEDIDO,
  criar_pacote_decisao: DEC_DO_PEDIDO,
};

const relogio = relogioFixo('2026-11-13T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
let usuarioId: string;
let cookie: string;
const tokens = {} as Record<Agente, string>;
const cenario = { demandaId: '', espId: '', rskId: '', decId: '' };
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'visibilidade-andamento',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

// Parâmetros de caminho do cenário: id → a demanda, espId/rskId/decId → as versões dela, agente → 'risco'.
function paramsDoCenario(padrao: string): Record<string, string> {
  const valores: Record<string, string> = { id: cenario.demandaId, espId: cenario.espId, rskId: cenario.rskId, decId: cenario.decId, agente: 'risco' };
  const nomes = [...padrao.matchAll(/\[(?:\.\.\.)?([A-Za-z]+)\]/g)].map((m) => m[1]!);
  for (const n of nomes) if (!(n in valores)) throw new Error(`parâmetro sem valor no cenário: ${n}`);
  return Object.fromEntries(nomes.map((n) => [n, valores[n]!]));
}

const primeiroId = async (consulta: string, demandaId: string): Promise<string> => (await b.poolMigrator.query<{ id: string }>(consulta, [demandaId])).rows[0]!.id;

function semAndamento(texto: string, rotulo: string): void {
  for (const k of CHAVES) expect(texto, `${rotulo} ${k}`).not.toContain(k);
  expect(texto, rotulo).not.toMatch(NUMEROS);
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  for (const agente of AGENTES) tokens[agente] = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, relogio))).token;
  const p = await criarPessoa(deps, { papel: 'cto' });
  usuarioId = p.usuarioId;
  cookie = p.cookie;
  const { demandaId, decId } = await preparador.prepararDec();
  cenario.demandaId = demandaId;
  cenario.decId = decId;
  cenario.espId = await primeiroId('select id from especificacao_tecnica where demanda_id = $1 order by versao desc limit 1', demandaId);
  cenario.rskId = await primeiroId('select id from parecer_risco where demanda_id = $1 order by versao desc limit 1', demandaId);
  await inserirAndamento(b, { demandaId, decId, fase: 'testando', prontas: 987, total: 988, status: 'em_construcao', gravadoEm: relogio.agora() });
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('AN-09: nenhuma leitura de agente devolve o andamento', () => {
  it('controle: a pessoa lê o andamento `testando 987/988` da demanda do cenário', async () => {
    const r = await chamarRota(rotaDemanda.GET, {
      caminho: `/api/demandas/${cenario.demandaId}`,
      params: { id: cenario.demandaId },
      cookie,
    });
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).toContain('"andamento"');
    expect(texto).toMatch(NUMEROS);
  });

  it('varre MATRIZ × rotas × quatro agentes', async () => {
    const acoesComAgente = ACOES.filter((a) => MATRIZ[a].agentes.length > 0);
    // Controle: a matriz tem ações com agente (a varredura não parte de lista vazia).
    expect(acoesComAgente.length).toBeGreaterThan(0);
    expect(arquivos).toEqual(expect.arrayContaining(['src/app/api/demandas/[id]/route.ts', 'src/app/api/demandas/route.ts']));
    const chamadas = new Set<Acao>();
    const com2xx = new Set<Acao>();
    for (const arquivo of arquivos)
      for (const metodo of METODOS) {
        const h = ((await import(`${raiz}${arquivo}`)) as Record<string, HandlerRota | undefined>)[metodo];
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
          const texto = await r.text();
          semAndamento(texto, `${metodo} ${arquivo} ${agente}`);
          if (r.status >= 200 && r.status < 300) com2xx.add(h.meta.acao);
          // Leitura que a matriz dá ao agente responde 200 sobre a demanda do cenário: o "não tem o andamento" acima não é
          // de um 404 ou de um 403.
          if (metodo === 'GET' && MATRIZ[h.meta.acao].agentes.includes(agente)) expect(r.status, `${metodo} ${arquivo} ${agente}`).toBe(200);
        }
        chamadas.add(h.meta.acao);
      }
    expect([...chamadas].sort()).toEqual([...acoesComAgente].sort());
    expect([...com2xx].sort()).toEqual([...acoesComAgente].sort());
  });

  it('a entrada montada para o provedor falso, nos quatro agentes, não tem o andamento', async () => {
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
      // Controle: a entrada dos três agentes da demanda é a da demanda do cenário.
      if (agente !== 'orquestrador') expect(demandaId, agente).toBe(cenario.demandaId);
      semAndamento(conteudo, agente);
    }
  });
});
