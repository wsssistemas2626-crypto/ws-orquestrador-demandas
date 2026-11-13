// src/lib/rota-corpo-invalido-qa.test.ts — 06-T04-testes (qa-automacao) do DEC-DEM-20261111-0017-v1: o `rota()` com
// o schema e a opção de verdade do andamento (corpoAndamentoSchema e CORPO_INVALIDO_ANDAMENTO), não um schema sintético.
// Cobre AN-02 (a), (c) e (d), ADR-33, CA-02.2, CA-02.3 e CA-02.4 no adaptador, CA-02.6 e AN-13:
// - cada corpo do CA-02.2 e do AN-02 (a) dá o 422 igual byte a byte, sem chamar a função, sem Sentry e com uma linha de
//   log só com os campos da lista;
// - a sentinela, como valor ou como nome de chave, não chega à resposta, ao log nem ao Sentry falso;
// - o 422 não depende do DEC (CA-02.3 no adaptador) e não alcança quem não pode a ação (401, 403, 404 antes);
// - com e sem a opção, as recusas de antes do Zod são idênticas byte a byte, com o código de erro de hoje (Minor 1 da
//   06-T04-revisao);
// - a opção não alcança a query nem o erro da própria função;
// - uma guarda estática de onde a opção aparece no código que roda.
// Banco, Better Auth e tokens reais (Testcontainers); só o Sentry é trocado por um espião. Handlers sintéticos.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CONFIG_TESTE } from '../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDepsDeTeste } from '../../test/deps';
import { tokenDeIntegracao } from '../../test/integracoes';
import { chamarRota, type OpRequisicao } from '../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { criarPessoa } from '../../test/sessao';
import { comTransacao } from '../db/transacao';
import { criarTokenServico } from '../modules/acesso/tokens-servico';
import { CORPO_INVALIDO_ANDAMENTO, MENSAGENS_ANDAMENTO, corpoAndamentoSchema } from '../modules/andamento/schemas';
import { definirDepsParaTeste, type Deps } from './deps';
import { ErroDominio, MENSAGEM_ERRO_INTERNO, MENSAGEM_NAO_ENCONTRADO } from './erros';
import { substituirDestinoDoLog } from './log';
import { paramId, rota, type OpRota } from './rota';

const capturados = vi.hoisted(() => ({ erros: [] as unknown[] }));
vi.mock('./sentry', () => ({
  capturarErro: (e: unknown) => {
    capturados.erros.push(e);
  },
}));

const ROTA = '/api/pedidos-construcao/[decId]/andamento';
const DEC = 'DEC-DEM-20261112-0001-v1';
const DEC_OUTRO = 'DEC-DEM-20991231-9999-v9999';
const VALIDO = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' } as const;
const CORPO_422 = JSON.stringify({ erro: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido });
const CABECALHOS_DO_ERRO = [
  ['cache-control', 'no-store'],
  ['content-type', 'application/json; charset=utf-8'],
  ['referrer-policy', 'no-referrer'],
  ['x-content-type-options', 'nosniff'],
];

// A função registra o que recebeu; `lancar` a faz lançar o valor dado, para ver que a opção não o alcança.
const recebidos: unknown[] = [];
let lancar: (() => never) | null = null;
const funcao = async ({ corpo }: { corpo: unknown }) => {
  if (lancar) lancar();
  recebidos.push(corpo);
  return { status: 204 };
};
const params = paramId.versao('decId', 'DEC');
const hCom = rota({ acao: 'registrar_andamento', rota: ROTA, params, corpo: corpoAndamentoSchema, corpoInvalido: CORPO_INVALIDO_ANDAMENTO }, funcao);
const hSem = rota({ acao: 'registrar_andamento', rota: ROTA, params, corpo: corpoAndamentoSchema }, funcao);
const hComQuery = rota(
  { acao: 'registrar_andamento', rota: ROTA, params, query: z.strictObject({}), corpo: corpoAndamentoSchema, corpoInvalido: CORPO_INVALIDO_ANDAMENTO },
  funcao,
);

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let tokenAwave: string;
let tokenAgente: string;
let cookieCto: string;
const linhas: string[] = [];

beforeAll(async () => {
  substituirDestinoDoLog({ write: (l: string) => void linhas.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
  tokenAgente = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  recebidos.length = 0;
  capturados.erros.length = 0;
  linhas.length = 0;
  lancar = null;
});

const chamar = (h: typeof hCom, corpo: unknown, extra: OpRequisicao & { dec?: string; query?: string } = {}) => {
  const dec = extra.dec ?? DEC;
  return chamarRota(h, {
    metodo: 'POST',
    caminho: `/api/pedidos-construcao/${encodeURIComponent(dec)}/andamento${extra.query ?? ''}`,
    params: { decId: dec },
    bearer: tokenConstruir,
    semOrigin: true,
    corpo,
    ...extra,
  });
};

type Foto = { status: number; cabecalhos: string[][]; corpo: string };
const foto = async (r: Response): Promise<Foto> => ({
  status: r.status,
  cabecalhos: [...r.headers.entries()].sort(([a], [b2]) => a.localeCompare(b2)),
  corpo: await r.text(),
});
const linhasDoLog = () => linhas.map((l) => JSON.parse(l) as Record<string, unknown>);

// CA-02.2 por inteiro, AN-02 (a) e algumas bordas a mais; texto vai como está, objeto vira JSON.
const CORPOS_INVALIDOS: Array<readonly [string, unknown]> = [
  ['chave a mais', { ...VALIDO, nota: 'x' }],
  ['sem fase', { tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' }],
  ['sem tarefasProntas', { fase: 'construindo', tarefasTotal: 17, status: 'em_construcao' }],
  ['sem tarefasTotal', { fase: 'construindo', tarefasProntas: 9, status: 'em_construcao' }],
  ['sem status', { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17 }],
  ['fase Construindo', { ...VALIDO, fase: 'Construindo' }],
  ['fase construido', { ...VALIDO, fase: 'construido' }],
  ['fase vazia', { ...VALIDO, fase: '' }],
  ['status entregue', { ...VALIDO, status: 'entregue' }],
  ['status encerrada', { ...VALIDO, status: 'encerrada' }],
  ['prontas 10 de 9', { ...VALIDO, tarefasProntas: 10, tarefasTotal: 9 }],
  ['inteiro negativo', { ...VALIDO, tarefasProntas: -1 }],
  ['1.5', { ...VALIDO, tarefasProntas: 1.5 }],
  ['"9" em texto', { ...VALIDO, tarefasProntas: '9' }],
  ['null', { ...VALIDO, tarefasProntas: null }],
  ['true', { ...VALIDO, tarefasTotal: true }],
  ['total 1000', { ...VALIDO, tarefasProntas: 0, tarefasTotal: 1000 }],
  ['corpo []', '[]'],
  ['corpo null', 'null'],
  ['corpo "texto"', '"texto"'],
  ['__proto__ como chave', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","__proto__":{"x":1}}'],
  ['constructor como chave', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","constructor":1}'],
  ['objeto aninhado na fase', { ...VALIDO, fase: { valor: 'construindo' } }],
  ['1e3 de 1e2', '{"fase":"construindo","tarefasProntas":1e3,"tarefasTotal":1e2,"status":"em_construcao"}'],
  ['1e400', '{"fase":"construindo","tarefasProntas":1,"tarefasTotal":1e400,"status":"em_construcao"}'],
  ['objeto vazio', {}],
  ['número no corpo', '9'],
];

describe('AN-02 (a): cada corpo inválido pelo rota() com a opção do andamento', () => {
  it.each(CORPOS_INVALIDOS)(
    '%s → 422 igual byte a byte, sem chamar a função, sem Sentry e com uma linha de log da lista',
    async (_n, corpo) => {
      const f = await foto(await chamar(hCom, corpo));
      expect(f).toEqual({ status: 422, cabecalhos: CABECALHOS_DO_ERRO, corpo: CORPO_422 });
      expect(recebidos).toEqual([]);
      expect(capturados.erros).toEqual([]);
      const log = linhasDoLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toMatchObject({ evento: 'requisicao', metodo: 'POST', rota: ROTA, status: 422, atorTipo: 'integracao', codigoErro: 'nao_processavel' });
      expect(Object.keys(log[0]!).filter((k) => !['level', 'time', 'evento', 'metodo', 'rota', 'status', 'ms', 'atorTipo', 'codigoErro'].includes(k))).toEqual([]);
      expect(linhas.join('\n')).not.toContain(DEC);
    },
  );
  it('POST sem corpo (o lerCorpoJson lê vazio, que não é JSON) → 400 de JSON inválido, com e sem a opção, sem chamar a função', async () => {
    const com = await foto(await chamar(hCom, undefined, { cabecalhos: { 'content-type': 'application/json' } }));
    const sem = await foto(await chamar(hSem, undefined, { cabecalhos: { 'content-type': 'application/json' } }));
    expect(com).toEqual(sem);
    expect(com.status).toBe(400);
    expect(JSON.parse(com.corpo)).toEqual({ erro: 'entrada_invalida', mensagem: 'O conteúdo enviado não é um JSON válido.' });
    expect(recebidos).toEqual([]);
  });
});

describe('CA-02.4 e AN-02 (c): nada do corpo recusado sai na resposta, no log nem no Sentry', () => {
  const CHAVE_EXTRA = 'chaveExtraQaT04';
  it.each([
    ['sentinela como valor de chave a mais', { ...VALIDO, [CHAVE_EXTRA]: SENTINELAS.texto }],
    ['sentinela como nome de chave a mais', { ...VALIDO, [SENTINELAS.email]: 1 }],
    ['sentinelas como nome e valor', { ...VALIDO, [SENTINELAS.senha]: SENTINELAS.token }],
    ['sentinela na fase', { ...VALIDO, fase: SENTINELAS.nome }],
    ['sentinela no status', { ...VALIDO, status: SENTINELAS.telefone }],
    ['sentinela aninhada na fase', { ...VALIDO, fase: { [SENTINELAS.texto]: SENTINELAS.email } }],
    ['sentinela no número', { ...VALIDO, tarefasProntas: SENTINELAS.texto }],
    ['sentinela numa lista no corpo', [SENTINELAS.texto, { [CHAVE_EXTRA]: SENTINELAS.token }]],
  ] as const)('%s', async (_n, corpo) => {
    const f = await foto(await chamar(hCom, corpo));
    expect(f.status).toBe(422);
    expect(f.corpo).toBe(CORPO_422);
    const saidas = [f.corpo, JSON.stringify(f.cabecalhos), linhas.join('\n'), JSON.stringify(capturados.erros)].join('\n');
    expect(contemSentinela(saidas)).toBe(false);
    expect(saidas).not.toContain(CHAVE_EXTRA);
    expect(capturados.erros).toEqual([]);
  });
  it('sem a opção, o mesmo corpo continua no 400 de hoje (é a opção que tira o campos)', async () => {
    const r = await chamar(hSem, { ...VALIDO, [CHAVE_EXTRA]: SENTINELAS.texto });
    expect(r.status).toBe(400);
    const corpo = (await r.json()) as { erro: string; campos?: unknown[] };
    expect(corpo.erro).toBe('entrada_invalida');
    expect(Array.isArray(corpo.campos)).toBe(true);
  });
});

describe('CA-02.3 no adaptador: o 422 não depende do DEC', () => {
  it.each(CORPOS_INVALIDOS.slice(0, 6))('%s: DEC do teste e DEC que não existe dão a mesma resposta', async (_n, corpo) => {
    const um = await foto(await chamar(hCom, corpo, { dec: DEC }));
    const outro = await foto(await chamar(hCom, corpo, { dec: DEC_OUTRO }));
    expect(outro).toEqual(um);
    expect(um.status).toBe(422);
  });
});

describe('ordem do rota(): quem não passa antes do corpo nunca vê o 422', () => {
  const INVALIDO = { ...VALIDO, nota: SENTINELAS.texto };
  it('CA-02.7 no adaptador: id fora da regex com corpo inválido → 404 de hoje, sem chamar a função', async () => {
    const r = await chamar(hCom, INVALIDO, { dec: 'DEC-xyz' });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(recebidos).toEqual([]);
  });
  it('sem credencial e com corpo inválido → 401, não 422', async () => {
    const r = await chamar(hCom, INVALIDO, { bearer: undefined });
    expect(r.status).toBe(401);
    expect(((await r.json()) as { erro: string }).erro).toBe('nao_autenticado');
  });
  it('token que não existe e corpo inválido → 401, não 422', async () => {
    const r = await chamar(hCom, INVALIDO, { bearer: 'token-ficticio-inexistente' });
    expect(r.status).toBe(401);
  });
  it.each([
    ['token awave', () => ({ bearer: tokenAwave })],
    ['token de agente (risco)', () => ({ bearer: tokenAgente })],
    ['pessoa cto com cookie e origem', () => ({ bearer: undefined, cookie: cookieCto, cabecalhos: { origin: CONFIG_TESTE.urlBase } })],
  ] as const)('%s com corpo inválido → 403 sem_permissao, não 422 (sem oráculo do formato a quem não pode)', async (_n, credencial) => {
    const r = await chamar(hCom, INVALIDO, credencial());
    expect(r.status).toBe(403);
    expect(((await r.json()) as { erro: string }).erro).toBe('sem_permissao');
    expect(recebidos).toEqual([]);
  });
  it('a opção não alcança a query: query fora do schema → 400 com campos, mesmo com corpo inválido', async () => {
    const r = await chamar(hComQuery, INVALIDO, { query: '?x=1' });
    expect(r.status).toBe(400);
    const corpo = (await r.json()) as { erro: string; campos?: unknown[] };
    expect(corpo.erro).toBe('entrada_invalida');
    expect(corpo.campos).toEqual(expect.any(Array));
    expect(recebidos).toEqual([]);
  });
  it('com a query certa, o corpo inválido volta ao 422 da opção', async () => {
    const f = await foto(await chamar(hComQuery, INVALIDO));
    expect(f.status).toBe(422);
    expect(f.corpo).toBe(CORPO_422);
  });
});

describe('Minor 1 da 06-T04-revisao: com e sem a opção, as recusas de antes do Zod são idênticas byte a byte', () => {
  it.each([
    ['JSON malformado', '{"fase":', {}, 400, 'entrada_invalida'],
    ['text/plain', JSON.stringify(VALIDO), { semContentType: true, cabecalhos: { 'content-type': 'text/plain' } }, 415, 'tipo_nao_suportado'],
    ['sem content-type', JSON.stringify(VALIDO), { semContentType: true }, 415, 'tipo_nao_suportado'],
    ['corpo acima de 512 KB', JSON.stringify({ ...VALIDO, x: 'a'.repeat(600 * 1024) }), {}, 413, 'corpo_grande'],
    ['content-length declarado acima de 512 KB', JSON.stringify(VALIDO), { cabecalhos: { 'content-length': String(600 * 1024) } }, 413, 'corpo_grande'],
    ['cookie de sessão com Bearer', JSON.stringify(VALIDO), { cookie: 'wsod.session_token=inventado', cabecalhos: { origin: CONFIG_TESTE.urlBase } }, 400, 'entrada_invalida'],
    ['cookie __Secure de sessão com Bearer', JSON.stringify(VALIDO), { cookie: '__Secure-wsod.session_token=inventado', cabecalhos: { origin: CONFIG_TESTE.urlBase } }, 400, 'entrada_invalida'],
    ['cookie com origem estranha', JSON.stringify(VALIDO), { cookie: 'qualquer=1', cabecalhos: { origin: 'https://atacante.test' } }, 403, 'sem_permissao'],
  ] as const)('%s → %i %s, a mesma resposta com e sem a opção, sem campos e sem chamar a função', async (_n, texto, extra, status, erro) => {
    const com = await foto(await chamar(hCom, texto, extra));
    const sem = await foto(await chamar(hSem, texto, extra));
    expect(com).toEqual(sem);
    expect(com.status).toBe(status);
    const corpo = JSON.parse(com.corpo) as Record<string, unknown>;
    expect(corpo.erro).toBe(erro);
    expect(Object.keys(corpo).sort()).toEqual(['erro', 'mensagem']);
    expect(com.cabecalhos).toEqual(CABECALHOS_DO_ERRO);
    expect(recebidos).toEqual([]);
    expect(capturados.erros).toEqual([]);
  });
  it('o 400 do cookie de sessão é o do ator ambíguo, não o do JSON inválido', async () => {
    const ambiguo = JSON.parse((await foto(await chamar(hCom, JSON.stringify(VALIDO), { cookie: 'wsod.session_token=inventado', cabecalhos: { origin: CONFIG_TESTE.urlBase } }))).corpo) as { mensagem: string };
    const malformado = JSON.parse((await foto(await chamar(hCom, '{"fase":'))).corpo) as { mensagem: string };
    expect(ambiguo.mensagem).not.toBe(malformado.mensagem);
  });
});

describe('a opção não alcança o que vem da função (ADR-33: só a falha do Zod do corpo)', () => {
  it('ErroDominio de entrada inválida com campos lançado pela função → 400 com os campos, mesmo com a opção', async () => {
    lancar = () => {
      throw new ErroDominio('entrada_invalida', 'Corrija os campos abaixo para continuar.', { campos: [{ campo: 'fase', mensagem: 'Valor inválido.' }] });
    };
    const r = await chamar(hCom, VALIDO);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos: [{ campo: 'fase', mensagem: 'Valor inválido.' }] });
  });
  it('ZodError lançado pela função → 500 genérico e Sentry, não 422', async () => {
    lancar = () => {
      z.string().parse(1);
      throw new Error('inalcançável');
    };
    const r = await chamar(hCom, VALIDO);
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    expect(capturados.erros).toHaveLength(1);
  });
  it('conflito lançado pela função → 409 com a mensagem dela', async () => {
    lancar = () => {
      throw new ErroDominio('conflito', MENSAGENS_ANDAMENTO.statusFinal);
    };
    const r = await chamar(hCom, VALIDO);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_ANDAMENTO.statusFinal });
  });
});

describe('corpo válido chega à função como o schema devolve (CA-02.1 no adaptador, CA-02.6)', () => {
  it.each([
    ['o corpo do CA-02.1', JSON.stringify(VALIDO), VALIDO],
    ['0 de 0 (CA-02.6)', '{"fase":"entendendo_o_pedido","tarefasProntas":0,"tarefasTotal":0,"status":"em_construcao"}', { fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, status: 'em_construcao' }],
    ['999 de 999, construido', '{"fase":"documentando","tarefasProntas":999,"tarefasTotal":999,"status":"construido"}', { fase: 'documentando', tarefasProntas: 999, tarefasTotal: 999, status: 'construido' }],
    ['chaves em outra ordem e cancelado', '{"status":"cancelado","tarefasTotal":3,"fase":"testando","tarefasProntas":1}', { fase: 'testando', tarefasProntas: 1, tarefasTotal: 3, status: 'cancelado' }],
  ] as const)('%s → 204 sem corpo, cabeçalhos seguros e a função recebe as quatro chaves', async (_n, texto, esperado) => {
    const f = await foto(await chamar(hCom, texto));
    expect(f.status).toBe(204);
    expect(f.corpo).toBe('');
    expect(f.cabecalhos).toEqual(CABECALHOS_DO_ERRO.filter(([k]) => k !== 'content-type'));
    expect(recebidos).toEqual([esperado]);
  });
  it('-0 do JSON chega como 0 (sem sinal) e content-type com charset é aceito', async () => {
    const r = await chamar(hCom, '{"fase":"planejando","tarefasProntas":-0,"tarefasTotal":0,"status":"em_construcao"}', {
      cabecalhos: { 'content-type': 'application/json; charset=utf-8' },
    });
    expect(r.status).toBe(204);
    expect(recebidos).toHaveLength(1);
    expect((recebidos[0] as { tarefasProntas: number }).tarefasProntas === 0).toBe(true);
  });
});

describe('AN-13: o tipo e o uso da opção', () => {
  it('o tipo só aceita nao_processavel: a opção não troca o 422 por outro status', () => {
    const aceitar = (c: OpRota<unknown, unknown, unknown>['corpoInvalido']) => c;
    // @ts-expect-error AN-13: outro código de erro não compila na opção
    expect(aceitar({ codigo: 'entrada_invalida', mensagem: 'x' })).toBeDefined();
    expect(aceitar(CORPO_INVALIDO_ANDAMENTO)).toBe(CORPO_INVALIDO_ANDAMENTO);
  });

  const raiz = fileURLToPath(new URL('../../', import.meta.url));
  const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
    .filter((a) => !/\.test\.tsx?$/.test(a))
    .sort();
  const PODEM_CITAR = ['src/lib/rota.ts', 'src/modules/andamento/schemas.ts', 'src/app/api/pedidos-construcao/[decId]/andamento/route.ts'];
  const quemCita = (arquivos: ReadonlyArray<readonly [string, string]>) => arquivos.filter(([, f]) => f.includes('corpoInvalido')).map(([a]) => a);
  // A rota que passa a opção passa a constante do andamento, nunca uma mensagem escrita ali.
  const usoSemConstante = (arquivos: ReadonlyArray<readonly [string, string]>) =>
    arquivos.filter(([a, f]) => a.endsWith('route.ts') && f.includes('corpoInvalido') && !/corpoInvalido:\s*CORPO_INVALIDO_ANDAMENTO\b/.test(f)).map(([a]) => a);

  it('fora de teste, só o rota(), o schema do andamento e a rota do andamento citam a opção', () => {
    expect(codigoQueRoda).toContain('src/lib/rota.ts');
    const arquivos = codigoQueRoda.map((a) => [a, readFileSync(`${raiz}${a}`, 'utf8')] as const);
    const citam = quemCita(arquivos);
    expect(citam.filter((a) => !PODEM_CITAR.includes(a))).toEqual([]);
    expect(citam).toContain('src/lib/rota.ts');
    expect(usoSemConstante(arquivos)).toEqual([]);
  });
  it('as regras pegam o caso plantado', () => {
    expect(quemCita([['src/app/api/demandas/route.ts', "rota({ corpoInvalido: { codigo: 'nao_processavel', mensagem: 'x' } })"]])).toEqual(['src/app/api/demandas/route.ts']);
    expect(usoSemConstante([['src/app/api/x/route.ts', "rota({ corpoInvalido: { codigo: 'nao_processavel', mensagem: 'x' } })"]])).toEqual(['src/app/api/x/route.ts']);
    expect(usoSemConstante([['src/app/api/x/route.ts', 'rota({ corpoInvalido: CORPO_INVALIDO_ANDAMENTO })']])).toEqual([]);
  });
});
