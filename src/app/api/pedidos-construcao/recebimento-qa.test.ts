// 06-T12-testes (qa-automacao): o que recebimento.test.ts não cobre na rota POST /api/pedidos-construcao/:decId/recebimento,
// pela rota real, com Bearer do token `construir`, `content-type: application/json` e sem `Origin`, como o
// buscar-pedidos.mjs (dfedf16) confirma:
//   - C-17: decId fora da regex dá 404 com o corpo do inexistente, antes de autenticar e antes do Zod, sem gravar;
//   - C-15 não afrouxa: com cookie e sem Origin, 403; com cookie, Origin certa e sem JSON, 415; só com Bearer, o corpo
//     declarado continua só em JSON (415); `application/json; charset=utf-8` passa;
//   - RF-01: cookie de sessão junto com o Bearer, 400 ambíguo;
//   - CA-01.5 nesta rota: token construir revogado → 401 sem gravar, e o outro token construir segue valendo;
//   - RF-09: pela rede interna (http://orquestrador_app), o recebimento responde como pelo domínio;
//   - o hash entregue de um DEC não confirma outro DEC;
//   - a regra "um pedido_recebido por hash entregue" (06-T12-revisao, decisões), sem repetir evento.
// Postgres real (Testcontainers), relógio fixo de criarDepsDeTeste, cada caso com DEC e autora próprios; as contagens de
// evento são relativas e as listas são filtradas pelos DEC do caso, então nada depende de ordem. Tokens só gerados em
// tempo de teste, nunca em mensagem de expect. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamadasDoConstruir, preparadorDePedidos, sha256DoTexto, totalDeEventos as totalDeEventosDo, type OpChamada } from '../../../../test/pedidos-construcao';
import { URL_BASE } from '../../../../test/requisicao';
import { novoIp } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, revogarTokenServico } from '../../../modules/acesso/tokens-servico';
import { MENSAGENS_RECEBIMENTO } from '../../../modules/pedido-construcao/receber';
import * as rotaRecebimento from './[decId]/recebimento/route';

const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
const TOKEN_INVALIDO = { erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido };
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const SO_JSON = { erro: 'tipo_nao_suportado', mensagem: 'O conteúdo enviado precisa estar em JSON.' };
const SHA_DIFERENTE = { erro: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.shaDiferente };
const INEXISTENTE = 'DEC-DEM-20261022-9999-v1';
const OUTRO_SHA = 'e'.repeat(64);

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;

// Oráculo independente do servidor (o SHA-256 dos bytes UTF-8 recebidos, como o buscar-pedidos.mjs calcula), o preparo e
// as chamadas vêm de test/pedidos-construcao.ts (T13, Minor 1 da 06-T12-revisao).
const sha = sha256DoTexto;
const construir = chamadasDoConstruir(() => tokenConstruir);
const listar = () => construir.listar();
const entregar = (decId: string) => construir.entregar(decId);
// `bearer: null` manda a requisição sem credencial. Com corpo, `chamarRota` põe `content-type: application/json`.
const receber = (decId: string, corpo: unknown, op: Omit<OpChamada, 'corpo'> = {}) => construir.receber(decId, corpo, op);

const totalDeEventos = () => totalDeEventosDo(b);
const recebidosDo = async (decId: string) =>
  (
    await b.poolMigrator.query<{ ator_id: string; depois: unknown }>(
      `select ator_id, depois from evento where entidade_id = $1 and acao = 'pedido_recebido' order by id`,
      [decId],
    )
  ).rows;
const pendentesEntre = async (ids: string[]): Promise<string[]> => {
  const r = await listar();
  expect(r.status).toBe(200);
  return ((await r.json()) as { itens: Array<{ decId: string }> }).itens.map((i) => i.decId).filter((id) => ids.includes(id));
};

type Cenario = { demandaId: string; decId: string; recebido: string };

// DEC aprovado, pedido gerado por pessoa (gerarPedido) e entregue pela rota (200); `recebido` é o texto que o /construir
// recebeu.
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'recebimento-qa', entregar });
async function prepararDec(): Promise<Cenario> {
  const c = await preparador.prepararDec({ entregar: true });
  return { demandaId: c.demandaId, decId: c.decId, recebido: c.recebido! };
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  tokenConstruir = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /recebimento: entrada, C-17 e C-15', () => {
  it('C-17: decId fora da regex → 404 com o corpo, byte a byte, do DEC inexistente, antes de autenticar e antes do Zod, sem gravar', async () => {
    const { decId, recebido } = await prepararDec();
    const inexistente = await receber(INEXISTENTE, { sha256: OUTRO_SHA });
    expect(inexistente.status).toBe(404);
    const corpoInexistente = await inexistente.text();
    expect(JSON.parse(corpoInexistente)).toEqual(NAO_ENCONTRADO);
    const antes = await totalDeEventos();
    for (const estranho of [
      `${decId}' or '1'='1`,
      decId.toLowerCase(),
      decId.replace(/^DEC/, 'ESP'),
      decId.replace(/^DEC-/, ''),
      `${decId}/../x`,
      `${decId.slice(0, -2)}%`,
      `${decId.slice(0, -2)}v12345`,
      '',
    ]) {
      // Sem credencial o 404 vem antes do 401, e com o sha256 fora do formato vem antes do 400: a regex é a primeira barreira.
      for (const bearer of [tokenConstruir, null]) {
        for (const corpo of [{ sha256: sha(recebido) }, { sha256: 'abc' }]) {
          const r = await receber(estranho, corpo, { bearer });
          expect(r.status, estranho).toBe(404);
          expect(await r.text(), estranho).toBe(corpoInexistente);
        }
      }
    }
    expect(await totalDeEventos()).toBe(antes);
    expect(await recebidosDo(decId)).toHaveLength(0);
  });

  it('C-15 com cookie: sem Origin → 403; Origin certa e corpo sem JSON → 415; nenhum evento, e o DEC continua pendente', async () => {
    const { decId, recebido } = await prepararDec();
    const antes = await totalDeEventos();
    const semOrigin = await receber(decId, { sha256: sha(recebido) }, { cabecalhos: { cookie: 'qualquer=1' } });
    expect(semOrigin.status).toBe(403);
    expect(await semOrigin.json()).toEqual(SEM_PERMISSAO);
    const outraOrigem = await receber(decId, { sha256: sha(recebido) }, { cabecalhos: { cookie: 'qualquer=1', origin: 'https://outro.exemplo.test' } });
    expect(outraOrigem.status).toBe(403);
    expect(await outraOrigem.json()).toEqual(SEM_PERMISSAO);
    const semJson = await receber(decId, JSON.stringify({ sha256: sha(recebido) }), {
      cabecalhos: { cookie: 'qualquer=1', 'content-type': 'text/plain' },
      semOrigin: false,
    });
    expect(semJson.status).toBe(415);
    expect(await semJson.json()).toEqual(SO_JSON);
    expect(await totalDeEventos()).toBe(antes);
    expect(await pendentesEntre([decId])).toEqual([decId]);
  });

  it('C-15 só com Bearer: o corpo declarado continua só em JSON (text/plain ou sem content-type → 415, sem evento); application/json com charset passa', async () => {
    const { decId, recebido } = await prepararDec();
    const corpo = JSON.stringify({ sha256: sha(recebido) });
    const antes = await totalDeEventos();
    const textoPuro = await receber(decId, corpo, { cabecalhos: { 'content-type': 'text/plain' } });
    expect(textoPuro.status).toBe(415);
    expect(await textoPuro.json()).toEqual(SO_JSON);
    // Montada à mão: com corpo em texto, o Request poria `text/plain` sozinho; em bytes, sai mesmo sem content-type.
    const reqSemTipo = new Request(`${URL_BASE}/api/pedidos-construcao/${decId}/recebimento`, {
      method: 'POST',
      headers: { ...novoIp(), accept: 'application/json', authorization: `Bearer ${tokenConstruir}` },
      body: new TextEncoder().encode(corpo),
    });
    expect(reqSemTipo.headers.get('content-type')).toBeNull();
    const semTipo = await rotaRecebimento.POST(reqSemTipo, { params: Promise.resolve({ decId }) });
    expect(semTipo.status).toBe(415);
    expect(await semTipo.json()).toEqual(SO_JSON);
    expect(await totalDeEventos()).toBe(antes);
    expect(await pendentesEntre([decId])).toEqual([decId]);

    const comCharset = await receber(decId, corpo, { cabecalhos: { 'content-type': 'application/json; charset=utf-8' } });
    expect(comCharset.status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
    expect(await pendentesEntre([decId])).toEqual([]);
  });

  it('RF-01: cookie de sessão junto com o Bearer → 400 ambíguo, sem gravar', async () => {
    const { decId, recebido } = await prepararDec();
    const antes = await totalDeEventos();
    // O C-15 vem antes: com Origin certa e JSON, a requisição chega ao resolverAtor, que recusa a ambiguidade.
    const r = await receber(decId, { sha256: sha(recebido) }, { cabecalhos: { cookie: 'wsod.session_token=ficticio' }, semOrigin: false });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ erro: 'entrada_invalida', mensagem: MENSAGENS_ACESSO.ambiguo });
    expect(await totalDeEventos()).toBe(antes);
    expect(await recebidosDo(decId)).toHaveLength(0);
  });
});

describe('POST /recebimento: credencial e rede (CA-01.5, RF-09)', () => {
  it('CA-01.5: token construir revogado → 401 com a mensagem de token inválido, sem gravar; o outro token construir segue confirmando', async () => {
    const { decId, recebido } = await prepararDec();
    const revogado = await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio));
    await comTransacao(deps.pool, (t) => revogarTokenServico(t, revogado.prefixo, deps.relogio));
    const antes = await totalDeEventos();
    for (const corpo of [{ sha256: sha(recebido) }, { sha256: OUTRO_SHA }]) {
      const r = await receber(decId, corpo, { bearer: revogado.token });
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual(TOKEN_INVALIDO);
    }
    expect(await totalDeEventos()).toBe(antes);
    expect(await pendentesEntre([decId])).toEqual([decId]);
    expect((await receber(decId, { sha256: sha(recebido) })).status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  it('RF-09: pela rede interna (http://orquestrador_app), o recebimento responde 204 como pelo domínio e grava um pedido_recebido', async () => {
    const { decId, recebido } = await prepararDec();
    expect(URL_BASE.startsWith('http://orquestrador_app')).toBe(false);
    const interno = new Request(`http://orquestrador_app/api/pedidos-construcao/${decId}/recebimento`, {
      method: 'POST',
      headers: {
        ...novoIp(),
        host: 'orquestrador_app',
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${tokenConstruir}`,
      },
      body: JSON.stringify({ sha256: sha(recebido) }),
    });
    const r = await rotaRecebimento.POST(interno, { params: Promise.resolve({ decId }) });
    expect(r.status).toBe(204);
    expect(await r.text()).toBe('');
    expect((await recebidosDo(decId)).map((e) => e.ator_id)).toEqual(['construir']);
    expect(await pendentesEntre([decId])).toEqual([]);
  });
});

describe('POST /recebimento: o hash é por DEC e por entrega (IN-12)', () => {
  it('o SHA-256 entregue de um DEC não confirma outro DEC: 409 shaDiferente, sem evento, e os dois continuam pendentes', async () => {
    const a = await prepararDec();
    const outro = await prepararDec();
    expect(sha(a.recebido)).not.toBe(sha(outro.recebido));
    const antes = await totalDeEventos();
    const r = await receber(outro.decId, { sha256: sha(a.recebido) });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual(SHA_DIFERENTE);
    expect(await totalDeEventos()).toBe(antes);
    expect(await pendentesEntre([a.decId, outro.decId]).then((ids) => [...ids].sort())).toEqual([a.decId, outro.decId].sort());
  });

  it('um pedido_recebido por hash entregue: cada hash confirma uma vez, e repetir qualquer um não grava de novo', async () => {
    const { demandaId, decId, recebido } = await prepararDec();
    const anterior = '0'.repeat(62) + 'b2';
    // Uma segunda entrega com outro hash, gravada pelo migrator (prefixo fictício).
    await b.poolMigrator.query(
      `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
       values ($1, 'integracao', 'construir', 'ficticio', $2, 'pacote_decisao', $3, 'pedido_entregue', $4::jsonb)`,
      [deps.relogio.agora().toISOString(), demandaId, decId, JSON.stringify({ sha256: anterior })],
    );
    expect((await receber(decId, { sha256: sha(recebido) })).status).toBe(204);
    expect((await receber(decId, { sha256: anterior })).status).toBe(204);
    expect((await receber(decId, { sha256: sha(recebido) })).status).toBe(204);
    expect((await receber(decId, { sha256: anterior })).status).toBe(204);
    expect((await recebidosDo(decId)).map((e) => e.depois)).toEqual([{ sha256: sha(recebido) }, { sha256: anterior }]);
    const errado = await receber(decId, { sha256: OUTRO_SHA });
    expect(errado.status).toBe(409);
    expect(await errado.json()).toEqual(SHA_DIFERENTE);
    expect(await recebidosDo(decId)).toHaveLength(2);
  });
});
