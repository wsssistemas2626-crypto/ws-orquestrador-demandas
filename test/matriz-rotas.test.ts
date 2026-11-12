// Matriz de acesso × todas as rotas (C-10, C-12, C-04 a; CA-02.1 e CA-02.2 por construção). Cresce sozinho: cada
// route.ts nova em src/app/api entra aqui sem mudar este arquivo. Para cada método exportado:
//   - o handler veio de rota() e tem ação na matriz;
//   - o `meta.rota` é o caminho do próprio arquivo (o exemplo de parâmetros sai dele);
//   - cada ator que a matriz nega recebe 403; pessoa sem 2FA recebe 403; sem credencial, 401;
//   - parâmetro de caminho fora do formato responde 404 antes de autenticar (C-17; parecer 7 da 06-T11-revisao).
// Banco, Better Auth e tokens reais (Testcontainers). O bloco "verificador" prova, com handlers sintéticos de rota(),
// que estas conferências pegam o que dizem pegar, inclusive enquanto ainda não há rota de negócio.
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { definirDepsParaTeste, type Deps } from '../src/lib/deps';
import { substituirDestinoDoLog } from '../src/lib/log';
import { paramId, rota, type HandlerRota } from '../src/lib/rota';
import { AGENTES, INTEGRACOES, PAPEIS, atorDesconhecido } from '../src/modules/acesso/ator';
import { ACOES, MATRIZ, atoresProibidos, type Acao } from '../src/modules/acesso/matriz';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarDepsDeTeste } from './deps';
import {
  METODOS,
  chamarComParametroInvalido,
  chamarComo,
  chamarSemCredencial,
  padraoDaRota,
  prepararCredenciais,
  type AtorDeTeste,
  type Credenciais,
  type Metodo,
} from './requisicao';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const PUBLICAS = /^src\/app\/api\/(auth|saude)\//;
const todas = globSync('src/app/api/**/route.ts', { cwd: raiz }).sort();
const arquivos = todas.filter((a) => !PUBLICAS.test(a));

let b: BancoDeTeste;
let deps: Deps;
let cred: Credenciais;

// Centenas de linhas `requisicao` por rodada: a saída do log fica com o teste, e não no terminal.
beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cred = await prepararCredenciais(deps);
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

function rotulo(a: AtorDeTeste): string {
  switch (a.tipo) {
    case 'agente':
      return `agente ${a.agente}`;
    case 'integracao':
      return `integração ${a.integracao}`;
    case 'pessoa':
      return `pessoa ${a.papel}${a.sem2fa ? ' sem 2FA' : ''}`;
    default:
      return atorDesconhecido(a);
  }
}

function atoresPermitidos(acao: Acao): AtorDeTeste[] {
  const proibidos = atoresProibidos(acao).map((a) => JSON.stringify(a));
  const todos: AtorDeTeste[] = [
    ...AGENTES.map((agente) => ({ tipo: 'agente' as const, agente })),
    ...PAPEIS.map((papel) => ({ tipo: 'pessoa' as const, papel })),
    ...INTEGRACOES.map((integracao) => ({ tipo: 'integracao' as const, integracao })),
  ];
  return todos.filter((a) => !proibidos.includes(JSON.stringify(a)));
}

// Tudo o que se confere em cada método exportado de cada route.ts. O bloco "verificador" chama esta mesma função.
async function conferirHandler(exportado: unknown, metodo: Metodo, padraoEsperado: string): Promise<void> {
  expect(typeof exportado, 'método exportado que não é função').toBe('function');
  const h = exportado as HandlerRota;
  expect(h.meta?.acao, 'rota sem ação: o handler não veio de rota()').toBeDefined();
  expect(Object.prototype.hasOwnProperty.call(MATRIZ, h.meta.acao), `ação ${h.meta.acao} fora da matriz`).toBe(true);
  expect(h.meta.rota, 'meta.rota diferente do caminho do arquivo').toBe(padraoEsperado);

  for (const proibido of atoresProibidos(h.meta.acao)) {
    expect((await chamarComo(h, metodo, proibido, cred)).status, rotulo(proibido)).toBe(403);
  }
  for (const papel of PAPEIS) {
    expect((await chamarComo(h, metodo, { tipo: 'pessoa', papel, sem2fa: true }, cred)).status, `${papel} sem 2FA`).toBe(403);
  }
  expect((await chamarSemCredencial(h, metodo)).status, 'sem credencial').toBe(401);
  if (padraoEsperado.includes('[')) {
    expect((await chamarComParametroInvalido(h, metodo)).status, 'parâmetro fora do formato').toBe(404);
  }
}

describe('matriz de acesso × todas as rotas', () => {
  it('a varredura enxerga src/app/api (falha se o glob quebrar)', () => {
    expect(todas).toEqual(expect.arrayContaining(['src/app/api/saude/route.ts']));
  });

  for (const arquivo of arquivos) {
    for (const metodo of METODOS) {
      it(`${metodo} ${arquivo}: tem ação na matriz e nega cada ator proibido com 403`, async () => {
        const mod = (await import(`${raiz}${arquivo}`)) as Record<string, unknown>;
        if (mod[metodo] === undefined) return;
        await conferirHandler(mod[metodo], metodo, padraoDaRota(arquivo));
      });
    }
  }
});

describe('integrações recusadas não gravam nada (CA-03.1, CA-03.2)', () => {
  it('nenhum evento de integração e nenhuma demanda depois de todas as rotas', async () => {
    const { rows } = await b.poolMigrator.query(
      `select (select count(*) from evento where ator_tipo = 'integracao')::int as eventos, (select count(*) from demanda)::int as demandas`,
    );
    expect(rows[0]).toEqual({ eventos: 0, demandas: 0 });
  });
});

describe('verificador: as conferências acima pegam o que dizem pegar', () => {
  const ROTA = '/api/verificador/[id]';
  const corpo = z.object({});
  const sinteticos = ACOES.map((acao) => ({
    acao,
    GET: rota({ acao, rota: ROTA, params: paramId.demanda }, async () => ({ json: { ok: true } })),
    POST: rota({ acao, rota: ROTA, params: paramId.demanda, corpo }, async () => ({ status: 201, json: { ok: true } })),
  }));

  for (const s of sinteticos) {
    it(`${s.acao}: handler de rota() passa na conferência, e os atores permitidos chegam à função`, async () => {
      for (const metodo of ['GET', 'POST'] as const) {
        await conferirHandler(s[metodo], metodo, ROTA);
        // Credencial que não autentica daria 401, e não 2xx: os permitidos provam que tokens e cookies valem, e que o
        // 403 dos proibidos vem da matriz.
        for (const permitido of atoresPermitidos(s.acao)) {
          expect((await chamarComo(s[metodo], metodo, permitido, cred)).status, `${metodo} ${rotulo(permitido)}`).toBe(metodo === 'GET' ? 200 : 201);
        }
      }
    });
  }

  it('recusa método exportado que não veio de rota()', async () => {
    const solto = async () => new Response('{}', { status: 200 });
    await expect(conferirHandler(solto, 'GET', ROTA)).rejects.toThrow(/rota sem ação/);
  });

  it('recusa meta.rota que não é o caminho do arquivo', async () => {
    const h = rota({ acao: 'ler_demanda', rota: '/api/outra/[id]', params: paramId.demanda }, async () => ({ json: {} }));
    await expect(conferirHandler(h, 'GET', ROTA)).rejects.toThrow(/meta\.rota diferente/);
  });

  it('recusa rota dinâmica declarada sem params: o id inválido chega à autenticação (401, e não 404)', async () => {
    const semParams = rota({ acao: 'ler_demanda', rota: ROTA }, async () => ({ json: { ok: true } }));
    await expect(conferirHandler(semParams, 'GET', ROTA)).rejects.toThrow(/parâmetro fora do formato/);
  });

  it('recusa rota cuja função deixa passar quem a matriz nega (autorizar esquecido)', async () => {
    // Um handler com o meta de `registrar_decisao` mas que, por dentro, autoriza como leitura: o agente passaria.
    const leitura = rota({ acao: 'ler_demanda', rota: ROTA, params: paramId.demanda }, async () => ({ json: {} }));
    const disfarcado = Object.assign((req: Request, ctx: { params: Promise<Record<string, string>> }) => leitura(req, ctx), {
      meta: { ...leitura.meta, acao: 'registrar_decisao' as const },
    });
    await expect(conferirHandler(disfarcado, 'GET', ROTA)).rejects.toThrow(/agente/);
  });

  it('o padrão da rota sai do caminho do arquivo, sem grupo de rota', () => {
    expect(padraoDaRota('src/app/api/demandas/route.ts')).toBe('/api/demandas');
    expect(padraoDaRota('src/app/api/demandas/[id]/route.ts')).toBe('/api/demandas/[id]');
    expect(padraoDaRota('src/app/api/(interno)/pacotes-decisao/[decId]/pedido-construcao/route.ts')).toBe(
      '/api/pacotes-decisao/[decId]/pedido-construcao',
    );
  });
});
