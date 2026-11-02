// T40 (06-T40-testes, qa-automacao): a T05 Detalhe da demanda contra o banco e o Better Auth reais (Testcontainers). O
// detalhe.test.ts do engenheiro prova a regra da tela com eventos e vistas montados à mão, e o e2e passa pelo navegador.
// O que nenhum dos dois alcança:
//   - a Server Action "Mudar status" chamada direto, sem a tela: cada recusa do RF-07 (final, fora da tabela, sem pacote,
//     Estudo), a entrada adulterada, a sessão e a autoria do evento, e o texto que a tela mostra para cada recusa;
//   - a tela e o servidor concordando: a opção que opcoesDeStatus marca indisponível é a que alterarDemanda recusa;
//   - o contrato com o worker: o evento falha_agente gravado pela execução real (T27) e a execução pendente acendem os
//     alertas certos, e o artefato feito à mão apaga o de falha;
//   - o contrato com o expurgo real (T31): depois dele, o texto e a origem somem da página, e o histórico mostra o evento;
//   - o histórico com os eventos reais da T06 (C-30): enumeração com antes e depois, texto livre vazio e sem o valor.
// Relógio fixo dos Deps (RNF-15), um dia por teste por causa do limite por hora (C-36). Só dado fictício.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../../test/banco';
import { criarDepsDeTeste } from '../../../../../test/deps';
import { ProvedorFalso } from '../../../../../test/provedor-falso';
import { SENTINELAS, contemSentinela } from '../../../../../test/sentinelas';
import { criarPessoa } from '../../../../../test/sessao';
import { errosDoResultado } from '../../../../components/formulario';
import { comTransacao } from '../../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../../lib/deps';
import { substituirDestinoDoLog } from '../../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../../lib/relogio';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { criarExecucao } from '../../../../modules/agentes/execucoes';
import { executarAgente } from '../../../../modules/agentes/executar';
import { obterDemanda } from '../../../../modules/demandas/consultas';
import { entradaSchema, registrarEntrada } from '../../../../modules/demandas/entrada';
import { criarDemandaSchema, STATUS, type Status } from '../../../../modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../../../../modules/demandas/servico';
import { transicoesManuaisDe } from '../../../../modules/demandas/transicoes';
import { criarEspecificacaoSchema } from '../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../modules/pareceres-risco/servico';
import { expurgar } from '../../../../modules/retencao/expurgar';
import { mudarStatusNoPainel } from './acoes';
import { opcoesDeStatus, TEXTOS_DETALHE } from './detalhe';
import PaginaDemanda from './page';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
// notFound, redirect e unstable_rethrow são os reais; só o roteador do cliente (MudarStatus) não existe fora do Next.
vi.mock('next/navigation', async (original) => ({
  ...(await original<typeof import('next/navigation')>()),
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
  usePathname: () => '/demandas',
}));
vi.mock('../../../../lib/sentry', async (original) => ({ ...(await original<typeof import('../../../../lib/sentry')>()), capturarErro: () => undefined }));

const DIA_MS = 86_400_000;
const BASE = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio-t40';

// Os mesmos corpos válidos do e2e: melhoria pede os quatro campos de construção na ESP (CA-08.2).
const ESP = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const RSK = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const DEC = { resumoExecutivo: 'Resumo fictício.', opcaoA: { descricao: 'Opção A fictícia' }, opcaoB: { descricao: 'Opção B fictícia' }, nivelAprovacaoRequerido: 'cto' };
const FORA_DO_SCHEMA = JSON.stringify({ resumo: SENTINELAS.texto, riscoTecnicoNivel: 'altissimo' });

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let cookieAdm: string;
let cto: AtorPessoa;
let usuarioAdm: string;
let dia = 0;
const linhasDoLog: string[] = [];

const com = (cookie: string | null) => {
  pedido.cabecalhos = cookie ? new Headers({ cookie }) : new Headers();
};

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) => (await b.poolMigrator.query<T>(texto, valores)).rows;
const statusDa = async (id: string) => (await consultar<{ status: Status }>('select status from demanda where id = $1', [id]))[0]!.status;
const eventos = (id: string) =>
  consultar<{ acao: string; ator_tipo: string; ator_id: string; antes: unknown; depois: unknown }>(
    'select acao, ator_tipo, ator_id, antes, depois from evento where demanda_id = $1 order by ocorrido_em, id',
    [id],
  );
// Estado de partida posto pelo migrator: o que se testa é a regra de alterarDemanda a partir dele, não o caminho até ele.
const porNoBanco = (id: string, status: Status, tipo?: string) =>
  b.poolMigrator.query(`update demanda set status = $2${tipo ? ', tipo = $3' : ''} where id = $1`, tipo ? [id, status, tipo] : [id, status]);

async function novaDemanda(extra: Record<string, unknown> = {}): Promise<string> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Demanda do detalhe (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia', ...extra }));
  return d.id;
}
const esp = (id: string, extra: Record<string, unknown> = {}) => criarEspecificacao(deps, cto, id, criarEspecificacaoSchema.parse({ ...ESP, ...extra }));
const rsk = (id: string) => criarParecerRisco(deps, cto, id, criarParecerRiscoSchema.parse(RSK));
const dec = (id: string) => criarPacoteDecisao(deps, cto, id, criarPacoteDecisaoSchema.parse(DEC));

const pagina = async (id: string) => renderToStaticMarkup(await PaginaDemanda({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }));

const ENTIDADES: Readonly<Record<string, string>> = { '&quot;': '"', '&#x27;': "'", '&lt;': '<', '&gt;': '>', '&amp;': '&' };
const texto = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&quot;|&#x27;|&lt;|&gt;|&amp;/g, (e) => ENTIDADES[e]!);

// As linhas da tabela do histórico, célula a célula, como texto.
function linhasDoHistorico(p: string): string[][] {
  const i = p.indexOf(TEXTOS_DETALHE.historico.legenda);
  if (i < 0) throw new Error('a página não tem a tabela do histórico');
  const tabela = p.slice(i, p.indexOf('</table>', i));
  return [...tabela.matchAll(/<tr class="border-t border-borda">([\s\S]*?)<\/tr>/g)].map((l) => [...l[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => texto(c[1]!)));
}

// Alerta de topo pelo tipo (a classe do Alerta da 2.3) e pelo texto.
const ALERTA = { erro: 'border-perigo bg-red-50', informacao: 'border-primaria bg-blue-50', atencao: 'border-atencao-texto bg-atencao-fundo' } as const;
const temAlerta = (p: string, tipo: keyof typeof ALERTA, frase: string) =>
  [...p.matchAll(new RegExp(`<div class="rounded-campo border-l-4 px-4 py-3 ${ALERTA[tipo]}[^"]*">([\\s\\S]*?)</div>`, 'g'))].some((m) => texto(m[1]!).includes(frase));
const contar = (p: string, trecho: string) => p.split(trecho).length - 1;

type Falha = Extract<Awaited<ReturnType<typeof mudarStatusNoPainel>>, { ok: false }>;
function falhou(r: Awaited<ReturnType<typeof mudarStatusNoPainel>>): Falha {
  if (r.ok) throw new Error(`esperava falha da Server Action, veio ${JSON.stringify(r)}`);
  return r;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  relogio = relogioFixo(BASE);
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const pCto = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = pCto.cookie;
  cto = { tipo: 'pessoa', usuarioId: pCto.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  const pAdm = await criarPessoa(deps, { papel: 'administradora' });
  cookieAdm = pAdm.cookie;
  usuarioAdm = pAdm.usuarioId;
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-01-01T03:00:00Z',
  ]);
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
  com(cookieCto);
  // Os agentes nascem desligados (RF-19); só o teste do worker liga o de risco.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 0 where id = 1');
});

describe('mudarStatusNoPainel (Server Action da T05) com o banco real', () => {
  it('CA-07.3: Em construção → Entregue; a resposta só tem { id, status }; o evento leva a pessoa, o antes e o depois', async () => {
    const id = await novaDemanda();
    await porNoBanco(id, 'em_construcao');
    const antes = (await eventos(id)).length;

    const r = await mudarStatusNoPainel({ id, status: 'entregue' });

    expect(r).toEqual({ ok: true, dados: { id, status: 'entregue' } });
    expect(await statusDa(id)).toBe('entregue');
    const novos = (await eventos(id)).slice(antes);
    expect(novos).toEqual([{ acao: 'status_alterado', ator_tipo: 'pessoa', ator_id: cto.usuarioId, antes: { status: 'em_construcao' }, depois: { status: 'entregue' } }]);
    // A tela anuncia com o rótulo do status que o servidor devolveu.
    expect(TEXTOS_DETALHE.statusAlterado('Entregue')).toBe('Status alterado para Entregue.');
  });

  it.each(['entregue', 'encerrada'] as const)('CA-07.5: a partir de %s, nenhum dos nove status passa; a tela mostra "Não foi possível concluir: … é um status final."; nada muda', async (final) => {
    const id = await novaDemanda();
    await porNoBanco(id, final);
    const antes = (await eventos(id)).length;
    const rotulo = final === 'entregue' ? 'Entregue' : 'Encerrada';
    expect(transicoesManuaisDe(final)).toEqual([]);

    for (const s of STATUS.filter((x) => x !== final)) {
      const f = falhou(await mudarStatusNoPainel({ id, status: s }));
      expect(f).toMatchObject({ erro: 'conflito', mensagem: `${rotulo} é um status final. Não há próxima mudança.` });
      expect(errosDoResultado(f).alerta).toBe(`Não foi possível concluir: ${rotulo} é um status final. Não há próxima mudança.`);
    }
    expect(await statusDa(id)).toBe(final);
    expect(await eventos(id)).toHaveLength(antes);
  });

  it('CA-07.1: Pronta para decisão com o DEC pendente → Aprovada é recusada; a tela já marcava a opção indisponível, com o mesmo motivo', async () => {
    const id = await novaDemanda();
    await esp(id);
    await rsk(id);
    await dec(id);
    expect(await statusDa(id)).toBe('pronta_para_decisao');
    const antes = (await eventos(id)).length;

    const opcoes = opcoesDeStatus(await obterDemanda(deps.db, id), transicoesManuaisDe('pronta_para_decisao'));
    expect(opcoes.find((o) => o.valor === 'aprovada')).toEqual({
      valor: 'aprovada',
      rotulo: 'Aprovada',
      desabilitada: true,
      dica: 'Aprovada: precisa de um pacote de decisão aprovado e atualizado.',
    });

    // A opção indisponível é só dica: o envio direto passa pelo servidor, que recusa.
    const f = falhou(await mudarStatusNoPainel({ id, status: 'aprovada' }));
    expect(f).toMatchObject({ erro: 'conflito', mensagem: 'a demanda não tem pacote de decisão aprovado e atualizado.' });
    expect(errosDoResultado(f).alerta).toBe('Não foi possível concluir: a demanda não tem pacote de decisão aprovado e atualizado.');
    expect(await statusDa(id)).toBe('pronta_para_decisao');
    expect(await eventos(id)).toHaveLength(antes);
  });

  it('CA-07.2: Estudo em Aprovada → Em construção é recusada, e a tela marca a mesma opção; Encerrada continua possível', async () => {
    const id = await novaDemanda({ tipo: 'estudo' });
    await porNoBanco(id, 'aprovada');

    const opcoes = opcoesDeStatus(await obterDemanda(deps.db, id), transicoesManuaisDe('aprovada'));
    expect(opcoes).toEqual([
      { valor: 'em_construcao', rotulo: 'Em construção', desabilitada: true, dica: 'Em construção: demanda do tipo Estudo não vai para construção.' },
      { valor: 'encerrada', rotulo: 'Encerrada' },
    ]);
    const f = falhou(await mudarStatusNoPainel({ id, status: 'em_construcao' }));
    expect(errosDoResultado(f).alerta).toBe('Não foi possível concluir: demanda do tipo Estudo não vai para construção.');
    expect(await statusDa(id)).toBe('aprovada');

    expect(await mudarStatusNoPainel({ id, status: 'encerrada' })).toEqual({ ok: true, dados: { id, status: 'encerrada' } });
  });

  it('fora da tabela do RF-07 (Nova → Entregue, que a tela não oferece): recusada pelo servidor; o mesmo status: "Nada foi alterado."', async () => {
    const id = await novaDemanda();
    expect(opcoesDeStatus(await obterDemanda(deps.db, id), transicoesManuaisDe('nova')).map((o) => o.valor)).toEqual(['em_analise', 'encerrada']);
    const antes = (await eventos(id)).length;

    for (const s of ['entregue', 'aprovada', 'em_construcao', 'devolvida', 'pronta_para_decisao', 'aguardando_informacao'] as const) {
      const f = falhou(await mudarStatusNoPainel({ id, status: s }));
      expect(f).toMatchObject({ erro: 'conflito', mensagem: 'esta mudança de status não é permitida a partir do status atual.' });
    }
    const igual = falhou(await mudarStatusNoPainel({ id, status: 'nova' }));
    expect(igual).toMatchObject({ erro: 'entrada_invalida', mensagem: 'Nada foi alterado.' });
    expect(errosDoResultado(igual).alerta).toBe('Nada foi alterado.');
    expect(await statusDa(id)).toBe('nova');
    expect(await eventos(id)).toHaveLength(antes);
  });

  it('entrada adulterada: id fora do formato e status fora da enumeração são recusados; chave a mais (título, autoria) é descartada', async () => {
    const id = await novaDemanda({ titulo: 'Título original (fictício)' });
    const antes = (await eventos(id)).length;

    for (const ruim of ["DEM-1' or '1'='1", 'DEM-20261022-00421', '', 'dem-20261022-0001']) {
      const f = falhou(await mudarStatusNoPainel({ id: ruim, status: 'em_analise' }));
      expect(f.erro).toBe('entrada_invalida');
      expect(f.campos?.map((c) => c.campo)).toEqual(['id']);
    }
    for (const s of ['aprovadissima', 'NOVA', null, 3]) {
      const f = falhou(await mudarStatusNoPainel({ id, status: s }));
      expect(f.erro).toBe('entrada_invalida');
      expect(f.campos?.map((c) => c.campo)).toEqual(['status']);
    }
    expect(falhou(await mudarStatusNoPainel({ id })).erro).toBe('entrada_invalida');
    expect(await eventos(id)).toHaveLength(antes);

    const r = await mudarStatusNoPainel({ id, status: 'em_analise', titulo: `Outro ${SENTINELAS.texto}`, autorId: 'outra-pessoa', autorTipo: 'agente' });
    expect(r).toEqual({ ok: true, dados: { id, status: 'em_analise' } });
    const d = await obterDemanda(deps.db, id);
    expect(d.titulo).toBe('Título original (fictício)');
    expect(d.responsavel).toEqual({ tipo: 'pessoa', nome: 'Pessoa Ficticia' });
    expect((await eventos(id)).slice(antes).map((e) => e.acao)).toEqual(['status_alterado']);
  });

  it('sem sessão: nao_autenticado e nada muda; a administradora também muda o status (alterar_demanda é de qualquer pessoa), com o evento dela', async () => {
    const id = await novaDemanda();
    com(null);
    expect(falhou(await mudarStatusNoPainel({ id, status: 'em_analise' })).erro).toBe('nao_autenticado');
    expect(await statusDa(id)).toBe('nova');

    com(cookieAdm);
    expect(await mudarStatusNoPainel({ id, status: 'em_analise' })).toEqual({ ok: true, dados: { id, status: 'em_analise' } });
    const ultimo = (await eventos(id)).at(-1)!;
    expect(ultimo).toMatchObject({ acao: 'status_alterado', ator_tipo: 'pessoa', ator_id: usuarioAdm });
  });

  it('C-21: uma linha de log por chamada, sem o título, o solicitante nem o id da demanda', async () => {
    const id = await novaDemanda({ titulo: `Título ${SENTINELAS.texto}`, solicitanteNome: SENTINELAS.nome });
    linhasDoLog.length = 0;
    await mudarStatusNoPainel({ id, status: 'em_analise' });
    await mudarStatusNoPainel({ id, status: 'entregue' });
    const daAcao = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'acao_painel');
    expect(daAcao.map((l) => [l.rota, l.atorTipo, l.codigoErro])).toEqual([
      ['alterar_demanda', 'pessoa', undefined],
      ['alterar_demanda', 'pessoa', 'conflito'],
    ]);
    const tudo = linhasDoLog.join('\n');
    expect(contemSentinela(tudo)).toBe(false);
    expect(tudo).not.toContain(id);
  });
});

describe('page.tsx com o banco real: o que o worker, o expurgo e a T06 gravam chega à tela', () => {
  it('RF-16: execução pendente → "agente trabalhando"; 3 tentativas fora do schema (falha_agente real) → alerta de erro com o botão; RSK feito à mão → o alerta some', async () => {
    const id = await novaDemanda();
    // A ESP nasce com o agente de risco desligado; a execução dele é criada aqui, como o gatilho faria (T28).
    const e = await esp(id);
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', ['risco', MODELO]);
    await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
    const provedor = new ProvedorFalso();
    const resposta = { texto: FORA_DO_SCHEMA, modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 };
    provedor.respostas.push(resposta, resposta, resposta);
    const execId = (await comTransacao(b.poolApp, (t) => criarExecucao(t, deps, { agente: 'risco', chaveEntrada: `esp:${e.id}`, demandaId: id })))!;

    const FRASE_TRABALHANDO = 'O agente de risco está preparando o parecer de risco. Esta página não se atualiza sozinha: recarregue em alguns minutos.';
    const FRASE_FALHA = 'O agente de risco não conseguiu gerar o parecer de risco depois de 3 tentativas. Preencha o parecer à mão.';
    const BOTAO_RSK = `href="/demandas/${id}/pareceres-risco/novo"`;

    let p = await pagina(id);
    expect(temAlerta(p, 'informacao', FRASE_TRABALHANDO)).toBe(true);
    expect(texto(p)).not.toContain(FRASE_FALHA);

    const comProvedor = { ...deps, provedor };
    expect(await executarAgente(comProvedor, execId)).toBe('reagendada');
    // Entre uma tentativa e outra a execução volta a pendente: o aviso continua, sem falha.
    p = await pagina(id);
    expect(texto(p)).toContain(FRASE_TRABALHANDO);
    expect(texto(p)).not.toContain(FRASE_FALHA);
    relogio.avancar(30_000);
    expect(await executarAgente(comProvedor, execId)).toBe('reagendada');
    relogio.avancar(120_000);
    expect(await executarAgente(comProvedor, execId)).toBe('falhou');

    p = await pagina(id);
    expect(temAlerta(p, 'erro', FRASE_FALHA)).toBe(true);
    expect(texto(p)).not.toContain(FRASE_TRABALHANDO);
    // O botão do alerta e o da lista de pareceres: dois links para o formulário do RSK.
    expect(contar(p, BOTAO_RSK)).toBe(2);
    const [falha] = linhasDoHistorico(p);
    expect(falha!.slice(1)).toEqual(['Agente de risco', 'O agente de risco não conseguiu gerar o parecer depois de 3 tentativas', '', '']);
    // Nada da resposta do provedor chega à tela (C-30).
    expect(contemSentinela(p)).toBe(false);

    relogio.avancar(60_000);
    await rsk(id);
    p = await pagina(id);
    expect(texto(p)).not.toContain(FRASE_FALHA);
    expect(contar(p, BOTAO_RSK)).toBe(1);
    expect(linhasDoHistorico(p)[0]!.slice(1, 3)).toEqual(['Pessoa Ficticia (CTO)', `Criou RSK-${id}-v1`]);
  });

  it('RF-24: com 89 dias o texto continua; com 91, o expurgo real apaga texto e origem da página, e o histórico mostra o evento do Sistema', async () => {
    // A entrada é de julho, para o expurgo de setembro não apagar a sessão do teste (ela vence pela hora real + 8 h, e o
    // expurgo apaga sessão vencida há mais de 30 dias pelo relógio dos Deps).
    relogio.definir('2026-07-01T15:00:00Z');
    const r = await registrarEntrada(
      deps,
      cto,
      entradaSchema.parse({
        modo: 'manual',
        texto: `Bom dia,\n${SENTINELAS.texto} <b>fictício</b>`,
        origem: { canal: 'email', referencia: 'REF-FICTICIA-T40-QA' },
        titulo: 'Demanda com texto (fictício)',
        tipo: 'bug',
        solicitanteNome: 'Pessoa Ficticia',
      }),
    );
    if (r.tipo !== 'demanda') throw new Error('esperava a demanda criada no modo manual');
    const id = r.demanda.id;
    const retencao = deps.config.retencaoDias;
    expect(retencao).toBe(90);

    let p = await pagina(id);
    expect(p).toContain(`${SENTINELAS.texto} &lt;b&gt;fictício&lt;/b&gt;`);
    expect(p).toContain('REF-FICTICIA-T40-QA');
    expect(texto(p)).toContain('Será apagado em 29/09/2026.');

    relogio.definir('2026-09-28T15:00:00Z');
    await expurgar(deps, retencao);
    p = await pagina(id);
    expect(p).toContain(SENTINELAS.texto);
    expect(p).toContain('<details');

    relogio.definir('2026-09-30T15:00:00Z');
    await expurgar(deps, retencao);
    p = await pagina(id);
    expect(texto(p)).toContain('O texto recebido foi apagado em 30/09/2026, pela regra de retenção de 90 dias. Os dados da demanda continuam.');
    expect(p).not.toContain('<details');
    expect(p).not.toContain(SENTINELAS.texto);
    expect(p).not.toContain('REF-FICTICIA-T40-QA');
    expect(texto(p)).toContain('Demanda com texto (fictício)');
    const [expurgo] = linhasDoHistorico(p);
    expect(expurgo).toEqual(['30/09/2026 às 12:00', 'Sistema', 'Apagou o texto recebido (retenção de 90 dias)', '', '']);
  });

  it('RF-21 e C-30 com os eventos reais da T06: enumeração com "Antes" e "Depois"; texto livre com as duas células vazias e sem o valor antigo na página', async () => {
    const tituloAntigo = `Título antigo ${SENTINELAS.texto}`;
    const id = await novaDemanda({ titulo: tituloAntigo, urgencia: 'baixa', contexto: `Contexto ${SENTINELAS.email}` });
    relogio.avancar(60_000);
    await alterarDemanda(deps, cto, id, { titulo: 'Título novo (fictício)', urgencia: 'alta', linhaServicoProvavel: 'sob_medida', contexto: 'Contexto novo (fictício)' });

    const p = await pagina(id);
    const linhas = linhasDoHistorico(p).map((l) => l.slice(1));
    expect(linhas).toEqual(
      expect.arrayContaining([
        ['Pessoa Ficticia (CTO)', 'Alterou "Título"', '', ''],
        ['Pessoa Ficticia (CTO)', 'Alterou "Urgência"', 'Baixa', 'Alta'],
        ['Pessoa Ficticia (CTO)', 'Alterou "Linha de serviço provável"', 'Não informado', 'Sistema sob medida'],
        ['Pessoa Ficticia (CTO)', 'Alterou "Contexto"', '', ''],
        ['Pessoa Ficticia (CTO)', 'Criou a demanda', '', ''],
      ]),
    );
    expect(linhas).toHaveLength(5);
    // O valor antigo do texto livre não fica em lugar nenhum da página.
    expect(contemSentinela(p)).toBe(false);
    expect(p).toContain('<h1>Título novo (fictício)</h1>');
  });

  it('CA-15.3 e RF-15: ESP v1 com dúvidas leva a "Aguardando informação" e lista as dúvidas; ESP v2 sem dúvida tira a seção, o link do alerta e o item da navegação', async () => {
    const id = await novaDemanda();
    await esp(id, { duvidasEmAberto: ['Qual o volume <b>diário</b>? (fictício)', 'Há ambiente de teste? (fictício)'] });
    expect(await statusDa(id)).toBe('aguardando_informacao');

    let p = await pagina(id);
    expect(p).toMatch(/<h2 id="duvidas-em-aberto" tabindex="-1"[^>]*>Dúvidas em aberto<\/h2>/i);
    expect(p).toContain(`Da ESP-${id}-v1.`);
    expect(p).toMatch(/<ol[^>]*><li>Qual o volume &lt;b&gt;diário&lt;\/b&gt;\? \(fictício\)<\/li><li>Há ambiente de teste\? \(fictício\)<\/li><\/ol>/);
    expect(contar(p, 'href="#duvidas-em-aberto"')).toBe(2);
    expect(temAlerta(p, 'atencao', 'Esta demanda está aguardando informação. Veja as dúvidas em aberto.')).toBe(true);
    // O sistema mudou o status (CA-15.1): a linha do histórico mostra o Sistema, o antes e o depois.
    expect(linhasDoHistorico(p).map((l) => l.slice(1))).toContainEqual(['Sistema', 'Mudou o status', 'Nova', 'Aguardando informação']);

    relogio.avancar(60_000);
    await esp(id, { duvidasEmAberto: [] });
    p = await pagina(id);
    expect(await statusDa(id)).toBe('aguardando_informacao');
    expect(p).not.toContain('id="duvidas-em-aberto"');
    expect(p).not.toContain('href="#duvidas-em-aberto"');
    expect(texto(p)).toContain('Esta demanda está aguardando informação.');
    expect(texto(p)).not.toContain('Veja as dúvidas em aberto.');
    expect(texto(p)).not.toContain('Qual o volume');
  });
});

// O HTML do servidor da parte "Mudar status" é o do detalhe.test.ts; aqui só a ligação dela à página com o banco real.
describe('page.tsx: "Mudar status" com as opções lidas do banco', () => {
  it('Em construção: o grupo com Entregue e Devolvida pela construção, e o botão; Entregue: só o texto do status final', async () => {
    const id = await novaDemanda();
    await porNoBanco(id, 'em_construcao');
    let p = await pagina(id);
    expect([...p.matchAll(/<input type="radio" id="campo-novoStatus-([a-z_]+)"/g)].map((m) => m[1])).toEqual(['entregue', 'devolvida']);
    expect(p).toContain('Status atual: Em construção');

    expect(await mudarStatusNoPainel({ id, status: 'entregue' })).toMatchObject({ ok: true });
    p = await pagina(id);
    expect(p).toContain('Status atual: Entregue');
    expect(p).toContain('Entregue é um status final. Não há próxima mudança.');
    expect(p).not.toContain('campo-novoStatus-');
  });
});
