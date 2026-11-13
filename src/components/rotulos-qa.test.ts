// Escrito na 06-T36-testes (qa-automacao). O que os testes do engenheiro deixam aberto em rotulos.ts:
//   - os eventos de AcaoEvento (24 desde a 0.1.13), cada um com texto legível, com e sem `depois`, e com cada tipo de ator;
//   - nenhum texto de evento repete valor livre gravado em `antes` ou `depois` (C-30: o histórico não mostra dado de
//     terceiro), nem com valor fora da enumeração;
//   - os caminhos de reserva (campo sem rótulo, agente ausente, motivo desconhecido, documento sem data);
//   - todo campo da demanda que o histórico registra (CAMPOS_TEXTO_LIVRE, da T21) tem rótulo, para nunca cair em
//     "Alterou um campo".
import { describe, expect, it } from 'vitest';
import type { EventoVisivel } from '../modules/historico/consultas';
import { CAMPOS_TEXTO_LIVRE, type AcaoEvento } from '../modules/historico/registrar';
import { formatarDinheiro, ROTULO_CAMPO_DEMANDA, textoDoEvento } from './rotulos';

// `satisfies` obriga a lista a ter todas as ações do tipo, e só elas: evento novo sem texto quebra o typecheck aqui.
const ACOES = {
  demanda_criada: true,
  status_alterado: true,
  campo_alterado: true,
  especificacao_criada: true,
  parecer_risco_criado: true,
  pacote_decisao_criado: true,
  aprovacao_registrada: true,
  decisao_registrada: true,
  // 0.1.13 (DEC-DEM-20261104-0014-v1): a substituição do DEC aprovado anterior.
  pacote_decisao_substituido: true,
  agente_ligado: true,
  agente_desligado: true,
  teto_alterado: true,
  suspensao_por_teto: true,
  agente_ignorado: true,
  falha_agente: true,
  pedido_gerado: true,
  texto_expurgado: true,
  entrada_pendente_expurgada: true,
  '2fa_ativado': true,
  '2fa_desativado': true,
  conta_criada: true,
  conta_desativada: true,
  token_criado: true,
  token_revogado: true,
  // 0.3.0 (DEC-DEM-20261111-0016-v1, T02): a confirmação da demanda do Awave e a entrega e o recebimento do pedido.
  demanda_confirmada: true,
  pedido_entregue: true,
  pedido_recebido: true,
  // 0.4.0 (DEC-DEM-20261111-0017-v1, T05): o andamento informado pelo /construir.
  andamento_registrado: true,
} as const satisfies Record<AcaoEvento, true>;
const TODAS = Object.keys(ACOES) as AcaoEvento[];

const ATORES: EventoVisivel['ator'][] = [
  { tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' },
  { tipo: 'pessoa', nome: null, papel: null },
  { tipo: 'agente', agente: 'risco' },
  { tipo: 'sistema' },
  // 0.3.0 (06-T02-testes, Minor 1 da revisão): o ator de integração, da lista e fora dela.
  { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' },
  { tipo: 'integracao', integracao: null, prefixo: null },
];

const ev = (acao: AcaoEvento, parcial: Partial<EventoVisivel> = {}): EventoVisivel => ({
  id: 1,
  ocorridoEm: new Date('2026-10-22T17:05:00Z'),
  ator: { tipo: 'sistema' },
  entidade: 'demanda',
  entidadeId: 'DEM-20261022-0042',
  acao,
  antes: null,
  depois: null,
  ...parcial,
});

const LIXO = /undefined|null|NaN|\[object|function/;

describe('textoDoEvento: os 28 eventos (03, T05 "Histórico"; 0.3.0, 03, 5.6; 0.4.0, 03, 5.7)', () => {
  it('a lista de ações tem 28 itens', () => {
    expect(TODAS).toHaveLength(28);
  });

  it.each(TODAS)('%s: texto não vazio e legível, com qualquer ator e sem antes nem depois', (acao) => {
    for (const ator of ATORES) {
      const t = textoDoEvento(ev(acao, { ator }));
      expect(typeof t).toBe('string');
      expect(t.trim().length).toBeGreaterThan(0);
      expect(t).not.toMatch(LIXO);
    }
  });

  it.each(TODAS)('%s: valor livre em antes e depois nunca aparece no texto (C-30)', (acao) => {
    const livre = {
      titulo: 'SENTINELA-titulo',
      solicitanteNome: 'SENTINELA-nome',
      contexto: 'SENTINELA-contexto',
      texto: 'SENTINELA-texto-bruto',
      mensagem: 'SENTINELA-mensagem',
      erro: 'SENTINELA-erro',
      motivo: 'SENTINELA-motivo',
      agente: 'SENTINELA-agente',
      statusDecisao: 'SENTINELA-status',
      papel: 'SENTINELA-papel',
      status: 'SENTINELA-status-demanda',
      tentativas: 'SENTINELA-tentativas',
      // 0.3.0 (06-T02-testes, Minor 2 da revisão): as chaves que os textos de token leem, e o hash e o sha256.
      integracao: 'SENTINELA-integracao',
      prefixo: 'SENTINELA-prefixo',
      hash: 'SENTINELA-hash',
      sha256: 'SENTINELA-sha256',
    };
    const t = textoDoEvento(ev(acao, { antes: livre, depois: livre }));
    expect(t).not.toContain('SENTINELA');
    expect(t).not.toMatch(LIXO);
  });
});

describe('textoDoEvento: caminhos de reserva', () => {
  it('campo alterado sem rótulo conhecido, ou sem campo: "Alterou um campo"; sem depois, usa o antes', () => {
    expect(textoDoEvento(ev('campo_alterado', { depois: { campoQueNaoExiste: { alterado: true } } }))).toBe('Alterou um campo');
    expect(textoDoEvento(ev('campo_alterado', { depois: {} }))).toBe('Alterou um campo');
    expect(textoDoEvento(ev('campo_alterado'))).toBe('Alterou um campo');
    expect(textoDoEvento(ev('campo_alterado', { antes: { contexto: { alterado: true } } }))).toBe('Alterou "Contexto"');
  });

  it('todo campo de texto livre que o histórico registra tem rótulo (T21, C-30)', () => {
    for (const campo of CAMPOS_TEXTO_LIVRE) {
      expect(ROTULO_CAMPO_DEMANDA[campo], campo).toBeTruthy();
      expect(textoDoEvento(ev('campo_alterado', { depois: { [campo]: { alterado: true } } }))).toBe(`Alterou "${ROTULO_CAMPO_DEMANDA[campo]}"`);
    }
    // Os de enumeração, que guardam o valor (CA-06.4).
    for (const campo of ['tipo', 'solicitantePapel', 'linhaServicoProvavel', 'urgencia']) expect(ROTULO_CAMPO_DEMANDA[campo], campo).toBeTruthy();
  });

  it('falha de agente sem agente, e sem a contagem (vale o padrão de 3, P1-e)', () => {
    expect(textoDoEvento(ev('falha_agente', { depois: { motivo: 'fora_do_schema' } }))).toBe('Um agente não conseguiu gerar o rascunho');
    expect(textoDoEvento(ev('falha_agente', { depois: { agente: 'risco' } }))).toBe(
      'O agente de risco não conseguiu gerar o parecer depois de 3 tentativas',
    );
    expect(textoDoEvento(ev('falha_agente', { depois: { agente: 'risco', tentativas: 2 } }))).toBe(
      'O agente de risco não conseguiu gerar o parecer depois de 2 tentativas',
    );
  });

  it('agente que não rodou: os três motivos da T27 e um motivo desconhecido', () => {
    const ignorado = (motivo: string) => textoDoEvento(ev('agente_ignorado', { depois: { agente: 'orquestrador', motivo } }));
    expect(ignorado('sem_preco')).toBe('Agente orquestrador não rodou: modelo sem preço vigente');
    expect(ignorado('sem_provedor')).toBe('Agente orquestrador não rodou: provedor de IA não configurado');
    expect(ignorado('desligado')).toBe('Agente orquestrador não rodou: agente desligado');
    expect(ignorado('outro_motivo')).toBe('Agente orquestrador não rodou');
    expect(textoDoEvento(ev('agente_ignorado'))).toBe('Agente não rodou');
    expect(textoDoEvento(ev('suspensao_por_teto'))).toBe('Agente não rodou: agentes suspensos pelo teto de gasto');
  });

  it('ligar e desligar agente, com e sem o agente', () => {
    expect(textoDoEvento(ev('agente_ligado', { depois: { agente: 'insumo_tecnico' } }))).toBe('Ligou o agente de insumo técnico');
    expect(textoDoEvento(ev('agente_desligado', { depois: { agente: 'consolidacao' } }))).toBe('Desligou o agente de consolidação');
    expect(textoDoEvento(ev('agente_ligado'))).toBe('Ligou um agente');
    expect(textoDoEvento(ev('agente_desligado'))).toBe('Desligou um agente');
  });

  it('decisão com status fora da enumeração e opção vazia', () => {
    expect(textoDoEvento(ev('decisao_registrada', { depois: { statusDecisao: 'pendente' } }))).toBe('Registrou a decisão: Não informado');
    expect(textoDoEvento(ev('decisao_registrada', { depois: { statusDecisao: 'aprovada', opcaoEscolhida: '' } }))).toBe(
      'Registrou a decisão: Aprovada',
    );
  });

  it('aprovação da administradora sem documento, e com data em outro formato', () => {
    expect(textoDoEvento(ev('aprovacao_registrada', { depois: { papel: 'administradora', opcao: 'A' } }))).toBe(
      'Registrou a aprovação como administradora (opção A)',
    );
    expect(
      textoDoEvento(ev('aprovacao_registrada', { depois: { papel: 'administradora', opcao: 'A', referenciaDocumento: 'DOC-FICTICIO-1', dataDocumento: '21/10/2026' } })),
    ).toBe('Registrou a aprovação como administradora (opção A), documento DOC-FICTICIO-1 de 21/10/2026');
  });

  it('entrada pendente expurgada respeita a retenção configurada', () => {
    expect(textoDoEvento(ev('entrada_pendente_expurgada'), { retencaoDias: 30 })).toBe(
      'Apagou uma entrada aguardando o agente orquestrador (retenção de 30 dias)',
    );
    expect(textoDoEvento(ev('entrada_pendente_expurgada'))).toBe('Apagou uma entrada aguardando o agente orquestrador (retenção de 90 dias)');
  });
});

describe('formatarDinheiro: valores grandes e frações', () => {
  it('milhão com pontos e arredondamento em centavos', () => {
    expect(formatarDinheiro(1_234_567.891)).toBe('US$ 1.234.567,89');
    expect(formatarDinheiro(0.1 + 0.2)).toBe('US$ 0,30');
    expect(formatarDinheiro(12)).toBe('US$ 12,00');
  });
});
