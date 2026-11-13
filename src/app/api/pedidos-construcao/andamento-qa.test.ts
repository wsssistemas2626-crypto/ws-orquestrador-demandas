// 06-T08-testes do DEC-DEM-20261111-0017-v1 (qa-automacao): reforço da rota POST /api/pedidos-construcao/:decId/andamento
// nas bordas que andamento.test.ts e andamento-422.test.ts não cobrem:
//   1. credencial: sem Bearer, Bearer fora do formato, inexistente, revogado pelo prefixo (RSK do 01: "revogação pelo
//      prefixo") e token só na query dão o mesmo 401, byte a byte; Bearer com cookie de sessão dá 400 (ambíguo) com
//      `Origin` certo e 403 (C-15) sem ele (RF-02); nada é gravado e a linha do log não leva o token;
//   2. ordem das recusas (AN-01 e AN-02): quem não pode registrar andamento recebe o mesmo 403 (ou 401) com corpo
//      inválido e com corpo válido, então o 422 não serve de oráculo do formato para outro ator; o id fora da regex dá o
//      mesmo 404 com qualquer corpo e sem credencial;
//   3. CA-02.7: variantes de id fora da regex (caixa, espaço, quebra de linha, dígitos a mais e a menos, outro prefixo,
//      `..`) dão o 404 do DEC inexistente, sem conexão nem consulta no pool do app.
// Banco, rota e tokens reais (Testcontainers); relógio fixo; cada caso monta os próprios DEC; dados fictícios; os tokens
// só nascem em tempo de teste e nunca vão a mensagem de expect.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CORPO_CONSTRUINDO, retratoDa } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { tokenDeIntegracao } from '../../../../test/integracoes';
import { chamadasDoConstruir, preparadorDePedidos, totalDeEventos } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, criarTokenServico, revogarTokenServico } from '../../../modules/acesso/tokens-servico';
import * as rotaAndamento from './[decId]/andamento/route';

const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const CORPO_DO_CONSTRUIR = JSON.stringify(CORPO_CONSTRUINDO);
// Corpos que o /construir nunca manda e que dariam 422 ao token `construir`.
const CORPOS_INVALIDOS = [
  JSON.stringify({ ...CORPO_CONSTRUINDO, nota: 'x' }),
  JSON.stringify({ ...CORPO_CONSTRUINDO, tarefasProntas: 18 }),
  JSON.stringify({ ...CORPO_CONSTRUINDO, fase: 'Construindo' }),
  '[]',
];
// No formato do token (wsod_ + 43 caracteres), mas que nunca foi emitido.
const TOKEN_FICTICIO = `wsod_${'A'.repeat(43)}`;

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let tokenAwave: string;
const linhasDoLog: string[] = [];
const relogio = relogioFixo('2026-11-12T12:00:00Z');
const construir = chamadasDoConstruir(() => tokenConstruir);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'andamento-rota-qa', entregar: (decId) => construir.entregar(decId) });

async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

// A requisição crua, para os casos em que o helper do /construir não monta o que o caso quer (cookie com Bearer, token
// na query).
const chamarCru = (decId: string, op: { bearer?: string; cookie?: string; semOrigin?: boolean; corpo?: string; query?: string }) =>
  chamarRota(rotaAndamento.POST, {
    metodo: 'POST',
    caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/andamento${op.query ?? ''}`,
    params: { decId },
    bearer: op.bearer,
    cookie: op.cookie,
    semOrigin: op.semOrigin ?? true,
    corpo: op.corpo ?? CORPO_DO_CONSTRUIR,
    cabecalhos: { accept: 'application/json' },
  });

const linhasDaRota = (desde: number) =>
  linhasDoLog
    .slice(desde)
    .map((l) => JSON.parse(l) as Record<string, unknown>)
    .filter((l) => l.evento === 'requisicao' && l.rota === '/api/pedidos-construcao/[decId]/andamento');

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('credencial na rota do andamento (C-09, C-15, RF-02, RNF-04)', () => {
  it('sem Bearer, Bearer fora do formato, inexistente, revogado pelo prefixo e token só na query: o mesmo 401 byte a byte; nada gravado; o log não leva o token', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    // Um token `construir` próprio do caso, revogado pelo prefixo como o script de revogação faz.
    const revogado = await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio));
    expect(await comTransacao(deps.pool, (t) => revogarTokenServico(t, revogado.prefixo, deps.relogio))).toBe(true);
    const antes = await retratoDa(b, demandaId);
    const total = await totalDeEventos(b);
    const inicio = linhasDoLog.length;

    const semCredencial = await foto(await construir.andamento(decId, CORPO_DO_CONSTRUIR, { bearer: null }));
    expect(semCredencial.status).toBe(401);
    expect(JSON.parse(semCredencial.corpo)).toEqual({ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.nao_autenticado });

    const foraDoFormato = await foto(await construir.andamento(decId, CORPO_DO_CONSTRUIR, { bearer: 'nao-e-um-token' }));
    expect(foraDoFormato.status).toBe(401);
    expect(JSON.parse(foraDoFormato.corpo)).toEqual({ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido });
    // Inexistente e revogado: a mesma resposta do fora do formato (não diz qual dos três foi).
    expect(await foto(await construir.andamento(decId, CORPO_DO_CONSTRUIR, { bearer: TOKEN_FICTICIO }))).toEqual(foraDoFormato);
    expect(await foto(await construir.andamento(decId, CORPO_DO_CONSTRUIR, { bearer: revogado.token }))).toEqual(foraDoFormato);
    // O token nunca vale na query: sem Authorization, é o 401 de sem credencial.
    expect(await foto(await chamarCru(decId, { query: `?token=${encodeURIComponent(tokenConstruir)}` }))).toEqual(semCredencial);

    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(total);

    const linhas = linhasDaRota(inicio);
    expect(linhas.map((l) => [l.status, l.atorTipo, l.codigoErro])).toEqual(Array.from({ length: 5 }, () => [401, 'anonimo', 'nao_autenticado']));
    const texto = linhasDoLog.slice(inicio).join('\n');
    for (const p of [tokenConstruir, revogado.token, revogado.token.slice('wsod_'.length + 8), TOKEN_FICTICIO, 'wsod_', revogado.prefixo, decId])
      expect(texto.includes(p), 'credencial ou id na linha do log').toBe(false);

    // Controle: o token `construir` ativo, na mesma requisição, grava (o 401 acima é da credencial).
    expect((await construir.andamento(decId, CORPO_DO_CONSTRUIR)).status).toBe(204);
  });

  it('Bearer do construir com cookie de sessão: 400 ambíguo com Origin certo, 403 (CSRF) sem Origin; nada gravado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const { cookie } = await criarPessoa(deps, { papel: 'cto' });
    const antes = await retratoDa(b, demandaId);
    const total = await totalDeEventos(b);

    const comOrigin = await chamarCru(decId, { bearer: tokenConstruir, cookie, semOrigin: false });
    expect(comOrigin.status).toBe(400);
    expect(await comOrigin.json()).toEqual({ erro: 'entrada_invalida', mensagem: MENSAGENS_ACESSO.ambiguo });

    const semOrigin = await chamarCru(decId, { bearer: tokenConstruir, cookie, semOrigin: true });
    expect(semOrigin.status).toBe(403);
    expect(await semOrigin.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });

    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(total);
  });
});

describe('ordem das recusas: o 422 só existe para o /construir (AN-01, AN-02)', () => {
  it('awave, agente e pessoa com corpo inválido recebem o mesmo 403 do corpo válido; sem credencial, o mesmo 401; nada gravado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const tokenAgente = (await comTransacao(deps.pool, (t) => criarTokenServico(t, 'orquestrador', deps.relogio))).token;
    const { cookie } = await criarPessoa(deps, { papel: 'administradora' });
    const quem: Array<[string, (corpo: string) => Promise<Response>]> = [
      ['awave', (c) => construir.andamento(decId, c, { bearer: tokenAwave })],
      ['agente orquestrador', (c) => construir.andamento(decId, c, { bearer: tokenAgente })],
      ['pessoa administradora', (c) => construir.andamento(decId, c, { bearer: null, semOrigin: false, cabecalhos: { cookie } })],
      ['sem credencial', (c) => construir.andamento(decId, c, { bearer: null })],
    ];
    const antes = await retratoDa(b, demandaId);
    const total = await totalDeEventos(b);

    for (const [nome, chamar] of quem) {
      const referencia = await foto(await chamar(CORPO_DO_CONSTRUIR));
      expect(referencia.status, nome).toBe(nome === 'sem credencial' ? 401 : 403);
      for (const c of CORPOS_INVALIDOS) expect(await foto(await chamar(c)), nome).toEqual(referencia);
    }

    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(total);
    // Controle: o mesmo corpo inválido com o token `construir` é o 422 (os corpos de cima são mesmo inválidos).
    for (const c of CORPOS_INVALIDOS) expect((await construir.andamento(decId, c)).status).toBe(422);
  });

  it('id fora da regex: o mesmo 404 com corpo válido, com corpo inválido, sem credencial e com token de outro ator', async () => {
    const referencia = await foto(await construir.andamento('DEC-xyz', CORPO_DO_CONSTRUIR));
    expect(referencia.status).toBe(404);
    expect(JSON.parse(referencia.corpo)).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    for (const c of CORPOS_INVALIDOS) expect(await foto(await construir.andamento('DEC-xyz', c))).toEqual(referencia);
    expect(await foto(await construir.andamento('DEC-xyz', CORPO_DO_CONSTRUIR, { bearer: null }))).toEqual(referencia);
    expect(await foto(await construir.andamento('DEC-xyz', CORPOS_INVALIDOS[0], { bearer: tokenAwave }))).toEqual(referencia);
  });
});

describe('CA-02.7: id fora da regex, em todas as formas, é o 404 do inexistente sem tocar o banco', () => {
  it('caixa baixa, espaço, quebra de linha, dígitos a mais e a menos, versão longa, outro prefixo e "..": 404 igual ao do DEC inexistente; nenhuma conexão nem consulta; nada muda', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const antes = await retratoDa(b, demandaId);
    const total = await totalDeEventos(b);
    const referencia = await foto(await construir.andamento(INEXISTENTE, CORPO_DO_CONSTRUIR));
    expect(referencia.status).toBe(404);

    const variantes: Array<[string, string]> = [
      ['caixa baixa', decId.toLowerCase()],
      ['espaço no fim', `${decId} `],
      ['espaço no começo', ` ${decId}`],
      ['quebra de linha no fim', `${decId}\n`],
      ['sem a versão', decId.replace(/-v\d+$/, '')],
      ['versão com 5 dígitos', decId.replace(/-v\d+$/, '-v10000')],
      ['data com 7 dígitos', decId.replace(/^DEC-DEM-\d{8}/, 'DEC-DEM-2026111')],
      ['prefixo ESP', decId.replace(/^DEC/, 'ESP')],
      ['subida de pasta', `${decId}/../${INEXISTENTE}`],
      ['vazio', ''],
    ];
    for (const [nome, id] of variantes) expect(id, nome).not.toBe(decId);

    const connect = vi.spyOn(b.poolApp, 'connect');
    const query = vi.spyOn(b.poolApp, 'query');
    try {
      for (const [nome, id] of variantes) expect(await foto(await construir.andamento(id, CORPO_DO_CONSTRUIR)), nome).toEqual(referencia);
      expect(connect).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    } finally {
      connect.mockRestore();
      query.mockRestore();
    }

    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(total);
    // Controle: o id certo, na mesma rota, grava.
    expect((await construir.andamento(decId, CORPO_DO_CONSTRUIR)).status).toBe(204);
  });
});
