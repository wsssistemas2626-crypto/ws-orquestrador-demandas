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
  alertaDeDesatualizado,
  AVISO_DECISAO,
  chegadaNaDecisao,
  entradaDaDecisao,
  errosDaApiDecisao,
  formularioDaConta,
  itensDaRevisao,
  linhasDeAprovacao,
  LIMITE_REFERENCIA,
  opcoesDaDecisao,
  opcoesDaEscolha,
  rascunhosEmTexto,
  secoesDasOpcoes,
  textoDaDecisaoRegistrada,
  textoDoDialogo,
  TEXTOS_DECISAO,
  validarDecisao,
  valoresDaDecisao,
  type ContextoDoFormulario,
  type ValoresDaDecisao,
} from './dados-da-decisao';
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
      'Devolver para nova análise: a demanda volta para Em análise.',
      'Arquivar: a demanda vai para Encerrada.',
    ]);
    expect(t.legendaOpcao).toBe('Opção escolhida (obrigatório)');
    expect([t.referencia, t.dicaReferencia, t.dataAssinatura, t.comentarios, t.revisei, t.registrar, t.registrando]).toEqual([
      'Identificador do documento assinado (obrigatório)',
      'Exemplo: número do documento no sistema de assinatura.',
      'Data da assinatura (obrigatório)',
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
      { valor: 'devolvida', rotulo: 'Devolver para nova análise', dica: 'Devolver para nova análise: a demanda volta para Em análise.' },
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
