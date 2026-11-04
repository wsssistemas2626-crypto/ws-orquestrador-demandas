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
import { alterarDemandaSchema, criarDemandaSchema, type Tipo } from '../../../modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { gerarPedido, MENSAGENS_PEDIDO } from '../../../modules/pedido-construcao/gerar';
import { POST as POST_ESP } from '../demandas/[id]/especificacoes/route';
import { POST as POST_RSK } from '../demandas/[id]/pareceres-risco/route';
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
// D3 do 0013: o corpo leva a confirmação de que o texto não tem dado pessoal, em JSON (C-15 exige Content-Type JSON com
// cookie). Os testes da recusa sem ela trocam o corpo por `extra.corpo`.
const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const gerar = (decId: string, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(POST, {
    metodo: 'POST',
    caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}/pedido-construcao`,
    params: { decId },
    corpo: CONFIRMADO,
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
    expect(texto).toBe((await gerarPedido(deps, decisora, decId, CONFIRMADO)).json);
    const p = JSON.parse(texto);
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
    // D2 do 0013: o papel de quem aprovou, e não o nome.
    expect(p).toMatchObject({ pedido: decId, risco: { nivel: 'alto' }, decisao: { id: decId, opcaoEscolhida: 'A: Opção A', aprovadoPor: 'cto' } });
    expect(texto).not.toContain('Pessoa Ficticia Decisora');
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

// M-08 pela rota (DEC-DEM-20261103-0007-v1, 04-regressao): DEC aprovado de demanda em status final não gera Pedido. O
// corpo exato do 409, sem download nem evento; a matriz vem antes; nos status não finais, gera como antes.
describe('POST /api/pacotes-decisao/:decId/pedido-construcao: demanda em status final (M-08)', () => {
  const levar = async (demandaId: string, status: Array<'aprovada' | 'em_construcao' | 'entregue' | 'encerrada'>) => {
    for (const s of status) await alterarDemanda(deps, novaAutora(), demandaId, alterarDemandaSchema.parse({ status: s }));
  };
  const RECUSA = { erro: 'conflito', mensagem: MENSAGENS_PEDIDO.demandaFinal };

  it.each([
    ['entregue', ['aprovada', 'em_construcao', 'entregue']],
    ['encerrada', ['encerrada']],
  ] as const)('DEC aprovado em demanda %s → 409 com a mensagem fixa, sem download nem evento pedido_gerado', async (_final, caminho) => {
    const { decId, demandaId } = await prepararDec();
    await levar(demandaId, [...caminho]);
    for (const cred of [cto(), adm()]) {
      const r = await gerar(decId, cred);
      expect(r.status).toBe(409);
      expect(r.headers.get('content-disposition')).toBeNull();
      expect(await r.json()).toEqual(RECUSA);
    }
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('DEC pendente em demanda encerrada → 409 da demanda final (a demanda vem antes do status do DEC)', async () => {
    const { decId, demandaId } = await prepararDec({ aprovar: false });
    await levar(demandaId, ['encerrada']);
    const r = await gerar(decId);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual(RECUSA);
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('a matriz vem antes do status: token de agente segue 403 em demanda encerrada, sem evento', async () => {
    const { decId, demandaId } = await prepararDec();
    await levar(demandaId, ['encerrada']);
    for (const agente of AGENTES) {
      const r = await gerar(decId, { bearer: tokens[agente] });
      expect(r.status, agente).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('controle: em aprovada e em_construcao, gera pela rota como antes (um evento por geração)', async () => {
    const { decId, demandaId } = await prepararDec();
    await levar(demandaId, ['aprovada']);
    expect((await gerar(decId)).status).toBe(200);
    await levar(demandaId, ['em_construcao']);
    expect((await gerar(decId)).status).toBe(200);
    expect(await eventosDoPedido(decId)).toBe(2);
  });
});

// D3 do 0013: o corpo do POST leva a confirmação. Sem ela (ou com false), 422 com a mensagem, sem download nem evento;
// tipo errado, 400 como em todo corpo; chave a mais é descartada (C-11, z.object); POST sem corpo, 400 (JSON inválido).
describe('POST /api/pacotes-decisao/:decId/pedido-construcao: confirmação sem dado pessoal (D3 do 0013)', () => {
  it('corpo {} e {"confirmaSemDadoPessoal": false} → 422 com a mensagem, sem download e sem evento', async () => {
    const { decId } = await prepararDec();
    for (const corpo of [{}, { confirmaSemDadoPessoal: false }]) {
      const r = await gerar(decId, cto(), { corpo });
      expect(r.status, JSON.stringify(corpo)).toBe(422);
      expect(r.headers.get('content-disposition')).toBeNull();
      expect(await r.json()).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.semConfirmacao });
    }
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('{"confirmaSemDadoPessoal": "true"} e 1 → 400 entrada_invalida, sem evento', async () => {
    const { decId } = await prepararDec();
    for (const valor of ['true', 1]) {
      const r = await gerar(decId, cto(), { corpo: { confirmaSemDadoPessoal: valor } });
      expect(r.status, String(valor)).toBe(400);
      expect(await r.json()).toMatchObject({ erro: 'entrada_invalida' });
    }
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('POST sem corpo → 400 (JSON inválido), sem evento', async () => {
    const { decId } = await prepararDec();
    const r = await gerar(decId, cto(), { corpo: '' });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ erro: 'entrada_invalida' });
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('com a confirmação e uma chave a mais → 200 (a chave é descartada, C-11), e o evento grava a confirmação', async () => {
    const { decId } = await prepararDec();
    const r = await gerar(decId, cto(), { corpo: { ...CONFIRMADO, outra: 'x' } });
    expect(r.status).toBe(200);
    expect(await r.text()).toBe((await gerarPedido(deps, decisora, decId, CONFIRMADO)).json);
    const { rows } = await b.poolMigrator.query<{ depois: unknown }>(`select depois from evento where entidade_id = $1 and acao = 'pedido_gerado'`, [decId]);
    expect(rows.map((l) => l.depois)).toEqual([{ confirmaSemDadoPessoal: true }, { confirmaSemDadoPessoal: true }]);
  });

  it('token de agente com a confirmação → 403, sem evento', async () => {
    const { decId } = await prepararDec();
    for (const agente of AGENTES) expect((await gerar(decId, { bearer: tokens[agente] }, { corpo: CONFIRMADO })).status, agente).toBe(403);
    expect(await eventosDoPedido(decId)).toBe(0);
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

// M-a (DEC-DEM-20261103-0009-v1): a minimização do texto livre vale só para a vista do agente na API. O Pedido de
// Construção continua lendo o banco: o título, a descrição, a ESP e o RSK saem como gravados, sem marcador. Desde o D1
// do 0013, o nome do solicitante, inteiro ou em parte, nesses textos recusa a geração (422 com o caminho e o tipo
// "nome"); o nome de outra pessoa não é detectado e sai como gravado (fica com a confirmação). Nomes fictícios.
describe('POST /api/pacotes-decisao/:decId/pedido-construcao: texto original (M-a) e nome do solicitante (D1 do 0013)', () => {
  const TODOS_COM_NOME = [
    'demanda.titulo: nome',
    'demanda.descricao: nome',
    'especificacao.conteudo: nome',
    'risco.conteudo: nome',
    'decisao.opcaoEscolhida: nome',
    'criterios_aceite_preliminares[0]: nome',
  ];

  // Demanda, ESP, RSK e DEC aprovado com `trecho` em todo texto escrito por pessoa.
  async function decComTrecho(solicitante: string, titulo: string, trecho: string): Promise<string> {
    const autora = novaAutora();
    const d = await criarDemanda(deps, autora, criarDemandaSchema.parse({ titulo, tipo: 'bug', solicitanteNome: solicitante, contexto: trecho }));
    await criarEspecificacao(
      deps,
      autora,
      d.id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: trecho,
        escopoInclui: [trecho],
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: [trecho],
        definicaoDePronto: ['p'],
      }),
    );
    await criarParecerRisco(
      deps,
      autora,
      d.id,
      criarParecerRiscoSchema.parse({ resumo: trecho, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo', preCondicoes: [trecho] }),
    );
    const dec = await criarPacoteDecisao(
      deps,
      autora,
      d.id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: trecho }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: 'cto' }),
    );
    await registrarDecisao(deps, decisora, dec.id, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
    return dec.id;
  }

  it('D1 do 0013: o nome inteiro do solicitante em todo texto → 422 com cada caminho e o tipo "nome", sem o valor, sem download nem evento', async () => {
    const solicitante = 'Joana Fictícia Teste';
    const decId = await decComTrecho(solicitante, `Erro no cadastro da ${solicitante}`, `Falar com ${solicitante}`);
    const r = await gerar(decId);
    expect(r.status).toBe(422);
    expect(r.headers.get('content-disposition')).toBeNull();
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: TODOS_COM_NOME });
    expect(texto).not.toMatch(/joana|fict[ií]cia|teste/i);
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('D1 do 0013: "A Joana pediu" (parte do nome com maiúscula) → 422 em todo campo, sem o valor', async () => {
    const decId = await decComTrecho('Joana Ficticia', 'Relatório da Joana', 'A Joana pediu o relatório mensal.');
    const r = await gerar(decId);
    expect(r.status).toBe(422);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: TODOS_COM_NOME });
    expect(texto).not.toMatch(/joana|ficticia/i);
    expect(await eventosDoPedido(decId)).toBe(0);
  });

  it('M-a: o nome de outra pessoa no texto não é do solicitante; o pedido mantém título, descrição, ESP e RSK originais, sem marcador', async () => {
    const outra = 'Joana Fictícia Teste';
    const trecho = `Falar com ${outra}`;
    const decId = await decComTrecho('Carlos Ficticio Solicitante', `Erro no cadastro da ${outra}`, trecho);
    const r = await gerar(decId);
    expect(r.status).toBe(200);
    const p = JSON.parse(await r.text());
    expect(p.demanda).toMatchObject({ titulo: `Erro no cadastro da ${outra}`, descricao: `Contexto: ${trecho}` });
    expect(p.especificacao.conteudo).toBe(`Descrição objetiva: ${trecho}\n\nEscopo inclui:\n- ${trecho}`);
    expect(p.risco.conteudo).toContain(`Resumo: ${trecho}`);
    expect(p.risco.conteudo).toContain(`Pré-condições:\n- ${trecho}`);
    expect(p.decisao.opcaoEscolhida).toBe(`A: ${trecho}`);
    expect(p.criterios_aceite_preliminares).toEqual([trecho]);
    expect(p.risco.conteudo).not.toContain('[nome removido]');
  });

  it('M-a: palavra comum em minúscula igual a parte do nome do solicitante sai como gravada', async () => {
    const trecho = 'Em 30 dias: camisa rosa e os campos do formulário.';
    const decId = await decComTrecho('Carla Rosa Campos Dias', 'Relatório mensal', trecho);
    const r = await gerar(decId);
    expect(r.status).toBe(200);
    const texto = await r.text();
    const p = JSON.parse(texto);
    expect(p.especificacao.conteudo).toBe(`Descrição objetiva: ${trecho}\n\nEscopo inclui:\n- ${trecho}`);
    expect(p.decisao.opcaoEscolhida).toBe(`A: ${trecho}`);
    expect(texto).not.toContain('[nome removido]');
  });

  // 04-regressao do 0011 (qa-automacao), contraprova do CA 3 pelo caminho do agente: a ESP e o RSK são gravados pelos
  // agentes pelas rotas, cujo 201 vem minimizado; o banco guarda o texto que o agente mandou, com as partes do nome, a
  // palavra comum em minúscula e a partícula. Desde o D1 do 0013, esse texto, com as partes do nome do solicitante, não
  // sai no Pedido de Construção: a geração é recusada com o caminho e o tipo, sem o valor. Nome fictício.
  it('M-1 do 0009 (04-regressao do 0011) e D1 do 0013: ESP e RSK gravados pelos agentes nas rotas; o 201 vem minimizado e o pedido é recusado pelo nome', async () => {
    const trecho = 'A Carla pediu os dados dos clientes em 30 dias; camisa rosa e os campos do formulário; Rosa e Campos assinaram.';
    const minimo = 'A [nome removido] pediu os dados dos clientes em 30 dias; camisa rosa e os campos do formulário; [nome removido] e [nome removido] assinaram.';
    const autora = novaAutora();
    const d = await criarDemanda(
      deps,
      autora,
      criarDemandaSchema.parse({ titulo: 'Relatório da Carla', tipo: 'bug', solicitanteNome: 'Carla dos Santos Rosa Campos Dias', contexto: trecho }),
    );
    const postar = async (h: typeof POST_ESP, recurso: string, corpo: unknown, bearer: string) => {
      const r = await chamarRota(h, { metodo: 'POST', caminho: `/api/demandas/${d.id}/${recurso}`, params: { id: d.id }, corpo, bearer });
      expect(r.status, recurso).toBe(201);
      return (await r.json()) as Record<string, unknown>;
    };
    const esp = await postar(
      POST_ESP,
      'especificacoes',
      {
        descricaoObjetiva: trecho,
        escopoInclui: [trecho],
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: [trecho],
        definicaoDePronto: ['p'],
      },
      tokens.insumo_tecnico,
    );
    const rsk = await postar(
      POST_RSK,
      'pareceres-risco',
      { resumo: trecho, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo', preCondicoes: [trecho] },
      tokens.risco,
    );
    expect(esp).toMatchObject({ descricaoObjetiva: minimo, escopoInclui: [minimo], criteriosAceitePreliminares: [minimo] });
    expect(rsk).toMatchObject({ resumo: minimo, preCondicoes: [minimo] });

    const dec = await criarPacoteDecisao(
      deps,
      autora,
      d.id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: trecho }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: 'cto' }),
    );
    // O DEC cita os rascunhos dos agentes: quem decide marca que os revisou.
    await registrarDecisao(deps, decisora, dec.id, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', revisouRascunhosDeAgente: true }));
    const r = await gerar(dec.id);
    expect(r.status).toBe(422);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: TODOS_COM_NOME });
    expect(texto).not.toMatch(/Carla|Rosa|Campos|Santos|Dias/);
    expect(texto).not.toContain('[nome removido]');
    expect(await eventosDoPedido(dec.id)).toBe(0);
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
