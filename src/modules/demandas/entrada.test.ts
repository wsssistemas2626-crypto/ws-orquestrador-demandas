// Entrada colando o texto (T17): RF-05 (CA-05.1, CA-05.3), RF-06 (a leitura da demanda nunca traz o texto bruto) e
// RNF-04 (100.000 caracteres). Banco, Better Auth e tokens reais (Testcontainers); o relógio é o fixo (RNF-15). O texto
// colado é sempre fictício, com os sentinelas de test/sentinelas.ts (JUR-2026-002, 7.4).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarPessoa } from '../../../test/sessao';
import { GET as GET_DEMANDA } from '../../app/api/demandas/[id]/route';
import { POST as POST_ENTRADA } from '../../app/api/demandas/entrada/route';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { criarTokenServico } from '../acesso/tokens-servico';
import { LIMITE_TEXTO_BRUTO, MENSAGEM_ORQUESTRADOR_DESLIGADO, entradaSchema, registrarEntrada, type Entrada } from './entrada';
import { obterTextoRecebido } from './texto-recebido';

const DIA_MS = 86_400_000;
const RE_ID = /^DEM-\d{8}-\d{4}$/;
const CAMPOS = { titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' } as const;
const TEXTO = `Pedido recebido de ${SENTINELAS.email}, telefone ${SENTINELAS.telefone}. ${SENTINELAS.texto}`;
const UUID_FICTICIO = '6f1c2b0a-4d3e-4f5a-9b8c-7d6e5f4a3b2c';

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let cto: AtorPessoa;
let cookieCto: string;
let tokenOrquestrador: string;
let dia = 0;
const linhasDeLog: string[] = [];

const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'Ab3dE5gH' };

const manual = (extra: Record<string, unknown> = {}): Entrada => entradaSchema.parse({ modo: 'manual', ...CAMPOS, ...extra });

async function capturar(p: Promise<unknown>): Promise<ErroDominio> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroDominio) return e;
    throw e;
  }
  throw new Error('esperava ErroDominio');
}

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) =>
  (await b.poolMigrator.query<T>(texto, valores)).rows;
const contar = async (tabela: string, onde = 'true', valores: unknown[] = []) =>
  Number((await consultar<{ n: string }>(`select count(*)::text as n from ${tabela} where ${onde}`, valores))[0]!.n);
const contarJobsDeAgente = () => contar('pgboss.job', 'name = $1', ['agente.executar']);
const sequencia = async () => (await consultar<{ v: string; chamada: boolean }>('select last_value::text as v, is_called as chamada from demanda_seq'))[0]!;
const linhaBruta = async (demandaId: string) =>
  (await consultar<{ texto: string | null; origem: unknown; recebida_em: Date; expurgada_em: Date | null }>(
    'select texto, origem, recebida_em, expurgada_em from entrada_bruta where demanda_id = $1',
    [demandaId],
  ))[0];

type Estado = { demandas: number; brutas: number; pendentes: number; eventos: number; seq: { v: string; chamada: boolean } };
const estado = async (): Promise<Estado> => ({
  demandas: await contar('demanda'),
  brutas: await contar('entrada_bruta'),
  pendentes: await contar('entrada_pendente'),
  eventos: await contar('evento'),
  seq: await sequencia(),
});

const postar = (corpo: unknown, cred: Pick<OpRequisicao, 'cookie' | 'bearer'> = { cookie: cookieCto }) =>
  chamarRota(POST_ENTRADA, { metodo: 'POST', caminho: '/api/demandas/entrada', corpo, ...cred });

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
  const pessoa = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = pessoa.cookie;
  cto = { tipo: 'pessoa', usuarioId: pessoa.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  tokenOrquestrador = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'orquestrador', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

// Cada teste num dia próprio: o limite de 30 demandas por hora (C-36) de um teste não entra no outro. A sessão tem 2FA,
// e o Better Auth data a sessão pelo Date do processo, não por este relógio.
beforeEach(() => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * DIA_MS);
});

describe('entradaSchema', () => {
  it('RNF-04: o texto aceita até 100.000 caracteres; 100.001 é recusado no campo texto', () => {
    expect(LIMITE_TEXTO_BRUTO).toBe(100_000);
    expect(entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, texto: 'a'.repeat(100_000) }).success).toBe(true);
    const r = entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, texto: 'a'.repeat(100_001) });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join('.'))).toEqual(['texto']);
  });

  it('modo manual exige os campos da demanda (título, tipo e solicitante)', () => {
    const r = entradaSchema.safeParse({ modo: 'manual', texto: 'x' });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join('.')).sort()).toEqual(['solicitanteNome', 'tipo', 'titulo']);
  });

  it('modo agente exige texto não vazio e o nome do solicitante; até 100.000 caracteres', () => {
    expect(entradaSchema.safeParse({ modo: 'agente', texto: '   ', solicitanteNome: 'Pessoa Ficticia' }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'agente', texto: 'x' }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'agente', texto: 'a'.repeat(100_001), solicitanteNome: 'Pessoa Ficticia' }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'agente', texto: 'x', solicitanteNome: 'Pessoa Ficticia', solicitantePapel: 'produto' }).success).toBe(true);
  });

  it('modo ausente ou fora da lista é recusado', () => {
    expect(entradaSchema.safeParse({ ...CAMPOS }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'email', ...CAMPOS }).success).toBe(false);
  });

  it('origem: canal só da lista e referência até 500 caracteres', () => {
    expect(entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, texto: 'x', origem: { canal: 'whatsapp' } }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, texto: 'x', origem: { referencia: 'r'.repeat(501) } }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, texto: 'x', origem: { canal: 'email', referencia: 'Assunto ficticio' } }).success).toBe(true);
  });

  it('entradaPendenteId só como uuid', () => {
    expect(entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, entradaPendenteId: 'abc' }).success).toBe(false);
    expect(entradaSchema.safeParse({ modo: 'manual', ...CAMPOS, entradaPendenteId: UUID_FICTICIO }).success).toBe(true);
  });

  it('C-11: campos de autoria e de data do corpo são descartados, no modo manual e no modo agente', () => {
    const autoria = { autorTipo: 'pessoa', autorId: 'x', rascunhoAgente: false, responsavel: 'x', registradaPor: 'x', recebidaEm: '2020-01-01' };
    const m = entradaSchema.parse({ modo: 'manual', ...CAMPOS, ...autoria });
    const a = entradaSchema.parse({ modo: 'agente', texto: 'x', solicitanteNome: 'Pessoa Ficticia', ...autoria });
    for (const chave of Object.keys(autoria)) {
      expect(m).not.toHaveProperty(chave);
      expect(a).not.toHaveProperty(chave);
    }
  });
});

describe('registrarEntrada (modo manual)', () => {
  it('CA-05.1: orquestrador desligado, texto fictício colado e campos preenchidos → demanda com texto associado e nenhum job de IA', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO, origem: { canal: 'email', referencia: 'Assunto ficticio' } }));
    expect(r.tipo).toBe('demanda');
    if (r.tipo !== 'demanda') return;
    expect(r.demanda.id).toMatch(RE_ID);
    expect(r.demanda.status).toBe('nova');
    expect(r.demanda.responsavel).toEqual({ tipo: 'pessoa', nome: expect.any(String) });
    const eb = await linhaBruta(r.demanda.id);
    expect(eb!.texto).toBe(TEXTO);
    expect(eb!.origem).toEqual({ canal: 'email', referencia: 'Assunto ficticio' });
    expect(eb!.recebida_em.toISOString()).toBe(relogio.agora().toISOString());
    expect(eb!.expurgada_em).toBeNull();
    expect(await contar('execucao_agente')).toBe(0);
    expect(await contarJobsDeAgente()).toBe(0);
  });

  it('RF-06: a vista devolvida não traz texto, origem nem sentinela', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO, origem: { canal: 'mensagem', referencia: SENTINELAS.nome } }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    expect(Object.keys(r.demanda)).not.toContain('texto');
    expect(Object.keys(r.demanda)).not.toContain('origem');
    expect(contemSentinela(JSON.stringify(r.demanda))).toBe(false);
  });

  it('C-30: o histórico da demanda criada pela entrada não guarda nada do texto nem da origem', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO, origem: { referencia: SENTINELAS.nome } }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    const eventos = await consultar<{ acao: string; tudo: string }>(
      'select acao, row_to_json(e)::text as tudo from evento e where demanda_id = $1',
      [r.demanda.id],
    );
    expect(eventos.map((e) => e.acao)).toEqual(['demanda_criada']);
    expect(eventos.some((e) => contemSentinela(e.tudo))).toBe(false);
  });

  it('sem texto, ou só com espaços, cria a demanda sem linha de texto bruto', async () => {
    const semTexto = await registrarEntrada(deps, cto, manual());
    const soEspacos = await registrarEntrada(deps, cto, manual({ texto: '  \n\t ' }));
    for (const r of [semTexto, soEspacos]) {
      if (r.tipo !== 'demanda') throw new Error('esperava demanda');
      expect(await linhaBruta(r.demanda.id)).toBeUndefined();
    }
  });

  it('origem sem texto não é gravada; origem vazia fica nula', async () => {
    const semTexto = await registrarEntrada(deps, cto, manual({ origem: { canal: 'email', referencia: SENTINELAS.email } }));
    if (semTexto.tipo !== 'demanda') throw new Error('esperava demanda');
    expect(await linhaBruta(semTexto.demanda.id)).toBeUndefined();

    const vazia = await registrarEntrada(deps, cto, manual({ texto: 'Texto ficticio', origem: { referencia: '   ' } }));
    if (vazia.tipo !== 'demanda') throw new Error('esperava demanda');
    expect((await linhaBruta(vazia.demanda.id))!.origem).toBeNull();
  });

  it('o texto é guardado como chegou, sem trim nem mudança', async () => {
    const texto = `  Linha 1 ${SENTINELAS.texto}\n\nLinha 3  `;
    const r = await registrarEntrada(deps, cto, manual({ texto }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    expect((await linhaBruta(r.demanda.id))!.texto).toBe(texto);
  });

  it('demanda e texto na mesma transação: o rollback de quem chama desfaz os dois', async () => {
    const antes = await estado();
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await registrarEntrada(deps, cto, manual({ texto: TEXTO }), t);
        throw new Error('falha depois de registrar');
      }),
    ).rejects.toThrow('falha depois de registrar');
    const depois = await estado();
    expect({ ...depois, seq: undefined }).toEqual({ ...antes, seq: undefined });
  });

  it('C-36: a 31ª demanda do mesmo ator na hora → limite_excedido, e o texto não é gravado', async () => {
    for (let i = 0; i < 30; i++) await registrarEntrada(deps, cto, manual());
    const antes = await estado();
    const e = await capturar(registrarEntrada(deps, cto, manual({ texto: TEXTO })));
    expect(e.codigo).toBe('limite_excedido');
    expect(await estado()).toEqual(antes);
  });

  it('entradaPendenteId que não existe → nao_encontrado, sem gravar nada', async () => {
    const antes = await estado();
    const e = await capturar(registrarEntrada(deps, cto, manual({ texto: TEXTO, entradaPendenteId: UUID_FICTICIO })));
    expect(e).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await estado()).toEqual(antes);
  });

  it('modo agente com o orquestrador desligado → conflito com a mensagem da tela, sem entrada pendente nem job', async () => {
    const antes = await estado();
    const e = await capturar(
      registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'agente', texto: TEXTO, solicitanteNome: 'Pessoa Ficticia' })),
    );
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGEM_ORQUESTRADOR_DESLIGADO });
    expect(MENSAGEM_ORQUESTRADOR_DESLIGADO).toBe('O agente orquestrador está desligado. Preencha os campos abaixo.');
    expect(await estado()).toEqual(antes);
    expect(await contarJobsDeAgente()).toBe(0);
  });

  it('agente → sem_permissao (autorizar), sem gravar nada', async () => {
    const antes = await estado();
    const e = await capturar(registrarEntrada(deps, orquestrador as unknown as AtorPessoa, manual({ texto: TEXTO })));
    expect(e).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await estado()).toEqual(antes);
  });
});

describe('obterTextoRecebido', () => {
  it('guardado: texto, origem, recebida em e a data de apagar (recebida + prazo de retenção)', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO, origem: { canal: 'formulario' } }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    const recebida = relogio.agora();
    expect(await obterTextoRecebido(deps, cto, r.demanda.id)).toEqual({
      situacao: 'guardado',
      texto: TEXTO,
      origem: { canal: 'formulario' },
      recebidaEm: recebida,
      apagarEm: new Date(recebida.getTime() + 90 * DIA_MS),
    });
  });

  it('o prazo vem da configuração (RETENCAO_TEXTO_BRUTO_DIAS), não de uma constante', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    const recebida = relogio.agora();
    const t = await obterTextoRecebido({ ...deps, config: { ...deps.config, retencaoDias: 7 } }, cto, r.demanda.id);
    expect(t).toMatchObject({ situacao: 'guardado', origem: null, apagarEm: new Date(recebida.getTime() + 7 * DIA_MS) });
  });

  it('sem texto: a demanda existe e não tem texto bruto', async () => {
    const r = await registrarEntrada(deps, cto, manual());
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    expect(await obterTextoRecebido(deps, cto, r.demanda.id)).toEqual({ situacao: 'sem_texto' });
  });

  it('expurgado: só a data do expurgo, sem texto nem origem', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO, origem: { canal: 'email' } }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    const expurgadaEm = new Date(relogio.agora().getTime() + 91 * DIA_MS);
    await b.poolMigrator.query('update entrada_bruta set texto = null, origem = null, expurgada_em = $2 where demanda_id = $1', [
      r.demanda.id,
      expurgadaEm,
    ]);
    const t = await obterTextoRecebido(deps, cto, r.demanda.id);
    expect(t).toEqual({ situacao: 'expurgado', expurgadaEm });
    expect(contemSentinela(JSON.stringify(t))).toBe(false);
  });

  it('demanda que não existe, ou id fora do formato → nao_encontrado', async () => {
    expect(await capturar(obterTextoRecebido(deps, cto, 'DEM-20261022-9999'))).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await capturar(obterTextoRecebido(deps, cto, "DEM-1' or '1'='1"))).toMatchObject({ codigo: 'nao_encontrado' });
  });

  it('por agente → sem_permissao (autorizar), sem ler o texto', async () => {
    const r = await registrarEntrada(deps, cto, manual({ texto: TEXTO }));
    if (r.tipo !== 'demanda') throw new Error('esperava demanda');
    const e = await capturar(obterTextoRecebido(deps, orquestrador as unknown as AtorPessoa, r.demanda.id));
    expect(e).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(contemSentinela(JSON.stringify(e))).toBe(false);
  });
});

describe('POST /api/demandas/entrada', () => {
  it('modo manual → 201 { demanda }, sem eco do texto, e o texto fica em entrada_bruta', async () => {
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO, origem: { canal: 'email' } });
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const corpo = await r.text();
    expect(contemSentinela(corpo)).toBe(false);
    const json = JSON.parse(corpo) as { demanda: { id: string; status: string } };
    expect(Object.keys(json)).toEqual(['demanda']);
    expect(json.demanda.id).toMatch(RE_ID);
    expect(json.demanda.status).toBe('nova');
    expect((await linhaBruta(json.demanda.id))!.texto).toBe(TEXTO);
  });

  it('CA-05.3: texto acima de 100.000 caracteres → 400 no campo texto, nada gravado e a sequência não avança', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: `${SENTINELAS.texto}${'a'.repeat(100_000)}` });
    expect(r.status).toBe(400);
    const corpo = await r.text();
    const json = JSON.parse(corpo) as { erro: string; campos: Array<{ campo: string; mensagem: string }> };
    expect(json.erro).toBe('entrada_invalida');
    expect(json.campos).toEqual([{ campo: 'texto', mensagem: 'Este campo aceita até 100.000 caracteres.' }]);
    expect(contemSentinela(corpo)).toBe(false);
    expect(await estado()).toEqual(antes);
  });

  it('RF-06: o GET da demanda criada pela entrada não traz o texto bruto (sentinela ausente da resposta)', async () => {
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO, origem: { referencia: SENTINELAS.nome } });
    const { demanda } = (await r.json()) as { demanda: { id: string } };
    const g = await chamarRota(GET_DEMANDA, { caminho: `/api/demandas/${demanda.id}`, params: { id: demanda.id }, cookie: cookieCto });
    expect(g.status).toBe(200);
    const corpo = await g.text();
    expect(contemSentinela(corpo)).toBe(false);
    expect(Object.keys(JSON.parse(corpo) as object)).not.toContain('texto');
  });

  it('modo agente com o orquestrador desligado → 409 com a mensagem da tela, nada gravado', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'agente', texto: TEXTO, solicitanteNome: 'Pessoa Ficticia' });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'O agente orquestrador está desligado. Preencha os campos abaixo.' });
    expect(await estado()).toEqual(antes);
  });

  it('entradaPendenteId que não existe → 404, nada gravado', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO, entradaPendenteId: UUID_FICTICIO });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await estado()).toEqual(antes);
  });

  it('token do agente orquestrador → 403, nada gravado (registrar_entrada é só de pessoa)', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO }, { bearer: tokenOrquestrador });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await estado()).toEqual(antes);
  });

  it('CA-01.3: sem sessão nem token → 401, nada gravado', async () => {
    const antes = await estado();
    const r = await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO }, {});
    expect(r.status).toBe(401);
    expect(await estado()).toEqual(antes);
  });

  it('C-15: Origin de outro site com cookie → 403, nada gravado', async () => {
    const antes = await estado();
    const r = await chamarRota(POST_ENTRADA, {
      metodo: 'POST',
      caminho: '/api/demandas/entrada',
      corpo: { modo: 'manual', ...CAMPOS, texto: TEXTO },
      cookie: cookieCto,
      cabecalhos: { origin: 'https://outro-site.test' },
    });
    expect(r.status).toBe(403);
    expect(await estado()).toEqual(antes);
  });

  it('C-21: uma linha de log por requisição, com a rota e o status, sem texto, origem, e-mail, nome nem token', async () => {
    const inicio = linhasDeLog.length;
    await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO, origem: { canal: 'email', referencia: SENTINELAS.email } });
    await postar({ modo: 'manual', ...CAMPOS, texto: `${SENTINELAS.texto}${'a'.repeat(100_000)}` });
    await postar({ modo: 'agente', texto: TEXTO, solicitanteNome: SENTINELAS.nome });
    await postar({ modo: 'manual', ...CAMPOS, texto: TEXTO }, { bearer: tokenOrquestrador });
    const novas = linhasDeLog.slice(inicio);
    const daEntrada = novas.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.rota === '/api/demandas/entrada');
    expect(daEntrada.map((l) => [l.evento, l.status])).toEqual([
      ['requisicao', 201],
      ['requisicao', 400],
      ['requisicao', 409],
      ['requisicao', 403],
    ]);
    expect(novas.some((l) => contemSentinela(l) || l.includes(tokenOrquestrador))).toBe(false);
  });
});
