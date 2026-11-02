// T43: a Server Action da T11 Decisão do pacote contra o banco e o Better Auth reais (Testcontainers), com a entrada montada
// pelas mesmas funções da tela (dados-da-decisao.ts). A regra é a de PATCH /api/pacotes-decisao/:decId/decisao
// (registrarDecisao, T21): a validação da tela é só conveniência, e a autoria vem só da sessão (C-11). Duas contas
// fictícias, cto e administradora, cada uma com a própria sessão. Relógio fixo (RNF-15), um dia por teste (C-36).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../test/deps';
import { criarPessoa } from '../../../../../test/sessao';
import { entradaDaDecisao, errosDaApiDecisao, valoresDaDecisao, type ContextoDoFormulario, type ValoresDaDecisao } from '../../../../components/dados-da-decisao';
import { definirDepsParaTeste, type Deps } from '../../../../lib/deps';
import { relogioFixo, type RelogioFixo } from '../../../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../../../../modules/acesso/ator';
import { obterDemanda } from '../../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../modules/especificacoes/servico';
import { obterPacoteDecisao } from '../../../../modules/pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../../../../modules/pacotes-decisao/criar';
import { MENSAGENS_DECISAO } from '../../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema } from '../../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../modules/pareceres-risco/servico';
import { registrarDecisaoNoPainel } from './acoes';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../../../lib/sentry', () => ({ capturarErro: () => undefined }));

const DIA_MS = 86_400_000;

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let cookieAdm: string;
let cto: AtorPessoa;
let dia = 0;

const SEM_CTX: ContextoDoFormulario = { opcaoFixada: null, pedeDocumento: false, exigeRevisao: false, aprovarIndisponivel: false };
const v = (extra: Partial<ValoresDaDecisao>): ValoresDaDecisao => ({ ...valoresDaDecisao(), ...extra });

async function novoPacote(nivel: 'cto' | 'cto_e_administradora'): Promise<{ demandaId: string; decId: string }> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Demanda da decisão (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(
    deps,
    cto,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'ESP (fictício)',
      escopoInclui: [],
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Critério (fictício)'],
      definicaoDePronto: ['Pronto (fictício)'],
    }),
  );
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  const dec = await criarPacoteDecisao(
    deps,
    cto,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: nivel }),
  );
  return { demandaId: d.id, decId: dec.id };
}

const como = (cookie: string) => {
  pedido.cabecalhos = new Headers({ cookie });
};
const decidir = (decId: string, valores: ValoresDaDecisao, ctx: ContextoDoFormulario = SEM_CTX, extra: Record<string, unknown> = {}) =>
  registrarDecisaoNoPainel({ decId, decisao: { ...entradaDaDecisao(valores, ctx), ...extra } });

beforeAll(async () => {
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const pc = await criarPessoa(deps, { papel: 'cto' });
  const pa = await criarPessoa(deps, { papel: 'administradora' });
  cookieCto = pc.cookie;
  cookieAdm = pa.cookie;
  cto = { tipo: 'pessoa', usuarioId: pc.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
});

afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * DIA_MS);
  como(cookieCto);
});

describe('registrarDecisaoNoPainel (T11)', () => {
  it('nível cto: aprova a opção A pela conta cto; a resposta só tem o id e o resultado; a demanda continua em Pronta para decisão (P1-d)', async () => {
    const { demandaId, decId } = await novoPacote('cto');
    const r = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), SEM_CTX, { registrarComo: 'administradora' });
    // `registrarComo` de outro papel é recusado pela regra do servidor (P1-a): a tela nunca o manda.
    expect(r).toMatchObject({ ok: false, erro: 'sem_permissao' });
    const ok = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
    expect(ok).toEqual({ ok: true, dados: { decId, resultado: 'aprovada' } });
    const p = await obterPacoteDecisao(deps.db, decId);
    expect(p).toMatchObject({ statusDecisao: 'aprovada', decisao: { opcaoEscolhida: 'A' }, aprovadores: [{ papel: 'cto', opcao: 'A' }] });
    expect((await obterDemanda(deps.db, demandaId)).status).toBe('pronta_para_decisao');
  });

  it('P1-b: a administradora não aprova DEC de nível cto (403)', async () => {
    const { decId } = await novoPacote('cto');
    como(cookieAdm);
    expect(await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }))).toMatchObject({ ok: false, erro: 'sem_permissao' });
    expect((await obterPacoteDecisao(deps.db, decId)).statusDecisao).toBe('pendente');
  });

  it('dupla aprovação: CTO → parcial; administradora com a opção fixada, documento e data → aprovada', async () => {
    const { decId } = await novoPacote('cto_e_administradora');
    expect(await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' }))).toEqual({ ok: true, dados: { decId, resultado: 'aprovacao_parcial' } });
    como(cookieAdm);
    const ctxAdm: ContextoDoFormulario = { ...SEM_CTX, opcaoFixada: { papel: 'cto', opcao: 'B' }, pedeDocumento: true };
    const semDoc = await decidir(decId, v({ statusDecisao: 'aprovada' }), ctxAdm);
    expect(semDoc.ok).toBe(false);
    if (semDoc.ok) return;
    expect(errosDaApiDecisao(semDoc, ctxAdm).campos.map((c) => [c.campo, c.mensagem])).toEqual([
      ['referenciaDocumento', MENSAGENS_DECISAO.semReferencia],
      ['dataDocumento', MENSAGENS_DECISAO.semDataDocumento],
    ]);
    const r = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', referenciaDocumento: 'DOC-FICTICIO-1', dataDocumento: '2026-10-23' }), ctxAdm);
    expect(r).toEqual({ ok: true, dados: { decId, resultado: 'aprovada' } });
    const p = await obterPacoteDecisao(deps.db, decId);
    expect(p.statusDecisao).toBe('aprovada');
    // Com o relógio fixo, as duas aprovações têm o mesmo instante, e a vista as ordena pelo papel.
    const aprovacoes = p.aprovadores.map((a) => [a.papel, a.opcao, a.referenciaDocumento, a.dataDocumento]);
    expect(aprovacoes).toHaveLength(2);
    expect(aprovacoes).toEqual(
      expect.arrayContaining([
        ['cto', 'B', null, null],
        ['administradora', 'B', 'DOC-FICTICIO-1', '2026-10-23'],
      ]),
    );
  });

  it('desatualizado: Aprovar dá 409 com o texto da 03; Devolver é aceito e a demanda volta para Em análise', async () => {
    const { demandaId, decId } = await novoPacote('cto');
    await criarParecerRisco(deps, cto, demandaId, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const r = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(errosDaApiDecisao(r, SEM_CTX).alerta).toBe('Não foi possível concluir: o pacote está desatualizado e não pode ser aprovado.');
    expect(await decidir(decId, v({ statusDecisao: 'devolvida', comentarios: 'Refazer (fictício)' }))).toEqual({ ok: true, dados: { decId, resultado: 'devolvida' } });
    expect((await obterDemanda(deps.db, demandaId)).status).toBe('em_analise');
    const segunda = await decidir(decId, v({ statusDecisao: 'arquivada' }));
    expect(segunda.ok).toBe(false);
    if (segunda.ok) return;
    expect(errosDaApiDecisao(segunda, SEM_CTX).alerta).toBe('Não foi possível concluir: este pacote já tem decisão registrada.');
  });

  it('arquivar: a demanda vai para Encerrada', async () => {
    const { demandaId, decId } = await novoPacote('cto');
    expect(await decidir(decId, v({ statusDecisao: 'arquivada' }))).toEqual({ ok: true, dados: { decId, resultado: 'arquivada' } });
    expect((await obterDemanda(deps.db, demandaId)).status).toBe('encerrada');
  });

  it('id fora do formato não toca o banco; sem sessão nada grava; decisão inválida volta como erro de campo', async () => {
    expect(await registrarDecisaoNoPainel({ decId: 'DEC-1', decisao: { statusDecisao: 'arquivada' } })).toMatchObject({ ok: false, erro: 'entrada_invalida' });
    const { decId } = await novoPacote('cto');
    const r = await registrarDecisaoNoPainel({ decId, decisao: { statusDecisao: 'qualquer' } });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(errosDaApiDecisao(r, SEM_CTX).campos.map((c) => [c.campo, c.mensagem])).toEqual([['statusDecisao', 'Escolha a decisão.']]);
    pedido.cabecalhos = new Headers();
    expect(await decidir(decId, v({ statusDecisao: 'arquivada' }))).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect((await obterPacoteDecisao(deps.db, decId)).statusDecisao).toBe('pendente');
  });
});

// 06-T43-testes (qa-automacao): o que a tela evita, o servidor também recusa quando a Server Action é chamada direto.
describe('registrarDecisaoNoPainel: a regra do servidor sem a ajuda da tela (qa-automacao)', () => {
  const AGENTE: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };

  async function semDecisao(decId: string, aprovacoes: number): Promise<void> {
    const p = await obterPacoteDecisao(deps.db, decId);
    expect(p.statusDecisao).toBe('pendente');
    expect(p.decisao).toBeNull();
    expect(p.aprovadores).toHaveLength(aprovacoes);
  }

  it('CA-14.1 e CA-14.4: só o CTO → pendente, sem decisão; o CTO de novo e a administradora com a outra opção dão 409 e nada grava', async () => {
    const { decId } = await novoPacote('cto_e_administradora');
    expect(await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }))).toEqual({ ok: true, dados: { decId, resultado: 'aprovacao_parcial' } });
    await semDecisao(decId, 1);

    const deNovo = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
    expect(deNovo.ok).toBe(false);
    if (deNovo.ok) return;
    expect(errosDaApiDecisao(deNovo, SEM_CTX).alerta).toBe('Não foi possível concluir: a aprovação do CTO já está registrada.');

    como(cookieAdm);
    // Sem a opção fixada da tela: a administradora manda B sobre o A do CTO.
    const ctxAdm: ContextoDoFormulario = { ...SEM_CTX, pedeDocumento: true };
    const outra = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', referenciaDocumento: 'DOC-FICTICIO-2', dataDocumento: '2026-10-23' }), ctxAdm);
    expect(outra.ok).toBe(false);
    if (outra.ok) return;
    expect(outra.erro).toBe('conflito');
    expect(errosDaApiDecisao(outra, ctxAdm).alerta).toBe('Não foi possível concluir: a opção precisa ser a mesma aprovada pelo CTO.');
    await semDecisao(decId, 1);
  });

  it('P1-a: a administradora aprova primeiro; o CTO fecha com a opção fixada na dela, mesmo com outra letra marcada antes', async () => {
    const { decId } = await novoPacote('cto_e_administradora');
    como(cookieAdm);
    const ctxAdm: ContextoDoFormulario = { ...SEM_CTX, pedeDocumento: true };
    const r = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', referenciaDocumento: 'DOC-FICTICIO-3', dataDocumento: '2026-10-24' }), ctxAdm);
    expect(r).toEqual({ ok: true, dados: { decId, resultado: 'aprovacao_parcial' } });
    await semDecisao(decId, 1);
    como(cookieCto);
    const ctxCto: ContextoDoFormulario = { ...SEM_CTX, opcaoFixada: { papel: 'administradora', opcao: 'B' } };
    expect(await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), ctxCto)).toEqual({ ok: true, dados: { decId, resultado: 'aprovada' } });
    const p = await obterPacoteDecisao(deps.db, decId);
    expect(p).toMatchObject({ statusDecisao: 'aprovada', decisao: { opcaoEscolhida: 'B' } });
    expect(p.aprovadores.map((a) => [a.papel, a.opcao, a.referenciaDocumento, a.dataDocumento])).toEqual(
      expect.arrayContaining([
        ['administradora', 'B', 'DOC-FICTICIO-3', '2026-10-24'],
        ['cto', 'B', null, null],
      ]),
    );
  });

  it('CA-13.5 e C-11: nome, papel e conta mandados no corpo não chegam ao banco; vale a sessão', async () => {
    const { decId } = await novoPacote('cto');
    const forjado = 'Nome Forjado (fictício)';
    const r = await decidir(decId, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' }), SEM_CTX, {
      aprovadorNome: forjado,
      aprovadorPapel: 'administradora',
      nomeAprovador: forjado,
      decididaPor: forjado,
      registradaPor: 'usuario-forjado',
      papelAprovacao: 'administradora',
    });
    expect(r).toEqual({ ok: true, dados: { decId, resultado: 'aprovada' } });
    const p = await obterPacoteDecisao(deps.db, decId);
    expect(p.decisao?.decididaPor).toBe(cto.nome);
    expect(p.aprovadores).toEqual([expect.objectContaining({ papel: 'cto', nome: cto.nome, opcao: 'B' })]);
    expect(JSON.stringify(p)).not.toContain('Forjado');
    expect(JSON.stringify(p)).not.toContain('usuario-forjado');
  });

  it('CA-13.2 e CA-13.3: opção C ou aprovar sem opção dão 400 no grupo de opção, com o texto da 03, e nada grava', async () => {
    const { decId } = await novoPacote('cto');
    for (const decisao of [{ statusDecisao: 'aprovada', opcaoEscolhida: 'C' }, { statusDecisao: 'aprovada' }]) {
      const r = await registrarDecisaoNoPainel({ decId, decisao });
      expect(r.ok, JSON.stringify(decisao)).toBe(false);
      if (r.ok) return;
      expect(r.erro).toBe('entrada_invalida');
      expect(errosDaApiDecisao(r, SEM_CTX).campos.map((c) => [c.campo, c.mensagem])).toEqual([['opcaoEscolhida', 'Escolha a opção A ou a opção B.']]);
    }
    await semDecisao(decId, 0);
  });

  it('CA-13.4: pacote que cita ESP de agente: sem a confirmação de revisão, aprovar e devolver dão 400 e nada grava; com ela, aprova', async () => {
    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Demanda com rascunho (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    await criarEspecificacao(
      deps,
      AGENTE,
      d.id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: 'ESP de agente (fictício)',
        escopoInclui: [],
        sistemaAlvo: 'sistema-ficticio',
        repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
        criteriosAceitePreliminares: ['Critério (fictício)'],
        definicaoDePronto: ['Pronto (fictício)'],
      }),
    );
    await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const dec = await criarPacoteDecisao(
      deps,
      cto,
      d.id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: 'cto' }),
    );
    expect((await obterPacoteDecisao(deps.db, dec.id)).rascunhosCitados).toEqual([`ESP-${d.id}-v1`]);

    const ctxRevisao: ContextoDoFormulario = { ...SEM_CTX, exigeRevisao: true };
    for (const valores of [v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), v({ statusDecisao: 'devolvida' })]) {
      const r = await decidir(dec.id, valores);
      expect(r.ok, valores.statusDecisao).toBe(false);
      if (r.ok) return;
      expect(errosDaApiDecisao(r, ctxRevisao).campos.map((c) => [c.campo, c.mensagem])).toEqual([['revisouRascunhosDeAgente', MENSAGENS_DECISAO.revisarRascunhos]]);
    }
    await semDecisao(dec.id, 0);
    expect((await obterDemanda(deps.db, d.id)).status).toBe('pronta_para_decisao');

    const ok = await decidir(dec.id, v({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', revisouRascunhosDeAgente: true }), ctxRevisao);
    expect(ok).toEqual({ ok: true, dados: { decId: dec.id, resultado: 'aprovada' } });
  });

  it('DEC no formato certo que não existe: 404 (nao_encontrado), e não 400 nem erro interno', async () => {
    expect(await registrarDecisaoNoPainel({ decId: 'DEC-DEM-20261022-9999-v1', decisao: { statusDecisao: 'arquivada' } })).toMatchObject({ ok: false, erro: 'nao_encontrado' });
  });
});
