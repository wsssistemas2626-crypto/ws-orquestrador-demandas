// B-3 do 0009 (DEC-DEM-20261104-0010-v1) e B-3 do 0010 (DEC-DEM-20261104-0011-v1): nos três POST de ESP, RSK e DEC, os
// nomes do solicitante (para a vista mínima do 201, M-a do 0009) vêm da linha da demanda travada, dentro da transação do
// serviço (`nomesDoSolicitante` sobre a linha de `travarDemanda`), e não de uma leitura da rota antes da trava. Se essa
// conta falhar, a resposta é 500 e nada fica gravado: nem a versão, nem o evento, nem a mudança de status, nem o aviso
// do DEC; a nova tentativa cria a v1, e não uma v2 duplicada. Sem a falha, os códigos do serviço seguem iguais: 404
// (demanda que não existe), 409 (status final), 429 (limite por ator, C-36) e 400 com `faltando` (DEC sem ESP e RSK). A
// renomeação do solicitante no meio do POST (corrida) sai no 201 com o nome novo trocado. Banco, Better Auth e tokens
// reais (Testcontainers); o `nomesDoSolicitante` real, com uma chave para o teste fazê-lo falhar uma vez, e o
// `nomesDaDemanda` real, observado. Dados só fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_ERRO_INTERNO, MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AtorAgente, AtorPessoa } from '../../../modules/acesso/ator';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { nomesDaDemanda, nomesDoSolicitante } from '../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { MENSAGEM_DEMANDA_FINAL } from '../../../modules/demandas/transicoes';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGEM_LIMITE } from '../../../modules/limites';
import { MENSAGEM_FALTAM_ITENS } from '../../../modules/pacotes-decisao/criar';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import type { HandlerRota } from '../../../lib/rota';
import { POST as POST_ESP } from './[id]/especificacoes/route';
import { POST as POST_DEC } from './[id]/pacotes-decisao/route';
import { POST as POST_RSK } from './[id]/pareceres-risco/route';

// O nomesDoSolicitante de verdade; com a chave armada, a próxima chamada lança (e a chave desarma). O nomesDaDemanda de
// verdade, só observado: o POST não o chama mais.
const falha = vi.hoisted(() => ({ armada: false }));
vi.mock('../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/consultas')>();
  return {
    ...real,
    nomesDaDemanda: vi.fn(real.nomesDaDemanda),
    nomesDoSolicitante: vi.fn((...args: Parameters<typeof real.nomesDoSolicitante>) => {
      if (falha.armada) {
        falha.armada = false;
        throw new Error('falha simulada');
      }
      return real.nomesDoSolicitante(...args);
    }),
  };
});

let b: BancoDeTeste;
let deps: Deps;
let pessoa: AtorPessoa;
let cookie: string;
let tokenInsumo: string;
let tokenRisco: string;
let tokenConsolidacao: string;

const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;

const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação'],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Critério fictício'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const DEC = { resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'A' }, opcaoB: { descricao: 'B' }, nivelAprovacaoRequerido: 'cto' };

type Caso = {
  nome: string;
  handler: HandlerRota;
  recurso: string;
  corpo: Record<string, unknown>;
  tabela: string;
  acao: string;
  prefixo: string;
  agente: () => Credencial;
};

const CASOS: Caso[] = [
  { nome: 'ESP', handler: POST_ESP, recurso: 'especificacoes', corpo: ESP, tabela: 'especificacao_tecnica', acao: 'especificacao_criada', prefixo: 'ESP', agente: () => ({ bearer: tokenInsumo }) },
  { nome: 'RSK', handler: POST_RSK, recurso: 'pareceres-risco', corpo: RSK, tabela: 'parecer_risco', acao: 'parecer_risco_criado', prefixo: 'RSK', agente: () => ({ bearer: tokenRisco }) },
  { nome: 'DEC', handler: POST_DEC, recurso: 'pacotes-decisao', corpo: DEC, tabela: 'pacote_decisao', acao: 'pacote_decisao_criado', prefixo: 'DEC', agente: () => ({ bearer: tokenConsolidacao }) },
];

const criar = (c: Caso, demandaId: string, cred: Credencial) =>
  chamarRota(c.handler, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/${c.recurso}`, params: { id: demandaId }, corpo: c.corpo, ...cred });

const contar = async (sql: string, valores: unknown[]) => Number((await b.poolMigrator.query<{ n: string }>(sql, valores)).rows[0]!.n);
const linhasDa = (c: Caso, demandaId: string) => contar(`select count(*)::text as n from ${c.tabela} where demanda_id = $1`, [demandaId]);
const eventosDa = (c: Caso, demandaId: string) => contar('select count(*)::text as n from evento where demanda_id = $1 and acao = $2', [demandaId, c.acao]);
const avisosDa = (demandaId: string) => contar('select count(*)::text as n from aviso_email where pacote_decisao_id like $1', [`DEC-${demandaId}-%`]);
const statusDa = async (demandaId: string) => (await b.poolMigrator.query<{ status: string }>('select status from demanda where id = $1', [demandaId])).rows[0]!.status;

// Demanda com ESP v1 e RSK v1 já gravados pelos agentes (o DEC exige os dois); a contagem de ESP e RSK da rota começa
// depois deles.
async function demandaPronta(dono: AtorPessoa = pessoa): Promise<string> {
  const id = (await criarDemanda(deps, dono, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Fulana Fictícia Teste' }))).id;
  await criarEspecificacao(deps, insumo, id, criarEspecificacaoSchema.parse(ESP));
  await criarParecerRisco(deps, risco, id, criarParecerRiscoSchema.parse(RSK));
  return id;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  pessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  tokenInsumo = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', deps.relogio))).token;
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
  tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
});

beforeEach(() => {
  falha.armada = false;
  vi.mocked(nomesDaDemanda).mockClear();
  vi.mocked(nomesDoSolicitante).mockClear();
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('B-3 do 0009 e do 0010: falha ao tirar os nomes da linha travada não grava nada', () => {
  for (const c of CASOS) {
    for (const quem of ['pessoa', 'agente'] as const) {
      it(`POST de ${c.nome} pelo ator ${quem}: 500, nada gravado; a nova tentativa cria a v1`, async () => {
        const cred = quem === 'pessoa' ? { cookie } : c.agente();
        const id = await demandaPronta();
        const antes = { linhas: await linhasDa(c, id), eventos: await eventosDa(c, id), status: await statusDa(id), avisos: await avisosDa(id) };

        falha.armada = true;
        const r = await criar(c, id, cred);
        expect(r.status).toBe(500);
        expect(await r.json()).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
        expect(falha.armada).toBe(false);
        expect({ linhas: await linhasDa(c, id), eventos: await eventosDa(c, id), status: await statusDa(id), avisos: await avisosDa(id) }).toEqual(antes);

        const ok = await criar(c, id, cred);
        expect(ok.status).toBe(201);
        // ESP e RSK já têm a v1 do agente na demanda pronta; o DEC começa do zero.
        const esperada = c.nome === 'DEC' ? 1 : 2;
        expect(((await ok.json()) as { id: string }).id).toBe(`${c.prefixo}-${id}-v${esperada}`);
        expect(await linhasDa(c, id)).toBe(antes.linhas + 1);
        expect(await eventosDa(c, id)).toBe(antes.eventos + 1);
        if (c.nome === 'DEC') {
          expect(await avisosDa(id)).toBe(1);
          expect(await statusDa(id)).toBe('pronta_para_decisao');
        }
      });
    }
  }
});

describe('B-3 do 0009: com a leitura antes, os códigos do serviço não mudam', () => {
  it.each(CASOS.map((c) => [c.nome, c] as const))('POST de %s em demanda que não existe → 404', async (_nome, c) => {
    const r = await criar(c, 'DEM-20261104-9999', { cookie });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it.each(CASOS.map((c) => [c.nome, c] as const))('POST de %s em demanda encerrada → 409, sem gravar', async (_nome, c) => {
    const id = await demandaPronta();
    await b.poolMigrator.query("update demanda set status = 'encerrada' where id = $1", [id]);
    const antes = await linhasDa(c, id);
    const r = await criar(c, id, { cookie });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGEM_DEMANDA_FINAL });
    expect(await linhasDa(c, id)).toBe(antes);
    expect(await avisosDa(id)).toBe(0);
  });

  it.each(CASOS.map((c) => [c.nome, c] as const))('POST de %s com 60 artefatos do ator na hora → 429, sem gravar', async (_nome, c) => {
    const outra = await criarPessoa(deps, { papel: 'administradora' });
    const dona: AtorPessoa = { tipo: 'pessoa', usuarioId: outra.usuarioId, nome: 'Pessoa Ficticia', papel: 'administradora' };
    const id = await demandaPronta(dona);
    await b.poolMigrator.query(
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'DEC-' || $1::text || '-v' || v, $1::text, v, 'ESP-' || $1::text || '-v1', 1, 'RSK-' || $1::text || '-v1', 1, 'bug', 'Pedidos duplicados', '', 'x', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', $2::text, false, $3::timestamptz
       from generate_series(1, 60) as v`,
      [id, outra.usuarioId, deps.relogio.agora()],
    );
    const antes = await linhasDa(c, id);
    const r = await criar(c, id, { cookie: outra.cookie });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await linhasDa(c, id)).toBe(antes);
  });

  it('POST de DEC sem ESP e sem RSK → 400 com faltando, sem gravar', async () => {
    const id = (await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Fulana Fictícia Teste' }))).id;
    const dec = CASOS.find((c) => c.nome === 'DEC')!;
    const r = await criar(dec, id, { cookie });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: 'entrada_invalida', mensagem: MENSAGEM_FALTAM_ITENS, faltando: ['especificacao', 'parecer_risco'] });
    expect(await linhasDa(dec, id)).toBe(0);
    expect(await statusDa(id)).toBe('nova');
  });

  // B-3 do 0010: a rota não lê mais os nomes fora da trava; o serviço os tira uma vez da linha travada.
  it('o POST não chama nomesDaDemanda e chama nomesDoSolicitante uma vez, com o nome da linha travada', async () => {
    const id = await demandaPronta();
    for (const c of CASOS) {
      vi.mocked(nomesDaDemanda).mockClear();
      vi.mocked(nomesDoSolicitante).mockClear();
      expect((await criar(c, id, { cookie })).status).toBe(201);
      expect(vi.mocked(nomesDaDemanda).mock.calls.map((a) => a[1])).toEqual([]);
      expect(vi.mocked(nomesDoSolicitante).mock.calls).toEqual([['Fulana Fictícia Teste']]);
    }
  });
});

// B-3 do 0010 (DEC-DEM-20261104-0011-v1, D-3): a renomeação do solicitante que acontece enquanto o POST espera a trava
// da demanda não deixa o nome novo sair em claro no 201. Uma conexão do migrator trava a linha e troca o nome; o POST
// fica em espera de trava (visto em pg_stat_activity); depois do commit, o 201 sai com o nome novo trocado. Nomes
// fictícios.
describe('B-3 do 0010: os nomes do 201 vêm da linha travada', () => {
  const NOME_ANTIGO = 'Joana Ficticia Antiga';
  const NOME_NOVO = 'Carla Ficticia Nova';
  const TEXTO = `Falar com ${NOME_NOVO} sobre o relatório.`;
  const ESPERADO = 'Falar com [nome removido] sobre o relatório.';
  const CAMPO: Record<string, string> = { ESP: 'descricaoObjetiva', RSK: 'resumo', DEC: 'resumoExecutivo' };

  async function esperarTrava(): Promise<void> {
    const prazo = Date.now() + 10_000;
    for (;;) {
      const n = await contar(
        "select count(*)::text as n from pg_stat_activity where wait_event_type = 'Lock' and datname = current_database() and pid <> pg_backend_pid()",
        [],
      );
      if (n > 0) return;
      if (Date.now() > prazo) throw new Error('o POST não chegou à espera da trava');
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  it.each(CASOS.map((c) => [c.nome, c] as const))('POST de %s pelo agente com renomeação na espera da trava: o nome novo sai como marcador', async (_nome, c) => {
    const id = (await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: NOME_ANTIGO }))).id;
    await criarEspecificacao(deps, insumo, id, criarEspecificacaoSchema.parse(ESP));
    await criarParecerRisco(deps, risco, id, criarParecerRiscoSchema.parse(RSK));
    const corpo = { ...c.corpo, [CAMPO[c.nome]!]: TEXTO };
    const conexao = await b.poolMigrator.connect();
    let pedido: Promise<Response> | null = null;
    try {
      await conexao.query('begin');
      await conexao.query('select id from demanda where id = $1 for update', [id]);
      await conexao.query('update demanda set solicitante_nome = $2 where id = $1', [id, NOME_NOVO]);
      pedido = chamarRota(c.handler, {
        metodo: 'POST',
        caminho: `/api/demandas/${encodeURIComponent(id)}/${c.recurso}`,
        params: { id },
        corpo,
        ...c.agente(),
      });
      await esperarTrava();
      await conexao.query('commit');
    } catch (e) {
      await conexao.query('rollback');
      await pedido?.catch(() => undefined);
      throw e;
    } finally {
      conexao.release();
    }
    const r = (await pedido)!;
    expect(r.status).toBe(201);
    const texto = await r.text();
    expect((JSON.parse(texto) as Record<string, unknown>)[CAMPO[c.nome]!]).toBe(ESPERADO);
    expect(texto).not.toContain('Carla');
  });
});
