// QA da T17 (06-T17-testes): bordas e falhas da entrada colando o texto que os testes da construção não cobrem.
// RNF-04 pela rota (o limite de 100.000 caracteres atravessa o leitor de corpo de 512 KB com caractere de 3 bytes),
// CA-05.3 no limite exato, RF-06 e CA-21.3 nas outras leituras (lista e histórico), ordem autorização antes do modo,
// corpo acima de 512 KB, entradas simultâneas sem troca de texto e caractere nulo no texto.
// Banco, Better Auth e token reais (Testcontainers); relógio fixo; só dado fictício (JUR-2026-002, 7.4).
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarPessoa } from '../../../test/sessao';
import { GET as GET_HISTORICO } from '../../app/api/demandas/[id]/historico/route';
import { GET as GET_DEMANDA } from '../../app/api/demandas/[id]/route';
import { POST as POST_ENTRADA } from '../../app/api/demandas/entrada/route';
import { GET as GET_LISTA } from '../../app/api/demandas/route';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { criarTokenServico } from '../acesso/tokens-servico';

const DIA_MS = 86_400_000;
const RE_ID = /^DEM-\d{8}-\d{4}$/;
const CAMPOS = { titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' } as const;
const TEXTO = `Pedido recebido de ${SENTINELAS.email}, telefone ${SENTINELAS.telefone}. ${SENTINELAS.texto}`;

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cookieCto: string;
let tokenOrquestrador: string;
let dia = 0;
const linhasDeLog: string[] = [];

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) =>
  (await b.poolMigrator.query<T>(texto, valores)).rows;
const contar = async (tabela: string) => Number((await consultar<{ n: string }>(`select count(*)::text as n from ${tabela}`))[0]!.n);
const sequencia = async () => (await consultar<{ v: string; chamada: boolean }>('select last_value::text as v, is_called as chamada from demanda_seq'))[0]!;
const textoGuardado = async (demandaId: string) =>
  (await consultar<{ texto: string | null }>('select texto from entrada_bruta where demanda_id = $1', [demandaId]))[0]?.texto;

const estado = async () => ({
  demandas: await contar('demanda'),
  brutas: await contar('entrada_bruta'),
  pendentes: await contar('entrada_pendente'),
  eventos: await contar('evento'),
  seq: await sequencia(),
});

const postar = (corpo: unknown, cred: Pick<OpRequisicao, 'cookie' | 'bearer'> = { cookie: cookieCto }) =>
  chamarRota(POST_ENTRADA, { metodo: 'POST', caminho: '/api/demandas/entrada', corpo, ...cred });

const criarComTexto = async (texto: string): Promise<string> => {
  const r = await postar({ modo: 'manual', ...CAMPOS, texto, origem: { canal: 'email', referencia: SENTINELAS.email } });
  expect(r.status).toBe(201);
  return ((await r.json()) as { demanda: { id: string } }).demanda.id;
};

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenOrquestrador = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'orquestrador', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

// Cada teste num dia próprio do relógio fixo: o limite de 30 demandas por hora (C-36) não liga um teste ao outro, e
// nenhum teste depende da ordem.
beforeEach(() => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * DIA_MS);
});

describe('RNF-04 e CA-05.3 pela rota, no limite', () => {
  it('100.000 caracteres de 3 bytes em UTF-8 (cerca de 300 KB) → 201, e o texto fica igual, com 100.000 caracteres', async () => {
    // '€' tem 3 bytes em UTF-8; com quebras de linha, o JSON passa de 290 KB e fica abaixo dos 512 KB do leitor.
    const texto = `${SENTINELAS.texto}\n${'€'.repeat(100_000 - SENTINELAS.texto.length - 2)}\n`;
    expect(texto.length).toBe(100_000);
    const id = await criarComTexto(texto);
    expect(id).toMatch(RE_ID);
    const guardado = await textoGuardado(id);
    expect(guardado).toBe(texto);
    expect(guardado!.length).toBe(100_000);
  });

  it('100.000 caracteres ASCII → 201; 100.001 → 400 só no campo texto, nada gravado e a sequência parada', async () => {
    const id = await criarComTexto('a'.repeat(100_000));
    expect((await textoGuardado(id))!.length).toBe(100_000);

    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: 'a'.repeat(100_001) });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [{ campo: 'texto', mensagem: 'Este campo aceita até 100.000 caracteres.' }],
    });
    expect(await estado()).toEqual(antes);
  });

  it('modo agente com 100.001 caracteres → 400 no campo texto (o Zod vem antes do 409 do agente desligado)', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'agente', texto: 'a'.repeat(100_001), solicitanteNome: 'Pessoa Ficticia' });
    expect(r.status).toBe(400);
    const json = (await r.json()) as { erro: string; campos: Array<{ campo: string }> };
    expect(json.erro).toBe('entrada_invalida');
    expect(json.campos.map((c) => c.campo)).toEqual(['texto']);
    expect(await estado()).toEqual(antes);
  });

  it('texto acima do limite junto com campo obrigatório faltando → 400 com os dois campos, nada gravado', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'manual', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', texto: `${SENTINELAS.texto}${'a'.repeat(100_000)}` });
    expect(r.status).toBe(400);
    const corpo = await r.text();
    expect(contemSentinela(corpo)).toBe(false);
    const json = JSON.parse(corpo) as { campos: Array<{ campo: string }> };
    expect(json.campos.map((c) => c.campo).sort()).toEqual(['texto', 'titulo']);
    expect(await estado()).toEqual(antes);
  });

  it('corpo acima de 512 KB → 413 com a mensagem do limite, nada gravado e o log sem o texto', async () => {
    const inicio = linhasDeLog.length;
    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: `${SENTINELAS.texto}${'€'.repeat(180_000)}` });
    expect(r.status).toBe(413);
    const corpo = await r.text();
    expect(JSON.parse(corpo)).toEqual({ erro: 'corpo_grande', mensagem: 'O conteúdo enviado passa do limite de 512 KB.' });
    expect(contemSentinela(corpo)).toBe(false);
    expect(await estado()).toEqual(antes);
    const novas = linhasDeLog.slice(inicio);
    expect(novas.some((l) => contemSentinela(l))).toBe(false);
    const daEntrada = novas.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.rota === '/api/demandas/entrada');
    expect(daEntrada.map((l) => [l.status, l.codigoErro])).toEqual([[413, 'corpo_grande']]);
  });
});

describe('RF-06 e CA-21.3: nenhuma outra leitura traz o texto bruto nem a origem', () => {
  it('GET /api/demandas (fila) e GET /api/demandas/:id/historico da demanda criada pela entrada não têm sentinela', async () => {
    const id = await criarComTexto(TEXTO);

    const lista = await chamarRota(GET_LISTA, { caminho: '/api/demandas?limit=100', cookie: cookieCto });
    expect(lista.status).toBe(200);
    const corpoLista = await lista.text();
    const { itens } = JSON.parse(corpoLista) as { itens: Array<Record<string, unknown>> };
    const item = itens.find((i) => i.id === id);
    expect(item).toBeDefined();
    expect(Object.keys(item!)).not.toContain('texto');
    expect(Object.keys(item!)).not.toContain('origem');
    expect(contemSentinela(corpoLista)).toBe(false);

    const historico = await chamarRota(GET_HISTORICO, { caminho: `/api/demandas/${id}/historico`, params: { id }, cookie: cookieCto });
    expect(historico.status).toBe(200);
    const corpoHistorico = await historico.text();
    expect((JSON.parse(corpoHistorico) as { itens: unknown[] }).itens.length).toBeGreaterThan(0);
    expect(contemSentinela(corpoHistorico)).toBe(false);
  });

  it('o GET da demanda pelo token do orquestrador também não traz o texto (a leitura de agente é a mesma vista)', async () => {
    const id = await criarComTexto(TEXTO);
    const g = await chamarRota(GET_DEMANDA, { caminho: `/api/demandas/${id}`, params: { id }, bearer: tokenOrquestrador });
    expect(g.status).toBe(200);
    const corpo = await g.text();
    expect(contemSentinela(corpo)).toBe(false);
    expect(Object.keys(JSON.parse(corpo) as object)).not.toContain('texto');
  });
});

describe('Acesso antes do modo e do corpo', () => {
  it('token do orquestrador no modo agente → 403, não o 409 do agente desligado, e nada gravado', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'agente', texto: TEXTO, solicitanteNome: 'Pessoa Ficticia' }, { bearer: tokenOrquestrador });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await estado()).toEqual(antes);
  });

  it('token do orquestrador com corpo inválido (texto acima do limite) → 403, sem lista de campos', async () => {
    const r = await postar({ modo: 'manual', texto: 'a'.repeat(100_001) }, { bearer: tokenOrquestrador });
    expect(r.status).toBe(403);
    expect(Object.keys((await r.json()) as object).sort()).toEqual(['erro', 'mensagem']);
  });

  it('pessoa sem 2FA com o corpo válido → 403 sem_2fa, nada gravado', async () => {
    // A sessão sem 2FA vale 15 min contados pelo relógio dos Deps (C-08), e o Better Auth data a sessão pelo Date do
    // processo: o Date fica falso na hora do relógio fixo só durante este teste, e a idade da sessão é zero.
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(relogio.agora());
      const { cookie } = await criarPessoa(deps, { papel: 'cto', com2fa: false });
      const antes = await estado();
      const r = await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO }, { cookie });
      expect(r.status).toBe(403);
      expect(((await r.json()) as { erro: string }).erro).toBe('sem_2fa');
      expect(await estado()).toEqual(antes);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Entradas simultâneas', () => {
  it('5 POST ao mesmo tempo → 5 ids diferentes, e cada demanda fica com o próprio texto, sem troca', async () => {
    const textos = Array.from({ length: 5 }, (_, i) => `Texto ficticio ${i} ${SENTINELAS.texto}-${i}`);
    const respostas = await Promise.all(textos.map((texto) => postar({ modo: 'manual', ...CAMPOS, titulo: `Titulo ficticio ${texto.slice(15, 16)}`, texto })));
    expect(respostas.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    const ids = await Promise.all(respostas.map(async (r) => ((await r.json()) as { demanda: { id: string } }).demanda.id));
    expect(new Set(ids).size).toBe(5);
    for (const [i, id] of ids.entries()) {
      expect(id).toMatch(RE_ID);
      expect(await textoGuardado(id)).toBe(textos[i]);
    }
  });
});

// O Postgres recusa \u0000 em text e em jsonb, e nenhum schema de texto o recusa antes: hoje a resposta é um erro, e
// não 400 (achado A-01 da 06-T17-testes, para a decisão do tech-lead). Este teste fixa o que não pode mudar em nenhum
// caso: a demanda não nasce pela metade, e o texto não sai na resposta nem no log.
describe('Caractere nulo no texto colado', () => {
  it('texto com \\u0000 → recusado, sem demanda, texto nem evento gravados, e sem o texto na resposta e no log', async () => {
    const inicio = linhasDeLog.length;
    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: `Linha 1\u0000${SENTINELAS.texto} ${SENTINELAS.email}` });
    expect(r.status).toBeGreaterThanOrEqual(400);
    const corpo = await r.text();
    expect(contemSentinela(corpo)).toBe(false);
    expect(corpo).not.toMatch(/0x00|UTF8|entrada_bruta|insert |select /i);
    const depois = await estado();
    expect({ ...depois, seq: undefined }).toEqual({ ...antes, seq: undefined });
    expect(linhasDeLog.slice(inicio).some((l) => contemSentinela(l))).toBe(false);
  });
});
