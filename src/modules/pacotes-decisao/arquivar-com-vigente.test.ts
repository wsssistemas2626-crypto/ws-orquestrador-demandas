// src/modules/pacotes-decisao/arquivar-com-vigente.test.ts — T06 do DEC-DEM-20261111-0018-v1 (S-04, decisão S1 de
// Fabiano e 7.1; RF-03, CA-03.1 a CA-03.5, SB-11, ADR-38): arquivar o DEC mais novo leva a demanda pelo estado do
// aprovado vigente, lido sob a trava e depois de gravarDecisao. Sem vigente, encerrada (como até a 0.4.0); com o vigente
// atualizado, aprovada, e o vigente continua gerando; com o vigente desatualizado, em_analise. Devolver não muda. As
// corridas usam duas conexões: arquivar × ESP nova, nas duas ordens, e arquivar × mudança manual de status, 50 vezes,
// sem deadlock. Postgres real, papel do app, serviços reais; relógio fixo, cada teste num dia próprio e uma autora por
// demanda (C-36); dados só fictícios.
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao } from '../../../test/integracoes';
import { criarDb } from '../../db';
import { demanda, evento } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { MOTIVOS_TRANSICAO } from '../demandas/transicoes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { gerarPedido, MENSAGENS_PEDIDO } from '../pedido-construcao/gerar';
import { situacaoDoPedido } from '../pedido-construcao/situacao';
import { obterPacoteDecisao } from './consultas';
import { criarPacoteDecisao } from './criar';
import { MENSAGENS_DECISAO, registrarDecisao } from './decidir';
import { temPacoteAprovadoAtualizado } from './desatualizado';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from './schemas';
import { vigenteDaDemanda } from './substituido';

type Nivel = 'cto' | 'cto_e_administradora';
type Cenario = { autora: AtorPessoa; demandaId: string };

const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-arq-vig-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const construir = atorDeIntegracao('construir');
const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const DOC = { referenciaDocumento: 'DOC-FICTICIO-018', dataDocumento: '2026-11-14' };

const decisaoDe = (corpo: Record<string, unknown>) => registrarDecisaoSchema.parse(corpo);
const aprovar = (extra: Record<string, unknown> = {}) => decisaoDe({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...extra });
const arquivar = () => decisaoDe({ statusDecisao: 'arquivada' });
const devolver = () => decisaoDe({ statusDecisao: 'devolvida' });
const espValida = (descricaoObjetiva = 'Calcular o frete automaticamente') =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva,
    escopoInclui: ['Cálculo de frete'],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: ['O frete sai calculado no pedido'],
    definicaoDePronto: ['pnpm test verde'],
  });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;
let autoras = 0;
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-arq-vig-${++autoras}`, nome: 'Pessoa Ficticia CTO', papel: 'cto' });

beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-14T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;
const levarA = (id: string, status: string) => b.poolMigrator.query('update demanda set status = $2 where id = $1', [id, status]);
const eventosDa = (demandaId: string) => migrator().select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(asc(evento.id));
const statusAlteradosDa = async (demandaId: string) => (await eventosDa(demandaId)).filter((e) => e.acao === 'status_alterado');

// Demanda com ESP v1 e RSK v1, de uma autora própria (C-36).
async function demandaComEspERsk(): Promise<Cenario> {
  const autora = novaAutora();
  const d = await criarDemanda(
    deps,
    autora,
    criarDemandaSchema.parse({ titulo: 'Frete da filial (fictício)', tipo: 'melhoria', solicitanteNome: 'Carla Santos Ficticia', contexto: 'A filial do litoral calcula o frete à mão.' }),
  );
  await criarEspecificacao(deps, autora, d.id, espValida());
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  return { autora, demandaId: d.id };
}

const novoDec = async (c: Cenario, nivel: Nivel = 'cto') =>
  (
    await criarPacoteDecisao(
      deps,
      c.autora,
      c.demandaId,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Resumo fictício',
        opcaoA: { descricao: 'Calcular no sistema' },
        opcaoB: { descricao: 'Manter a planilha' },
        nivelAprovacaoRequerido: nivel,
      }),
    )
  ).id;

// O v1 aprovado por inteiro (as duas aprovações no nível cto_e_administradora); a demanda fica em pronta_para_decisao.
async function comV1Aprovado(nivel: Nivel = 'cto'): Promise<Cenario & { v1: string }> {
  const c = await demandaComEspERsk();
  const v1 = await novoDec(c, nivel);
  if (nivel === 'cto_e_administradora') await registrarDecisao(deps, administradora, v1, aprovar(DOC));
  await registrarDecisao(deps, c.autora, v1, aprovar());
  expect((await obterPacoteDecisao(b.db, v1)).statusDecisao).toBe('aprovada');
  expect(await statusDa(c.demandaId)).toBe('pronta_para_decisao');
  return { ...c, v1 };
}

// Espera até uma conexão do banco do teste estar na fila de uma trava (a outra transação parou em travarDemanda).
async function esperarTrava(): Promise<void> {
  for (let i = 0; i < 500; i++) {
    const { rows } = await b.poolMigrator.query<{ n: number }>(
      "select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> pg_backend_pid()",
    );
    if (rows[0]!.n > 0) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('a segunda transação não chegou à espera da trava');
}

function sinal(): { promessa: Promise<void>; disparar: () => void } {
  let disparar!: () => void;
  const promessa = new Promise<void>((r) => {
    disparar = r;
  });
  return { promessa, disparar: () => disparar() };
}

describe('CA-03.1 a CA-03.5: arquivar o DEC mais novo pelo estado do aprovado vigente', () => {
  it('CA-03.1: v1 aprovado e atualizado, v2 pendente; arquivar o v2 → aprovada, pelo Sistema, com o predicado da transição manual', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    const antes = (await statusAlteradosDa(c.demandaId)).length;
    expect((await registrarDecisao(deps, c.autora, v2, arquivar())).resultado).toBe('arquivada');
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    const evs = await statusAlteradosDa(c.demandaId);
    expect(evs).toHaveLength(antes + 1);
    expect(evs.at(-1)).toMatchObject({ atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null, antes: { status: 'pronta_para_decisao' }, depois: { status: 'aprovada' } });
    expect(await temPacoteAprovadoAtualizado(b.db, c.demandaId)).toBe(true);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toEqual({ id: c.v1, nivel: 'cto', desatualizado: false });
  });

  it('CA-03.2: depois do arquivamento, o v1 gera o pedido e a situação dele é vigente; o v2 arquivado não gera', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    await registrarDecisao(deps, c.autora, v2, arquivar());
    const gerado = await gerarPedido(deps, c.autora, c.v1, CONFIRMADO);
    expect(gerado.nomeArquivo).toBe(`${c.v1}.json`);
    expect(JSON.parse(gerado.json)).toMatchObject({ pedido: c.v1 });
    expect((await eventosDa(c.demandaId)).filter((e) => e.acao === 'pedido_gerado').map((e) => e.entidadeId)).toEqual([c.v1]);
    expect(await situacaoDoPedido({ pool: b.poolApp }, construir, c.v1)).toBe('vigente');
    await expect(gerarPedido(deps, c.autora, v2, CONFIRMADO)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
  });

  it('CA-03.3 (outro sentido): sem DEC aprovado e com o v1 pendente; arquivar o v1 → encerrada, como até a 0.4.0', async () => {
    const c = await demandaComEspERsk();
    const v1 = await novoDec(c);
    expect(await statusDa(c.demandaId)).toBe('pronta_para_decisao');
    await registrarDecisao(deps, c.autora, v1, arquivar());
    expect(await statusDa(c.demandaId)).toBe('encerrada');
    expect((await statusAlteradosDa(c.demandaId)).at(-1)).toMatchObject({ atorTipo: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'encerrada' } });
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toBeNull();
  });

  it('CA-03.4: v1 aprovado, v2 pendente; devolver o v2 → em_analise, como até a 0.4.0', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    expect((await registrarDecisao(deps, c.autora, v2, devolver())).resultado).toBe('devolvida');
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    expect((await statusAlteradosDa(c.demandaId)).at(-1)).toMatchObject({ atorTipo: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'em_analise' } });
  });

  it('CA-03.5: v1 de dupla aprovação aprovado e v2 só do CTO pendente (recusado pelo S-01); arquivar o v2 → aprovada, e o v1 gera', async () => {
    const c = await comV1Aprovado('cto_e_administradora');
    const v2 = await novoDec(c);
    await expect(registrarDecisao(deps, c.autora, v2, aprovar())).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_DECISAO.nivelMenorQueOVigente });
    await registrarDecisao(deps, c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toEqual({ id: c.v1, nivel: 'cto_e_administradora', desatualizado: false });
    expect(JSON.parse((await gerarPedido(deps, c.autora, c.v1, CONFIRMADO)).json)).toMatchObject({ pedido: c.v1 });
  });
});

describe('7.1 e SB-11: vigente desatualizado, aprovação incompleta e fora das origens', () => {
  it('7.1: v1 aprovado e desatualizado, v2 pendente e atualizado; arquivar o v2 → em_analise; já em em_analise, continua, sem evento', async () => {
    const c = await comV1Aprovado();
    await criarEspecificacao(deps, c.autora, c.demandaId, espValida('Calcular o frete automaticamente, versão 2'));
    const v2 = await novoDec(c);
    expect((await obterPacoteDecisao(b.db, v2)).desatualizado).toBe(false);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toEqual({ id: c.v1, nivel: 'cto', desatualizado: true });
    await registrarDecisao(deps, c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    expect((await statusAlteradosDa(c.demandaId)).at(-1)).toMatchObject({ atorTipo: 'sistema', antes: { status: 'pronta_para_decisao' }, depois: { status: 'em_analise' } });

    const outra = await comV1Aprovado();
    await criarEspecificacao(deps, outra.autora, outra.demandaId, espValida('Calcular o frete automaticamente, versão 2'));
    const w2 = await novoDec(outra);
    await levarA(outra.demandaId, 'em_analise');
    const antes = (await statusAlteradosDa(outra.demandaId)).length;
    await registrarDecisao(deps, outra.autora, w2, arquivar());
    expect(await statusDa(outra.demandaId)).toBe('em_analise');
    expect(await statusAlteradosDa(outra.demandaId)).toHaveLength(antes);
  });

  it('SB-11 (c): v1 de dupla aprovação com só a primeira aprovação e v2 pendente; arquivar o v2 → encerrada', async () => {
    const c = await demandaComEspERsk();
    const v1 = await novoDec(c, 'cto_e_administradora');
    expect((await registrarDecisao(deps, administradora, v1, aprovar(DOC))).resultado).toBe('aprovacao_parcial');
    const v2 = await novoDec(c);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toBeNull();
    await registrarDecisao(deps, c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('encerrada');
  });

  it('fora das origens: v1 aprovado, demanda em aprovada e v2 pendente; arquivar o v2 → continua aprovada, sem evento de status', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    await levarA(c.demandaId, 'aprovada');
    const antes = (await statusAlteradosDa(c.demandaId)).length;
    expect((await registrarDecisao(deps, c.autora, v2, arquivar())).resultado).toBe('arquivada');
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    expect(await statusAlteradosDa(c.demandaId)).toHaveLength(antes);
  });
});

describe('SB-11 (d): arquivar o v2 × ESP nova da mesma demanda, em duas conexões', () => {
  it('(i) a ESP nova segura a trava; o arquivamento espera → vê o v1 desatualizado e leva a em_analise', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    const gravou = sinal();
    const soltar = sinal();
    const esp = comTransacao(b.poolApp, async (t) => {
      await criarEspecificacao(deps, c.autora, c.demandaId, espValida('Calcular o frete automaticamente, versão 2'), t);
      gravou.disparar();
      await soltar.promessa;
    });
    await gravou.promessa;
    const arquivamento = registrarDecisao(deps, c.autora, v2, arquivar());
    try {
      await esperarTrava();
    } finally {
      soltar.disparar();
    }
    await esp;
    expect((await arquivamento).resultado).toBe('arquivada');
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toMatchObject({ id: c.v1, desatualizado: true });
  });

  it('(ii) o arquivamento segura a trava; a ESP nova espera → aprovada, e só depois o v1 fica desatualizado', async () => {
    const c = await comV1Aprovado();
    const v2 = await novoDec(c);
    const arquivou = sinal();
    const soltar = sinal();
    const arquivamento = comTransacao(b.poolApp, async (t) => {
      await registrarDecisao(deps, c.autora, v2, arquivar(), t);
      arquivou.disparar();
      await soltar.promessa;
    });
    await arquivou.promessa;
    const esp = criarEspecificacao(deps, c.autora, c.demandaId, espValida('Calcular o frete automaticamente, versão 2'));
    try {
      await esperarTrava();
    } finally {
      soltar.disparar();
    }
    await arquivamento;
    await esp;
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    const evs = await eventosDa(c.demandaId);
    const iAprovada = evs.findIndex((e) => e.acao === 'status_alterado' && (e.depois as { status?: string } | null)?.status === 'aprovada');
    const iEspV2 = evs.findIndex((e) => e.acao === 'especificacao_criada' && e.entidadeId.endsWith('-v2'));
    expect(iAprovada).toBeGreaterThanOrEqual(0);
    expect(iEspV2).toBeGreaterThan(iAprovada);
    expect(await vigenteDaDemanda(b.db, c.demandaId)).toMatchObject({ id: c.v1, desatualizado: true });
  });
});

// SB-11 (e): 50 repetições em cinco lotes de dez, cada demanda com a sua autora (C-36).
describe('SB-11 (e): arquivar o v2 × mudança manual para em_analise, em duas conexões, sem deadlock', () => {
  it.each([1, 2, 3, 4, 5])('lote %i de 10: os dois desfechos possíveis terminam em aprovada, e nada rejeita com 40P01', async () => {
    for (let i = 0; i < 10; i++) {
      const c = await comV1Aprovado();
      const v2 = await novoDec(c);
      const [arq, manual] = await Promise.allSettled([
        registrarDecisao(deps, c.autora, v2, arquivar()),
        alterarDemanda(deps, c.autora, c.demandaId, alterarDemandaSchema.parse({ status: 'em_analise' })),
      ]);
      for (const r of [arq, manual]) if (r.status === 'rejected') expect((r.reason as { code?: string }).code).not.toBe('40P01');
      expect(arq.status).toBe('fulfilled');
      expect(await statusDa(c.demandaId)).toBe('aprovada');
      const caminho = (await statusAlteradosDa(c.demandaId)).slice(1).map((e) => [e.atorTipo, (e.antes as { status: string }).status, (e.depois as { status: string }).status]);
      if (manual.status === 'fulfilled') {
        // (i) a manual confirmou antes; o arquivamento levou de em_analise a aprovada.
        expect(caminho).toEqual([
          ['pessoa', 'pronta_para_decisao', 'em_analise'],
          ['sistema', 'em_analise', 'aprovada'],
        ]);
      } else {
        // (ii) o arquivamento confirmou antes; aprovada não vai a em_analise.
        expect(manual.reason).toMatchObject({ codigo: 'conflito', mensagem: MOTIVOS_TRANSICAO.foraDaTabela });
        expect(caminho).toEqual([['sistema', 'pronta_para_decisao', 'aprovada']]);
      }
    }
  });
});
