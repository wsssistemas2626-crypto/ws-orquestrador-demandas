// 06-T10-testes (qa-automacao): bordas das leituras do Pedido de Construção no histórico (pendentes.ts) que os testes
// da T10 não cobrem, contra o Postgres real pelo papel do app (Testcontainers):
//   - o filtro de decisão `aprovada` da lista (sem ele, um DEC devolvido com pedido_gerado de pessoa entraria);
//   - o filtro de entidade do recebido, na lista e em recebidoComSha;
//   - as leituras na transação de quem chama (a T11 e a T12 as usam sob a trava, com `tx`);
//   - id com caractere de SQL ou de LIKE, e nenhuma das cinco grava evento.
// Relógio fixo, cada teste num dia e em demandas próprias; o banco é compartilhado, então cada teste olha só os próprios
// DEC e as contagens de evento são relativas. Dados só fictícios; eventos do /construir pelo migrator, prefixo `ficticio`.
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { demanda, evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorIntegracao, AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { registrarEvento } from '../historico/registrar';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { gerarPedido } from './gerar';
import { listarPendentes, pedidoGeradoPorPessoa, recebidoComSha, recebimentoDoPedido, shasEntregues } from './pendentes';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-pendentes-bordas-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const construir: AtorIntegracao = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'ficticio' };

const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

// 64 hexadecimais minúsculos, fictícios.
const sha = (n: number) => n.toString(16).padStart(64, '0');

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([{ id: cto.usuarioId, name: cto.nome, email: 'pendentes-bordas-cto@exemplo.test', papel: 'cto' }]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-12T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const novoDec = async (demandaId: string) =>
  (
    await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Corrigir a importação de pedidos',
        opcaoA: { descricao: 'Corrigir no importador' },
        opcaoB: { descricao: 'Refazer a integração' },
        nivelAprovacaoRequerido: 'cto',
      }),
    )
  ).id;

// Demanda com ESP e RSK, um DEC aprovado e o pedido gerado por pessoa, pelo caminho real.
async function prepararGerado(): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados (fictício)',
      tipo: 'bug',
      solicitanteNome: 'Carlos Exemplar',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
    }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(ESP));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(RSK));
  const decId = await novoDec(d.id);
  await registrarDecisao(deps, cto, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
  await gerarPedido(deps, cto, decId, CONFIRMADO);
  return { demandaId: d.id, decId };
}

type EventoAMao = {
  acao: 'pedido_gerado' | 'pedido_entregue' | 'pedido_recebido';
  decId: string;
  demandaId: string;
  atorTipo: 'pessoa' | 'integracao';
  atorId: string;
  prefixo?: string | null;
  entidade?: string;
  depois?: unknown;
};

// Pelo migrator: o ator e a entidade ficam exatamente como o teste quer.
async function inserirEvento(e: EventoAMao): Promise<void> {
  await b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      '2026-11-25T10:00:00Z',
      e.atorTipo,
      e.atorId,
      e.prefixo ?? null,
      e.demandaId,
      e.entidade ?? 'pacote_decisao',
      e.decId,
      e.acao,
      e.depois === undefined ? null : JSON.stringify(e.depois),
    ],
  );
}

const pendentesEntre = async (ids: string[]) => (await listarPendentes(b.db)).map((i) => i.decId).filter((id) => ids.includes(id));
const totalDeEventos = async () => (await b.db.select({ n: count() }).from(evento))[0]!.n;

describe('pendentes.ts: bordas das leituras do pedido (06-T10-testes)', () => {
  it('só decisão aprovada conta: um v2 devolvido, com pedido_gerado de pessoa, fica fora e não substitui o v1 aprovado', async () => {
    const { demandaId, decId: v1 } = await prepararGerado();
    const v2 = await novoDec(demandaId);
    await registrarDecisao(deps, cto, v2, registrarDecisaoSchema.parse({ statusDecisao: 'devolvida' }));
    // A devolução leva a demanda a em_analise, que não é status final: o que tira o v2 é só a decisão.
    const [linha] = await b.db.select({ status: demanda.status }).from(demanda).where(eq(demanda.id, demandaId));
    expect(linha?.status).toBe('em_analise');
    await inserirEvento({ acao: 'pedido_gerado', decId: v2, demandaId, atorTipo: 'pessoa', atorId: cto.usuarioId, depois: CONFIRMADO });
    expect(await pedidoGeradoPorPessoa(b.db, v2)).toEqual({ demandaId });
    expect(await pendentesEntre([v1, v2])).toEqual([v1]);
  });

  it('pedido_recebido sobre a entidade demanda, com o id do DEC, não tira o DEC da lista nem conta em recebidoComSha', async () => {
    const { demandaId, decId } = await prepararGerado();
    await inserirEvento({ acao: 'pedido_entregue', decId, demandaId, atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio', depois: { sha256: sha(0xa1) } });
    await inserirEvento({
      acao: 'pedido_recebido',
      decId,
      demandaId,
      atorTipo: 'integracao',
      atorId: 'construir',
      prefixo: 'ficticio',
      entidade: 'demanda',
      depois: { sha256: sha(0xa1) },
    });
    expect(await pendentesEntre([decId])).toEqual([decId]);
    expect(await recebidoComSha(b.db, decId, sha(0xa1))).toBe(false);
    expect(await recebimentoDoPedido(b.db, decId)).toBeNull();
  });

  it('as leituras usam a transação de quem chama: veem o que ela gravou, a outra conexão não vê, e o rollback desfaz', async () => {
    const { demandaId, decId } = await prepararGerado();
    const antes = await totalDeEventos();
    const hash = sha(0xb2);
    const desfazer = new Error('desfazer');
    const dentro = await comTransacao(b.poolApp, async ({ tx }) => {
      await registrarEvento(tx, { ator: construir, demandaId, entidade: 'pacote_decisao', entidadeId: decId, acao: 'pedido_entregue', depois: { sha256: hash } }, relogio);
      await registrarEvento(tx, { ator: construir, demandaId, entidade: 'pacote_decisao', entidadeId: decId, acao: 'pedido_recebido', depois: { sha256: hash } }, relogio);
      const vistoDentro = {
        pendente: (await listarPendentes(tx)).some((i) => i.decId === decId),
        entregues: await shasEntregues(tx, decId),
        recebido: await recebidoComSha(tx, decId, hash),
        em: await recebimentoDoPedido(tx, decId),
      };
      const vistoFora = {
        pendente: (await pendentesEntre([decId])).length === 1,
        entregues: await shasEntregues(b.db, decId),
        recebido: await recebidoComSha(b.db, decId, hash),
        em: await recebimentoDoPedido(b.db, decId),
      };
      throw Object.assign(desfazer, { vistoDentro, vistoFora });
    }).then(
      () => null,
      (e: unknown) => e as Error & { vistoDentro: unknown; vistoFora: unknown },
    );
    expect(dentro).toBe(desfazer);
    expect(dentro!.vistoDentro).toEqual({ pendente: false, entregues: [hash], recebido: true, em: relogio.agora() });
    expect(dentro!.vistoFora).toEqual({ pendente: true, entregues: [], recebido: false, em: null });
    // Depois do rollback, nada ficou.
    expect(await totalDeEventos()).toBe(antes);
    expect(await pendentesEntre([decId])).toEqual([decId]);
    expect(await recebidoComSha(b.db, decId, hash)).toBe(false);
  });

  it('id com caractere de SQL ou de LIKE não casa com nada e não dá erro; nenhuma das cinco leituras grava evento', async () => {
    const { demandaId, decId } = await prepararGerado();
    await inserirEvento({ acao: 'pedido_entregue', decId, demandaId, atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio', depois: { sha256: sha(0xc3) } });
    await inserirEvento({ acao: 'pedido_recebido', decId, demandaId, atorTipo: 'integracao', atorId: 'construir', prefixo: 'ficticio', depois: { sha256: sha(0xc3) } });
    const antes = await totalDeEventos();
    for (const estranho of [`${decId}' or '1'='1`, `' or ''='`, '%', `${decId.slice(0, -2)}%`, `${decId.slice(0, -3)}_-v1`, '']) {
      expect(await pedidoGeradoPorPessoa(b.db, estranho), estranho).toBeNull();
      expect(await shasEntregues(b.db, estranho), estranho).toEqual([]);
      expect(await recebidoComSha(b.db, estranho, sha(0xc3)), estranho).toBe(false);
      expect(await recebimentoDoPedido(b.db, estranho), estranho).toBeNull();
    }
    // O próprio DEC, para mostrar que o evento existe e casa pelo id exato.
    expect(await pedidoGeradoPorPessoa(b.db, decId)).toEqual({ demandaId });
    expect(await shasEntregues(b.db, decId)).toEqual([sha(0xc3)]);
    expect(await recebidoComSha(b.db, decId, sha(0xc3))).toBe(true);
    expect(await recebimentoDoPedido(b.db, decId)).toBeInstanceOf(Date);
    await listarPendentes(b.db);
    expect(await totalDeEventos()).toBe(antes);
  });
});
