// T42 (06-T42-testes, qa-automacao): a T08 Novo parecer de risco e a T10 Ver RSK contra o banco e o Better Auth reais
// (Testcontainers). O acoes.test.ts do engenheiro prova a Server Action caso a caso, e os pagina.test.ts provam o HTML
// com leituras de dublê. O que nenhum dos dois alcança:
//   - a tela e o servidor concordando: para os mesmos valores da tela, a validação do navegador (validarParecer) e a
//     recusa do servidor, levada à tela por errosDaApiRsk, dão o mesmo campo, a mesma linha, o mesmo id de foco, o mesmo
//     rótulo, a mesma mensagem e a mesma ordem do Resumo de erros;
//   - RF-09 (CA-09.1 a CA-09.3) e RF-19, "nas mesmas rotas e com o mesmo schema": a Server Action e
//     POST /api/demandas/:id/pareceres-risco recusam as mesmas entradas com o mesmo corpo de erro e gravam o mesmo conteúdo;
//   - RF-19 pelo painel: com os agentes desligados, o RSK não enfileira nada; com a consolidação ligada, o RSK do painel a
//     dispara só quando a demanda tem ESP, e não com o teto atingido;
//   - o aviso de DEC desatualizado: só o pacote que esta versão desatualizou, e a chegada na T05 montada com a URL que a
//     Server Action devolve e a demanda lida do banco;
//   - concorrência: dois envios da mesma tela ao mesmo tempo viram v1 e v2, e só o segundo diz que houve conflito;
//   - RF-11: a versão nova pelo painel não muda a anterior, nem com id, versão e autoria adulterados na entrada;
//   - C-21: uma linha de log por envio, sem nada do que foi digitado; a resposta também não traz;
//   - o rascunho do agente de risco gravado de verdade (pendência da 06-T42-revisao: só visto com dublê) chegando à T08 e
//     à T10, com o conteúdo do agente como texto (C-18) e o aviso de versão mais nova calculado pelo banco; e `?base=` de
//     outra demanda ignorado com as leituras reais.
// Relógio fixo dos Deps (RNF-15), um dia por teste por causa do limite por ator (C-36). Só dado fictício.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../../../test/deps';
import { chamarRota } from '../../../../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../../../../test/sentinelas';
import { criarPessoa } from '../../../../../../../test/sessao';
import { POST as postParecer } from '../../../../../api/demandas/[id]/pareceres-risco/route';
import {
  caminhoDeChegadaDoParecer,
  chegadaDoParecer,
  entradaDoParecer,
  errosDaApiRsk,
  TEXTOS_RSK,
  validarParecer,
  valoresDoParecer,
  type ValoresDoParecer,
} from '../../../../../../components/dados-do-parecer';
import { idDoCampo, type ErroDeCampo } from '../../../../../../components/formulario';
import type { ItemDaLista } from '../../../../../../components/lista-textos';
import { SELO_RASCUNHO } from '../../../../../../components/rotulos';
import type { NivelRisco } from '../../../../../../db/schema/versoes';
import { definirDepsParaTeste, type Deps } from '../../../../../../lib/deps';
import { substituirDestinoDoLog } from '../../../../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../../../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../../../../../../modules/acesso/ator';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { criarDemandaSchema } from '../../../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../../modules/pacotes-decisao/schemas';
import { listarPareceresRisco, obterParecerRisco } from '../../../../../../modules/pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../../../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../../../modules/pareceres-risco/servico';
import PaginaParecer from '../../../../pareceres-risco/[rskId]/page';
import { rotuloResponsavel } from '../../detalhe';
import * as acoes from './acoes';
import PaginaNovoParecer from './page';

const { gravarParecerNoPainel } = acoes;

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
// notFound e redirect são os reais; só o roteador do cliente (formulário) não existe fora do Next.
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/demandas',
}));
vi.mock('../../../../../../lib/sentry', async (original) => ({ ...(await original<typeof import('../../../../../../lib/sentry')>()), capturarErro: () => undefined }));

const DIA_MS = 86_400_000;
const BASE = '2026-10-22T12:00:00Z';
const LONGO = 'x'.repeat(10_001);

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookie: string;
let ator: AtorPessoa;
let dia = 0;
const linhasDoLog: string[] = [];

const RISCO: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) => (await b.poolMigrator.query<T>(texto, valores)).rows;
const execucoes = (id: string) => consultar<{ agente: string; chave_entrada: string; id: string }>('select id, agente, chave_entrada from execucao_agente where demanda_id = $1', [id]);
const jobs = async () => (await consultar<{ nome: string; n: number }>('select name as nome, count(*)::int as n from pgboss.job group by name order by name')).map((l) => `${l.nome}:${l.n}`);
const jobDaExecucao = async (execId: string) =>
  (await consultar<{ n: number }>(`select count(*)::int as n from pgboss.job where name = 'agente.executar' and data->>'execucaoId' = $1`, [execId]))[0]!.n;
const linhaDoRsk = async (rskId: string) => (await consultar<Record<string, unknown>>('select * from parecer_risco where id = $1', [rskId]))[0];

const lista = (campo: string, ...valores: string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));

// Os valores da tela de um parecer completo.
const completo = (extra: Partial<ValoresDoParecer> = {}): ValoresDoParecer => ({
  ...valoresDoParecer(null),
  resumo: 'Risco controlado (fictício).',
  riscoTecnicoNivel: 'alto',
  riscoTecnicoComentario: 'Integração frágil (fictício).',
  riscoOperacionalNivel: 'medio',
  riscoJuridicoNivel: 'baixo',
  recomendacoesMitigacao: lista('recomendacoesMitigacao', 'Testar a integração antes (fictício)'),
  preCondicoes: lista('preCondicoes', 'Contrato assinado (fictício)'),
  envolverJuridicoOuAdministradoraQuando: 'Contrato com cláusula nova (fictício).',
  ...extra,
});

// O corpo da API de um parecer completo.
const CORPO_COMPLETO = {
  resumo: 'Risco controlado (fictício).',
  riscoTecnicoNivel: 'alto',
  riscoTecnicoComentario: 'Integração frágil (fictício).',
  riscoOperacionalNivel: 'medio',
  riscoJuridicoNivel: 'baixo',
  recomendacoesMitigacao: ['Testar a integração antes (fictício)'],
  preCondicoes: ['Contrato assinado (fictício)'],
  envolverJuridicoOuAdministradoraQuando: 'Contrato com cláusula nova (fictício).',
};

const ESP_VALIDA = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};

async function novaDemanda(extra: Record<string, unknown> = {}): Promise<string> {
  return (await criarDemanda(deps, ator, criarDemandaSchema.parse({ titulo: 'Demanda do RSK QA (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia', ...extra }))).id;
}
const novaEsp = (id: string) => criarEspecificacao(deps, ator, id, criarEspecificacaoSchema.parse(ESP_VALIDA));
const novoRsk = (id: string, quem: AtorPessoa | AtorAgente = ator, extra: Record<string, unknown> = {}) =>
  criarParecerRisco(deps, quem, id, criarParecerRiscoSchema.parse({ ...CORPO_COMPLETO, ...extra }));
const novoDec = (id: string) =>
  criarPacoteDecisao(
    deps,
    ator,
    id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo (fictício)', opcaoA: { descricao: 'A (fictício)' }, opcaoB: { descricao: 'B (fictício)' }, nivelAprovacaoRequerido: 'cto' }),
  );

// Como o FormularioParecer chama a Server Action, sem a validação da tela.
const enviar = (id: string, v: ValoresDoParecer, versaoEsperada: number, extra: Record<string, unknown> = {}) =>
  gravarParecerNoPainel({ ...entradaDoParecer(v).entrada, demandaId: id, versaoEsperada, ...extra });

type Resultado = Awaited<ReturnType<typeof gravarParecerNoPainel>>;
type Falha = Extract<Resultado, { ok: false }>;
function falhou(r: Resultado): Falha {
  if (r.ok) throw new Error(`esperava falha da Server Action, veio ${JSON.stringify(r)}`);
  return r;
}
function gravou(r: Resultado) {
  if (!r.ok) throw new Error(`esperava gravação, veio ${JSON.stringify(r)}`);
  return r.dados;
}

const sem = (o: object, chaves: readonly string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !chaves.includes(k)));

// Na ordem em que o Resumo de erros os mostra.
const comoNaTela = (erros: readonly ErroDeCampo[]) => erros.map((e) => [e.campo, e.idCampo, e.rotulo, e.mensagem].join(' | '));

const ENTIDADES: Readonly<Record<string, string>> = { '&quot;': '"', '&#x27;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
const texto = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&quot;|&#x27;|&lt;|&gt;|&amp;/g, (e) => ENTIDADES[e]!);

const paginaNova = async (id: string, busca: Record<string, string> = {}) =>
  renderToStaticMarkup(await PaginaNovoParecer({ params: Promise.resolve({ id }), searchParams: Promise.resolve(busca) }));
const paginaVer = async (rskId: string) => renderToStaticMarkup(await PaginaParecer({ params: Promise.resolve({ rskId }) }));

// A opção marcada de um grupo de nível no HTML do servidor.
function marcado(html: string, campo: 'riscoTecnicoNivel' | 'riscoOperacionalNivel' | 'riscoJuridicoNivel'): string | null {
  for (const nivel of ['baixo', 'medio', 'alto']) {
    const m = new RegExp(`<input\\b[^>]*\\sid="${idDoCampo(campo)}-${nivel}"[^>]*>`).exec(html);
    if (!m) throw new Error(`sem a opção ${nivel} de ${campo}`);
    if (m[0].includes('checked=""')) return nivel;
  }
  return null;
}

// A chegada na T05 como a página a monta: os parâmetros da URL que a Server Action devolveu e a demanda lida do banco.
async function chegadaNaT05(dados: Parameters<typeof caminhoDeChegadaDoParecer>[0]) {
  const url = new URL(caminhoDeChegadaDoParecer(dados), 'http://painel.invalid');
  expect(url.pathname).toBe(`/demandas/${dados.demandaId}`);
  return chegadaDoParecer(Object.fromEntries(url.searchParams), await obterDemanda(deps.db, dados.demandaId));
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  relogio = relogioFixo(BASE);
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const p = await criarPessoa(deps, { papel: 'administradora' });
  cookie = p.cookie;
  ator = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'administradora' };
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(async () => {
  relogio.definir(BASE);
  relogio.avancar(++dia * DIA_MS);
  linhasDoLog.length = 0;
  pedido.cabecalhos = new Headers({ cookie });
  // Os agentes nascem desligados (RF-19); só os testes do gatilho ligam a consolidação.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 0 where id = 1');
});

describe('a tela e o servidor concordam (T08)', () => {
  // Valores que a validação da tela recusa. Enviados sem ela, o servidor recusa os mesmos, e errosDaApiRsk os põe no
  // mesmo lugar e na mesma ordem: mesmo campo, mesmo id de foco (a primeira opção do grupo de nível; a linha da tela,
  // contando os itens vazios descartados), mesmo rótulo e mesma mensagem da 03.
  const casos: Array<[string, Partial<ValoresDoParecer>]> = [
    ['os três níveis sem marcar', { riscoTecnicoNivel: '', riscoOperacionalNivel: '', riscoJuridicoNivel: '' }],
    ['só o nível do risco operacional sem marcar', { riscoOperacionalNivel: '' }],
    ['Resumo com 10.001 caracteres', { resumo: LONGO }],
    ['comentário do risco jurídico com 10.001 caracteres', { riscoJuridicoComentario: LONGO }],
    ['item longo na 3ª linha de Recomendações, depois de uma linha vazia e de uma só com espaços', { recomendacoesMitigacao: lista('recomendacoesMitigacao', '', '   ', LONGO) }],
    [
      '51 pré-condições, com linhas vazias no meio',
      { preCondicoes: lista('preCondicoes', ...Array.from({ length: 51 }, (_, i) => `Pré-condição ${i + 1} (fictício)`).flatMap((x, i) => (i % 10 === 0 ? ['', x] : [x]))) },
    ],
    ['"Quando envolver…" com 10.001 caracteres', { envolverJuridicoOuAdministradoraQuando: LONGO }],
    [
      'tudo junto: sem nível técnico nem jurídico, comentário operacional longo e item longo nas duas listas',
      {
        riscoTecnicoNivel: '',
        riscoJuridicoNivel: '',
        riscoOperacionalComentario: LONGO,
        recomendacoesMitigacao: lista('recomendacoesMitigacao', 'Curto (fictício)', LONGO),
        preCondicoes: lista('preCondicoes', '', LONGO, '', LONGO),
      },
    ],
  ];

  it.each(casos)('%s: o mesmo erro, no mesmo lugar e na mesma ordem, pela tela e pelo servidor; nada é gravado', async (_, extra) => {
    const id = await novaDemanda();
    const v = completo(extra);
    const daTela = validarParecer(v);
    expect(daTela.length).toBeGreaterThan(0);

    const { entrada, indices } = entradaDoParecer(v);
    const f = falhou(await gravarParecerNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 }));
    expect(f.erro).toBe('entrada_invalida');
    const doServidor = errosDaApiRsk(f, { indices, valores: v });
    expect(doServidor.alerta).toBeNull();
    expect(comoNaTela(doServidor.campos)).toEqual(comoNaTela(daTela));
    expect(await listarPareceresRisco(deps.db, id)).toEqual([]);
  });

  it('no limite (RNF-04): 10.000 caracteres com espaços em volta passam na tela e no servidor, e o gravado vem aparado', async () => {
    const id = await novaDemanda();
    const limite = 'y'.repeat(10_000);
    const v = completo({ resumo: `  ${limite}  `, riscoOperacionalComentario: limite, preCondicoes: lista('preCondicoes', `\t${limite} `) });
    expect(validarParecer(v)).toEqual([]);
    gravou(await enviar(id, v, 1));
    const [rsk] = await listarPareceresRisco(deps.db, id);
    expect(rsk).toMatchObject({ resumo: limite, riscoOperacionalComentario: limite, preCondicoes: [limite] });
  });

  it('CA-09.2 pela tela: nível adulterado ("critico") passa na tela e o servidor recusa; vira "Escolha o nível do risco técnico." no grupo, com o foco na primeira opção', async () => {
    const id = await novaDemanda();
    const v = completo({ riscoTecnicoNivel: 'critico' as NivelRisco });
    expect(validarParecer(v)).toEqual([]);
    const { entrada, indices } = entradaDoParecer(v);
    const f = falhou(await gravarParecerNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 }));
    expect(f.campos).toEqual([{ campo: 'riscoTecnicoNivel', mensagem: 'Valor inválido.' }]);
    expect(errosDaApiRsk(f, { indices, valores: v }).campos).toEqual([
      { campo: 'riscoTecnicoNivel', idCampo: `${idDoCampo('riscoTecnicoNivel')}-baixo`, rotulo: 'Nível do risco técnico', mensagem: 'Escolha o nível do risco técnico.' },
    ]);
    expect(await listarPareceresRisco(deps.db, id)).toEqual([]);
  });
});

describe('RF-09 e RF-19: o painel usa a mesma regra e o mesmo schema da rota', () => {
  const recusas: Array<[string, Record<string, unknown>]> = [
    ['CA-09.2: riscoTecnicoNivel "critico"', { ...CORPO_COMPLETO, riscoTecnicoNivel: 'critico' }],
    ['CA-09.3: preCondicoes como texto corrido', { ...CORPO_COMPLETO, preCondicoes: 'Contrato assinado; equipe treinada (fictício)' }],
    ['recomendacoesMitigacao como texto corrido', { ...CORPO_COMPLETO, recomendacoesMitigacao: 'Testar antes (fictício)' }],
    ['sem riscoOperacionalNivel', { ...CORPO_COMPLETO, riscoOperacionalNivel: undefined }],
    ['nível com maiúscula ("Alto")', { ...CORPO_COMPLETO, riscoJuridicoNivel: 'Alto' }],
    ['nível nulo', { ...CORPO_COMPLETO, riscoTecnicoNivel: null }],
    ['item vazio em preCondicoes', { ...CORPO_COMPLETO, preCondicoes: ['Ok (fictício)', ''] }],
    ['item só com espaços em recomendacoesMitigacao', { ...CORPO_COMPLETO, recomendacoesMitigacao: ['   '] }],
    ['51 recomendações', { ...CORPO_COMPLETO, recomendacoesMitigacao: Array.from({ length: 51 }, (_, i) => `Mitigação ${i} (fictício)`) }],
    ['comentário do risco técnico com 10.001 caracteres', { ...CORPO_COMPLETO, riscoTecnicoComentario: LONGO }],
    ['resumo como número', { ...CORPO_COMPLETO, resumo: 42 }],
  ];

  it.each(recusas)('%s: a rota responde 400 e a Server Action devolve o mesmo erro, a mesma mensagem e os mesmos campos', async (_, corpo) => {
    const id = await novaDemanda();
    const resposta = await chamarRota(postParecer, { metodo: 'POST', caminho: `/api/demandas/${id}/pareceres-risco`, params: { id }, cookie, corpo });
    expect(resposta.status).toBe(400);
    const daRota = (await resposta.json()) as Record<string, unknown>;
    expect(daRota.erro).toBe('entrada_invalida');
    expect(daRota.campos).not.toEqual([]);

    const f = falhou(await gravarParecerNoPainel({ ...corpo, demandaId: id, versaoEsperada: 1 }));
    expect(sem(f, ['ok'])).toEqual(daRota);
    expect(await listarPareceresRisco(deps.db, id)).toEqual([]);
  });

  it('CA-09.1: a mesma entrada válida grava RSK-<demanda>-v1 pela rota e RSK-<demanda>-v2 pelo painel, com o mesmo conteúdo e a autoria da sessão nos dois', async () => {
    const id = await novaDemanda();
    const corpo = { ...CORPO_COMPLETO, resumo: '  Risco controlado (fictício).  ', riscoJuridicoComentario: '' };
    const resposta = await chamarRota(postParecer, { metodo: 'POST', caminho: `/api/demandas/${id}/pareceres-risco`, params: { id }, cookie, corpo });
    expect(resposta.status).toBe(201);
    expect(((await resposta.json()) as { id: string }).id).toBe(`RSK-${id}-v1`);
    const r = await gravarParecerNoPainel({ ...corpo, demandaId: id, versaoEsperada: 2 });
    expect(r).toEqual({ ok: true, dados: { id: `RSK-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: null } });

    const [v2, v1] = await listarPareceresRisco(deps.db, id);
    expect(sem(v2!, ['id', 'versao', 'criadaEm'])).toEqual(sem(v1!, ['id', 'versao', 'criadaEm']));
    expect(v1).toMatchObject({ resumo: 'Risco controlado (fictício).', riscoJuridicoComentario: null, autor: { tipo: 'pessoa' }, rascunhoAgente: false });
  });
});

describe('RF-19 pelo painel: agentes, fila e teto', () => {
  const ligarConsolidacao = async (teto: number) => {
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', ['consolidacao', 'modelo-ficticio-t42']);
    await b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [teto]);
  };

  it('com os agentes desligados, o RSK do painel numa demanda com ESP não cria execução nem job', async () => {
    const id = await novaDemanda();
    await novaEsp(id);
    const antes = await jobs();
    gravou(await enviar(id, completo(), 1));
    expect(await execucoes(id)).toEqual([]);
    expect(await jobs()).toEqual(antes);
  });

  it('consolidação ligada: o RSK do painel a dispara com a chave rsk:<id> e um job só quando a demanda tem ESP', async () => {
    await ligarConsolidacao(10);
    const semEsp = await novaDemanda();
    const antes = await jobs();
    gravou(await enviar(semEsp, completo(), 1));
    expect(await execucoes(semEsp)).toEqual([]);
    expect(await jobs()).toEqual(antes);

    const comEsp = await novaDemanda();
    await novaEsp(comEsp);
    const r = gravou(await enviar(comEsp, completo(), 1));
    const [exec, ...outras] = await execucoes(comEsp);
    expect(outras).toEqual([]);
    expect(exec).toMatchObject({ agente: 'consolidacao', chave_entrada: `rsk:${r.id}` });
    expect(await jobDaExecucao(exec!.id)).toBe(1);
  });

  it('consolidação ligada com o teto em zero (suspensa): o RSK do painel grava e nada é enfileirado', async () => {
    await ligarConsolidacao(0);
    const id = await novaDemanda();
    await novaEsp(id);
    const antes = await jobs();
    expect(gravou(await enviar(id, completo(), 1)).id).toBe(`RSK-${id}-v1`);
    expect(await execucoes(id)).toEqual([]);
    expect(await jobs()).toEqual(antes);
  });
});

describe('DEC desatualizado e chegada na T05', () => {
  it('só o pacote pendente que esta versão desatualizou entra no aviso; o que já estava desatualizado, não', async () => {
    const id = await novaDemanda();
    await novaEsp(id);
    await novoRsk(id);
    const dec1 = await novoDec(id);
    await novaEsp(id); // a ESP v2 desatualiza o DEC v1
    const dec2 = await novoDec(id); // o DEC v2 cita a ESP v2 e o RSK v1, em dia
    const antes = await obterDemanda(deps.db, id);
    expect(antes.pacotesDecisao.map((p) => [p.id, p.statusDecisao, p.desatualizado]).sort()).toEqual([
      [dec1.id, 'pendente', true],
      [dec2.id, 'pendente', false],
    ]);

    const r = gravou(await enviar(id, completo(), 2));
    expect(r).toEqual({ id: `RSK-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: dec2.id });
    expect(await chegadaNaT05(r)).toEqual({ tipo: 'sucesso', texto: `${TEXTOS_RSK.sucesso(r.id)} ${TEXTOS_RSK.decDesatualizado(dec2.id)}` });

    // Sem pacote em dia, a v3 não desatualiza nada: só a frase da versão.
    const r3 = gravou(await enviar(id, completo(), 3));
    expect(r3.decDesatualizado).toBeNull();
    expect(await chegadaNaT05(r3)).toEqual({ tipo: 'sucesso', texto: TEXTOS_RSK.sucesso(`RSK-${id}-v3`) });
  });

  it('conflito: a chegada é o alerta de erro "Sua versão foi gravada como v2", com o pacote que ela desatualizou', async () => {
    const id = await novaDemanda();
    await novaEsp(id);
    await novoRsk(id);
    const dec = await novoDec(id);
    const r = gravou(await enviar(id, completo(), 1)); // a tela anunciou a v1, mas a v1 já existia
    expect(r).toEqual({ id: `RSK-${id}-v2`, demandaId: id, conflito: true, decDesatualizado: dec.id });
    expect(await chegadaNaT05(r)).toEqual({ tipo: 'erro', texto: `${TEXTOS_RSK.conflito(2)} ${TEXTOS_RSK.decDesatualizado(dec.id)}` });
  });
});

describe('concorrência, imutabilidade e log (T08)', () => {
  it('dois envios da mesma tela ao mesmo tempo: v1 e v2, e só o que virou v2 diz que houve conflito', async () => {
    const id = await novaDemanda();
    const [r1, r2] = await Promise.all([enviar(id, completo({ resumo: 'Aba 1 (fictício)' }), 1), enviar(id, completo({ resumo: 'Aba 2 (fictício)' }), 1)]);
    const porId = Object.fromEntries([gravou(r1), gravou(r2)].map((x) => [x.id, x.conflito]));
    expect(porId).toEqual({ [`RSK-${id}-v1`]: false, [`RSK-${id}-v2`]: true });
    expect((await listarPareceresRisco(deps.db, id)).map((e) => e.versao)).toEqual([2, 1]);
  });

  it('RF-11: a v2 pelo painel, a partir da v1, não muda a v1; id, versão, autoria, execução e data adulterados na entrada são descartados', async () => {
    const id = await novaDemanda();
    gravou(await enviar(id, completo(), 1));
    const v1 = `RSK-${id}-v1`;
    const linhaAntes = await linhaDoRsk(v1);

    const partida = valoresDoParecer(await obterParecerRisco(deps.db, v1));
    const mudada: ValoresDoParecer = { ...partida, riscoJuridicoNivel: 'alto', preCondicoes: lista('preCondicoes', 'Outra pré-condição (fictício)') };
    const r = await enviar(id, mudada, 2, {
      id: v1,
      versao: 1,
      parecerRiscoId: v1,
      autorTipo: 'agente',
      autorId: 'risco',
      rascunhoAgente: true,
      execucaoAgenteId: '00000000-0000-4000-8000-000000000000',
      criadaEm: '2020-01-01T00:00:00Z',
    });
    expect(r).toEqual({ ok: true, dados: { id: `RSK-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: null } });

    expect(await linhaDoRsk(v1)).toEqual(linhaAntes);
    const v2 = await linhaDoRsk(`RSK-${id}-v2`);
    expect(v2).toMatchObject({ versao: 2, risco_juridico_nivel: 'alto', pre_condicoes: ['Outra pré-condição (fictício)'], autor_tipo: 'pessoa', rascunho_agente: false, execucao_agente_id: null });
    expect((v2!.criada_em as Date).toISOString()).toBe(relogio.agora().toISOString());
    // O painel não tem ação de alterar nem de excluir versão: o módulo da T08 só exporta a gravação.
    expect(Object.keys(acoes)).toEqual(['gravarParecerNoPainel']);
  });

  it('C-21: uma linha de log por envio, sem nada do que foi digitado nem o id da demanda; a resposta também não traz o digitado', async () => {
    const id = await novaDemanda();
    const v = completo({
      resumo: `Resumo ${SENTINELAS.texto}`,
      riscoTecnicoComentario: `Contato ${SENTINELAS.email} ${SENTINELAS.telefone}`,
      preCondicoes: lista('preCondicoes', `Pré-condição ${SENTINELAS.nome}`),
    });
    linhasDoLog.length = 0;
    const ok = await enviar(id, v, 1);
    const recusa = await enviar(id, { ...v, riscoOperacionalNivel: '', envolverJuridicoOuAdministradoraQuando: `${SENTINELAS.texto} ${LONGO}` }, 2);

    expect(ok.ok).toBe(true);
    expect(recusa.ok).toBe(false);
    expect(contemSentinela(JSON.stringify([ok, recusa]))).toBe(false);
    const daAcao = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'acao_painel');
    expect(daAcao.map((l) => [l.rota, l.atorTipo, l.codigoErro])).toEqual([
      ['criar_parecer_risco', 'pessoa', undefined],
      ['criar_parecer_risco', 'pessoa', 'entrada_invalida'],
    ]);
    const tudo = linhasDoLog.join('\n');
    expect(contemSentinela(tudo)).toBe(false);
    expect(tudo).not.toContain(id);
  });
});

describe('rascunho do agente de risco gravado de verdade, na T08 e na T10', () => {
  it('RSK v1 do agente: a T08 avisa e parte dele; a v2 da pessoa não é rascunho; a T10 da v1 tem o selo, o aviso e o link da v2, e a da v2 não', async () => {
    const id = await novaDemanda();
    const esp = await novaEsp(id);
    const marcacao = '<img src=x onerror=alert(1)>';
    const v1 = await novoRsk(id, RISCO, { resumo: 'Resumo do agente (fictício)', riscoJuridicoComentario: `Comentário ${marcacao}`, riscoOperacionalNivel: 'alto' });
    expect(v1).toMatchObject({ versao: 1, rascunhoAgente: true, autor: { tipo: 'agente' } });

    const t08 = await paginaNova(id);
    expect(texto(t08)).toContain(TEXTOS_RSK.infoProxima(`RSK-${id}-v2`, esp.id));
    expect(texto(t08)).toContain(TEXTOS_RSK.infoRascunho(1));
    expect(texto(t08)).toContain('Resumo do agente (fictício)');
    expect([marcado(t08, 'riscoTecnicoNivel'), marcado(t08, 'riscoOperacionalNivel'), marcado(t08, 'riscoJuridicoNivel')]).toEqual(['alto', 'alto', 'baixo']);
    expect(t08).toContain(TEXTOS_RSK.gravar(`RSK-${id}-v2`));
    expect(t08).not.toContain(marcacao);
    expect(t08).toContain('&lt;img src=x onerror=alert(1)&gt;');

    // A pessoa grava a partir do rascunho: a versão nova é dela.
    const partida = valoresDoParecer(await obterParecerRisco(deps.db, v1.id));
    const r = gravou(await enviar(id, { ...partida, riscoJuridicoComentario: 'Revisado pela pessoa (fictício)' }, 2));
    expect(r).toMatchObject({ id: `RSK-${id}-v2`, conflito: false });
    const rv2 = await obterParecerRisco(deps.db, r.id);
    expect(rv2).toMatchObject({ rascunhoAgente: false, autor: { tipo: 'pessoa' }, resumo: 'Resumo do agente (fictício)' });

    const ver1 = await paginaVer(v1.id);
    expect(texto(ver1)).toContain(SELO_RASCUNHO.texto);
    expect(texto(ver1)).toContain(TEXTOS_RSK.rascunhoVer);
    expect(texto(ver1)).toContain(`${TEXTOS_RSK.maisNova}RSK-${id}-v2.`);
    expect(ver1).toContain(`href="/pareceres-risco/RSK-${id}-v2"`);
    expect(texto(ver1)).toContain(TEXTOS_RSK.por(rotuloResponsavel(v1.autor)));
    expect(texto(ver1)).toContain(TEXTOS_RSK.nivelEmTexto('Risco operacional', 'Alto'));
    expect(ver1).not.toContain(marcacao);
    expect(ver1).toContain('&lt;img src=x onerror=alert(1)&gt;');

    const ver2 = await paginaVer(r.id);
    expect(texto(ver2)).not.toContain(SELO_RASCUNHO.texto);
    expect(texto(ver2)).not.toContain(TEXTOS_RSK.rascunhoVer);
    expect(texto(ver2)).not.toContain(TEXTOS_RSK.maisNova);
    expect(texto(ver2)).toContain('Revisado pela pessoa (fictício)');
    expect(texto(ver2)).toContain(TEXTOS_RSK.por(rotuloResponsavel(rv2.autor)));
    expect(rotuloResponsavel(rv2.autor)).not.toBe(rotuloResponsavel(v1.autor));
    expect(ver2).toContain(`href="/demandas/${id}/pareceres-risco/novo?base=${r.id}"`);

    // ?base= da v1 (rascunho) com a v2 existindo: a T08 parte da v1 e avisa do rascunho; sem base, parte da v2 e não avisa.
    const daV1 = await paginaNova(id, { base: v1.id });
    expect(texto(daV1)).toContain(TEXTOS_RSK.infoProxima(`RSK-${id}-v3`, esp.id));
    expect(texto(daV1)).toContain(TEXTOS_RSK.infoRascunho(1));
    expect(texto(daV1)).not.toContain('Revisado pela pessoa (fictício)');
    const daV2 = texto(await paginaNova(id));
    expect(daV2).toContain(TEXTOS_RSK.infoProxima(`RSK-${id}-v3`, esp.id));
    expect(daV2).not.toContain(TEXTOS_RSK.infoRascunho(2));
    expect(daV2).toContain('Revisado pela pessoa (fictício)');
  });

  it('?base= de RSK de outra demanda, que não existe ou de ESP: a T08 parte do RSK mais novo desta, sem nada da outra', async () => {
    const outra = await novaDemanda();
    const rskOutra = await novoRsk(outra, ator, { resumo: 'Resumo da outra demanda (fictício)' });
    const id = await novaDemanda();
    const esp = await novaEsp(id);
    await novoRsk(id, ator, { resumo: 'Resumo desta demanda (fictício)', riscoTecnicoNivel: 'baixo' });

    for (const base of [rskOutra.id, `RSK-${id}-v9`, esp.id, 'qualquer-coisa']) {
      const t08 = await paginaNova(id, { base });
      expect(texto(t08), base).toContain(TEXTOS_RSK.infoProxima(`RSK-${id}-v2`, esp.id));
      expect(texto(t08), base).toContain('Resumo desta demanda (fictício)');
      expect(texto(t08), base).not.toContain('Resumo da outra demanda');
      expect(marcado(t08, 'riscoTecnicoNivel'), base).toBe('baixo');
    }
  });
});
