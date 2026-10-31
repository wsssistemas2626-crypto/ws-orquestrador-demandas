// T41 (06-T41-testes, qa-automacao), achado 3 da 06-T41-revisao: RE_ID_ESP (dados-da-especificacao.ts, que vai ao
// navegador) é cópia da regra de id de versão do servidor: RE_ID_VERSAO (versoes.ts) e a regex de ESP de rota()
// (reIdVersao, G3.10), que guardam GET /api/especificacoes/:espId. A T07 (?base=) e a T10 decidem por ela o 404 sem
// consulta (C-17); se ela se afastar, a página e a API passam a discordar sobre o que é um id de ESP. Sem banco, sem
// relógio.
import { describe, expect, it } from 'vitest';
import { reIdVersao } from '../lib/rota';
import { RE_ID_VERSAO } from '../modules/versoes';
import { RE_ID_ESP } from './dados-da-especificacao';

const VALIDOS = ['ESP-DEM-20261022-0001-v1', 'ESP-DEM-20261022-9999-v9999', 'ESP-DEM-00000000-0000-v0', 'ESP-DEM-20261231-0042-v12'];

const INVALIDOS = [
  '',
  'ESP',
  'RSK-DEM-20261022-0001-v1',
  'DEC-DEM-20261022-0001-v1',
  'DEM-20261022-0001',
  'esp-DEM-20261022-0001-v1',
  'ESP-dem-20261022-0001-v1',
  'ESP-DEM-20261022-0001-V1',
  'ESP-DEM-20261022-0001-v',
  'ESP-DEM-20261022-0001-v10000',
  'ESP-DEM-2026102-0001-v1',
  'ESP-DEM-202610221-0001-v1',
  'ESP-DEM-20261022-001-v1',
  'ESP-DEM-20261022-00011-v1',
  'ESP-DEM-20261022-0001v1',
  ' ESP-DEM-20261022-0001-v1',
  'ESP-DEM-20261022-0001-v1 ',
  'ESP-DEM-20261022-0001-v1\n',
  '\nESP-DEM-20261022-0001-v1',
  'ESP-DEM-20261022-0001-v1/../x',
  'ESP-DEM-20261022-0001-v1&base=x',
  'ESP-DEM-20261022-0001-v1%00',
  'ESP-DEM-20261022-0001-v-1',
  'ESP-DEM-20261022-0001-v1.0',
  // Dígitos fora do ASCII: \d sem a flag u só aceita 0-9.
  'ESP-DEM-２０２６1022-0001-v1',
  'ESP-DEM-20261022-0001-v١',
  'ESPDEM-20261022-0001-v1',
  'XESP-DEM-20261022-0001-v1',
];

// Combinações de prefixo, data, número e versão, com cada pedaço no tamanho certo e um a mais ou a menos.
function combinacoes(): string[] {
  const saida: string[] = [];
  for (const prefixo of ['ESP', 'RSK', 'DEC', 'esp', 'ES', 'ESPP'])
    for (const data of ['2026102', '20261022', '202610221'])
      for (const numero of ['001', '0001', '00001'])
        for (const versao of ['', '1', '0042', '12345']) saida.push(`${prefixo}-DEM-${data}-${numero}-v${versao}`);
  return saida;
}

describe('RE_ID_ESP igual à regra de id de ESP do servidor (achado 3 da 06-T41-revisao)', () => {
  const todos = [...VALIDOS, ...INVALIDOS, ...combinacoes()];

  it('aceita os ids válidos e recusa os inválidos', () => {
    for (const id of VALIDOS) expect(RE_ID_ESP.test(id), id).toBe(true);
    for (const id of INVALIDOS) expect(RE_ID_ESP.test(id), JSON.stringify(id)).toBe(false);
  });

  it('decide igual a reIdVersao("ESP") de rota() em todas as formas', () => {
    for (const id of todos) expect(RE_ID_ESP.test(id), JSON.stringify(id)).toBe(reIdVersao('ESP').test(id));
  });

  it('decide igual a RE_ID_VERSAO (versoes.ts) restrita ao prefixo ESP em todas as formas', () => {
    for (const id of todos) expect(RE_ID_ESP.test(id), JSON.stringify(id)).toBe(RE_ID_VERSAO.test(id) && id.startsWith('ESP-'));
  });

  it('as combinações cobrem os dois lados: há id aceito e recusado entre elas', () => {
    const aceitos = combinacoes().filter((id) => RE_ID_ESP.test(id));
    expect(aceitos).toEqual(['ESP-DEM-20261022-0001-v1', 'ESP-DEM-20261022-0001-v0042']);
  });

  it('não tem flag que mude o casamento (g guarda lastIndex; i, m e s afrouxam)', () => {
    expect(RE_ID_ESP.flags).toBe('');
    expect(RE_ID_ESP.flags).toBe(reIdVersao('ESP').flags);
  });
});
