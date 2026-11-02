// T45: as duas Server Actions da T12 Agentes e teto de gasto contra o banco e o Better Auth reais (Testcontainers). A
// regra é a das rotas da API: PUT /api/configuracao/teto (definirTeto) e PATCH /api/agentes/:agente (alterarAgente, sem
// o modelo, que o painel não escolhe). Só o CTO altera (C-12, C-26): a administradora recebe 403 e nada muda, mesmo
// chamando a ação direto, sem a tela. A autoria vem da sessão (C-11). Relógio fixo (RNF-15). Dados só fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../test/deps';
import { criarPessoa } from '../../../../../test/sessao';
import { erroDeAlternar, errosDoTeto, mensagemNaoLigou } from '../../../../components/dados-dos-agentes';
import { definirDepsParaTeste, type Deps } from '../../../../lib/deps';
import { substituirDestinoDoLog } from '../../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../../lib/relogio';
import { MENSAGENS_ACESSO } from '../../../../modules/acesso/mensagens';
import { MENSAGENS_TETO } from '../../../../modules/agentes/teto';
import { alternarAgenteNoPainel, salvarTetoNoPainel } from './acoes';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../../../lib/sentry', () => ({ capturarErro: () => undefined }));

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let cookieAdm: string;
let cookieSem2fa: string;
let idCto: string;

const como = (cookie: string) => {
  pedido.cabecalhos = new Headers({ cookie });
};

type LinhaAgente = { ligado: boolean; modelo: string | null; atualizado_em: Date | null; atualizado_por: string | null };
const agenteNoBanco = async (agente: string): Promise<LinhaAgente> =>
  (await b.poolMigrator.query<LinhaAgente>('select ligado, modelo, atualizado_em, atualizado_por from configuracao_agente where agente = $1', [agente])).rows[0]!;
const tetoNoBanco = async (): Promise<{ teto: string; atualizado_por: string | null }> =>
  (await b.poolMigrator.query<{ teto: string; atualizado_por: string | null }>('select teto_mensal as teto, atualizado_por from configuracao_ia where id = 1')).rows[0]!;
const eventos = async (entidade: string) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; entidade_id: string; demanda_id: string | null }>(
      'select acao, ator_tipo, ator_id, entidade_id, demanda_id from evento where entidade = $1 order by id',
      [entidade],
    )
  ).rows;

beforeAll(async () => {
  b = await novoBanco();
  relogio = relogioFixo(AGORA);
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const pc = await criarPessoa(deps, { papel: 'cto' });
  const pa = await criarPessoa(deps, { papel: 'administradora' });
  const ps = await criarPessoa(deps, { papel: 'cto', com2fa: false });
  cookieCto = pc.cookie;
  cookieAdm = pa.cookie;
  cookieSem2fa = ps.cookie;
  idCto = pc.usuarioId;
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});

afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

// Cada caso começa do sistema novo: teto 0, os quatro desligados e sem modelo, sem evento de configuração (o migrator é
// o dono das tabelas; o papel do app não apaga evento, C-34).
beforeEach(async () => {
  relogio.definir(AGORA);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null, atualizado_em = null, atualizado_por = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 0, atualizado_em = null, atualizado_por = null where id = 1');
  await b.poolMigrator.query(`delete from evento where entidade in ('configuracao_agente', 'configuracao_ia')`);
  como(cookieCto);
});

describe('salvarTetoNoPainel (T45; RF-18)', () => {
  it('CTO: grava com vírgula, devolve só o teto e registra o evento com a pessoa da sessão', async () => {
    const r = await salvarTetoNoPainel({ tetoMensal: '10,00' });
    expect(r).toEqual({ ok: true, dados: { tetoMensal: 10 } });
    expect(await tetoNoBanco()).toEqual({ teto: '10.00', atualizado_por: idCto });
    expect(await eventos('configuracao_ia')).toEqual([{ acao: 'teto_alterado', ator_tipo: 'pessoa', ator_id: idCto, entidade_id: '1', demanda_id: null }]);
    // O mesmo valor de novo não grava nem gera evento.
    expect(await salvarTetoNoPainel({ tetoMensal: '10' })).toEqual({ ok: true, dados: { tetoMensal: 10 } });
    expect(await eventos('configuracao_ia')).toHaveLength(1);
  });

  it('negativo e formato errado: 400 no campo, com a mensagem da 03, e nada muda', async () => {
    const negativo = await salvarTetoNoPainel({ tetoMensal: '-1' });
    expect(negativo).toMatchObject({ ok: false, erro: 'entrada_invalida', campos: [{ campo: 'tetoMensal', mensagem: MENSAGENS_TETO.negativo }] });
    if (!negativo.ok) expect(errosDoTeto(negativo).porCampo).toEqual({ tetoMensal: 'O teto não pode ser negativo.' });
    const formato = await salvarTetoNoPainel({ tetoMensal: '10,123' });
    expect(formato).toMatchObject({ ok: false, erro: 'entrada_invalida', campos: [{ campo: 'tetoMensal', mensagem: MENSAGENS_TETO.formato }] });
    expect(await tetoNoBanco()).toEqual({ teto: '0.00', atualizado_por: null });
    expect(await eventos('configuracao_ia')).toEqual([]);
  });

  it('C-11: autoria enviada no corpo é descartada; vale a da sessão', async () => {
    expect(await salvarTetoNoPainel({ tetoMensal: '5', atualizadoPor: 'u-outra', autorId: 'u-outra' })).toEqual({ ok: true, dados: { tetoMensal: 5 } });
    expect((await tetoNoBanco()).atualizado_por).toBe(idCto);
  });

  it('C-12 e C-26: a administradora recebe 403 com o texto da 2.8, e nada muda', async () => {
    como(cookieAdm);
    const r = await salvarTetoNoPainel({ tetoMensal: '10,00' });
    expect(r).toEqual({ ok: false, erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    if (!r.ok) expect(errosDoTeto(r).alerta).toBe(MENSAGENS_ACESSO.sem_permissao);
    expect(await tetoNoBanco()).toEqual({ teto: '0.00', atualizado_por: null });
    expect(await eventos('configuracao_ia')).toEqual([]);
  });

  it('sem sessão: 401; sem 2FA: sem_2fa; nada muda', async () => {
    como('');
    expect(await salvarTetoNoPainel({ tetoMensal: '10' })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    como(cookieSem2fa);
    expect(await salvarTetoNoPainel({ tetoMensal: '10' })).toMatchObject({ ok: false, erro: 'sem_2fa' });
    expect(await tetoNoBanco()).toEqual({ teto: '0.00', atualizado_por: null });
  });
});

describe('alternarAgenteNoPainel (T45; RF-19)', () => {
  it('ligar sem modelo com preço vigente: 409 com a frase da 03, e o agente continua desligado, sem evento', async () => {
    const r = await alternarAgenteNoPainel({ agente: 'risco', ligado: true });
    expect(r).toEqual({ ok: false, erro: 'conflito', mensagem: mensagemNaoLigou('risco') });
    if (!r.ok) expect(erroDeAlternar('risco', true, r)).toBe('Não foi possível ligar o agente de risco. Ele continua desligado.');
    expect(await agenteNoBanco('risco')).toEqual({ ligado: false, modelo: null, atualizado_em: null, atualizado_por: null });
    expect(await eventos('configuracao_agente')).toEqual([]);
  });

  it('o painel não escolhe o modelo: o `modelo` enviado é descartado (vale o que a API gravou)', async () => {
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: true, modelo: MODELO })).toMatchObject({ ok: false, erro: 'conflito' });
    expect((await agenteNoBanco('risco')).modelo).toBeNull();
  });

  it('com o modelo gravado pela API: liga e desliga, devolve só o agente e o estado, e cada mudança vai ao histórico', async () => {
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'risco'`, [MODELO]);
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: true })).toEqual({ ok: true, dados: { agente: 'risco', ligado: true } });
    expect(await agenteNoBanco('risco')).toMatchObject({ ligado: true, modelo: MODELO, atualizado_por: idCto });
    relogio.avancar(60_000);
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: false })).toEqual({ ok: true, dados: { agente: 'risco', ligado: false } });
    expect(await agenteNoBanco('risco')).toMatchObject({ ligado: false, modelo: MODELO, atualizado_por: idCto });
    expect(await eventos('configuracao_agente')).toEqual([
      { acao: 'agente_ligado', ator_tipo: 'pessoa', ator_id: idCto, entidade_id: 'risco', demanda_id: null },
      { acao: 'agente_desligado', ator_tipo: 'pessoa', ator_id: idCto, entidade_id: 'risco', demanda_id: null },
    ]);
    // Desligar o que já está desligado não grava nem gera evento: os outros três seguem "Nunca alterado".
    expect(await alternarAgenteNoPainel({ agente: 'consolidacao', ligado: false })).toEqual({ ok: true, dados: { agente: 'consolidacao', ligado: false } });
    expect(await agenteNoBanco('consolidacao')).toEqual({ ligado: false, modelo: null, atualizado_em: null, atualizado_por: null });
  });

  it('C-12 e C-26: a administradora recebe 403, e nada muda', async () => {
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'risco'`, [MODELO]);
    como(cookieAdm);
    const r = await alternarAgenteNoPainel({ agente: 'risco', ligado: true });
    expect(r).toEqual({ ok: false, erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    if (!r.ok) expect(erroDeAlternar('risco', true, r)).toBe(MENSAGENS_ACESSO.sem_permissao);
    expect((await agenteNoBanco('risco')).ligado).toBe(false);
    expect(await eventos('configuracao_agente')).toEqual([]);
  });

  it('C-17: agente fora da lista fechada e estado que não é booleano dão entrada_invalida; sem sessão, 401', async () => {
    for (const entrada of [{ agente: 'outro', ligado: true }, { agente: '__proto__', ligado: false }, { agente: 'risco', ligado: 'sim' }, { ligado: true }, null]) {
      expect(await alternarAgenteNoPainel(entrada), JSON.stringify(entrada)).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    }
    como('');
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: false })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(await eventos('configuracao_agente')).toEqual([]);
  });
});

// qa-automacao (06-T45-testes): bordas e falhas que a tela não mostra, pelas mesmas ações, chamadas direto.
type EventoCompleto = { acao: string; ator_id: string; ocorrido_em: Date; antes: unknown; depois: unknown };
const eventosCompletos = async (entidade: string): Promise<EventoCompleto[]> =>
  (
    await b.poolMigrator.query<EventoCompleto>('select acao, ator_id, ocorrido_em, antes, depois from evento where entidade = $1 order by id', [entidade])
  ).rows;

describe('salvarTetoNoPainel: bordas e concorrência (qa-automacao)', () => {
  it('o maior teto que o schema aceita (10 dígitos e 2 casas) cabe no numeric(12, 2) do banco e não vira erro interno', async () => {
    expect(await salvarTetoNoPainel({ tetoMensal: '9999999999,99' })).toEqual({ ok: true, dados: { tetoMensal: 9999999999.99 } });
    expect(await tetoNoBanco()).toEqual({ teto: '9999999999.99', atualizado_por: idCto });
    // Um dígito a mais é recusado antes do banco, com a mensagem de formato.
    expect(await salvarTetoNoPainel({ tetoMensal: '12345678901' })).toMatchObject({
      ok: false,
      erro: 'entrada_invalida',
      campos: [{ campo: 'tetoMensal', mensagem: MENSAGENS_TETO.formato }],
    });
    expect((await tetoNoBanco()).teto).toBe('9999999999.99');
  });

  it('espaços nas pontas são aceitos e o valor gravado é o número; número em vez de texto é entrada_invalida, e nada muda', async () => {
    expect(await salvarTetoNoPainel({ tetoMensal: '  7,25  ' })).toEqual({ ok: true, dados: { tetoMensal: 7.25 } });
    expect((await tetoNoBanco()).teto).toBe('7.25');
    for (const entrada of [{ tetoMensal: 10 }, { tetoMensal: null }, {}, null, 'texto']) {
      expect(await salvarTetoNoPainel(entrada), JSON.stringify(entrada)).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    }
    expect((await tetoNoBanco()).teto).toBe('7.25');
    expect(await eventos('configuracao_ia')).toHaveLength(1);
  });

  it('baixar o teto a 0 também grava, com o antes e o depois no evento e a hora do relógio injetado', async () => {
    await salvarTetoNoPainel({ tetoMensal: '10' });
    relogio.avancar(60_000);
    expect(await salvarTetoNoPainel({ tetoMensal: '0' })).toEqual({ ok: true, dados: { tetoMensal: 0 } });
    expect(await tetoNoBanco()).toEqual({ teto: '0.00', atualizado_por: idCto });
    const ev = await eventosCompletos('configuracao_ia');
    expect(ev.map((e) => [e.acao, e.ator_id, e.antes, e.depois])).toEqual([
      ['teto_alterado', idCto, { tetoMensal: 0 }, { tetoMensal: 10 }],
      ['teto_alterado', idCto, { tetoMensal: 10 }, { tetoMensal: 0 }],
    ]);
    expect(ev.map((e) => e.ocorrido_em.toISOString())).toEqual(['2026-10-22T12:00:00.000Z', '2026-10-22T12:01:00.000Z']);
  });

  it('duas gravações ao mesmo tempo entram uma depois da outra: o "antes" da segunda é o "depois" da primeira', async () => {
    const [r1, r2] = await Promise.all([salvarTetoNoPainel({ tetoMensal: '7' }), salvarTetoNoPainel({ tetoMensal: '9' })]);
    expect([r1.ok, r2.ok]).toEqual([true, true]);
    const ev = await eventosCompletos('configuracao_ia');
    expect(ev).toHaveLength(2);
    expect(ev[0]!.antes).toEqual({ tetoMensal: 0 });
    expect(ev[1]!.antes).toEqual(ev[0]!.depois);
    expect([ev[0]!.depois, ev[1]!.depois]).toEqual(expect.arrayContaining([{ tetoMensal: 7 }, { tetoMensal: 9 }]));
    expect(Number((await tetoNoBanco()).teto)).toBe((ev[1]!.depois as { tetoMensal: number }).tetoMensal);
  });
});

describe('alternarAgenteNoPainel: bordas e concorrência (qa-automacao)', () => {
  const MODELO_FUTURO = 'modelo-ficticio-futuro';
  const VIGENCIA_FUTURA = '2026-11-01T03:00:00.000Z';

  it('CA-19.3 por inteiro: quem ligou e desligou e quando, pelo relógio injetado, com o antes e o depois no evento', async () => {
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'risco'`, [MODELO]);
    await alternarAgenteNoPainel({ agente: 'risco', ligado: true });
    relogio.avancar(90_000);
    await alternarAgenteNoPainel({ agente: 'risco', ligado: false });
    const ev = await eventosCompletos('configuracao_agente');
    expect(ev.map((e) => [e.acao, e.ator_id, e.ocorrido_em.toISOString(), e.antes, e.depois])).toEqual([
      ['agente_ligado', idCto, '2026-10-22T12:00:00.000Z', { ligado: false, modelo: MODELO }, { ligado: true, modelo: MODELO }],
      ['agente_desligado', idCto, '2026-10-22T12:01:30.000Z', { ligado: true, modelo: MODELO }, { ligado: false, modelo: MODELO }],
    ]);
    const linha = await agenteNoBanco('risco');
    expect(linha.atualizado_em?.toISOString()).toBe('2026-10-22T12:01:30.000Z');
    expect(linha.atualizado_por).toBe(idCto);
  });

  it('ligar o que já está ligado não grava nem gera evento, e a última mudança continua a primeira', async () => {
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'risco'`, [MODELO]);
    await alternarAgenteNoPainel({ agente: 'risco', ligado: true });
    relogio.avancar(60_000);
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: true })).toEqual({ ok: true, dados: { agente: 'risco', ligado: true } });
    expect(await eventos('configuracao_agente')).toHaveLength(1);
    expect((await agenteNoBanco('risco')).atualizado_em?.toISOString()).toBe('2026-10-22T12:00:00.000Z');
  });

  it('duas tentativas de ligar ao mesmo tempo: as duas respondem ligado, e o histórico tem um evento só', async () => {
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'risco'`, [MODELO]);
    const rs = await Promise.all([alternarAgenteNoPainel({ agente: 'risco', ligado: true }), alternarAgenteNoPainel({ agente: 'risco', ligado: true })]);
    for (const r of rs) expect(r).toEqual({ ok: true, dados: { agente: 'risco', ligado: true } });
    const ev = await eventosCompletos('configuracao_agente');
    expect(ev.map((e) => [e.acao, e.antes])).toEqual([['agente_ligado', { ligado: false, modelo: MODELO }]]);
  });

  it('modelo com preço que só vale no futuro: 409 com a frase da 03 até a vigência; no instante da vigência, liga', async () => {
    await b.poolMigrator.query(
      `insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2) on conflict (modelo, vigente_desde) do nothing`,
      [MODELO_FUTURO, VIGENCIA_FUTURA],
    );
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'orquestrador'`, [MODELO_FUTURO]);
    expect(await alternarAgenteNoPainel({ agente: 'orquestrador', ligado: true })).toEqual({
      ok: false,
      erro: 'conflito',
      mensagem: 'Não foi possível ligar o agente orquestrador. Ele continua desligado.',
    });
    expect((await agenteNoBanco('orquestrador')).ligado).toBe(false);
    relogio.definir('2026-11-01T02:59:59.999Z');
    expect(await alternarAgenteNoPainel({ agente: 'orquestrador', ligado: true })).toMatchObject({ ok: false, erro: 'conflito' });
    expect(await eventos('configuracao_agente')).toEqual([]);
    relogio.definir(VIGENCIA_FUTURA);
    expect(await alternarAgenteNoPainel({ agente: 'orquestrador', ligado: true })).toEqual({ ok: true, dados: { agente: 'orquestrador', ligado: true } });
    expect(await eventos('configuracao_agente')).toHaveLength(1);
  });

  it('C-12 e C-26 no outro sentido: a administradora também não desliga um agente ligado, e nada muda', async () => {
    await b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1 where agente = 'risco'`, [MODELO]);
    como(cookieAdm);
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: false })).toEqual({ ok: false, erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await agenteNoBanco('risco')).toEqual({ ligado: true, modelo: MODELO, atualizado_em: null, atualizado_por: null });
    expect(await eventos('configuracao_agente')).toEqual([]);
  });

  it('sem 2FA: sem_2fa no interruptor, e nada muda', async () => {
    await b.poolMigrator.query(`update configuracao_agente set modelo = $1 where agente = 'risco'`, [MODELO]);
    como(cookieSem2fa);
    expect(await alternarAgenteNoPainel({ agente: 'risco', ligado: true })).toMatchObject({ ok: false, erro: 'sem_2fa' });
    expect((await agenteNoBanco('risco')).ligado).toBe(false);
    expect(await eventos('configuracao_agente')).toEqual([]);
  });
});

describe('C-21: o log das duas ações', () => {
  it('uma linha por chamada, só com a ação, o tempo, o tipo de ator e o código; nada do valor nem do agente', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({
      write: (l) => {
        linhas.push(l);
      },
    });
    try {
      await salvarTetoNoPainel({ tetoMensal: '987654,32' });
      await salvarTetoNoPainel({ tetoMensal: '-55' });
      await alternarAgenteNoPainel({ agente: 'insumo_tecnico', ligado: true });
    } finally {
      substituirDestinoDoLog(null);
    }
    // Sem a hora do pino, que é um número qualquer e poderia conter um dos valores por acaso.
    const objetos = linhas.map((l) => {
      const o = JSON.parse(l) as Record<string, unknown>;
      delete o.time;
      return o;
    });
    const daAcao = objetos.filter((l) => l.evento === 'acao_painel');
    expect(daAcao.map((l) => [l.rota, l.atorTipo, l.codigoErro])).toEqual([
      ['alterar_teto', 'pessoa', undefined],
      ['alterar_teto', 'pessoa', 'entrada_invalida'],
      ['alterar_agente', 'pessoa', 'conflito'],
    ]);
    for (const l of daAcao) expect(Object.keys(l).filter((k) => !['level', 'msg', 'evento', 'rota', 'ms', 'atorTipo', 'codigoErro'].includes(k))).toEqual([]);
    const tudo = JSON.stringify(objetos);
    for (const proibido of ['987654', '-55', 'insumo_tecnico', idCto]) expect(tudo, proibido).not.toContain(proibido);
  });
});
