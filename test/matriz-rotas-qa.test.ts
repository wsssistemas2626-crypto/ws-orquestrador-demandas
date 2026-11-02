// Escrito na 06-T13-testes (qa-automacao), ao lado de matriz-rotas.test.ts, sem mudar nada nele. Cobre o que a
// conferência da T13 não prova:
//   - CA-02.1 ("nada muda"): quem a matriz nega, quem está sem 2FA, quem não tem credencial e o parâmetro fora do
//     formato nunca chegam à função da rota, em todos os cinco métodos (o verificador da T13 usa só GET e POST);
//   - CA-01.3: sem sessão nem token, 401 em toda ação e em todo método;
//   - CA-02.1 e CA-02.2 com corpo válido: o 403 do agente não depende de o corpo estar errado;
//   - a ação das rotas que CA-02.1, CA-02.2 e C-10 nomeiam fica fixada: a rota de decisão declarada com uma ação de
//     leitura deixaria o agente passar, e a conferência por `atoresProibidos` não perceberia;
//   - método HTTP exportado fora dos cinco conferidos (HEAD, OPTIONS) não passa sem conferência.
// Banco, Better Auth e tokens reais (Testcontainers). Cresce sozinho: cada route.ts nova entra nos laços.
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { definirDepsParaTeste, type Deps } from '../src/lib/deps';
import { substituirDestinoDoLog } from '../src/lib/log';
import { paramId, rota, type HandlerRota } from '../src/lib/rota';
import { AGENTES, PAPEIS } from '../src/modules/acesso/ator';
import { ACOES, atoresProibidos, type Acao } from '../src/modules/acesso/matriz';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarDepsDeTeste } from './deps';
import {
  METODOS,
  chamarComParametroInvalido,
  chamarComo,
  chamarRota,
  chamarSemCredencial,
  padraoDaRota,
  prepararCredenciais,
  type Credenciais,
  type Metodo,
} from './requisicao';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const PUBLICAS = /^src\/app\/api\/(auth|saude)\//;
const arquivos = globSync('src/app/api/**/route.ts', { cwd: raiz })
  .filter((a) => !PUBLICAS.test(a))
  .sort();

// Os métodos que o App Router aceita num route.ts. Os que não estão em METODOS não passam pela conferência da T13.
const METODOS_DO_NEXT = ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
function metodosSemConferencia(mod: Record<string, unknown>): string[] {
  return Object.keys(mod)
    .filter((k) => (METODOS_DO_NEXT as readonly string[]).includes(k) && !(METODOS as readonly string[]).includes(k))
    .sort();
}

// Ação fixada por rota (02, seção 6; C-16 para o pedido em POST). Vale para os métodos listados que a rota exportar.
const MUDAM: readonly Metodo[] = ['POST', 'PATCH', 'PUT', 'DELETE'];
const ACAO_FIXADA: ReadonlyArray<{ rota: string; metodos: readonly Metodo[]; acao: Acao; fonte: string }> = [
  { rota: '/api/pacotes-decisao/[decId]/decisao', metodos: METODOS, acao: 'registrar_decisao', fonte: 'CA-02.1' },
  { rota: '/api/pacotes-decisao/[decId]/pedido-construcao', metodos: METODOS, acao: 'gerar_pedido_construcao', fonte: 'CA-02.2' },
  { rota: '/api/agentes/[agente]', metodos: MUDAM, acao: 'alterar_agente', fonte: 'CA-02.2' },
  { rota: '/api/configuracao/teto', metodos: MUDAM, acao: 'alterar_teto', fonte: 'CA-02.2' },
  { rota: '/api/demandas/[id]', metodos: MUDAM, acao: 'alterar_demanda', fonte: 'CA-02.2' },
  { rota: '/api/demandas/[id]/historico', metodos: METODOS, acao: 'ler_historico', fonte: 'C-10' },
  { rota: '/api/demandas/entrada', metodos: METODOS, acao: 'registrar_entrada', fonte: 'RF-02' },
];
function divergenciasDaFixacao(padrao: string, mod: Record<string, unknown>): string[] {
  const erros: string[] = [];
  for (const f of ACAO_FIXADA.filter((x) => x.rota === padrao)) {
    for (const metodo of f.metodos) {
      const h = mod[metodo] as Partial<HandlerRota> | undefined;
      if (h === undefined) continue;
      if (h.meta?.acao !== f.acao) erros.push(`${metodo} ${padrao}: ação ${String(h.meta?.acao)}, a ${f.fonte} pede ${f.acao}`);
    }
  }
  return erros;
}

let b: BancoDeTeste;
let deps: Deps;
let cred: Credenciais;

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

describe('rotas reais: método sem conferência e ação fixada', () => {
  it('a lista de ações fixadas só cita ações que existem', () => {
    for (const f of ACAO_FIXADA) expect(ACOES, f.rota).toContain(f.acao);
  });

  for (const arquivo of arquivos) {
    it(`${arquivo}: nenhum HEAD nem OPTIONS exportado, e a ação fixada não ficou mais fraca`, async () => {
      const mod = (await import(`${raiz}${arquivo}`)) as Record<string, unknown>;
      expect(metodosSemConferencia(mod), 'método exportado que a matriz não confere').toEqual([]);
      expect(divergenciasDaFixacao(padraoDaRota(arquivo), mod)).toEqual([]);
    });
  }
});

describe('verificador das duas conferências acima', () => {
  const qualquer = rota({ acao: 'ler_demanda', rota: '/api/demandas/[id]', params: paramId.demanda }, async () => ({ json: {} }));

  it('acusa HEAD e OPTIONS exportados e ignora o que não é método', () => {
    expect(metodosSemConferencia({ GET: qualquer, HEAD: qualquer, OPTIONS: qualquer, dynamic: 'force-dynamic', runtime: 'nodejs' })).toEqual(['HEAD', 'OPTIONS']);
    expect(metodosSemConferencia({ GET: qualquer, PATCH: qualquer })).toEqual([]);
  });

  it('acusa a rota de decisão declarada com ação de leitura, e aceita a certa', () => {
    const fraca = rota({ acao: 'ler_pacote_decisao', rota: '/api/pacotes-decisao/[decId]/decisao' }, async () => ({ json: {} }));
    const certa = rota({ acao: 'registrar_decisao', rota: '/api/pacotes-decisao/[decId]/decisao' }, async () => ({ json: {} }));
    expect(divergenciasDaFixacao('/api/pacotes-decisao/[decId]/decisao', { PATCH: fraca })).toEqual([
      'PATCH /api/pacotes-decisao/[decId]/decisao: ação ler_pacote_decisao, a CA-02.1 pede registrar_decisao',
    ]);
    expect(divergenciasDaFixacao('/api/pacotes-decisao/[decId]/decisao', { PATCH: certa })).toEqual([]);
  });

  it('no teto, a leitura pode ser ler_teto, mas a mudança só alterar_teto', () => {
    const ler = rota({ acao: 'ler_teto', rota: '/api/configuracao/teto' }, async () => ({ json: {} }));
    const alterar = rota({ acao: 'alterar_teto', rota: '/api/configuracao/teto' }, async () => ({ json: {} }));
    expect(divergenciasDaFixacao('/api/configuracao/teto', { GET: ler, PUT: alterar })).toEqual([]);
    expect(divergenciasDaFixacao('/api/configuracao/teto', { GET: ler, PUT: ler })).toHaveLength(1);
  });

  it('acusa método solto, sem meta, numa rota fixada', () => {
    const solto = async () => new Response('{}');
    expect(divergenciasDaFixacao('/api/demandas/[id]/historico', { GET: solto })).toHaveLength(1);
  });
});

describe('CA-02.1 e CA-01.3: quem é barrado nunca chega à função, em todos os métodos', () => {
  const ROTA = '/api/verificador-qa/[id]';
  const corpo = z.object({});

  for (const acao of ACOES) {
    it(`${acao}: proibido, sem 2FA, sem credencial e parâmetro inválido barrados antes da função`, async () => {
      for (const metodo of METODOS) {
        let chamadas = 0;
        const h = rota(
          { acao, rota: ROTA, params: paramId.demanda, ...(metodo === 'GET' ? {} : { corpo }) },
          async () => {
            chamadas++;
            return { json: { ok: true } };
          },
        );
        for (const proibido of atoresProibidos(acao)) {
          expect((await chamarComo(h, metodo, proibido, cred)).status, `${metodo} ${JSON.stringify(proibido)}`).toBe(403);
        }
        for (const papel of PAPEIS) {
          expect((await chamarComo(h, metodo, { tipo: 'pessoa', papel, sem2fa: true }, cred)).status, `${metodo} ${papel} sem 2FA`).toBe(403);
        }
        expect((await chamarSemCredencial(h, metodo)).status, `${metodo} sem credencial`).toBe(401);
        expect((await chamarComParametroInvalido(h, metodo)).status, `${metodo} parâmetro inválido`).toBe(404);
        expect(chamadas, `${metodo}: a função rodou para quem foi barrado`).toBe(0);

        // Controle: uma pessoa cto com 2FA chega à função (as ações sem pessoa não existem na matriz).
        expect((await chamarComo(h, metodo, { tipo: 'pessoa', papel: 'cto' }, cred)).status, `${metodo} cto`).toBe(200);
        expect(chamadas, `${metodo}: o controle não chegou à função`).toBe(1);
      }
    });
  }
});

describe('CA-02.1 e CA-02.2 com corpo válido: o 403 do agente vem da matriz, não do Zod', () => {
  const CASOS: ReadonlyArray<{ fonte: string; acao: Acao; metodo: Metodo; rota: string; params: z.ZodType<Record<string, string>>; valores: Record<string, string>; corpo: z.ZodType<unknown>; enviado: unknown }> = [
    {
      fonte: 'CA-02.1',
      acao: 'registrar_decisao',
      metodo: 'PATCH',
      rota: '/api/pacotes-decisao/[decId]/decisao',
      params: paramId.versao('decId', 'DEC'),
      valores: { decId: 'DEC-DEM-20261022-0001-v1' },
      corpo: z.object({ resultado: z.enum(['aprovada', 'devolvida', 'arquivada']), opcaoEscolhida: z.enum(['A', 'B']) }),
      enviado: { resultado: 'aprovada', opcaoEscolhida: 'A' },
    },
    {
      fonte: 'CA-02.2',
      acao: 'alterar_agente',
      metodo: 'PATCH',
      rota: '/api/agentes/[agente]',
      params: z.object({ agente: z.enum(AGENTES) }),
      valores: { agente: 'risco' },
      corpo: z.object({ ligado: z.boolean() }),
      enviado: { ligado: true },
    },
    {
      fonte: 'CA-02.2',
      acao: 'alterar_teto',
      metodo: 'PUT',
      rota: '/api/configuracao/teto',
      params: z.object({}),
      valores: {},
      corpo: z.object({ valor: z.number() }),
      enviado: { valor: 1000 },
    },
    {
      fonte: 'CA-02.2',
      acao: 'alterar_demanda',
      metodo: 'PATCH',
      rota: '/api/demandas/[id]',
      params: paramId.demanda,
      valores: { id: 'DEM-20261022-0001' },
      corpo: z.object({ status: z.string() }),
      enviado: { status: 'arquivada' },
    },
    {
      fonte: 'CA-02.2',
      acao: 'gerar_pedido_construcao',
      metodo: 'POST',
      rota: '/api/pacotes-decisao/[decId]/pedido-construcao',
      params: paramId.versao('decId', 'DEC'),
      valores: { decId: 'DEC-DEM-20261022-0001-v1' },
      corpo: z.object({}),
      enviado: {},
    },
  ];

  for (const c of CASOS) {
    it(`${c.fonte}: ${c.metodo} ${c.rota} com o token de cada agente responde 403 e não roda a função`, async () => {
      let chamadas = 0;
      const h = rota({ acao: c.acao, rota: c.rota, params: c.params, corpo: c.corpo }, async () => {
        chamadas++;
        return { json: { ok: true } };
      });
      const caminho = c.rota.replace(/\[([A-Za-z]+)\]/g, (_, n: string) => c.valores[n] ?? 'x');
      for (const agente of AGENTES) {
        const r = await chamarRota(h, { metodo: c.metodo, caminho, params: c.valores, corpo: c.enviado, bearer: cred.tokens[agente] });
        expect(r.status, agente).toBe(403);
        expect(await r.json(), agente).toEqual({ erro: 'sem_permissao', mensagem: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.' });
      }
      expect(chamadas).toBe(0);
      // Controle: o mesmo corpo, com a pessoa cto, chega à função; o 403 acima não foi do corpo.
      const r = await chamarRota(h, { metodo: c.metodo, caminho, params: c.valores, corpo: c.enviado, cookie: cred.cookies.cto });
      expect(r.status).toBe(200);
      expect(chamadas).toBe(1);
    });
  }
});
