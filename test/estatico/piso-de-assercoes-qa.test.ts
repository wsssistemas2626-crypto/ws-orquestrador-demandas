// test/estatico/piso-de-assercoes-qa.test.ts — CV-20 (04), complemento do qa-automacao na 06-T01-testes. O CV-20 conta
// "os testes de src/modules/" e todo "test/estatico/*" por arquivo; o piso-de-assercoes.test.ts cobre os estáticos de
// 198e97d, os dois e2e de segurança e o proxy. Aqui ficam:
//   - os 68 testes de src/modules/ de 198e97d (src/modules/ não muda neste pedido, só ganha arquivo novo: G4, CA-15.2);
//   - os três estáticos criados na T01, que as tarefas seguintes também não podem enfraquecer.
// Piso = linhas com "expect(", contadas como no git grep -c, em 10/11/2026 (src/modules/ sem diff desde 198e97d). Só sobe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const linhasComExpect = (fonte: string): number => fonte.split('\n').filter((l) => l.includes('expect(')).length;

const PISO_MODULOS: Readonly<Record<string, number>> = {
  'src/modules/acesso/ator-pessoa.test.ts': 4,
  'src/modules/acesso/auth-comportamento.test.ts': 38,
  'src/modules/acesso/auth.test.ts': 51,
  'src/modules/acesso/bloqueio-verificacao.test.ts': 34,
  'src/modules/acesso/cookies-seguros.test.ts': 7,
  'src/modules/acesso/destino-seguro-qa.test.ts': 8,
  'src/modules/acesso/destino-seguro.test.ts': 6,
  'src/modules/acesso/exigir-pessoa-qa.test.ts': 15,
  'src/modules/acesso/exigir-pessoa.test.ts': 40,
  'src/modules/acesso/matriz-qa.test.ts': 37,
  'src/modules/acesso/matriz.test.ts': 44,
  'src/modules/acesso/resolver-ator-qa.test.ts': 17,
  'src/modules/acesso/resolver-ator.test.ts': 20,
  'src/modules/acesso/sonda-mutacao-qa.test.ts': 8,
  'src/modules/acesso/tokens-servico-qa.test.ts': 26,
  'src/modules/acesso/tokens-servico.test.ts': 34,
  'src/modules/acesso/two-factor-colunas.test.ts': 22,
  'src/modules/acesso/verificacao-qa.test.ts': 41,
  'src/modules/acesso/verificacao.test.ts': 76,
  'src/modules/agentes/configuracao-bordas.test.ts': 20,
  'src/modules/agentes/configuracao.test.ts': 40,
  'src/modules/agentes/entrada-agente.test.ts': 94,
  'src/modules/agentes/espera.test.ts': 5,
  'src/modules/agentes/executar.bordas.test.ts': 84,
  'src/modules/agentes/executar.test.ts': 175,
  'src/modules/agentes/gatilhos.bordas.test.ts': 53,
  'src/modules/agentes/gatilhos.test.ts': 43,
  'src/modules/agentes/nivel-aprovacao.test.ts': 12,
  'src/modules/agentes/preco.test.ts': 19,
  'src/modules/agentes/provedor.test.ts': 80,
  'src/modules/agentes/saida-orquestrador.test.ts': 86,
  'src/modules/agentes/teto-bordas.test.ts': 23,
  'src/modules/agentes/teto.test.ts': 34,
  'src/modules/avisos/aviso-dec.test.ts': 131,
  'src/modules/avisos/enviador.test.ts': 37,
  'src/modules/dados-pessoais/detectores.test.ts': 93,
  'src/modules/dados-pessoais/minimizar.test.ts': 106,
  'src/modules/demandas/consultas.test.ts': 28,
  'src/modules/demandas/entrada-qa.test.ts': 51,
  'src/modules/demandas/entrada.test.ts': 89,
  'src/modules/demandas/gerar-id.test.ts': 38,
  'src/modules/demandas/schemas.bordas.test.ts': 29,
  'src/modules/demandas/schemas.test.ts': 53,
  'src/modules/demandas/servico.bordas.test.ts': 46,
  'src/modules/demandas/servico.test.ts': 77,
  'src/modules/demandas/transicoes.test.ts': 28,
  'src/modules/especificacoes/contrato-pedido.test.ts': 6,
  'src/modules/especificacoes/schemas.test.ts': 21,
  'src/modules/especificacoes/servico.test.ts': 72,
  'src/modules/historico/consultas-qa.test.ts': 7,
  'src/modules/historico/consultas.test.ts': 19,
  'src/modules/historico/registrar-qa.test.ts': 4,
  'src/modules/historico/registrar.test.ts': 12,
  'src/modules/limites.test.ts': 21,
  'src/modules/pacotes-decisao/concorrencia.test.ts': 17,
  'src/modules/pacotes-decisao/consultas.test.ts': 59,
  'src/modules/pacotes-decisao/criar.test.ts': 91,
  'src/modules/pacotes-decisao/decidir-bordas.test.ts': 45,
  'src/modules/pacotes-decisao/decidir-versoes.test.ts': 25,
  'src/modules/pacotes-decisao/decidir.test.ts': 117,
  'src/modules/pacotes-decisao/substituicao.test.ts': 113,
  'src/modules/pareceres-risco/schemas.test.ts': 23,
  'src/modules/pareceres-risco/servico.test.ts': 11,
  'src/modules/pedido-construcao/gerar-bordas.test.ts': 34,
  'src/modules/pedido-construcao/gerar-substituido.test.ts': 28,
  'src/modules/pedido-construcao/gerar.test.ts': 139,
  'src/modules/retencao/expurgar.test.ts': 58,
  'src/modules/versoes.test.ts': 43,
};

const PISO_DA_T01: Readonly<Record<string, number>> = {
  'test/estatico/piso-de-assercoes.test.ts': 5,
  'test/estatico/sem-recurso-externo.test.ts': 15,
  'test/estatico/vigia.test.ts': 11,
};

describe('CV-20: piso de asserções dos testes de src/modules/ e dos estáticos da T01', () => {
  it('a lista de src/modules/ tem os 68 testes de 198e97d', () => {
    expect(Object.keys(PISO_MODULOS)).toHaveLength(68);
  });

  it.each(Object.entries(PISO_MODULOS))('%s tem ao menos %i linhas com expect(', (arquivo, piso) => {
    expect(linhasComExpect(readFileSync(`${raiz}${arquivo}`, 'utf8'))).toBeGreaterThanOrEqual(piso);
  });

  it.each(Object.entries(PISO_DA_T01))('%s tem ao menos %i linhas com expect(', (arquivo, piso) => {
    expect(linhasComExpect(readFileSync(`${raiz}${arquivo}`, 'utf8'))).toBeGreaterThanOrEqual(piso);
  });
});
