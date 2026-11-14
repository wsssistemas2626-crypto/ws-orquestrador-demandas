// 06-T13-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; 7.2, itens 3 e 4; D-14; G9; CV-09). A T05 com o DEC mais
// novo arquivado contra o banco, a sessão e a matriz reais (Testcontainers): o estado de cada demanda é feito pelos
// serviços reais (criar, aprovar, arquivar, RSK novo, gerar pedido), e não por vista montada à mão. O detalhe-vigente.test.ts
// do engenheiro prova a regra com dublês; o que só o banco alcança:
//   - o id do vigente sai da vista real da demanda (obterDemanda filtra por demanda): com uma outra demanda no mesmo banco,
//     com o v1 aprovado na outra opção e pedido gerado, e com o id dela na URL (?dec, ?decId, ?vigente), a página só lê
//     DECs da própria demanda, e nenhum id da outra chega ao HTML;
//   - a barra e a Próxima ação certas nas três combinações do pedido: vigente atualizado (arquivar → Aprovada), vigente
//     desatualizado pelo RSK novo (arquivar → Em análise) e sem vigente (dupla aprovação incompleta; arquivar → Encerrada);
//     e ainda: o pedido do vigente já gerado, e o vigente v2 que substituiu o v1 sob o v3 arquivado (lê o v2, nunca o v1);
//   - a leitura do vigente acontece depois da leitura do mais novo, e só quando ele está arquivado.
// obterPacoteDecisao é o real, embrulhado num vi.fn só para contar as chamadas. Relógio fixo; uma autora por demanda
// (C-36); dados só fictícios.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../test/deps';
import { criarPessoa } from '../../../../../test/sessao';
import { definirDepsParaTeste, type Deps } from '../../../../lib/deps';
import { substituirDestinoDoLog } from '../../../../lib/log';
import { relogioFixo } from '../../../../lib/relogio';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { criarDemandaSchema } from '../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../modules/especificacoes/servico';
import { obterPacoteDecisao } from '../../../../modules/pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../modules/pareceres-risco/servico';
import { gerarPedido } from '../../../../modules/pedido-construcao/gerar';
import PaginaDemanda from './page';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/demandas',
}));
vi.mock('../../../../lib/sentry', async (original) => ({ ...(await original<typeof import('../../../../lib/sentry')>()), capturarErro: () => undefined }));
// A leitura real, só contada.
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn(real.obterPacoteDecisao) };
});

const mDec = vi.mocked(obterPacoteDecisao);

type Nivel = 'cto' | 'cto_e_administradora';
type Cenario = { autora: AtorPessoa; demandaId: string };

const relogio = relogioFixo('2026-11-14T15:00:00Z');
const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const RSK_BAIXO = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const RSK_NOVO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const LINHA_10 = 'Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.';

let b: BancoDeTeste;
let deps: Deps;
let autoras = 0;
let outra: Cenario & { v1: string; v2: string };
const linhasDoLog: string[] = [];

const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-t13-qa-${++autoras}`, nome: 'Pessoa Ficticia CTO', papel: 'cto' });
// Os serviços sem a fila: nenhum job de agente nasce (a linha 2 da Próxima ação não entra).
const srv = () => ({ db: deps.db, pool: deps.pool, relogio });
const aprovar = (opcaoEscolhida: 'A' | 'B') => registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida });
const arquivar = () => registrarDecisaoSchema.parse({ statusDecisao: 'arquivada' });

async function demandaComEspERsk(): Promise<Cenario> {
  const autora = novaAutora();
  const d = await criarDemanda(srv(), autora, criarDemandaSchema.parse({ titulo: 'Conferência de estoque (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia Solicitante', contexto: 'Contexto fictício.' }));
  await criarEspecificacao(
    srv(),
    autora,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'Conferir o estoque (fictício)',
      escopoInclui: ['Conferência (fictício)'],
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Confere no fim do dia (fictício)'],
      definicaoDePronto: ['pnpm test verde'],
    }),
  );
  await criarParecerRisco(srv(), autora, d.id, criarParecerRiscoSchema.parse(RSK_BAIXO));
  return { autora, demandaId: d.id };
}
const novoDec = async (c: Cenario, nivel: Nivel = 'cto') =>
  (
    await criarPacoteDecisao(
      srv(),
      c.autora,
      c.demandaId,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'Opção A fictícia' }, opcaoB: { descricao: 'Opção B fictícia' }, nivelAprovacaoRequerido: nivel }),
    )
  ).id;
async function comV1Aprovado(opcao: 'A' | 'B'): Promise<Cenario & { v1: string }> {
  const c = await demandaComEspERsk();
  const v1 = await novoDec(c);
  await registrarDecisao(srv(), c.autora, v1, aprovar(opcao));
  return { ...c, v1 };
}
const statusDa = async (id: string) => (await b.poolMigrator.query<{ status: string }>('select status from demanda where id = $1', [id])).rows[0]!.status;

const pagina = async (id: string, sp: Record<string, string> = {}) => renderToStaticMarkup(await PaginaDemanda({ params: Promise.resolve({ id }), searchParams: Promise.resolve(sp) }));
const itensDaBarra = (p: string) => {
  const i = p.indexOf('<ol aria-label="Etapas da demanda"');
  return [...p.slice(i, p.indexOf('</ol>', i)).matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ atributos: m[1]!, corpo: m[2]! }));
};
const cartao = (p: string) => {
  const i = p.indexOf('<section aria-labelledby="proxima-acao"');
  return p.slice(i, p.indexOf('</section>', i));
};
const lidos = () => mDec.mock.calls.map(([, id]) => id);

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  pedido.cabecalhos = new Headers({ cookie: (await criarPessoa(deps, { papel: 'cto' })).cookie });
  // A outra demanda: v1 aprovado na opção B, com pedido gerado, e o v2 arquivado por cima (em Aprovada).
  const o = await comV1Aprovado('B');
  const v2 = await novoDec(o);
  await registrarDecisao(srv(), o.autora, v2, arquivar());
  await gerarPedido(srv(), o.autora, o.v1, CONFIRMADO);
  outra = { ...o, v2 };
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  mDec.mockClear();
});

// Nenhum id de DEC da outra demanda foi lido nem chegou ao HTML.
function soDaPropriaDemanda(c: Cenario, p: string): void {
  for (const id of lidos()) expect(id.startsWith(`DEC-${c.demandaId}-v`)).toBe(true);
  expect(p).not.toContain(`DEC-${outra.demandaId}`);
}

describe('T05 com o DEC mais novo arquivado, pelo banco real (7.2, itens 3 e 4; G9; CV-09)', () => {
  it('vigente atualizado (arquivar o v2 → Aprovada), com o id da outra demanda na URL: lê o v2 e depois o v1, só desta demanda; etapa 4 do v1, "Aprovada, opção A", feita; atual 5; linha 10 com o link do v1', async () => {
    const c = await comV1Aprovado('A');
    const v2 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    mDec.mockClear();
    const p = await pagina(c.demandaId, { dec: outra.v1, decId: outra.v1, vigente: outra.v1, id: outra.demandaId });
    expect(lidos()).toEqual([v2, c.v1]);
    expect(mDec.mock.invocationCallOrder[1]).toBeGreaterThan(mDec.mock.invocationCallOrder[0]!);
    soDaPropriaDemanda(c, p);
    const [, , , decisao, pedidoDeConstrucao] = itensDaBarra(p);
    expect(decisao!.corpo).toContain(`>${c.v1}</span>`);
    expect(decisao!.corpo).not.toContain(v2);
    expect(decisao!.corpo).toContain('>Aprovada, opção A</span>');
    expect(decisao!.corpo).toContain('data-marca="feita"');
    expect(pedidoDeConstrucao!.atributos).toContain('aria-current="step"');
    expect(pedidoDeConstrucao!.corpo).toContain('Ainda não gerado');
    expect(p.match(/aria-current="step"/g)).toHaveLength(1);
    expect(cartao(p)).toContain(LINHA_10);
    expect(cartao(p)).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/${c.v1}"[^>]*>Abrir a decisão aprovada</a>`));
  });

  it('vigente desatualizado pelo RSK novo (arquivar o v2 → Em análise): lê o v2 e o v1; etapa 4 do v1 feita; atual 5; linha 6 com o link de montar o pacote', async () => {
    const c = await comV1Aprovado('A');
    await criarParecerRisco(srv(), c.autora, c.demandaId, criarParecerRiscoSchema.parse(RSK_NOVO));
    const v2 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('em_analise');
    mDec.mockClear();
    const p = await pagina(c.demandaId);
    expect(lidos()).toEqual([v2, c.v1]);
    soDaPropriaDemanda(c, p);
    const [, , , decisao, pedidoDeConstrucao] = itensDaBarra(p);
    expect(decisao!.corpo).toContain(`>${c.v1}</span>`);
    expect(decisao!.corpo).toContain('>Aprovada, opção A</span>');
    expect(decisao!.corpo).toContain('data-marca="feita"');
    expect(pedidoDeConstrucao!.atributos).toContain('aria-current="step"');
    expect(p.match(/aria-current="step"/g)).toHaveLength(1);
    expect(cartao(p)).toContain('Montar o pacote de decisão.');
    expect(cartao(p)).toMatch(new RegExp(`<a [^>]*href="/demandas/${c.demandaId}/pacotes-decisao/novo"[^>]*>Montar o pacote de decisão</a>`));
  });

  it('sem vigente (v1 de dupla aprovação só com o CTO; arquivar o v2 → Encerrada): lê só o v2, uma vez; etapa 4 do v2, "Arquivada", não feita; nenhuma atual; linha 1', async () => {
    const c = await demandaComEspERsk();
    const v1 = await novoDec(c, 'cto_e_administradora');
    expect((await registrarDecisao(srv(), c.autora, v1, aprovar('A'))).resultado).toBe('aprovacao_parcial');
    const v2 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    expect(await statusDa(c.demandaId)).toBe('encerrada');
    mDec.mockClear();
    const p = await pagina(c.demandaId, { vigente: outra.v1 });
    expect(lidos()).toEqual([v2]);
    soDaPropriaDemanda(c, p);
    const [, , , decisao, pedidoDeConstrucao] = itensDaBarra(p);
    expect(decisao!.corpo).toContain(`>${v2}</span>`);
    expect(decisao!.corpo).not.toContain(v1);
    expect(decisao!.corpo).toContain('>Arquivada</span>');
    expect(decisao!.corpo).not.toContain('data-marca="feita"');
    expect(pedidoDeConstrucao!.corpo).toContain('Depois da aprovação');
    expect(p).not.toContain('aria-current="step"');
    expect(cartao(p)).toContain('Nada. A demanda está em Encerrada.');
  });

  it('pedido do vigente já gerado depois de arquivar o v2: etapa 4 do v1 e etapa 5 "Gerado" com o v1, as duas feitas; nenhuma atual; linha 10', async () => {
    const c = await comV1Aprovado('B');
    const v2 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v2, arquivar());
    await gerarPedido(srv(), c.autora, c.v1, CONFIRMADO);
    mDec.mockClear();
    const p = await pagina(c.demandaId);
    expect(lidos()).toEqual([v2, c.v1]);
    soDaPropriaDemanda(c, p);
    const [, , , decisao, pedidoDeConstrucao] = itensDaBarra(p);
    expect(decisao!.corpo).toContain('>Aprovada, opção B</span>');
    expect(pedidoDeConstrucao!.corpo).toContain(`>${c.v1}</span>`);
    expect(pedidoDeConstrucao!.corpo).toContain('>Gerado</span>');
    expect(pedidoDeConstrucao!.corpo).toContain('data-marca="feita"');
    expect(p).not.toContain('aria-current="step"');
    expect(cartao(p)).toContain(LINHA_10);
  });

  it('v2 aprovado substituiu o v1, e o v3 foi arquivado: lê o v3 e o v2, nunca o v1; etapa 4 do v2, "Aprovada, opção B"', async () => {
    const c = await comV1Aprovado('A');
    const v2 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v2, aprovar('B'));
    const v3 = await novoDec(c);
    await registrarDecisao(srv(), c.autora, v3, arquivar());
    expect(await statusDa(c.demandaId)).toBe('aprovada');
    mDec.mockClear();
    const p = await pagina(c.demandaId, { dec: c.v1 });
    expect(lidos()).toEqual([v3, v2]);
    soDaPropriaDemanda(c, p);
    const [, , , decisao] = itensDaBarra(p);
    expect(decisao!.corpo).toContain(`>${v2}</span>`);
    expect(decisao!.corpo).toContain('>Aprovada, opção B</span>');
    expect(cartao(p)).toContain(LINHA_10);
    expect(cartao(p)).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/${v2}"[^>]*>Abrir a decisão aprovada</a>`));
  });

  it('a outra demanda, aberta pelo próprio id, mostra o v1 dela (opção B, pedido gerado): a leitura segue a demanda da rota, não a anterior', async () => {
    mDec.mockClear();
    const p = await pagina(outra.demandaId);
    expect(lidos()).toEqual([outra.v2, outra.v1]);
    const [, , , decisao, pedidoDeConstrucao] = itensDaBarra(p);
    expect(decisao!.corpo).toContain(`>${outra.v1}</span>`);
    expect(decisao!.corpo).toContain('>Aprovada, opção B</span>');
    expect(pedidoDeConstrucao!.corpo).toContain('>Gerado</span>');
  });
});
