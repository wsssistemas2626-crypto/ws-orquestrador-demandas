// T13, etapa 06-T13-testes (qa-automacao): o RNF-04 nas duas saídas que os testes da construção não liam. (1) A resposta:
// nenhum corpo nem cabeçalho devolvido às integrações, nos caminhos de sucesso e de erro (400, 403, 404, 409, 429), leva
// o token, o texto dele depois do prefixo, o prefixo ou `wsod_`. (2) O 401 de token de integração revogado e de token
// nunca emitido: corpo fixo, a linha de log como `anonimo`, sem eco do token, e nada gravado. Banco, rotas e tokens
// reais (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). Relógio fixo, duas
// horas por teste: o limite de 10 por hora do Awave não liga um teste ao outro. Dados só fictícios.
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE } from '../../../../test/integracoes';
import { chamadasDoConstruir, preparadorDePedidos, sha256DoTexto } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import type { AtorPessoa, Integracao } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, revogarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import * as rotaDemanda from '../demandas/[id]/route';
import * as rotaDemandas from '../demandas/route';

const AGORA = '2026-10-22T12:00:00Z';
const HORA = 3_600_000;
const CHAVES_DA_LINHA = ['level', 'time', 'evento', 'metodo', 'rota', 'status', 'ms', 'atorTipo', 'codigoErro'];
const PESSOA: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-saidas-qa', nome: 'Pessoa Ficticia Saidas', papel: 'cto' };

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;
type Token = { token: string; prefixo: string };
const tokens: Record<Integracao, Token> = { awave: { token: '', prefixo: '' }, construir: { token: '', prefixo: '' } };

const construir = chamadasDoConstruir(() => tokens.construir.token);
const pedidos = preparadorDePedidos({ deps: () => deps, rotulo: 'saidas-qa', entregar: (decId) => construir.entregar(decId) });

const novoToken = (integracao: Integracao) => comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, integracao, deps.relogio));

const comBearer = (bearer: string) => ({ bearer, semOrigin: true, cabecalhos: { accept: 'application/json' } });
const postDemanda = (bearer: string, corpo: unknown) => chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', corpo, ...comBearer(bearer) });
const getDemanda = (bearer: string, id: string) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, ...comBearer(bearer) });
const listarDemandas = (bearer: string) => chamarRota(rotaDemandas.GET, { caminho: '/api/demandas', ...comBearer(bearer) });

// Status e texto inteiro da resposta: cabeçalhos e corpo, como o cliente da integração recebe.
type Resposta = { status: number; texto: string };
async function ler(r: Response): Promise<Resposta> {
  const cabecalhos = [...r.headers].map(([k, v]) => `${k}: ${v}`).join('\n');
  return { status: r.status, texto: `${cabecalhos}\n\n${await r.text()}` };
}

// O token, o texto depois de `wsod_` e do prefixo (35 caracteres), o prefixo e o próprio `wsod_` não aparecem em `texto`.
// A mensagem leva só o rótulo, nunca o valor.
function semToken(texto: string, rotulo: string, ...doCaso: Token[]): void {
  expect(texto.includes('wsod_'), `wsod_ em ${rotulo}`).toBe(false);
  for (const t of doCaso) {
    const depoisDoPrefixo = t.token.slice('wsod_'.length + 8);
    expect(depoisDoPrefixo.length, rotulo).toBe(35);
    expect(texto.includes(t.token), `token em ${rotulo}`).toBe(false);
    expect(texto.includes(depoisDoPrefixo), `texto do token depois do prefixo em ${rotulo}`).toBe(false);
    expect(texto.includes(t.prefixo), `prefixo em ${rotulo}`).toBe(false);
  }
}

async function linhasDe(corpo: () => Promise<void>): Promise<string[]> {
  const linhas: string[] = [];
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  try {
    await corpo();
  } finally {
    substituirDestinoDoLog({ write: () => undefined });
  }
  return linhas;
}

const contar = async () => {
  const { rows } = await b.poolMigrator.query(
    `select (select count(*) from evento)::int as eventos, (select count(*) from demanda)::int as demandas, (select count(*) from execucao_agente)::int as execucoes`,
  );
  return rows[0] as { eventos: number; demandas: number; execucoes: number };
};

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokens.awave = await novoToken('awave');
  tokens.construir = await novoToken('construir');
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

beforeEach(() => {
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
});

describe('RNF-04: nenhuma resposta às integrações leva o token', () => {
  it('Awave: 400, 201, GET da própria (200), GET de outra (404), ações negadas (403) e 429, sem token, texto do token, prefixo nem wsod_ no corpo e nos cabeçalhos', async () => {
    const daPessoa = await criarDemanda(deps, PESSOA, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia Saidas' }));
    const awave = tokens.awave.token;
    const respostas: Resposta[] = [];
    const guardar = async (r: Promise<Response>) => {
      const lida = await ler(await r);
      respostas.push(lida);
      return lida;
    };

    await guardar(postDemanda(awave, { ...CORPO_DO_AWAVE, titulo: '' }));
    const criada = await postDemanda(awave, CORPO_DO_AWAVE);
    const textoCriada = await criada.clone().text();
    respostas.push(await ler(criada));
    const { id } = JSON.parse(textoCriada) as { id: string };
    expect(id).toMatch(/^DEM-\d{8}-\d{4}$/);
    await guardar(getDemanda(awave, id));
    await guardar(getDemanda(awave, daPessoa.id));
    await guardar(listarDemandas(awave));
    await guardar(construir.listar({ bearer: awave }));
    for (let i = 1; i < 10; i++) await guardar(postDemanda(awave, CORPO_DO_AWAVE));
    await guardar(postDemanda(awave, CORPO_DO_AWAVE));

    // O caminho foi o esperado: a asserção de ausência não é vazia.
    expect(respostas.map((r) => r.status)).toEqual([400, 201, 200, 404, 403, 403, ...Array.from({ length: 9 }, () => 201), 429]);
    respostas.forEach((r, i) => semToken(r.texto, `resposta ${i + 1} (${r.status})`, tokens.awave, tokens.construir));
  });

  it('/construir: pendentes, entrega, recebimento (409 e 204), entrega de DEC inexistente (404) e ações negadas (403), sem token, texto do token, prefixo nem wsod_ no corpo e nos cabeçalhos', async () => {
    const { decId, demandaId, json } = await pedidos.prepararDec();
    const bearer = tokens.construir.token;
    const respostas: Resposta[] = [];
    const guardar = async (r: Promise<Response>) => {
      const lida = await ler(await r);
      respostas.push(lida);
      return lida;
    };

    await guardar(construir.listar());
    const entrega = await construir.entregar(decId);
    const recebido = await entrega.clone().text();
    respostas.push(await ler(entrega));
    expect(recebido).toBe(json);
    await guardar(construir.receber(decId, { sha256: 'f'.repeat(64) }));
    await guardar(construir.receber(decId, { sha256: sha256DoTexto(recebido) }));
    await guardar(construir.entregar('DEC-DEM-20261022-9999-v1'));
    await guardar(postDemanda(bearer, CORPO_DO_AWAVE));
    await guardar(getDemanda(bearer, demandaId));
    await guardar(listarDemandas(bearer));

    expect(respostas.map((r) => r.status)).toEqual([200, 200, 409, 204, 404, 403, 403, 403]);
    respostas.forEach((r, i) => semToken(r.texto, `resposta ${i + 1} (${r.status})`, tokens.construir, tokens.awave));
  });
});

describe('RNF-04 e C-09: token de integração revogado ou nunca emitido', () => {
  it('401 com a mensagem fixa nas cinco rotas das integrações; a linha de log é de anonimo, sem o token, o texto dele, o prefixo nem wsod_; nada gravado', async () => {
    // Um token de cada integração, emitido e revogado pelo prefixo; e um no formato certo que nunca foi emitido. Os
    // tokens ativos de beforeAll continuam valendo (conferido no fim).
    const revogados = { awave: await novoToken('awave'), construir: await novoToken('construir') };
    for (const t of Object.values(revogados)) {
      expect(await comTransacao(deps.pool, (tr) => revogarTokenServico(tr, t.prefixo, deps.relogio))).toBe(true);
    }
    const nuncaEmitido = `wsod_${randomBytes(32).toString('base64url')}`;
    const desconhecido: Token = { token: nuncaEmitido, prefixo: nuncaEmitido.slice(5, 13) };
    const { decId } = await pedidos.prepararDec();
    const antes = await contar();

    const respostas: Resposta[] = [];
    const linhas = await linhasDe(async () => {
      for (const t of [revogados.awave, desconhecido]) {
        respostas.push(await ler(await postDemanda(t.token, CORPO_DO_AWAVE)));
        respostas.push(await ler(await getDemanda(t.token, 'DEM-20261022-0001')));
      }
      const chamadas = chamadasDoConstruir(() => revogados.construir.token);
      for (const op of [{}, { bearer: nuncaEmitido }]) {
        respostas.push(await ler(await chamadas.listar(op)));
        respostas.push(await ler(await chamadas.entregar(decId, op)));
        respostas.push(await ler(await chamadas.receber(decId, { sha256: 'f'.repeat(64) }, op)));
      }
    });

    expect(respostas).toHaveLength(10);
    const esperado = JSON.stringify({ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido });
    respostas.forEach((r, i) => {
      expect(r.status, `resposta ${i + 1}`).toBe(401);
      expect(r.texto.endsWith(`\n\n${esperado}`), `corpo da resposta ${i + 1}`).toBe(true);
      semToken(r.texto, `resposta ${i + 1}`, revogados.awave, revogados.construir, desconhecido, tokens.awave, tokens.construir);
    });

    expect(linhas).toHaveLength(10);
    semToken(linhas.join('\n'), 'log', revogados.awave, revogados.construir, desconhecido, tokens.awave, tokens.construir);
    for (const l of linhas.map((x) => JSON.parse(x) as Record<string, unknown>)) {
      for (const chave of Object.keys(l)) expect(CHAVES_DA_LINHA, `chave ${chave}`).toContain(chave);
      expect(l).toMatchObject({ evento: 'requisicao', status: 401, atorTipo: 'anonimo', codigoErro: 'nao_autenticado' });
    }
    expect(await contar()).toEqual(antes);

    // A revogação não afetou os tokens ativos das duas integrações.
    expect((await construir.listar()).status).toBe(200);
    expect((await postDemanda(tokens.awave.token, CORPO_DO_AWAVE)).status).toBe(201);
  });
});
