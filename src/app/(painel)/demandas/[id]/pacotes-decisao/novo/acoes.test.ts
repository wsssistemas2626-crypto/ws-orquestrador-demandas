// T43: a Server Action da T09 Novo pacote de decisão contra o banco e o Better Auth reais (Testcontainers), com a entrada
// montada pelas mesmas funções da tela (dados-do-pacote.ts). A regra é a de POST /api/demandas/:id/pacotes-decisao
// (criarPacoteDecisao, T20): a validação da tela é só conveniência. A resposta leva só os ids. Relógio fixo (RNF-15), um
// dia por teste por causa do limite por ator (C-36). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../../../test/deps';
import { criarPessoa } from '../../../../../../../test/sessao';
import { entradaDoPacote, errosDaApiDec, valoresDoPacote, type ValoresDoPacote } from '../../../../../../components/dados-do-pacote';
import { definirDepsParaTeste, type Deps } from '../../../../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../../../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../../../../../lib/relogio';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../../modules/especificacoes/servico';
import { listarPacotesDaDemanda } from '../../../../../../modules/pacotes-decisao/consultas';
import { criarParecerRiscoSchema } from '../../../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../../../modules/pareceres-risco/servico';
import { gravarPacoteNoPainel } from './acoes';

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

const preenchido = (extra: Partial<ValoresDoPacote> = {}): ValoresDoPacote => ({
  ...valoresDoPacote(),
  resumoExecutivo: 'Resumo executivo (fictício).',
  'opcaoA.descricao': 'Construir tudo (fictício)',
  'opcaoA.vantagens': 'Resolve a causa (fictício)',
  'opcaoB.descricao': 'Construir em duas entregas (fictício)',
  recomendacao: 'Opção B (fictício)',
  nivelAprovacaoRequerido: 'cto_e_administradora',
  ...extra,
});

async function novaDemanda(op: { esp?: boolean; rsk?: boolean } = { esp: true, rsk: true }): Promise<string> {
  const d = await criarDemanda(deps, ator, criarDemandaSchema.parse({ titulo: 'Demanda do DEC (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
  if (op.esp)
    await criarEspecificacao(
      deps,
      ator,
      d.id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: 'ESP pela API (fictício)',
        escopoInclui: [],
        sistemaAlvo: 'sistema-ficticio',
        repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
        criteriosAceitePreliminares: ['Critério (fictício)'],
        definicaoDePronto: ['Pronto (fictício)'],
      }),
    );
  if (op.rsk) await criarParecerRisco(deps, ator, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  return d.id;
}

const gravar = (id: string, v: ValoresDoPacote, extra: Record<string, unknown> = {}) => gravarPacoteNoPainel({ ...entradaDoPacote(v), demandaId: id, ...extra });

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

describe('gravarPacoteNoPainel (T09)', () => {
  it('grava a v1 com a autoria da sessão; a demanda vai a Pronta para decisão; a resposta só tem os ids', async () => {
    const id = await novaDemanda();
    const r = await gravar(id, preenchido(), { autorTipo: 'agente', autorId: 'consolidacao', rascunhoAgente: true, decididaPor: 'x' });
    expect(r).toEqual({ ok: true, dados: { id: `DEC-${id}-v1`, demandaId: id } });
    const [dec] = await listarPacotesDaDemanda(deps.db, id);
    expect(dec).toMatchObject({
      versao: 1,
      especificacaoId: `ESP-${id}-v1`,
      parecerRiscoId: `RSK-${id}-v1`,
      resumoExecutivo: 'Resumo executivo (fictício).',
      opcaoA: { descricao: 'Construir tudo (fictício)', vantagens: 'Resolve a causa (fictício)' },
      opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
      recomendacao: 'Opção B (fictício)',
      nivelAprovacaoRequerido: 'cto_e_administradora',
      rascunhoAgente: false,
      autor: { tipo: 'pessoa' },
      statusDecisao: 'pendente',
    });
    expect((await obterDemanda(deps.db, id)).status).toBe('pronta_para_decisao');
  });

  it('sem RSK: o servidor recusa com `faltando`, e a tela mostra "Faltam itens para o pacote: parecer de risco."', async () => {
    const id = await novaDemanda({ esp: true });
    const r = await gravar(id, preenchido());
    expect(r).toMatchObject({ ok: false, erro: 'entrada_invalida', faltando: ['parecer_risco'] });
    if (r.ok) return;
    expect(errosDaApiDec(r).alerta).toBe('Faltam itens para o pacote: parecer de risco.');
    expect(await listarPacotesDaDemanda(deps.db, id)).toEqual([]);
  });

  it('a validação da tela é só conveniência: sem descrição e sem nível, o servidor recusa campo a campo', async () => {
    const id = await novaDemanda();
    const r = await gravar(id, preenchido({ 'opcaoB.descricao': '', nivelAprovacaoRequerido: '' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(errosDaApiDec(r).campos.map((c) => [c.campo, c.mensagem])).toEqual([
      ['opcaoB.descricao', 'Descreva a opção B.'],
      ['nivelAprovacaoRequerido', 'Escolha o nível de aprovação requerido.'],
    ]);
    expect(await listarPacotesDaDemanda(deps.db, id)).toEqual([]);
  });

  it('id fora do formato não toca o banco; demanda que não existe: 404 com o texto da 2.8', async () => {
    expect(await gravar('DEM-1', preenchido())).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    expect(await gravar('DEM-20261022-9999', preenchido())).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  // 06-T43-testes (qa-automacao).
  it('CA-10.1 (qa-automacao): sem ESP e sem RSK, "Faltam itens para o pacote: especificação técnica e parecer de risco." e a demanda não muda', async () => {
    const id = await novaDemanda({});
    const r = await gravar(id, preenchido());
    expect(r).toMatchObject({ ok: false, erro: 'entrada_invalida', faltando: ['especificacao', 'parecer_risco'] });
    if (r.ok) return;
    expect(errosDaApiDec(r).alerta).toBe('Faltam itens para o pacote: especificação técnica e parecer de risco.');
    expect(await listarPacotesDaDemanda(deps.db, id)).toEqual([]);
    expect((await obterDemanda(deps.db, id)).status).toBe('nova');
  });

  it('CA-10.3 (qa-automacao): com ESP v1 e v2 e RSK v1, o pacote cita a ESP v2; o seguinte é a v2 e também nasce pendente', async () => {
    const id = await novaDemanda();
    await criarEspecificacao(
      deps,
      ator,
      id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: 'ESP v2 pela API (fictício)',
        escopoInclui: [],
        sistemaAlvo: 'sistema-ficticio',
        repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
        criteriosAceitePreliminares: ['Critério (fictício)'],
        definicaoDePronto: ['Pronto (fictício)'],
      }),
    );
    expect(await gravar(id, preenchido())).toEqual({ ok: true, dados: { id: `DEC-${id}-v1`, demandaId: id } });
    expect(await gravar(id, preenchido({ nivelAprovacaoRequerido: 'cto' }))).toEqual({ ok: true, dados: { id: `DEC-${id}-v2`, demandaId: id } });
    const pacotes = await listarPacotesDaDemanda(deps.db, id);
    expect(pacotes.map((p) => [p.id, p.especificacaoId, p.parecerRiscoId, p.statusDecisao, p.nivelAprovacaoRequerido])).toEqual(
      expect.arrayContaining([
        [`DEC-${id}-v1`, `ESP-${id}-v2`, `RSK-${id}-v1`, 'pendente', 'cto_e_administradora'],
        [`DEC-${id}-v2`, `ESP-${id}-v2`, `RSK-${id}-v1`, 'pendente', 'cto'],
      ]),
    );
    expect(pacotes).toHaveLength(2);
  });

  it('sem sessão: nada grava', async () => {
    const id = await novaDemanda();
    pedido.cabecalhos = new Headers();
    expect(await gravar(id, preenchido())).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(await listarPacotesDaDemanda(deps.db, id)).toEqual([]);
  });
});
