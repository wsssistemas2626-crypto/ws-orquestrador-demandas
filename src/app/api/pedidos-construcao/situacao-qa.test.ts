// src/app/api/pedidos-construcao/situacao-qa.test.ts — escrito na 06-T02-testes do DEC-DEM-20261111-0018-v1
// (qa-automacao), ao lado dos testes da T02, sem mudar nenhum deles. O olhar de quem usa a rota da situação como oráculo
// (SB-01 c, SB-02, C-17) e de quem tenta fazê-la divergir do andamento (SB-06):
//   - 403 com o serviço de verdade (não trocado): para cada ator proibido, a resposta e a sequência de consultas ao
//     banco são as mesmas para todo estado do DEC, e nenhuma consulta leva o id do DEC nem lê pacote_decisao;
//   - 404 pela rota: os casos sem pedido gerado por pessoa (os do CA-01.3 e outros forjados pelo migrator) fazem a
//     mesma sequência de consultas do DEC inexistente, e nenhuma lê pacote_decisao; o id com zero à esquerda na versão
//     passa na regex e não é normalizado para o DEC que existe;
//   - id quase igual ao de um DEC com pedido (caixa, espaço, quebra de linha, dígito de largura total, hífen Unicode,
//     versão de cinco dígitos, barra) dá o 404 do inexistente sem tocar o pool do app;
//   - DEC mais novo que não foi aprovado (pendente, devolvido) não substitui, e o DEC vigente sem pedido gerado dá 404.
// Postgres real, tokens e sessões reais, relógio fixo. O token só nasce em tempo de teste e nunca vai a mensagem de
// expect. Dados só fictícios.
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CORPO_CONSTRUINDO } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { tokenDeIntegracao } from '../../../../test/integracoes';
import {
  CONFIRMADO,
  chamadasDoConstruir,
  inserirEventoDoPedido,
  preparadorDePedidos,
  totalDeEventos,
  type CenarioDoPedido,
  type OpChamada,
} from '../../../../test/pedidos-construcao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { AGENTES, PAPEIS } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { MENSAGENS_ANDAMENTO } from '../../../modules/andamento/schemas';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';

const relogio = relogioFixo('2026-11-14T12:00:00Z');
const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
// A tabela do DEC, como o Drizzle a escreve no SQL (identificador entre aspas). O nome sem aspas aparece como valor de
// `evento.entidade` nos parâmetros, não no texto.
const LE_PACOTE = '"pacote_decisao"';
// As consultas do pg-boss não são da requisição (supervise e schedule desligados no teste, mas a regra não depende disso).
const ESQUEMA_DA_FILA = 'pgboss';

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
const construir = chamadasDoConstruir(() => tokenConstruir);
const ler = (decId: string, op: Omit<OpChamada, 'corpo'> = {}) => construir.situacao(decId, op);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'situacao-qa', entregar: (decId) => construir.entregar(decId) });

type Foto = { status: number; cabecalhos: Array<[string, string]>; corpo: string };
type Consulta = { texto: string; valores: string };

// A resposta inteira, para comparar byte a byte: status, cabeçalhos (sem a data) e corpo.
async function foto(r: Response): Promise<Foto> {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

const semBigInt = (_k: string, x: unknown) => (typeof x === 'bigint' ? x.toString() : x);
function consultaDe(args: readonly unknown[]): Consulta {
  const [a, b2] = args;
  if (typeof a === 'string') return { texto: a, valores: JSON.stringify(b2 ?? null, semBigInt) };
  const c = (a ?? {}) as { text?: unknown; values?: unknown };
  return { texto: String(c.text ?? ''), valores: JSON.stringify(c.values ?? b2 ?? null, semBigInt) };
}

// Toda consulta que passa por um pg.Client (o PoolClient herda dele: a transação do serviço, o pool.query do token e o
// Better Auth) durante uma chamada à rota (D-07).
async function comConsultas(chamar: () => Promise<Response>): Promise<{ foto: Foto; consultas: Consulta[] }> {
  const espiao = vi.spyOn(pg.Client.prototype, 'query');
  try {
    const f = await foto(await chamar());
    const consultas = (espiao.mock.calls as unknown as unknown[][]).map(consultaDe).filter((c) => !c.texto.includes(ESQUEMA_DA_FILA));
    return { foto: f, consultas };
  } finally {
    espiao.mockRestore();
  }
}
const textos = (cs: readonly Consulta[]) => cs.map((c) => c.texto);
const levaOId = (cs: readonly Consulta[], decId: string) => cs.some((c) => c.texto.includes(decId) || c.valores.includes(decId));
const lePacote = (cs: readonly Consulta[]) => cs.some((c) => c.texto.includes(LE_PACOTE));

// pedido_gerado de pessoa sem demanda no evento: o helper do migrator sempre põe a demanda, então vai direto.
async function pedidoGeradoSemDemanda(decId: string): Promise<void> {
  await b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, 'pessoa', $2, null, null, 'pacote_decisao', $3, 'pedido_gerado', $4::jsonb)`,
    [relogio.agora().toISOString(), preparador.geradora.usuarioId, decId, JSON.stringify(CONFIRMADO)],
  );
}

// Os DEC dos casos, montados uma vez: só leitura daqui em diante (cada caso confere que nada muda).
type Cenarios = {
  vigente: CenarioDoPedido;
  substituido: CenarioDoPedido;
  semPedido: CenarioDoPedido;
  porAgente: CenarioDoPedido;
  porSistema: CenarioDoPedido;
  porIntegracao: CenarioDoPedido;
  semDemandaNoEvento: CenarioDoPedido;
  naEntidadeDemanda: CenarioDoPedido;
  acaoEmMaiusculas: CenarioDoPedido;
  entregueERecebidoSemGerado: CenarioDoPedido;
  deOutra: CenarioDoPedido;
};
let c: Cenarios;

async function montarCenarios(): Promise<Cenarios> {
  const p = preparador;
  const vigente = await p.prepararDec();
  const substituido = await p.prepararDec();
  await p.aprovar(await p.novoDec(substituido.autora, substituido.demandaId));
  const semPedido = await p.prepararDec({ gerar: false });
  const porAgente = await p.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porAgente.decId, demandaId: porAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
  const porSistema = await p.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porSistema.decId, demandaId: porSistema.demandaId, atorTipo: 'sistema', atorId: 'sistema', prefixo: null });
  const porIntegracao = await p.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porIntegracao.decId, demandaId: porIntegracao.demandaId, atorTipo: 'integracao', atorId: 'construir' });
  const semDemandaNoEvento = await p.prepararDec({ gerar: false });
  await pedidoGeradoSemDemanda(semDemandaNoEvento.decId);
  const naEntidadeDemanda = await p.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, {
    acao: 'pedido_gerado',
    entidade: 'demanda',
    decId: naEntidadeDemanda.decId,
    demandaId: naEntidadeDemanda.demandaId,
    atorTipo: 'pessoa',
    atorId: p.geradora.usuarioId,
    prefixo: null,
    depois: CONFIRMADO,
  });
  const acaoEmMaiusculas = await p.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, {
    acao: 'PEDIDO_GERADO',
    decId: acaoEmMaiusculas.decId,
    demandaId: acaoEmMaiusculas.demandaId,
    atorTipo: 'pessoa',
    atorId: p.geradora.usuarioId,
    prefixo: null,
    depois: CONFIRMADO,
  });
  // O pedido escrito direto: o /construir entregou e recebeu sem geração no painel.
  const entregueERecebidoSemGerado = await p.prepararDec({ gerar: false });
  for (const acao of ['pedido_entregue', 'pedido_recebido']) {
    await inserirEventoDoPedido(b, deps, {
      acao,
      decId: entregueERecebidoSemGerado.decId,
      demandaId: entregueERecebidoSemGerado.demandaId,
      atorTipo: 'integracao',
      atorId: 'construir',
      depois: { sha256: '0'.repeat(64) },
    });
  }
  const deOutra = await p.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, {
    acao: 'pedido_gerado',
    decId: deOutra.decId,
    demandaId: vigente.demandaId,
    atorTipo: 'pessoa',
    atorId: p.geradora.usuarioId,
    prefixo: null,
    depois: CONFIRMADO,
  });
  return {
    vigente,
    substituido,
    semPedido,
    porAgente,
    porSistema,
    porIntegracao,
    semDemandaNoEvento,
    naEntidadeDemanda,
    acaoEmMaiusculas,
    entregueERecebidoSemGerado,
    deOutra,
  };
}

// O id do DEC vigente com a versão escrita com zero à esquerda: passa na regex, e é outro id.
const comZeroNaVersao = (decId: string) => decId.replace(/-v(\d+)$/, '-v0$1');

// Os nomes saem na coleta; as credenciais nascem no beforeAll. `null` no status: o que for, igual em todo estado do DEC,
// e nunca 200 nem 404.
const ATORES: ReadonlyArray<readonly [string, number | null]> = [
  ['awave', 403],
  ...AGENTES.map((a) => [`agente ${a}`, 403] as const),
  ...PAPEIS.map((p) => [`pessoa ${p} com 2FA`, 403] as const),
  ...PAPEIS.map((p) => [`pessoa ${p} sem 2FA`, null] as const),
  ['token do construir adulterado', 401],
];
const credenciais = new Map<string, Omit<OpChamada, 'corpo'>>();

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  credenciais.set('awave', { bearer: await tokenDeIntegracao(deps, 'awave') });
  for (const agente of AGENTES) {
    const token = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, deps.relogio))).token;
    credenciais.set(`agente ${agente}`, { bearer: token });
  }
  for (const papel of PAPEIS) {
    const { cookie } = await criarPessoa(deps, { papel });
    credenciais.set(`pessoa ${papel} com 2FA`, { bearer: null, semOrigin: false, cabecalhos: { cookie } });
    const sem = await criarPessoa(deps, { papel, com2fa: false });
    credenciais.set(`pessoa ${papel} sem 2FA`, { bearer: null, semOrigin: false, cabecalhos: { cookie: sem.cookie } });
  }
  // O mesmo prefixo, o resto trocado no último caractere.
  const ultimo = tokenConstruir.slice(-1) === 'A' ? 'B' : 'A';
  credenciais.set('token do construir adulterado', { bearer: `${tokenConstruir.slice(0, -1)}${ultimo}` });
  c = await montarCenarios();
}, 120_000);

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SB-01 (c), com o serviço de verdade: o 403 não depende do DEC', () => {
  it('a lista tem o awave, os quatro agentes, os dois papéis com e sem 2FA e o token adulterado, cada um com credencial', () => {
    expect(ATORES).toHaveLength(1 + AGENTES.length + 2 * PAPEIS.length + 1);
    expect([...credenciais.keys()].sort()).toEqual(ATORES.map(([n]) => n).sort());
  });

  it.each(ATORES)(
    '%s: a mesma resposta e as mesmas consultas para todo estado do DEC; nenhuma consulta leva o id nem lê pacote_decisao',
    async (nome, esperado) => {
      const op = credenciais.get(nome)!;
      const estados: Array<[string, string]> = [
        ['vigente', c.vigente.decId],
        ['substituído', c.substituido.decId],
        ['sem pedido gerado', c.semPedido.decId],
        ['pedido_gerado de agente', c.porAgente.decId],
        ['pedido_gerado de pessoa noutra demanda', c.deOutra.decId],
        ['entregue e recebido sem geração', c.entregueERecebidoSemGerado.decId],
        ['inexistente', INEXISTENTE],
        ['versão com zero à esquerda', comZeroNaVersao(c.vigente.decId)],
      ];
      const eventos = await totalDeEventos(b);
      // Aquecimento: o que a credencial grava ou atualiza na primeira vez não entra na comparação.
      await ler(INEXISTENTE, op);
      const [primeiro, ...outros] = await (async () => {
        const r: Array<{ estado: string; decId: string; foto: Foto; consultas: Consulta[] }> = [];
        for (const [estado, decId] of estados) r.push({ estado, decId, ...(await comConsultas(() => ler(decId, op))) });
        return r;
      })();
      if (esperado === null) expect([401, 403]).toContain(primeiro!.foto.status);
      else expect(primeiro!.foto.status).toBe(esperado);
      if (esperado === 403) expect(JSON.parse(primeiro!.foto.corpo)).toEqual(SEM_PERMISSAO);
      // O espião enxerga a resolução da credencial: a comparação abaixo não é entre duas listas vazias.
      expect(primeiro!.consultas.length).toBeGreaterThan(0);
      for (const o of outros) {
        expect(o.foto, o.estado).toEqual(primeiro!.foto);
        expect(textos(o.consultas), o.estado).toEqual(textos(primeiro!.consultas));
      }
      for (const o of [primeiro!, ...outros]) {
        expect(levaOId(o.consultas, o.decId), `id do DEC numa consulta (${o.estado})`).toBe(false);
        expect(lePacote(o.consultas), `pacote_decisao lido (${o.estado})`).toBe(false);
      }
      if (esperado === 403) expect(await totalDeEventos(b)).toBe(eventos);
    },
    60_000,
  );
});

describe('SB-02 (b), pela rota: o 404 tem a forma e as consultas do DEC inexistente', () => {
  it('cada caso sem pedido gerado por pessoa na própria demanda: a mesma resposta e a mesma sequência de consultas, sem ler pacote_decisao; nada gravado', async () => {
    const casos: Array<[string, string]> = [
      ['sem pedido gerado', c.semPedido.decId],
      ['pedido_gerado de agente', c.porAgente.decId],
      ['pedido_gerado de sistema', c.porSistema.decId],
      ['pedido_gerado de integração', c.porIntegracao.decId],
      ['pedido_gerado de pessoa sem demanda no evento', c.semDemandaNoEvento.decId],
      ['pedido_gerado de pessoa na entidade demanda', c.naEntidadeDemanda.decId],
      ['PEDIDO_GERADO em maiúsculas', c.acaoEmMaiusculas.decId],
      ['entregue e recebido sem geração', c.entregueERecebidoSemGerado.decId],
      ['versão com zero à esquerda do DEC vigente', comZeroNaVersao(c.vigente.decId)],
    ];
    const eventos = await totalDeEventos(b);
    await ler(INEXISTENTE);
    const referencia = await comConsultas(() => ler(INEXISTENTE));
    expect(referencia.foto.status).toBe(404);
    expect(JSON.parse(referencia.foto.corpo)).toEqual(NAO_ENCONTRADO);
    expect(referencia.consultas.length).toBeGreaterThan(0);
    expect(lePacote(referencia.consultas)).toBe(false);
    for (const [nome, decId] of casos) {
      const r = await comConsultas(() => ler(decId));
      expect(r.foto, nome).toEqual(referencia.foto);
      expect(textos(r.consultas), nome).toEqual(textos(referencia.consultas));
      expect(lePacote(r.consultas), nome).toBe(false);
    }
    // O de outra demanda chega a ler o DEC (o plano o deixa fora da contagem: só existe com evento forjado), mas a
    // resposta é a mesma.
    expect((await comConsultas(() => ler(c.deOutra.decId))).foto).toEqual(referencia.foto);
    // Controle: o vigente lê pacote_decisao e faz mais consultas; então a regra acima enxerga a leitura do DEC.
    const vigente = await comConsultas(() => ler(c.vigente.decId));
    expect(vigente.foto.corpo).toBe('{"situacao":"vigente"}');
    expect(lePacote(vigente.consultas)).toBe(true);
    expect(vigente.consultas.length).toBeGreaterThan(referencia.consultas.length);
    expect(await totalDeEventos(b)).toBe(eventos);
  });
});

describe('C-17, com id quase igual ao de um DEC com pedido: o 404 do inexistente sem tocar o pool do app', () => {
  it('caixa, espaço, quebra de linha, tab, dígito de largura total, hífen Unicode, versão de cinco dígitos, barra e vazio', async () => {
    const id = c.vigente.decId;
    const quaseIguais: Array<[string, string]> = [
      ['minúsculas', id.toLowerCase()],
      ['espaço antes', ` ${id}`],
      ['espaço depois', `${id} `],
      ['quebra de linha no fim', `${id}\n`],
      ['tab no fim', `${id}\t`],
      ['dígito de largura total', id.replace(/\d/, String.fromCodePoint(0xff11))],
      ['hífen Unicode (U+2011)', id.replace('-', String.fromCodePoint(0x2011))],
      ['versão de cinco dígitos', id.replace(/-v\d+$/, '-v10000')],
      ['barra e volta de pasta', `${id}/../${INEXISTENTE}`],
      ['sufixo de SQL', `${id}' or '1'='1`],
      ['vazio', ''],
    ];
    const referencia = await foto(await ler(INEXISTENTE));
    const connect = vi.spyOn(b.poolApp, 'connect');
    const query = vi.spyOn(b.poolApp, 'query');
    for (const [nome, decId] of quaseIguais) expect(await foto(await ler(decId)), nome).toEqual(referencia);
    expect(connect).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});

describe('CA-01.2 nas bordas: só um DEC mais novo aprovado substitui, e a rota e o andamento seguem juntos (SB-06)', () => {
  const situacaoE409 = async (decId: string) => {
    const s = await foto(await ler(decId));
    const a = await construir.andamento(decId, CORPO_CONSTRUINDO);
    const texto = await a.text();
    const porSubstituido = a.status === 409 && (JSON.parse(texto) as { mensagem?: string }).mensagem === MENSAGENS_ANDAMENTO.decSubstituido;
    return { s, porSubstituido };
  };

  it('v2 pendente e v2 devolvido: o v1 segue vigente, e o andamento não recusa por substituído', async () => {
    const pendente = await preparador.prepararDec();
    await preparador.novoDec(pendente.autora, pendente.demandaId);
    const devolvido = await preparador.prepararDec();
    const v2 = await preparador.novoDec(devolvido.autora, devolvido.demandaId);
    expect(
      (await registrarDecisao(deps, preparador.geradora, v2, registrarDecisaoSchema.parse({ statusDecisao: 'devolvida', comentarios: 'Rever o escopo (fictício)' })))
        .resultado,
    ).toBe('devolvida');
    for (const [nome, cen] of [
      ['v2 pendente', pendente],
      ['v2 devolvido', devolvido],
    ] as const) {
      const { s, porSubstituido } = await situacaoE409(cen.decId);
      expect(s.status, nome).toBe(200);
      expect(s.corpo, nome).toBe('{"situacao":"vigente"}');
      expect(porSubstituido, nome).toBe(false);
    }
  });

  it('v1 substituído por um v2 aprovado sem pedido gerado e um v3 pendente: v1 substituido (e o andamento recusa); o v2, vigente sem pedido, dá o 404 do inexistente', async () => {
    const v1 = await preparador.prepararDec();
    const v2 = await preparador.novoDec(v1.autora, v1.demandaId);
    await preparador.aprovar(v2);
    await preparador.novoDec(v1.autora, v1.demandaId);
    const r1 = await situacaoE409(v1.decId);
    expect(r1.s.corpo).toBe('{"situacao":"substituido"}');
    expect(r1.porSubstituido).toBe(true);
    const referencia = await foto(await ler(INEXISTENTE));
    expect(await foto(await ler(v2))).toEqual(referencia);
  });
});
