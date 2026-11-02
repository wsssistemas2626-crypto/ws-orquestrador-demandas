// Detectores de dado pessoal (C-28 no Pedido de Construção; a T24 usa os mesmos na minimização, C-23). Sem banco; só
// valores fictícios.
import { describe, expect, it } from 'vitest';
import { DETECTORES, encontrarDadosPessoais, type TipoDadoPessoal } from './detectores';

describe('encontrarDadosPessoais', () => {
  it.each([
    ['contato@exemplo.test', 'e-mail'],
    ['(11) 90000-0000', 'telefone'],
    ['11 90000-0000', 'telefone'],
    ['+55 11 90000-0000', 'telefone'],
    ['(11) 3000-0000', 'telefone'],
    ['123.456.789-09', 'CPF'],
    ['12345678909', 'CPF'],
    ['12.345.678/0001-90', 'CNPJ'],
    ['12345678000190', 'CNPJ'],
  ] as const)('%s é %s', (v, tipo) => {
    expect(encontrarDadosPessoais({ a: `texto ${v} texto` }, [tipo])).toEqual([{ caminho: 'a', tipo }]);
  });

  it('ids do sistema não são dado pessoal', () => {
    expect(
      encontrarDadosPessoais({ a: 'DEM-20261022-0042 ESP-DEM-20261022-0042-v2 RSK-DEM-20261022-0042-v1 2026-10-22' }, ['e-mail', 'telefone', 'CPF']),
    ).toEqual([]);
  });

  it('o repositório, o sistema alvo e a data do pedido não são dado pessoal', () => {
    expect(
      encontrarDadosPessoais(
        { r: 'wsssistemas2626-crypto/ws-orquestrador-demandas', d: 'DEC-DEM-20261022-0001-v1', e: '2026-10-22', n: 'pnpm test verde' },
        ['e-mail', 'telefone', 'CPF'],
      ),
    ).toEqual([]);
  });

  it('caminho aninhado com índice de lista', () => {
    expect(encontrarDadosPessoais({ criterios_aceite_preliminares: ['ok', 'ligar (11) 90000-0000'] }, ['telefone'])).toEqual([
      { caminho: 'criterios_aceite_preliminares[1]', tipo: 'telefone' },
    ]);
  });

  it('objeto dentro de objeto vira caminho com ponto; objeto dentro de lista, índice e ponto', () => {
    expect(
      encontrarDadosPessoais({ especificacao: { conteudo: 'x contato@exemplo.test' }, lista: [{ a: 'ok' }, { a: '123.456.789-09' }] }, ['e-mail', 'CPF']),
    ).toEqual([
      { caminho: 'especificacao.conteudo', tipo: 'e-mail' },
      { caminho: 'lista[1].a', tipo: 'CPF' },
    ]);
  });

  it('só procura os tipos pedidos: CNPJ fica de fora quando não está na lista', () => {
    expect(encontrarDadosPessoais({ a: 'CNPJ 12.345.678/0001-90' }, ['e-mail', 'telefone', 'CPF'])).toEqual([]);
  });

  it('um campo com vários tipos dá um item por tipo, na ordem pedida, sem repetir o mesmo tipo', () => {
    expect(
      encontrarDadosPessoais({ a: 'contato@exemplo.test, outra@exemplo.test e (11) 90000-0000' }, ['telefone', 'e-mail', 'CPF']),
    ).toEqual([
      { caminho: 'a', tipo: 'telefone' },
      { caminho: 'a', tipo: 'e-mail' },
    ]);
  });

  it('a ordem dos itens segue a ordem das chaves e da lista', () => {
    expect(encontrarDadosPessoais({ b: 'x@exemplo.test', a: ['y@exemplo.test'] }, ['e-mail']).map((i) => i.caminho)).toEqual(['b', 'a[0]']);
  });

  it('número, booleano e nulo não são lidos; só texto', () => {
    expect(encontrarDadosPessoais({ n: 12345678909, b: true, z: null, u: undefined }, ['CPF'])).toEqual([]);
  });

  it('texto solto na raiz usa o caminho dado, ou vazio', () => {
    expect(encontrarDadosPessoais('contato@exemplo.test', ['e-mail'])).toEqual([{ caminho: '', tipo: 'e-mail' }]);
    expect(encontrarDadosPessoais('contato@exemplo.test', ['e-mail'], 'campo')).toEqual([{ caminho: 'campo', tipo: 'e-mail' }]);
    expect(encontrarDadosPessoais({ a: 'contato@exemplo.test' }, ['e-mail'], 'raiz')).toEqual([{ caminho: 'raiz.a', tipo: 'e-mail' }]);
  });

  it('o resultado nunca leva o valor encontrado', () => {
    const r = encontrarDadosPessoais({ a: 'contato@exemplo.test (11) 90000-0000 123.456.789-09' }, ['e-mail', 'telefone', 'CPF']);
    expect(JSON.stringify(r)).not.toMatch(/exemplo\.test|90000|456\.789/);
  });

  it('as expressões globais não guardam estado entre chamadas (lastIndex)', () => {
    const valor = { a: 'contato@exemplo.test' };
    for (let i = 0; i < 3; i++) expect(encontrarDadosPessoais(valor, ['e-mail'])).toEqual([{ caminho: 'a', tipo: 'e-mail' }]);
    expect(DETECTORES['e-mail'].lastIndex).toBe(0);
  });

  it('os quatro detectores existem e são globais', () => {
    expect(Object.keys(DETECTORES).sort()).toEqual(['CNPJ', 'CPF', 'e-mail', 'telefone']);
    for (const tipo of Object.keys(DETECTORES) as TipoDadoPessoal[]) expect(DETECTORES[tipo].flags, tipo).toContain('g');
  });
});
