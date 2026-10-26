// C-40, casos de borda além do roteiro do plano: barra invertida codificada, caixa, controle, prefixo trocado, versão
// fora do formato, fragmento e o limite exato de tamanho.
import { describe, expect, it } from 'vitest';
import { destinoSeguro } from './destino-seguro';

describe('destinoSeguro (C-40), bordas', () => {
  it.each([
    ['/%5Catacante.test'],
    ['/%5C%5Catacante.test'],
    ['\\\\atacante.test'],
    ['\\/atacante.test'],
    ['JAVASCRIPT:alert(1)'],
    ['data:text/html,x'],
    ['/DEMANDAS'],
    ['/demandas\t'],
    ['/demandas\r\n'],
    ['/demandas/DEM-20261022-0042/editar/../../../api'],
    ['/demandas/DEM-20261022-00420'],
    ['/demandas/dem-20261022-0042'],
    ['/especificacoes/RSK-DEM-20261022-0042-v1'],
    ['/pacotes-decisao/DEC-DEM-20261022-0042-v12345'],
    ['/pacotes-decisao/DEC-DEM-20261022-0042-v'],
    ['/demandas?status=nova#topo'],
    ['/demandas?x=a b'],
    ['/demandas?x=https%3A//atacante.test'],
    ['/demandas?x=\\atacante.test'],
    ['/demandas?x="><script>'],
  ])('%j vai para /demandas', (entrada) => {
    expect(destinoSeguro(entrada)).toBe('/demandas');
  });

  it.each([[42], [{}], [['/demandas/nova']]])('valor que não é texto (%j) vai para /demandas', (entrada) => {
    expect(destinoSeguro(entrada as never)).toBe('/demandas');
  });

  it('até 2.048 caracteres a volta vale; com 2.049, vai para /demandas', () => {
    const base = '/demandas?pagina=';
    const no = base + '1'.repeat(2048 - base.length);
    const acima = no + '1';
    expect(no).toHaveLength(2048);
    expect(destinoSeguro(no)).toBe(no);
    expect(destinoSeguro(acima)).toBe('/demandas');
  });

  it('versão com 1 a 4 dígitos é aceita nas três rotas de artefato', () => {
    for (const v of ['1', '12', '123', '1234']) {
      expect(destinoSeguro(`/especificacoes/ESP-DEM-20261022-0042-v${v}`)).toBe(`/especificacoes/ESP-DEM-20261022-0042-v${v}`);
      expect(destinoSeguro(`/pareceres-risco/RSK-DEM-20261022-0042-v${v}`)).toBe(`/pareceres-risco/RSK-DEM-20261022-0042-v${v}`);
      expect(destinoSeguro(`/pacotes-decisao/DEC-DEM-20261022-0042-v${v}`)).toBe(`/pacotes-decisao/DEC-DEM-20261022-0042-v${v}`);
    }
  });
});
