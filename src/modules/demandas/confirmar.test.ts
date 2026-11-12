// T08 do DEC-DEM-20261111-0016-v1 (RF-06, IN-06, IN-07, D-08): a pessoa confirma a demanda aberta pelo Awave, e só a
// confirmação dispara o insumo técnico. Postgres real, pelo papel do app, com a fila do pg-boss no mesmo banco. Relógio
// fixo, duas horas por teste (o limite de 10 por hora do Awave, IN-09, não liga um teste ao outro). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import type { Deps } from '../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { listarHistorico } from '../historico/consultas';
import { aguardaConfirmacao, jaConfirmada } from './confirmacao';
import { confirmarDemanda, MENSAGENS_CONFIRMACAO } from './confirmar';
import { criarDemandaSchema } from './schemas';
import { alterarDemanda, criarDemanda } from './servico';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-confirmar-adm', nome: 'Pessoa Ficticia', papel: 'administradora' };

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;

const doAwave = () => criarDemanda(deps, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const daPessoa = () => criarDemanda(deps, pessoa, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));

const contar = async (id: string) => {
  const { rows } = await b.poolMigrator.query(
    `select (select count(*) from evento where acao = 'demanda_confirmada' and entidade_id = $1)::int as eventos,
            (select count(*) from execucao_agente where chave_entrada = $2)::int as execucoes,
            (select count(*) from pgboss.job where name = 'agente.executar' and singleton_key = $3)::int as jobs`,
    [id, `demanda:${id}`, `insumo_tecnico:demanda:${id}:t1`],
  );
  return rows[0] as { eventos: number; execucoes: number; jobs: number };
};
const linhaDa = async (id: string) => (await b.poolMigrator.query('select * from demanda where id = $1', [id])).rows[0] as Record<string, unknown>;

const ligarInsumo = () => b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1 where agente = 'insumo_tecnico'`, [MODELO]);
const definirTeto = (v: number) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [v]);

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia', 'confirmar-adm@exemplo.test', 'administradora')`, [
    pessoa.usuarioId,
  ]);
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  // O insumo técnico ligado, com preço vigente e teto livre, como em gatilhos.test.ts.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await ligarInsumo();
  await definirTeto(10);
});

describe('RF-06: confirmarDemanda', () => {
  it('controle: a demanda do Awave nasce sem confirmação, sem execução e sem job, mesmo com o insumo ligado (RF-05)', async () => {
    const { id } = await doAwave();
    expect(await contar(id)).toEqual({ eventos: 0, execucoes: 0, jobs: 0 });
    expect(await jaConfirmada(deps.db, id)).toBe(false);
    expect(await aguardaConfirmacao(deps.db, id)).toBe(true);
  });

  it('CA-06.1: grava demanda_confirmada com a pessoa e dispara o insumo técnico (execução e job)', async () => {
    const { id } = await doAwave();
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: false });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1, jobs: 1 });
    const { rows } = await b.poolMigrator.query(
      `select ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, antes, depois from evento where acao = 'demanda_confirmada' and entidade_id = $1`,
      [id],
    );
    expect(rows).toEqual([{ ator_tipo: 'pessoa', ator_id: pessoa.usuarioId, ator_token_prefixo: null, demanda_id: id, entidade: 'demanda', antes: null, depois: { confirmada: true } }]);
    const [ev] = (await listarHistorico(deps.db, id)).filter((e) => e.acao === 'demanda_confirmada');
    expect(ev?.ator).toEqual({ tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'administradora' });
    expect(await jaConfirmada(deps.db, id)).toBe(true);
    expect(await aguardaConfirmacao(deps.db, id)).toBe(false);
  });

  it('CA-06.2: com o insumo desligado, o evento é gravado e não há execução nem job', async () => {
    await b.poolMigrator.query(`update configuracao_agente set ligado = false where agente = 'insumo_tecnico'`);
    const { id } = await doAwave();
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: false });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 0, jobs: 0 });
  });

  it('CA-06.2: com o insumo suspenso pelo teto, o evento é gravado e não há execução nem job', async () => {
    await definirTeto(0);
    const { id } = await doAwave();
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: false });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 0, jobs: 0 });
  });

  it('CA-06.3: confirmar de novo responde sem erro e não grava outro evento nem outra execução', async () => {
    const { id } = await doAwave();
    await confirmarDemanda(deps, pessoa, id);
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: true });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1, jobs: 1 });
  });

  it('IN-07: duas confirmações simultâneas terminam com um evento, uma execução e um job', async () => {
    const { id } = await doAwave();
    const r = await Promise.all([confirmarDemanda(deps, pessoa, id), confirmarDemanda(deps, pessoa, id)]);
    expect(r.map((x) => x.jaConfirmada).sort()).toEqual([false, true]);
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1, jobs: 1 });
  });

  it('CA-06.4: demanda de pessoa → 409 com a mensagem da 03, nada gravado', async () => {
    const { id } = await daPessoa();
    const antes = await contar(id);
    expect(antes.execucoes).toBe(1);
    await expect(confirmarDemanda(deps, pessoa, id)).rejects.toEqual(expect.objectContaining({ codigo: 'conflito', mensagem: MENSAGENS_CONFIRMACAO.outraOrigem }));
    expect(await contar(id)).toEqual(antes);
  });

  it('CA-06.4: demanda do agente orquestrador → 409 com a mesma mensagem, nada gravado', async () => {
    const { id } = await criarDemanda(deps, { tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, criarDemandaSchema.parse(CORPO_DO_AWAVE));
    const antes = await contar(id);
    await expect(confirmarDemanda(deps, pessoa, id)).rejects.toEqual(expect.objectContaining({ codigo: 'conflito', mensagem: MENSAGENS_CONFIRMACAO.outraOrigem }));
    expect(await contar(id)).toEqual(antes);
  });

  it('CA-06.5: Awave em status final → 409 com a mensagem da 03, nada gravado', async () => {
    const { id } = await doAwave();
    await alterarDemanda(deps, pessoa, id, { status: 'encerrada' });
    await expect(confirmarDemanda(deps, pessoa, id)).rejects.toEqual(expect.objectContaining({ codigo: 'conflito', mensagem: MENSAGENS_CONFIRMACAO.statusFinal }));
    expect(await contar(id)).toEqual({ eventos: 0, execucoes: 0, jobs: 0 });
  });

  it('D-08: já confirmada e depois encerrada, confirmar de novo é sucesso sem gravar', async () => {
    const { id } = await doAwave();
    await confirmarDemanda(deps, pessoa, id);
    await alterarDemanda(deps, pessoa, id, { status: 'encerrada' });
    expect(await confirmarDemanda(deps, pessoa, id)).toEqual({ jaConfirmada: true });
    expect(await contar(id)).toEqual({ eventos: 1, execucoes: 1, jobs: 1 });
  });

  it('demanda que não existe → nao_encontrado, sem gravar', async () => {
    await expect(confirmarDemanda(deps, pessoa, 'DEM-20261022-9999')).rejects.toEqual(expect.objectContaining({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO }));
    expect(await contar('DEM-20261022-9999')).toEqual({ eventos: 0, execucoes: 0, jobs: 0 });
  });

  it('CA-06.6: agente, as duas integrações e o sistema chamando a função direto → sem_permissao, nada gravado', async () => {
    const { id } = await doAwave();
    for (const ator of [
      { tipo: 'agente', agente: 'orquestrador', prefixoToken: null } as const,
      { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: 'ficticio' } as const,
      atorDeIntegracao('awave'),
      atorDeIntegracao('construir'),
      { tipo: 'sistema' } as const,
    ])
      await expect(confirmarDemanda(deps, ator, id)).rejects.toEqual(expect.objectContaining({ codigo: 'sem_permissao' }));
    expect(await contar(id)).toEqual({ eventos: 0, execucoes: 0, jobs: 0 });
  });

  it('C-11 e C-34: não muda autoria, rascunho, status nem nenhum outro campo da demanda', async () => {
    const { id } = await doAwave();
    const antes = await linhaDa(id);
    relogio.avancar(60_000);
    await confirmarDemanda(deps, pessoa, id);
    const depois = await linhaDa(id);
    expect(depois).toEqual(antes);
    expect(depois).toMatchObject({ autor_tipo: 'integracao', autor_id: 'awave', rascunho_agente: true, status: 'nova' });
  });
});
