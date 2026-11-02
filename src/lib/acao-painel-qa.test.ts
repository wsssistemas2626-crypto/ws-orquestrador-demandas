// Testes da etapa 06-T11-testes (qa-automacao): bordas de acaoDoPainel() que a construção não cobriu. Token de agente
// ou token de sessão em Bearer não abrem Server Action (C-04, C-09); redirect() e notFound() da função seguem para o
// Next (unstable_rethrow); valor lançado que não é Error; Sentry só no erro interno e nível do log (C-20, C-21).
// Better Auth e banco reais; os cabeçalhos da requisição vêm de um `next/headers` falso.
import { notFound, redirect } from 'next/navigation';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { criarDepsDeTeste } from '../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { criarPessoa } from '../../test/sessao';
import { comTransacao } from '../db/transacao';
import { criarTokenServico } from '../modules/acesso/tokens-servico';
import { acaoDoPainel } from './acao-painel';
import { definirDepsParaTeste, type Deps } from './deps';
import { MENSAGEM_ERRO_INTERNO } from './erros';
import { substituirDestinoDoLog } from './log';

const pedido = vi.hoisted(() => ({ cabecalhos: new Headers() }));
vi.mock('next/headers', () => ({ headers: async () => pedido.cabecalhos }));
const capturados = vi.hoisted(() => ({ erros: [] as unknown[] }));
vi.mock('./sentry', () => ({
  capturarErro: (e: unknown) => {
    capturados.erros.push(e);
  },
}));

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieSem2fa: string;
let tokenOrquestrador: string;
let rodou = 0;
const linhas: string[] = [];

const criar = acaoDoPainel({ acao: 'criar_demanda', entrada: z.object({ titulo: z.string().min(1).max(10) }) }, async () => {
  rodou++;
  return true;
});

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieSem2fa = (await criarPessoa(deps, { papel: 'cto', com2fa: false })).cookie;
  // `orquestrador` pode criar_demanda pela API: se a Server Action aceitasse o token, esta ação passaria.
  tokenOrquestrador = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'orquestrador', deps.relogio))).token;
  substituirDestinoDoLog({
    write: (l) => {
      linhas.push(l);
    },
  });
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  rodou = 0;
  linhas.length = 0;
  capturados.erros.length = 0;
  pedido.cabecalhos = new Headers();
});

const ultimaLinha = () => JSON.parse(linhas.at(-1)!) as Record<string, unknown>;

describe('acaoDoPainel QA: só pessoa com sessão por cookie', () => {
  it('token de agente em Authorization, sem cookie → nao_autenticado e a função não roda', async () => {
    pedido.cabecalhos = new Headers({ authorization: `Bearer ${tokenOrquestrador}` });
    expect(await criar({ titulo: 'Nova' })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(rodou).toBe(0);
    expect(linhas.join('\n')).not.toContain(tokenOrquestrador);
  });
  it('o token da sessão da pessoa mandado como Bearer, sem cookie → nao_autenticado', async () => {
    const valor = /wsod\.session_token=([^;]+)/.exec(cookieCto)?.[1];
    expect(valor).toBeDefined();
    pedido.cabecalhos = new Headers({ authorization: `Bearer ${decodeURIComponent(valor!)}` });
    expect(await criar({ titulo: 'Nova' })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(rodou).toBe(0);
  });
  it('cookie de sessão inventado → nao_autenticado', async () => {
    pedido.cabecalhos = new Headers({ cookie: 'wsod.session_token=inventado.assinatura' });
    expect(await criar({ titulo: 'Nova' })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(rodou).toBe(0);
  });
});

describe('acaoDoPainel QA: redirect() e notFound() da função seguem para o Next', () => {
  it('redirect() dentro da função não vira erro_interno: a promessa rejeita com o NEXT_REDIRECT', async () => {
    pedido.cabecalhos = new Headers({ cookie: cookieCto });
    const acao = acaoDoPainel({ acao: 'alterar_demanda', entrada: z.object({}) }, async () => {
      redirect('/demandas/DEM-20261022-0001');
    });
    const erro = await acao({}).then(
      () => null,
      (e: unknown) => e,
    );
    expect(String((erro as { digest?: string } | null)?.digest)).toMatch(/^NEXT_REDIRECT;/);
    expect(capturados.erros).toHaveLength(0);
  });
  it('notFound() dentro da função também segue para o Next, sem Sentry', async () => {
    pedido.cabecalhos = new Headers({ cookie: cookieCto });
    const acao = acaoDoPainel({ acao: 'alterar_demanda', entrada: z.object({}) }, async () => {
      notFound();
    });
    const erro = await acao({}).then(
      () => null,
      (e: unknown) => e,
    );
    expect(String((erro as { digest?: string } | null)?.digest)).toMatch(/^NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(capturados.erros).toHaveLength(0);
  });
});

describe('acaoDoPainel QA: C-20 e C-21', () => {
  it('valor lançado que não é Error (texto com sentinela) → erro_interno genérico, sem a sentinela', async () => {
    pedido.cabecalhos = new Headers({ cookie: cookieCto });
    const acao = acaoDoPainel({ acao: 'alterar_demanda', entrada: z.object({}) }, async () => {
      throw SENTINELAS.texto;
    });
    const r = await acao({});
    expect(r).toEqual({ ok: false, erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    expect(capturados.erros).toHaveLength(1);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
  it('nenhum erro esperado vai ao Sentry (sem sessão, sem 2FA, entrada inválida)', async () => {
    expect(await criar({ titulo: 'Nova' })).toMatchObject({ erro: 'nao_autenticado' });
    pedido.cabecalhos = new Headers({ cookie: cookieSem2fa });
    expect(await criar({ titulo: 'Nova' })).toMatchObject({ erro: 'sem_2fa' });
    pedido.cabecalhos = new Headers({ cookie: cookieCto });
    expect(await criar({ titulo: 'texto longo demais' })).toMatchObject({ erro: 'entrada_invalida' });
    expect(capturados.erros).toHaveLength(0);
  });
  it('linha do erro interno como error (50); a do erro esperado e a do sucesso como info (30)', async () => {
    pedido.cabecalhos = new Headers({ cookie: cookieCto });
    const falha = acaoDoPainel({ acao: 'alterar_demanda', entrada: z.object({}) }, async () => {
      throw new Error('falha qualquer');
    });
    await falha({});
    expect(ultimaLinha()).toMatchObject({ level: 50, evento: 'acao_painel', codigoErro: 'erro_interno', atorTipo: 'pessoa' });
    await criar({ titulo: 'Nova' });
    expect(ultimaLinha()).toMatchObject({ level: 30, atorTipo: 'pessoa' });
    expect(ultimaLinha()).not.toHaveProperty('codigoErro');
    pedido.cabecalhos = new Headers();
    await criar({ titulo: 'Nova' });
    expect(ultimaLinha()).toMatchObject({ level: 30, atorTipo: 'anonimo', codigoErro: 'nao_autenticado' });
  });
  it('a linha não leva o valor do cookie de sessão', async () => {
    pedido.cabecalhos = new Headers({ cookie: cookieCto });
    await criar({ titulo: 'Nova' });
    const valor = /wsod\.session_token=([^;]+)/.exec(cookieCto)![1]!;
    expect(linhas.join('\n')).not.toContain(valor);
    expect(linhas.join('\n')).not.toContain(decodeURIComponent(valor));
  });
});
