// Decisão do pacote (T21) pela API: PATCH /api/pacotes-decisao/:decId/decisao. RF-13, RF-14, RF-02 (CA-02.1), RF-11
// (CA-11.3), RF-12 (CA-12.2), C-11, C-12, C-15, C-17 e C-21. Banco, Better Auth e tokens reais (Testcontainers); o
// relógio é fixo (RNF-15). Os handlers são chamados como o Next chama, pelo ajudante de test/requisicao.ts. A matriz
// inteira desta rota fica no teste que percorre todas as rotas (test/matriz-rotas.test.ts). Dados só fictícios.
//
// A demanda, a ESP, o RSK e o DEC de cada cenário são gravados pelo serviço com uma autora fictícia própria (o limite
// por hora, C-36, conta por autor); a decisão vem sempre pela rota, com a sessão do CTO ou da administradora.
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
import { AGENTES, type Agente, type AtorAgente, type AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { alterarDemandaSchema, criarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { MENSAGENS_DECISAO } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import * as rotaDaDecisao from './[decId]/decisao/route';
import { PATCH } from './[decId]/decisao/route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let cookieCtoSem2fa: string;
let ctoId: string;
let admId: string;
const tokens = {} as Record<Agente, string>;
const linhasDeLog: string[] = [];
let autoras = 0;

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const DOC = { referenciaDocumento: 'DOC-FICTICIO-003', dataDocumento: '2026-10-21' };
const APROVAR_A = { statusDecisao: 'aprovada', opcaoEscolhida: 'A' };

const cto = (): Credencial => ({ cookie: cookieCto });
const adm = (): Credencial => ({ cookie: cookieAdm });
const decidir = (decId: string, corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(PATCH, { metodo: 'PATCH', caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}/decisao`, params: { decId }, corpo, ...cred, ...extra });

// Uma autora fictícia por cenário: o limite por hora (C-36) é por autor.
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-autora-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });

async function prepararDec(op: { nivel?: 'cto' | 'cto_e_administradora'; decPor?: AtorAgente } = {}): Promise<{ demandaId: string; decId: string }> {
  const autora = novaAutora();
  const d = await criarDemanda(deps, autora, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(
    deps,
    autora,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'x',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    }),
  );
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  const dec = await criarPacoteDecisao(
    deps,
    op.decPor ?? autora,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'Opção A' }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: op.nivel ?? 'cto' }),
  );
  return { demandaId: d.id, decId: dec.id };
}

const contar = async (tabela: 'decisao' | 'aprovacao', decId: string) =>
  Number((await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from ${tabela} where pacote_decisao_id = $1`, [decId])).rows[0]!.n);
const eventosDaDecisao = async (decId: string) =>
  Number(
    (await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento where entidade_id = $1 and acao in ('aprovacao_registrada', 'decisao_registrada')`, [decId])).rows[0]!.n,
  );
const statusDa = async (demandaId: string) => (await b.poolMigrator.query<{ status: string }>('select status from demanda where id = $1', [demandaId])).rows[0]!.status;

async function semMudanca(decId: string): Promise<void> {
  expect(await contar('decisao', decId)).toBe(0);
  expect(await contar('aprovacao', decId)).toBe(0);
  expect(await eventosDaDecisao(decId)).toBe(0);
}

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  const pessoaCto = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = pessoaCto.cookie;
  ctoId = pessoaCto.usuarioId;
  const pessoaAdm = await criarPessoa(deps, { papel: 'administradora' });
  cookieAdm = pessoaAdm.cookie;
  admId = pessoaAdm.usuarioId;
  cookieCtoSem2fa = (await criarPessoa(deps, { papel: 'cto', com2fa: false })).cookie;
  for (const agente of AGENTES) tokens[agente] = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, agente, deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('PATCH /api/pacotes-decisao/:decId/decisao: aprovação', () => {
  it('CA-13.1 pela rota: CTO aprova A → 200 com o pacote aprovado e o resultado, no-store', async () => {
    const { decId, demandaId } = await prepararDec();
    const r = await decidir(decId, APROVAR_A);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const corpo = (await r.json()) as { resultado: string; pacote: Record<string, unknown> };
    expect(corpo.resultado).toBe('aprovada');
    expect(corpo.pacote).toMatchObject({
      id: decId,
      statusDecisao: 'aprovada',
      desatualizado: false,
      decisao: { opcaoEscolhida: 'A', decididaPor: 'Pessoa Ficticia', comentarios: null, decididaEm: deps.relogio.agora().toISOString() },
      aprovadores: [{ papel: 'cto', nome: 'Pessoa Ficticia', opcao: 'A', referenciaDocumento: null, dataDocumento: null }],
    });
    expect(JSON.stringify(corpo)).not.toContain(ctoId);
    // P1-d: aprovar não muda o status da demanda.
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
  });

  it('CA-13.5 e C-11 pela rota: nome, papel e autoria do corpo são ignorados', async () => {
    const { decId } = await prepararDec();
    const r = await decidir(decId, { ...APROVAR_A, aprovadorNome: SENTINELAS.nome, aprovadorPapel: 'administradora', papelAprovacao: 'administradora', decididaPor: 'u-outra' });
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect((JSON.parse(texto) as { pacote: { aprovadores: unknown[] } }).pacote.aprovadores).toEqual([expect.objectContaining({ papel: 'cto', nome: 'Pessoa Ficticia' })]);
    const linha = (await b.poolMigrator.query<Record<string, unknown>>('select papel_aprovacao, nome_aprovador, registrada_por from aprovacao where pacote_decisao_id = $1', [decId])).rows;
    expect(linha).toEqual([{ papel_aprovacao: 'cto', nome_aprovador: 'Pessoa Ficticia', registrada_por: ctoId }]);
  });

  it('CA-13.2 e CA-13.3 pela rota: opção C e aprovada sem opção → 400 com o campo, sem o valor recebido, e nada gravado', async () => {
    const { decId } = await prepararDec();
    for (const corpo of [{ statusDecisao: 'aprovada', opcaoEscolhida: SENTINELAS.texto }, { statusDecisao: 'aprovada', opcaoEscolhida: 'C' }, { statusDecisao: 'aprovada' }]) {
      const r = await decidir(decId, corpo);
      expect(r.status).toBe(400);
      const texto = await r.text();
      expect(contemSentinela(texto)).toBe(false);
      const json = JSON.parse(texto) as { erro: string; campos: Array<{ campo: string }> };
      expect(json.erro).toBe('entrada_invalida');
      expect(json.campos.map((c) => c.campo)).toEqual(['opcaoEscolhida']);
    }
    await semMudanca(decId);
  });

  it('statusDecisao fora da lista → 400 com o campo, sem o valor recebido', async () => {
    const { decId } = await prepararDec();
    const r = await decidir(decId, { statusDecisao: SENTINELAS.texto });
    expect(r.status).toBe(400);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect((JSON.parse(texto) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['statusDecisao']);
    await semMudanca(decId);
  });

  it('CA-13.4 pela rota: DEC do agente consolidacao sem a confirmação → 400 com o campo e a mensagem da 03; com ela, 200', async () => {
    const { decId } = await prepararDec({ decPor: { tipo: 'agente', agente: 'consolidacao', prefixoToken: null } });
    const r = await decidir(decId, APROVAR_A);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [{ campo: 'revisouRascunhosDeAgente', mensagem: 'Marque que revisou os rascunhos de agente para registrar a decisão.' }],
    });
    await semMudanca(decId);
    const ok = await decidir(decId, { ...APROVAR_A, revisouRascunhosDeAgente: true });
    expect(ok.status).toBe(200);
  });

  it('CA-11.3 pela rota: segunda decisão → 409 com a mensagem da 03', async () => {
    const { decId } = await prepararDec();
    expect((await decidir(decId, { statusDecisao: 'devolvida' })).status).toBe(200);
    const r = await decidir(decId, APROVAR_A);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'este pacote já tem decisão registrada.' });
    expect(await contar('decisao', decId)).toBe(1);
  });

  it('CA-12.2 pela rota: DEC desatualizado → 409 ao aprovar, e continua pendente', async () => {
    const { decId, demandaId } = await prepararDec();
    await criarParecerRisco(deps, novaAutora(), demandaId, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const r = await decidir(decId, APROVAR_A);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'o pacote está desatualizado e não pode ser aprovado.' });
    await semMudanca(decId);
  });
});

describe('PATCH /api/pacotes-decisao/:decId/decisao: dupla aprovação', () => {
  it('CA-14.1 a CA-14.3 pela rota: CTO → parcial; administradora sem documento → 400; com documento → aprovada', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    const parcial = await decidir(decId, APROVAR_A);
    expect(parcial.status).toBe(200);
    expect(await parcial.json()).toMatchObject({ resultado: 'aprovacao_parcial', pacote: { statusDecisao: 'pendente', decisao: null, aprovadores: [{ papel: 'cto' }] } });

    const semDoc = await decidir(decId, APROVAR_A, adm());
    expect(semDoc.status).toBe(400);
    expect(await semDoc.json()).toEqual({
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [
        { campo: 'referenciaDocumento', mensagem: 'Informe o identificador do documento assinado.' },
        { campo: 'dataDocumento', mensagem: 'Informe a data da assinatura.' },
      ],
    });
    expect(await contar('aprovacao', decId)).toBe(1);

    const completa = await decidir(decId, { ...APROVAR_A, ...DOC }, adm());
    expect(completa.status).toBe(200);
    const aprovada = (await completa.json()) as { resultado: string; pacote: { statusDecisao: string; decisao: unknown; aprovadores: unknown[] } };
    expect(aprovada).toMatchObject({ resultado: 'aprovada', pacote: { statusDecisao: 'aprovada', decisao: { opcaoEscolhida: 'A' } } });
    // Com o relógio parado, as duas têm o mesmo instante, e a vista ordena pelo papel.
    expect(aprovada.pacote.aprovadores).toHaveLength(2);
    expect(aprovada.pacote.aprovadores).toEqual(
      expect.arrayContaining([expect.objectContaining({ papel: 'cto', opcao: 'A' }), expect.objectContaining({ papel: 'administradora', opcao: 'A', ...DOC })]),
    );
    const registradas = (await b.poolMigrator.query<{ registrada_por: string }>('select registrada_por from aprovacao where pacote_decisao_id = $1 order by registrada_em, papel_aprovacao', [decId])).rows;
    expect(registradas.map((l) => l.registrada_por).sort()).toEqual([admId, ctoId].sort());
  });

  it('CA-14.4 pela rota: CTO com A e administradora com B → 409', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    expect((await decidir(decId, APROVAR_A)).status).toBe(200);
    const r = await decidir(decId, { statusDecisao: 'aprovada', opcaoEscolhida: 'B', ...DOC }, adm());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'a opção precisa ser a mesma aprovada pelo CTO.' });
    expect(await contar('aprovacao', decId)).toBe(1);
    expect(await contar('decisao', decId)).toBe(0);
  });

  it('C-12 e P1-b pela rota: administradora aprovando DEC de nível cto → 403; CTO com registrarComo administradora → 403', async () => {
    const nivelCto = await prepararDec();
    const r1 = await decidir(nivelCto.decId, { ...APROVAR_A, ...DOC }, adm());
    expect(r1.status).toBe(403);
    expect(await r1.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    await semMudanca(nivelCto.decId);
    const dupla = await prepararDec({ nivel: 'cto_e_administradora' });
    const r2 = await decidir(dupla.decId, { ...APROVAR_A, ...DOC, registrarComo: 'administradora' });
    expect(r2.status).toBe(403);
    await semMudanca(dupla.decId);
  });
});

describe('PATCH /api/pacotes-decisao/:decId/decisao: devolver e arquivar', () => {
  it('devolvida → 200 e a demanda volta a em_analise; arquivada → encerrada', async () => {
    const devolver = await prepararDec();
    const r1 = await decidir(devolver.decId, { statusDecisao: 'devolvida', comentarios: 'Refazer a análise' });
    expect(r1.status).toBe(200);
    expect(await r1.json()).toMatchObject({ resultado: 'devolvida', pacote: { statusDecisao: 'devolvida', decisao: { opcaoEscolhida: null, comentarios: 'Refazer a análise' } } });
    expect(await statusDa(devolver.demandaId)).toBe('em_analise');
    const arquivar = await prepararDec();
    const r2 = await decidir(arquivar.decId, { statusDecisao: 'arquivada' }, adm());
    expect(r2.status).toBe(200);
    expect(await statusDa(arquivar.demandaId)).toBe('encerrada');
  });
});

describe('PATCH /api/pacotes-decisao/:decId/decisao: acesso', () => {
  it('CA-02.1: token de cada agente (o risco inclusive) → 403, e nada muda no DEC nem no histórico', async () => {
    const { decId } = await prepararDec();
    for (const agente of AGENTES) {
      const r = await decidir(decId, { ...APROVAR_A, revisouRascunhosDeAgente: true }, { bearer: tokens[agente] });
      expect(r.status, agente).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    await semMudanca(decId);
  });

  it('pessoa sem 2FA → 403; sem sessão nem token → 401; nada gravado', async () => {
    const { decId } = await prepararDec();
    expect((await decidir(decId, APROVAR_A, { cookie: cookieCtoSem2fa })).status).toBe(403);
    expect((await decidir(decId, APROVAR_A, {})).status).toBe(401);
    await semMudanca(decId);
  });

  it('C-15: com cookie e Origin de outro site → 403; corpo que não é JSON → 415; nada gravado', async () => {
    const { decId } = await prepararDec();
    expect((await decidir(decId, APROVAR_A, cto(), { cabecalhos: { origin: 'https://outro.test' } })).status).toBe(403);
    expect((await decidir(decId, 'statusDecisao=aprovada', cto(), { cabecalhos: { 'content-type': 'application/x-www-form-urlencoded' } })).status).toBe(415);
    await semMudanca(decId);
  });

  it('DEC que não existe → 404', async () => {
    const r = await decidir('DEC-DEM-20261022-9999-v1', APROVAR_A);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const decId of ['DEC-DEM-2026-1-v1', 'ESP-DEM-20261022-0001-v1', "DEC-DEM-20261022-0001-v1' or 1=1", 'DEC-DEM-20261022-0001-v12345', 'x']) {
        for (const cred of [cto(), {}]) {
          const r = await decidir(decId, APROVAR_A, cred);
          expect(r.status, decId).toBe(404);
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

  it('a rota da decisão só exporta PATCH', () => {
    const metodos = Object.keys(rotaDaDecisao as Record<string, unknown>).filter((k) => /^[A-Z]+$/.test(k));
    expect(metodos).toEqual(['PATCH']);
    expect(PATCH.meta).toMatchObject({ acao: 'registrar_decisao', rota: '/api/pacotes-decisao/[decId]/decisao' });
  });
});

// M-08 pela rota (DEC-DEM-20261103-0007-v1, 04-regressao): o contrato HTTP da recusa por demanda em status final. A
// regra do domínio está em decidir-bordas.test.ts; aqui, o corpo exato do 409, a ordem em relação à matriz e a cena da
// tela (arquivar encerra a demanda, e decidir de novo nela passa a dar a recusa nova).
describe('PATCH /api/pacotes-decisao/:decId/decisao: demanda em status final (M-08)', () => {
  const encerrar = (demandaId: string) => alterarDemanda(deps, novaAutora(), demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
  const RECUSA = { erro: 'conflito', mensagem: MENSAGENS_DECISAO.demandaFinal };

  it.each([
    ['aprovar', APROVAR_A],
    ['devolver', { statusDecisao: 'devolvida' }],
    ['arquivar', { statusDecisao: 'arquivada' }],
  ] as const)('%s um DEC pendente de demanda encerrada à mão → 409 com a mensagem fixa, nada gravado, a demanda segue encerrada', async (_acao, corpo) => {
    const { decId, demandaId } = await prepararDec();
    await encerrar(demandaId);
    const r = await decidir(decId, corpo);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual(RECUSA);
    await semMudanca(decId);
    expect(await statusDa(demandaId)).toBe('encerrada');
  });

  it('a cena da tela: arquivar encerra a demanda; decidir de novo o mesmo DEC → 409 da demanda final, não o do jaDecidido', async () => {
    const { decId, demandaId } = await prepararDec();
    expect((await decidir(decId, { statusDecisao: 'arquivada' })).status).toBe(200);
    expect(await statusDa(demandaId)).toBe('encerrada');
    for (const corpo of [APROVAR_A, { statusDecisao: 'devolvida' }, { statusDecisao: 'arquivada' }]) {
      const r = await decidir(decId, corpo);
      expect(r.status).toBe(409);
      expect(await r.json()).toEqual(RECUSA);
    }
    expect(await contar('decisao', decId)).toBe(1);
    expect(await statusDa(demandaId)).toBe('encerrada');
  });

  it('dupla aprovação: só o CTO aprovou e a demanda foi encerrada → a administradora recebe 409, sem segunda aprovação nem decisão', async () => {
    const { decId, demandaId } = await prepararDec({ nivel: 'cto_e_administradora' });
    expect((await decidir(decId, APROVAR_A)).status).toBe(200);
    await encerrar(demandaId);
    const r = await decidir(decId, { ...APROVAR_A, ...DOC }, adm());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual(RECUSA);
    expect(await contar('aprovacao', decId)).toBe(1);
    expect(await contar('decisao', decId)).toBe(0);
  });

  it('a matriz vem antes do status: token de agente e pessoa sem 2FA seguem 403, e sem credencial 401, mesmo em demanda encerrada', async () => {
    const { decId, demandaId } = await prepararDec();
    await encerrar(demandaId);
    for (const agente of AGENTES) {
      const r = await decidir(decId, APROVAR_A, { bearer: tokens[agente] });
      expect(r.status, agente).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect((await decidir(decId, APROVAR_A, { cookie: cookieCtoSem2fa })).status).toBe(403);
    expect((await decidir(decId, APROVAR_A, {})).status).toBe(401);
    await semMudanca(decId);
  });

  it('controle: demanda em status não final (em_analise) decide como antes, pela rota', async () => {
    const { decId, demandaId } = await prepararDec();
    await alterarDemanda(deps, novaAutora(), demandaId, alterarDemandaSchema.parse({ status: 'em_analise' }));
    const r = await decidir(decId, APROVAR_A);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { resultado: string }).resultado).toBe('aprovada');
  });
});

// 0.1.13 (DEC-DEM-20261104-0014-v1, R4 da 01): o DEC mais novo da demanda é aprovado pela rota mesmo com outro DEC da
// demanda já aprovado, e o anterior fica substituído. As regras de acesso da rota continuam (2FA, token de agente, sem
// credencial) e, recusada, nada é gravado nem substituído.
describe('PATCH /api/pacotes-decisao/:decId/decisao: aprovação que substitui (0.1.13)', () => {
  async function comV2Pendente(): Promise<{ demandaId: string; v1: string; v2: string }> {
    const { demandaId, decId: v1 } = await prepararDec();
    expect((await decidir(v1, APROVAR_A)).status).toBe(200);
    const v2 = (
      await criarPacoteDecisao(
        deps,
        novaAutora(),
        demandaId,
        criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'Opção A' }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: 'cto' }),
      )
    ).id;
    return { demandaId, v1, v2 };
  }
  const substituicoes = async (demandaId: string) =>
    (
      await b.poolMigrator.query<{ entidade_id: string; depois: unknown }>(
        `select entidade_id, depois from evento where demanda_id = $1 and acao = 'pacote_decisao_substituido' order by id`,
        [demandaId],
      )
    ).rows;

  it('cto com 2FA e Origin do painel: 200 com resultado aprovada; o v1 fica substituido: true, apontando o v2', async () => {
    const { demandaId, v1, v2 } = await comV2Pendente();
    const r = await decidir(v2, { statusDecisao: 'aprovada', opcaoEscolhida: 'B' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ resultado: 'aprovada', pacote: { id: v2, statusDecisao: 'aprovada', substituido: false, substituidoPor: null } });
    expect(await substituicoes(demandaId)).toEqual([{ entidade_id: v1, depois: { substituido: v1, substituidoPor: v2 } }]);
    expect(await statusDa(demandaId)).toBe('pronta_para_decisao');
  });

  it('sem 2FA, por token de agente ou sem credencial: 403 ou 401, nada gravado e nada substituído', async () => {
    const { demandaId, v2 } = await comV2Pendente();
    expect((await decidir(v2, APROVAR_A, { cookie: cookieCtoSem2fa })).status).toBe(403);
    for (const agente of AGENTES) expect((await decidir(v2, APROVAR_A, { bearer: tokens[agente] })).status, agente).toBe(403);
    expect((await decidir(v2, APROVAR_A, {})).status).toBe(401);
    await semMudanca(v2);
    expect(await substituicoes(demandaId)).toEqual([]);
  });

  // S-01 da 04-revisao: o DEC só do CTO não substitui um aprovado de dupla aprovação. 409 com a mensagem fixa, antes de
  // gravar: nenhuma linha em aprovacao ou decisao e nenhum evento de substituição.
  it('v1 aprovado pelo CTO e pela administradora; v2 só do CTO → 409 com a mensagem fixa, nada gravado e nada substituído', async () => {
    const { demandaId, decId: v1 } = await prepararDec({ nivel: 'cto_e_administradora' });
    expect((await decidir(v1, APROVAR_A)).status).toBe(200);
    expect((await decidir(v1, { ...APROVAR_A, ...DOC }, adm())).status).toBe(200);
    const v2 = (
      await criarPacoteDecisao(
        deps,
        novaAutora(),
        demandaId,
        criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'Opção A' }, opcaoB: { descricao: 'Opção B' }, nivelAprovacaoRequerido: 'cto' }),
      )
    ).id;
    const r = await decidir(v2, { statusDecisao: 'aprovada', opcaoEscolhida: 'B' });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({
      erro: 'conflito',
      mensagem:
        'o pacote aprovado em vigor nesta demanda exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Devolva ou arquive este pacote, ou crie um pacote novo com aprovação do CTO e da administradora.',
    });
    await semMudanca(v2);
    expect(await substituicoes(demandaId)).toEqual([]);
    expect(await contar('aprovacao', v1)).toBe(2);
    expect(await contar('decisao', v1)).toBe(1);
  });
});

describe('log da rota da decisão (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem id, corpo, sentinela nem token', async () => {
    const { decId } = await prepararDec();
    linhasDeLog.length = 0;
    await decidir(decId, { statusDecisao: 'aprovada', opcaoEscolhida: SENTINELAS.texto });
    await decidir(decId, { ...APROVAR_A, comentarios: `${SENTINELAS.nome} ${SENTINELAS.email}` });
    await decidir(decId, APROVAR_A, { bearer: tokens.consolidacao });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'PATCH /api/pacotes-decisao/[decId]/decisao 400',
      'PATCH /api/pacotes-decisao/[decId]/decisao 200',
      'PATCH /api/pacotes-decisao/[decId]/decisao 403',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toMatch(/DEM-\d{8}-\d{4}/);
    expect(tudo).not.toContain('opcaoEscolhida');
    expect(tudo).not.toContain(tokens.consolidacao);
    expect(contemSentinela(tudo)).toBe(false);
  });
});
