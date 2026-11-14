// src/modules/pacotes-decisao/marcacao-da-criacao.test.ts — T04 do DEC-DEM-20261111-0018-v1 (S-03, ADR-37; SB-07 a, b,
// c e e). A marcação do nome em vigor na criação do DEC (`caminhos_com_nome_na_criacao`) é calculada só pelo servidor,
// em criar.ts, sobre os mesmos textos que o D1 confere na geração, com o nome da linha travada; sai não nula pelos três
// caminhos de criação (rota de pessoa, rota do agente consolidacao, worker com extras); a chave mandada no corpo não muda
// nada; a corrida com a troca do solicitanteNome dá a marcação do nome que estava na linha quando a criação a travou.
// Postgres real (Testcontainers), papel do app, rotas e tokens reais; a coluna é lida pelo migrator. Relógio fixo, uma
// autora por caso (C-36), dados só fictícios; o token só nasce em tempo de teste.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { chamarRota } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { POST as POST_DEC } from '../../app/api/demandas/[id]/pacotes-decisao/route';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { criarTokenServico } from '../acesso/tokens-servico';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { RE_CAMINHO_DA_CRIACAO } from '../pedido-construcao/caminhos-da-criacao';
import { idVersao } from '../versoes';
import { criarPacoteDecisao } from './criar';
import { criarPacoteDecisaoSchema } from './schemas';

const NOME = 'Joana Ficticia Lima';
const OUTRO_NOME = 'Outra Pessoa';
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

const DEMANDA = { titulo: 'Pedidos duplicados (fictício)', tipo: 'bug', contexto: 'Importação diária do ERP', descricaoProblema: 'Pedidos aparecem duas vezes' };
const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
// A ESP do caso com nome: só a parte "Lima" do solicitante, num campo do texto da ESP.
const ESP_COM_NOME = { ...ESP, situacaoAtual: 'Conversar com Lima sobre o estoque' };
const RSK = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const DEC = { resumoExecutivo: 'Corrigir a importação de pedidos', opcaoA: { descricao: 'Corrigir no importador' }, opcaoB: { descricao: 'Refazer a integração' }, nivelAprovacaoRequerido: 'cto' };

// As chaves do 201 de pessoa em 41108ee (vistaDe de pacotes-decisao/consultas.ts, congelada pela G4).
const CHAVES_DA_VISTA = [
  'id',
  'demandaId',
  'versao',
  'especificacaoId',
  'parecerRiscoId',
  'demandaTipo',
  'demandaTitulo',
  'demandaDescricao',
  'resumoExecutivo',
  'opcaoA',
  'opcaoB',
  'recomendacao',
  'nivelAprovacaoRequerido',
  'autor',
  'rascunhoAgente',
  'criadaEm',
  'statusDecisao',
  'aprovadores',
  'desatualizado',
  'substituido',
  'substituidoPor',
  'decisao',
  'rascunhosCitados',
  'especificacaoCitada',
  'niveisRisco',
];

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let tokenConsolidacao: string;
let autoras = 0;
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-marcacao-${++autoras}`, nome: 'Autora da marcação', papel: 'cto' });

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-14T12:00:00Z') });
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

// Demanda com ESP v1 e RSK v1 de uma autora própria; `comNome`: a ESP cita uma parte do solicitante.
async function demandaPronta(op: { comNome: boolean }): Promise<{ id: string; autora: AtorPessoa }> {
  const autora = novaAutora();
  const id = (await criarDemanda(deps, autora, criarDemandaSchema.parse({ ...DEMANDA, solicitanteNome: NOME }))).id;
  await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(op.comNome ? ESP_COM_NOME : ESP));
  await criarParecerRisco(deps, autora, id, criarParecerRiscoSchema.parse(RSK));
  return { id, autora };
}

const colunaDo = async (decId: string): Promise<unknown> =>
  (await b.poolMigrator.query<{ c: unknown }>('select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1', [decId])).rows[0]?.c;

const postDec = (demandaId: string, corpo: unknown, credencial: { cookie: string } | { bearer: string }) =>
  chamarRota(POST_DEC, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pacotes-decisao`, params: { id: demandaId }, corpo, ...credencial });

type Caminho = 'rota de pessoa' | 'rota do agente consolidacao' | 'worker com extras';

async function criarPor(caminho: Caminho, demandaId: string, corpo: Record<string, unknown> = DEC): Promise<string> {
  switch (caminho) {
    case 'rota de pessoa':
    case 'rota do agente consolidacao': {
      const r = await postDec(demandaId, corpo, caminho === 'rota de pessoa' ? { cookie } : { bearer: tokenConsolidacao });
      expect(r.status, caminho).toBe(201);
      return ((await r.json()) as { id: string }).id;
    }
    case 'worker com extras':
      return (
        await comTransacao(b.poolApp, (t) =>
          criarPacoteDecisao(deps, consolidacao, demandaId, criarPacoteDecisaoSchema.parse(corpo), t, {
            execucaoAgenteId: '00000000-0000-4000-8000-000000000418',
            especificacaoId: idVersao('ESP', demandaId, 1),
            parecerRiscoId: idVersao('RSK', demandaId, 1),
          }),
        )
      ).id;
  }
}

const CAMINHOS: readonly Caminho[] = ['rota de pessoa', 'rota do agente consolidacao', 'worker com extras'];

describe('SB-07 (b, c) e RF-02: a marcação é gravada pelos três caminhos de criação', () => {
  it.each(CAMINHOS)('%s: com o nome na ESP → ["especificacao.conteudo"]; sem o nome em texto algum → [] (nunca null)', async (caminho) => {
    const comNome = await demandaPronta({ comNome: true });
    const semNome = await demandaPronta({ comNome: false });
    const decComNome = await criarPor(caminho, comNome.id);
    const decSemNome = await criarPor(caminho, semNome.id);
    expect(await colunaDo(decComNome)).toEqual(['especificacao.conteudo']);
    expect(await colunaDo(decSemNome)).toEqual([]);
  });

  it('SB-07 (c): cada item casa a lista de permissão e nenhum traz o nome, inteiro ou em parte', async () => {
    const { id } = await demandaPronta({ comNome: true });
    const decId = await criarPor('rota de pessoa', id, { ...DEC, opcaoB: { descricao: 'Validar com a Joana' } });
    const coluna = (await colunaDo(decId)) as string[];
    expect(coluna).toEqual(['especificacao.conteudo', 'opcaoB.descricao']);
    for (const c of coluna) expect(RE_CAMINHO_DA_CRIACAO.test(c), c).toBe(true);
    const texto = JSON.stringify(coluna);
    for (const parte of ['Joana', 'Ficticia', 'Lima', 'Validar', 'Conversar']) expect(texto).not.toContain(parte);
  });
});

describe('SB-07 (a): a chave no corpo não muda a marcação', () => {
  it.each([
    ['rota de pessoa', []],
    ['rota de pessoa', null],
    ['rota do agente consolidacao', []],
    ['rota do agente consolidacao', null],
  ] as const)('%s com caminhosComNomeNaCriacao: %j no corpo → 201 (a chave é descartada, C-11), e a coluna é a calculada', async (caminho, enviado) => {
    const { id } = await demandaPronta({ comNome: true });
    const decId = await criarPor(caminho, id, { ...DEC, caminhosComNomeNaCriacao: enviado, caminhos_com_nome_na_criacao: enviado });
    expect(await colunaDo(decId)).toEqual(['especificacao.conteudo']);
  });

  it('a chave no corpo, com um caminho inventado, não chega à coluna (sem nome na demanda)', async () => {
    const { id } = await demandaPronta({ comNome: false });
    const decId = await criarPor('rota de pessoa', id, { ...DEC, caminhosComNomeNaCriacao: ['demanda.titulo'] });
    expect(await colunaDo(decId)).toEqual([]);
  });
});

// Espera até uma conexão do banco do teste estar na fila de uma trava (a outra transação parou em travarDemanda).
async function esperarTrava(): Promise<void> {
  for (let i = 0; i < 500; i++) {
    const { rows } = await b.poolMigrator.query<{ n: number }>(
      "select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and pid <> pg_backend_pid()",
    );
    if (rows[0]!.n > 0) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error('a segunda transação não chegou à espera da trava');
}

function sinal(): { promessa: Promise<void>; disparar: () => void } {
  let disparar!: () => void;
  const promessa = new Promise<void>((r) => {
    disparar = r;
  });
  return { promessa, disparar: () => disparar() };
}

describe('SB-07 (e): criação do DEC × troca do solicitanteNome, em duas conexões', () => {
  it('(i) a troca do nome segura a trava; a criação espera → a marcação é a do nome novo ([])', async () => {
    const { id, autora } = await demandaPronta({ comNome: true });
    const trocou = sinal();
    const soltar = sinal();
    const troca = comTransacao(b.poolApp, async (t) => {
      await alterarDemanda(deps, autora, id, alterarDemandaSchema.parse({ solicitanteNome: OUTRO_NOME }), t);
      trocou.disparar();
      await soltar.promessa;
    });
    await trocou.promessa;
    const criacao = criarPacoteDecisao(deps, novaAutora(), id, criarPacoteDecisaoSchema.parse(DEC));
    try {
      await esperarTrava();
    } finally {
      soltar.disparar();
    }
    await troca;
    const dec = await criacao;
    expect(await colunaDo(dec.id)).toEqual([]);
  });

  it('(ii) a criação segura a trava; a troca do nome espera → a marcação é a do nome antigo (["especificacao.conteudo"])', async () => {
    const { id, autora } = await demandaPronta({ comNome: true });
    const criou = sinal();
    const soltar = sinal();
    const criacao = comTransacao(b.poolApp, async (t) => {
      const v = await criarPacoteDecisao(deps, novaAutora(), id, criarPacoteDecisaoSchema.parse(DEC), t);
      criou.disparar();
      await soltar.promessa;
      return v;
    });
    await criou.promessa;
    const troca = alterarDemanda(deps, autora, id, alterarDemandaSchema.parse({ solicitanteNome: OUTRO_NOME }));
    try {
      await esperarTrava();
    } finally {
      soltar.disparar();
    }
    const dec = await criacao;
    await troca;
    expect(await colunaDo(dec.id)).toEqual(['especificacao.conteudo']);
    const { rows } = await b.poolMigrator.query<{ n: string }>('select solicitante_nome as n from demanda where id = $1', [id]);
    expect(rows[0]!.n).toBe(OUTRO_NOME);
  });
});

describe('o 201 da criação e o evento continuam os de hoje (SB-09, C-30)', () => {
  it('o 201 de pessoa tem as chaves de 41108ee, sem a coluna; o evento pacote_decisao_criado também não a tem', async () => {
    const { id } = await demandaPronta({ comNome: true });
    const r = await postDec(id, DEC, { cookie });
    expect(r.status).toBe(201);
    const texto = await r.text();
    expect(Object.keys(JSON.parse(texto) as Record<string, unknown>)).toEqual(CHAVES_DA_VISTA);
    expect(texto).not.toMatch(/caminhos/i);
    const { rows } = await b.poolMigrator.query<{ depois: Record<string, unknown> }>(
      "select depois from evento where demanda_id = $1 and acao = 'pacote_decisao_criado'",
      [id],
    );
    expect(rows.map((e) => Object.keys(e.depois).sort())).toEqual([['especificacaoId', 'nivelAprovacaoRequerido', 'parecerRiscoId', 'rascunhoAgente', 'versao']]);
  });

  it('o 201 do agente consolidacao também não tem a coluna', async () => {
    const { id } = await demandaPronta({ comNome: true });
    const r = await postDec(id, DEC, { bearer: tokenConsolidacao });
    expect(r.status).toBe(201);
    const texto = await r.text();
    expect(Object.keys(JSON.parse(texto) as Record<string, unknown>)).toEqual(CHAVES_DA_VISTA);
    expect(texto).not.toMatch(/caminhos/i);
  });
});
