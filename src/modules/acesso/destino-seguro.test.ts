// C-40: depois do login, a volta só vai a caminho relativo do painel; qualquer outra coisa vai para a fila.
import { describe, expect, it } from 'vitest';
import { destinoSeguro, ROTAS_DO_PAINEL } from './destino-seguro';

describe('destinoSeguro (C-40)', () => {
  it.each([
    ['https://atacante.test', '/demandas'],
    ['//atacante.test/x', '/demandas'],
    ['/\\atacante.test', '/demandas'],
    ['javascript:alert(1)', '/demandas'],
    [null, '/demandas'],
    ['/rota-que-nao-existe', '/demandas'],
    ['/demandas/DEM-20261022-0042', '/demandas/DEM-20261022-0042'],
    ['/pacotes-decisao/DEC-DEM-20261022-0042-v1', '/pacotes-decisao/DEC-DEM-20261022-0042-v1'],
  ])('%s → %s', (entrada, saida) => {
    expect(destinoSeguro(entrada)).toBe(saida);
  });

  it.each([
    '/demandas',
    '/demandas/nova',
    '/demandas/DEM-20261022-0042/editar',
    '/demandas/DEM-20261022-0042/especificacoes/nova',
    '/demandas/DEM-20261022-0042/pareceres-risco/novo',
    '/demandas/DEM-20261022-0042/pacotes-decisao/novo',
    '/especificacoes/ESP-DEM-20261022-0042-v2',
    '/pareceres-risco/RSK-DEM-20261022-0042-v1',
    '/configuracao/agentes',
    '/demandas?status=nova&tipo=bug&pagina=2',
  ])('rota do painel %s é aceita como está', (caminho) => {
    expect(destinoSeguro(caminho)).toBe(caminho);
  });

  it.each([
    [undefined],
    [''],
    ['demandas'],
    ['/entrar'],
    ['/configurar-2fa'],
    ['/api/demandas'],
    ['/demandas/../api/auth/sign-out'],
    ['/%2F%2Fatacante.test'],
    ['/demandas/DEM-2026-1'],
    ['/demandas/DEM-20261022-0042/'],
    ['/demandas#https://atacante.test'],
    ['/demandas?volta=https://atacante.test/<script>'],
    ['/demandas\n/x'],
    [' /demandas'],
    ['/' + 'a'.repeat(3000)],
  ])('%j vai para /demandas', (entrada) => {
    expect(destinoSeguro(entrada)).toBe('/demandas');
  });

  it('a lista de rotas é só de padrões ancorados', () => {
    expect(ROTAS_DO_PAINEL.length).toBeGreaterThan(0);
    for (const r of ROTAS_DO_PAINEL) {
      // `source` escreve a barra escapada: '^\/'.
      expect(r.source.startsWith('^\\/')).toBe(true);
      expect(r.source.endsWith('$')).toBe(true);
    }
  });
});
