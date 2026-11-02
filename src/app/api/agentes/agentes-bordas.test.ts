// Testes da etapa 06-T23-testes (qa-automacao): bordas das rotas de agentes e teto e do registro de uso que os testes
// da construção não pegam. C-11 no PUT do teto pela rota; PUT e PATCH repetidos sem evento novo; a cadeia inteira da
// T23 (preço vigente → calcularCusto → registrarUso → gasto do mês na rota), com a tolerância da RNF-07; e o registro
// de uso desfeito junto com a transação de quem chama, ou recusado pelo banco fora dos limites das colunas. Banco,
// Better Auth e relógio fixo reais do teste (Testcontainers, RNF-15). Dados só fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { calcularCusto, precoVigente } from '../../../modules/agentes/preco';
import { registrarUso, type UsoIa } from '../../../modules/agentes/uso';
import { PATCH } from './[agente]/route';
import { GET } from './route';
import { GET as GET_TETO, PUT as PUT_TETO } from '../configuracao/teto/route';

// 12:00 UTC = 09:00 em São Paulo, no meio de outubro de 2026.
const relogio = relogioFixo('2026-10-22T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let ctoId: string;

const alterar = (agente: string, corpo: unknown) =>
  chamarRota(PATCH, { metodo: 'PATCH', caminho: `/api/agentes/${agente}`, params: { agente }, corpo, cookie: cookieCto });
const listar = () => chamarRota(GET, { caminho: '/api/agentes', cookie: cookieCto });
const lerTeto = () => chamarRota(GET_TETO, { caminho: '/api/configuracao/teto', cookie: cookieCto });
const gravarTeto = (corpo: unknown) => chamarRota(PUT_TETO, { metodo: 'PUT', caminho: '/api/configuracao/teto', corpo, cookie: cookieCto });

const eventos = async (acao: string) =>
  (await b.poolMigrator.query<{ antes: unknown; depois: unknown }>(`select antes, depois from evento where acao = $1 order by id`, [acao])).rows;
// Uma execução nova por uso (a FK de uso_ia exige execução); a versão da chave só conta, para a chave nunca repetir.
let execucoes = 0;
const novaExecucao = async () =>
  (
    await b.poolMigrator.query<{ id: string }>(
      `insert into execucao_agente (agente, chave_entrada, criada_em, atualizada_em) values ('risco', $1, $2, $2) returning id`,
      [`esp:ESP-DEM-20261022-0001-v${++execucoes}`, '2026-10-22T12:00:00Z'],
    )
  ).rows[0]!.id;
const usosDa = async (execucaoId: string) => (await b.poolMigrator.query('select 1 from uso_ia where execucao_agente_id = $1', [execucaoId])).rowCount;

beforeAll(async () => {
  // O log destas rotas já é conferido em agentes.test.ts (C-21); aqui só sai da saída do teste.
  substituirDestinoDoLog({ write: () => {} });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const pessoa = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = pessoa.cookie;
  ctoId = pessoa.usuarioId;
  await b.poolMigrator.query(
    'insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2), ($1, 30, 150, $3)',
    ['modelo-ficticio', '2026-10-01T03:00:00Z', '2026-12-01T03:00:00Z'],
  );
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(async () => {
  relogio.definir('2026-10-22T12:00:00Z');
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null, atualizado_em = null, atualizado_por = null');
  await b.poolMigrator.query(`update configuracao_ia set teto_mensal = 0, atualizado_em = null, atualizado_por = null where id = 1`);
  await b.poolMigrator.query(`delete from evento where acao in ('agente_ligado', 'agente_desligado', 'teto_alterado')`);
});

describe('PUT /api/configuracao/teto: bordas', () => {
  it('C-11: autoria, moeda e situação enviadas no corpo são ignoradas; quem alterou é a pessoa da sessão', async () => {
    const r = await gravarTeto({ tetoMensal: '10,00', atualizadoPor: 'u-outra', moeda: 'BRL', gastoDoMes: 0, suspenso: false, percentual: 0 });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      tetoMensal: 10,
      moeda: 'USD',
      gastoDoMes: 0,
      percentual: 0,
      suspenso: false,
      mesReferencia: '2026-10',
      viraEm: '2026-11-01T03:00:00.000Z',
    });
    const linha = (await b.poolMigrator.query('select teto_mensal, moeda, atualizado_por, atualizado_em from configuracao_ia')).rows;
    expect(linha).toEqual([{ teto_mensal: '10.00', moeda: 'USD', atualizado_por: ctoId, atualizado_em: relogio.agora() }]);
  });

  it('o mesmo valor de novo, em outra escrita, responde 200 e não gera evento nem muda a data', async () => {
    expect((await gravarTeto({ tetoMensal: '12,5' })).status).toBe(200);
    relogio.avancar(60_000);
    const r = await gravarTeto({ tetoMensal: '12.50' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ tetoMensal: 12.5 });
    expect(await eventos('teto_alterado')).toHaveLength(1);
    const { atualizado_em } = (await b.poolMigrator.query<{ atualizado_em: Date }>('select atualizado_em from configuracao_ia')).rows[0]!;
    expect(atualizado_em).toEqual(new Date('2026-10-22T12:00:00Z'));
  });

  it('o teto definido aparece igual no GET, para a leitura seguinte', async () => {
    const put = await (await gravarTeto({ tetoMensal: '3,33' })).json();
    const get = await (await lerTeto()).json();
    expect(get).toEqual(put);
  });
});

describe('PATCH /api/agentes/:agente: bordas', () => {
  it('o mesmo "ligar" duas vezes responde 200 nas duas, com um evento só, e a lista mostra a primeira data', async () => {
    expect((await alterar('risco', { ligado: true, modelo: 'modelo-ficticio' })).status).toBe(200);
    relogio.avancar(60_000);
    const r = await alterar('risco', { ligado: true });
    expect(r.status).toBe(200);
    expect(await eventos('agente_ligado')).toHaveLength(1);
    const lista = (await (await listar()).json()) as { agentes: Array<{ agente: string; atualizadoEm: string | null }> };
    expect(lista.agentes.find((a) => a.agente === 'risco')?.atualizadoEm).toBe('2026-10-22T12:00:00.000Z');
  });

  it('trocar o modelo de agente ligado por outro com preço vigente responde 200 com o modelo novo', async () => {
    await b.poolMigrator.query(
      'insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 1, 5, $2) on conflict do nothing',
      ['modelo-ficticio-2', '2026-10-01T03:00:00Z'],
    );
    await alterar('consolidacao', { ligado: true, modelo: 'modelo-ficticio' });
    const r = await alterar('consolidacao', { ligado: true, modelo: 'modelo-ficticio-2' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ agente: 'consolidacao', ligado: true, modelo: 'modelo-ficticio-2' });
  });
});

describe('cadeia da T23: preço vigente → custo → uso → gasto do mês (RF-17, RF-18, RNF-07)', () => {
  // Cada teste desta cadeia fica num mês que nenhum outro teste do arquivo usa: outubro e dezembro de 2026.
  async function chamadaFicticia(tokensEntrada: number, tokensSaida: number): Promise<{ custo: number; execucaoId: string }> {
    const preco = await precoVigente(deps.db, 'modelo-ficticio', relogio.agora());
    expect(preco).not.toBeNull();
    const custo = calcularCusto(preco!, tokensEntrada, tokensSaida);
    const execucaoId = await novaExecucao();
    await comTransacao(deps.pool, ({ tx }) =>
      registrarUso(tx, { execucaoId, agente: 'risco', demandaId: null, modelo: 'modelo-ficticio', tokensEntrada, tokensSaida, custo, resultado: 'sucesso' }, relogio),
    );
    return { custo, execucaoId };
  }

  it('CA-17.1 de ponta a ponta: 1.000 e 200 tokens custam 0,006, e o GET do teto soma; a chamada que passa do teto passa no máximo o custo dela', async () => {
    await gravarTeto({ tetoMensal: '0,01' });
    const primeira = await chamadaFicticia(1_000, 200);
    expect(primeira.custo).toBe(0.006);
    const gravado = (await b.poolMigrator.query('select tokens_entrada, tokens_saida, custo, ocorrido_em from uso_ia where execucao_agente_id = $1', [primeira.execucaoId])).rows;
    expect(gravado).toEqual([{ tokens_entrada: 1000, tokens_saida: 200, custo: '0.006000', ocorrido_em: relogio.agora() }]);
    expect(await (await lerTeto()).json()).toMatchObject({ tetoMensal: 0.01, gastoDoMes: 0.006, percentual: 60, suspenso: false });

    // Antes da segunda chamada o gasto (0,006) é menor que o teto: ela acontece e leva o gasto a 0,012 (RNF-07).
    await chamadaFicticia(1_000, 200);
    const s = (await (await lerTeto()).json()) as { gastoDoMes: number; percentual: number; suspenso: boolean; tetoMensal: number };
    expect(s).toMatchObject({ gastoDoMes: 0.012, percentual: 120, suspenso: true });
    expect(s.gastoDoMes - s.tetoMensal).toBeLessThanOrEqual(0.006);
  });

  it('a mudança de preço vale para a chamada feita depois da vigência nova, e o mês novo começa do zero', async () => {
    relogio.definir('2026-12-01T03:00:00Z');
    expect((await chamadaFicticia(1_000, 200)).custo).toBe(0.06);
    expect(await (await lerTeto()).json()).toMatchObject({ gastoDoMes: 0.06, mesReferencia: '2026-12' });
  });
});

describe('registrarUso: transação de quem chama e limites das colunas (RF-17)', () => {
  const uso = (execucaoId: string, campos: Partial<UsoIa> = {}): UsoIa => ({
    execucaoId,
    agente: 'risco',
    demandaId: null,
    modelo: 'modelo-ficticio',
    tokensEntrada: 1,
    tokensSaida: 1,
    custo: 0,
    resultado: 'sucesso',
    ...campos,
  });

  it('o rollback da transação de quem chama desfaz o uso gravado nela', async () => {
    const execucaoId = await novaExecucao();
    await expect(
      comTransacao(deps.pool, async ({ tx }) => {
        await registrarUso(tx, uso(execucaoId, { resultado: 'fora_do_schema' }), relogio);
        throw new Error('desfazer');
      }),
    ).rejects.toThrow('desfazer');
    expect(await usosDa(execucaoId)).toBe(0);
  });

  it.each([
    ['custo acima do numeric(12, 6)', { custo: 1_000_000 }],
    ['tokens de entrada acima do integer', { tokensEntrada: 2 ** 31 }],
    ['tokens de saída acima do integer', { tokensSaida: 2 ** 31 }],
  ] as const)('%s é recusado e nada é gravado', async (_caso, campos) => {
    relogio.definir('2027-03-10T12:00:00Z');
    const execucaoId = await novaExecucao();
    await expect(registrarUso(deps.db, uso(execucaoId, campos), relogio)).rejects.toThrow();
    expect(await usosDa(execucaoId)).toBe(0);
  });

  it('no limite das colunas, grava sem perder precisão', async () => {
    // Em março de 2027, fora dos meses da cadeia acima, para o custo enorme não entrar no gasto deles.
    relogio.definir('2027-03-10T12:00:00Z');
    const execucaoId = await novaExecucao();
    await registrarUso(deps.db, uso(execucaoId, { custo: 999_999.999999, tokensEntrada: 2 ** 31 - 1, tokensSaida: 0 }), relogio);
    const r = await b.poolMigrator.query('select custo, tokens_entrada, tokens_saida from uso_ia where execucao_agente_id = $1', [execucaoId]);
    expect(r.rows).toEqual([{ custo: '999999.999999', tokens_entrada: 2 ** 31 - 1, tokens_saida: 0 }]);
  });
});
