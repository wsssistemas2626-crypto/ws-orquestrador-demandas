// T43: regra da tela de decisão do pacote (03, T11; 04, C-14; P1-a, P1-b, P1-d), sem tela: textos da 03, quem vê o
// formulário, as opções dos grupos, a validação no envio, a entrada que vai à Server Action (que passa no schema da API),
// os erros da API campo a campo, o diálogo, os alertas de topo, a revisão visível de C-14, as aprovações e a chegada
// depois de decidir. Tudo a partir da vista do servidor; nada da URL vira texto.
import { describe, expect, it } from 'vitest';
import type { AtorPessoa } from '../modules/acesso/ator';
import { MENSAGENS_DECISAO } from '../modules/pacotes-decisao/decidir';
import type { PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { LIMITE_REFERENCIA_DOCUMENTO, registrarDecisaoSchema } from '../modules/pacotes-decisao/schemas';
import {
  ACOES_DA_DECISAO,
  alertaDeDesatualizado,
  alertaDeSubstituido,
  AVISO_DECISAO,
  chegadaNaDecisao,
  decisaoSuja,
  entradaDaDecisao,
  envioDaDecisao,
  errosDaApiDecisao,
  formularioDaConta,
  itensDaRevisao,
  linhasDeAprovacao,
  LIMITE_REFERENCIA,
  opcoesDaDecisao,
  opcoesDaEscolha,
  rascunhosEmTexto,
  rotuloDoPrincipal,
  secoesDasOpcoes,
  textoDaDecisaoRegistrada,
  textoDoDialogo,
  TEXTOS_DECISAO,
  validarDecisao,
  valoresDaDecisao,
  type ContextoDoFormulario,
  type ValoresDaDecisao,
} from './dados-da-decisao';
import { LIMITE_CAMPO_DEC } from './dados-do-pacote';
import { idDoCampo } from './formulario';

const ID = 'DEM-20261022-0042';
const DEC = `DEC-${ID}-v1`;
const ESP = `ESP-${ID}-v2`;
const RSK = `RSK-${ID}-v1`;
const CRIADO = new Date('2026-10-22T17:05:00Z');
const APROVADO = new Date('2026-10-22T18:00:00Z');

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm', nome: 'Pessoa Ficticia Administradora', papel: 'administradora' };

function pacote(extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  return {
    id: DEC,
    demandaId: ID,
    versao: 1,
    especificacaoId: ESP,
    parecerRiscoId: RSK,
    demandaTipo: 'melhoria',
    demandaTitulo: 'Pedidos duplicados (fictício)',
    demandaDescricao: 'Problema: fictício',
    resumoExecutivo: 'Resumo fictício.',
    opcaoA: { descricao: 'Construir tudo numa entrega só (fictício)', vantagens: 'Resolve a causa (fictício)' },
    opcaoB: { descricao: 'B'.repeat(100) },
    recomendacao: null,
    nivelAprovacaoRequerido: 'cto',
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' },
    rascunhoAgente: false,
    criadaEm: CRIADO,
    statusDecisao: 'pendente',
    aprovadores: [],
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    decisao: null,
    rascunhosCitados: [],
    especificacaoCitada: {
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Critério A (fictício)', 'Critério B (fictício)'],
      definicaoDePronto: ['Testes verdes (fictício)'],
    },
    niveisRisco: { tecnico: 'alto', operacional: 'medio', juridico: 'baixo' },
    ...extra,
  };
}

const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
const aprovacaoAdm = {
  papel: 'administradora' as const,
  nome: 'Pessoa Ficticia Administradora',
  opcao: 'A' as const,
  registradaEm: new Date('2026-10-23T12:30:00Z'),
  referenciaDocumento: 'DOC-FICTICIO-1',
  dataDocumento: '2026-10-23',
};

const ctx = (extra: Partial<ContextoDoFormulario> = {}): ContextoDoFormulario => ({
  opcaoFixada: null,
  pedeDocumento: false,
  exigeRevisao: false,
  aprovarIndisponivel: false,
  ...extra,
});

const valores = (extra: Partial<ValoresDaDecisao> = {}): ValoresDaDecisao => ({ ...valoresDaDecisao(), ...extra });

type Falha = Parameters<typeof errosDaApiDecisao>[0];

describe('textos da 03, T11, iguais aos do servidor onde o servidor também fala', () => {
  it('mensagens de erro e prefixo de 409', () => {
    expect(TEXTOS_DECISAO.erros.revisar).toBe(MENSAGENS_DECISAO.revisarRascunhos);
    expect(TEXTOS_DECISAO.erros.referencia).toBe(MENSAGENS_DECISAO.semReferencia);
    expect(TEXTOS_DECISAO.erros.data).toBe(MENSAGENS_DECISAO.semDataDocumento);
    expect(TEXTOS_DECISAO.erros.decisao).toBe('Escolha a decisão.');
    expect(TEXTOS_DECISAO.erros.opcao).toBe('Escolha a opção A ou a opção B.');
    expect(LIMITE_REFERENCIA).toBe(LIMITE_REFERENCIA_DOCUMENTO);
  });

  it('formulário, diálogo, lembrete e sucessos', () => {
    const t = TEXTOS_DECISAO;
    expect(t.titulo('Pedidos (fictício)')).toBe('Decisão: Pedidos (fictício)');
    expect([t.legendaDecisao, t.aprovar, t.devolver, t.arquivar]).toEqual(['Decisão (obrigatório)', 'Aprovar', 'Devolver para nova análise', 'Arquivar']);
    expect([t.dicaAprovarIndisponivel, t.dicaDevolver, t.dicaArquivar]).toEqual([
      'Indisponível: pacote desatualizado.',
      'Devolver: a demanda volta para Em análise.',
      'Arquivar: a demanda vai para Encerrada.',
    ]);
    // 0.2.0 (03, seção 9): os três botões e o grupo deles.
    expect([t.aprovarOpcao('A'), t.aprovarOpcao('B'), t.devolverCurto, t.grupoAcoes]).toEqual(['Aprovar a opção A', 'Aprovar a opção B', 'Devolver', 'Ações da decisão']);
    expect(t.legendaOpcao).toBe('Opção escolhida (obrigatório)');
    expect([t.referencia, t.dicaReferencia, t.dataAssinatura, t.comentarios, t.revisei, t.registrar, t.registrando]).toEqual([
      'Identificador do documento assinado (obrigatório para aprovar)',
      'Exemplo: número do documento no sistema de assinatura.',
      'Data da assinatura (obrigatório para aprovar)',
      'Comentários (opcional)',
      'Revisei os rascunhos de agente citados neste pacote (obrigatório)',
      'Registrar decisão',
      'Registrando…',
    ]);
    expect([t.dialogoTitulo, t.dialogoConfirmar, t.dialogoVoltar]).toEqual(['Confirmar a decisão?', 'Confirmar e registrar', 'Voltar']);
    expect(t.soCto).toBe('Este pacote exige só a aprovação do CTO.');
    expect(t.ctoRegistrada).toBe(
      'Sua aprovação está registrada. Falta a aprovação da administradora, com a referência ao documento assinado. O pacote só vale depois dela.',
    );
    expect(t.lembrete).toBe('A demanda continua em Pronta para decisão até alguém mudar o status para Aprovada no detalhe da demanda.');
    expect(t.irParaDemanda).toBe('Ir para a demanda');
    expect(t.notaAprovacoes).toBe('O sistema guarda a referência ao documento assinado; ela não substitui a assinatura.');
    expect(t.sucesso.aprovada('A')).toBe('Decisão registrada: Aprovada, opção A.');
    expect(t.sucesso.parcial.cto).toBe('Aprovação do CTO registrada. Falta a aprovação da administradora.');
    expect(t.sucesso.completa.administradora).toBe('Aprovação da administradora registrada. O pacote está aprovado.');
    expect(t.sucesso.devolvida).toBe('Pacote devolvido para nova análise. A demanda voltou para Em análise.');
    expect(t.sucesso.arquivada).toBe('Pacote arquivado. A demanda foi para Encerrada.');
  });
});

describe('quem vê o formulário (03, T11; P1-a, P1-b)', () => {
  it('nível cto: a conta cto vê o formulário sem documento; a administradora vê só o aviso (P1-b)', () => {
    expect(formularioDaConta(pacote(), CTO)).toEqual({ tipo: 'formulario', opcaoFixada: null, pedeDocumento: false });
    expect(formularioDaConta(pacote(), ADM)).toEqual({ tipo: 'sem_formulario', texto: 'Este pacote exige só a aprovação do CTO.' });
  });

  it('nível cto_e_administradora sem aprovação: as duas veem; só a administradora informa o documento (P1-a)', () => {
    const p = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' });
    expect(formularioDaConta(p, CTO)).toEqual({ tipo: 'formulario', opcaoFixada: null, pedeDocumento: false });
    expect(formularioDaConta(p, ADM)).toEqual({ tipo: 'formulario', opcaoFixada: null, pedeDocumento: true });
  });

  it('segunda aprovação: a opção fica fixada na de quem aprovou primeiro; quem já aprovou vê só o aviso', () => {
    const depoisDoCto = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto] });
    expect(formularioDaConta(depoisDoCto, ADM)).toEqual({ tipo: 'formulario', opcaoFixada: { papel: 'cto', opcao: 'A' }, pedeDocumento: true });
    expect(formularioDaConta(depoisDoCto, CTO)).toEqual({ tipo: 'sem_formulario', texto: TEXTOS_DECISAO.ctoRegistrada });
    const depoisDaAdm = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [{ ...aprovacaoAdm, opcao: 'B' }] });
    expect(formularioDaConta(depoisDaAdm, CTO)).toEqual({ tipo: 'formulario', opcaoFixada: { papel: 'administradora', opcao: 'B' }, pedeDocumento: false });
    expect(formularioDaConta(depoisDaAdm, ADM)).toEqual({ tipo: 'sem_formulario', texto: TEXTOS_DECISAO.admRegistrada });
  });

  it('já decidido: nenhuma conta vê formulário', () => {
    const p = pacote({ statusDecisao: 'devolvida', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO } });
    expect(formularioDaConta(p, CTO)).toEqual({ tipo: 'decidido' });
    expect(formularioDaConta(p, ADM)).toEqual({ tipo: 'decidido' });
  });

  it('"Decisão registrada: Aprovada, opção A, por <nome> em <data>." e as variações', () => {
    const decisao = { opcaoEscolhida: 'A' as const, comentarios: 'Comentário (fictício)', decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO };
    expect(textoDaDecisaoRegistrada(pacote({ statusDecisao: 'aprovada', decisao }))).toBe('Decisão registrada: Aprovada, opção A, por Pessoa Ficticia CTO em 22/10/2026 às 15:00.');
    expect(textoDaDecisaoRegistrada(pacote({ statusDecisao: 'devolvida', decisao: { ...decisao, opcaoEscolhida: null } }))).toBe(
      'Decisão registrada: Devolvida, por Pessoa Ficticia CTO em 22/10/2026 às 15:00.',
    );
    expect(textoDaDecisaoRegistrada(pacote({ statusDecisao: 'arquivada', decisao: { ...decisao, opcaoEscolhida: null, decididaPor: null } }))).toBe(
      'Decisão registrada: Arquivada, por Não informado em 22/10/2026 às 15:00.',
    );
    expect(textoDaDecisaoRegistrada(pacote())).toBeNull();
  });
});

describe('grupos do formulário', () => {
  it('"Aprovar" desatualizado fica no grupo, indisponível e explicado (CA-12.4); Devolver e Arquivar com a dica', () => {
    expect(opcoesDaDecisao(false)).toEqual([
      { valor: 'aprovada', rotulo: 'Aprovar' },
      { valor: 'devolvida', rotulo: 'Devolver para nova análise', dica: 'Devolver: a demanda volta para Em análise.' },
      { valor: 'arquivada', rotulo: 'Arquivar', dica: 'Arquivar: a demanda vai para Encerrada.' },
    ]);
    expect(opcoesDaDecisao(true)[0]).toEqual({ valor: 'aprovada', rotulo: 'Aprovar', desabilitada: true, dica: 'Indisponível: pacote desatualizado.' });
  });

  it('"Opção A — <primeiras 80 letras da descrição>"', () => {
    const [a, b] = opcoesDaEscolha(pacote());
    expect(a).toEqual({ valor: 'A', rotulo: 'Opção A — Construir tudo numa entrega só (fictício)' });
    expect(b!.rotulo).toBe(`Opção B — ${'B'.repeat(80)}…`);
  });

  it('texto da opção fixada, pelo papel de quem aprovou primeiro', () => {
    expect(TEXTOS_DECISAO.fixada('cto', 'A')).toBe('O CTO aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.');
    expect(TEXTOS_DECISAO.fixada('administradora', 'B')).toBe(
      'A administradora aprovou a opção B. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.',
    );
  });
});

describe('validação no envio, na ordem da tela', () => {
  it('nada marcado: só "Escolha a decisão." (e a revisão, se houver rascunho)', () => {
    expect(validarDecisao(valores(), ctx()).map((e) => [e.campo, e.mensagem, e.idCampo])).toEqual([
      ['statusDecisao', 'Escolha a decisão.', `${idDoCampo('statusDecisao')}-aprovada`],
    ]);
    expect(validarDecisao(valores(), ctx({ exigeRevisao: true })).map((e) => e.mensagem)).toEqual(['Escolha a decisão.', MENSAGENS_DECISAO.revisarRascunhos]);
  });

  it('desatualizado: o link do resumo leva à primeira opção disponível', () => {
    expect(validarDecisao(valores(), ctx({ aprovarIndisponivel: true }))[0]!.idCampo).toBe(`${idDoCampo('statusDecisao')}-devolvida`);
  });

  it('Aprovar sem opção; administradora sem documento e sem data; comentário longo', () => {
    const erros = validarDecisao(valores({ statusDecisao: 'aprovada', comentarios: 'x'.repeat(10_001) }), ctx({ pedeDocumento: true, exigeRevisao: true }));
    expect(erros.map((e) => [e.campo, e.mensagem, e.idCampo])).toEqual([
      ['opcaoEscolhida', 'Escolha a opção A ou a opção B.', `${idDoCampo('opcaoEscolhida')}-A`],
      ['referenciaDocumento', 'Informe o identificador do documento assinado.', idDoCampo('referenciaDocumento')],
      ['dataDocumento', 'Informe a data da assinatura.', idDoCampo('dataDocumento')],
      ['comentarios', 'Este campo aceita até 10.000 caracteres.', idDoCampo('comentarios')],
      ['revisouRascunhosDeAgente', MENSAGENS_DECISAO.revisarRascunhos, idDoCampo('revisouRascunhosDeAgente')],
    ]);
  });

  it('com a opção fixada, a escolha não é pedida; Devolver não pede opção nem documento', () => {
    expect(validarDecisao(valores({ statusDecisao: 'aprovada', referenciaDocumento: 'DOC-1', dataDocumento: '2026-10-23' }), ctx({ opcaoFixada: { papel: 'cto', opcao: 'A' }, pedeDocumento: true }))).toEqual([]);
    expect(validarDecisao(valores({ statusDecisao: 'devolvida' }), ctx({ pedeDocumento: true }))).toEqual([]);
    expect(validarDecisao(valores({ statusDecisao: 'aprovada', referenciaDocumento: 'x'.repeat(201), dataDocumento: '2026-10-23', opcaoEscolhida: 'B' }), ctx({ pedeDocumento: true })).map((e) => e.mensagem)).toEqual([
      'Este campo aceita até 200 caracteres.',
    ]);
  });
});

describe('entrada da Server Action', () => {
  it('aprovar: a opção (a fixada, se houver), o documento só da administradora e a revisão; passa no schema da API', () => {
    const e = entradaDaDecisao(valores({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', comentarios: '  ok  ', revisouRascunhosDeAgente: true }), ctx());
    expect(e).toEqual({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', comentarios: 'ok', revisouRascunhosDeAgente: true });
    expect(registrarDecisaoSchema.safeParse(e).success).toBe(true);
    const adm = entradaDaDecisao(
      valores({ statusDecisao: 'aprovada', opcaoEscolhida: 'B', referenciaDocumento: ' DOC-1 ', dataDocumento: '2026-10-23' }),
      ctx({ opcaoFixada: { papel: 'cto', opcao: 'A' }, pedeDocumento: true }),
    );
    expect(adm).toEqual({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', referenciaDocumento: 'DOC-1', dataDocumento: '2026-10-23', revisouRascunhosDeAgente: false });
    expect(registrarDecisaoSchema.safeParse(adm).success).toBe(true);
  });

  it('devolver e arquivar: sem opção nem documento; nenhum campo de autoria (C-11)', () => {
    const e = entradaDaDecisao(valores({ statusDecisao: 'arquivada', opcaoEscolhida: 'A', referenciaDocumento: 'DOC', dataDocumento: '2026-10-23' }), ctx({ pedeDocumento: true }));
    expect(e).toEqual({ statusDecisao: 'arquivada', revisouRascunhosDeAgente: false });
    for (const proibido of ['registrarComo', 'papelAprovacao', 'nomeAprovador', 'decididaPor', 'registradaPor']) expect(e).not.toHaveProperty(proibido);
  });
});

// 0.2.0 (DEC-DEM-20261110-0015-v1, T12; ADR-18): um formulário, três botões. O botão ativado define o statusDecisao uma
// vez; o mesmo `v` vai ao diálogo e à Server Action (CV-10). As funções de validação e de entrada são as de cima, sem
// mudança.
describe('envioDaDecisao (ADR-18, CV-10, CV-11)', () => {
  const v = valores({ opcaoEscolhida: 'B' });
  const p = { especificacaoCitada: { repositorioDestino: 'wsssistemas2626-crypto/ficticio' }, nivelAprovacaoRequerido: 'cto' as const };

  it('as três ações aceitas são as de hoje, na ordem dos botões', () => {
    expect(ACOES_DA_DECISAO).toEqual(['aprovada', 'devolvida', 'arquivada']);
  });

  it('CV-10: botão com valor fora da lista (ou nulo) não faz nada', () => {
    for (const b of ['x', '', null, undefined, 'pendente', 'APROVADA', ' aprovada']) expect(envioDaDecisao(v, ctx(), b), String(b)).toEqual({ tipo: 'nada' });
  });

  it('CV-10: o v devolvido é o que vai ao diálogo e à Server Action, com o statusDecisao do botão', () => {
    const r = envioDaDecisao(v, ctx(), 'aprovada');
    expect(r).toEqual({ tipo: 'confirmar', v: { ...v, statusDecisao: 'aprovada' } });
    if (r.tipo !== 'confirmar') throw new Error('esperava confirmar');
    expect(textoDoDialogo(r.v, ctx(), p)[0]).toContain('Aprovar a opção B.');
    expect(entradaDaDecisao(r.v, ctx())).toMatchObject({ statusDecisao: 'aprovada', opcaoEscolhida: 'B' });
    // Com a opção B marcada, "Devolver" grava devolvida, sem opção (CV-10, segundo e2e).
    const d = envioDaDecisao(v, ctx(), 'devolvida');
    if (d.tipo !== 'confirmar') throw new Error('esperava confirmar');
    expect(textoDoDialogo(d.v, ctx(), p)[0]).toContain('Devolver para nova análise.');
    expect(entradaDaDecisao(d.v, ctx())).toEqual({ statusDecisao: 'devolvida', revisouRascunhosDeAgente: false });
    // O estado da tela não muda: o botão vale para este envio só.
    expect(v.statusDecisao).toBe('');
  });

  it('CV-11: com o pacote desatualizado, "aprovada" não faz nada; devolver e arquivar seguem', () => {
    const d = ctx({ aprovarIndisponivel: true });
    expect(envioDaDecisao(v, d, 'aprovada')).toEqual({ tipo: 'nada' });
    expect(envioDaDecisao(valores(), d, 'aprovada')).toEqual({ tipo: 'nada' });
    expect(envioDaDecisao(v, d, 'devolvida').tipo).toBe('confirmar');
    expect(envioDaDecisao(v, d, 'arquivada').tipo).toBe('confirmar');
  });

  it('CA-11.2: aprovar sem opção dá "Escolha a opção A ou a opção B." e não confirma', () => {
    const r = envioDaDecisao(valores(), ctx(), 'aprovada');
    expect(r.tipo).toBe('erros');
    if (r.tipo === 'erros') {
      expect(r.erros.map((e) => e.mensagem)).toEqual(['Escolha a opção A ou a opção B.']);
      expect(r.erros[0]!.idCampo).toBe(`${idDoCampo('opcaoEscolhida')}-A`);
    }
  });

  it('CA-11.4 e CV-14: com revisão exigida, as três ações pedem a caixa; marcada, as três confirmam', () => {
    for (const b of ACOES_DA_DECISAO) {
      const r = envioDaDecisao(v, ctx({ exigeRevisao: true }), b);
      expect(r.tipo, b).toBe('erros');
      if (r.tipo === 'erros') expect(r.erros.map((e) => e.mensagem), b).toEqual([MENSAGENS_DECISAO.revisarRascunhos]);
      expect(envioDaDecisao({ ...v, revisouRascunhosDeAgente: true }, ctx({ exigeRevisao: true }), b).tipo, b).toBe('confirmar');
    }
  });

  it('CA-11.5 e CA-11.6: documento obrigatório só para aprovar; ao devolver ou arquivar não vai na entrada', () => {
    const doc = ctx({ pedeDocumento: true, opcaoFixada: { papel: 'cto', opcao: 'A' } });
    const semDoc = envioDaDecisao(valores(), doc, 'aprovada');
    expect(semDoc.tipo).toBe('erros');
    if (semDoc.tipo === 'erros') expect(semDoc.erros.map((e) => e.campo)).toEqual(['referenciaDocumento', 'dataDocumento']);
    const comDoc = valores({ referenciaDocumento: 'DOC-FICTICIO-1', dataDocumento: '2026-11-10' });
    for (const b of ['devolvida', 'arquivada'] as const) {
      const r = envioDaDecisao(comDoc, doc, b);
      if (r.tipo !== 'confirmar') throw new Error(`esperava confirmar em ${b}`);
      expect(entradaDaDecisao(r.v, doc), b).not.toHaveProperty('referenciaDocumento');
      expect(entradaDaDecisao(r.v, doc), b).not.toHaveProperty('dataDocumento');
      expect(entradaDaDecisao(r.v, doc), b).not.toHaveProperty('opcaoEscolhida');
    }
    const aprovar = envioDaDecisao(comDoc, doc, 'aprovada');
    if (aprovar.tipo !== 'confirmar') throw new Error('esperava confirmar');
    expect(entradaDaDecisao(aprovar.v, doc)).toEqual({
      statusDecisao: 'aprovada',
      opcaoEscolhida: 'A',
      referenciaDocumento: 'DOC-FICTICIO-1',
      dataDocumento: '2026-11-10',
      revisouRascunhosDeAgente: false,
    });
  });

  it('o que envioDaDecisao confirma, o schema da API aceita (as três ações, com e sem documento)', () => {
    for (const b of ACOES_DA_DECISAO)
      for (const c of [ctx(), ctx({ pedeDocumento: true }), ctx({ opcaoFixada: { papel: 'administradora', opcao: 'B' } })]) {
        const r = envioDaDecisao(valores({ opcaoEscolhida: 'A', referenciaDocumento: 'DOC-FICTICIO-2', dataDocumento: '2026-11-10' }), c, b);
        if (r.tipo !== 'confirmar') throw new Error(`esperava confirmar em ${b}`);
        expect(registrarDecisaoSchema.safeParse(entradaDaDecisao(r.v, c)).success, `${b} ${JSON.stringify(c)}`).toBe(true);
      }
  });
});

describe('rotuloDoPrincipal (03, 6.4; CV-13)', () => {
  it('"Aprovar" sem opção; "Aprovar a opção X" com a marcada ou a fixada; "Aprovar" com o pacote desatualizado', () => {
    const c = { opcaoFixada: null, aprovarIndisponivel: false };
    expect(rotuloDoPrincipal({ opcaoEscolhida: '' }, c)).toBe('Aprovar');
    expect(rotuloDoPrincipal({ opcaoEscolhida: 'A' }, c)).toBe('Aprovar a opção A');
    expect(rotuloDoPrincipal({ opcaoEscolhida: 'B' }, c)).toBe('Aprovar a opção B');
    expect(rotuloDoPrincipal({ opcaoEscolhida: '' }, { ...c, opcaoFixada: { papel: 'cto', opcao: 'A' } })).toBe('Aprovar a opção A');
    // A fixada vale sobre a marcada: é a que a entrada envia (entradaDaDecisao).
    expect(rotuloDoPrincipal({ opcaoEscolhida: 'B' }, { ...c, opcaoFixada: { papel: 'cto', opcao: 'A' } })).toBe('Aprovar a opção A');
    expect(rotuloDoPrincipal({ opcaoEscolhida: 'B' }, { ...c, aprovarIndisponivel: true })).toBe('Aprovar');
    expect(rotuloDoPrincipal({ opcaoEscolhida: '' }, { opcaoFixada: { papel: 'cto', opcao: 'A' }, aprovarIndisponivel: true })).toBe('Aprovar');
  });

  it('o rótulo e o diálogo citam a mesma opção (o que se vê é o que se grava)', () => {
    const p = { especificacaoCitada: { repositorioDestino: null }, nivelAprovacaoRequerido: 'cto_e_administradora' as const };
    for (const [opcaoEscolhida, opcaoFixada] of [
      ['A', null],
      ['B', null],
      ['', { papel: 'cto' as const, opcao: 'B' as const }],
      ['A', { papel: 'administradora' as const, opcao: 'B' as const }],
    ] as const) {
      const c = ctx({ opcaoFixada });
      const r = envioDaDecisao(valores({ opcaoEscolhida }), c, 'aprovada');
      if (r.tipo !== 'confirmar') throw new Error('esperava confirmar');
      expect(textoDoDialogo(r.v, c, p)[0]).toContain(`${rotuloDoPrincipal(r.v, c)}.`);
    }
  });
});

describe('erros da API', () => {
  it('400 campo a campo, com o caminho da Server Action ("decisao.") tirado e as mensagens da 03', () => {
    const r: Falha = {
      ok: false,
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [
        { campo: 'decisao.statusDecisao', mensagem: 'Valor inválido.' },
        { campo: 'decisao.opcaoEscolhida', mensagem: 'Valor inválido.' },
        { campo: 'referenciaDocumento', mensagem: MENSAGENS_DECISAO.semReferencia },
        { campo: 'decisao.dataDocumento', mensagem: 'Valor inválido.' },
        { campo: 'revisouRascunhosDeAgente', mensagem: MENSAGENS_DECISAO.revisarRascunhos },
      ],
    };
    expect(errosDaApiDecisao(r, ctx()).campos.map((c) => [c.campo, c.rotulo, c.mensagem])).toEqual([
      ['statusDecisao', 'Decisão', 'Escolha a decisão.'],
      ['opcaoEscolhida', 'Opção escolhida', 'Escolha a opção A ou a opção B.'],
      ['referenciaDocumento', 'Identificador do documento assinado', 'Informe o identificador do documento assinado.'],
      ['dataDocumento', 'Data da assinatura', 'Informe a data da assinatura.'],
      ['revisouRascunhosDeAgente', 'Revisei os rascunhos de agente citados neste pacote', MENSAGENS_DECISAO.revisarRascunhos],
    ]);
  });

  it('409: "Não foi possível concluir: …" com o motivo do servidor; 403 com o texto da 2.8', () => {
    for (const motivo of [MENSAGENS_DECISAO.jaDecidido, MENSAGENS_DECISAO.desatualizado, MENSAGENS_DECISAO.opcaoDiferente.cto])
      expect(errosDaApiDecisao({ ok: false, erro: 'conflito', mensagem: motivo }, ctx()).alerta).toBe(`Não foi possível concluir: ${motivo}`);
    expect(errosDaApiDecisao({ ok: false, erro: 'sem_permissao', mensagem: 'x' }, ctx()).alerta).toBe('Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.');
  });
});

describe('diálogo de confirmação (03, T11; C-14)', () => {
  it('resume a decisão e repete o repositório destino e o nível', () => {
    const p = pacote();
    expect(textoDoDialogo(valores({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), ctx(), p)).toEqual([
      'Você vai registrar: Aprovar a opção A. Depois de registrada, a decisão deste pacote não muda. Para decidir de outro jeito, será preciso um pacote novo.',
      'Repositório destino: wsssistemas2626-crypto/sistema-ficticio.',
      'Nível de aprovação: Só o CTO.',
    ]);
    expect(textoDoDialogo(valores({ statusDecisao: 'aprovada' }), ctx({ opcaoFixada: { papel: 'cto', opcao: 'B' } }), p)[0]).toContain('Aprovar a opção B.');
    expect(textoDoDialogo(valores({ statusDecisao: 'devolvida' }), ctx(), p)[0]).toBe(
      'Você vai registrar: Devolver para nova análise. Depois de registrada, a decisão deste pacote não muda. Para decidir de outro jeito, será preciso um pacote novo.',
    );
    const estudo = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', especificacaoCitada: { sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: null } });
    expect(textoDoDialogo(valores({ statusDecisao: 'arquivada' }), ctx(), estudo)).toEqual([
      'Você vai registrar: Arquivar. Depois de registrada, a decisão deste pacote não muda. Para decidir de outro jeito, será preciso um pacote novo.',
      'Repositório destino: Não informado.',
      'Nível de aprovação: CTO e administradora.',
    ]);
  });
});

describe('topo, revisão (C-14), opções e aprovações', () => {
  it('rascunhos citados em texto: "A", "A e B", "A, B e C"', () => {
    expect(rascunhosEmTexto([DEC])).toBe(DEC);
    expect(rascunhosEmTexto([DEC, ESP])).toBe(`${DEC} e ${ESP}`);
    expect(rascunhosEmTexto([DEC, ESP, RSK])).toBe(`${DEC}, ${ESP} e ${RSK}`);
    expect(TEXTOS_DECISAO.alertaRascunho(rascunhosEmTexto([DEC, ESP]))).toBe(
      `Este pacote cita conteúdo gerado por agente de IA: ${DEC} e ${ESP}. Leia cada um antes de decidir.`,
    );
  });

  it('desatualizado: cita a versão mais nova da demanda (ESP primeiro, senão RSK), com o link para criar pacote novo', () => {
    const d = { id: ID, especificacoes: [{ id: `ESP-${ID}-v3` }, { id: ESP }], pareceresRisco: [{ id: RSK }] };
    expect(alertaDeDesatualizado(pacote(), d)).toBeNull();
    expect(alertaDeDesatualizado(pacote({ desatualizado: true }), d)).toEqual({
      texto: `Este pacote está desatualizado. A demanda já tem ESP-${ID}-v3, mais nova que a citada aqui. Ele não pode ser aprovado; você pode devolvê-lo ou arquivá-lo. Para aprovar, crie um pacote novo.`,
      link: { rotulo: 'Criar pacote novo', href: `/demandas/${ID}/pacotes-decisao/novo` },
    });
    const soRsk = { id: ID, especificacoes: [{ id: ESP }], pareceresRisco: [{ id: `RSK-${ID}-v2` }, { id: RSK }] };
    expect(alertaDeDesatualizado(pacote({ desatualizado: true }), soRsk)?.texto).toBe(
      `Este pacote está desatualizado. A demanda já tem RSK-${ID}-v2, mais novo que o citado aqui. Ele não pode ser aprovado; você pode devolvê-lo ou arquivá-lo. Para aprovar, crie um pacote novo.`,
    );
  });

  it('revisão antes de decidir: ESP e RSK citados (com o rascunho marcado), os níveis em texto e o nível de aprovação', () => {
    const r = itensDaRevisao(pacote({ rascunhosCitados: [ESP] }));
    expect(r).toEqual([
      { termo: 'Especificação técnica citada', valor: ESP, rascunho: true },
      { termo: 'Sistema alvo', valor: 'sistema-ficticio' },
      { termo: 'Repositório destino', valor: 'wsssistemas2626-crypto/sistema-ficticio' },
      { termo: 'Critérios de aceite preliminares', valor: ['Critério A (fictício)', 'Critério B (fictício)'] },
      { termo: 'Definição de pronto', valor: ['Testes verdes (fictício)'] },
      { termo: 'Parecer de risco citado', valor: RSK, rascunho: false },
      { termo: 'Níveis de risco', valor: ['Risco técnico: Alto', 'Risco operacional: Médio', 'Risco jurídico: Baixo'] },
      { termo: 'Nível de aprovação', valor: 'Nível de aprovação: Só o CTO' },
    ]);
    const vazio = itensDaRevisao(pacote({ especificacaoCitada: { sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: [] } }));
    expect(vazio.slice(1, 5).map((i) => i.valor)).toEqual(['Não informado.', 'Não informado.', 'Nenhum item.', 'Nenhum item.']);
  });

  it('opções A e B com os subtítulos da 03 e "Não informado." no vazio', () => {
    expect(secoesDasOpcoes(pacote())).toEqual([
      {
        titulo: 'Opção A',
        itens: [
          { termo: 'Descrição', valor: 'Construir tudo numa entrega só (fictício)' },
          { termo: 'Vantagens', valor: 'Resolve a causa (fictício)' },
          { termo: 'Desvantagens', valor: 'Não informado.' },
          { termo: 'Quando escolher', valor: 'Não informado.' },
        ],
      },
      {
        titulo: 'Opção B',
        itens: [
          { termo: 'Descrição', valor: 'B'.repeat(100) },
          { termo: 'Vantagens', valor: 'Não informado.' },
          { termo: 'Desvantagens', valor: 'Não informado.' },
          { termo: 'Quando escolher', valor: 'Não informado.' },
        ],
      },
    ]);
  });

  it('aprovações (só nível CTO e administradora): pendente ou quem aprovou, com o documento da administradora', () => {
    expect(linhasDeAprovacao(pacote())).toBeNull();
    const p = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' });
    expect(linhasDeAprovacao(p)).toEqual(['CTO: pendente.', 'Administradora: pendente.']);
    expect(linhasDeAprovacao({ ...p, aprovadores: [aprovacaoCto, aprovacaoAdm] })).toEqual([
      'CTO: Pessoa Ficticia CTO aprovou a opção A em 22/10/2026 às 15:00.',
      'Administradora: Pessoa Ficticia Administradora aprovou a opção A em 23/10/2026 às 09:30, com o documento DOC-FICTICIO-1 assinado em 23/10/2026.',
    ]);
  });
});

describe('chegada depois de decidir (só valores fixos de ?aviso=; o texto vem do estado do pacote)', () => {
  const aprovadaDecisao = { opcaoEscolhida: 'B' as const, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO };

  it('pacote criado (T09), enquanto ninguém decidiu', () => {
    expect(chegadaNaDecisao({ aviso: AVISO_DECISAO.pacoteCriado }, pacote())).toBe(
      `${DEC} criado. A demanda está pronta para decisão e o aviso por e-mail entrou na fila de envio.`,
    );
    expect(chegadaNaDecisao({ aviso: AVISO_DECISAO.pacoteCriado }, pacote({ aprovadores: [aprovacaoCto] }))).toBeNull();
  });

  it('decisão registrada: aprovada (nível cto), parcial, completa, devolvida e arquivada', () => {
    const aviso = { aviso: AVISO_DECISAO.decisaoRegistrada };
    expect(chegadaNaDecisao(aviso, pacote({ statusDecisao: 'aprovada', decisao: aprovadaDecisao, aprovadores: [{ ...aprovacaoCto, opcao: 'B' }] }))).toBe(
      'Decisão registrada: Aprovada, opção B.',
    );
    const dupla = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' });
    expect(chegadaNaDecisao(aviso, { ...dupla, aprovadores: [aprovacaoCto] })).toBe('Aprovação do CTO registrada. Falta a aprovação da administradora.');
    expect(chegadaNaDecisao(aviso, { ...dupla, aprovadores: [aprovacaoAdm] })).toBe('Aprovação da administradora registrada. Falta a aprovação do CTO.');
    // Quem fechou é quem registrou a decisão; com o mesmo instante, a vista ordena pelo papel, e a ordem não decide.
    const pelaAdm = { ...aprovadaDecisao, decididaPor: aprovacaoAdm.nome };
    for (const aprovadores of [
      [aprovacaoCto, aprovacaoAdm],
      [aprovacaoAdm, aprovacaoCto],
    ]) {
      expect(chegadaNaDecisao(aviso, { ...dupla, statusDecisao: 'aprovada', decisao: pelaAdm, aprovadores })).toBe('Aprovação da administradora registrada. O pacote está aprovado.');
      expect(chegadaNaDecisao(aviso, { ...dupla, statusDecisao: 'aprovada', decisao: aprovadaDecisao, aprovadores })).toBe('Aprovação do CTO registrada. O pacote está aprovado.');
    }
    // Sem o nome (conta que não existe mais), a mais nova.
    expect(
      chegadaNaDecisao(aviso, { ...dupla, statusDecisao: 'aprovada', decisao: { ...aprovadaDecisao, decididaPor: null }, aprovadores: [aprovacaoCto, aprovacaoAdm] }),
    ).toBe('Aprovação da administradora registrada. O pacote está aprovado.');
    expect(chegadaNaDecisao(aviso, pacote({ statusDecisao: 'devolvida', decisao: { ...aprovadaDecisao, opcaoEscolhida: null } }))).toBe(TEXTOS_DECISAO.sucesso.devolvida);
    expect(chegadaNaDecisao(aviso, pacote({ statusDecisao: 'arquivada', decisao: { ...aprovadaDecisao, opcaoEscolhida: null } }))).toBe(TEXTOS_DECISAO.sucesso.arquivada);
    expect(chegadaNaDecisao(aviso, pacote())).toBeNull();
  });

  it('outro valor, lista ou ausência: nada', () => {
    for (const aviso of [undefined, 'qualquer', ['decisao-registrada'], '<script>']) expect(chegadaNaDecisao({ aviso }, pacote({ statusDecisao: 'arquivada' }))).toBeNull();
  });
});

// 06-T43-testes (qa-automacao): bordas e o contrato entre a validação da tela e o schema da API.
describe('contrato da tela com registrarDecisaoSchema (qa-automacao)', () => {
  const STATUS = ['aprovada', 'devolvida', 'arquivada'] as const;
  const FIXADAS = [null, { papel: 'cto' as const, opcao: 'A' as const }, { papel: 'administradora' as const, opcao: 'B' as const }];
  const SIM_NAO = [false, true] as const;

  it('o que a tela aceita, o schema da API aceita; sem documento fora da conta da administradora; a opção fixada é a que vai (CA-14.4)', () => {
    let aceitos = 0;
    for (const statusDecisao of STATUS)
      for (const opcaoFixada of FIXADAS)
        for (const pedeDocumento of SIM_NAO)
          for (const exigeRevisao of SIM_NAO)
            for (const opcaoEscolhida of ['', 'A', 'B'] as const)
              for (const referenciaDocumento of ['', ' DOC-FICTICIO-1 '])
                for (const dataDocumento of ['', '2026-10-23'])
                  for (const comentarios of ['', '  Comentário (fictício)  '])
                    for (const revisouRascunhosDeAgente of SIM_NAO) {
                      const c = ctx({ opcaoFixada, pedeDocumento, exigeRevisao });
                      const vv = valores({ statusDecisao, opcaoEscolhida, referenciaDocumento, dataDocumento, comentarios, revisouRascunhosDeAgente });
                      if (validarDecisao(vv, c).length > 0) continue;
                      aceitos++;
                      const e = entradaDaDecisao(vv, c);
                      const rotulo = JSON.stringify({ vv, c });
                      expect(registrarDecisaoSchema.safeParse(e).success, rotulo).toBe(true);
                      if (exigeRevisao) expect(e.revisouRascunhosDeAgente, rotulo).toBe(true);
                      if (!pedeDocumento) {
                        expect(e, rotulo).not.toHaveProperty('referenciaDocumento');
                        expect(e, rotulo).not.toHaveProperty('dataDocumento');
                      }
                      if (statusDecisao !== 'aprovada') expect(e, rotulo).not.toHaveProperty('opcaoEscolhida');
                      else expect(e.opcaoEscolhida, rotulo).toBe(opcaoFixada?.opcao ?? opcaoEscolhida);
                      expect(e, rotulo).not.toHaveProperty('registrarComo');
                    }
    // A malha não pode ficar vazia por engano (asserção que nunca roda).
    expect(aceitos).toBeGreaterThan(100);
  });

  it('comentário no limite da RNF-04: 10.000 aceitos pela tela e pelo schema (espaço nas pontas não conta); 10.001 recusados pelos dois', () => {
    for (const comentarios of [` ${'x'.repeat(LIMITE_CAMPO_DEC)} `, 'ç'.repeat(LIMITE_CAMPO_DEC)]) {
      const vv = valores({ statusDecisao: 'arquivada', comentarios });
      expect(validarDecisao(vv, ctx())).toEqual([]);
      expect(registrarDecisaoSchema.safeParse(entradaDaDecisao(vv, ctx())).success).toBe(true);
    }
    for (const comentarios of ['x'.repeat(LIMITE_CAMPO_DEC + 1), 'ç'.repeat(LIMITE_CAMPO_DEC + 1)]) {
      const vv = valores({ statusDecisao: 'arquivada', comentarios });
      expect(validarDecisao(vv, ctx()).map((e) => [e.campo, e.mensagem])).toEqual([['comentarios', 'Este campo aceita até 10.000 caracteres.']]);
      expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'arquivada', comentarios }).success).toBe(false);
    }
    // Fora do plano básico (emoji), a tela conta por unidade de UTF-16 e o Zod por letra: a tela pode recusar o que o
    // servidor aceitaria, nunca o contrário (Pendências da 06-T43-qa-automacao). Aqui só o sentido seguro fica preso.
    const emoji = valores({ statusDecisao: 'arquivada', comentarios: '😀'.repeat(LIMITE_CAMPO_DEC / 2) });
    expect(validarDecisao(emoji, ctx())).toEqual([]);
    expect(registrarDecisaoSchema.safeParse(entradaDaDecisao(emoji, ctx())).success).toBe(true);
  });

  it('referência ao documento no limite: 200 aceitos pela tela e pelo schema; 201 recusados pelos dois; só espaço é vazio', () => {
    const adm = ctx({ pedeDocumento: true });
    const aprovar = (referenciaDocumento: string) => valores({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', referenciaDocumento, dataDocumento: '2026-10-23' });
    const noLimite = aprovar(`  ${'D'.repeat(LIMITE_REFERENCIA)}  `);
    expect(validarDecisao(noLimite, adm)).toEqual([]);
    expect(registrarDecisaoSchema.safeParse(entradaDaDecisao(noLimite, adm)).success).toBe(true);
    const acima = aprovar('D'.repeat(LIMITE_REFERENCIA + 1));
    expect(validarDecisao(acima, adm).map((e) => e.mensagem)).toEqual(['Este campo aceita até 200 caracteres.']);
    expect(registrarDecisaoSchema.safeParse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A', referenciaDocumento: 'D'.repeat(LIMITE_REFERENCIA + 1) }).success).toBe(false);
    expect(validarDecisao(aprovar('   '), adm).map((e) => e.mensagem)).toEqual(['Informe o identificador do documento assinado.']);
    expect(entradaDaDecisao(aprovar('   '), adm)).not.toHaveProperty('referenciaDocumento');
  });
});

describe('bordas da tela de decisão (qa-automacao)', () => {
  it('"Opção A — …": 80 letras inteiras sem reticências, a 81ª corta; conta por letra, não por unidade de UTF-16', () => {
    const [a80] = opcoesDaEscolha(pacote({ opcaoA: { descricao: 'a'.repeat(80) } }));
    expect(a80!.rotulo).toBe(`Opção A — ${'a'.repeat(80)}`);
    const [a81] = opcoesDaEscolha(pacote({ opcaoA: { descricao: 'a'.repeat(81) } }));
    expect(a81!.rotulo).toBe(`Opção A — ${'a'.repeat(80)}…`);
    const [emoji] = opcoesDaEscolha(pacote({ opcaoA: { descricao: '😀'.repeat(80) } }));
    expect(emoji!.rotulo).toBe(`Opção A — ${'😀'.repeat(80)}`);
    const [emoji81] = opcoesDaEscolha(pacote({ opcaoA: { descricao: '😀'.repeat(81) } }));
    expect(emoji81!.rotulo).toBe(`Opção A — ${'😀'.repeat(80)}…`);
  });

  it('decisaoSuja: limpa no início; qualquer campo mudado pede confirmação ao sair', () => {
    expect(decisaoSuja(valoresDaDecisao())).toBe(false);
    const mudancas: Partial<ValoresDaDecisao>[] = [
      { statusDecisao: 'devolvida' },
      { opcaoEscolhida: 'B' },
      { referenciaDocumento: 'D' },
      { dataDocumento: '2026-10-23' },
      { comentarios: 'x' },
      { revisouRascunhosDeAgente: true },
    ];
    for (const m of mudancas) expect(decisaoSuja(valores(m)), JSON.stringify(m)).toBe(true);
  });

  it('erros da API: o campo raiz "decisao" vai ao grupo de decisão, e o mesmo campo aparece uma vez só no resumo', () => {
    const r: Falha = {
      ok: false,
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [
        { campo: 'decisao', mensagem: 'Valor inválido.' },
        { campo: 'decisao.statusDecisao', mensagem: 'Valor inválido.' },
        { campo: 'decisao.referenciaDocumento', mensagem: 'Este campo aceita até 200 caracteres.' },
      ],
    };
    const e = errosDaApiDecisao(r, ctx({ aprovarIndisponivel: true }));
    expect(e.campos.map((c) => [c.campo, c.mensagem, c.idCampo])).toEqual([
      ['statusDecisao', 'Escolha a decisão.', `${idDoCampo('statusDecisao')}-devolvida`],
      ['referenciaDocumento', 'Este campo aceita até 200 caracteres.', idDoCampo('referenciaDocumento')],
    ]);
    expect(e.porCampo).toEqual({ statusDecisao: 'Escolha a decisão.', referenciaDocumento: 'Este campo aceita até 200 caracteres.' });
    expect(e.alerta).toBeNull();
  });

  it('chegada: "criado" some depois de qualquer decisão; aprovada sem opção gravada ou pendente com duas aprovações não inventam texto', () => {
    const devolvida = pacote({ statusDecisao: 'devolvida', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO } });
    expect(chegadaNaDecisao({ aviso: AVISO_DECISAO.pacoteCriado }, devolvida)).toBeNull();
    const aviso = { aviso: AVISO_DECISAO.decisaoRegistrada };
    expect(chegadaNaDecisao(aviso, pacote({ statusDecisao: 'aprovada', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: null, decididaEm: APROVADO } }))).toBeNull();
    expect(chegadaNaDecisao(aviso, pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto, aprovacaoAdm] }))).toBeNull();
    expect(textoDaDecisaoRegistrada(pacote({ statusDecisao: 'pendente', decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: 'x', decididaEm: APROVADO } }))).toBeNull();
  });

  it('desatualizado sem versão mais nova visível na demanda: o alerta não some e cita a ESP do próprio pacote', () => {
    const igual = { id: ID, especificacoes: [{ id: ESP }], pareceresRisco: [{ id: RSK }] };
    expect(alertaDeDesatualizado(pacote({ desatualizado: true }), igual)?.texto).toBe(TEXTOS_DECISAO.desatualizadoEsp(ESP));
    expect(alertaDeDesatualizado(pacote({ desatualizado: true }), { id: ID, especificacoes: [], pareceresRisco: [] })?.texto).toBe(TEXTOS_DECISAO.desatualizadoEsp(ESP));
  });

  it('aprovação da administradora sem documento ou com data fora do formato: "Não informado", nunca o valor cru', () => {
    const p = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [{ ...aprovacaoAdm, referenciaDocumento: null, dataDocumento: '23/10/2026' }] });
    expect(linhasDeAprovacao(p)).toEqual([
      'CTO: pendente.',
      'Administradora: Pessoa Ficticia Administradora aprovou a opção A em 23/10/2026 às 09:30, com o documento Não informado assinado em Não informado.',
    ]);
  });

  it('dupla aprovação com as duas registradas e sem decisão gravada: nenhuma conta ganha formulário para aprovar de novo', () => {
    const p = pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto, aprovacaoAdm] });
    expect(formularioDaConta(p, CTO).tipo).toBe('sem_formulario');
    expect(formularioDaConta(p, ADM).tipo).toBe('sem_formulario');
  });
});

// 06-T12-testes (qa-automacao), DEC-DEM-20261110-0015-v1: com os três botões, cada exigência de aprovação de hoje
// continua valendo em toda combinação de conta, pacote, campos e botão. O oráculo aqui é a regra escrita por extenso
// (RF-11 e cap. 04), e não `validarDecisao`, para o teste reprovar também se a validação mudar junto com o envio.
describe('envioDaDecisao: as exigências de aprovação de hoje em toda combinação (06-T12-testes, qa-automacao)', () => {
  const BOTOES = ['aprovada', 'devolvida', 'arquivada', 'pendente', '', null, undefined] as const;
  const FIXADAS = [null, { papel: 'cto' as const, opcao: 'A' as const }, { papel: 'administradora' as const, opcao: 'B' as const }];
  const SIM_NAO = [false, true] as const;
  const DOC = 'DOC-FICTICIO-7';
  const DATA = '2026-11-10';
  const p = { especificacaoCitada: { repositorioDestino: 'wsssistemas2626-crypto/ficticio' }, nivelAprovacaoRequerido: 'cto_e_administradora' as const };
  const ehAcao = (b: (typeof BOTOES)[number]): b is 'aprovada' | 'devolvida' | 'arquivada' => b === 'aprovada' || b === 'devolvida' || b === 'arquivada';

  it('confirma só com cada exigência da ação cumprida, e nunca pede o que a ação não exige', () => {
    const contagem = { nada: 0, erros: 0, confirmar: 0 };
    for (const botao of BOTOES)
      for (const opcaoFixada of FIXADAS)
        for (const pedeDocumento of SIM_NAO)
          for (const exigeRevisao of SIM_NAO)
            for (const aprovarIndisponivel of SIM_NAO)
              for (const opcaoEscolhida of ['', 'A', 'B'] as const)
                for (const referenciaDocumento of ['', '   ', DOC])
                  for (const dataDocumento of ['', DATA])
                    for (const revisouRascunhosDeAgente of SIM_NAO) {
                      const c = ctx({ opcaoFixada, pedeDocumento, exigeRevisao, aprovarIndisponivel });
                      const vv = Object.freeze(valores({ opcaoEscolhida, referenciaDocumento, dataDocumento, revisouRascunhosDeAgente }));
                      const r = envioDaDecisao(vv, c, botao);
                      contagem[r.tipo]++;
                      const rotulo = JSON.stringify({ botao: String(botao), c, vv });
                      // Botão fora da lista, e "Aprovar" com o pacote desatualizado (CV-11): nada, nem erro nem diálogo.
                      if (!ehAcao(botao) || (botao === 'aprovada' && aprovarIndisponivel)) {
                        expect(r, rotulo).toEqual({ tipo: 'nada' });
                        continue;
                      }
                      // As exigências de hoje, na ordem da tela: opção (sem a fixada), documento e data (conta da
                      // administradora), só para aprovar; a revisão dos rascunhos, nas três ações.
                      const faltas: string[] = [];
                      if (botao === 'aprovada' && !opcaoFixada && opcaoEscolhida === '') faltas.push('opcaoEscolhida');
                      if (botao === 'aprovada' && pedeDocumento && referenciaDocumento.trim() === '') faltas.push('referenciaDocumento');
                      if (botao === 'aprovada' && pedeDocumento && dataDocumento === '') faltas.push('dataDocumento');
                      if (exigeRevisao && !revisouRascunhosDeAgente) faltas.push('revisouRascunhosDeAgente');
                      if (faltas.length > 0) {
                        expect(r.tipo, rotulo).toBe('erros');
                        if (r.tipo === 'erros') expect(r.erros.map((e) => e.campo), rotulo).toEqual(faltas);
                        continue;
                      }
                      expect(r.tipo, rotulo).toBe('confirmar');
                      if (r.tipo !== 'confirmar') continue;
                      expect(r.v, rotulo).toEqual({ ...vv, statusDecisao: botao });
                      const e = entradaDaDecisao(r.v, c);
                      expect(registrarDecisaoSchema.safeParse(e).success, rotulo).toBe(true);
                      expect(e.statusDecisao, rotulo).toBe(botao);
                      expect(e.revisouRascunhosDeAgente, rotulo).toBe(revisouRascunhosDeAgente);
                      const [acao, repositorio, nivel] = textoDoDialogo(r.v, c, p);
                      // C-14: o diálogo repete o repositório destino e o nível em toda ação.
                      expect([repositorio, nivel], rotulo).toEqual(['Repositório destino: wsssistemas2626-crypto/ficticio.', 'Nível de aprovação: CTO e administradora.']);
                      if (botao === 'aprovada') {
                        // A opção gravada é a fixada pela primeira aprovação, senão a marcada; o botão e o diálogo dizem a mesma.
                        const opcao = opcaoFixada?.opcao ?? opcaoEscolhida;
                        expect(e.opcaoEscolhida, rotulo).toBe(opcao);
                        expect(rotuloDoPrincipal(vv, c), rotulo).toBe(`Aprovar a opção ${opcao}`);
                        expect(acao, rotulo).toContain(`Você vai registrar: Aprovar a opção ${opcao}.`);
                        if (pedeDocumento) expect(e, rotulo).toMatchObject({ referenciaDocumento: DOC, dataDocumento: DATA });
                        else for (const campo of ['referenciaDocumento', 'dataDocumento']) expect(e, rotulo).not.toHaveProperty(campo);
                      } else {
                        for (const campo of ['opcaoEscolhida', 'referenciaDocumento', 'dataDocumento']) expect(e, rotulo).not.toHaveProperty(campo);
                        expect(acao, rotulo).toContain(botao === 'devolvida' ? 'Você vai registrar: Devolver para nova análise.' : 'Você vai registrar: Arquivar.');
                      }
                    }
    // A malha passa pelos três resultados (asserção que nunca roda não conta).
    expect(contagem.nada).toBeGreaterThan(1000);
    expect(contagem.erros).toBeGreaterThan(500);
    expect(contagem.confirmar).toBeGreaterThan(500);
  });

  it('CV-10: o botão vale sobre o statusDecisao que estiver no estado, só neste envio; o estado não muda', () => {
    for (const anterior of ['', 'aprovada', 'devolvida', 'arquivada'] as const)
      for (const botao of ACOES_DA_DECISAO) {
        const vv = Object.freeze(valores({ statusDecisao: anterior, opcaoEscolhida: 'A' }));
        const r = envioDaDecisao(vv, ctx(), botao);
        expect(r.tipo, `${anterior} → ${botao}`).toBe('confirmar');
        if (r.tipo === 'confirmar') expect(r.v.statusDecisao, `${anterior} → ${botao}`).toBe(botao);
        expect(vv.statusDecisao).toBe(anterior);
      }
  });

  it('CV-13: o formulário começa sem opção nem decisão, e o principal só diz uma opção quando a primeira aprovação a fixou', () => {
    const inicio = valoresDaDecisao();
    expect([inicio.statusDecisao, inicio.opcaoEscolhida]).toEqual(['', '']);
    // Cada formulário ganha um objeto novo: marcar num não marca no outro.
    expect(valoresDaDecisao()).not.toBe(inicio);
    for (const pedeDocumento of SIM_NAO)
      for (const exigeRevisao of SIM_NAO) {
        expect(rotuloDoPrincipal(inicio, ctx({ pedeDocumento, exigeRevisao }))).toBe('Aprovar');
        expect(rotuloDoPrincipal(inicio, ctx({ pedeDocumento, exigeRevisao, opcaoFixada: { papel: 'cto', opcao: 'B' } }))).toBe('Aprovar a opção B');
      }
    // "Aprovar" sem opção não escolhe por ninguém: dá o erro, e a opção continua vazia.
    const r = envioDaDecisao(inicio, ctx(), 'aprovada');
    expect(r.tipo).toBe('erros');
    if (r.tipo === 'erros') expect(r.v.opcaoEscolhida).toBe('');
  });
});

// 0.1.13 (DEC-DEM-20261104-0014-v1, S5): o DEC aprovado que um aprovado mais novo substituiu mostra o aviso com o link
// para o substituto. Textos da triagem, para revisão da ux-ui-design.
describe('alertaDeSubstituido (0.1.13)', () => {
  const V2 = `DEC-${ID}-v2`;

  it('os textos: o aviso cita o id do substituto e manda não usar pedido deste pacote; o link leva o id', () => {
    expect(TEXTOS_DECISAO.substituido(V2)).toBe(
      `Este pacote foi substituído por ${V2}, aprovado depois dele. Só o pacote aprovado mais novo gera o Pedido de Construção. Não use um pedido gerado deste pacote.`,
    );
    expect(TEXTOS_DECISAO.abrirSubstituto(V2)).toBe(`Abrir ${V2}`);
  });

  it('sem substituto: null; com o id do substituto: o texto e o link para a T11 dele', () => {
    expect(alertaDeSubstituido(pacote())).toBeNull();
    expect(alertaDeSubstituido(pacote({ statusDecisao: 'aprovada', substituidoPor: null }))).toBeNull();
    expect(alertaDeSubstituido(pacote({ statusDecisao: 'aprovada', substituido: true, substituidoPor: V2 }))).toEqual({
      texto: TEXTOS_DECISAO.substituido(V2),
      link: { rotulo: `Abrir ${V2}`, href: `/pacotes-decisao/${V2}` },
    });
  });

  it('a mensagem outroAprovado (A-02) saiu do fluxo de aprovação', () => {
    expect(MENSAGENS_DECISAO).not.toHaveProperty('outroAprovado');
  });
});
