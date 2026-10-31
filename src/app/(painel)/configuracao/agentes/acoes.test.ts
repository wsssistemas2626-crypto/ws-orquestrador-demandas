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
