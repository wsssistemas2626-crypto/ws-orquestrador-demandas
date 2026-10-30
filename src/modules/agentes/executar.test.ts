// Execução de agente (T27: RF-16 a RF-19, C-12, C-25, C-26, ADR-06, ADR-07, P1-e) contra o Postgres real, pelo papel do
// app, com a fila do pg-boss no mesmo banco e o provedor de IA falso (RNF-14: nenhuma chamada sai da máquina). O relógio
// é sempre o fixo (RNF-15). Dados só fictícios.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { capturarErro } from '../../lib/sentry';
import { AGENTES, type Agente, type AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema, type Tipo } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { obterEspecificacao } from '../especificacoes/consultas';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { obterPacoteDecisao } from '../pacotes-decisao/consultas';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { montarEntrada } from './entrada-agente';
import { criarExecucao, reivindicar, TRAVA_MS } from './execucoes';
import { DESTINOS, executarAgente, type DepsAgente } from './executar';
import { ErroProvedor, type ProvedorIA, type RespostaDoProvedor } from './provedor';
import { SCHEMA_DE_SAIDA } from './schemas';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-exec-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

let b: BancoDeTeste;
let base: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let deps: DepsAgente;
let passo = 0;
let dem: { id: string };
let esp: { id: string };

// --- ajudantes ---

const resposta = (saida: unknown, extra: Partial<RespostaDoProvedor> = {}): RespostaDoProvedor => ({
  texto: typeof saida === 'string' ? saida : JSON.stringify(saida),
  modelo: MODELO,
  tokensEntrada: 1_000,
  tokensSaida: 200,
  ...extra,
});
const RSK_VALIDO = PROMPTS.risco.exemploSaida;
const FORA_DO_SCHEMA = { resumo: SENTINELAS.texto, riscoTecnicoNivel: 'altissimo' };

async function novaDemanda(tipo: Tipo = 'melhoria', descricaoProblema?: string): Promise<{ id: string }> {
  return criarDemanda(base, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo, solicitanteNome: 'Pessoa Ficticia', descricaoProblema }));
}
const espDaPessoa = (demandaId: string, extra: Record<string, unknown> = {}) =>
  criarEspecificacao(base, cto, demandaId, criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), ...extra }));

const novaExecucao = (agente: Agente = 'risco', chaveEntrada = `esp:${esp.id}`, demandaId: string | null = dem.id) =>
  comTransacao(b.poolApp, (t) => criarExecucao(t, base, { agente, chaveEntrada, demandaId }));

const execucao = async (id: string) =>
  (
    await b.poolMigrator.query<{ status: string; tentativas: number; proxima_tentativa_em: Date | null; bloqueada_ate: Date | null; artefato_id: string | null }>(
      'select status, tentativas, proxima_tentativa_em, bloqueada_ate, artefato_id from execucao_agente where id = $1',
      [id],
    )
  ).rows[0]!;
const usos = async (id: string) =>
  (
    await b.poolMigrator.query<{ agente: string; demanda_id: string | null; modelo: string; tokens_entrada: number; tokens_saida: number; custo: string; resultado: string; ocorrido_em: Date }>(
      'select agente, demanda_id, modelo, tokens_entrada, tokens_saida, custo, resultado, ocorrido_em from uso_ia where execucao_agente_id = $1 order by ocorrido_em, id',
      [id],
    )
  ).rows;
const jobs = async (id: string) =>
  (
    await b.poolMigrator.query<{ data: unknown; singleton_key: string; start_after: Date }>(
      `select data, singleton_key, start_after from pgboss.job where name = 'agente.executar' and data->>'execucaoId' = $1 order by created_on, singleton_key`,
      [id],
    )
  ).rows;
const eventosDa = async (id: string) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; demanda_id: string | null; depois: unknown }>(
      `select acao, ator_tipo, ator_id, demanda_id, depois from evento where entidade = 'execucao_agente' and entidade_id = $1 order by id`,
      [id],
    )
  ).rows;
const contar = async (tabela: 'especificacao_tecnica' | 'parecer_risco' | 'pacote_decisao', demandaId: string) =>
  Number((await b.poolMigrator.query(`select count(*) from ${tabela} where demanda_id = $1`, [demandaId])).rows[0].count);
const statusDa = async (demandaId: string) => (await b.poolMigrator.query('select status from demanda where id = $1', [demandaId])).rows[0].status as string;

const ligar = (agente: Agente, modelo = MODELO) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, modelo]);
const desligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = false where agente = $1', [agente]);
const definirTeto = (v: number) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [v]);
let gastos = 0;
// Gasto já feito no mês: uma execução qualquer e o uso dela, pelo migrator.
async function gastar(custo: number): Promise<void> {
  const chave = `demanda:DEM-20990101-${String(++gastos).padStart(4, '0')}`;
  const ex = await b.poolMigrator.query(
    `insert into execucao_agente (agente, chave_entrada, status, tentativas, criada_em, atualizada_em) values ('insumo_tecnico', $1, 'falhou', 1, $2, $2) returning id`,
    [chave, relogio.agora()],
  );
  await b.poolMigrator.query(
    `insert into uso_ia (execucao_agente_id, agente, modelo, tokens_entrada, tokens_saida, custo, resultado, ocorrido_em) values ($1, 'insumo_tecnico', $2, 0, 0, $3, 'sucesso', $4)`,
    [ex.rows[0].id, MODELO, custo, relogio.agora()],
  );
}

beforeAll(async () => {
  b = await novoBanco();
  base = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'exec-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});
afterAll(async () => {
  await base.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  // Cada teste duas horas depois do anterior, ainda em outubro: o limite por hora (C-36) de um não entra no outro.
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  await b.poolMigrator.query('truncate uso_ia');
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  // A demanda e a ESP nascem com os agentes desligados: desde a T28, a ESP sem dúvida com o risco ligado já criaria a
  // execução `esp:<id>` pelo gatilho, e cada teste aqui cria a sua com novaExecucao().
  dem = await novaDemanda();
  esp = await espDaPessoa(dem.id, { descricaoObjetiva: `Descrição com ${SENTINELAS.texto}` });
  await ligar('risco');
  await definirTeto(10);
  provedor = new ProvedorFalso();
  deps = { ...base, provedor };
  vi.mocked(capturarErro).mockClear();
});
afterEach(() => substituirDestinoDoLog(null));

// --- criarExecucao e reivindicar ---

describe('criarExecucao (ADR-06, ADR-07, C-22)', () => {
  it('cria a execução pendente e um job só com { execucaoId }, com singletonKey <agente>:<chave>:t1', async () => {
    const id = await novaExecucao();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await execucao(id!)).toMatchObject({ status: 'pendente', tentativas: 0, proxima_tentativa_em: null, bloqueada_ate: null, artefato_id: null });
    const j = await jobs(id!);
    expect(j).toHaveLength(1);
    expect(j[0]!.data).toEqual({ execucaoId: id });
    expect(j[0]!.singleton_key).toBe(`risco:esp:${esp.id}:t1`);
  });

  it('a mesma entrada de novo devolve null, sem segunda execução nem segundo job', async () => {
    const id = await novaExecucao();
    expect(await novaExecucao()).toBeNull();
    const n = await b.poolMigrator.query('select count(*) from execucao_agente where chave_entrada = $1', [`esp:${esp.id}`]);
    expect(n.rows[0].count).toBe('1');
    expect(await jobs(id!)).toHaveLength(1);
  });

  it('ADR-06: a transação desfeita leva a execução e o job junto', async () => {
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarExecucao(t, base, { agente: 'risco', chaveEntrada: `esp:${esp.id}`, demandaId: dem.id });
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    const n = await b.poolMigrator.query('select count(*) from execucao_agente where chave_entrada = $1', [`esp:${esp.id}`]);
    expect(n.rows[0].count).toBe('0');
    const j = await b.poolMigrator.query(`select count(*) from pgboss.job where name = 'agente.executar' and singleton_key = $1`, [`risco:esp:${esp.id}:t1`]);
    expect(j.rows[0].count).toBe('0');
  });
});

describe('reivindicar (ADR-07)', () => {
  it('pendente → em_andamento, uma tentativa a mais e trava de 150 s', async () => {
    const id = (await novaExecucao())!;
    const r = await reivindicar(b.db, id, relogio);
    expect(TRAVA_MS).toBe(150_000);
    expect(r).toMatchObject({ id, status: 'em_andamento', tentativas: 1, bloqueadaAte: new Date(relogio.agora().getTime() + 150_000), atualizadaEm: relogio.agora() });
  });

  it('com a trava valendo, ninguém reivindica; vencida a trava, a execução volta a ser reivindicada', async () => {
    const id = (await novaExecucao())!;
    await reivindicar(b.db, id, relogio);
    relogio.avancar(150_000);
    expect(await reivindicar(b.db, id, relogio)).toBeNull();
    relogio.avancar(1);
    expect(await reivindicar(b.db, id, relogio)).toMatchObject({ status: 'em_andamento', tentativas: 2 });
  });

  it('pendente com a próxima tentativa ainda no futuro não é reivindicada antes da hora', async () => {
    const id = (await novaExecucao())!;
    const depois = new Date(relogio.agora().getTime() + 30_000);
    await b.poolMigrator.query('update execucao_agente set proxima_tentativa_em = $2 where id = $1', [id, depois]);
    expect(await reivindicar(b.db, id, relogio)).toBeNull();
    relogio.avancar(30_000);
    expect(await reivindicar(b.db, id, relogio)).toMatchObject({ tentativas: 1 });
  });

  it.each(['concluida', 'falhou', 'ignorada'])('execução %s não é reivindicada', async (status) => {
    const id = (await novaExecucao())!;
    await b.poolMigrator.query(`update execucao_agente set status = $2, artefato_id = 'x' where id = $1`, [id, status]);
    expect(await reivindicar(b.db, id, relogio)).toBeNull();
  });

  it('id que não existe ou fora do formato: null, sem erro', async () => {
    expect(await reivindicar(b.db, '00000000-0000-4000-8000-000000000999', relogio)).toBeNull();
    expect(await reivindicar(b.db, `x'; drop table execucao_agente; --`, relogio)).toBeNull();
  });
});

// --- executarAgente ---

describe('executarAgente: caminho feliz e uso (RF-16, RF-17)', () => {
  it('CA-16.1: provedor falso com JSON válido → RSK-…-v1 gravado com responsável agente risco', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO));
    const id = await novaExecucao();
    expect(await executarAgente(deps, id!)).toBe('concluida');
    const rsk = await obterParecerRisco(b.db, `RSK-${dem.id}-v1`);
    expect(rsk.autor).toEqual({ tipo: 'agente', agente: 'risco' });
    expect(rsk.rascunhoAgente).toBe(true);
    expect(await execucao(id!)).toMatchObject({ status: 'concluida', tentativas: 1, artefato_id: `RSK-${dem.id}-v1`, bloqueada_ate: null, proxima_tentativa_em: null });
    const linha = await b.poolMigrator.query('select execucao_agente_id from parecer_risco where id = $1', [rsk.id]);
    expect(linha.rows[0].execucao_agente_id).toBe(id);
  });

  it('CA-17.1: a linha de uso registra 1.000 e 200 tokens e custo 0,006', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    await executarAgente(deps, id);
    expect(await usos(id)).toEqual([
      { agente: 'risco', demanda_id: dem.id, modelo: MODELO, tokens_entrada: 1_000, tokens_saida: 200, custo: '0.006000', resultado: 'sucesso', ocorrido_em: relogio.agora() },
    ]);
  });

  it('a chamada leva o prompt do agente em sistema, o maxTokens dele, o modelo ligado e a entrada minimizada', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    await executarAgente(deps, id);
    const { conteudo } = await montarEntrada(b.db, 'risco', `esp:${esp.id}`);
    expect(provedor.chamadas).toEqual([{ modelo: MODELO, sistema: PROMPTS.risco.sistema, conteudo, maxTokens: PROMPTS.risco.maxTokens }]);
    expect(conteudo).toContain('<dados>');
  });

  it('insumo_tecnico grava a ESP da demanda; consolidação grava o DEC (os três destinos de artefato; o orquestrador desde a T28)', async () => {
    expect(Object.keys(DESTINOS).sort()).toEqual(['consolidacao', 'insumo_tecnico', 'orquestrador', 'risco']);
    for (const a of AGENTES) expect(DESTINOS[a]!.schema).toBe(SCHEMA_DE_SAIDA[a]);

    // Demanda e RSK criados antes de ligar o agente: desde a T28, o gatilho já criaria a execução da mesma entrada.
    const outra = await novaDemanda('novo_projeto');
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(PROMPTS.insumo_tecnico.exemploSaida));
    const idEsp = (await novaExecucao('insumo_tecnico', `demanda:${outra.id}`, outra.id))!;
    expect(await executarAgente(deps, idEsp)).toBe('concluida');
    expect(await obterEspecificacao(b.db, idVersao('ESP', outra.id, 1))).toMatchObject({ autor: { tipo: 'agente', agente: 'insumo_tecnico' }, rascunhoAgente: true });

    const rsk = await criarParecerRisco(base, cto, dem.id, criarParecerRiscoSchema.parse(RSK_VALIDO));
    await ligar('consolidacao');
    provedor.respostas.push(resposta(PROMPTS.consolidacao.exemploSaida));
    const idDec = (await novaExecucao('consolidacao', `rsk:${rsk.id}`))!;
    expect(await executarAgente(deps, idDec)).toBe('concluida');
    expect(await obterPacoteDecisao(b.db, idVersao('DEC', dem.id, 1))).toMatchObject({ rascunhoAgente: true });
    expect(await execucao(idDec)).toMatchObject({ artefato_id: idVersao('DEC', dem.id, 1) });
  });

  it('JSON dentro de um bloco de código ainda é lido', async () => {
    provedor.respostas.push(resposta('```json\n' + JSON.stringify(RSK_VALIDO) + '\n```'));
    expect(await executarAgente(deps, (await novaExecucao())!)).toBe('concluida');
  });
});

describe('executarAgente: saída fora do schema e novas tentativas (CA-16.2, CA-16.3, P1-e)', () => {
  it('CA-16.2 e CA-17.2: 1ª fora do schema (não grava, uso fora_do_schema, reagenda em 30 s); 2ª válida grava exatamente um', async () => {
    provedor.respostas.push(resposta(FORA_DO_SCHEMA), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    const t0 = relogio.agora();
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await contar('parecer_risco', dem.id)).toBe(0);
    expect(await usos(id)).toMatchObject([{ resultado: 'fora_do_schema', tokens_entrada: 1_000, tokens_saida: 200, custo: '0.006000' }]);
    const proxima = new Date(t0.getTime() + 30_000);
    expect(await execucao(id)).toMatchObject({ status: 'pendente', tentativas: 1, proxima_tentativa_em: proxima, bloqueada_ate: null });
    const j = await jobs(id);
    expect(j.map((x) => x.singleton_key)).toEqual([`risco:esp:${esp.id}:t1`, `risco:esp:${esp.id}:t2`]);
    expect(j[1]!.start_after).toEqual(proxima);
    expect(j[1]!.data).toEqual({ execucaoId: id });

    // Antes da hora, o job repetido não roda a 2ª tentativa.
    expect(await executarAgente(deps, id)).toBe('ja_tratada');
    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('concluida');
    expect(await contar('parecer_risco', dem.id)).toBe(1);
    expect((await usos(id)).map((u) => u.resultado)).toEqual(['fora_do_schema', 'sucesso']);
    expect(await execucao(id)).toMatchObject({ status: 'concluida', tentativas: 2 });
  });

  it('CA-16.3: sempre fora do schema → 3 tentativas, nenhum artefato, falhou, evento falha_agente sem o conteúdo', async () => {
    provedor.respostas.push(resposta(FORA_DO_SCHEMA), resposta('não é JSON'), resposta({ ...FORA_DO_SCHEMA, extra: SENTINELAS.email }));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect((await execucao(id)).proxima_tentativa_em).toEqual(new Date(relogio.agora().getTime() + 120_000));
    relogio.avancar(120_000);
    expect(await executarAgente(deps, id)).toBe('falhou');

    expect(provedor.chamadas).toHaveLength(3);
    expect(await contar('parecer_risco', dem.id)).toBe(0);
    expect(await execucao(id)).toMatchObject({ status: 'falhou', tentativas: 3, bloqueada_ate: null, proxima_tentativa_em: null });
    expect((await usos(id)).map((u) => u.resultado)).toEqual(['fora_do_schema', 'fora_do_schema', 'fora_do_schema']);
    expect((await jobs(id)).map((x) => x.singleton_key)).toEqual([1, 2, 3].map((n) => `risco:esp:${esp.id}:t${n}`));
    const ev = await eventosDa(id);
    expect(ev).toEqual([
      { acao: 'falha_agente', ator_tipo: 'agente', ator_id: 'risco', demanda_id: dem.id, depois: { agente: 'risco', tentativas: 3, motivo: 'fora_do_schema' } },
    ]);
    expect(contemSentinela(JSON.stringify(ev))).toBe(false);
    // Falhou: o job seguinte, se vier, não chama o provedor.
    expect(await executarAgente(deps, id)).toBe('ja_tratada');
  });

  it('ESP de agente recusada pela regra de construção (400 no serviço) conta como saída inválida, sem gravar', async () => {
    const outra = await novaDemanda('novo_projeto');
    await ligar('insumo_tecnico');
    const semSistema: Record<string, unknown> = { ...(PROMPTS.insumo_tecnico.exemploSaida as object) };
    delete semSistema.sistemaAlvo;
    provedor.respostas.push(resposta(semSistema));
    const id = (await novaExecucao('insumo_tecnico', `demanda:${outra.id}`, outra.id))!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await contar('especificacao_tecnica', outra.id)).toBe(0);
    expect((await usos(id)).map((u) => u.resultado)).toEqual(['fora_do_schema']);
  });

  it('C-25: saída com status "aprovada" e rascunhoAgente:false não muda status nem autoria', async () => {
    const antes = await statusDa(dem.id);
    provedor.respostas.push(resposta({ ...(RSK_VALIDO as object), status: 'aprovada', rascunhoAgente: false, autorTipo: 'pessoa', autorId: cto.usuarioId, id: 'RSK-X', versao: 9 }));
    expect(await executarAgente(deps, (await novaExecucao())!)).toBe('concluida');
    const rsk = await obterParecerRisco(b.db, `RSK-${dem.id}-v1`);
    expect(rsk).toMatchObject({ versao: 1, rascunhoAgente: true, autor: { tipo: 'agente', agente: 'risco' } });
    expect(await statusDa(dem.id)).toBe(antes);
    const linha = await b.poolMigrator.query('select autor_tipo, autor_id from parecer_risco where id = $1', [rsk.id]);
    expect(linha.rows[0]).toEqual({ autor_tipo: 'agente', autor_id: 'risco' });
  });
});

describe('executarAgente: execução única (CA-16.4, ADR-07)', () => {
  it('CA-16.4: o mesmo job duas vezes → o provedor é chamado uma vez e há um único RSK', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('concluida');
    expect(await executarAgente(deps, id)).toBe('ja_tratada');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await contar('parecer_risco', dem.id)).toBe(1);
  });

  it('CA-16.4: o mesmo job ao mesmo tempo → uma só reivindicação, uma chamada e um RSK', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    const r = await Promise.all([executarAgente(deps, id), executarAgente(deps, id)]);
    expect(r.sort()).toEqual(['concluida', 'ja_tratada']);
    expect(provedor.chamadas).toHaveLength(1);
    expect(await contar('parecer_risco', dem.id)).toBe(1);
  });

  it('trava vencida durante a chamada: quem reivindicou de novo grava, e o primeiro não grava um segundo RSK', async () => {
    const id = (await novaExecucao())!;
    const outroProvedor = new ProvedorFalso();
    outroProvedor.respostas.push(resposta(RSK_VALIDO));
    let interna: string | undefined;
    const lento: ProvedorIA = {
      gerar: async () => {
        relogio.avancar(TRAVA_MS + 1);
        interna = await executarAgente({ ...base, provedor: outroProvedor }, id);
        return resposta(RSK_VALIDO);
      },
    };
    expect(await executarAgente({ ...base, provedor: lento }, id)).toBe('ja_tratada');
    expect(interna).toBe('concluida');
    expect(await contar('parecer_risco', dem.id)).toBe(1);
    expect(await execucao(id)).toMatchObject({ status: 'concluida', tentativas: 2, artefato_id: `RSK-${dem.id}-v1` });
    // As duas chamadas pagas ficam registradas; só uma gravou.
    expect((await usos(id)).map((u) => u.resultado).sort()).toEqual(['erro', 'sucesso']);
  });

  it('reivindicada depois da 3ª tentativa (worker caiu no meio dela) → falhou, sem chamar o provedor', async () => {
    const id = (await novaExecucao())!;
    await b.poolMigrator.query(`update execucao_agente set status = 'em_andamento', tentativas = 3, bloqueada_ate = $2 where id = $1`, [id, new Date(relogio.agora().getTime() - 1)]);
    expect(await executarAgente(deps, id)).toBe('falhou');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'falha_agente', depois: { motivo: 'tentativas_esgotadas' } }]);
  });
});

describe('executarAgente: teto, interruptor e provedor (CA-18.1, CA-18.3, CA-19.4, CA-16.5)', () => {
  it('CA-18.1: teto 10 e gasto 10 → provedor não é chamado, nada gravado, evento suspensao_por_teto', async () => {
    await gastar(10);
    provedor.respostas.push(resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await contar('parecer_risco', dem.id)).toBe(0);
    expect(await usos(id)).toEqual([]);
    expect(await execucao(id)).toMatchObject({ status: 'ignorada', bloqueada_ate: null });
    expect(await eventosDa(id)).toEqual([
      { acao: 'suspensao_por_teto', ator_tipo: 'sistema', ator_id: 'sistema', demanda_id: dem.id, depois: { agente: 'risco', motivo: 'teto' } },
    ]);
  });

  it('gasto logo abaixo do teto ainda chama', async () => {
    await gastar(9.99);
    provedor.respostas.push(resposta(RSK_VALIDO));
    expect(await executarAgente(deps, (await novaExecucao())!)).toBe('concluida');
  });

  it('CA-18.3: agente ligado com teto 0 → nenhuma chamada', async () => {
    await definirTeto(0);
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'suspensao_por_teto' }]);
  });

  it('CA-19.4: job na fila e agente desligado em seguida → provedor não é chamado', async () => {
    const id = (await novaExecucao())!;
    await desligar('risco');
    expect(await executarAgente(deps, id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await contar('parecer_risco', dem.id)).toBe(0);
    expect(await eventosDa(id)).toEqual([
      { acao: 'agente_ignorado', ator_tipo: 'sistema', ator_id: 'sistema', demanda_id: dem.id, depois: { agente: 'risco', motivo: 'desligado' } },
    ]);
  });

  it('modelo sem preço vigente → ignorada, sem chamada', async () => {
    await ligar('risco', 'modelo-sem-preco');
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'agente_ignorado', depois: { motivo: 'sem_preco' } }]);
  });

  it('sem provedor (sem chave) → ignorada, sem erro', async () => {
    const id = (await novaExecucao())!;
    expect(await executarAgente({ ...base, provedor: null }, id)).toBe('ignorada');
    expect(await eventosDa(id)).toMatchObject([{ acao: 'agente_ignorado', depois: { motivo: 'sem_provedor' } }]);
    expect(capturarErro).not.toHaveBeenCalled();
  });
});

describe('executarAgente: falhas do provedor e da entrada', () => {
  it('401 do provedor → falhou na 1ª tentativa, com uso, evento e Sentry', async () => {
    provedor.respostas.push(new ErroProvedor('autenticacao'));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('falhou');
    expect(await execucao(id)).toMatchObject({ status: 'falhou', tentativas: 1 });
    expect(await usos(id)).toMatchObject([{ resultado: 'erro', tokens_entrada: 0, tokens_saida: 0, custo: '0.000000' }]);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'falha_agente', depois: { motivo: 'autenticacao', tentativas: 1 } }]);
    expect(capturarErro).toHaveBeenCalledTimes(1);
    expect(await jobs(id)).toHaveLength(1);
  });

  it('erro transitório do provedor → uso erro com os tokens que houver e nova tentativa em 30 s', async () => {
    provedor.respostas.push(new ErroProvedor('transitorio', { entrada: 50, saida: 0 }));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await usos(id)).toMatchObject([{ resultado: 'erro', tokens_entrada: 50, tokens_saida: 0, custo: '0.000150' }]);
    expect(await execucao(id)).toMatchObject({ status: 'pendente', tentativas: 1 });
    expect(capturarErro).not.toHaveBeenCalled();
  });

  it('erro que não é do provedor (TypeError) → falhou sem nova tentativa, com uso, Sentry e log sem a mensagem', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    provedor.respostas.push(new TypeError(`falhou com ${SENTINELAS.texto}`));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('falhou');
    expect(await usos(id)).toMatchObject([{ resultado: 'erro' }]);
    expect(await eventosDa(id)).toMatchObject([{ depois: { motivo: 'erro_inesperado' } }]);
    expect(capturarErro).toHaveBeenCalledTimes(1);
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });

  it('RangeError antes da chamada (maxTokens) → falhou, sem linha de uso', async () => {
    provedor.respostas.push(new RangeError('maxTokens precisa ser inteiro entre 1 e 8000'));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('falhou');
    expect(await usos(id)).toEqual([]);
    expect(capturarErro).toHaveBeenCalledTimes(1);
  });

  it('resposta 200 fora do envelope (tokens que não são inteiros) → uso erro com zero token e nova tentativa, sem RangeError', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO, { tokensEntrada: '10' as never, tokensSaida: undefined as never, modelo: undefined as never }));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await usos(id)).toMatchObject([{ resultado: 'erro', tokens_entrada: 0, tokens_saida: 0, modelo: MODELO }]);
    expect(await contar('parecer_risco', dem.id)).toBe(0);
  });

  it('entrada que não existe mais (ESP da chave) → falhou sem chamar o provedor e sem uso', async () => {
    const id = (await novaExecucao('risco', `esp:${idVersao('ESP', dem.id, 9)}`))!;
    expect(await executarAgente(deps, id)).toBe('falhou');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await usos(id)).toEqual([]);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'falha_agente', depois: { motivo: 'entrada_nao_encontrada' } }]);
  });

  it('orquestrador com a entrada pendente que não existe (T28) → falhou sem chamar o provedor', async () => {
    await ligar('orquestrador');
    const id = (await novaExecucao('orquestrador', 'entrada:00000000-0000-4000-8000-0000000000aa', null))!;
    expect(await executarAgente(deps, id)).toBe('falhou');
    expect(provedor.chamadas).toHaveLength(0);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'falha_agente', demanda_id: null, depois: { agente: 'orquestrador', motivo: 'entrada_nao_encontrada' } }]);
  });
});

describe('executarAgente: log sem texto (C-21)', () => {
  it('nenhuma linha de log tem o texto da demanda, da resposta ou o modelo', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    provedor.respostas.push(resposta(FORA_DO_SCHEMA), resposta({ ...(RSK_VALIDO as object), resumo: `Resumo com ${SENTINELAS.texto}` }));
    const id = (await novaExecucao())!;
    await executarAgente(deps, id);
    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('concluida');
    const saida = linhas.join('');
    expect(linhas.length).toBeGreaterThan(0);
    expect(contemSentinela(saida)).toBe(false);
    expect(saida).not.toContain(MODELO);
    for (const l of linhas) expect(JSON.parse(l)).toMatchObject({ agente: 'risco', execucaoId: id });
  });

  it('cada agente da lista tem prompt, schema e destino (o orquestrador desde a T28)', () => {
    for (const a of AGENTES) {
      expect(PROMPTS[a]).toBeDefined();
      expect(SCHEMA_DE_SAIDA[a]).toBeDefined();
      expect(DESTINOS[a]).toBeDefined();
    }
  });
});
