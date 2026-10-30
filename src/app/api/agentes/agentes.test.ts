// Agentes e teto pela API (T23): GET /api/agentes, PATCH /api/agentes/:agente, GET e PUT /api/configuracao/teto, e o
// registro de uso por chamada. RF-17 (CA-17.3), RF-18 (CA-18.4), RF-19 (CA-19.1, CA-19.3), C-10, C-12, C-15, C-17, C-21
// e C-26. Banco, Better Auth e tokens reais (Testcontainers); o relógio é fixo (RNF-15). Os handlers são chamados como o
// Next chama, pelo ajudante de test/requisicao.ts. A matriz inteira destas rotas fica no teste que percorre todas as
// rotas (test/matriz-rotas.test.ts). Dados só fictícios.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { AGENTES, type Agente } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { registrarUso } from '../../../modules/agentes/uso';
import * as rotaDoAgente from './[agente]/route';
import { PATCH } from './[agente]/route';
import * as rotaDosAgentes from './route';
import { GET } from './route';
import * as rotaDoTeto from '../configuracao/teto/route';
import { GET as GET_TETO, PUT as PUT_TETO } from '../configuracao/teto/route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let cookieCtoSem2fa: string;
let ctoId: string;
const tokens = {} as Record<Agente, string>;
const linhasDeLog: string[] = [];

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const cto = (): Credencial => ({ cookie: cookieCto });
const adm = (): Credencial => ({ cookie: cookieAdm });

const listar = (cred: Credencial = cto()) => chamarRota(GET, { caminho: '/api/agentes', ...cred });
const alterar = (agente: string, corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(PATCH, { metodo: 'PATCH', caminho: `/api/agentes/${encodeURIComponent(agente)}`, params: { agente }, corpo, ...cred, ...extra });
const lerTeto = (cred: Credencial = cto()) => chamarRota(GET_TETO, { caminho: '/api/configuracao/teto', ...cred });
const gravarTeto = (corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(PUT_TETO, { metodo: 'PUT', caminho: '/api/configuracao/teto', corpo, ...cred, ...extra });

const linhaDo = async (agente: Agente) =>
  (await b.poolMigrator.query<{ ligado: boolean; modelo: string | null }>('select ligado, modelo from configuracao_agente where agente = $1', [agente])).rows[0]!;
const tetoGravado = async () => (await b.poolMigrator.query<{ teto_mensal: string }>('select teto_mensal from configuracao_ia')).rows[0]!.teto_mensal;
const eventosDeConfiguracao = async () =>
  Number(
    (await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento where acao in ('agente_ligado', 'agente_desligado', 'teto_alterado')`)).rows[0]!.n,
  );

async function semMudanca(acao: () => Promise<unknown>): Promise<void> {
  const antes = { eventos: await eventosDeConfiguracao(), teto: await tetoGravado(), risco: await linhaDo('risco') };
  await acao();
  expect({ eventos: await eventosDeConfiguracao(), teto: await tetoGravado(), risco: await linhaDo('risco') }).toEqual(antes);
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
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  cookieCtoSem2fa = (await criarPessoa(deps, { papel: 'cto', com2fa: false })).cookie;
  for (const agente of AGENTES) tokens[agente] = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, agente, deps.relogio))).token;
  await b.poolMigrator.query(
    'insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)',
    ['modelo-ficticio', '2026-10-01T03:00:00Z'],
  );
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(async () => {
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null, atualizado_em = null, atualizado_por = null');
  await b.poolMigrator.query(`update configuracao_ia set teto_mensal = 0 where id = 1`);
});

describe('GET /api/agentes', () => {
  it('CA-19.1: GET /api/agentes no sistema novo → os quatro desligados', async () => {
    for (const cred of [cto(), adm()]) {
      const r = await listar(cred);
      expect(r.status).toBe(200);
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(await r.json()).toEqual({
        agentes: AGENTES.map((agente) => ({ agente, ligado: false, modelo: null, atualizadoEm: null, atualizadoPor: null })),
      });
    }
  });
});

describe('PATCH /api/agentes/:agente', () => {
  it('CA-19.3: CTO liga e desliga o risco (com modelo de preço vigente); o histórico registra quem e quando', async () => {
    const ligou = await alterar('risco', { ligado: true, modelo: 'modelo-ficticio' });
    expect(ligou.status).toBe(200);
    const corpo = (await ligou.json()) as Record<string, unknown>;
    expect(corpo).toEqual({ agente: 'risco', ligado: true, modelo: 'modelo-ficticio', atualizadoEm: deps.relogio.agora().toISOString(), atualizadoPor: { nome: 'Pessoa Ficticia' } });
    expect(JSON.stringify(corpo)).not.toContain(ctoId);

    const desligou = await alterar('risco', { ligado: false });
    expect(desligou.status).toBe(200);
    expect(await desligou.json()).toMatchObject({ agente: 'risco', ligado: false, modelo: 'modelo-ficticio' });

    const eventos = (
      await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; ocorrido_em: Date; demanda_id: string | null }>(
        `select acao, ator_tipo, ator_id, ocorrido_em, demanda_id from evento where entidade = 'configuracao_agente' and entidade_id = 'risco' order by id`,
      )
    ).rows;
    expect(eventos).toEqual([
      { acao: 'agente_ligado', ator_tipo: 'pessoa', ator_id: ctoId, ocorrido_em: deps.relogio.agora(), demanda_id: null },
      { acao: 'agente_desligado', ator_tipo: 'pessoa', ator_id: ctoId, ocorrido_em: deps.relogio.agora(), demanda_id: null },
    ]);
    // A lista mostra a última mudança.
    const lista = (await (await listar()).json()) as { agentes: Array<Record<string, unknown>> };
    expect(lista.agentes.find((a) => a.agente === 'risco')).toMatchObject({ ligado: false, atualizadoPor: { nome: 'Pessoa Ficticia' } });
  });

  it('ligar sem modelo com preço vigente → 409 e continua desligado', async () => {
    await semMudanca(async () => {
      for (const corpo of [{ ligado: true }, { ligado: true, modelo: 'modelo-sem-preco' }]) {
        const r = await alterar('risco', corpo);
        expect(r.status).toBe(409);
        expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'Não foi possível ligar o agente de risco. Ele continua desligado.' });
      }
    });
    expect(await linhaDo('risco')).toEqual({ ligado: false, modelo: null });
  });

  it('corpo inválido → 400 com o campo, sem o valor recebido, e nada muda', async () => {
    await semMudanca(async () => {
      for (const [corpo, campo] of [
        [{}, 'ligado'],
        [{ ligado: SENTINELAS.texto }, 'ligado'],
        [{ ligado: true, modelo: '' }, 'modelo'],
        [{ ligado: true, modelo: 'x'.repeat(101) }, 'modelo'],
      ] as const) {
        const r = await alterar('risco', corpo);
        expect(r.status, JSON.stringify(corpo)).toBe(400);
        const texto = await r.text();
        expect(contemSentinela(texto)).toBe(false);
        const json = JSON.parse(texto) as { erro: string; campos: Array<{ campo: string }> };
        expect(json.erro).toBe('entrada_invalida');
        expect(json.campos.map((c) => c.campo)).toEqual([campo]);
      }
    });
  });

  it('C-11: autoria e agente do corpo são ignorados; quem alterou é sempre a pessoa da sessão', async () => {
    const r = await alterar('risco', { ligado: true, modelo: 'modelo-ficticio', atualizadoPor: 'u-outra', agente: 'orquestrador' });
    expect(r.status).toBe(200);
    const linhas = (await b.poolMigrator.query<{ agente: string; atualizado_por: string | null }>('select agente, atualizado_por from configuracao_agente where ligado')).rows;
    expect(linhas).toEqual([{ agente: 'risco', atualizado_por: ctoId }]);
  });

  it('agente fora da lista → 404 sem nenhuma consulta ao banco, com ou sem credencial', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const agente of ['x', 'agente_ficticio', 'RISCO', 'risco ', "risco' or 1=1", '__proto__', 'toString']) {
        for (const cred of [cto(), {}]) {
          const r = await alterar(agente, { ligado: true, modelo: 'modelo-ficticio' }, cred);
          expect(r.status, agente).toBe(404);
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

describe('GET e PUT /api/configuracao/teto', () => {
  it('GET: sistema novo com teto 0, suspenso, em USD, com o mês e a virada', async () => {
    for (const cred of [cto(), adm()]) {
      const r = await lerTeto(cred);
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({
        tetoMensal: 0,
        moeda: 'USD',
        gastoDoMes: 0,
        percentual: 0,
        suspenso: true,
        mesReferencia: '2026-10',
        viraEm: '2026-11-01T03:00:00.000Z',
      });
    }
  });

  it('PUT: o CTO salva "10,00" → 200 com a situação nova, e o histórico registra a mudança', async () => {
    const r = await gravarTeto({ tetoMensal: '10,00' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ tetoMensal: 10, moeda: 'USD', suspenso: false });
    expect(await tetoGravado()).toBe('10.00');
    const ev = (await b.poolMigrator.query<{ ator_id: string; antes: unknown; depois: unknown }>(`select ator_id, antes, depois from evento where acao = 'teto_alterado'`)).rows;
    expect(ev).toEqual([{ ator_id: ctoId, antes: { tetoMensal: 0 }, depois: { tetoMensal: 10 } }]);
  });

  it('PUT: teto negativo ou fora do formato → 400 com a mensagem da 03, sem o valor recebido, e nada muda', async () => {
    await semMudanca(async () => {
      for (const [tetoMensal, mensagem] of [
        ['-1,00', 'O teto não pode ser negativo.'],
        ['10,123', 'Informe o teto com até duas casas decimais, por exemplo 10,00.'],
        [SENTINELAS.texto, 'Informe o teto com até duas casas decimais, por exemplo 10,00.'],
      ] as const) {
        const r = await gravarTeto({ tetoMensal });
        expect(r.status, tetoMensal).toBe(400);
        const texto = await r.text();
        expect(contemSentinela(texto)).toBe(false);
        expect(JSON.parse(texto)).toEqual({ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos: [{ campo: 'tetoMensal', mensagem }] });
      }
    });
  });
});

describe('acesso às rotas de agentes e teto', () => {
  it('C-12 e C-26: administradora em PATCH /api/agentes/risco e PUT /api/configuracao/teto → 403', async () => {
    await semMudanca(async () => {
      const r1 = await alterar('risco', { ligado: true, modelo: 'modelo-ficticio' }, adm());
      expect(r1.status).toBe(403);
      expect(await r1.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
      const r2 = await gravarTeto({ tetoMensal: '99,00' }, adm());
      expect(r2.status).toBe(403);
      expect(await r2.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    });
  });

  it('CA-18.4: token de agente em PUT /api/configuracao/teto → 403', async () => {
    await semMudanca(async () => {
      for (const agente of AGENTES) {
        const r = await gravarTeto({ tetoMensal: '99,00' }, { bearer: tokens[agente] });
        expect(r.status, agente).toBe(403);
        expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
      }
    });
  });

  it('C-10: nenhum agente lê a configuração nem liga a si mesmo (o risco inclusive)', async () => {
    await semMudanca(async () => {
      for (const agente of AGENTES) {
        const cred = { bearer: tokens[agente] };
        expect((await listar(cred)).status, `GET agentes ${agente}`).toBe(403);
        expect((await lerTeto(cred)).status, `GET teto ${agente}`).toBe(403);
        expect((await alterar(agente, { ligado: true, modelo: 'modelo-ficticio' }, cred)).status, `PATCH ${agente}`).toBe(403);
      }
    });
  });

  it('pessoa sem 2FA → 403; sem sessão nem token → 401; nada muda', async () => {
    await semMudanca(async () => {
      for (const [cred, status] of [
        [{ cookie: cookieCtoSem2fa }, 403],
        [{}, 401],
      ] as const) {
        expect((await listar(cred)).status).toBe(status);
        expect((await lerTeto(cred)).status).toBe(status);
        expect((await alterar('risco', { ligado: true, modelo: 'modelo-ficticio' }, cred)).status).toBe(status);
        expect((await gravarTeto({ tetoMensal: '5' }, cred)).status).toBe(status);
      }
    });
  });

  it('C-15: com cookie e Origin de outro site → 403; corpo que não é JSON → 415; nada muda', async () => {
    await semMudanca(async () => {
      expect((await alterar('risco', { ligado: true, modelo: 'modelo-ficticio' }, cto(), { cabecalhos: { origin: 'https://outro.test' } })).status).toBe(403);
      expect((await gravarTeto({ tetoMensal: '5' }, cto(), { semOrigin: true })).status).toBe(403);
      expect((await gravarTeto('tetoMensal=5', cto(), { cabecalhos: { 'content-type': 'application/x-www-form-urlencoded' } })).status).toBe(415);
    });
  });

  it('cada rota exporta só os métodos do contrato (02, seção 6)', () => {
    const metodos = (m: Record<string, unknown>) => Object.keys(m).filter((k) => /^[A-Z]+$/.test(k)).sort();
    expect(metodos(rotaDosAgentes)).toEqual(['GET']);
    expect(metodos(rotaDoAgente)).toEqual(['PATCH']);
    expect(metodos(rotaDoTeto)).toEqual(['GET', 'PUT']);
    expect(GET.meta).toMatchObject({ acao: 'ler_configuracao_agentes', rota: '/api/agentes' });
    expect(PATCH.meta).toMatchObject({ acao: 'alterar_agente', rota: '/api/agentes/[agente]', exemplo: { agente: 'risco' } });
    expect(GET_TETO.meta).toMatchObject({ acao: 'ler_teto', rota: '/api/configuracao/teto' });
    expect(PUT_TETO.meta).toMatchObject({ acao: 'alterar_teto', rota: '/api/configuracao/teto' });
  });
});

describe('log das rotas de agentes e teto (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem agente, corpo, modelo, sentinela nem token', async () => {
    linhasDeLog.length = 0;
    await alterar('risco', { ligado: true, modelo: SENTINELAS.texto });
    await gravarTeto({ tetoMensal: SENTINELAS.texto });
    await gravarTeto({ tetoMensal: '3,00' }, { bearer: tokens.risco });
    await alterar('consolidacao', { ligado: false, modelo: `${SENTINELAS.nome} ${SENTINELAS.email}` });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'PATCH /api/agentes/[agente] 409',
      'PUT /api/configuracao/teto 400',
      'PUT /api/configuracao/teto 403',
      'PATCH /api/agentes/[agente] 200',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toContain('consolidacao');
    expect(tudo).not.toContain('tetoMensal');
    expect(tudo).not.toContain(tokens.risco);
    expect(contemSentinela(tudo)).toBe(false);
  });
});

describe('registrarUso (RF-17)', () => {
  type Uso = Parameters<typeof registrarUso>[1];
  const novaExecucao = async () =>
    (
      await b.poolMigrator.query<{ id: string }>(
        `insert into execucao_agente (agente, chave_entrada, criada_em, atualizada_em) values ('orquestrador', $1, $2, $2) returning id`,
        [`entrada:${randomUUID()}`, '2026-10-22T12:00:00Z'],
      )
    ).rows[0]!.id;

  it('CA-17.3: registrarUso não aceita nem grava conteúdo (o tipo não tem campo de texto)', async () => {
    expectTypeOf<keyof Uso>().toEqualTypeOf<'execucaoId' | 'agente' | 'demandaId' | 'modelo' | 'tokensEntrada' | 'tokensSaida' | 'custo' | 'resultado'>();
    const execucaoId = await novaExecucao();
    const uso: Uso = { execucaoId, agente: 'orquestrador', demandaId: null, modelo: 'modelo-ficticio', tokensEntrada: 1_000, tokensSaida: 200, custo: 0.006, resultado: 'sucesso' };
    // Chaves a mais, vindas de quem chama por engano, não chegam ao banco: a gravação é campo a campo.
    const comConteudo = { ...uso, prompt: SENTINELAS.texto, resposta: SENTINELAS.email, conteudo: SENTINELAS.nome };
    await registrarUso(b.db, comConteudo, deps.relogio);
    const linhas = (await b.poolMigrator.query<Record<string, unknown>>('select * from uso_ia where execucao_agente_id = $1', [execucaoId])).rows;
    expect(linhas).toHaveLength(1);
    const { id, ...resto } = linhas[0]!;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(resto).toEqual({
      execucao_agente_id: execucaoId,
      agente: 'orquestrador',
      demanda_id: null,
      modelo: 'modelo-ficticio',
      tokens_entrada: 1000,
      tokens_saida: 200,
      custo: '0.006000',
      resultado: 'sucesso',
      ocorrido_em: deps.relogio.agora(),
    });
    expect(contemSentinela(JSON.stringify(linhas))).toBe(false);
  });

  it('CA-17.2: as chamadas fora do schema e com erro (sem token) também entram, na transação de quem chama', async () => {
    const execucaoId = await novaExecucao();
    await comTransacao(b.poolApp, async ({ tx }) => {
      await registrarUso(tx, { execucaoId, agente: 'orquestrador', demandaId: null, modelo: 'modelo-ficticio', tokensEntrada: 10, tokensSaida: 5, custo: 0.000105, resultado: 'fora_do_schema' }, deps.relogio);
      await registrarUso(tx, { execucaoId, agente: 'orquestrador', demandaId: null, modelo: 'modelo-ficticio', tokensEntrada: 0, tokensSaida: 0, custo: 0, resultado: 'erro' }, deps.relogio);
    });
    const r = await b.poolMigrator.query<{ resultado: string; custo: string }>('select resultado, custo from uso_ia where execucao_agente_id = $1 order by resultado', [execucaoId]);
    expect(r.rows).toEqual([
      { resultado: 'erro', custo: '0.000000' },
      { resultado: 'fora_do_schema', custo: '0.000105' },
    ]);
  });

  it.each([
    ['custo negativo', { custo: -0.000001 }],
    ['custo não finito', { custo: Number.NaN }],
    ['tokens negativos', { tokensEntrada: -1 }],
    ['tokens fracionários', { tokensSaida: 1.5 }],
  ])('%s é recusado antes do banco', async (_caso, campos) => {
    const execucaoId = await novaExecucao();
    const uso: Uso = { execucaoId, agente: 'orquestrador', demandaId: null, modelo: 'modelo-ficticio', tokensEntrada: 1, tokensSaida: 1, custo: 0, resultado: 'sucesso', ...campos };
    await expect(registrarUso(b.db, uso, deps.relogio)).rejects.toThrow(RangeError);
    expect((await b.poolMigrator.query('select 1 from uso_ia where execucao_agente_id = $1', [execucaoId])).rowCount).toBe(0);
  });
});
