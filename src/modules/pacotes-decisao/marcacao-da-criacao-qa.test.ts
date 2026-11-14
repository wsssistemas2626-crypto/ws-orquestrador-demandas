// src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts — 06-T04-testes do DEC-DEM-20261111-0018-v1 (qa-automacao;
// SB-07 a, b, c; SB-08 c com dado real; SB-09 a). Testes adversariais da marcação do nome em vigor na criação do DEC
// (`caminhos_com_nome_na_criacao`), além dos da T04:
// (1) os cinco caminhos que criam DEC (rota de pessoa, rota do agente consolidacao, Server Action do painel, worker com
//     extras e o worker de verdade, executarAgente com o provedor falso) gravam a coluna não nula, com a chave mandada no
//     corpo, na saída do modelo e dentro da opção, e a coluna, traduzida para cada opção, é **igual** ao que o D1
//     conferiria na geração com o mesmo nome, relido do banco (a conferência é a mesma, não só parecida);
// (2) a marcação é feita sobre a ESP que o DEC cita (a lida pelo worker, M-01), e não sobre a mais nova;
// (3) o nome é o que está na demanda quando a criação trava a linha, e não o de quando a ESP foi escrita;
// (4) nada da coluna, nem o nome, sai no 400, no evento ou no log da criação, por pessoa ou por agente.
// Postgres real (Testcontainers), papel do app, rotas e tokens reais; a coluna é lida pelo migrator. Relógio fixo, uma
// autora por demanda (C-36), dados só fictícios; o token só nasce em tempo de teste e nunca vai a mensagem de expect.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { chamarRota } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { PROMPTS } from '../../agents';
import { gravarPacoteNoPainel } from '../../app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes';
import { POST as POST_DEC } from '../../app/api/demandas/[id]/pacotes-decisao/route';
import { OPCOES_DECISAO, type OpcaoDecisao } from '../../db/schema/decisao';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { capturarErro } from '../../lib/sentry';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { criarTokenServico } from '../acesso/tokens-servico';
import { criarExecucao } from '../agentes/execucoes';
import { executarAgente } from '../agentes/executar';
import { temNome } from '../dados-pessoais/minimizar';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { obterEspecificacao } from '../especificacoes/consultas';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { caminhosDaCriacaoNoPedido, RE_CAMINHO_DA_CRIACAO } from '../pedido-construcao/caminhos-da-criacao';
import { textosDoPedido } from '../pedido-construcao/montar';
import { idVersao } from '../versoes';
import { obterPacoteDecisao, type PacoteDecisaoVista } from './consultas';
import { criarPacoteDecisao } from './criar';
import { criarPacoteDecisaoSchema } from './schemas';

const NOME = 'Joana Ficticia Lima';
const PARTES_DO_NOME = ['Joana', 'Ficticia', 'Lima'] as const;
const MODELO = 'modelo-ficticio-qa-t04';
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

// O nome espalhado por todos os textos que vão ao pedido e por três que não vão (resumo, recomendação e vantagens da
// opção: o D1 não os confere, e a marcação também não).
const DEMANDA = { titulo: 'Pedido da Lima (fictício)', tipo: 'bug', contexto: 'Combinado com a Joana', solicitanteNome: NOME };
const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  situacaoAtual: 'Conversar com Lima sobre o estoque',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só', 'Aceite da Joana'],
  definicaoDePronto: ['Revisado pela Ficticia', 'pnpm test verde'],
};
const ESP_SEM_NOME = { ...ESP, situacaoAtual: 'Pedido entra duas vezes', criteriosAceitePreliminares: ['Pedido importado uma vez só'], definicaoDePronto: ['pnpm test verde'] };
const RSK = { riscoTecnicoNivel: 'medio', riscoTecnicoComentario: 'Lima acompanha a virada', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const RSK_SEM_NOME = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const SAIDA_DO_MODELO = {
  ...(PROMPTS.consolidacao.exemploSaida as object),
  resumoExecutivo: 'Resumo com a Lima',
  opcaoA: { descricao: 'Falar com a Joana antes' },
  opcaoB: { descricao: 'Refazer a integração', vantagens: 'Lima gosta', caminhosComNomeNaCriacao: ['demanda.titulo'] },
  recomendacao: 'Joana prefere A',
};
const CORPO_DEC = { ...SAIDA_DO_MODELO, nivelAprovacaoRequerido: 'cto' };
// A chave da coluna, nas duas grafias, com os valores que liberariam o pedido (vazia e nula) e um caminho inventado.
const CHAVE_NO_CORPO = { caminhosComNomeNaCriacao: [], caminhos_com_nome_na_criacao: null, caminhosComNome: ['x'] };

// O que a criação tem de gravar para o cenário com o nome espalhado, na ordem dos textos.
const MARCACAO_ESPALHADA = [
  'demanda.titulo',
  'demanda.descricao',
  'especificacao.conteudo',
  'risco.conteudo',
  'opcaoA.descricao',
  'criterios_aceite_preliminares[1]',
  'definicao_de_pronto[0]',
];

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let tokenConsolidacao: string;
let autoras = 0;
const linhasDeLog: string[] = [];
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-marcacao-qa-${++autoras}`, nome: 'Autora da marcação (qa)', papel: 'cto' });

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l: string) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-14T15:00:00Z') });
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  linhasDeLog.length = 0;
  pedido.cabecalhos = new Headers({ cookie });
  vi.mocked(capturarErro).mockClear();
});

type Cenario = { esp?: Record<string, unknown>; rsk?: Record<string, unknown> };

// Demanda com ESP v1 e RSK v1 de uma autora própria (C-36), com os agentes desligados (nenhum gatilho cria execução).
async function demandaPronta(c: Cenario = {}): Promise<{ id: string; autora: AtorPessoa }> {
  const autora = novaAutora();
  const id = (await criarDemanda(deps, autora, criarDemandaSchema.parse(DEMANDA))).id;
  await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(c.esp ?? ESP));
  await criarParecerRisco(deps, autora, id, criarParecerRiscoSchema.parse(c.rsk ?? RSK));
  return { id, autora };
}

const colunaDo = async (decId: string): Promise<unknown> =>
  (await b.poolMigrator.query<{ c: unknown }>('select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1', [decId])).rows[0]?.c;

const postDec = (demandaId: string, corpo: unknown, credencial: { cookie: string } | { bearer: string }) =>
  chamarRota(POST_DEC, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pacotes-decisao`, params: { id: demandaId }, corpo, ...credencial });

const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 });

const CAMINHOS = ['rota de pessoa', 'rota do agente consolidacao', 'Server Action do painel', 'worker com extras', 'worker de verdade (executarAgente)'] as const;
type Caminho = (typeof CAMINHOS)[number];

// Cria o DEC pelo caminho pedido, com a chave da coluna no corpo (ou na saída do modelo), e devolve o id dele.
async function criarPor(caminho: Caminho, demandaId: string, op: { espVersao?: number } = {}): Promise<string> {
  switch (caminho) {
    case 'rota de pessoa':
    case 'rota do agente consolidacao': {
      const r = await postDec(demandaId, { ...CORPO_DEC, ...CHAVE_NO_CORPO }, caminho === 'rota de pessoa' ? { cookie } : { bearer: tokenConsolidacao });
      expect(r.status, caminho).toBe(201);
      return ((await r.json()) as { id: string }).id;
    }
    case 'Server Action do painel': {
      const r = await gravarPacoteNoPainel({ ...CORPO_DEC, ...CHAVE_NO_CORPO, demandaId });
      if (!r.ok) throw new Error(`a Server Action recusou: ${r.erro}`);
      return r.dados.id;
    }
    case 'worker com extras':
      return (
        await comTransacao(b.poolApp, (t) =>
          criarPacoteDecisao(deps, consolidacao, demandaId, criarPacoteDecisaoSchema.parse({ ...CORPO_DEC, ...CHAVE_NO_CORPO }), t, {
            execucaoAgenteId: '00000000-0000-4000-8000-000000000419',
            especificacaoId: idVersao('ESP', demandaId, op.espVersao ?? 1),
            parecerRiscoId: idVersao('RSK', demandaId, 1),
          }),
        )
      ).id;
    case 'worker de verdade (executarAgente)': {
      await b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = $1 where agente = 'consolidacao'`, [MODELO]);
      try {
        const execId = await comTransacao(b.poolApp, (t) => criarExecucao(t, deps, { agente: 'consolidacao', chaveEntrada: `rsk:${idVersao('RSK', demandaId, 1)}`, demandaId }));
        if (!execId) throw new Error('a execução da consolidação já existia');
        const provedor = new ProvedorFalso();
        provedor.respostas.push(resposta({ ...SAIDA_DO_MODELO, ...CHAVE_NO_CORPO }));
        expect(await executarAgente({ ...deps, provedor }, execId)).toBe('concluida');
        const { rows } = await b.poolMigrator.query<{ a: string }>('select artefato_id as a from execucao_agente where id = $1', [execId]);
        return rows[0]!.a;
      } finally {
        await b.poolMigrator.query(`update configuracao_agente set ligado = false, modelo = null where agente = 'consolidacao'`);
      }
    }
  }
}

const aprovadoCom = (dec: PacoteDecisaoVista, opcao: OpcaoDecisao): PacoteDecisaoVista => ({
  ...dec,
  statusDecisao: 'aprovada',
  decisao: { opcaoEscolhida: opcao, comentarios: null, decididaPor: null, decididaEm: new Date('2026-11-14T16:00:00Z') },
});

// O que o D1 da geração recusaria com o nome dado, para o DEC aprovado com a opção: os textos do pedido montados do DEC,
// da ESP e do RSK **relidos do banco** (os que conferir.ts lê), filtrados por temNome. Sem nada de criar.ts.
async function oQueOD1Recusaria(decId: string, nomes: readonly string[]): Promise<Record<OpcaoDecisao, string[]>> {
  const dec = await obterPacoteDecisao(b.db, decId);
  const esp = await obterEspecificacao(b.db, dec.especificacaoId);
  const rsk = await obterParecerRisco(b.db, dec.parecerRiscoId);
  const recusados = (opcao: OpcaoDecisao) =>
    textosDoPedido({ dec: aprovadoCom(dec, opcao), esp, rsk })
      .filter((t) => t.valores.some((v) => temNome(v, nomes)))
      .map((t) => t.caminho)
      .sort();
  return { A: recusados('A'), B: recusados('B') };
}

function semNomeNemColuna(texto: string, rotulo: string): void {
  expect(texto, rotulo).not.toMatch(/caminhos_?com_?nome/i);
  for (const parte of PARTES_DO_NOME) expect(texto, `${rotulo}: parte do nome`).not.toContain(parte);
}

describe('SB-07 (a, b, c) e SB-08 (c): a marcação de cada caminho de criação é a conferência do D1, com a chave no corpo', () => {
  it.each(CAMINHOS)('%s: a coluna é a calculada, e traduzida para A e para B é igual ao que o D1 recusaria na geração', async (caminho) => {
    const { id } = await demandaPronta();
    const decId = await criarPor(caminho, id);
    const coluna = await colunaDo(decId);
    // Não nula, não a mandada no corpo (vazia, nula ou inventada): a calculada, caminho a caminho, na ordem dos textos.
    expect(coluna, caminho).toEqual(MARCACAO_ESPALHADA);
    for (const c of coluna as string[]) expect(RE_CAMINHO_DA_CRIACAO.test(c), c).toBe(true);
    semNomeNemColuna(JSON.stringify(coluna), `${caminho}: valor da coluna`);
    // A mesma conferência que o D1 faria, relida do banco, opção a opção: igualdade, e não subconjunto.
    const d1 = await oQueOD1Recusaria(decId, [NOME]);
    for (const opcao of OPCOES_DECISAO) expect([...caminhosDaCriacaoNoPedido(coluna as string[], opcao)].sort(), `${caminho} ${opcao}`).toEqual(d1[opcao]);
    // A opção não escolhida com o nome não entra no pedido de B (SB-08 d, visto da criação).
    expect(d1.B).not.toContain('decisao.opcaoEscolhida');
    expect(d1.A).toContain('decisao.opcaoEscolhida');
  });

  it.each(CAMINHOS)('%s: sem o nome em texto algum, a coluna é [] (nunca null), e o D1 não recusaria nada', async (caminho) => {
    const { id, autora } = await demandaPronta({ esp: ESP_SEM_NOME, rsk: RSK_SEM_NOME });
    // Título e contexto da demanda têm o nome: troca para um solicitante que nenhum texto cita.
    await alterarDemanda(deps, autora, id, alterarDemandaSchema.parse({ solicitanteNome: 'Rosa Teste Quintela' }));
    const decId = await criarPor(caminho, id);
    expect(await colunaDo(decId), caminho).toEqual([]);
    expect(await oQueOD1Recusaria(decId, ['Rosa Teste Quintela'])).toEqual({ A: [], B: [] });
  });
});

describe('SB-07: a marcação é feita sobre a ESP que o DEC cita (M-01), e não sobre a mais nova', () => {
  it('ESP v1 com o nome e v2 sem: o worker que leu a v1 marca a ESP; a rota de pessoa, que cita a v2, não', async () => {
    const { id, autora } = await demandaPronta({ rsk: RSK_SEM_NOME });
    await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(ESP_SEM_NOME));
    const doWorker = await criarPor('worker com extras', id, { espVersao: 1 });
    const daPessoa = await criarPor('rota de pessoa', id);
    expect((await obterPacoteDecisao(b.db, doWorker)).especificacaoId).toBe(idVersao('ESP', id, 1));
    expect((await obterPacoteDecisao(b.db, daPessoa)).especificacaoId).toBe(idVersao('ESP', id, 2));
    expect(await colunaDo(doWorker)).toEqual(['demanda.titulo', 'demanda.descricao', 'especificacao.conteudo', 'opcaoA.descricao', 'criterios_aceite_preliminares[1]', 'definicao_de_pronto[0]']);
    expect(await colunaDo(daPessoa)).toEqual(['demanda.titulo', 'demanda.descricao', 'opcaoA.descricao']);
    for (const decId of [doWorker, daPessoa]) {
      const d1 = await oQueOD1Recusaria(decId, [NOME]);
      const coluna = (await colunaDo(decId)) as string[];
      for (const opcao of OPCOES_DECISAO) expect([...caminhosDaCriacaoNoPedido(coluna, opcao)].sort(), `${decId} ${opcao}`).toEqual(d1[opcao]);
    }
  });

  it('ESP v1 sem o nome e v2 com: o worker que leu a v1 não marca a ESP; a rota de pessoa marca', async () => {
    const { id, autora } = await demandaPronta({ esp: ESP_SEM_NOME, rsk: RSK_SEM_NOME });
    await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(ESP));
    const doWorker = await criarPor('worker com extras', id, { espVersao: 1 });
    const daPessoa = await criarPor('rota de pessoa', id);
    expect(await colunaDo(doWorker)).toEqual(['demanda.titulo', 'demanda.descricao', 'opcaoA.descricao']);
    expect(await colunaDo(daPessoa)).toEqual(['demanda.titulo', 'demanda.descricao', 'especificacao.conteudo', 'opcaoA.descricao', 'criterios_aceite_preliminares[1]', 'definicao_de_pronto[0]']);
  });
});

describe('SB-07: o nome é o que está na demanda quando a criação trava a linha', () => {
  it('o solicitante trocado depois da ESP e antes do DEC: marca o que cita o nome novo, e não o antigo', async () => {
    const { id, autora } = await demandaPronta({
      esp: { ...ESP_SEM_NOME, situacaoAtual: 'Conversar com Lima sobre o estoque', criteriosAceitePreliminares: ['Aceite do Teixeira'] },
      rsk: RSK_SEM_NOME,
    });
    await alterarDemanda(deps, autora, id, alterarDemandaSchema.parse({ solicitanteNome: 'Paulo Ficticio Teixeira' }));
    const decId = await criarPor('rota de pessoa', id);
    expect(await colunaDo(decId)).toEqual(['criterios_aceite_preliminares[0]']);
    const d1 = await oQueOD1Recusaria(decId, ['Paulo Ficticio Teixeira']);
    expect(d1).toEqual({ A: ['criterios_aceite_preliminares[0]'], B: ['criterios_aceite_preliminares[0]'] });
  });
});

describe('SB-09 (a) e C-30: nada da coluna nem do nome sai da criação, por pessoa ou por agente', () => {
  it.each(CAMINHOS)('%s: o evento pacote_decisao_criado tem só as 5 chaves de hoje, e o log não tem a coluna nem o nome', async (caminho) => {
    const { id } = await demandaPronta();
    linhasDeLog.length = 0;
    const decId = await criarPor(caminho, id);
    const { rows } = await b.poolMigrator.query<{ antes: unknown; depois: Record<string, unknown> }>(
      "select antes, depois from evento where entidade_id = $1 and acao = 'pacote_decisao_criado'",
      [decId],
    );
    expect(rows.map((e) => Object.keys(e.depois).sort()), caminho).toEqual([['especificacaoId', 'nivelAprovacaoRequerido', 'parecerRiscoId', 'rascunhoAgente', 'versao']]);
    semNomeNemColuna(JSON.stringify(rows), `${caminho}: evento`);
    semNomeNemColuna(linhasDeLog.join('\n'), `${caminho}: log`);
    expect(vi.mocked(capturarErro), caminho).not.toHaveBeenCalled();
  });

  it.each([
    ['pessoa', true],
    ['agente consolidacao', false],
  ] as const)('400 da rota (%s) com só a chave da coluna e o nome no corpo: sem eco da chave nem do nome, e nenhum DEC', async (_rotulo, ehPessoa) => {
    const { id } = await demandaPronta();
    const r = await postDec(id, { caminhosComNomeNaCriacao: [NOME], caminhos_com_nome_na_criacao: NOME, opcaoA: { descricao: NOME } }, ehPessoa ? { cookie } : { bearer: tokenConsolidacao });
    expect(r.status).toBe(400);
    semNomeNemColuna(await r.text(), `400 ${_rotulo}`);
    const { rows } = await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from pacote_decisao where demanda_id = $1', [id]);
    expect(rows[0]!.n).toBe(0);
  });

  it('400 de "faltam itens" com a chave no corpo: sem eco, e a coluna não é gravada em lugar nenhum', async () => {
    const autora = novaAutora();
    const id = (await criarDemanda(deps, autora, criarDemandaSchema.parse(DEMANDA))).id;
    await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(ESP));
    const r = await postDec(id, { ...CORPO_DEC, ...CHAVE_NO_CORPO }, { cookie });
    expect(r.status).toBe(400);
    const texto = await r.text();
    expect(JSON.parse(texto)).toMatchObject({ faltando: ['parecer_risco'] });
    semNomeNemColuna(texto, '400 faltando');
    const { rows } = await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from pacote_decisao where demanda_id = $1', [id]);
    expect(rows[0]!.n).toBe(0);
  });
});
