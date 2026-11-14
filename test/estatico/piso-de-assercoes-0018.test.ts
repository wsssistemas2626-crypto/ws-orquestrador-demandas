// test/estatico/piso-de-assercoes-0018.test.ts — CA-08.1, CA-08.3 e SB-15 (0.4.1): o PISO só sobe. Cada entrada de
// 41108ee continua lá, com valor maior ou igual; e as entradas do B-08-2 estão no PISO com ao menos a contagem de
// 41108ee. O PISO_41108EE é a cópia do PISO de 41108ee (as entradas de piso-de-assercoes.test.ts antes da primeira do
// DEC-DEM-20261111-0018-v1), escrita à mão uma vez na T09.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));

const PISO_41108EE: Readonly<Record<string, number>> = {
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
  'src/db/schema/andamento.test.ts': 17,
  'src/db/schema/andamento-qa.test.ts': 16,
  'src/modules/acesso/matriz-andamento.test.ts': 13,
  'test/estatico/andamento.test.ts': 43,
  'src/modules/acesso/matriz-andamento-qa.test.ts': 31,
  'test/estatico/andamento-qa.test.ts': 13,
  'src/modules/limites-andamento.test.ts': 12,
  'src/modules/limites-andamento-qa.test.ts': 58,
  'src/lib/rota-corpo-invalido-qa.test.ts': 67,
  'src/modules/andamento/schemas-qa.test.ts': 29,
  'src/modules/andamento/regras-qa.test.ts': 52,
  'src/modules/demandas/transicoes-construir-qa.test.ts': 25,
  'src/modules/andamento/registrar.test.ts': 56,
  'src/modules/andamento/registrar-concorrencia.test.ts': 36,
  'src/modules/andamento/registrar-prazo.test.ts': 6,
  'src/app/api/pedidos-construcao/andamento.test.ts': 95,
  'src/app/api/pedidos-construcao/andamento-422.test.ts': 11,
  'test/transversal/sentinelas-andamento.test.ts': 20,
  'src/app/api/pedidos-construcao/andamento-qa.test.ts': 37,
  'src/app/api/demandas/leitura-awave-andamento.test.ts': 58,
  'test/transversal/visibilidade-andamento.test.ts': 11,
  'src/app/api/demandas/leitura-andamento-qa.test.ts': 32,
  'src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts': 14,
  'src/components/rotulos-andamento.test.ts': 14,
  'src/components/dados-do-andamento.test.ts': 58,
  'src/components/rotulos-andamento-qa.test.ts': 27,
  'src/components/dados-do-andamento-qa.test.ts': 50,
  'test/estatico/dados-do-andamento.test.ts': 22,
  'src/app/(painel)/demandas/[id]/andamento-detalhe-qa.test.ts': 69,
  'test/estatico/andamento-detalhe-qa.test.ts': 10,
};

// B-08-2 (Pendência 7 da 01, tabela da T09 e deps-qa da T08): arquivo e contagem de linhas com expect em 41108ee
// (git grep -c, refeita no fim da T09 com o mesmo resultado).
const DO_B_08_2: Readonly<Record<string, number>> = {
  'src/modules/andamento/registrar-qa.test.ts': 69,
  'src/modules/acesso/matriz-integracoes.test.ts': 8,
  'src/modules/acesso/matriz-integracoes-qa.test.ts': 45,
  'src/modules/acesso/ramos-por-ator.test.ts': 30,
  'src/modules/acesso/ramos-por-ator-qa.test.ts': 59,
  'src/modules/acesso/tokens-integracao.test.ts': 25,
  'src/modules/acesso/tokens-integracao-qa.test.ts': 40,
  'src/modules/acesso/tokens-integracao-corrompido.test.ts': 3,
  'test/matriz-rotas-integracoes-qa.test.ts': 14,
  'src/app/api/pedidos-construcao/entrega.test.ts': 81,
  'src/app/api/pedidos-construcao/entrega-qa.test.ts': 50,
  'src/app/api/pedidos-construcao/recebimento.test.ts': 71,
  'src/app/api/pedidos-construcao/recebimento-qa.test.ts': 54,
  'src/app/api/pedidos-construcao/log-das-integracoes.test.ts': 31,
  'src/app/api/pedidos-construcao/saidas-das-integracoes-qa.test.ts': 19,
  'src/modules/pedido-construcao/recebimento-0019.test.ts': 35,
  'src/app/api/demandas/visibilidade-agente-0019.test.ts': 40,
  'src/app/api/demandas/criacao-awave-0019.test.ts': 12,
  'src/app/api/pacotes-decisao/visibilidade-0019.test.ts': 16,
  'src/modules/demandas/confirmacao-0019.test.ts': 21,
  'src/modules/demandas/autor-desconhecido-0019.test.ts': 5,
  'src/modules/integracoes/prazo-total-0019.test.ts': 21,
  'src/modules/limites-integracao.test.ts': 30,
  'src/modules/limites-integracao-qa.test.ts': 23,
  'src/db/schema/integracao.test.ts': 21,
  'src/db/schema/integracao-qa.test.ts': 32,
  'src/modules/historico/consultas-integracao.test.ts': 9,
  'src/modules/historico/consultas-integracao-qa.test.ts': 8,
  'test/estatico/trace-e2e.test.ts': 14,
  'e2e/integracoes.spec.ts': 13,
  'e2e/integracoes-qa.spec.ts': 43,
  'src/lib/rota-corpo-invalido.test.ts': 7,
  'src/modules/andamento/schemas.test.ts': 11,
  'src/modules/andamento/regras.test.ts': 18,
  'src/modules/demandas/transicoes-construir.test.ts': 19,
  'e2e/andamento-construir.spec.ts': 40,
  'test/estatico/migration-0008.test.ts': 6,
  'src/lib/deps-qa.test.ts': 8,
};

// As entradas do PISO lidas do fonte (o arquivo não exporta o objeto): 'caminho': número.
const pisoAtual = (): Record<string, number> =>
  Object.fromEntries(
    [...readFileSync(`${raiz}test/estatico/piso-de-assercoes.test.ts`, 'utf8').matchAll(/^\s+'([^']+)': (\d+),$/gm)].map(
      (m) => [m[1], Number(m[2])],
    ),
  );

describe('SB-15: o piso só sobe', () => {
  it('a cópia de 41108ee tem as 63 entradas do PISO daquela versão', () => {
    expect(Object.keys(PISO_41108EE)).toHaveLength(63);
  });
  // Entrada que saiu do PISO vira 0, para a falha dizer o arquivo.
  it('nenhuma entrada de 41108ee saiu nem diminuiu', () => {
    const atual = pisoAtual();
    for (const [arquivo, valor] of Object.entries(PISO_41108EE)) {
      expect(atual[arquivo] ?? 0, arquivo).toBeGreaterThanOrEqual(valor);
    }
  });
  it('as entradas do B-08-2 estão no PISO com ao menos a contagem de 41108ee', () => {
    const atual = pisoAtual();
    for (const [arquivo, valor] of Object.entries(DO_B_08_2)) {
      expect(atual[arquivo] ?? 0, arquivo).toBeGreaterThanOrEqual(valor);
    }
  });
});
