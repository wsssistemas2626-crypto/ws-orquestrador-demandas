// test/transversal/visibilidade-caminhos-da-criacao.test.ts — T04 do DEC-DEM-20261111-0018-v1 (D-05; SB-09 a e b).
// A coluna `caminhos_com_nome_na_criacao`, agora gravada pela criação, fica fora de toda leitura que alcança o DEC: a
// varredura parte de `MATRIZ` (as ações de leitura que alcançam o DEC: ler_pacote_decisao, ler_demanda e
// listar_demandas, inclusive a listagem de DEC) e das rotas do disco (molde do AN-09,
// test/transversal/visibilidade-andamento.test.ts), chamando as rotas reais com a pessoa e com cada agente que a matriz
// põe na linha. Nenhuma resposta contém `caminhos` nem os caminhos gravados, e as chaves de GET /api/pacotes-decisao/:decId
// e de cada item das duas listagens de DEC são as de 41108ee (lista escrita abaixo), para pessoa e para os quatro agentes.
// A entrada montada para o provedor falso (montarEntrada, nos quatro agentes) também não tem a coluna. Exceção declarada
// da G3.1: nasce verde, porque as vistas já são montadas campo a campo (a falha que exige o código é a da gravação, em
// src/modules/pacotes-decisao/marcacao-da-criacao.test.ts). Postgres, rotas e tokens reais (Testcontainers); tokens só
// gerados em tempo de teste e nunca em mensagem de expect; relógio fixo; dados fictícios.
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST as POST_DEC } from '../../src/app/api/demandas/[id]/pacotes-decisao/route';
import { entradaPendente } from '../../src/db/schema';
import { comTransacao } from '../../src/db/transacao';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { relogioFixo } from '../../src/lib/relogio';
import type { HandlerRota } from '../../src/lib/rota';
import { AGENTES, type Agente, type AtorPessoa } from '../../src/modules/acesso/ator';
import { ACOES, MATRIZ, type Acao } from '../../src/modules/acesso/matriz';
import { criarTokenServico } from '../../src/modules/acesso/tokens-servico';
import { montarEntrada } from '../../src/modules/agentes/entrada-agente';
import { criarDemandaSchema } from '../../src/modules/demandas/schemas';
import { criarDemanda } from '../../src/modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../src/modules/especificacoes/schemas';
import { criarEspecificacao } from '../../src/modules/especificacoes/servico';
import { criarParecerRiscoSchema } from '../../src/modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../src/modules/pareceres-risco/servico';
import { idVersao } from '../../src/modules/versoes';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { caminhoCom, chamarRota } from '../requisicao';
import { criarPessoa } from '../sessao';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = globSync('src/app/api/**/route.ts', { cwd: raiz })
  .filter((a) => !/^src\/app\/api\/(auth|saude)\//.test(a))
  .sort();

// As ações de leitura que alcançam o DEC (o DEC, as listagens de DEC e a demanda com os DEC dela).
const ACOES_QUE_ALCANCAM_O_DEC: readonly Acao[] = ['ler_pacote_decisao', 'ler_demanda', 'listar_demandas'];

// As chaves de PacoteDecisaoVista e de PacoteDecisaoVistaMinima em 41108ee, na ordem da montagem campo a campo.
const CHAVES_DO_DEC = [
  'id',
  'demandaId',
  'versao',
  'especificacaoId',
  'parecerRiscoId',
  'demandaTipo',
  'demandaTitulo',
  'demandaDescricao',
  'resumoExecutivo',
  'opcaoA',
  'opcaoB',
  'recomendacao',
  'nivelAprovacaoRequerido',
  'autor',
  'rascunhoAgente',
  'criadaEm',
  'statusDecisao',
  'aprovadores',
  'desatualizado',
  'substituido',
  'substituidoPor',
  'decisao',
  'rascunhosCitados',
  'especificacaoCitada',
  'niveisRisco',
];

const NOME = 'Joana Ficticia Lima';
// O que a criação grava para o cenário (ESP com "Lima", opção B e critério 1 com "Joana").
const GRAVADOS = ['especificacao.conteudo', 'opcaoB.descricao', 'criterios_aceite_preliminares[1]'];

const relogio = relogioFixo('2026-11-14T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let usuarioId: string;
const tokens = {} as Record<Agente, string>;
const cenario = { demandaId: '', espId: '', rskId: '', decId: '' };

function semACol(texto: string, rotulo: string): void {
  expect(texto, rotulo).not.toMatch(/caminhos/i);
  for (const g of GRAVADOS) expect(texto, `${rotulo} ${g}`).not.toContain(g);
}

function paramsDoCenario(padrao: string): Record<string, string> {
  const valores: Record<string, string> = { id: cenario.demandaId, espId: cenario.espId, rskId: cenario.rskId, decId: cenario.decId };
  const nomes = [...padrao.matchAll(/\[(?:\.\.\.)?([A-Za-z]+)\]/g)].map((m) => m[1]!);
  for (const n of nomes) if (!(n in valores)) throw new Error(`parâmetro sem valor no cenário: ${n}`);
  return Object.fromEntries(nomes.map((n) => [n, valores[n]!]));
}

const handlerDe = async (arquivo: string) => ((await import(`${raiz}${arquivo}`)) as Record<string, HandlerRota | undefined>).GET;

// As chaves de cada objeto de DEC da resposta, pela rota (o DEC, a listagem de DEC ou os DEC da demanda).
function decsDa(rota: string, corpo: Record<string, unknown>): Record<string, unknown>[] {
  if (rota === '/api/pacotes-decisao/[decId]') return [corpo];
  if (rota === '/api/pacotes-decisao' || rota === '/api/demandas/[id]/pacotes-decisao') return corpo.itens as Record<string, unknown>[];
  return [];
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  for (const agente of AGENTES) tokens[agente] = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, relogio))).token;
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  usuarioId = p.usuarioId;
  const autora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-visibilidade-caminhos', nome: 'Autora da varredura', papel: 'cto' };
  const d = await criarDemanda(deps, autora, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados (fictício)', tipo: 'bug', solicitanteNome: NOME }));
  await criarEspecificacao(
    deps,
    autora,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'Corrigir pedidos duplicados',
      situacaoAtual: 'Conversar com Lima sobre o estoque',
      escopoInclui: ['Importação de pedidos'],
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Pedido importado uma vez só', 'Aceite da Joana'],
      definicaoDePronto: ['pnpm test verde'],
    }),
  );
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  // O DEC nasce pela rota de pessoa, como na produção: a coluna é a calculada pela criação.
  const r = await chamarRota(POST_DEC, {
    metodo: 'POST',
    caminho: `/api/demandas/${encodeURIComponent(d.id)}/pacotes-decisao`,
    params: { id: d.id },
    corpo: { resumoExecutivo: 'Corrigir a importação', opcaoA: { descricao: 'Corrigir no importador' }, opcaoB: { descricao: 'Validar com a Joana' }, nivelAprovacaoRequerido: 'cto' },
    cookie,
  });
  if (r.status !== 201) throw new Error(`criação do DEC do cenário respondeu ${r.status}`);
  cenario.demandaId = d.id;
  cenario.decId = ((await r.json()) as { id: string }).id;
  cenario.espId = idVersao('ESP', d.id, 1);
  cenario.rskId = idVersao('RSK', d.id, 1);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('SB-09 (a, b): a marcação da criação fica fora de toda vista e saída (T04)', () => {
  it('controle: a criação gravou a coluna do DEC do cenário (não nula, com os três caminhos)', async () => {
    const { rows } = await b.poolMigrator.query('select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1', [cenario.decId]);
    expect(rows).toEqual([{ c: GRAVADOS }]);
  });

  it('controle do detector: a chave e cada caminho gravado são pegos', () => {
    expect(() => semACol('{"caminhosComNomeNaCriacao":null}', 'chave')).toThrow();
    for (const g of GRAVADOS) expect(() => semACol(JSON.stringify({ x: [g] }), g)).toThrow();
    expect(() => semACol('{"id":"DEC-DEM-20261114-0001-v1"}', 'limpo')).not.toThrow();
  });

  it('a partir da MATRIZ: as leituras que alcançam o DEC, com pessoa e com cada agente da linha → 200, sem a coluna; o DEC com as chaves de 41108ee', async () => {
    for (const acao of ACOES_QUE_ALCANCAM_O_DEC) {
      expect(ACOES).toContain(acao);
      expect(MATRIZ[acao].pessoa, acao).not.toBeNull();
    }
    const rotasLidas = new Set<string>();
    let decsConferidos = 0;
    for (const arquivo of arquivos) {
      const h = await handlerDe(arquivo);
      if (!h || !ACOES_QUE_ALCANCAM_O_DEC.includes(h.meta.acao)) continue;
      const params = paramsDoCenario(h.meta.rota);
      const quem: Array<{ rotulo: string; credencial: { cookie: string } | { bearer: string } }> = [
        { rotulo: 'pessoa', credencial: { cookie } },
        ...MATRIZ[h.meta.acao].agentes.map((agente) => ({ rotulo: agente, credencial: { bearer: tokens[agente] } })),
      ];
      for (const { rotulo, credencial } of quem) {
        const r = await chamarRota(h, { caminho: caminhoCom(h.meta.rota, params), params, ...('bearer' in credencial ? { semOrigin: true } : {}), ...credencial });
        expect(r.status, `GET ${arquivo} ${rotulo}`).toBe(200);
        const texto = await r.text();
        semACol(texto, `GET ${arquivo} ${rotulo}`);
        const decs = decsDa(h.meta.rota, JSON.parse(texto) as Record<string, unknown>);
        for (const dec of decs) expect(Object.keys(dec), `GET ${arquivo} ${rotulo}`).toEqual(CHAVES_DO_DEC);
        decsConferidos += decs.length;
      }
      rotasLidas.add(h.meta.rota);
    }
    // A varredura não passa no vazio: as três leituras de DEC e as duas da demanda estão nela, e os DEC foram conferidos
    // pela pessoa e pelos quatro agentes nas três leituras de DEC.
    expect([...rotasLidas]).toEqual(
      expect.arrayContaining(['/api/pacotes-decisao/[decId]', '/api/pacotes-decisao', '/api/demandas/[id]/pacotes-decisao', '/api/demandas/[id]', '/api/demandas']),
    );
    expect(decsConferidos).toBeGreaterThanOrEqual(3 * (1 + AGENTES.length));
  });

  it('a entrada montada para o provedor falso, nos quatro agentes, não tem a coluna', async () => {
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
});
