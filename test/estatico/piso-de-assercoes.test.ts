// test/estatico/piso-de-assercoes.test.ts — CV-20 (04) e D-12: nenhum teste de segurança perde asserção. Piso = linhas
// com "expect(" em 198e97d (git grep -c "expect(" 198e97d, contado pelo tech-lead em 10/11/2026). Só sobe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PISO: Readonly<Record<string, number>> = {
  // 06-T09-testes do DEC-DEM-20261111-0018-v1 (P2 da 06-T09-tech-lead): sobe de 28 para a contagem do fim da etapa.
  'e2e/seguranca.spec.ts': 70,
  'e2e/seguranca-qa.spec.ts': 38,
  'src/proxy.test.ts': 17,
  'test/estatico/classes-de-erro.test.ts': 4,
  'test/estatico/compose.test.ts': 8,
  'test/estatico/decisao-e2e.test.ts': 37,
  'test/estatico/eslint.test.ts': 5,
  'test/estatico/exigir-pessoa.test.ts': 4,
  'test/estatico/pacote-sem-extras.test.ts': 21,
  // 06-T09-testes do DEC-DEM-20261111-0018-v1 (P2): sobe de 14 para a contagem do fim da etapa.
  'test/estatico/painel-qa.test.ts': 19,
  'test/estatico/preco-so-por-script.test.ts': 5,
  'test/estatico/projeto.test.ts': 27,
  'test/estatico/relogio.test.ts': 5,
  'test/estatico/sql-raw.test.ts': 2,
  'test/estatico/variaveis.test.ts': 8,
  'test/estatico/varreduras-qa.test.ts': 22,
  'test/estatico/worker-agendador.test.ts': 12,
  // D-17 do pedido 0016 (IN-16): a9fd9b8, contado na T03.
  // 06-T09-testes do DEC-DEM-20261111-0018-v1 (P2): sobe de 44 para a contagem do fim da etapa.
  'src/modules/acesso/matriz.test.ts': 47,
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
  // 06-T09-testes do DEC-DEM-20261111-0018-v1 (P2): as duas sobem (17 para 18 e 59 para 99), contagem do fim da etapa.
  'test/matriz-rotas.test.ts': 18,
  'test/transversal/sentinelas.test.ts': 99,
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
  // 06-T09-testes do DEC-DEM-20261111-0018-v1 (P2): sobe de 43 para a contagem do fim da etapa.
  'test/estatico/andamento.test.ts': 50,
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
  // 06-T08-testes do DEC-DEM-20261111-0017-v1 (qa-automacao; credencial, ordem das recusas e CA-02.7 pela rota).
  'src/app/api/pedidos-construcao/andamento-qa.test.ts': 37,
  // T09 do DEC-DEM-20261111-0017-v1 (AN-09, AN-06 c, CA-04.6 na leitura): contado no fim da tarefa.
  'src/app/api/demandas/leitura-awave-andamento.test.ts': 58,
  'test/transversal/visibilidade-andamento.test.ts': 11,
  // 06-T09-testes do DEC-DEM-20261111-0017-v1 (qa-automacao; AN-09 por ator, andamento de cada demanda, CA-04.6 campo a campo).
  'src/app/api/demandas/leitura-andamento-qa.test.ts': 32,
  'src/app/api/demandas/leitura-andamento-fora-do-esquema-qa.test.ts': 14,
  // 06-T11-testes do DEC-DEM-20261111-0017-v1 (qa-automacao; AN-12 na tela, CA-06.5, CA-08.4, CV-09): os dois da T11,
  // que a construção não contou, e os três da etapa, contados ao fim da etapa.
  'src/components/rotulos-andamento.test.ts': 14,
  // 06-T13-testes: sobe de 51 para 58 com os quatro testes do M1 da 06-T11-tech-lead movidos de
  // dados-das-etapas-andamento.test.ts (M2 da 06-T13-tech-lead), sem mudar asserção.
  'src/components/dados-do-andamento.test.ts': 58,
  'src/components/rotulos-andamento-qa.test.ts': 27,
  'src/components/dados-do-andamento-qa.test.ts': 50,
  'test/estatico/dados-do-andamento.test.ts': 22,
  // 06-T13-testes do DEC-DEM-20261111-0017-v1 (qa-automacao; CV-02, CV-19 e C-18 na seção do detalhe, CA-04.6 no
  // detalhe): contado ao fim da etapa.
  'src/app/(painel)/demandas/[id]/andamento-detalhe-qa.test.ts': 69,
  'test/estatico/andamento-detalhe-qa.test.ts': 10,
  // T01 do DEC-DEM-20261111-0018-v1 (SB-01): contado no fim da tarefa.
  'src/modules/acesso/matriz-situacao.test.ts': 15,
  'test/estatico/situacao.test.ts': 17,
  // 06-T01-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-01 adversarial e varredura ampliada): contado ao fim
  // da etapa.
  'src/modules/acesso/matriz-situacao-qa.test.ts': 46,
  'test/estatico/situacao-qa.test.ts': 21,
  // T02 do DEC-DEM-20261111-0018-v1 (SB-01 c, SB-02 a SB-06): contado no fim da tarefa; test/estatico/situacao.test.ts
  // sobe de 8 para 17 (acima), a contagem do fim da tarefa.
  'src/modules/pedido-construcao/situacao.test.ts': 29,
  'src/app/api/pedidos-construcao/situacao.test.ts': 48,
  'src/app/api/pedidos-construcao/situacao-403.test.ts': 11,
  'test/transversal/sentinelas-situacao.test.ts': 14,
  // 06-T02-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; oráculo 403 × 404 com o serviço de verdade, consultas
  // pela rota, id quase igual, bordas do CA-01.2 e o M1 do SB-06): contado ao fim da etapa.
  'src/app/api/pedidos-construcao/situacao-qa.test.ts': 33,
  'test/estatico/situacao-t02-qa.test.ts': 27,
  // T03 do DEC-DEM-20261111-0018-v1 (SB-07 d, SB-10): contado no fim da tarefa.
  'src/db/schema/caminhos-da-criacao.test.ts': 9,
  'test/estatico/migration-0010.test.ts': 4,
  // 06-T03-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-09 na coluna nova a partir da MATRIZ, SB-10 e G4 com as
  // migrations da main presas pelo SHA-256): contado ao fim da etapa.
  'test/transversal/visibilidade-caminhos-da-criacao-qa.test.ts': 19,
  'test/estatico/migrations-congeladas-qa.test.ts': 12,
  // T04 do DEC-DEM-20261111-0018-v1 (SB-07 a, b, c, e; SB-08 c, f; SB-09 a, b): contado no fim da tarefa.
  'src/modules/pedido-construcao/textos-da-criacao.test.ts': 33,
  'src/modules/pacotes-decisao/marcacao-da-criacao.test.ts': 18,
  'test/transversal/visibilidade-caminhos-da-criacao.test.ts': 13,
  'test/estatico/caminhos-da-criacao.test.ts': 28,
  // 06-T04-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-07 adversarial nos cinco caminhos de criação, com a
  // conferência igual à do D1 relida do banco; ExtrasDoPacote e criar.ts sem a chave fora das três linhas; tipo da linha
  // com a coluna obrigatória): contado ao fim da etapa.
  'src/modules/pacotes-decisao/marcacao-da-criacao-qa.test.ts': 27,
  'test/estatico/caminhos-da-criacao-qa.test.ts': 33,
  // T05 do DEC-DEM-20261111-0018-v1 (SB-08 a, b, d, e; SB-09 c, d; CA-02.1 a CA-02.5): contado no fim da tarefa.
  'src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts': 48,
  'test/transversal/sentinelas-nome-da-criacao.test.ts': 10,
  // 06-T05-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-08 adversarial nos cinco caminhos de geração e entrega,
  // o DEC recusado continua recusado em toda troca do solicitanteNome, e sentinelas com o Sentry exercitado): contado ao
  // fim da etapa.
  'src/modules/pedido-construcao/conferir-nome-da-criacao-qa.test.ts': 30,
  // T06 do DEC-DEM-20261111-0018-v1 (SB-11; CA-03.1 a CA-03.5; 7.1): contado no fim da tarefa.
  'src/modules/demandas/arquivamento.test.ts': 10,
  'src/modules/demandas/arquivamento-status.test.ts': 14,
  'src/modules/pacotes-decisao/arquivar-com-vigente.test.ts': 49,
  'test/estatico/arquivamento.test.ts': 29,
  // 06-T06-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-11 adversarial: critério 3 pelas rotas, vigente
  // desatualizado pelo RSK, aprovação incompleta nas duas ordens e por cima do vigente, corrida com o RSK novo e com a
  // aprovação que completaria o v1): contado ao fim da etapa.
  'src/modules/pacotes-decisao/arquivar-com-vigente-qa.test.ts': 63,
  // T07 do DEC-DEM-20261111-0018-v1 (SB-13, CA-07.2, CA-07.3: uma linha por demanda, sem Sort, id malicioso sem
  // efeito): contado no fim da tarefa.
  'src/modules/andamento/consultas.test.ts': 38,
  // 06-T07-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; B-08-1 com 3.000 linhas por demanda e as descartadas por
  // filtro, controle com a consulta da 0.4.0, plano sem Sort em páginas de 1 a 204, SB-13 com ids adversariais):
  // contado ao fim da etapa.
  'src/modules/andamento/consultas-qa.test.ts': 28,
  // T08 do DEC-DEM-20261111-0018-v1 (SB-14, CA-04.2, CA-04.3: o C-27 sem asserção a menos e a prova permanente de que a
  // verificação pega o papel do migrator): contado no fim da tarefa.
  'src/lib/deps-qa.test.ts': 8,
  'test/sessoes-do-banco.test.ts': 5,
  // 06-T08-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-14 adversarial: app, fila e pool do migrator deixam o
  // C-27 vermelho, falha forçada sem URL, senha, consulta nem endereço, e o superusuário de leitura só no banco de
  // teste): contado ao fim da etapa.
  'test/sessoes-do-banco-qa.test.ts': 26,
  'test/estatico/sessoes-do-banco-qa.test.ts': 66,
  // T09 do DEC-DEM-20261111-0018-v1 (B-08-2, SB-15): contado no fim da tarefa; conferido pela 06-T09-testes.
  // src/lib/deps-qa.test.ts já entrou na T08 (acima) e segue com 8.
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
  // 06-T09-testes: sobe de 3 para 4 com o caso das entradas da etapa.
  'test/estatico/piso-de-assercoes-0018.test.ts': 4,
  // 06-T09-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; CA-08.2, P1 da 06-T09-tech-lead): os testes de segurança
  // da 0.3.0, da 0.3.1 e da 0.4.0 que a lista da T09 não trazia, contados ao fim da etapa. 0.3.0 (DEC-0016):
  'scripts/token-integracao.test.ts': 62,
  'scripts/token-integracao-qa.test.ts': 48,
  'src/modules/integracoes/tempo-limite.test.ts': 32,
  'src/modules/integracoes/tempo-limite-qa.test.ts': 16,
  'src/app/api/demandas/leitura-awave.test.ts': 28,
  'src/app/api/demandas/leitura-awave-qa.test.ts': 36,
  'src/app/api/demandas/criacao-awave.test.ts': 81,
  'src/app/api/demandas/criacao-awave-qa.test.ts': 35,
  'src/app/api/demandas/contrato-awave.test.ts': 17,
  'src/modules/agentes/gatilhos-awave.test.ts': 28,
  'src/modules/agentes/gatilhos-awave-qa.test.ts': 40,
  'src/modules/agentes/executar-awave.test.ts': 20,
  'src/modules/demandas/confirmar.test.ts': 32,
  'src/app/(painel)/demandas/[id]/acoes-confirmar.test.ts': 22,
  'src/modules/demandas/origem.test.ts': 67,
  'src/modules/demandas/origem-qa.test.ts': 43,
  'src/app/(painel)/demandas/fila-origem.test.ts': 59,
  'src/app/(painel)/demandas/fila-origem-qa.test.ts': 42,
  'e2e/fila-origem.spec.ts': 43,
  'src/components/rotulos-integracao.test.ts': 30,
  'src/components/rotulos-integracao-qa.test.ts': 13,
  'src/components/dados-da-confirmacao.test.ts': 37,
  'test/tokens-do-e2e.test.ts': 15,
  'test/playwright-config-qa.test.ts': 16,
  'test/estatico/docs-sem-token.test.ts': 6,
  'test/estatico/migration-0007.test.ts': 3,
  'scripts/seed-integracoes.test.ts': 48,
  'scripts/seed-integracoes-qa.test.ts': 55,
  // 0.3.1 (DEC-0019):
  'scripts/criar-token-0019.test.ts': 8,
  'src/db/transacao-prazo.test.ts': 26,
  'src/modules/agentes/executar-0019.test.ts': 53,
  'src/modules/agentes/revisao-0019.test.ts': 31,
  // 0.4.0 (DEC-0017), inclusive tela e seed com caso de sentinela, matriz ou valor fora do esquema:
  'src/db/imutabilidade.test.ts': 23,
  'src/app/(painel)/demandas/fila-andamento.test.ts': 40,
  'src/app/(painel)/demandas/fila-andamento-qa.test.ts': 51,
  'scripts/seed-andamento.test.ts': 41,
  'scripts/seed-andamento-qa.test.ts': 37,
  // Irmão de test/matriz-rotas.test.ts (401 e 403 em todo método e toda rota):
  'test/matriz-rotas-qa.test.ts': 22,
  // 06-T10-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; P1 da 06-T10-revisao, critério CV-20 do D-18, como o
  // seed-andamento da 0.4.0): o seed da vigência tem guardas de log (G3.13), de token, de pendentes do /construir e de
  // dado só fictício; contado ao fim da etapa.
  'scripts/seed-vigencia.test.ts': 46,
  'scripts/seed-vigencia-qa.test.ts': 62,
  // T12 do DEC-DEM-20261111-0018-v1 (SB-12; G9: vigenteDaDemanda só depois de autorizar e de achar o pacote; id só no
  // formato de DEC; avisos sem mudar botão): contado no fim da tarefa.
  'src/components/dados-da-decisao-vigencia.test.ts': 64,
  'src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts': 69,
  'test/estatico/vigencia-t11.test.ts': 25,
  // 06-T12-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-12 d, D-13, D-12 e oráculo da 4.2: nenhum aviso falso,
  // nenhum id fora do formato em texto ou link, corridas da releitura): contado no fim da etapa.
  'src/components/dados-da-decisao-vigencia-qa.test.ts': 51,
  'src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia-qa.test.ts': 31,
  // T13 do DEC-DEM-20261111-0018-v1 (G9: o DEC vigente na T05 só com o mais novo arquivado, depois de autorizar
  // ler_pacote_decisao e pelo id da vista; CV-09 com a regra 2 ampliada para vigenteDe(d)): contado no fim da tarefa.
  'src/app/(painel)/demandas/[id]/detalhe-vigente.test.ts': 24,
  'test/estatico/detalhe-dec.test.ts': 19,
  // 06-T13-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; CV-09 e G9 na T05: vigenteDe só a importada, d sem sombra,
  // id do DEC de const não reatribuída, leitura do vigente só no ramo do mais novo arquivado; pelo banco real, nenhum DEC
  // de outra demanda lido nem mostrado; decVigente incoerente lança): contado no fim da etapa.
  'test/estatico/detalhe-vigente-qa.test.ts': 28,
  'src/app/(painel)/demandas/[id]/detalhe-vigente-banco-qa.test.ts': 50,
  'src/components/dados-das-etapas-arquivamento-qa.test.ts': 15,
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
