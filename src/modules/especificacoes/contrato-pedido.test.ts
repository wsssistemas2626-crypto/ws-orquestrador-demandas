// Teste de contrato entre a ESP (RF-08) e o validarPedido do /construir (ADR-05): para os quatro campos de construção,
// a ESP aceita exatamente o que o validarPedido aceita. Se a ESP aceitasse algo que o /construir recusa, o DEC aprovado
// geraria um Pedido de Construção inválido (RF-22); se recusasse algo que ele aceita, travaria uma demanda válida.
// Sem banco; só dado fictício.
import { describe, expect, it } from 'vitest';
import { DONOS_REPOSITORIO, TIPOS_CONSTRUIDOS, validarPedido } from '../../vendor/construir/pedido.mjs';
import type { Tipo } from '../demandas/schemas';
import { criarEspecificacaoSchema, validarCamposDeConstrucao, type CriarEspecificacao } from './schemas';

const DEMANDA = 'DEM-20261022-0001';

// Pedido fictício completo; só os quatro campos de construção variam entre os casos.
function pedidoCom(tipo: string, e: CriarEspecificacao): Record<string, unknown> {
  return {
    pedido: `DEC-${DEMANDA}-v1`,
    demanda: { id: DEMANDA, tipo, titulo: 'Demanda fictícia', descricao: 'Descrição fictícia' },
    especificacao: { id: `ESP-${DEMANDA}-v1`, conteudo: 'Conteúdo fictício' },
    risco: { id: `RSK-${DEMANDA}-v1`, nivel: 'medio', conteudo: 'Risco fictício' },
    decisao: { id: `DEC-${DEMANDA}-v1`, opcaoEscolhida: 'A', aprovadoPor: 'Pessoa Ficticia', aprovadoEm: '2026-10-22' },
    sistema_alvo: e.sistemaAlvo,
    repositorio_destino: e.repositorioDestino,
    criterios_aceite_preliminares: e.criteriosAceitePreliminares,
    definicao_de_pronto: e.definicaoDePronto,
  };
}

const CAMPOS_DO_PEDIDO = ['sistema_alvo', 'repositorio_destino', 'criterios_aceite_preliminares', 'definicao_de_pronto'];
const errosDeConstrucao = (tipo: string, e: CriarEspecificacao): string[] =>
  validarPedido(pedidoCom(tipo, e)).erros.filter((m) => CAMPOS_DO_PEDIDO.some((c) => m.startsWith(c)));

type Caso = { nome: string; campos: Record<string, unknown> };
const BASE = { sistemaAlvo: 'meu-sistema', criteriosAceitePreliminares: ['Critério fictício'], definicaoDePronto: ['pnpm test verde'] };

const CASOS: Caso[] = [
  ...DONOS_REPOSITORIO.map((dono) => ({ nome: `dono ${dono}`, campos: { ...BASE, repositorioDestino: `${dono}/meu-sistema` } })),
  { nome: 'espaços em volta, que o schema apara', campos: { ...BASE, sistemaAlvo: '  meu-sistema  ', repositorioDestino: ' fabianojp06/meu-sistema ' } },
  { nome: 'sistema com número e hífen', campos: { ...BASE, sistemaAlvo: '0-sistema-2', repositorioDestino: 'wsssistemas2626-crypto/0-sistema-2' } },
  { nome: 'outra conta', campos: { ...BASE, repositorioDestino: 'outra-conta/meu-sistema' } },
  { nome: 'dono com maiúscula', campos: { ...BASE, repositorioDestino: 'Fabianojp06/meu-sistema' } },
  { nome: 'outro sistema', campos: { ...BASE, repositorioDestino: 'wsssistemas2626-crypto/outro-sistema' } },
  { nome: 'segmento a mais', campos: { ...BASE, repositorioDestino: 'wsssistemas2626-crypto/meu-sistema/extra' } },
  { nome: 'barra no fim', campos: { ...BASE, repositorioDestino: 'wsssistemas2626-crypto/meu-sistema/' } },
  { nome: 'sem dono', campos: { ...BASE, repositorioDestino: 'meu-sistema' } },
  { nome: 'dono sem sistema', campos: { ...BASE, repositorioDestino: 'wsssistemas2626-crypto/' } },
  { nome: 'espaço dentro do repositório', campos: { ...BASE, repositorioDestino: 'wsssistemas2626-crypto /meu-sistema' } },
  { nome: 'repositório ausente', campos: { ...BASE } },
  { nome: 'repositório só com espaços', campos: { ...BASE, repositorioDestino: '   ' } },
  { nome: 'sistema ausente', campos: { ...BASE, sistemaAlvo: undefined, repositorioDestino: 'wsssistemas2626-crypto/meu-sistema' } },
  { nome: 'critérios vazios', campos: { ...BASE, criteriosAceitePreliminares: [], repositorioDestino: 'fabianojp06/meu-sistema' } },
  { nome: 'critérios ausentes', campos: { ...BASE, criteriosAceitePreliminares: undefined, repositorioDestino: 'fabianojp06/meu-sistema' } },
  { nome: 'definição vazia', campos: { ...BASE, definicaoDePronto: [], repositorioDestino: 'fabianojp06/meu-sistema' } },
  { nome: 'definição ausente', campos: { ...BASE, definicaoDePronto: undefined, repositorioDestino: 'fabianojp06/meu-sistema' } },
  { nome: 'nenhum dos quatro', campos: { sistemaAlvo: undefined, criteriosAceitePreliminares: undefined, definicaoDePronto: undefined } },
];

const comoEsp = (campos: Record<string, unknown>): CriarEspecificacao =>
  criarEspecificacaoSchema.parse({ descricaoObjetiva: 'Descrição fictícia', escopoInclui: ['Item fictício'], ...campos });

describe('contrato ESP × validarPedido (quatro campos de construção)', () => {
  it('o pedido fictício de base passa inteiro no validarPedido (a filtragem não esconde erro)', () => {
    expect(validarPedido(pedidoCom('bug', comoEsp({ ...BASE, repositorioDestino: 'fabianojp06/meu-sistema' })))).toEqual({ ok: true, erros: [] });
  });

  it('os casos cobrem aceite e recusa nos dois lados', () => {
    const aceitos = CASOS.filter((c) => errosDeConstrucao('bug', comoEsp(c.campos)).length === 0).length;
    expect(aceitos).toBeGreaterThanOrEqual(3);
    expect(CASOS.length - aceitos).toBeGreaterThanOrEqual(10);
  });

  for (const tipo of TIPOS_CONSTRUIDOS as readonly Tipo[]) {
    it.each(CASOS)(`${tipo}: $nome → a ESP aceita se e só se o validarPedido aceita`, ({ campos }) => {
      const e = comoEsp(campos);
      const daEsp = validarCamposDeConstrucao(tipo, e);
      const doPedido = errosDeConstrucao(tipo, e);
      expect(daEsp.length === 0, `ESP: ${JSON.stringify(daEsp)} | pedido: ${JSON.stringify(doPedido)}`).toBe(doPedido.length === 0);
    });
  }

  it('o valor que a ESP aceita é o que vai ao pedido: aparado, sem espaço em volta', () => {
    const e = comoEsp({ ...BASE, sistemaAlvo: '  meu-sistema  ', repositorioDestino: ' fabianojp06/meu-sistema ' });
    expect([e.sistemaAlvo, e.repositorioDestino]).toEqual(['meu-sistema', 'fabianojp06/meu-sistema']);
  });

  it('o schema recusa item em branco nas listas, que o validarPedido também recusaria', () => {
    for (const campo of ['criteriosAceitePreliminares', 'definicaoDePronto']) {
      expect(criarEspecificacaoSchema.safeParse({ descricaoObjetiva: 'x', escopoInclui: ['a'], [campo]: ['ok', '   '] }).success, campo).toBe(false);
    }
  });
});
