// T36: rótulos de enumeração e de selo do painel (03, seções 2.2 e 2.6) e os textos do histórico (03, T05). Fonte única
// dos textos que as telas mostram para cada valor gravado (G3.11).
import { describe, expect, it } from 'vitest';
import type { EventoVisivel } from '../modules/historico/consultas';
import {
  COR_DECISAO,
  COR_NIVEL,
  COR_STATUS,
  formatarDinheiro,
  NOME_AGENTE,
  ROTULO_AGENTE,
  ROTULO_DECISAO,
  ROTULO_LINHA,
  ROTULO_NIVEL,
  ROTULO_NIVEL_APROVACAO,
  ROTULO_PAPEL,
  ROTULO_PAPEL_SOLICITANTE,
  ROTULO_STATUS,
  ROTULO_TIPO,
  ROTULO_URGENCIA,
  rotuloAtor,
  SELO_DESATUALIZADO,
  SELO_RASCUNHO,
  textoDoEvento,
} from './rotulos';

describe('rótulos de enumeração (03, 2.2 e 2.6)', () => {
  it('rótulos de status são os de 03, 2.2', () => {
    expect(ROTULO_STATUS).toEqual({
      nova: 'Nova',
      em_analise: 'Em análise',
      aguardando_informacao: 'Aguardando informação',
      pronta_para_decisao: 'Pronta para decisão',
      aprovada: 'Aprovada',
      em_construcao: 'Em construção',
      entregue: 'Entregue',
      devolvida: 'Devolvida pela construção',
      encerrada: 'Encerrada',
    });
  });

  it('cores dos selos de status, de decisão e de nível (03, 2.2)', () => {
    expect(COR_STATUS).toEqual({
      nova: 'slate',
      em_analise: 'blue',
      aguardando_informacao: 'amber',
      pronta_para_decisao: 'violet',
      aprovada: 'green',
      em_construcao: 'cyan',
      entregue: 'emerald',
      devolvida: 'orange',
      encerrada: 'gray',
    });
    expect(COR_DECISAO).toEqual({ pendente: 'amber', aprovada: 'green', devolvida: 'orange', arquivada: 'gray' });
    expect(COR_NIVEL).toEqual({ baixo: 'green', medio: 'amber', alto: 'red' });
  });

  it('decisão, nível e selos especiais (03, 2.2)', () => {
    expect(ROTULO_DECISAO).toEqual({
      pendente: 'Decisão pendente',
      aprovada: 'Aprovada',
      devolvida: 'Devolvida para nova análise',
      arquivada: 'Arquivada',
    });
    expect(ROTULO_NIVEL).toEqual({ baixo: 'Baixo', medio: 'Médio', alto: 'Alto' });
    expect(SELO_RASCUNHO).toEqual({ texto: 'Rascunho de agente', cor: 'violet', tracejado: true });
    expect(SELO_DESATUALIZADO).toEqual({ texto: 'Desatualizado', cor: 'red', tracejado: false });
  });

  it('tipo, papel do solicitante, linha de serviço, urgência e nível de aprovação (03, 2.6)', () => {
    expect(ROTULO_TIPO).toEqual({
      bug: 'Bug',
      melhoria: 'Melhoria',
      novo_projeto: 'Novo projeto',
      estudo: 'Estudo',
      produto_proprio: 'Produto próprio',
    });
    expect(ROTULO_PAPEL_SOLICITANTE).toEqual({ operacoes: 'Operações', financeiro: 'Financeiro', produto: 'Produto', outro: 'Outro' });
    expect(ROTULO_LINHA).toEqual({
      sob_medida: 'Sistema sob medida',
      automacao_integracao: 'Automação e integração',
      ia_controle_humano: 'IA com controle humano',
      diagnostico_sustentacao: 'Diagnóstico e sustentação',
      indefinida: 'Indefinida',
    });
    expect(ROTULO_URGENCIA).toEqual({ baixa: 'Baixa', media: 'Média', alta: 'Alta' });
    expect(ROTULO_NIVEL_APROVACAO).toEqual({ cto: 'Só o CTO', cto_e_administradora: 'CTO e administradora' });
  });

  it('agentes e papel da conta (03, 2.6)', () => {
    expect(ROTULO_AGENTE).toEqual({
      orquestrador: 'Agente orquestrador (entrada)',
      insumo_tecnico: 'Agente de insumo técnico (ESP)',
      risco: 'Agente de risco (RSK)',
      consolidacao: 'Agente de consolidação (DEC)',
    });
    expect(NOME_AGENTE).toEqual({
      orquestrador: 'Agente orquestrador',
      insumo_tecnico: 'Agente de insumo técnico',
      risco: 'Agente de risco',
      consolidacao: 'Agente de consolidação',
    });
    expect(ROTULO_PAPEL).toEqual({ cto: 'CTO', administradora: 'Administradora' });
  });
});

describe('formatarDinheiro (03, 2.6)', () => {
  it('dinheiro em US$ com vírgula', () => {
    expect(formatarDinheiro(3.2)).toBe('US$ 3,20');
  });
  it('milhar com ponto, zero e arredondamento em duas casas', () => {
    expect(formatarDinheiro(1234.5)).toBe('US$ 1.234,50');
    expect(formatarDinheiro(0)).toBe('US$ 0,00');
    expect(formatarDinheiro(10.005)).toMatch(/^US\$ 10,0[01]$/);
  });
});

describe('rotuloAtor (03, 2.6, "Ator no histórico")', () => {
  it('ator no histórico', () => {
    expect(rotuloAtor({ tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' })).toBe('Pessoa Ficticia (CTO)');
    expect(rotuloAtor({ tipo: 'agente', agente: 'insumo_tecnico' })).toBe('Agente de insumo técnico');
    expect(rotuloAtor({ tipo: 'sistema' })).toBe('Sistema');
  });
  it('administradora e os quatro agentes', () => {
    expect(rotuloAtor({ tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'administradora' })).toBe('Pessoa Ficticia (Administradora)');
    expect(rotuloAtor({ tipo: 'agente', agente: 'orquestrador' })).toBe('Agente orquestrador');
    expect(rotuloAtor({ tipo: 'agente', agente: 'risco' })).toBe('Agente de risco');
    expect(rotuloAtor({ tipo: 'agente', agente: 'consolidacao' })).toBe('Agente de consolidação');
  });
  it('conta sem nome ou sem papel (linha de conta que não existe mais) não quebra a tela', () => {
    expect(rotuloAtor({ tipo: 'pessoa', nome: null, papel: 'cto' })).toBe('CTO');
    expect(rotuloAtor({ tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: null })).toBe('Pessoa Ficticia');
    expect(rotuloAtor({ tipo: 'pessoa', nome: null, papel: null })).toBe('Não informado');
  });
});

describe('textoDoEvento (03, T05, tabela "Histórico")', () => {
  const pessoa = { tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
  const ev = (parcial: Partial<EventoVisivel> & Pick<EventoVisivel, 'acao'>): EventoVisivel => ({
    id: 1,
    ocorridoEm: new Date('2026-10-22T17:05:00Z'),
    ator: pessoa,
    entidade: 'demanda',
    entidadeId: 'DEM-20261022-0042',
    antes: null,
    depois: null,
    ...parcial,
  });

  it('criação, status e campo alterado', () => {
    expect(textoDoEvento(ev({ acao: 'demanda_criada', depois: { status: 'nova', tipo: 'bug' } }))).toBe('Criou a demanda');
    expect(textoDoEvento(ev({ acao: 'status_alterado', antes: { status: 'nova' }, depois: { status: 'em_analise' } }))).toBe('Mudou o status');
    expect(textoDoEvento(ev({ acao: 'campo_alterado', antes: { titulo: { alterado: true } }, depois: { titulo: { alterado: true } } }))).toBe(
      'Alterou "Título"',
    );
    expect(textoDoEvento(ev({ acao: 'campo_alterado', antes: { urgencia: 'baixa' }, depois: { urgencia: 'alta' } }))).toBe('Alterou "Urgência"');
    expect(textoDoEvento(ev({ acao: 'campo_alterado', antes: { linhaServicoProvavel: null }, depois: { linhaServicoProvavel: 'sob_medida' } }))).toBe(
      'Alterou "Linha de serviço provável"',
    );
  });

  it('nova ESP, RSK e DEC citam o id da versão', () => {
    expect(textoDoEvento(ev({ acao: 'especificacao_criada', entidade: 'especificacao_tecnica', entidadeId: 'ESP-DEM-20261022-0042-v2' }))).toBe(
      'Criou ESP-DEM-20261022-0042-v2',
    );
    expect(textoDoEvento(ev({ acao: 'parecer_risco_criado', entidade: 'parecer_risco', entidadeId: 'RSK-DEM-20261022-0042-v1' }))).toBe(
      'Criou RSK-DEM-20261022-0042-v1',
    );
    expect(textoDoEvento(ev({ acao: 'pacote_decisao_criado', entidade: 'pacote_decisao', entidadeId: 'DEC-DEM-20261022-0042-v1' }))).toBe(
      'Criou DEC-DEM-20261022-0042-v1',
    );
  });

  it('decisão: aprovada com opção, devolvida e arquivada', () => {
    const dec = { entidade: 'pacote_decisao', entidadeId: 'DEC-DEM-20261022-0042-v1' } as const;
    expect(textoDoEvento(ev({ ...dec, acao: 'decisao_registrada', depois: { statusDecisao: 'aprovada', opcaoEscolhida: 'A' } }))).toBe(
      'Registrou a decisão: Aprovada, opção A',
    );
    expect(textoDoEvento(ev({ ...dec, acao: 'decisao_registrada', depois: { statusDecisao: 'devolvida' } }))).toBe(
      'Registrou a decisão: Devolvida para nova análise',
    );
    expect(textoDoEvento(ev({ ...dec, acao: 'decisao_registrada', depois: { statusDecisao: 'arquivada' } }))).toBe('Registrou a decisão: Arquivada');
  });

  it('aprovação parcial do CTO e da administradora, com o documento', () => {
    const dec = { entidade: 'pacote_decisao', entidadeId: 'DEC-DEM-20261022-0042-v1' } as const;
    expect(textoDoEvento(ev({ ...dec, acao: 'aprovacao_registrada', depois: { papel: 'cto', opcao: 'A' } }))).toBe(
      'Registrou a aprovação como CTO (opção A)',
    );
    expect(
      textoDoEvento(
        ev({
          ...dec,
          acao: 'aprovacao_registrada',
          depois: { papel: 'administradora', opcao: 'B', referenciaDocumento: 'DOC-FICTICIO-7', dataDocumento: '2026-10-21' },
        }),
      ),
    ).toBe('Registrou a aprovação como administradora (opção B), documento DOC-FICTICIO-7 de 21/10/2026');
  });

  it('falha de agente, com o artefato de cada agente e a contagem de tentativas', () => {
    const falha = (agente: string, tentativas: number) =>
      textoDoEvento(ev({ acao: 'falha_agente', ator: { tipo: 'agente', agente: 'risco' }, entidade: 'execucao_agente', depois: { agente, tentativas, motivo: 'fora_do_schema' } }));
    expect(falha('risco', 3)).toBe('O agente de risco não conseguiu gerar o parecer depois de 3 tentativas');
    expect(falha('insumo_tecnico', 3)).toBe('O agente de insumo técnico não conseguiu gerar a especificação técnica depois de 3 tentativas');
    expect(falha('consolidacao', 1)).toBe('O agente de consolidação não conseguiu gerar o pacote de decisão depois de 1 tentativa');
    expect(falha('orquestrador', 3)).toBe('O agente orquestrador não conseguiu gerar os campos da demanda depois de 3 tentativas');
  });

  it('suspensão por teto e agente que não rodou', () => {
    const sistema = { tipo: 'sistema' } as const;
    expect(textoDoEvento(ev({ acao: 'suspensao_por_teto', ator: sistema, depois: { agente: 'risco', motivo: 'teto' } }))).toBe(
      'Agente de risco não rodou: agentes suspensos pelo teto de gasto',
    );
    expect(textoDoEvento(ev({ acao: 'agente_ignorado', ator: sistema, depois: { agente: 'consolidacao', motivo: 'desligado' } }))).toBe(
      'Agente de consolidação não rodou: agente desligado',
    );
  });

  // B-5 do 0006 (DEC-DEM-20261104-0010-v1): o motivo demanda_final (executar.ts) tem rótulo; os status finais são
  // entregue e encerrada. Motivo desconhecido continua só "não rodou".
  it('agente que não rodou porque a demanda já é final', () => {
    const sistema = { tipo: 'sistema' } as const;
    for (const agente of ['consolidacao', 'risco'] as const) {
      expect(textoDoEvento(ev({ acao: 'agente_ignorado', ator: sistema, depois: { agente, motivo: 'demanda_final' } }))).toBe(
        `${NOME_AGENTE[agente]} não rodou: demanda já entregue ou encerrada`,
      );
    }
    expect(textoDoEvento(ev({ acao: 'agente_ignorado', ator: sistema, depois: { agente: 'consolidacao', motivo: 'demanda_finalizada' } }))).toBe(
      `${NOME_AGENTE.consolidacao} não rodou`,
    );
  });

  it('pedido gerado e expurgo (retenção configurável, 90 por padrão)', () => {
    expect(textoDoEvento(ev({ acao: 'pedido_gerado', entidade: 'pacote_decisao', entidadeId: 'DEC-DEM-20261022-0042-v1' }))).toBe(
      'Gerou o Pedido de Construção de DEC-DEM-20261022-0042-v1',
    );
    // D3 do 0013: com a confirmação gravada no evento, o histórico diz que ela foi dada; evento antigo, sem `depois`, não.
    expect(
      textoDoEvento(ev({ acao: 'pedido_gerado', entidade: 'pacote_decisao', entidadeId: 'DEC-DEM-20261022-0042-v1', depois: { confirmaSemDadoPessoal: true } })),
    ).toBe('Gerou o Pedido de Construção de DEC-DEM-20261022-0042-v1, com a confirmação de que o texto não tem dado pessoal');
    expect(
      textoDoEvento(ev({ acao: 'pedido_gerado', entidade: 'pacote_decisao', entidadeId: 'DEC-DEM-20261022-0042-v1', depois: { confirmaSemDadoPessoal: 'true' } })),
    ).toBe('Gerou o Pedido de Construção de DEC-DEM-20261022-0042-v1');
    expect(textoDoEvento(ev({ acao: 'texto_expurgado', ator: { tipo: 'sistema' }, entidade: 'entrada_bruta' }))).toBe(
      'Apagou o texto recebido (retenção de 90 dias)',
    );
    expect(textoDoEvento(ev({ acao: 'texto_expurgado', ator: { tipo: 'sistema' }, entidade: 'entrada_bruta' }), { retencaoDias: 30 })).toBe(
      'Apagou o texto recebido (retenção de 30 dias)',
    );
  });

  it('nenhum texto de evento cita dado gravado fora dos ids e das enumerações', () => {
    const t = textoDoEvento(ev({ acao: 'campo_alterado', antes: { solicitanteNome: { alterado: true } }, depois: { solicitanteNome: { alterado: true } } }));
    expect(t).toBe('Alterou "Nome do solicitante"');
  });
});
