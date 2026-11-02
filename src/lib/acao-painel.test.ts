// acaoDoPainel(): o adaptador de toda Server Action (C-04, C-12, C-20, C-21). Better Auth e banco reais; os cabeçalhos
// da requisição vêm de um `next/headers` falso, porque fora do Next não há requisição em curso.
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { criarDepsDeTeste } from '../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { criarPessoa } from '../../test/sessao';
import { acaoDoPainel } from './acao-painel';
import { definirDepsParaTeste, type Deps } from './deps';
import { ErroDominio, MENSAGEM_ERRO_INTERNO } from './erros';
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
let cookieAdm: string;
let cookieSem2fa: string;
let rodou = 0;
const linhas: string[] = [];

const comCookie = (cookie: string) => {
  pedido.cabecalhos = new Headers({ cookie });
};

const alterarTitulo = acaoDoPainel(
  { acao: 'alterar_demanda', entrada: z.object({ titulo: z.string().min(1).max(10) }) },
  async ({ ator, entrada }) => {
    rodou++;
    return { titulo: entrada.titulo, papel: ator.papel };
  },
);
const mudarTeto = acaoDoPainel({ acao: 'alterar_teto', entrada: z.object({ valor: z.number().min(0) }) }, async () => {
  rodou++;
  return null;
});

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  cookieSem2fa = (await criarPessoa(deps, { papel: 'cto', com2fa: false })).cookie;
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

describe('acaoDoPainel', () => {
  it('pessoa com 2FA e entrada válida → { ok: true, dados }', async () => {
    comCookie(cookieCto);
    expect(await alterarTitulo({ titulo: 'Novo' })).toEqual({ ok: true, dados: { titulo: 'Novo', papel: 'cto' } });
    expect(rodou).toBe(1);
  });
  it('sem sessão → nao_autenticado e a função não roda', async () => {
    expect(await alterarTitulo({ titulo: 'Novo' })).toMatchObject({ ok: false, erro: 'nao_autenticado' });
    expect(rodou).toBe(0);
  });
  it('C-04: sem 2FA → { ok: false, erro: "sem_2fa" } e a função não roda', async () => {
    comCookie(cookieSem2fa);
    expect(await alterarTitulo({ titulo: 'Novo' })).toEqual({
      ok: false,
      erro: 'sem_2fa',
      mensagem: 'Para usar o painel, configure a verificação em duas etapas.',
    });
    expect(rodou).toBe(0);
  });
  it('C-12: administradora em ação de cto → sem_permissao', async () => {
    comCookie(cookieAdm);
    expect(await mudarTeto({ valor: 1 })).toEqual({
      ok: false,
      erro: 'sem_permissao',
      mensagem: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.',
    });
    expect(rodou).toBe(0);
    comCookie(cookieCto);
    expect(await mudarTeto({ valor: 1 })).toEqual({ ok: true, dados: null });
  });
  it('a autorização vem antes da validação: administradora com entrada inválida recebe sem_permissao', async () => {
    comCookie(cookieAdm);
    expect(await mudarTeto({ valor: 'x' })).toMatchObject({ ok: false, erro: 'sem_permissao' });
  });
  it('Zod inválido → entrada_invalida com campos pt-BR, sem o valor recebido', async () => {
    comCookie(cookieCto);
    const r = await alterarTitulo({ titulo: SENTINELAS.texto });
    expect(r).toEqual({
      ok: false,
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [{ campo: 'titulo', mensagem: 'Este campo aceita até 10 caracteres.' }],
    });
    expect(JSON.stringify(r)).not.toContain(SENTINELAS.texto);
    expect(rodou).toBe(0);
  });
  it('entrada que não é objeto → entrada_invalida', async () => {
    comCookie(cookieCto);
    expect(await alterarTitulo('texto solto')).toMatchObject({ ok: false, erro: 'entrada_invalida' });
  });
  it('C-11: chave desconhecida é descartada antes da função', async () => {
    comCookie(cookieCto);
    let entradaVista: unknown;
    const acao = acaoDoPainel({ acao: 'alterar_demanda', entrada: z.object({ titulo: z.string() }) }, async ({ entrada }) => {
      entradaVista = entrada;
      return true;
    });
    await acao({ titulo: 'x', autorTipo: 'agente', papelAprovacao: 'administradora' });
    expect(entradaVista).toEqual({ titulo: 'x' });
  });
  it('ErroDominio da função volta com o código, a mensagem e os extras', async () => {
    comCookie(cookieCto);
    const acao = acaoDoPainel({ acao: 'criar_pacote_decisao', entrada: z.object({}) }, async () => {
      throw new ErroDominio('entrada_invalida', 'Faltam versões.', { faltando: ['especificacao'] });
    });
    expect(await acao({})).toEqual({ ok: false, erro: 'entrada_invalida', mensagem: 'Faltam versões.', faltando: ['especificacao'] });
    expect(capturados.erros).toHaveLength(0);
  });
  it('C-20: erro do banco → erro_interno com a mensagem genérica, sem detalhe, e vai ao Sentry', async () => {
    comCookie(cookieCto);
    const acao = acaoDoPainel({ acao: 'alterar_demanda', entrada: z.object({}) }, async ({ deps: d }) => {
      await d.db.execute(sql`select * from tabela_inexistente where x = ${SENTINELAS.texto}`);
      return null;
    });
    const r = await acao({});
    expect(r).toEqual({ ok: false, erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    expect(capturados.erros).toHaveLength(1);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
  it('C-21: uma linha de log só com os campos da lista, sem dado da entrada', async () => {
    comCookie(cookieCto);
    await alterarTitulo({ titulo: SENTINELAS.nome });
    expect(linhas).toHaveLength(1);
    const linha = JSON.parse(linhas[0]!) as Record<string, unknown>;
    expect(linha).toMatchObject({ evento: 'acao_painel', rota: 'alterar_demanda', atorTipo: 'pessoa', codigoErro: 'entrada_invalida' });
    expect(Object.keys(linha).filter((k) => !['level', 'time', 'msg'].includes(k)).sort()).toEqual([
      'atorTipo',
      'codigoErro',
      'evento',
      'ms',
      'rota',
    ]);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
});
