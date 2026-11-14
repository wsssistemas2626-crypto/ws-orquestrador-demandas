// T02 do DEC-DEM-20261111-0018-v1: a rota GET /api/pedidos-construcao/:decId/situacao (RF-01; CA-01.1 a CA-01.6 pela
// rota; RNF-02 a RNF-04; SB-02, SB-03 a e b, SB-05, SB-06). Banco, rota e tokens `construir` e `awave` reais
// (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). A requisição é a que o
// /construir vai mandar: GET, Bearer, `accept: application/json`, sem `Origin`, sem cookie e sem corpo. Cada caso monta
// os próprios DEC, com autora própria (C-36). Relógio fixo; o monotônico só no caso do 503. Dados só fictícios.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CORPO_CONSTRUINDO } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { tokenDeIntegracao } from '../../../../test/integracoes';
import { CONFIRMADO, DEC_DO_PEDIDO, chamadasDoConstruir, inserirEventoDoPedido, preparadorDePedidos, type CenarioDoPedido, type OpChamada } from '../../../../test/pedidos-construcao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { AGENTES, PAPEIS, type AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { MENSAGENS_ANDAMENTO } from '../../../modules/andamento/schemas';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import * as rotaSituacao from './[decId]/situacao/route';

const relogio = relogioFixo('2026-11-13T12:00:00Z');
const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const ROTA = '/api/pedidos-construcao/[decId]/situacao';
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
const DOC = { referenciaDocumento: 'DOC-FICTICIO-018', dataDocumento: '2026-11-10' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm-situacao-rota', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let prefixoConstruir: string;
let tokenAwave: string;
// Todas as linhas do pino deste arquivo (RNF-04, SB-05).
const linhasDoLog: string[] = [];

const construir = chamadasDoConstruir(() => tokenConstruir);
const ler = (decId: string, op: Omit<OpChamada, 'corpo'> = {}) => construir.situacao(decId, op);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'situacao-rota', entregar: (decId) => construir.entregar(decId) });

// A resposta inteira, para comparar byte a byte: status, cabeçalhos (sem a data) e corpo.
async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

// O texto do token depois de `wsod_` e do prefixo de 8 caracteres: o que nunca pode sair.
const textoDepoisDoPrefixo = (token: string) => token.slice('wsod_'.length + 8);

// O que a leitura não pode mudar (CA-01.5, SB-03 c): o total de linhas de evento, andamento_construcao, pacote_decisao
// e decisao, e o status e o atualizada_em das demandas do caso.
async function retrato(demandaIds: readonly string[]) {
  const contagens = (
    await b.poolMigrator.query(
      `select (select count(*) from evento)::int as eventos, (select count(*) from andamento_construcao)::int as andamentos,
              (select count(*) from pacote_decisao)::int as pacotes, (select count(*) from decisao)::int as decisoes`,
    )
  ).rows[0] as Record<string, number>;
  const demandas = (await b.poolMigrator.query(`select id, status, atualizada_em from demanda where id = any($1::text[]) order by id`, [demandaIds])).rows;
  return { contagens, demandas };
}

const v2De = async (c: CenarioDoPedido, nivel: 'cto' | 'cto_e_administradora') =>
  (await criarPacoteDecisao(deps, c.autora, c.demandaId, criarPacoteDecisaoSchema.parse({ ...DEC_DO_PEDIDO, nivelAprovacaoRequerido: nivel }))).id;
const aprovarPelaAdministradora = (decId: string) =>
  registrarDecisao(deps, administradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...DOC }));

// O v1 com pedido gerado, substituído pelo v2 só do cto, aprovado.
async function substituido(): Promise<CenarioDoPedido> {
  const c = await preparador.prepararDec();
  await preparador.aprovar(await v2De(c, 'cto'));
  return c;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  const t = await comTransacao(deps.pool, (x) => criarTokenDeIntegracao(x, 'construir', deps.relogio));
  tokenConstruir = t.token;
  prefixoConstruir = t.prefixo;
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a rota', () => {
  it('só exporta GET, com a ação ler_situacao_pedido e o padrão do arquivo', () => {
    const metodos = Object.keys(rotaSituacao as Record<string, unknown>).filter((k) => /^[A-Z]+$/.test(k));
    expect(metodos).toEqual(['GET']);
    expect(rotaSituacao.GET.meta).toMatchObject({ acao: 'ler_situacao_pedido', rota: ROTA });
  });
});

describe('CA-01.1, CA-01.2 e SB-03 (a, b): 200 com o corpo exato', () => {
  it('vigente → 200 {"situacao":"vigente"}, JSON, no-store e nosniff, sem CORS; substituído → {"situacao":"substituido"}', async () => {
    const v = await preparador.prepararDec();
    const r = await ler(v.decId);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('{"situacao":"vigente"}');
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect([...r.headers.keys()].filter((k) => k.startsWith('access-control-'))).toEqual([]);

    const s = await substituido();
    const rs = await ler(s.decId);
    expect(rs.status).toBe(200);
    expect(await rs.text()).toBe('{"situacao":"substituido"}');
    expect(rs.headers.get('cache-control')).toBe('no-store');
  });

  it('CA-01.2: v2 de dupla aprovação: com só a primeira aprovação, vigente; com a segunda, substituido', async () => {
    const c = await preparador.prepararDec();
    const v2 = await v2De(c, 'cto_e_administradora');
    expect((await aprovarPelaAdministradora(v2)).resultado).toBe('aprovacao_parcial');
    expect(await (await ler(c.decId)).text()).toBe('{"situacao":"vigente"}');
    await preparador.aprovar(v2);
    expect(await (await ler(c.decId)).text()).toBe('{"situacao":"substituido"}');
  });
});

describe('CA-01.3 e SB-02 (a, c): o 404 é o do DEC inexistente, byte a byte', () => {
  it('sem pedido gerado, pedido_gerado de agente, de sistema e de pessoa noutra demanda: iguais ao inexistente desta rota, da entrega e do andamento', async () => {
    const alvo = await preparador.prepararDec();
    const semPedido = await preparador.prepararDec({ gerar: false });
    const porAgente = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porAgente.decId, demandaId: porAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    const porSistema = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porSistema.decId, demandaId: porSistema.demandaId, atorTipo: 'sistema', atorId: 'sistema', prefixo: null });
    const deOutra = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, {
      acao: 'pedido_gerado',
      decId: deOutra.decId,
      demandaId: alvo.demandaId,
      atorTipo: 'pessoa',
      atorId: preparador.geradora.usuarioId,
      prefixo: null,
      depois: CONFIRMADO,
    });
    const demandas = [alvo, semPedido, porAgente, porSistema, deOutra].map((c) => c.demandaId);
    const antes = await retrato(demandas);

    const referencia = await foto(await ler(INEXISTENTE));
    expect(referencia.status).toBe(404);
    expect(JSON.parse(referencia.corpo)).toEqual(NAO_ENCONTRADO);
    expect(referencia.cabecalhos.map(([k]) => k)).toEqual(['cache-control', 'content-type', 'referrer-policy', 'x-content-type-options']);
    const casos: Array<[string, string]> = [
      ['sem pedido gerado', semPedido.decId],
      ['pedido_gerado de agente', porAgente.decId],
      ['pedido_gerado de sistema', porSistema.decId],
      ['pedido_gerado de pessoa noutra demanda', deOutra.decId],
    ];
    for (const [nome, decId] of casos) expect(await foto(await ler(decId)), nome).toEqual(referencia);
    // O mesmo 404 das rotas do /construir que já existem.
    expect(await foto(await construir.entregar(INEXISTENTE))).toEqual(referencia);
    expect(await foto(await construir.andamento(INEXISTENTE, CORPO_CONSTRUINDO))).toEqual(referencia);
    expect(await retrato(demandas)).toEqual(antes);
    // Controle: o DEC alvo, com pedido gerado por pessoa, responde 200.
    expect((await ler(alvo.decId)).status).toBe(200);
  });

  it('id fora do formato (DEC-xyz) → o mesmo 404, sem conectar nem consultar o pool do app (C-17)', async () => {
    const referencia = await foto(await ler(INEXISTENTE));
    const connect = vi.spyOn(b.poolApp, 'connect');
    const query = vi.spyOn(b.poolApp, 'query');
    const fora = await foto(await ler('DEC-xyz'));
    expect(connect).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(fora).toEqual(referencia);
  });
});

describe('CA-01.4: só o /construir', () => {
  it('awave, os quatro agentes, cto e administradora (sessão com 2FA) → 403 sem_permissao; sem credencial → 401; nada muda', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const credenciais: Array<[string, Omit<OpChamada, 'corpo'>]> = [['awave', { bearer: tokenAwave }]];
    for (const agente of AGENTES) {
      const token = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, deps.relogio))).token;
      credenciais.push([`agente ${agente}`, { bearer: token }]);
    }
    for (const papel of PAPEIS) {
      const { cookie } = await criarPessoa(deps, { papel });
      credenciais.push([`pessoa ${papel}`, { bearer: null, semOrigin: false, cabecalhos: { cookie } }]);
    }
    expect(credenciais).toHaveLength(1 + AGENTES.length + PAPEIS.length);
    // Contados depois de criar tokens e sessões, que gravam os próprios eventos.
    const antes = await retrato([demandaId]);
    for (const [quem, op] of credenciais) {
      const r = await ler(decId, op);
      expect(r.status, quem).toBe(403);
      expect(await r.json(), quem).toEqual(SEM_PERMISSAO);
    }
    const anonimo = await ler(decId, { bearer: null });
    expect(anonimo.status).toBe(401);
    expect(await anonimo.json()).toMatchObject({ erro: 'nao_autenticado' });
    expect(await retrato([demandaId])).toEqual(antes);
  });
});

describe('CA-01.5 e SB-03 (c): nada gravado', () => {
  it('200, 403, 404 e 503: o retrato é igual antes e depois de cada um', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const casos: Array<[string, () => Promise<Response>, number]> = [
      ['200', () => ler(decId), 200],
      ['403', () => ler(decId, { bearer: tokenAwave }), 403],
      ['404', () => ler(INEXISTENTE), 404],
      [
        '503',
        async () => {
          // 3 s a cada leitura do relógio monotônico: o prazo total de 8 s vence antes da primeira consulta da leitura.
          let agora = 0;
          const espiao = vi.spyOn(performance, 'now').mockImplementation(() => (agora += 3_000));
          try {
            return await ler(decId);
          } finally {
            espiao.mockRestore();
          }
        },
        503,
      ],
    ];
    for (const [nome, chamar, status] of casos) {
      const antes = await retrato([demandaId]);
      const r = await chamar();
      expect(r.status, nome).toBe(status);
      if (status === 503) expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
      expect(await retrato([demandaId]), nome).toEqual(antes);
    }
  });
});

describe('SB-06: a situação e o andamento nunca divergem', () => {
  it('a rota responde substituido se e só se o andamento do mesmo DEC responde 409 decSubstituido; no vigente, o andamento é 204', async () => {
    const vigente = await preparador.prepararDec();
    const parcial = await preparador.prepararDec();
    expect((await aprovarPelaAdministradora(await v2De(parcial, 'cto_e_administradora'))).resultado).toBe('aprovacao_parcial');
    const completo = await preparador.prepararDec();
    const v2 = await v2De(completo, 'cto_e_administradora');
    await aprovarPelaAdministradora(v2);
    await preparador.aprovar(v2);

    const situacoes: string[] = [];
    for (const [nome, c] of [
      ['CA-01.1', vigente],
      ['v2 de dupla aprovação com só a primeira', parcial],
      ['CA-01.2, v2 com a aprovação completa', completo],
    ] as const) {
      const s = ((await (await ler(c.decId)).json()) as { situacao: string }).situacao;
      const a = await construir.andamento(c.decId, CORPO_CONSTRUINDO);
      const texto = await a.text();
      const recusaPorSubstituido = a.status === 409 && (JSON.parse(texto) as { mensagem: string }).mensagem === MENSAGENS_ANDAMENTO.decSubstituido;
      expect(s === 'substituido', nome).toBe(recusaPorSubstituido);
      if (s === 'vigente') expect(a.status, nome).toBe(204);
      situacoes.push(s);
    }
    expect(situacoes).toEqual(['vigente', 'vigente', 'substituido']);
  });
});

describe('log (RNF-04, SB-05, G3.13)', () => {
  type Linha = Record<string, unknown>;
  const CHAVES = ['atorTipo', 'evento', 'level', 'metodo', 'ms', 'rota', 'status', 'time'];

  it('cada chamada deixa uma linha com evento, rota padrão, status e atorTipo, sem decId, prefixo, wsod_ nem a situação', async () => {
    const v = await preparador.prepararDec();
    const s = await substituido();
    const { cookie } = await criarPessoa(deps, { papel: 'cto' });
    const inicio = linhasDoLog.length;
    // O 404 do id fora do formato sai antes de resolver o ator (C-17): anônimo, como em toda rota.
    const chamadas: Array<[() => Promise<Response>, number, string | undefined, 'integracao' | 'pessoa' | 'anonimo']> = [
      [() => ler(v.decId), 200, undefined, 'integracao'],
      [() => ler(s.decId), 200, undefined, 'integracao'],
      [() => ler(INEXISTENTE), 404, 'nao_encontrado', 'integracao'],
      [() => ler('DEC-xyz'), 404, 'nao_encontrado', 'anonimo'],
      [() => ler(v.decId, { bearer: tokenAwave }), 403, 'sem_permissao', 'integracao'],
      [() => ler(v.decId, { bearer: null, semOrigin: false, cabecalhos: { cookie } }), 403, 'sem_permissao', 'pessoa'],
      [() => ler(v.decId, { bearer: null }), 401, 'nao_autenticado', 'anonimo'],
    ];
    for (const [chamar, status] of chamadas) expect((await chamar()).status).toBe(status);
    const novas = linhasDoLog.slice(inicio);
    expect(novas).toHaveLength(chamadas.length);
    const proibidos = [v.decId, s.decId, INEXISTENTE, 'DEC-xyz', prefixoConstruir, 'vigente', 'substituido', 'wsod_'];
    novas.forEach((bruta, i) => {
      const [, status, codigoErro, atorTipo] = chamadas[i]!;
      const l = JSON.parse(bruta) as Linha;
      const { ms, time, ...resto } = l;
      expect(typeof ms).toBe('number');
      expect(typeof time).toBe('number');
      expect(Object.keys(l).filter((k) => k !== 'codigoErro').sort()).toEqual(CHAVES);
      expect(resto).toEqual({ level: 30, evento: 'requisicao', metodo: 'GET', rota: ROTA, status, atorTipo, ...(codigoErro ? { codigoErro } : {}) });
      for (const p of proibidos) expect(bruta.includes(p), 'texto proibido na linha do log').toBe(false);
      for (const p of [tokenConstruir, textoDepoisDoPrefixo(tokenConstruir), tokenAwave, textoDepoisDoPrefixo(tokenAwave)])
        expect(bruta.includes(p), 'token na linha do log').toBe(false);
    });
  });

  it('nenhuma linha do pino deste arquivo leva token, texto do token depois do prefixo nem wsod_', () => {
    expect(linhasDoLog.length).toBeGreaterThan(0);
    const tudo = linhasDoLog.join('\n');
    for (const p of [tokenConstruir, textoDepoisDoPrefixo(tokenConstruir), tokenAwave, textoDepoisDoPrefixo(tokenAwave), 'wsod_'])
      expect(tudo.includes(p), 'token no log').toBe(false);
  });
});
