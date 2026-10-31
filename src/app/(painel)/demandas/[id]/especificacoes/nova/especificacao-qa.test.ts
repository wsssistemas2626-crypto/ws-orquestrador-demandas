// T41 (06-T41-testes, qa-automacao): a T07 Nova versão da ESP e a T10 Ver ESP contra o banco e o Better Auth reais
// (Testcontainers). O acoes.test.ts do engenheiro prova a Server Action caso a caso, e os pagina.test.ts provam o HTML
// com leituras de dublê. O que nenhum dos dois alcança:
//   - a tela e o servidor concordando: para os mesmos valores da tela, a validação do navegador (validarEspecificacao) e a
//     recusa do servidor, levada à tela por errosDaApiEsp, dão o mesmo campo, a mesma linha, o mesmo rótulo e a mesma
//     mensagem;
//   - RF-19, "nas mesmas rotas e com o mesmo schema": a Server Action e POST /api/demandas/:id/especificacoes recusam as
//     mesmas entradas com o mesmo corpo de erro e gravam o mesmo conteúdo;
//   - RF-19 (CA-19.2) e RF-15 (CA-15.1, CA-15.2) pelo painel: com os agentes desligados nada é enfileirado; com o de
//     risco ligado, a ESP do painel sem dúvida o dispara e a com dúvida não; nenhuma mensagem sai;
//   - concorrência: dois envios da mesma tela ao mesmo tempo viram v1 e v2, e só o segundo diz que houve conflito;
//   - RF-11: a versão nova pelo painel não muda a anterior, nem com id e versão adulterados na entrada;
//   - C-21: uma linha de log por envio, sem nada do que foi digitado; a resposta também não traz;
//   - o rascunho de agente gravado de verdade (ator insumo_tecnico) chegando à T07 e à T10 (o Minor do engenheiro: só
//     visto com dublê), com o conteúdo do agente como texto (C-18) e o aviso de versão mais nova calculado pelo banco.
// Relógio fixo dos Deps (RNF-15), um dia por teste por causa do limite por ator (C-36). Só dado fictício.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../../../test/deps';
import { chamarRota } from '../../../../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../../../../test/sentinelas';
import { criarPessoa } from '../../../../../../../test/sessao';
import { POST as postEspecificacao } from '../../../../../api/demandas/[id]/especificacoes/route';
import {
  entradaDaEspecificacao,
  errosDaApiEsp,
  TEXTOS_ESP,
  validarEspecificacao,
  valoresDaEspecificacao,
  type ValoresDaEspecificacao,
} from '../../../../../../components/dados-da-especificacao';
import type { ErroDeCampo } from '../../../../../../components/formulario';
import type { ItemDaLista } from '../../../../../../components/lista-textos';
import { SELO_RASCUNHO } from '../../../../../../components/rotulos';
import { definirDepsParaTeste, type Deps } from '../../../../../../lib/deps';
import { substituirDestinoDoLog } from '../../../../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../../../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../../../../../../modules/acesso/ator';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { criarDemandaSchema, type Tipo } from '../../../../../../modules/demandas/schemas';
import { criarDemanda } from '../../../../../../modules/demandas/servico';
import { listarEspecificacoes, obterEspecificacao } from '../../../../../../modules/especificacoes/consultas';
import { criarEspecificacaoSchema, MENSAGENS_CONSTRUCAO } from '../../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../../modules/especificacoes/servico';
import PaginaEspecificacao from '../../../../especificacoes/[espId]/page';
import { rotuloResponsavel } from '../../detalhe';
import * as acoes from './acoes';
import PaginaNovaEspecificacao from './page';

const { gravarEspecificacaoNoPainel } = acoes;

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

const INSUMO: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) => (await b.poolMigrator.query<T>(texto, valores)).rows;
const execucoes = (id: string) => consultar<{ agente: string; chave_entrada: string; id: string }>('select id, agente, chave_entrada from execucao_agente where demanda_id = $1', [id]);
const jobs = async () => (await consultar<{ nome: string; n: number }>('select name as nome, count(*)::int as n from pgboss.job group by name order by name')).map((l) => `${l.nome}:${l.n}`);
const jobDaExecucao = async (execId: string) =>
  (await consultar<{ n: number }>(`select count(*)::int as n from pgboss.job where name = 'agente.executar' and data->>'execucaoId' = $1`, [execId]))[0]!.n;
const linhaDaEsp = async (espId: string) => (await consultar<Record<string, unknown>>('select * from especificacao_tecnica where id = $1', [espId]))[0];

const lista = (campo: string, ...valores: string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));

// Os valores da tela de uma ESP completa de um tipo construído (melhoria).
const completa = (extra: Partial<ValoresDaEspecificacao> = {}): ValoresDaEspecificacao => ({
  ...valoresDaEspecificacao(null),
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: lista('escopoInclui', 'Conferir o id do pedido (fictício)'),
  sistemaAlvo: 'sistema-ficticio',
  criteriosAceitePreliminares: lista('criteriosAceitePreliminares', 'O mesmo pedido não aparece duas vezes (fictício)'),
  definicaoDePronto: lista('definicaoDePronto', 'Testes verdes (fictício)'),
  ...extra,
});

// O corpo da API de uma ESP completa (o mesmo do e2e).
const CORPO_COMPLETO = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};

async function novaDemanda(tipo: Tipo = 'melhoria', extra: Record<string, unknown> = {}): Promise<string> {
  return (await criarDemanda(deps, ator, criarDemandaSchema.parse({ titulo: 'Demanda da ESP (fictício)', tipo, solicitanteNome: 'Pessoa Ficticia', ...extra }))).id;
}

// Como o FormularioEspecificacao chama a Server Action, sem a validação da tela.
const enviar = (id: string, v: ValoresDaEspecificacao, versaoEsperada: number, tipo: Tipo = 'melhoria', extra: Record<string, unknown> = {}) =>
  gravarEspecificacaoNoPainel({ ...entradaDaEspecificacao(v, tipo).entrada, demandaId: id, versaoEsperada, ...extra });

type Falha = Extract<Awaited<ReturnType<typeof gravarEspecificacaoNoPainel>>, { ok: false }>;
function falhou(r: Awaited<ReturnType<typeof gravarEspecificacaoNoPainel>>): Falha {
  if (r.ok) throw new Error(`esperava falha da Server Action, veio ${JSON.stringify(r)}`);
  return r;
}

const sem = (o: object, chaves: readonly string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !chaves.includes(k)));

const comoNaTela = (erros: readonly ErroDeCampo[]) =>
  erros.map((e) => [e.campo, e.idCampo, e.rotulo, e.mensagem].join(' | ')).sort();

const ENTIDADES: Readonly<Record<string, string>> = { '&quot;': '"', '&#x27;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
const texto = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&quot;|&#x27;|&lt;|&gt;|&amp;/g, (e) => ENTIDADES[e]!);

const paginaNova = async (id: string, busca: Record<string, string> = {}) =>
  renderToStaticMarkup(await PaginaNovaEspecificacao({ params: Promise.resolve({ id }), searchParams: Promise.resolve(busca) }));
const paginaVer = async (espId: string) => renderToStaticMarkup(await PaginaEspecificacao({ params: Promise.resolve({ espId }) }));

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
  // Os agentes nascem desligados (RF-19); só o teste do gatilho liga o de risco.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 0 where id = 1');
});

describe('a tela e o servidor concordam (T07)', () => {
  // Valores que a validação da tela recusa. Enviados sem ela, o servidor recusa os mesmos, e errosDaApiEsp os põe no
  // mesmo lugar: mesmo campo, mesmo id de foco (a linha da tela, contando os itens vazios descartados), mesmo rótulo e
  // mesma mensagem da 03.
  const casos: Array<[string, Partial<ValoresDaEspecificacao>]> = [
    ['descrição só com espaços', { descricaoObjetiva: '   ' }],
    ['sistema alvo com maiúscula e espaço', { sistemaAlvo: 'Com Maiúscula' }],
    ['sistema alvo com 101 caracteres', { sistemaAlvo: 'a'.repeat(101) }],
    ['item longo na 3ª linha de Escopo inclui, depois de uma linha vazia', { escopoInclui: lista('escopoInclui', '', 'Item curto (fictício)', LONGO) }],
    ['51 itens em Escopo exclui', { escopoExclui: lista('escopoExclui', ...Array.from({ length: 51 }, (_, i) => `Fora ${i + 1} (fictício)`)) }],
    ['Situação atual com 10.001 caracteres', { situacaoAtual: LONGO }],
    ['dúvida com 10.001 caracteres, depois de duas linhas vazias', { duvidasEmAberto: lista('duvidasEmAberto', ' ', '', LONGO) }],
    [
      'construção vazia num tipo construído: sem sistema alvo, critérios só com linha vazia e definição sem item',
      { sistemaAlvo: '', criteriosAceitePreliminares: lista('criteriosAceitePreliminares', '  '), definicaoDePronto: [] },
    ],
  ];

  it.each(casos)('%s: o mesmo erro, no mesmo lugar, pela tela e pelo servidor; nada é gravado', async (_, extra) => {
    const id = await novaDemanda();
    const v = completa(extra);
    const daTela = validarEspecificacao(v, 'melhoria');
    expect(daTela.length).toBeGreaterThan(0);

    const { entrada, indices } = entradaDaEspecificacao(v, 'melhoria');
    const f = falhou(await gravarEspecificacaoNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 }));
    expect(f.erro).toBe('entrada_invalida');
    const doServidor = errosDaApiEsp(f, { indices, valores: v });
    expect(doServidor.alerta).toBeNull();
    expect(comoNaTela(doServidor.campos)).toEqual(comoNaTela(daTela));
    expect(await listarEspecificacoes(deps.db, id)).toEqual([]);
  });

  it('CA-08.3 pelo painel: conta fora da lista (seleção adulterada) passa na tela e o servidor recusa, na "Conta do repositório"; sem sistema alvo, só o erro dele', async () => {
    const id = await novaDemanda();
    const v = completa({ contaRepositorio: 'outra-conta' });
    expect(validarEspecificacao(v, 'melhoria')).toEqual([]);
    const { entrada, indices } = entradaDaEspecificacao(v, 'melhoria');
    expect(entrada.repositorioDestino).toBe('outra-conta/sistema-ficticio');
    const f = falhou(await gravarEspecificacaoNoPainel({ ...entrada, demandaId: id, versaoEsperada: 1 }));
    expect(errosDaApiEsp(f, { indices, valores: v }).campos.map((c) => [c.campo, c.rotulo, c.mensagem])).toEqual([
      ['contaRepositorio', 'Repositório destino', MENSAGENS_CONSTRUCAO.contaDoRepositorio],
    ]);

    const semSistema = completa({ contaRepositorio: 'outra-conta', sistemaAlvo: '' });
    const s = entradaDaEspecificacao(semSistema, 'melhoria');
    const f2 = falhou(await gravarEspecificacaoNoPainel({ ...s.entrada, demandaId: id, versaoEsperada: 1 }));
    expect(errosDaApiEsp(f2, { indices: s.indices, valores: semSistema }).campos.map((c) => c.campo)).toEqual(['sistemaAlvo']);
    expect(await listarEspecificacoes(deps.db, id)).toEqual([]);
  });
});

describe('RF-19: o painel usa a mesma regra e o mesmo schema da rota', () => {
  const recusas: Array<[string, Tipo, Record<string, unknown>]> = [
    ['CA-08.5: escopoInclui como texto corrido', 'melhoria', { ...CORPO_COMPLETO, escopoInclui: 'Conferir o id; não duplicar (fictício)' }],
    ['CA-08.3: repositório de outra conta', 'melhoria', { ...CORPO_COMPLETO, sistemaAlvo: 'meu-sistema', repositorioDestino: 'outra-conta/meu-sistema' }],
    ['CA-08.2: novo_projeto sem repositorioDestino', 'novo_projeto', { ...CORPO_COMPLETO, repositorioDestino: undefined }],
    ['repositório que não termina com o sistema alvo', 'melhoria', { ...CORPO_COMPLETO, repositorioDestino: 'fabianojp06/outro-sistema' }],
    ['sem descricaoObjetiva', 'melhoria', { ...CORPO_COMPLETO, descricaoObjetiva: undefined }],
    ['item vazio na lista', 'melhoria', { ...CORPO_COMPLETO, escopoInclui: ['Ok (fictício)', ''] }],
    ['51 critérios', 'melhoria', { ...CORPO_COMPLETO, criteriosAceitePreliminares: Array.from({ length: 51 }, (_, i) => `Critério ${i} (fictício)`) }],
    ['restrição com 10.001 caracteres', 'melhoria', { ...CORPO_COMPLETO, restricoesTecnicas: LONGO }],
    ['sistema alvo fora do formato', 'melhoria', { ...CORPO_COMPLETO, sistemaAlvo: 'Meu Sistema', repositorioDestino: 'wsssistemas2626-crypto/Meu Sistema' }],
  ];

  it.each(recusas)('%s: a rota responde 400 e a Server Action devolve o mesmo erro, a mesma mensagem e os mesmos campos', async (_, tipo, corpo) => {
    const id = await novaDemanda(tipo);
    const resposta = await chamarRota(postEspecificacao, { metodo: 'POST', caminho: `/api/demandas/${id}/especificacoes`, params: { id }, cookie, corpo });
    expect(resposta.status).toBe(400);
    const daRota = (await resposta.json()) as Record<string, unknown>;
    expect(daRota.erro).toBe('entrada_invalida');

    const f = falhou(await gravarEspecificacaoNoPainel({ ...corpo, demandaId: id, versaoEsperada: 1 }));
    expect(sem(f, ['ok'])).toEqual(daRota);
    expect(await listarEspecificacoes(deps.db, id)).toEqual([]);
  });

  it('a mesma entrada válida grava o mesmo conteúdo pela rota e pelo painel, com a autoria da sessão nos dois', async () => {
    const id = await novaDemanda();
    const corpo = { ...CORPO_COMPLETO, situacaoAtual: '  Pedidos chegam duas vezes (fictício).  ', duvidasEmAberto: [] };
    const resposta = await chamarRota(postEspecificacao, { metodo: 'POST', caminho: `/api/demandas/${id}/especificacoes`, params: { id }, cookie, corpo });
    expect(resposta.status).toBe(201);
    const r = await gravarEspecificacaoNoPainel({ ...corpo, demandaId: id, versaoEsperada: 2 });
    expect(r).toEqual({ ok: true, dados: { id: `ESP-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: null } });

    const [v2, v1] = await listarEspecificacoes(deps.db, id);
    expect(sem(v2!, ['id', 'versao', 'criadaEm'])).toEqual(sem(v1!, ['id', 'versao', 'criadaEm']));
    expect(v1!.situacaoAtual).toBe('Pedidos chegam duas vezes (fictício).');
    expect(v1!.autor).toMatchObject({ tipo: 'pessoa' });
    expect(v2!.autor).toEqual(v1!.autor);
    expect(v2!.rascunhoAgente).toBe(false);
  });
});

describe('RF-19 e RF-15 pelo painel: agentes, fila e nenhuma mensagem', () => {
  it('CA-19.2: com os agentes desligados, criar a demanda não enfileira nada, e a pessoa grava a ESP pelo painel, também sem enfileirar', async () => {
    const antes = await jobs();
    const id = await novaDemanda();
    expect(await execucoes(id)).toEqual([]);

    const r = await enviar(id, completa(), 1);
    expect(r).toMatchObject({ ok: true, dados: { id: `ESP-${id}-v1` } });
    expect(await execucoes(id)).toEqual([]);
    expect(await jobs()).toEqual(antes);
  });

  it('agente de risco ligado: a ESP do painel sem dúvida o dispara, com a chave esp:<id> e um job; a com dúvida não dispara nada', async () => {
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', ['risco', 'modelo-ficticio-t41']);
    await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');

    const id = await novaDemanda();
    const r = await enviar(id, completa(), 1);
    expect(r.ok).toBe(true);
    const [exec, ...outras] = await execucoes(id);
    expect(outras).toEqual([]);
    expect(exec).toMatchObject({ agente: 'risco', chave_entrada: `esp:ESP-${id}-v1` });
    expect(await jobDaExecucao(exec!.id)).toBe(1);

    const comDuvida = await novaDemanda();
    const antes = await jobs();
    const r2 = await enviar(comDuvida, completa({ duvidasEmAberto: lista('duvidasEmAberto', 'Qual o volume diário? (fictício)') }), 1);
    expect(r2.ok).toBe(true);
    expect(await execucoes(comDuvida)).toEqual([]);
    expect(await jobs()).toEqual(antes);
  });

  it('CA-15.1 e CA-15.2 pelo painel: com dúvida, a demanda vai a Aguardando informação pelo ator sistema; nenhum job (nem de aviso) entra na fila', async () => {
    const id = await novaDemanda('melhoria', { solicitanteNome: SENTINELAS.nome });
    await b.poolMigrator.query(`update demanda set status = 'em_analise' where id = $1`, [id]);
    const antes = await jobs();

    const r = await enviar(id, completa({ duvidasEmAberto: lista('duvidasEmAberto', '', 'Qual o volume diário? (fictício)') }), 1);
    expect(r.ok).toBe(true);
    const d = await obterDemanda(deps.db, id);
    expect(d.status).toBe('aguardando_informacao');
    const [esp] = await listarEspecificacoes(deps.db, id);
    expect(esp!.duvidasEmAberto).toEqual(['Qual o volume diário? (fictício)']);

    const eventos = await consultar<{ acao: string; ator_tipo: string; depois: unknown }>(
      `select acao, ator_tipo, depois from evento where demanda_id = $1 and acao = 'status_alterado' order by ocorrido_em, id`,
      [id],
    );
    expect(eventos.at(-1)).toMatchObject({ ator_tipo: 'sistema', depois: { status: 'aguardando_informacao' } });
    expect(await jobs()).toEqual(antes);
    expect(await execucoes(id)).toEqual([]);
  });
});

describe('concorrência, imutabilidade e log (T07)', () => {
  it('dois envios da mesma tela ao mesmo tempo: v1 e v2, e só o que virou v2 diz que houve conflito', async () => {
    const id = await novaDemanda();
    const [r1, r2] = await Promise.all([
      enviar(id, completa({ situacaoAtual: 'Aba 1 (fictício)' }), 1),
      enviar(id, completa({ situacaoAtual: 'Aba 2 (fictício)' }), 1),
    ]);
    const dados = [r1, r2].map((r) => {
      if (!r.ok) throw new Error(`envio falhou: ${JSON.stringify(r)}`);
      return r.dados;
    });
    const porId = Object.fromEntries(dados.map((x) => [x.id, x.conflito]));
    expect(porId).toEqual({ [`ESP-${id}-v1`]: false, [`ESP-${id}-v2`]: true });
    expect((await listarEspecificacoes(deps.db, id)).map((e) => e.versao)).toEqual([2, 1]);
  });

  it('RF-11: a v2 pelo painel, a partir da v1, não muda a v1; id, versão e autoria adulterados na entrada são descartados', async () => {
    const id = await novaDemanda();
    expect(await enviar(id, completa(), 1)).toMatchObject({ ok: true });
    const v1 = `ESP-${id}-v1`;
    const linhaAntes = await linhaDaEsp(v1);

    const partida = valoresDaEspecificacao(await obterEspecificacao(deps.db, v1));
    const mudada = { ...partida, descricaoObjetiva: 'Descrição mudada (fictício)', escopoInclui: lista('escopoInclui', 'Outro escopo (fictício)') };
    const r = await enviar(id, mudada, 2, 'melhoria', { id: v1, versao: 1, especificacaoId: v1, autorTipo: 'agente', autorId: 'insumo_tecnico', criadaEm: '2020-01-01T00:00:00Z' });
    expect(r).toEqual({ ok: true, dados: { id: `ESP-${id}-v2`, demandaId: id, conflito: false, decDesatualizado: null } });

    expect(await linhaDaEsp(v1)).toEqual(linhaAntes);
    const v2 = await obterEspecificacao(deps.db, `ESP-${id}-v2`);
    expect(v2).toMatchObject({ versao: 2, descricaoObjetiva: 'Descrição mudada (fictício)', rascunhoAgente: false, autor: { tipo: 'pessoa' } });
    expect(v2.criadaEm.toISOString()).toBe(relogio.agora().toISOString());
    // O painel não tem ação de alterar nem de excluir versão: o módulo da T07 só exporta a gravação.
    expect(Object.keys(acoes)).toEqual(['gravarEspecificacaoNoPainel']);
  });

  it('C-21: uma linha de log por envio, sem nada do que foi digitado nem o id da demanda; a resposta também não traz o digitado', async () => {
    const id = await novaDemanda();
    const v = completa({
      descricaoObjetiva: `Descrição ${SENTINELAS.texto}`,
      situacaoAtual: `Contato ${SENTINELAS.email} ${SENTINELAS.telefone}`,
      escopoInclui: lista('escopoInclui', `Escopo ${SENTINELAS.nome}`),
    });
    linhasDoLog.length = 0;
    const ok = await enviar(id, v, 1);
    const recusa = await enviar(id, { ...v, situacaoDesejada: `${SENTINELAS.texto} ${LONGO}` }, 2);

    expect(ok.ok).toBe(true);
    expect(recusa.ok).toBe(false);
    expect(contemSentinela(JSON.stringify([ok, recusa]))).toBe(false);
    const daAcao = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'acao_painel');
    expect(daAcao.map((l) => [l.rota, l.atorTipo, l.codigoErro])).toEqual([
      ['criar_especificacao', 'pessoa', undefined],
      ['criar_especificacao', 'pessoa', 'entrada_invalida'],
    ]);
    const tudo = linhasDoLog.join('\n');
    expect(contemSentinela(tudo)).toBe(false);
    expect(tudo).not.toContain(id);
  });
});

describe('rascunho de agente gravado de verdade, na T07 e na T10', () => {
  it('ESP v1 do agente de insumo técnico: a T07 avisa e parte dela; a v2 da pessoa não é rascunho; a T10 da v1 tem o selo, o aviso e o link da v2, e a da v2 não', async () => {
    const id = await novaDemanda();
    const marcacao = '<img src=x onerror=alert(1)>';
    const v1 = await criarEspecificacao(
      deps,
      INSUMO,
      id,
      criarEspecificacaoSchema.parse({ ...CORPO_COMPLETO, descricaoObjetiva: 'Descrição do agente (fictício)', situacaoAtual: `Situação ${marcacao}` }),
    );
    expect(v1).toMatchObject({ versao: 1, rascunhoAgente: true, autor: { tipo: 'agente' } });

    const t07 = await paginaNova(id);
    expect(texto(t07)).toContain(TEXTOS_ESP.infoProxima(`ESP-${id}-v2`, 1));
    expect(texto(t07)).toContain(TEXTOS_ESP.infoRascunho(1));
    expect(texto(t07)).toContain('Descrição do agente (fictício)');
    expect(t07).not.toContain(marcacao);
    expect(t07).toContain('&lt;img src=x onerror=alert(1)&gt;');

    // A pessoa grava a partir do rascunho: a versão nova é dela.
    const partida = valoresDaEspecificacao(await obterEspecificacao(deps.db, v1.id));
    const r = await enviar(id, { ...partida, situacaoAtual: 'Revisada pela pessoa (fictício)' }, 2);
    expect(r).toMatchObject({ ok: true, dados: { id: `ESP-${id}-v2`, conflito: false } });
    expect(await obterEspecificacao(deps.db, `ESP-${id}-v2`)).toMatchObject({ rascunhoAgente: false, autor: { tipo: 'pessoa' } });

    const ver1 = await paginaVer(v1.id);
    expect(texto(ver1)).toContain(SELO_RASCUNHO.texto);
    expect(texto(ver1)).toContain(TEXTOS_ESP.rascunhoVer);
    expect(texto(ver1)).toContain(`${TEXTOS_ESP.maisNova}ESP-${id}-v2.`);
    expect(ver1).toContain(`href="/especificacoes/ESP-${id}-v2"`);
    expect(texto(ver1)).toContain(TEXTOS_ESP.por(rotuloResponsavel(v1.autor)));
    expect(ver1).not.toContain(marcacao);
    expect(ver1).toContain('&lt;img src=x onerror=alert(1)&gt;');

    const ver2 = await paginaVer(`ESP-${id}-v2`);
    expect(texto(ver2)).not.toContain(SELO_RASCUNHO.texto);
    expect(texto(ver2)).not.toContain(TEXTOS_ESP.rascunhoVer);
    expect(texto(ver2)).not.toContain(TEXTOS_ESP.maisNova);
    expect(texto(ver2)).toContain('Revisada pela pessoa (fictício)');
    expect(ver2).toContain(`href="/demandas/${id}/especificacoes/nova?base=ESP-${id}-v2"`);

    // ?base= da v1 (rascunho) com a v2 existindo: a T07 parte da v1 e avisa do rascunho; sem base, parte da v2 e não avisa.
    const daV1 = texto(await paginaNova(id, { base: v1.id }));
    expect(daV1).toContain(TEXTOS_ESP.infoProxima(`ESP-${id}-v3`, 1));
    expect(daV1).toContain(TEXTOS_ESP.infoRascunho(1));
    const daV2 = texto(await paginaNova(id));
    expect(daV2).toContain(TEXTOS_ESP.infoProxima(`ESP-${id}-v3`, 2));
    expect(daV2).not.toContain(TEXTOS_ESP.infoRascunho(2));
    expect(daV2).toContain('Revisada pela pessoa (fictício)');
  });
});
