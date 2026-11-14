// 0.1.13 (DEC-DEM-20261104-0014-v1, S3): só o DEC aprovado mais novo da demanda gera o Pedido de Construção. O
// substituído dá 409 com a mensagem que aponta o DEC que gera, antes do 409 do desatualizado, inclusive numa corrida com a
// aprovação do mais novo (C-13): nunca há dois Pedidos de Construção válidos da mesma demanda. Postgres real pelo papel do
// app; relógio fixo, cada teste num dia próprio (C-36). Dados só fictícios.
import { and, asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { evento, user } from '../../db/schema';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { AtorPessoa } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { aprovadoMaisNovo } from '../pacotes-decisao/substituido';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-gsubst-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-gsubst-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const DOC = { referenciaDocumento: 'DOC-FICTICIO-014', dataDocumento: '2026-11-04' };
const espDe = (criterio: string) =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva: 'Calcular o frete automaticamente',
    escopoInclui: ['Cálculo de frete'],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: [criterio],
    definicaoDePronto: ['pnpm test verde'],
  });
const RSK = criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'gsubst-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'gsubst-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-04T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const aprovar = (decId: string, opcao: 'A' | 'B' = 'A', quem: AtorPessoa = cto, extra: Record<string, unknown> = {}) =>
  registrarDecisao(deps, quem, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, ...extra }));

const novoDec = async (demandaId: string, nivel: 'cto' | 'cto_e_administradora' = 'cto') =>
  (
    await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Resumo fictício',
        opcaoA: { descricao: 'Calcular no sistema' },
        opcaoB: { descricao: 'Manter a planilha' },
        nivelAprovacaoRequerido: nivel,
      }),
    )
  ).id;

async function comV1Aprovado(op: { solicitante?: string; contexto?: string; criterio?: string } = {}): Promise<{ demandaId: string; v1: string }> {
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Frete da filial',
      tipo: 'melhoria',
      solicitanteNome: op.solicitante ?? 'Joana Ficticia',
      contexto: op.contexto ?? 'O financeiro calcula o frete à mão.',
    }),
  );
  await criarEspecificacao(deps, cto, d.id, espDe(op.criterio ?? 'O frete sai calculado no pedido'));
  await criarParecerRisco(deps, cto, d.id, RSK);
  const v1 = await novoDec(d.id);
  await aprovar(v1, 'A');
  return { demandaId: d.id, v1 };
}

const eventosDoPedido = (decId: string) =>
  b.db
    .select()
    .from(evento)
    .where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')));

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

describe('S3: só o aprovado mais novo gera o Pedido de Construção', () => {
  it('a mensagem do 409 do substituído cita só o id do DEC que gera', () => {
    expect(MENSAGENS_PEDIDO.substituido('DEC-DEM-20261104-0001-v2')).toBe(
      'o pacote foi substituído por DEC-DEM-20261104-0001-v2, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção.',
    );
  });

  it('casos 1 e 2 (R1 da 01): recusa por nome no v1; contexto corrigido, v2 aprovado: o v1 dá 409 substituido e o v2 gera, sempre igual', async () => {
    const { demandaId, v1 } = await comV1Aprovado({ solicitante: 'Carla Santos Ficticia', contexto: 'A filial de Santos calcula o frete à mão.' });
    const recusa = await erroDe(gerarPedido(deps, cto, v1, CONFIRMADO));
    expect(recusa).toMatchObject({ codigo: 'nao_processavel', extras: { erros: ['demanda.descricao: nome'] } });

    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ contexto: 'A filial do litoral calcula o frete à mão.' }));
    const v2 = await novoDec(demandaId);
    await aprovar(v2, 'A');

    const e = await erroDe(gerarPedido(deps, cto, v1, CONFIRMADO));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v2) });
    expect(await eventosDoPedido(v1)).toEqual([]);

    const a = (await gerarPedido(deps, cto, v2, CONFIRMADO)).json;
    const b2 = (await gerarPedido(deps, administradora, v2, CONFIRMADO)).json;
    expect(b2).toBe(a);
    const p = JSON.parse(a);
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
    expect(p.decisao.id).toBe(v2);
    expect(p.demanda.descricao).toBe('Contexto: A filial do litoral calcula o frete à mão.');
    expect(await eventosDoPedido(v2)).toHaveLength(2);
  });

  it('caso 3 (E3, item 4 da 01): v1 com A e v2 com B, sem nada desatualizado: o v1 dá 409 e o v2 gera com "B: "', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await aprovar(v2, 'B');
    expect((await gerarPedido(deps, cto, v1, CONFIRMADO).catch((x: unknown) => x)) as ErroDominio).toMatchObject({
      codigo: 'conflito',
      mensagem: MENSAGENS_PEDIDO.substituido(v2),
    });
    const p = JSON.parse((await gerarPedido(deps, cto, v2, CONFIRMADO)).json);
    expect(p.decisao.opcaoEscolhida).toBe('B: Manter a planilha');
  });

  it('caso 4 (R2 da 01): ESP v2 depois do v1 aprovado e v2 aprovado: o v1, desatualizado e substituído, dá o 409 do substituído; o v2 gera com a ESP v2', async () => {
    const { demandaId, v1 } = await comV1Aprovado({ criterio: 'Joana recebe o frete calculado' });
    await criarEspecificacao(deps, cto, demandaId, espDe('O financeiro recebe o frete calculado'));
    const v2 = await novoDec(demandaId);
    await aprovar(v2, 'A');
    const e = await erroDe(gerarPedido(deps, cto, v1, CONFIRMADO));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v2) });
    const p = JSON.parse((await gerarPedido(deps, cto, v2, CONFIRMADO)).json);
    expect(p.criterios_aceite_preliminares).toEqual(['O financeiro recebe o frete calculado']);
  });

  it('caso 5 (E2): v1 aprovado e v2 em aprovação parcial: o v1 continua gerando', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId, 'cto_e_administradora');
    expect((await aprovar(v2, 'A', administradora, DOC)).resultado).toBe('aprovacao_parcial');
    expect(validarPedido(JSON.parse((await gerarPedido(deps, cto, v1, CONFIRMADO)).json))).toEqual({ ok: true, erros: [] });
    expect((await erroDe(gerarPedido(deps, cto, v2, CONFIRMADO))).mensagem).toBe(MENSAGENS_PEDIDO.naoAprovado);
  });

  it('caso 6 (C-13, E4a): aprovar o v2 e gerar o v1 ao mesmo tempo, dez vezes: nunca 200 do v1 depois do commit do v2', async () => {
    let geradosAntes = 0;
    let recusados = 0;
    for (let i = 0; i < 10; i++) {
      relogio.avancar(86_400_000);
      const { demandaId, v1 } = await comV1Aprovado();
      const v2 = await novoDec(demandaId);
      const [g, a] = await Promise.allSettled([gerarPedido(deps, cto, v1, CONFIRMADO), aprovar(v2, 'B')]);
      expect(a.status).toBe('fulfilled');
      const eventos = await b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(asc(evento.id));
      const iSubst = eventos.findIndex((x) => x.acao === 'pacote_decisao_substituido');
      expect(iSubst).toBeGreaterThanOrEqual(0);
      const doV1 = eventos.filter((x) => x.acao === 'pedido_gerado' && x.entidadeId === v1);
      if (g.status === 'fulfilled') {
        geradosAntes++;
        expect(doV1).toHaveLength(1);
        expect(eventos.indexOf(doV1[0]!)).toBeLessThan(iSubst);
      } else {
        recusados++;
        expect(g.reason).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v2) });
        expect(doV1).toEqual([]);
      }
      // Depois da corrida, um só aprovado mais novo, e só ele gera.
      expect(await aprovadoMaisNovo(b.db, demandaId)).toBe(v2);
      await expect(gerarPedido(deps, cto, v1, CONFIRMADO)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v2) });
    }
    expect(geradosAntes + recusados).toBe(10);
  });

  it('v3 aprovado depois do v2: v1 e v2 dão 409 apontando o v3, e só o v3 gera', async () => {
    const { demandaId, v1 } = await comV1Aprovado();
    const v2 = await novoDec(demandaId);
    await aprovar(v2, 'B');
    const v3 = await novoDec(demandaId);
    await aprovar(v3, 'A');
    for (const antigo of [v1, v2]) {
      await expect(gerarPedido(deps, cto, antigo, CONFIRMADO), antigo).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v3) });
    }
    expect(JSON.parse((await gerarPedido(deps, cto, v3, CONFIRMADO)).json).decisao.id).toBe(v3);
  });
});
