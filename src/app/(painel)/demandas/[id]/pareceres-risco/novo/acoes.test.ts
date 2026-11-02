// T42: a Server Action da T08 Novo parecer de risco contra o banco e o Better Auth reais (Testcontainers), com a entrada
// montada pelas mesmas funções da tela (dados-do-parecer.ts). A regra é a de POST /api/demandas/:id/pareceres-risco
// (criarParecerRisco, T19): a validação da tela é só conveniência. A resposta leva só ids e dois indicadores: o conflito
// de versão (03, T08, como T07) e o DEC pendente que ficou desatualizado. Relógio fixo (RNF-15), um dia por teste por
// causa do limite por ator (C-36). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../../../test/deps';
import { criarPessoa } from '../../../../../../../test/sessao';
import { entradaDoParecer, errosDaApiRsk, valoresDoParecer, type ValoresDoParecer } from '../../../../../../components/dados-do-parecer';
import type { ItemDaLista } from '../../../../../../components/lista-textos';
import { definirDepsParaTeste, type Deps } from '../../../../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../../../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../../../../../lib/relogio';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../../modules/pacotes-decisao/schemas';
import { listarPareceresRisco } from '../../../../../../modules/pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../../../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../../../modules/pareceres-risco/servico';
import { gravarParecerNoPainel } from './acoes';

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

const preenchido = (extra: Partial<ValoresDoParecer> = {}): ValoresDoParecer => ({
  ...valoresDoParecer(null),
  resumo: 'Risco controlado (fictício).',
  riscoTecnicoNivel: 'alto',
  riscoTecnicoComentario: 'Integração frágil (fictício).',
  riscoOperacionalNivel: 'medio',
  riscoJuridicoNivel: 'baixo',
  recomendacoesMitigacao: lista('recomendacoesMitigacao', '', 'Testar a integração antes (fictício)'),
  ...extra,
});

async function novaDemanda(): Promise<string> {
  const d = await criarDemanda(deps, ator, criarDemandaSchema.parse({ titulo: 'Demanda do RSK (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
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

const rskDaApi = (id: string) =>
  criarParecerRisco(deps, ator, id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));

function gravar(id: string, v: ValoresDoParecer, versaoEsperada: number, extra: Record<string, unknown> = {}) {
  return gravarParecerNoPainel({ ...entradaDoParecer(v).entrada, demandaId: id, versaoEsperada, ...extra });
}

beforeAll(async () => {
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  ator = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
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

describe('gravarParecerNoPainel (T08)', () => {
  it('sem ESP: grava a v1 como a tela mostrou, com a autoria da sessão; a resposta só tem ids e os dois indicadores', async () => {
    const id = await novaDemanda();
    const r = await gravar(id, preenchido(), 1, { autorTipo: 'agente', autorId: 'risco', rascunhoAgente: true });
    expect(r).toEqual({ ok: true, dados: { id: `RSK-${id}-v1`, demandaId: id, conflito: false, decDesatualizado: null } });
    const [rsk] = await listarPareceresRisco(deps.db, id);
    expect(rsk).toMatchObject({
      versao: 1,
      resumo: 'Risco controlado (fictício).',
      riscoTecnicoNivel: 'alto',
      riscoTecnicoComentario: 'Integração frágil (fictício).',
      riscoOperacionalNivel: 'medio',
      riscoOperacionalComentario: null,
      riscoJuridicoNivel: 'baixo',
      recomendacoesMitigacao: ['Testar a integração antes (fictício)'],
      preCondicoes: [],
      rascunhoAgente: false,
      autor: { tipo: 'pessoa' },
    });
    // O RSK não muda o status da demanda (T19).
    expect((await obterDemanda(deps.db, id)).status).toBe('nova');
  });

  it('conflito de versão: outro RSK gravado enquanto a tela estava aberta; o nosso vira a v2 e a resposta diz', async () => {
    const id = await novaDemanda();
    await rskDaApi(id);
    const r = await gravar(id, preenchido(), 1);
    expect(r).toEqual({ ok: true, dados: { id: `RSK-${id}-v2`, demandaId: id, conflito: true, decDesatualizado: null } });
  });

  it('DEC pendente em dia fica desatualizado: a resposta traz o id dele', async () => {
    const id = await novaDemanda();
    await espDaApi(id);
    await rskDaApi(id);
    const dec = await criarPacoteDecisao(
      deps,
      ator,
      id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: 'cto' }),
    );
    const r = await gravar(id, preenchido(), 2);
    expect(r).toEqual({ ok: true, dados: { id: `RSK-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: dec.id } });
  });

  it('a validação da tela é só conveniência: sem nível, o servidor recusa com os campos, e errosDaApiRsk os põe na tela', async () => {
    const id = await novaDemanda();
    const v = { ...preenchido(), riscoTecnicoNivel: '', riscoJuridicoNivel: '' } as ValoresDoParecer;
    const { entrada, indices } = entradaDoParecer(v);
    const r = await gravarParecerNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toBe('entrada_invalida');
    expect(errosDaApiRsk(r, { indices, valores: v }).campos.map((c) => [c.campo, c.mensagem])).toEqual([
      ['riscoTecnicoNivel', 'Escolha o nível do risco técnico.'],
      ['riscoJuridicoNivel', 'Escolha o nível do risco jurídico.'],
    ]);
    expect(await listarPareceresRisco(deps.db, id)).toEqual([]);
  });

  it('item longo demais pela API volta à linha da tela (o vazio de cima foi descartado no envio)', async () => {
    const id = await novaDemanda();
    const v = preenchido({ preCondicoes: lista('preCondicoes', '', 'x'.repeat(10_001)) });
    const { entrada, indices } = entradaDoParecer(v);
    const r = await gravarParecerNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(errosDaApiRsk(r, { indices, valores: v }).campos.map((c) => [c.campo, c.rotulo, c.mensagem])).toEqual([
      ['preCondicoes.1', 'Item 2 de Pré-condições', 'Este campo aceita até 10.000 caracteres.'],
    ]);
  });

  it('id fora do formato não toca o banco; demanda que não existe: 404 com o texto da 2.8', async () => {
    const fora = await gravar('DEM-1', preenchido(), 1);
    expect(fora).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    const inexistente = await gravar('DEM-20261022-9999', preenchido(), 1);
    expect(inexistente).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('sem sessão: nada grava', async () => {
    const id = await novaDemanda();
    pedido.cabecalhos = new Headers();
    expect(await gravar(id, preenchido(), 1)).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(await listarPareceresRisco(deps.db, id)).toEqual([]);
  });
});
