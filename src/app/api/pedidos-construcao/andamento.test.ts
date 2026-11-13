// T08 do DEC-DEM-20261111-0017-v1: a rota POST /api/pedidos-construcao/:decId/andamento (RF-01 a RF-03 e RF-12 pela
// rota; RNF-04, RNF-07; AN-01 c e d, AN-03, AN-07 e AN-11 pela rota). Banco, rota e tokens `construir` e `awave` reais
// (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). A requisição é a do
// enviarAndamento de ferramentas/construir/lib/andamento.mjs (aa01e2d): POST, Bearer, `accept` e `content-type` JSON,
// sem `Origin` e sem cookie, corpo de quatro chaves. Cada caso monta os próprios DEC, com autora própria (C-36); as
// contagens são por demanda ou relativas, e o que um caso grava no total do limite ele mesmo apaga: o arquivo não
// depende de ordem. Relógio fixo; o monotônico não é tocado. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { andamentosDa, apagarAndamentos, corpo, CORPO_CONSTRUINDO, eventosDo, inserirAndamento, porStatus, retratoDa } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../../../../test/integracoes';
import { CONFIRMADO, chamadasDoConstruir, inserirEventoDoPedido, preparadorDePedidos, totalDeEventos } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { AGENTES, PAPEIS } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { MENSAGENS_ANDAMENTO } from '../../../modules/andamento/schemas';
import { LIMITE_ANDAMENTO } from '../../../modules/limites';
import { gerarPedido } from '../../../modules/pedido-construcao/gerar';
import * as rotaDemanda from '../demandas/[id]/route';
import * as rotaDemandas from '../demandas/route';
import * as rotaAndamento from './[decId]/andamento/route';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
const MINUTO = 60_000;
const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
// O corpo do CA-02.1 como o /construir o escreve (JSON.stringify do andamento, chaves nesta ordem).
const CORPO_DO_CONSTRUIR = '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao"}';

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let prefixoConstruir: string;
let tokenAwave: string;
// Todas as linhas do pino deste arquivo (RNF-04, AN-11).
const linhasDoLog: string[] = [];

const construir = chamadasDoConstruir(() => tokenConstruir);
const enviar = (decId: string, c: unknown = CORPO_DO_CONSTRUIR, op: Parameters<typeof construir.andamento>[2] = {}) => construir.andamento(decId, c, op);

const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'andamento-rota', entregar: (decId) => construir.entregar(decId) });

// A resposta inteira, para comparar byte a byte: status, cabeçalhos (sem a data) e corpo (visibilidade-agente-0019).
async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

// O texto do token depois de `wsod_` e do prefixo de 8 caracteres: o que nunca pode sair.
const textoDepoisDoPrefixo = (token: string) => token.slice('wsod_'.length + 8);

// O que o enviarAndamento do /construir faz com cada status (01, seção 4; lib/andamento.mjs, aa01e2d), sem importar o
// .mjs da estruturaAutonoma. 401 e 403 lançam lá (problema do token) e não entram aqui.
function situacaoNoConstruir(status: number): 'enviado' | 'fora_do_orquestrador' | 'recusado' | 'erro' {
  if (status === 204 || status === 200) return 'enviado';
  if (status === 404) return 'fora_do_orquestrador';
  if ([400, 409, 422].includes(status)) return 'recusado';
  return 'erro';
}

// N linhas de andamento do DEC pelo migrator, numa instrução só (o estado da última é o padrão de inserirAndamento).
async function linhasDoDec(demandaId: string, decId: string, n: number, gravadoEm: Date): Promise<void> {
  await b.poolMigrator.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select $1, $2, 'construindo', 0, 1, 'em_construcao', 'ficticio', $3 from generate_series(1, $4::int)`,
    [demandaId, decId, gravadoEm.toISOString(), n],
  );
}

const linhasNaJanela = async () =>
  Number(
    (await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from andamento_construcao where gravado_em > $1`, [new Date(relogio.agora().getTime() - 60 * MINUTO).toISOString()]))
      .rows[0]!.n,
  );

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

describe('a rota', () => {
  it('só exporta POST, com a ação registrar_andamento e o padrão do arquivo', () => {
    const metodos = Object.keys(rotaAndamento as Record<string, unknown>).filter((k) => /^[A-Z]+$/.test(k));
    expect(metodos).toEqual(['POST']);
    expect(rotaAndamento.POST.meta).toMatchObject({ acao: 'registrar_andamento', rota: '/api/pedidos-construcao/[decId]/andamento' });
  });
});

describe('POST /api/pedidos-construcao/:decId/andamento (RF-02, RNF-07)', () => {
  it('CA-01.1 e CA-02.1: a requisição exata do /construir num DEC com pedido gerado → 204 sem corpo, no-store e nosniff, sem location; o mesmo envio de novo → 204', async () => {
    expect(JSON.stringify(CORPO_CONSTRUINDO)).toBe(CORPO_DO_CONSTRUIR);
    const { demandaId, decId } = await preparador.prepararDec();
    const r = await enviar(decId);
    expect(r.status).toBe(204);
    expect(await r.text()).toBe('');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('location')).toBeNull();
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    const gravado = await andamentosDa(b, demandaId);
    expect(gravado).toHaveLength(1);
    expect(gravado[0]).toMatchObject({ dec_id: decId, fase: 'construindo', tarefas_prontas: 9, tarefas_total: 17, status_construcao: 'em_construcao', ator_token_prefixo: prefixoConstruir });
    const deNovo = await enviar(decId);
    expect(deNovo.status).toBe(204);
    expect(await deNovo.text()).toBe('');
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
  });

  it('CA-02.6: entendendo_o_pedido 0/0 → 204; -0 em tarefasProntas → 204 e a linha com 0', async () => {
    const a = await preparador.prepararDec();
    expect((await enviar(a.decId, { fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, status: 'em_construcao' })).status).toBe(204);
    expect(await andamentosDa(b, a.demandaId)).toMatchObject([{ fase: 'entendendo_o_pedido', tarefas_prontas: 0, tarefas_total: 0 }]);
    const z = await preparador.prepararDec();
    const r = await enviar(z.decId, '{"fase":"construindo","tarefasProntas":-0,"tarefasTotal":17,"status":"em_construcao"}');
    expect(r.status).toBe(204);
    const [linha] = await andamentosDa(b, z.demandaId);
    expect(linha).toMatchObject({ fase: 'construindo', tarefas_total: 17 });
    expect(Object.is(linha!.tarefas_prontas, 0)).toBe(true);
  });

  it('CA-02.5 e CA-02.7: JSON malformado 400, text/plain 415, DEC-xyz 404 sem tocar o banco, 600 KB 413; nada gravado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const antes = await retratoDa(b, demandaId);
    const total = await totalDeEventos(b);

    const malformado = await enviar(decId, '{"fase":"construindo","tarefasProntas":9');
    expect(malformado.status).toBe(400);
    expect(await malformado.json()).toEqual({ erro: 'entrada_invalida', mensagem: 'O conteúdo enviado não é um JSON válido.' });

    const texto = await enviar(decId, CORPO_DO_CONSTRUIR, { cabecalhos: { 'content-type': 'text/plain' } });
    expect(texto.status).toBe(415);
    expect(((await texto.json()) as { erro: string }).erro).toBe('tipo_nao_suportado');

    const grande = await enviar(decId, `{"fase":"${'x'.repeat(600 * 1024)}"}`);
    expect(grande.status).toBe(413);
    expect(((await grande.json()) as { erro: string }).erro).toBe('corpo_grande');

    // C-17: a regex do id vem antes de tudo; nem a conexão nem uma consulta saem do pool do app.
    const connect = vi.spyOn(b.poolApp, 'connect');
    const query = vi.spyOn(b.poolApp, 'query');
    try {
      const fora = await enviar('DEC-xyz');
      expect(fora.status).toBe(404);
      expect(await fora.json()).toEqual(NAO_ENCONTRADO);
      expect(connect).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    } finally {
      connect.mockRestore();
      query.mockRestore();
    }

    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(total);
  });
});

// DEC aprovado de uma demanda nova, sem pedido gerado, cujo pedido_gerado de pessoa (forjado pelo migrator) aponta para
// a demanda `alvo` (AN-03, demanda divergente).
async function decDeOutraDemanda(alvo: string) {
  const x = await preparador.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: x.decId, demandaId: alvo, atorTipo: 'pessoa', atorId: preparador.geradora.usuarioId, prefixo: null, depois: CONFIRMADO });
  return x;
}

// v1 sem pedido gerado, substituído pelo v2 aprovado e gerado.
async function substituidoSemPedido() {
  const c = await preparador.prepararDec({ gerar: false });
  const v2 = await preparador.novoDec(c.autora, c.demandaId);
  await preparador.aprovar(v2);
  await gerarPedido(deps, preparador.geradora, v2, CONFIRMADO);
  return c;
}

describe('CA-03.1 a CA-03.4 e AN-03 pela rota: o 404 é o do DEC inexistente, byte a byte', () => {
  it('fora do formato, sem pedido, substituído sem pedido, de outra demanda, de agente, de sistema, de pessoa na entidade demanda e sem demanda: mesmo status, cabeçalhos e corpo; nada muda', async () => {
    // A demanda em construção que o envio pelo DEC de outra demanda tentaria mover.
    const vitima = await preparador.prepararDec();
    await porStatus(b, vitima.demandaId, 'em_construcao');
    const semPedido = await preparador.prepararDec({ gerar: false });
    const substituido = await substituidoSemPedido();
    const deOutra = await decDeOutraDemanda(vitima.demandaId);
    const porAgente = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porAgente.decId, demandaId: porAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    const porSistema = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porSistema.decId, demandaId: porSistema.demandaId, atorTipo: 'sistema', atorId: 'sistema', prefixo: null });
    const entidadeErrada = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, {
      acao: 'pedido_gerado',
      decId: entidadeErrada.decId,
      demandaId: entidadeErrada.demandaId,
      atorTipo: 'pessoa',
      atorId: preparador.geradora.usuarioId,
      entidade: 'demanda',
      prefixo: null,
      depois: CONFIRMADO,
    });
    const semDemanda = await preparador.prepararDec({ gerar: false });
    await b.poolMigrator.query(
      `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
       values ($1, 'pessoa', $2, null, null, 'pacote_decisao', $3, 'pedido_gerado', $4::jsonb)`,
      [relogio.agora().toISOString(), preparador.geradora.usuarioId, semDemanda.decId, JSON.stringify(CONFIRMADO)],
    );

    const demandas = [vitima, semPedido, substituido, deOutra, porAgente, porSistema, entidadeErrada, semDemanda].map((c) => c.demandaId);
    const antes = await Promise.all(demandas.map((d) => retratoDa(b, d)));
    const totalAntes = await totalDeEventos(b);

    const referencia = await foto(await enviar(INEXISTENTE));
    expect(referencia.status).toBe(404);
    expect(JSON.parse(referencia.corpo)).toEqual(NAO_ENCONTRADO);
    expect(referencia.cabecalhos.map(([k]) => k)).toEqual(['cache-control', 'content-type', 'referrer-policy', 'x-content-type-options']);
    const casos: Array<[string, string]> = [
      ['fora do formato', 'DEC-xyz'],
      ['sem pedido gerado', semPedido.decId],
      ['substituído sem pedido', substituido.decId],
      ['de outra demanda (evento de pessoa apontando para a demanda em construção)', deOutra.decId],
      ['pedido_gerado de agente', porAgente.decId],
      ['pedido_gerado de sistema', porSistema.decId],
      ['pedido_gerado de pessoa na entidade demanda', entidadeErrada.decId],
      ['pedido_gerado de pessoa sem demanda', semDemanda.decId],
    ];
    const corpos = [CORPO_DO_CONSTRUIR, JSON.stringify(corpo({ fase: 'documentando', tarefasProntas: 17, status: 'cancelado' }))];
    for (const [nome, decId] of casos) {
      for (const c of corpos) expect(await foto(await enviar(decId, c)), nome).toEqual(referencia);
    }
    // O inexistente com o corpo que mudaria o status também é a referência.
    expect(await foto(await enviar(INEXISTENTE, corpos[1]))).toEqual(referencia);
    expect(await Promise.all(demandas.map((d) => retratoDa(b, d)))).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(totalAntes);

    // Controle: a mesma rota, com o DEC da vítima (pedido gerado por pessoa), chega ao serviço e grava.
    const ok = await foto(await enviar(vitima.decId));
    expect(ok).toMatchObject({ status: 204, corpo: '' });
    expect(await andamentosDa(b, vitima.demandaId)).toHaveLength(1);
  });
});

describe('409 pela rota (CA-05.8 e status final)', () => {
  it('DEC substituído com pedido gerado → 409 decSubstituido, sem citar o substituto; demanda entregue com em_construcao → 409 statusFinal; nada muda', async () => {
    const s = await preparador.prepararDec();
    const v2 = await preparador.novoDec(s.autora, s.demandaId);
    await preparador.aprovar(v2);
    const antesS = await retratoDa(b, s.demandaId);
    const r1 = await enviar(s.decId);
    expect(r1.status).toBe(409);
    const t1 = await r1.text();
    expect(JSON.parse(t1)).toEqual({ erro: 'conflito', mensagem: MENSAGENS_ANDAMENTO.decSubstituido });
    expect(t1).not.toContain(v2);
    expect(await retratoDa(b, s.demandaId)).toEqual(antesS);

    const f = await preparador.prepararDec();
    await porStatus(b, f.demandaId, 'entregue');
    const antesF = await retratoDa(b, f.demandaId);
    const r2 = await enviar(f.decId);
    expect(r2.status).toBe(409);
    const t2 = await r2.text();
    expect(JSON.parse(t2)).toEqual({ erro: 'conflito', mensagem: MENSAGENS_ANDAMENTO.statusFinal });
    expect(t2).not.toContain('entregue');
    expect(await retratoDa(b, f.demandaId)).toEqual(antesF);
  });
});

describe('só o /construir (CA-01.2 e CA-01.5, AN-01 c e d)', () => {
  it('CA-01.2: com corpo válido num DEC com pedido gerado, awave, os quatro agentes, cto e administradora (sessão com 2FA e Origin certo) → 403 sem_permissao; nada muda', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const credenciais: Array<[string, Parameters<typeof enviar>[2]]> = [['awave', { bearer: tokenAwave }]];
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
    const antes = await retratoDa(b, demandaId);
    const total = await totalDeEventos(b);
    for (const [quem, op] of credenciais) {
      const r = await enviar(decId, CORPO_DO_CONSTRUIR, op);
      expect(r.status, quem).toBe(403);
      expect(await r.json(), quem).toEqual(SEM_PERMISSAO);
    }
    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(total);
  });

  it('CA-01.5: o token construir em GET /api/demandas/:id, POST /api/demandas e PATCH /api/demandas/:id → 403; nada muda', async () => {
    const { demandaId } = await preparador.prepararDec();
    const antes = await retratoDa(b, demandaId);
    const demandas = Number((await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from demanda`)).rows[0]!.n);
    const bearer = { bearer: tokenConstruir, semOrigin: true };
    const respostas = [
      await chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${demandaId}`, params: { id: demandaId }, ...bearer }),
      await chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', corpo: CORPO_DO_AWAVE, ...bearer }),
      await chamarRota(rotaDemanda.PATCH, { metodo: 'PATCH', caminho: `/api/demandas/${demandaId}`, params: { id: demandaId }, corpo: { status: 'em_construcao' }, ...bearer }),
    ];
    for (const [i, r] of respostas.entries()) {
      expect(r.status, `chamada ${i}`).toBe(403);
      expect(await r.json(), `chamada ${i}`).toEqual(SEM_PERMISSAO);
    }
    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(Number((await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from demanda`)).rows[0]!.n)).toBe(demandas);
  });
});

describe('limite pela rota (CA-12.1 a CA-12.5, AN-07)', () => {
  const LIMITE_POR_DEC = { erro: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem };
  const LIMITE_TOTAL = { erro: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.total.mensagem };

  it('CA-12.1 e CA-12.2: com 60 linhas do DEC no último minuto, estado novo → 429 por DEC sem gravar; o mesmo estado da última → 204 sem gravar', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    for (let i = 0; i < LIMITE_ANDAMENTO.porDec.maximo; i++) await inserirAndamento(b, { demandaId, decId, gravadoEm: new Date(relogio.agora().getTime() - 30_000) });
    const antes = await retratoDa(b, demandaId);
    const r = await enviar(decId);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual(LIMITE_POR_DEC);
    expect(await retratoDa(b, demandaId)).toEqual(antes);
    const igual = await enviar(decId, { fase: 'construindo', tarefasProntas: 0, tarefasTotal: 1, status: 'em_construcao' });
    expect(igual.status).toBe(204);
    expect(await retratoDa(b, demandaId)).toEqual(antes);
  });

  it('CA-12.2: uma gravação e depois 200 envios no mesmo estado → todos 204, uma linha e um andamento_registrado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    expect((await enviar(decId)).status).toBe(204);
    const status: number[] = [];
    for (let i = 0; i < 200; i++) status.push((await enviar(decId)).status);
    expect(status).toEqual(Array.from({ length: 200 }, () => 204));
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
    expect(await eventosDo(b, decId, 'andamento_registrado')).toHaveLength(1);
  });

  it('CA-12.3: o DEC A no limite não segura o DEC B (204)', async () => {
    const a = await preparador.prepararDec();
    await linhasDoDec(a.demandaId, a.decId, LIMITE_ANDAMENTO.porDec.maximo, new Date(relogio.agora().getTime() - MINUTO));
    const r = await enviar(a.decId);
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual(LIMITE_POR_DEC);
    const outro = await preparador.prepararDec();
    expect((await enviar(outro.decId)).status).toBe(204);
    expect(await andamentosDa(b, outro.demandaId)).toHaveLength(1);
  });

  it('CA-12.3 (D-14): 599 linhas na janela (o resto num terceiro DEC) → o 600º envio, de outro DEC, 204; o seguinte, de um quarto DEC, 429 total sem gravar', async () => {
    const terceiro = await preparador.prepararDec();
    const b600 = await preparador.prepararDec();
    const c601 = await preparador.prepararDec();
    try {
      const ja = await linhasNaJanela();
      expect(ja).toBeLessThan(LIMITE_ANDAMENTO.total.maximo - 1);
      await linhasDoDec(terceiro.demandaId, terceiro.decId, LIMITE_ANDAMENTO.total.maximo - 1 - ja, new Date(relogio.agora().getTime() - MINUTO));
      expect(await linhasNaJanela()).toBe(LIMITE_ANDAMENTO.total.maximo - 1);
      expect((await enviar(b600.decId)).status).toBe(204);
      expect(await linhasNaJanela()).toBe(LIMITE_ANDAMENTO.total.maximo);
      const antes = await retratoDa(b, c601.demandaId);
      const r = await enviar(c601.decId);
      expect(r.status).toBe(429);
      expect(await r.json()).toEqual(LIMITE_TOTAL);
      expect(await retratoDa(b, c601.demandaId)).toEqual(antes);
    } finally {
      // As linhas do terceiro DEC saem da janela dos outros casos (só o migrator apaga, AN-10).
      await apagarAndamentos(b, terceiro.demandaId);
      await apagarAndamentos(b, b600.demandaId);
    }
  });

  it('CA-12.4: o ritmo do /construir, 30 estados diferentes, um a cada 2 minutos → todos 204 e 30 linhas', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const status: number[] = [];
    for (let i = 0; i < 30; i++) {
      status.push((await enviar(decId, corpo({ tarefasProntas: i, tarefasTotal: 30 }))).status);
      relogio.avancar(2 * MINUTO);
    }
    expect(status).toEqual(Array.from({ length: 30 }, () => 204));
    expect(await andamentosDa(b, demandaId)).toHaveLength(30);
  });

  it('CA-12.5: com 59 linhas do DEC, dois envios de estados diferentes ao mesmo tempo → um 204 e um 429; 60 linhas', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await linhasDoDec(demandaId, decId, LIMITE_ANDAMENTO.porDec.maximo - 1, new Date(relogio.agora().getTime() - MINUTO));
    const respostas = await Promise.all([enviar(decId, corpo({ tarefasProntas: 5 })), enviar(decId, corpo({ tarefasProntas: 6 }))]);
    expect(respostas.map((r) => r.status).sort()).toEqual([204, 429]);
    const recusada = respostas.find((r) => r.status === 429)!;
    expect(await recusada.json()).toEqual(LIMITE_POR_DEC);
    expect(await andamentosDa(b, demandaId)).toHaveLength(LIMITE_ANDAMENTO.porDec.maximo);
  });
});

describe('o que o /construir faz com cada resposta (01, seção 4)', () => {
  it('204 → enviado; 404 → fora_do_orquestrador; 409, 422 e 400 → recusado; 429 → erro', async () => {
    const ok = await preparador.prepararDec();
    const semPedido = await preparador.prepararDec({ gerar: false });
    const final = await preparador.prepararDec();
    await porStatus(b, final.demandaId, 'encerrada');
    const cheio = await preparador.prepararDec();
    await linhasDoDec(cheio.demandaId, cheio.decId, LIMITE_ANDAMENTO.porDec.maximo, new Date(relogio.agora().getTime() - MINUTO));
    const casos: Array<[string, () => Promise<Response>, number, ReturnType<typeof situacaoNoConstruir>]> = [
      ['gravado', () => enviar(ok.decId), 204, 'enviado'],
      ['mesmo estado', () => enviar(ok.decId), 204, 'enviado'],
      ['DEC inexistente', () => enviar(INEXISTENTE), 404, 'fora_do_orquestrador'],
      ['DEC sem pedido gerado (pedido escrito direto, A3)', () => enviar(semPedido.decId), 404, 'fora_do_orquestrador'],
      ['status final', () => enviar(final.decId, corpo({ status: 'construido' })), 409, 'recusado'],
      ['corpo fora do formato', () => enviar(ok.decId, { ...CORPO_CONSTRUINDO, nota: 'x' }), 422, 'recusado'],
      ['JSON malformado', () => enviar(ok.decId, '{"fase":'), 400, 'recusado'],
      ['limite', () => enviar(cheio.decId), 429, 'erro'],
    ];
    for (const [nome, chamar, status, situacao] of casos) {
      const r = await chamar();
      expect(r.status, nome).toBe(status);
      expect(situacaoNoConstruir(r.status), nome).toBe(situacao);
    }
  });
});

describe('log (RNF-04, AN-11, G3.12)', () => {
  type Linha = Record<string, unknown>;
  const CHAVES = ['atorTipo', 'evento', 'level', 'metodo', 'ms', 'rota', 'status', 'time'];

  // A linha é só a de rota(): as chaves da lista, sem decId, fase, números, prefixo nem token. `ms` e o `time` do pino
  // são números do relógio real e saem da comparação de texto.
  function conferirLinha(bruta: string, proibidos: readonly string[]) {
    const l = JSON.parse(bruta) as Linha;
    const { ms, time, ...resto } = l;
    expect(typeof ms).toBe('number');
    expect(typeof time).toBe('number');
    expect(Object.keys(l).filter((k) => k !== 'codigoErro').sort()).toEqual(CHAVES);
    expect(resto).toMatchObject({ evento: 'requisicao', metodo: 'POST', rota: '/api/pedidos-construcao/[decId]/andamento' });
    const texto = JSON.stringify(resto);
    for (const p of proibidos) expect(texto.includes(p), 'texto proibido na linha do log').toBe(false);
    for (const p of [tokenConstruir, textoDepoisDoPrefixo(tokenConstruir), tokenAwave, textoDepoisDoPrefixo(tokenAwave), 'wsod_'])
      expect(bruta.includes(p), 'token na linha do log').toBe(false);
    return resto;
  }

  it('cada resposta da rota gera uma linha com evento, rota padrão, status e atorTipo, sem decId, prefixo, wsod_, fase nem números do corpo', async () => {
    const ok = await preparador.prepararDec();
    const final = await preparador.prepararDec();
    await porStatus(b, final.demandaId, 'entregue');
    const cheio = await preparador.prepararDec();
    await linhasDoDec(cheio.demandaId, cheio.decId, LIMITE_ANDAMENTO.porDec.maximo, new Date(relogio.agora().getTime() - MINUTO));
    const inicio = linhasDoLog.length;
    // O 404 do id fora do formato e o 415 saem antes de resolver o ator (C-17 e C-15): anônimo, como em toda rota.
    const chamadas: Array<[() => Promise<Response>, number, string | undefined, 'integracao' | 'anonimo']> = [
      [() => enviar(ok.decId), 204, undefined, 'integracao'],
      [() => enviar(ok.decId), 204, undefined, 'integracao'],
      [() => enviar(INEXISTENTE), 404, 'nao_encontrado', 'integracao'],
      [() => enviar('DEC-xyz'), 404, 'nao_encontrado', 'anonimo'],
      [() => enviar(final.decId), 409, 'conflito', 'integracao'],
      [() => enviar(ok.decId, { ...CORPO_CONSTRUINDO, tarefasProntas: 18 }), 422, 'nao_processavel', 'integracao'],
      [() => enviar(ok.decId, '{"fase":'), 400, 'entrada_invalida', 'integracao'],
      [() => enviar(ok.decId, CORPO_DO_CONSTRUIR, { cabecalhos: { 'content-type': 'text/plain' } }), 415, 'tipo_nao_suportado', 'anonimo'],
      [() => enviar(cheio.decId), 429, 'limite_excedido', 'integracao'],
      [() => enviar(ok.decId, CORPO_DO_CONSTRUIR, { bearer: tokenAwave }), 403, 'sem_permissao', 'integracao'],
    ];
    for (const [chamar, status] of chamadas) expect((await chamar()).status).toBe(status);
    const novas = linhasDoLog.slice(inicio);
    expect(novas).toHaveLength(chamadas.length);
    const proibidos = [ok.decId, final.decId, cheio.decId, INEXISTENTE, 'DEC-xyz', prefixoConstruir, 'construindo', 'em_construcao', '17'];
    novas.forEach((bruta, i) => {
      const [, status, codigoErro, atorTipo] = chamadas[i]!;
      expect(conferirLinha(bruta, proibidos)).toEqual({
        level: 30,
        evento: 'requisicao',
        metodo: 'POST',
        rota: '/api/pedidos-construcao/[decId]/andamento',
        status,
        atorTipo,
        ...(codigoErro ? { codigoErro } : {}),
      });
    });
  });

  it('nenhuma linha do pino deste arquivo, de nenhuma rota, leva token, texto do token depois do prefixo nem wsod_', () => {
    expect(linhasDoLog.length).toBeGreaterThan(0);
    const tudo = linhasDoLog.join('\n');
    for (const p of [tokenConstruir, textoDepoisDoPrefixo(tokenConstruir), tokenAwave, textoDepoisDoPrefixo(tokenAwave), 'wsod_'])
      expect(tudo.includes(p), 'token no log').toBe(false);
  });
});
