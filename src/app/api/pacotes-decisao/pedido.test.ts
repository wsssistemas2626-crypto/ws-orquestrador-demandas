// Pedido de Construção (T22) pela API: POST /api/pacotes-decisao/:decId/pedido-construcao. RF-22, C-16, C-17, C-21,
// C-28, C-29 e CA-02.2. Banco, Better Auth e tokens reais (Testcontainers); o relógio é fixo (RNF-15). Os handlers são
// chamados como o Next chama, pelo ajudante de test/requisicao.ts. A matriz inteira desta rota fica no teste que
// percorre todas as rotas (test/matriz-rotas.test.ts). Dados só fictícios.
//
// A demanda, a ESP, o RSK e o DEC de cada cenário são gravados pelo serviço com uma autora fictícia própria (o limite
// por hora, C-36, conta por autor); a decisão é registrada pelo serviço com o CTO.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { validarPedido } from '../../../vendor/construir/pedido.mjs';
import { AGENTES, type Agente, type AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema, type Tipo } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { gerarPedido, MENSAGENS_PEDIDO } from '../../../modules/pedido-construcao/gerar';
import * as rotaDoPedido from './[decId]/pedido-construcao/route';
import { POST } from './[decId]/pedido-construcao/route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let cookieCtoSem2fa: string;
const tokens = {} as Record<Agente, string>;
const linhasDeLog: string[] = [];
let autoras = 0;

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const cto = (): Credencial => ({ cookie: cookieCto });
const adm = (): Credencial => ({ cookie: cookieAdm });
// POST sem corpo de negócio: vai `{}` em JSON, como o painel manda (C-15 exige Content-Type JSON com cookie).
const gerar = (decId: string, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(POST, {
    metodo: 'POST',
    caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}/pedido-construcao`,
    params: { decId },
    corpo: {},
    ...cred,
    ...extra,
  });

const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-autora-pedido-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });
const decisora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-decisora-pedido', nome: 'Pessoa Ficticia Decisora', papel: 'cto' };

async function prepararDec(op: { tipo?: Tipo; aprovar?: boolean; situacaoAtual?: string } = {}): Promise<{ demandaId: string; decId: string }> {
  const autora = novaAutora();
  const tipo = op.tipo ?? 'bug';
  const d = await criarDemanda(deps, autora, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo, solicitanteNome: SENTINELAS.nome, contexto: 'Importação diária' }));
  await criarEspecificacao(
    deps,
    autora,
    d.id,
    criarEspecificacaoSchema.parse(
      tipo === 'estudo'
        ? { descricaoObjetiva: 'Avaliar', escopoInclui: ['a'] }
        : {
            descricaoObjetiva: 'Corrigir pedidos duplicados',
            situacaoAtual: op.situacaoAtual,
            escopoInclui: ['a'],
            sistemaAlvo: 'meu-sistema',
            repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
            criteriosAceitePreliminares: ['c'],
            definicaoDePronto: ['p'],
          },
    ),
  );
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'alto', riscoJuridicoNivel: 'baixo' }));
  const dec = await criarPacoteDecisao(
    deps,
    autora,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'Opção A' }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: 'cto' }),
  );
  if (op.aprovar !== false) await registrarDecisao(deps, decisora, dec.id, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
  return { demandaId: d.id, decId: dec.id };
}

const eventosDoPedido = async (decId: string) =>
  Number(
    (await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento where entidade_id = $1 and acao = 'pedido_gerado'`, [decId])).rows[0]!
      .n,
  );

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  cookieCtoSem2fa = (await criarPessoa(deps, { papel: 'cto', com2fa: false })).cookie;
  for (const agente of AGENTES) tokens[agente] = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, agente, deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/pacotes-decisao/:decId/pedido-construcao: download', () => {
  it('C-16: o arquivo da rota não exporta GET (o Next responde 405); só POST', () => {
    expect((rotaDoPedido as Record<string, unknown>).GET).toBeUndefined();
    expect(POST).toBeDefined();
    const metodos = Object.keys(rotaDoPedido as Record<string, unknown>).filter((k) => /^[A-Z]+$/.test(k));
    expect(metodos).toEqual(['POST']);
    expect(POST.meta).toMatchObject({ acao: 'gerar_pedido_construcao', rota: '/api/pacotes-decisao/[decId]/pedido-construcao' });
  });

  it('C-29: cabeçalhos do download e corpo igual, byte a byte, ao JSON gerado', async () => {
    const { decId } = await prepararDec();
    const r = await gerar(decId);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('content-disposition')).toBe(`attachment; filename="${decId}.json"`);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const texto = await r.text();
    expect(texto).toBe((await gerarPedido(deps, decisora, decId)).json);
    const p = JSON.parse(texto);
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
    expect(p).toMatchObject({ pedido: decId, risco: { nivel: 'alto' }, decisao: { id: decId, opcaoEscolhida: 'A: Opção A', aprovadoPor: 'Pessoa Ficticia Decisora' } });
    // CA-22.6: o nome do solicitante (sentinela) não vai ao pedido.
    expect(contemSentinela(texto)).toBe(false);
  });

  it('a administradora também gera; cada geração grava um evento', async () => {
    const { decId } = await prepararDec();
    expect((await gerar(decId)).status).toBe(200);
    expect((await gerar(decId, adm())).status).toBe(200);
    expect(await eventosDoPedido(decId)).toBe(2);
  });
});

describe('POST /api/pacotes-decisao/:decId/pedido-construcao: recusas', () => {
  it('CA-22.4: DEC pendente → 409 com o motivo, sem evento', async () => {
    const { decId } = await prepararDec({ aprovar: false });
    const r = await gerar(decId);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('CA-22.3: estudo aprovado → 422 com a mensagem', async () => {
    const { decId } = await prepararDec({ tipo: 'estudo' });
    const r = await gerar(decId);
    expect(r.status).toBe(422);
    expect(await r.json()).toEqual({ erro: 'nao_processavel', mensagem: 'demanda do tipo estudo não gera Pedido de Construção' });
  });

  it('C-28: dado pessoal na ESP → 422 com o caminho e o tipo, sem o valor, e nada entregue', async () => {
    const { decId } = await prepararDec({ situacaoAtual: `Falar com ${SENTINELAS.email}` });
    const r = await gerar(decId);
    expect(r.status).toBe(422);
    expect(r.headers.get('content-disposition')).toBeNull();
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['especificacao.conteudo: e-mail'] });
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('DEC que não existe → 404', async () => {
    const r = await gerar('DEC-DEM-20261022-9999-v1');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial (C-17, e o filename nunca sai dele)', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const decId of ['DEC-DEM-2026-1-v1', 'ESP-DEM-20261022-0001-v1', 'DEC-DEM-20261022-0001-v1"; x="', 'DEC-DEM-20261022-0001-v1\r\nSet-Cookie: a=b', 'x']) {
        for (const cred of [cto(), {}]) {
          const r = await gerar(decId, cred);
          expect(r.status, decId).toBe(404);
          expect(r.headers.get('content-disposition')).toBeNull();
          expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
        }
      }
      expect(consultas).not.toHaveBeenCalled();
      expect(conexoes).not.toHaveBeenCalled();
    } finally {
      consultas.mockRestore();
      conexoes.mockRestore();
    }
  });
});

describe('POST /api/pacotes-decisao/:decId/pedido-construcao: acesso', () => {
  it('token de agente → 403 (matriz), para cada um dos quatro, sem evento', async () => {
    const { decId } = await prepararDec();
    for (const agente of AGENTES) {
      const r = await gerar(decId, { bearer: tokens[agente] });
      expect(r.status, agente).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('pessoa sem 2FA → 403; sem sessão nem token → 401; sem evento', async () => {
    const { decId } = await prepararDec();
    expect((await gerar(decId, { cookie: cookieCtoSem2fa })).status).toBe(403);
    expect((await gerar(decId, {})).status).toBe(401);
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('C-15: com cookie e Origin de outro site → 403; sem Origin → 403; sem Content-Type JSON → 415; sem evento', async () => {
    const { decId } = await prepararDec();
    expect((await gerar(decId, cto(), { cabecalhos: { origin: 'https://outro.test' } })).status).toBe(403);
    expect((await gerar(decId, cto(), { semOrigin: true })).status).toBe(403);
    expect((await gerar(decId, cto(), { semContentType: true })).status).toBe(415);
    expect(await eventosDoPedido(decId)).toBe(0);
  });
});

describe('log da rota do pedido (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem id, conteúdo do pedido, sentinela nem token', async () => {
    const aprovado = await prepararDec();
    const comEmail = await prepararDec({ situacaoAtual: `Falar com ${SENTINELAS.email}` });
    linhasDeLog.length = 0;
    await gerar(aprovado.decId);
    await gerar(comEmail.decId);
    await gerar(aprovado.decId, { bearer: tokens.consolidacao });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'POST /api/pacotes-decisao/[decId]/pedido-construcao 200',
      'POST /api/pacotes-decisao/[decId]/pedido-construcao 422',
      'POST /api/pacotes-decisao/[decId]/pedido-construcao 403',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toMatch(/DEM-\d{8}-\d{4}/);
    expect(tudo).not.toMatch(/meu-sistema|especificacao|Pedidos duplicados/);
    expect(tudo).not.toContain(tokens.consolidacao);
    expect(contemSentinela(tudo)).toBe(false);
  });
});
