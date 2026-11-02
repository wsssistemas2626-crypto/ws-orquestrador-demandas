// Escrito na 06-T37-testes (qa-automacao). C-40 na página /entrar, sem navegador: o formulário só recebe o destino já
// passado por destinoSeguro no servidor, e `motivo` só liga o alerta com o valor exato. O e2e prova dois destinos (URL
// externa e fila com consulta); aqui ficam as outras formas de redirecionamento aberto e os parâmetros repetidos.
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PaginaEntrar from './page';

// O formulário real é um componente de navegador; aqui só interessa o que a página entrega a ele.
vi.mock('./FormularioEntrar', () => ({
  FormularioEntrar: (p: { destino: string; sessaoTerminou: boolean }): ReactElement =>
    h('output', { 'data-destino': p.destino, 'data-sessao': String(p.sessaoTerminou) }),
}));

type Parametros = Record<string, string | string[] | undefined>;

async function propsDoFormulario(p: Parametros): Promise<{ destino: string; sessao: string }> {
  const s = renderToStaticMarkup(await PaginaEntrar({ searchParams: Promise.resolve(p) }));
  const m = /<output data-destino="([^"]*)" data-sessao="([^"]*)"/.exec(s);
  if (!m) throw new Error('a página não montou o formulário');
  return { destino: m[1]!.replace(/&amp;/g, '&'), sessao: m[2]! };
}

describe('C-40: o destino depois do login', () => {
  it.each([
    ['URL externa', 'https://atacante.test/demandas'],
    ['sem esquema, com duas barras', '//atacante.test/demandas'],
    ['barra e contrabarra', '/\\atacante.test'],
    ['esquema javascript:', 'javascript:alert(1)'],
    ['caminho relativo sem barra', 'demandas'],
    ['rota de fora do painel', '/configurar-2fa'],
    ['a própria tela de login', '/entrar'],
    ['rota da API', '/api/demandas'],
    ['travessia de caminho', '/demandas/../api/demandas'],
    ['consulta com URL dentro', '/demandas?volta=https://atacante.test'],
    ['consulta com fragmento', '/demandas?status=nova#x'],
    ['vazio', ''],
  ])('%s vai para /demandas', async (_nome, callbackURL) => {
    expect((await propsDoFormulario({ callbackURL })).destino).toBe('/demandas');
  });

  it('callbackURL repetido na URL (vira lista) vai para /demandas, mesmo que um dos valores seja do painel', async () => {
    expect((await propsDoFormulario({ callbackURL: ['/demandas/nova', 'https://atacante.test'] })).destino).toBe('/demandas');
    expect((await propsDoFormulario({ callbackURL: ['/demandas/nova'] })).destino).toBe('/demandas');
  });

  it('sem callbackURL, a fila', async () => {
    expect((await propsDoFormulario({})).destino).toBe('/demandas');
  });

  it.each([
    ['/demandas/nova'],
    ['/demandas/DEM-20261022-0001'],
    ['/pacotes-decisao/DEC-DEM-20261022-0001-v2'],
    ['/configuracao/agentes'],
    ['/demandas?status=nova&tipo=bug'],
  ])('caminho do painel %s é mantido como veio', async (callbackURL) => {
    expect((await propsDoFormulario({ callbackURL })).destino).toBe(callbackURL);
  });
});

describe('motivo=sessao (03, 2.8)', () => {
  it('só o valor exato liga o alerta de sessão terminada', async () => {
    expect((await propsDoFormulario({ motivo: 'sessao' })).sessao).toBe('true');
    for (const motivo of ['Sessao', 'sessao ', 'outro', ''] as const) expect((await propsDoFormulario({ motivo })).sessao, motivo).toBe('false');
    expect((await propsDoFormulario({ motivo: ['sessao', 'sessao'] })).sessao).toBe('false');
    expect((await propsDoFormulario({})).sessao).toBe('false');
  });
});
