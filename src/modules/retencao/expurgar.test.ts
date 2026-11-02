// T31: expurgo do texto bruto (RF-24, RNF-08), da entrada pendente (C-31) e das sessões e verificações vencidas (C-32,
// D7). Banco real (Testcontainers), papel do app, relógio fixo (RNF-15). Dados só fictícios (sentinelas, domínio .test).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { user } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { obterDemanda } from '../demandas/consultas';
import { entradaSchema, registrarEntrada } from '../demandas/entrada';
import { listarHistorico } from '../historico/consultas';
import { expurgar, ultimoExpurgo } from './expurgar';

const DIA = 86_400_000;
const AGORA = '2026-10-22T12:00:00Z';
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-expurgo-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const relogio = relogioFixo(AGORA);

let b: BancoDeTeste;
let deps: Deps;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.db.insert(user).values({ id: cto.usuarioId, name: cto.nome, email: 'expurgo-cto@exemplo.test', papel: 'cto' });
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
// Cada teste começa sem demanda, texto, pendente, evento, sessão nem execução de rotina: o expurgo varre a base toda, e o
// resultado de um teste não pode depender do que outro deixou (RNF-15).
beforeEach(async () => {
  relogio.definir(AGORA);
  await b.poolMigrator.query('truncate demanda, entrada_pendente, evento, rotina_execucao, session, verification cascade');
});

const antesDeAgora = (dias: number, ms = 0) => new Date(new Date(AGORA).getTime() - dias * DIA - ms);

// A demanda nasce pela entrada manual (RF-05) com o texto colado na data pedida; o relógio volta para AGORA no fim.
async function criarDemandaComTexto(op: { texto: string; recebidaEm: Date; titulo?: string }) {
  relogio.definir(op.recebidaEm.toISOString());
  const r = await registrarEntrada(
    deps,
    cto,
    entradaSchema.parse({
      modo: 'manual',
      titulo: op.titulo ?? 'Pedido em duplicidade',
      tipo: 'bug',
      solicitanteNome: SENTINELAS.nome,
      contexto: 'Contexto da demanda fictícia',
      texto: op.texto,
      origem: { canal: 'email', referencia: SENTINELAS.email },
    }),
  );
  relogio.definir(AGORA);
  if (r.tipo !== 'demanda') throw new Error('entrada manual sem demanda');
  return r.demanda;
}

async function criarPendente(recebidaEm: Date): Promise<string> {
  const r = await b.poolMigrator.query<{ id: string }>(
    `insert into entrada_pendente (texto, origem, solicitante_nome, solicitante_papel, status, registrada_por, recebida_em)
     values ($1, $2, $3, 'operacoes', 'falhou', $4, $5) returning id`,
    [SENTINELAS.texto, JSON.stringify({ canal: 'email', referencia: SENTINELAS.email }), SENTINELAS.nome, cto.usuarioId, recebidaEm],
  );
  return r.rows[0]!.id;
}

const entradaBrutaDe = async (demandaId: string) =>
  (await b.poolMigrator.query('select texto, origem, expurgada_em from entrada_bruta where demanda_id = $1', [demandaId])).rows[0];

const eventosDoSistema = async () =>
  (
    await b.poolMigrator.query<{ acao: string; demanda_id: string | null; entidade: string; entidade_id: string; ator_tipo: string; antes: unknown; depois: unknown }>(
      `select acao, demanda_id, entidade, entidade_id, ator_tipo, antes, depois from evento where ator_tipo = 'sistema' order by id`,
    )
  ).rows;

describe('texto bruto (RF-24)', () => {
  it('CA-24.1: texto de 91 dias → texto e origem vazios, data do expurgo gravada, evento no histórico sem o conteúdo', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: new Date('2026-07-23T12:00:00Z') });
    relogio.definir('2026-10-22T12:00:00Z'); // 91 dias depois
    expect((await expurgar(deps, 90)).textos).toBe(1);
    expect(await entradaBrutaDe(dem.id)).toEqual({ texto: null, origem: null, expurgada_em: relogio.agora() });
    const ev = await listarHistorico(b.db, dem.id);
    expect(ev[0]).toMatchObject({ acao: 'texto_expurgado', ator: { tipo: 'sistema' }, entidade: 'entrada_bruta', entidadeId: dem.id, ocorridoEm: relogio.agora() });
    expect(JSON.stringify(ev)).not.toContain(SENTINELAS.texto);
    expect(contemSentinela(JSON.stringify(ev))).toBe(false);
  });

  it('CA-24.2: 89 dias → continua guardado, sem evento', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(89) });
    expect((await expurgar(deps, 90)).textos).toBe(0);
    expect(await entradaBrutaDe(dem.id)).toMatchObject({ texto: SENTINELAS.texto, expurgada_em: null });
    expect((await entradaBrutaDe(dem.id)).origem).toEqual({ canal: 'email', referencia: SENTINELAS.email });
    expect(await eventosDoSistema()).toEqual([]);
  });

  it('o limite é estrito: exatamente 90 dias continua; 90 dias e 1 ms é expurgado', async () => {
    const noLimite = await criarDemandaComTexto({ texto: 'Texto no limite', recebidaEm: antesDeAgora(90) });
    const passou = await criarDemandaComTexto({ texto: 'Texto vencido', recebidaEm: antesDeAgora(90, 1) });
    expect((await expurgar(deps, 90)).textos).toBe(1);
    expect(await entradaBrutaDe(noLimite.id)).toMatchObject({ texto: 'Texto no limite', expurgada_em: null });
    expect(await entradaBrutaDe(passou.id)).toMatchObject({ texto: null, origem: null });
  });

  it('CA-24.3: prazo 30 e texto de 31 dias → expurgado; com prazo 90, o mesmo texto ficaria', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(31) });
    expect((await expurgar(deps, 90)).textos).toBe(0);
    expect((await expurgar(deps, 30)).textos).toBe(1);
    expect(await entradaBrutaDe(dem.id)).toEqual({ texto: null, origem: null, expurgada_em: relogio.agora() });
  });

  it('CA-24.4: já expurgado → rodar de novo não cria evento novo nem muda a data do expurgo', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(91) });
    expect((await expurgar(deps, 90)).textos).toBe(1);
    const primeiraData = relogio.agora();
    relogio.avancar(DIA);
    expect((await expurgar(deps, 90)).textos).toBe(0);
    expect((await entradaBrutaDe(dem.id)).expurgada_em).toEqual(primeiraData);
    expect((await eventosDoSistema()).filter((e) => e.acao === 'texto_expurgado')).toHaveLength(1);
  });

  it('dois expurgos ao mesmo tempo: cada texto é expurgado e registrado uma vez só', async () => {
    const a = await criarDemandaComTexto({ texto: 'Texto A', recebidaEm: antesDeAgora(100) });
    const c = await criarDemandaComTexto({ texto: 'Texto C', recebidaEm: antesDeAgora(120) });
    const [r1, r2] = await Promise.all([expurgar(deps, 90), expurgar(deps, 90)]);
    expect(r1.textos + r2.textos).toBe(2);
    const eventos = (await eventosDoSistema()).filter((e) => e.acao === 'texto_expurgado');
    expect(eventos.map((e) => e.demanda_id).sort()).toEqual([a.id, c.id].sort());
  });

  it('os campos estruturados da demanda continuam iguais', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(91), titulo: 'Título que fica' });
    const antes = await obterDemanda(b.db, dem.id);
    await expurgar(deps, 90);
    expect(await obterDemanda(b.db, dem.id)).toEqual(antes);
    expect(antes).toMatchObject({ titulo: 'Título que fica', solicitanteNome: SENTINELAS.nome, contexto: 'Contexto da demanda fictícia', status: 'nova' });
  });

  it('o evento do expurgo não tem antes nem depois, e o ator é o sistema', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(91) });
    await expurgar(deps, 90);
    expect(await eventosDoSistema()).toEqual([
      { acao: 'texto_expurgado', demanda_id: dem.id, entidade: 'entrada_bruta', entidade_id: dem.id, ator_tipo: 'sistema', antes: null, depois: null },
    ]);
  });
});

describe('entrada pendente (C-31)', () => {
  it('entrada pendente de 91 dias é apagada, com evento sem demanda e sem o conteúdo', async () => {
    const id = await criarPendente(antesDeAgora(91));
    expect((await expurgar(deps, 90)).pendentes).toBe(1);
    expect((await b.poolMigrator.query('select count(*)::int as n from entrada_pendente where id = $1', [id])).rows[0].n).toBe(0);
    const eventos = await eventosDoSistema();
    expect(eventos).toEqual([
      { acao: 'entrada_pendente_expurgada', demanda_id: null, entidade: 'entrada_pendente', entidade_id: id, ator_tipo: 'sistema', antes: null, depois: null },
    ]);
    expect(contemSentinela(JSON.stringify(eventos))).toBe(false);
  });

  it('entrada pendente de 89 dias continua; com prazo 30, a de 31 dias é apagada', async () => {
    const recente = await criarPendente(antesDeAgora(89));
    const de31 = await criarPendente(antesDeAgora(31));
    expect((await expurgar(deps, 90)).pendentes).toBe(0);
    expect((await expurgar(deps, 30)).pendentes).toBe(2);
    expect((await b.poolMigrator.query('select id from entrada_pendente')).rows).toEqual([]);
    expect((await eventosDoSistema()).map((e) => e.entidade_id).sort()).toEqual([recente, de31].sort());
  });

  it('rodar de novo não cria evento novo para a pendente já apagada', async () => {
    await criarPendente(antesDeAgora(91));
    await expurgar(deps, 90);
    relogio.avancar(DIA);
    expect((await expurgar(deps, 90)).pendentes).toBe(0);
    expect(await eventosDoSistema()).toHaveLength(1);
  });
});

describe('sessões e verificações (C-32, D7)', () => {
  async function criarSessao(id: string, expiraEm: Date) {
    await b.poolMigrator.query('insert into session (id, expires_at, token, ip_address, user_agent, user_id) values ($1, $2, $3, $4, $5, $6)', [
      id,
      expiraEm,
      `token-ficticio-${id}`,
      '192.0.2.10',
      'Navegador Ficticio',
      cto.usuarioId,
    ]);
  }
  async function criarVerificacao(id: string, expiraEm: Date) {
    await b.poolMigrator.query('insert into verification (id, identifier, value, expires_at) values ($1, $2, $3, $4)', [id, `ident-${id}`, `valor-${id}`, expiraEm]);
  }
  const ids = async (tabela: 'session' | 'verification') => (await b.poolMigrator.query(`select id from ${tabela} order by id`)).rows.map((r) => r.id);

  it('sessão vencida há 31 dias apagada; vencida há 29, mantida; verification vencida apagada', async () => {
    await criarSessao('s-31', antesDeAgora(31));
    await criarSessao('s-29', antesDeAgora(29));
    await criarSessao('s-valida', new Date(new Date(AGORA).getTime() + 8 * 3_600_000));
    await criarVerificacao('v-vencida', antesDeAgora(0, 1));
    await criarVerificacao('v-valida', new Date(new Date(AGORA).getTime() + 60_000));
    const r = await expurgar(deps, 90);
    expect(r).toMatchObject({ sessoes: 1, verificacoes: 1 });
    expect(await ids('session')).toEqual(['s-29', 's-valida']);
    expect(await ids('verification')).toEqual(['v-valida']);
  });

  it('a sessão vencida há exatamente 30 dias fica; há 30 dias e 1 ms, sai', async () => {
    await criarSessao('s-limite', antesDeAgora(30));
    await criarSessao('s-passou', antesDeAgora(30, 1));
    expect((await expurgar(deps, 90)).sessoes).toBe(1);
    expect(await ids('session')).toEqual(['s-limite']);
  });

  it('o prazo do texto bruto não muda o das sessões', async () => {
    await criarSessao('s-31', antesDeAgora(31));
    await criarSessao('s-29', antesDeAgora(29));
    expect((await expurgar(deps, 365)).sessoes).toBe(1);
    expect(await ids('session')).toEqual(['s-29']);
  });
});

describe('registro da rotina e último expurgo (C-31)', () => {
  it('sem expurgo ainda → ultimoExpurgo é null', async () => {
    expect(await ultimoExpurgo(b.db)).toBeNull();
  });

  it('grava a hora e a soma do que foi apagado; a execução seguinte substitui, mesmo sem nada a apagar', async () => {
    await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(91) });
    await criarPendente(antesDeAgora(95));
    await b.poolMigrator.query('insert into verification (id, identifier, value, expires_at) values ($1, $2, $3, $4)', ['v-1', 'i-1', 'x', antesDeAgora(1)]);
    expect(await expurgar(deps, 90)).toEqual({ textos: 1, pendentes: 1, sessoes: 0, verificacoes: 1 });
    expect(await ultimoExpurgo(b.db)).toEqual({ em: relogio.agora(), quantidade: 3 });

    relogio.avancar(DIA);
    expect(await expurgar(deps, 90)).toEqual({ textos: 0, pendentes: 0, sessoes: 0, verificacoes: 0 });
    expect(await ultimoExpurgo(b.db)).toEqual({ em: relogio.agora(), quantidade: 0 });
    expect((await b.poolMigrator.query('select rotina from rotina_execucao')).rows).toEqual([{ rotina: 'retencao.expurgo' }]);
  });

  it('o log do expurgo leva só a quantidade, sem conteúdo nem id de demanda', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(91) });
      await criarPendente(antesDeAgora(91));
      await expurgar(deps, 90);
    } finally {
      substituirDestinoDoLog(null);
    }
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>).filter((r) => r.evento === 'retencao_expurgo');
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ evento: 'retencao_expurgo', quantidade: 2 });
    // Fora o nível e a hora do pino, só o evento e a quantidade.
    expect(
      Object.keys(registros[0]!)
        .filter((k) => k !== 'level' && k !== 'time')
        .sort(),
    ).toEqual(['evento', 'quantidade']);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
});

describe('prazo fora da regra', () => {
  it.each([0, -1, 366, 1.5, Number.NaN])('prazo %s → ErroDominio, sem apagar nada', async (prazo) => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(400) });
    await expect(expurgar(deps, prazo)).rejects.toBeInstanceOf(ErroDominio);
    expect(await entradaBrutaDe(dem.id)).toMatchObject({ texto: SENTINELAS.texto, expurgada_em: null });
    expect(await ultimoExpurgo(b.db)).toBeNull();
  });
});

describe('falha no meio', () => {
  it('erro depois do UPDATE desfaz tudo: o texto continua e não há evento nem registro da rotina', async () => {
    const dem = await criarDemandaComTexto({ texto: SENTINELAS.texto, recebidaEm: antesDeAgora(91) });
    // O relógio é lido para a data do expurgo e de novo para o evento; a segunda leitura quebra.
    let leituras = 0;
    const quebradico = {
      agora: () => {
        leituras += 1;
        if (leituras > 1) throw new Error('relógio quebrado');
        return relogio.agora();
      },
    };
    await expect(expurgar({ ...deps, relogio: quebradico }, 90)).rejects.toThrow();
    expect(await entradaBrutaDe(dem.id)).toMatchObject({ texto: SENTINELAS.texto, expurgada_em: null });
    expect(await eventosDoSistema()).toEqual([]);
    expect(await ultimoExpurgo(b.db)).toBeNull();
  });
});
