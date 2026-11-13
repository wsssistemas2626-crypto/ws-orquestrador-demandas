// test/estatico/piso-de-assercoes.test.ts — CV-20 (04) e D-12: nenhum teste de segurança perde asserção. Piso = linhas
// com "expect(" em 198e97d (git grep -c "expect(" 198e97d, contado pelo tech-lead em 10/11/2026). Só sobe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PISO: Readonly<Record<string, number>> = {
  'e2e/seguranca.spec.ts': 28,
  'e2e/seguranca-qa.spec.ts': 38,
  'src/proxy.test.ts': 17,
  'test/estatico/classes-de-erro.test.ts': 4,
  'test/estatico/compose.test.ts': 8,
  'test/estatico/decisao-e2e.test.ts': 37,
  'test/estatico/eslint.test.ts': 5,
  'test/estatico/exigir-pessoa.test.ts': 4,
  'test/estatico/pacote-sem-extras.test.ts': 21,
  'test/estatico/painel-qa.test.ts': 14,
  'test/estatico/preco-so-por-script.test.ts': 5,
  'test/estatico/projeto.test.ts': 27,
  'test/estatico/relogio.test.ts': 5,
  'test/estatico/sql-raw.test.ts': 2,
  'test/estatico/variaveis.test.ts': 8,
  'test/estatico/varreduras-qa.test.ts': 22,
  'test/estatico/worker-agendador.test.ts': 12,
  // D-17 do pedido 0016 (IN-16): a9fd9b8, contado na T03.
  'src/modules/acesso/matriz.test.ts': 44,
  'src/modules/acesso/matriz-qa.test.ts': 37,
  'src/modules/acesso/resolver-ator.test.ts': 20,
  'src/modules/acesso/resolver-ator-qa.test.ts': 17,
  'src/modules/acesso/tokens-servico.test.ts': 34,
  'src/modules/acesso/tokens-servico-qa.test.ts': 26,
  'src/modules/demandas/servico.test.ts': 77,
  'src/modules/historico/registrar.test.ts': 12,
  'src/modules/limites.test.ts': 21,
  'src/db/privilegios.test.ts': 39,
  'src/app/api/vistas-para-agente.test.ts': 96,
  'test/matriz-rotas.test.ts': 17,
  'test/transversal/sentinelas.test.ts': 59,
  'test/estatico/sem-controle-bidi.test.ts': 7,
  'test/estatico/sem-recurso-externo.test.ts': 15,
  'test/estatico/leituras-da-fila.test.ts': 34,
  // T01 do DEC-DEM-20261111-0017-v1 (AN-10, AN-13): contado no fim da tarefa.
  'src/db/schema/andamento.test.ts': 17,
  // 06-T01-testes do DEC-DEM-20261111-0017-v1 (qa-automacao, AN-10): contado ao fim da etapa.
  'src/db/schema/andamento-qa.test.ts': 16,
  // T02 do DEC-DEM-20261111-0017-v1 (AN-01, AN-13): contado no fim da tarefa.
  'src/modules/acesso/matriz-andamento.test.ts': 13,
  // T07 do DEC-DEM-20261111-0017-v1 (AN-06 estático): sobe de 8 para a contagem no fim da tarefa.
  'test/estatico/andamento.test.ts': 43,
  // 06-T02-testes do DEC-DEM-20261111-0017-v1 (qa-automacao, AN-01): contado ao fim da etapa.
  'src/modules/acesso/matriz-andamento-qa.test.ts': 31,
  'test/estatico/andamento-qa.test.ts': 13,
  // T03 do DEC-DEM-20261111-0017-v1 (AN-07, AN-08 c): contado no fim da tarefa.
  'src/modules/limites-andamento.test.ts': 12,
  // 06-T03-testes do DEC-DEM-20261111-0017-v1 (qa-automacao, AN-07, AN-08 c): contado ao fim da etapa.
  'src/modules/limites-andamento-qa.test.ts': 58,
  // 06-T04-testes do DEC-DEM-20261111-0017-v1 (qa-automacao, AN-02, ADR-33, AN-13): contado ao fim da etapa.
  'src/lib/rota-corpo-invalido-qa.test.ts': 67,
  'src/modules/andamento/schemas-qa.test.ts': 29,
  // 06-T05-testes do DEC-DEM-20261111-0017-v1 (qa-automacao, AN-04, AN-06, AN-11, AN-12): contado ao fim da etapa.
  'src/modules/andamento/regras-qa.test.ts': 52,
  'src/modules/demandas/transicoes-construir-qa.test.ts': 25,
  // T07 do DEC-DEM-20261111-0017-v1 (AN-01, AN-03 a AN-06, AN-08, AN-11): contado no fim da tarefa.
  'src/modules/andamento/registrar.test.ts': 56,
  'src/modules/andamento/registrar-concorrencia.test.ts': 36,
  'src/modules/andamento/registrar-prazo.test.ts': 6,
  // T08 do DEC-DEM-20261111-0017-v1 (AN-01 c e d, AN-02, AN-03, AN-07 e AN-11 pela rota): contado no fim da tarefa.
  'src/app/api/pedidos-construcao/andamento.test.ts': 95,
  'src/app/api/pedidos-construcao/andamento-422.test.ts': 11,
  'test/transversal/sentinelas-andamento.test.ts': 20,
};
export const linhasComExpect = (fonte: string): number => fonte.split('\n').filter((l) => l.includes('expect(')).length;

describe('CV-20: piso de asserções por arquivo', () => {
  it('a contagem é por linha, como o git grep -c', () => {
    expect(linhasComExpect('expect(a).toBe(1);\nconst x = 1;\nexpect(b).toBe(2); expect(c).toBe(3);')).toBe(2);
  });
  it.each(Object.entries(PISO))('%s tem ao menos %i linhas com expect(', (arquivo, piso) => {
    expect(linhasComExpect(readFileSync(`${raiz}${arquivo}`, 'utf8'))).toBeGreaterThanOrEqual(piso);
  });
});
