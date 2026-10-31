// T41: a Server Action da T07 Nova versão da ESP contra o banco e o Better Auth reais (Testcontainers), com a entrada
// montada pelas mesmas funções da tela (dados-da-especificacao.ts). A regra é a de POST /api/demandas/:id/especificacoes
// (criarEspecificacao, T18): a validação da tela é só conveniência. A resposta leva só ids e dois indicadores: o conflito
// de versão (03, T07) e o DEC pendente que ficou desatualizado. Relógio fixo (RNF-15), um dia por teste por causa do
// limite por ator (C-36). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../../../test/deps';
import { criarPessoa } from '../../../../../../../test/sessao';
import { entradaDaEspecificacao, errosDaApiEsp, valoresDaEspecificacao, type ValoresDaEspecificacao } from '../../../../../../components/dados-da-especificacao';
import type { ItemDaLista } from '../../../../../../components/lista-textos';
import { definirDepsParaTeste, type Deps } from '../../../../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../../../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../../../../../lib/relogio';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../../../modules/demandas/servico';
import { listarEspecificacoes } from '../../../../../../modules/especificacoes/consultas';
import { criarEspecificacaoSchema } from '../../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../../../modules/pareceres-risco/servico';
import { gravarEspecificacaoNoPainel } from './acoes';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../../../../../lib/sentry', () => ({ capturarErro: () => undefined }));

const DIA_MS = 86_400_000;

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookie: string;
let ator: AtorPessoa;
let dia = 0;

const lista = (campo: string, ...valores: string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));

const preenchida = (extra: Partial<ValoresDaEspecificacao> = {}): ValoresDaEspecificacao => ({
  ...valoresDaEspecificacao(null),
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: lista('escopoInclui', '', 'Conferir o id do pedido (fictício)'),
  sistemaAlvo: 'sistema-ficticio',
  criteriosAceitePreliminares: lista('criteriosAceitePreliminares', 'O mesmo pedido não aparece duas vezes (fictício)'),
  definicaoDePronto: lista('definicaoDePronto', 'Testes verdes (fictício)'),
  ...extra,
});

async function novaDemanda(tipo: 'melhoria' | 'estudo' = 'melhoria'): Promise<string> {
  const d = await criarDemanda(deps, ator, criarDemandaSchema.parse({ titulo: 'Demanda da ESP (fictício)', tipo, solicitanteNome: 'Pessoa Ficticia' }));
  return d.id;
}

const espDaApi = (id: string) =>
  criarEspecificacao(
    deps,
    ator,
    id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'ESP pela API (fictício)',
      escopoInclui: [],
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Critério (fictício)'],
      definicaoDePronto: ['Pronto (fictício)'],
    }),
  );

function gravar(id: string, v: ValoresDaEspecificacao, versaoEsperada: number, tipo: 'melhoria' | 'estudo' = 'melhoria', extra: Record<string, unknown> = {}) {
  return gravarEspecificacaoNoPainel({ ...entradaDaEspecificacao(v, tipo).entrada, demandaId: id, versaoEsperada, ...extra });
}

beforeAll(async () => {
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const p = await criarPessoa(deps, { papel: 'administradora' });
  cookie = p.cookie;
  ator = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'administradora' };
});

afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * DIA_MS);
  pedido.cabecalhos = new Headers({ cookie });
});

describe('gravarEspecificacaoNoPainel (T07)', () => {
  it('primeira ESP: grava a v1 como a tela mostrou, com a autoria da sessão; a resposta só tem ids e os dois indicadores', async () => {
    const id = await novaDemanda();
    const r = await gravar(id, preenchida(), 1, 'melhoria', { autorTipo: 'agente', autorId: 'insumo_tecnico', rascunhoAgente: true });
    expect(r).toEqual({ ok: true, dados: { id: `ESP-${id}-v1`, demandaId: id, conflito: false, decDesatualizado: null } });
    const [esp] = await listarEspecificacoes(deps.db, id);
    expect(esp).toMatchObject({
      versao: 1,
      escopoInclui: ['Conferir o id do pedido (fictício)'],
      escopoExclui: [],
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      rascunhoAgente: false,
      autor: { tipo: 'pessoa' },
    });
  });

  it('com dúvida: a demanda vai a aguardando_informacao (CA-15.1)', async () => {
    const id = await novaDemanda();
    const r = await gravar(id, preenchida({ duvidasEmAberto: lista('duvidasEmAberto', 'Qual o volume? (fictício)') }), 1);
    expect(r.ok).toBe(true);
    expect((await obterDemanda(deps.db, id)).status).toBe('aguardando_informacao');
  });

  it('conflito de versão: outra ESP gravada enquanto a tela estava aberta; a nossa vira a v2 e a resposta diz', async () => {
    const id = await novaDemanda();
    await espDaApi(id);
    const r = await gravar(id, preenchida(), 1);
    expect(r).toEqual({ ok: true, dados: { id: `ESP-${id}-v2`, demandaId: id, conflito: true, decDesatualizado: null } });
  });

  it('DEC pendente em dia fica desatualizado: a resposta traz o id dele', async () => {
    const id = await novaDemanda();
    await espDaApi(id);
    await criarParecerRisco(deps, ator, id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const dec = await criarPacoteDecisao(
      deps,
      ator,
      id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: 'cto' }),
    );
    const r = await gravar(id, preenchida(), 2);
    expect(r).toEqual({ ok: true, dados: { id: `ESP-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: dec.id } });
  });

  it('a validação da tela é só conveniência: sem ela, o servidor recusa com os campos, e errosDaApiEsp os põe na tela', async () => {
    const id = await novaDemanda();
    const v = preenchida({ sistemaAlvo: '', criteriosAceitePreliminares: lista('criteriosAceitePreliminares', '') });
    const { entrada, indices } = entradaDaEspecificacao(v, 'melhoria');
    const r = await gravarEspecificacaoNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toBe('entrada_invalida');
    expect(errosDaApiEsp(r, { indices, valores: v }).campos.map((c) => [c.campo, c.mensagem])).toEqual([
      ['sistemaAlvo', 'Informe o sistema alvo.'],
      ['criteriosAceitePreliminares', 'Informe ao menos um critério de aceite preliminar.'],
    ]);
    expect(await listarEspecificacoes(deps.db, id)).toEqual([]);
  });

  it('tipo mudou para construído depois de a tela abrir como Estudo: os erros de construção voltam da API', async () => {
    const id = await novaDemanda('estudo');
    const v = { ...valoresDaEspecificacao(null), descricaoObjetiva: 'Estudo (fictício)' };
    await b.poolMigrator.query(`update demanda set tipo = 'melhoria' where id = $1`, [id]);
    const { entrada, indices } = entradaDaEspecificacao(v, 'estudo');
    const r = await gravarEspecificacaoNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(errosDaApiEsp(r, { indices, valores: v }).campos.map((c) => c.campo)).toEqual(['sistemaAlvo', 'criteriosAceitePreliminares', 'definicaoDePronto']);
  });

  it('id fora do formato não toca o banco; demanda que não existe: 404 com o texto da 2.8', async () => {
    const fora = await gravar('DEM-1', preenchida(), 1);
    expect(fora).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    const inexistente = await gravar('DEM-20261022-9999', preenchida(), 1);
    expect(inexistente).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('sem sessão: nada grava', async () => {
    const id = await novaDemanda();
    pedido.cabecalhos = new Headers();
    expect(await gravar(id, preenchida(), 1)).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(await listarEspecificacoes(deps.db, id)).toEqual([]);
  });
});
