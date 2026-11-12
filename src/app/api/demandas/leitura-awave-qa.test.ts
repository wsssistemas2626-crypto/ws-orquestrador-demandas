// QA da T05 (RF-07, IN-08, IN-14, ADR-23, ADR-28, D-16): o que os testes do engenheiro não cobriam. A leitura do Awave
// roda sob o orçamento de tempo (Minor da 06-T05-revisao), a vista continua com seis chaves com a demanda cheia e
// editada por pessoa, a origem vem da autoria e não do nome nem do id da conta, e `lerDemandaPara` falha fechada.
// Banco, rota e token reais (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect.
// Cada caso usa a própria demanda: o arquivo não depende de ordem. Relógio fixo, nenhuma asserção mede tempo.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from './[id]/route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import type { Ator, AtorIntegracao } from '../../../modules/acesso/ator';
import { lerDemandaPara, obterDemanda, vistaDaIntegracao } from '../../../modules/demandas/consultas';
import { alterarDemandaSchema, criarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../../../modules/demandas/servico';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { AGORA_TESTE, criarDepsDeTeste } from '../../../../test/deps';
import { atorDeIntegracao, inserirDemandaDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';

let b: BancoDeTeste;
let deps: Deps;
let token: string;
let prefixo: string;
const pessoa = { tipo: 'pessoa', usuarioId: 'p-qa-t05', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
const SEIS = ['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo'];
const INEXISTENTE = 'DEM-20261022-9998';
const CRIADA_EM = new Date(AGORA_TESTE).toISOString();

const ler = (id: string) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer: token, semOrigin: true });

async function fotoDaResposta(r: Response) {
  return { status: r.status, cabecalhos: [...r.headers.entries()].sort(), corpo: await r.text() };
}

// Pessoa preenche todo campo editável com sentinela e muda o status; as dúvidas da entrada (que a pessoa não edita) vão
// pelo migrator. A edição é uma hora depois da criação, para o `atualizadaEm` provar que a leitura é a atual.
async function encherDemanda(id: string): Promise<void> {
  const depois = { ...deps, relogio: relogioFixo('2026-10-22T13:00:00Z') };
  await alterarDemanda(
    depois,
    pessoa,
    id,
    alterarDemandaSchema.parse({
      status: 'em_analise',
      solicitantePapel: 'operacoes',
      linhaServicoProvavel: 'sob_medida',
      urgencia: 'alta',
      justificativaUrgencia: 'SENTINELA-JUSTIFICATIVA-7c4a',
      contexto: 'SENTINELA-CONTEXTO-7c4a',
      descricaoProblema: 'SENTINELA-DESCRICAO-7c4a',
      impactoPercebido: 'SENTINELA-IMPACTO-7c4a',
      anexos: [{ tipo: 'url', referencia: 'https://sentinela-7c4a.test/doc', descricao: 'SENTINELA-ANEXO-7c4a' }],
    }),
  );
  await b.poolMigrator.query('update demanda set duvidas_entrada = $1::jsonb where id = $2', [JSON.stringify(['SENTINELA-DUVIDA-7c4a']), id]);
}

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'awave');
  prefixo = token.slice('wsod_'.length, 'wsod_'.length + 8);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('IN-14 e ADR-28: o GET do Awave roda sob o orçamento de tempo da integração', () => {
  it('com a tabela demanda travada por outra conexão, desiste pelo lock_timeout: 503 fixo, log sem prefixo, e lê de novo quando a trava sai', async () => {
    const id = 'DEM-20261022-0911';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    const linhas: string[] = [];
    const segura = await b.poolMigrator.connect();
    let foto: Awaited<ReturnType<typeof fotoDaResposta>>;
    try {
      await segura.query('begin');
      // ACCESS EXCLUSIVE segura até o SELECT simples; sem o lock_timeout da integração, o GET esperaria a trava.
      await segura.query('lock table demanda in access exclusive mode');
      substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
      foto = await fotoDaResposta(await ler(id));
    } finally {
      substituirDestinoDoLog(null);
      await segura.query('rollback');
      segura.release();
    }
    expect(foto.status).toBe(503);
    expect(JSON.parse(foto.corpo)).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    expect(foto.cabecalhos).toEqual(
      expect.arrayContaining([
        ['cache-control', 'no-store'],
        ['content-type', 'application/json; charset=utf-8'],
        ['x-content-type-options', 'nosniff'],
      ]),
    );
    // Uma linha só, a da requisição, sem nome da integração, prefixo nem token (IN-14).
    const log = linhas.map((l) => {
      const { time, ms, ...resto } = JSON.parse(l) as Record<string, unknown>;
      void time;
      void ms;
      return resto;
    });
    expect(log).toEqual([
      { level: 50, evento: 'requisicao', metodo: 'GET', rota: '/api/demandas/[id]', status: 503, atorTipo: 'integracao', codigoErro: 'indisponivel' },
    ]);
    for (const l of linhas) {
      expect(l.includes(prefixo)).toBe(false);
      expect(l.includes('wsod_')).toBe(false);
      expect(l.includes('awave')).toBe(false);
      expect(l.includes(id)).toBe(false);
    }
    // Controle: sem a trava, a mesma leitura responde 200. O 503 veio da trava, e não de outra coisa.
    const r = await ler(id);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id, status: 'nova' });
  });
});

describe('RF-07, CA-07.3 e IN-08: seis chaves com a demanda cheia', () => {
  it('editada por pessoa com todo campo preenchido, o Awave vê só as seis chaves, com status e atualizadaEm atuais', async () => {
    const id = 'DEM-20261022-0912';
    await inserirDemandaDeIntegracao(b, { id, titulo: 'Relatório mensal fictício', criadaEm: deps.relogio.agora() });
    await encherDemanda(id);
    // Controle: a demanda ficou de fato cheia no banco (o teste não passa por demanda vazia).
    const cheia = await obterDemanda(deps.db, id);
    expect(cheia).toMatchObject({ urgencia: 'alta', contexto: 'SENTINELA-CONTEXTO-7c4a', duvidasEntrada: ['SENTINELA-DUVIDA-7c4a'] });
    expect(cheia.anexos).toHaveLength(1);

    const r = await ler(id);
    expect(r.status).toBe(200);
    const texto = await r.text();
    const corpo = JSON.parse(texto) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual(SEIS);
    expect(corpo).toEqual({
      id,
      titulo: 'Relatório mensal fictício',
      tipo: 'melhoria',
      status: 'em_analise',
      criadaEm: CRIADA_EM,
      atualizadaEm: '2026-10-22T13:00:00.000Z',
    });
    expect(texto).not.toMatch(/SENTINELA|sentinela-7c4a|sob_medida|operacoes|alta|Awave|integracao/);
  });

  it('o 200 do Awave sai com no-store, nosniff, no-referrer e JSON, sem cabeçalho de CORS', async () => {
    const id = 'DEM-20261022-0913';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    const r = await ler(id);
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect([...r.headers.keys()].filter((k) => k.startsWith('access-control-'))).toEqual([]);
  });

  it('vistaDaIntegracao recebe a DemandaVista inteira e devolve só as seis chaves (a vista que o 201 da T06 vai usar)', async () => {
    const id = 'DEM-20261022-0914';
    await inserirDemandaDeIntegracao(b, { id, titulo: 'Relatório anual fictício', criadaEm: deps.relogio.agora() });
    await encherDemanda(id);
    const inteira = await obterDemanda(deps.db, id);
    // Controle: a vista inteira tem bem mais que seis chaves, com as sentinelas.
    expect(Object.keys(inteira).length).toBeGreaterThan(SEIS.length);
    expect(JSON.stringify(inteira)).toMatch(/SENTINELA/);
    const v = vistaDaIntegracao(inteira);
    expect(Object.keys(v).sort()).toEqual(SEIS);
    expect(JSON.stringify(v)).not.toMatch(/SENTINELA|sentinela-7c4a/);
  });
});

describe('IN-08 e ADR-23: a origem vem da autoria, não do solicitante nem do id da conta', () => {
  it('demanda de pessoa com conta de id "awave" e de agente, as duas com solicitante "Awave", dão o mesmo 404 do id inexistente', async () => {
    const entrada = criarDemandaSchema.parse({ titulo: 'Demanda com nome Awave (fictício)', tipo: 'melhoria', solicitanteNome: 'Awave' });
    const contaAwave = { tipo: 'pessoa', usuarioId: 'awave', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
    const idPessoa = (await criarDemanda(deps, contaAwave, entrada)).id;
    const idAgente = (await criarDemanda(deps, { tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, entrada)).id;
    // Controle: as duas existem, com o solicitante "Awave", e a de pessoa tem autor_id "awave".
    const linhas = await b.poolMigrator.query<{ id: string; autor_tipo: string; autor_id: string; solicitante_nome: string }>(
      'select id, autor_tipo, autor_id, solicitante_nome from demanda where id = any($1) order by autor_tipo',
      [[idPessoa, idAgente]],
    );
    expect(linhas.rows).toEqual([
      { id: idAgente, autor_tipo: 'agente', autor_id: 'orquestrador', solicitante_nome: 'Awave' },
      { id: idPessoa, autor_tipo: 'pessoa', autor_id: 'awave', solicitante_nome: 'Awave' },
    ]);

    const esperado = await fotoDaResposta(await ler(INEXISTENTE));
    expect(esperado.status).toBe(404);
    expect(JSON.parse(esperado.corpo)).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    for (const id of [idPessoa, idAgente]) expect(await fotoDaResposta(await ler(id)), id).toEqual(esperado);
  });
});

describe('D-16 e IN-02: lerDemandaPara falha fechada', () => {
  it('chamada direto, sem a matriz, só o awave lê a demanda do Awave; construir e integração fora da lista recebem nao_encontrado', async () => {
    const id = 'DEM-20261022-0915';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    // Controle: o awave, pela mesma função, lê as seis chaves.
    const v = await lerDemandaPara(deps, atorDeIntegracao('awave'), id);
    expect(Object.keys(v).sort()).toEqual(SEIS);

    const jarvis = { tipo: 'integracao', integracao: 'jarvis', prefixoToken: 'ficticio' } as unknown as AtorIntegracao;
    for (const ator of [atorDeIntegracao('construir'), jarvis]) {
      const e = await lerDemandaPara(deps, ator, id).then(
        () => 'leu',
        (x: unknown) => x,
      );
      expect(e, ator.integracao).toBeInstanceOf(ErroDominio);
      expect(e, ator.integracao).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    }
  });

  it('tipo de ator desconhecido lança erro genérico (500), nunca devolve vista nem 404', async () => {
    const id = 'DEM-20261022-0916';
    await inserirDemandaDeIntegracao(b, { id, criadaEm: deps.relogio.agora() });
    const desconhecido = { tipo: 'robo', integracao: 'awave', prefixoToken: 'ficticio' } as unknown as Ator;
    const e = await lerDemandaPara(deps, desconhecido, id).then(
      () => 'leu',
      (x: unknown) => x,
    );
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(ErroDominio);
    expect((e as Error).message).toBe('ator desconhecido');
  });
});
