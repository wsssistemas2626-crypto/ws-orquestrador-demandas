// T08 do DEC-DEM-20261111-0016-v1 (RF-06, IN-07, C-04, P-01): a Server Action "Confirmar demanda" do detalhe da demanda,
// contra o banco e o Better Auth reais (Testcontainers), no molde de especificacoes/nova/acoes.test.ts. Qualquer pessoa com
// sessão e 2FA confirma, de qualquer papel, sem diálogo (P-01 de Fabiano). A regra é a de confirmarDemanda: o id passa
// pela regex antes de tocar o banco (C-17), a entrada é objeto estrito (C-11) e a resposta leva só o id. Relógio fixo,
// duas horas por teste (limite de 10 por hora do Awave, IN-09). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../../../test/integracoes';
import { criarPessoa } from '../../../../../test/sessao';
import { definirDepsParaTeste, type Deps } from '../../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../../lib/erros';
import { substituirDestinoDoLog } from '../../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../../lib/relogio';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../../modules/acesso/mensagens';
import { MENSAGENS_CONFIRMACAO } from '../../../../modules/demandas/confirmar';
import { criarDemandaSchema } from '../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../modules/demandas/servico';
import { confirmarDemandaNoPainel } from './acoes';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../../../lib/sentry', () => ({ capturarErro: () => undefined }));

const AGORA = '2026-10-22T12:00:00Z';
const HORA = 3_600_000;

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let cookieAdm: string;
let cookieSem2fa: string;
let usuarioCto: string;
let usuarioAdm: string;
let passo = 0;

const doAwave = async () => (await criarDemanda(deps, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE))).id;

const eventos = async (id: string) =>
  (
    await b.poolMigrator.query<{ ator_tipo: string; ator_id: string; depois: unknown }>(
      `select ator_tipo, ator_id, depois from evento where acao = 'demanda_confirmada' and entidade_id = $1 order by id`,
      [id],
    )
  ).rows;

const como = (cookie: string | null) => {
  pedido.cabecalhos = cookie === null ? new Headers() : new Headers({ cookie });
};

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
  usuarioCto = pc.usuarioId;
  usuarioAdm = pa.usuarioId;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  como(cookieCto);
});

describe('confirmarDemandaNoPainel (RF-06, P-01)', () => {
  it('pessoa cto com 2FA confirma: a resposta tem só o id, e o evento sai com a pessoa da sessão', async () => {
    const id = await doAwave();
    expect(await confirmarDemandaNoPainel({ id })).toEqual({ ok: true, dados: { id } });
    expect(await eventos(id)).toEqual([{ ator_tipo: 'pessoa', ator_id: usuarioCto, depois: { confirmada: true } }]);
  });

  it('P-01: qualquer papel confirma: a administradora com 2FA também', async () => {
    const id = await doAwave();
    como(cookieAdm);
    expect(await confirmarDemandaNoPainel({ id })).toEqual({ ok: true, dados: { id } });
    expect(await eventos(id)).toEqual([{ ator_tipo: 'pessoa', ator_id: usuarioAdm, depois: { confirmada: true } }]);
  });

  it('CA-06.3: confirmar de novo pelo painel não é erro e não grava outro evento', async () => {
    const id = await doAwave();
    await confirmarDemandaNoPainel({ id });
    como(cookieAdm);
    expect(await confirmarDemandaNoPainel({ id })).toEqual({ ok: true, dados: { id } });
    expect(await eventos(id)).toHaveLength(1);
  });

  it('sem sessão: nao_autenticado, nada gravado', async () => {
    const id = await doAwave();
    como(null);
    expect(await confirmarDemandaNoPainel({ id })).toEqual({ ok: false, erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.nao_autenticado });
    expect(await eventos(id)).toEqual([]);
  });

  it('sessão sem 2FA: sem_2fa, nada gravado', async () => {
    const id = await doAwave();
    como(cookieSem2fa);
    expect(await confirmarDemandaNoPainel({ id })).toEqual({ ok: false, erro: 'sem_2fa', mensagem: MENSAGENS_ACESSO.sem_2fa });
    expect(await eventos(id)).toEqual([]);
  });

  it('C-11: chave a mais na entrada → entrada_invalida, nada gravado', async () => {
    const id = await doAwave();
    expect(await confirmarDemandaNoPainel({ id, extra: 1 })).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    expect(await confirmarDemandaNoPainel({ id, confirmada: false })).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    expect(await eventos(id)).toEqual([]);
  });

  it('C-17: id fora do formato, ausente ou de outro tipo → entrada_invalida, sem tocar o banco', async () => {
    for (const entrada of [{ id: 'DEM-1' }, { id: "DEM-20261022-0001' or 1=1" }, { id: 20261022 }, {}, null, 'DEM-20261022-0001'])
      expect(await confirmarDemandaNoPainel(entrada)).toMatchObject({ ok: false, erro: 'entrada_invalida' });
  });

  it('demanda que não existe: nao_encontrado com o texto de sempre', async () => {
    expect(await confirmarDemandaNoPainel({ id: 'DEM-20261022-9999' })).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('CA-06.4: demanda de pessoa → conflito com a mensagem da 03, nada gravado', async () => {
    const ator: AtorPessoa = { tipo: 'pessoa', usuarioId: usuarioCto, nome: 'Pessoa Ficticia', papel: 'cto' };
    const { id } = await criarDemanda(deps, ator, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));
    expect(await confirmarDemandaNoPainel({ id })).toEqual({ ok: false, erro: 'conflito', mensagem: MENSAGENS_CONFIRMACAO.outraOrigem });
    expect(await eventos(id)).toEqual([]);
  });

  it('C-21: a linha de log tem só o nome da ação e o tipo do ator, sem o id da demanda', async () => {
    const id = await doAwave();
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      await confirmarDemandaNoPainel({ id });
    } finally {
      substituirDestinoDoLog(null);
    }
    const daAcao = linhas.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'acao_painel');
    expect(daAcao).toHaveLength(1);
    const { time, ms, ...resto } = daAcao[0]!;
    expect(typeof time).toBe('number');
    expect(typeof ms).toBe('number');
    expect(resto).toEqual({ level: 30, evento: 'acao_painel', rota: 'confirmar_demanda', atorTipo: 'pessoa' });
    expect(linhas.join('\n').includes(id)).toBe(false);
  });
});
