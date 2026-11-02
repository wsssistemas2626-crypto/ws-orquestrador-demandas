// T39: regra do formulário de demanda (03, T04 e T06), sem tela. Validação no envio com os textos da 03, montagem da
// entrada (modo manual, modo agente e "Preencher à mão"), mudanças da edição, erros da API traduzidos campo a campo e os
// limites iguais aos do servidor. A validação do cliente é só conveniência: o servidor confere tudo de novo.
import { describe, expect, it } from 'vitest';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { entradaAgenteSchema, entradaManualSchema, LIMITE_REFERENCIA_ORIGEM, LIMITE_TEXTO_BRUTO } from '../modules/demandas/entrada';
import { alterarDemandaSchema, LIMITE_ITENS, LIMITE_NOME, LIMITE_REFERENCIA, LIMITE_TEXTO } from '../modules/demandas/schemas';
import {
  AVISO_DEMANDA,
  entradaDoFormulario,
  errosDaApi,
  errosLocais,
  estaSujo,
  LIMITE_ANEXOS,
  LIMITE_CAMPO,
  LIMITE_NOME_SOLICITANTE,
  LIMITE_REFERENCIA_DA_ORIGEM,
  LIMITE_REFERENCIA_DO_ANEXO,
  LIMITE_TEXTO_PEDIDO,
  mudancasDaEdicao,
  TEXTOS_DEMANDA,
  textoVazio,
  validarDemanda,
  valoresDaDemanda,
  valoresVazios,
  type ValoresDaDemanda,
} from './dados-da-demanda';

const preenchidos = (extra: Partial<ValoresDaDemanda> = {}): ValoresDaDemanda => ({
  ...valoresVazios(),
  solicitanteNome: 'Pessoa Ficticia',
  titulo: 'Pedidos duplicados no ERP',
  tipo: 'bug',
  ...extra,
});

const anexo = (n: number, referencia: string, descricao = '', tipo: 'url' | 'arquivo' = 'url') => ({ chave: `a${n}`, tipo, referencia, descricao });

describe('limites iguais aos do servidor (RNF-04, C-18)', () => {
  it('texto do pedido, campos, nome, referências e anexos', () => {
    expect(LIMITE_TEXTO_PEDIDO).toBe(LIMITE_TEXTO_BRUTO);
    expect(LIMITE_CAMPO).toBe(LIMITE_TEXTO);
    expect(LIMITE_NOME_SOLICITANTE).toBe(LIMITE_NOME);
    expect(LIMITE_REFERENCIA_DA_ORIGEM).toBe(LIMITE_REFERENCIA_ORIGEM);
    expect(LIMITE_REFERENCIA_DO_ANEXO).toBe(LIMITE_REFERENCIA);
    expect(LIMITE_ANEXOS).toBe(LIMITE_ITENS);
  });
});

describe('textos da 03, T04 e T06', () => {
  it('alertas de modo, aviso de minimização e dicas', () => {
    expect(TEXTOS_DEMANDA.desligado).toBe('Agente orquestrador desligado. Preencha os campos abaixo.');
    expect(TEXTOS_DEMANDA.suspenso).toBe('Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.');
    expect(TEXTOS_DEMANDA.avisoMinimizacao).toBe(
      'O agente recebe só o texto, sem o nome do solicitante, sem a origem e com e-mails, telefones, CPF e CNPJ trocados por marcadores. Você revisa a proposta antes de qualquer decisão.',
    );
    expect(TEXTOS_DEMANDA.dicaTexto).toBe(
      'Cole o e-mail, a mensagem ou o formulário como chegou. Este texto é dado pessoal de terceiro: fica guardado por 90 dias e depois é apagado.',
    );
    expect(TEXTOS_DEMANDA.avisoEdicao).toBe(
      'As alterações ficam no histórico, com o valor de antes e o de depois. Os pacotes de decisão já criados guardam uma cópia dos dados e não mudam.',
    );
  });

  it('sucessos e avisos do endereço', () => {
    expect(TEXTOS_DEMANDA.sucessoCriada('DEM-20261022-0042', 'Nova')).toBe('Demanda DEM-20261022-0042 criada com status Nova.');
    expect(TEXTOS_DEMANDA.sucessoEnviada).toBe(
      'Texto enviado ao agente orquestrador. A demanda aparece na fila quando ele terminar; se ele falhar, você poderá preencher à mão.',
    );
    expect(TEXTOS_DEMANDA.sucessoAlteracoes).toBe('Alterações salvas. O histórico registra o antes e o depois.');
    expect(AVISO_DEMANDA).toEqual({ criada: 'demanda-criada', enviada: 'entrada-enviada', alteracoesSalvas: 'alteracoes-salvas' });
  });
});

describe('validarDemanda: erros no envio, com os textos da 03 (T04)', () => {
  it('modo manual vazio: nome, título e tipo, na ordem da tela, com o id do campo', () => {
    const erros = validarDemanda(valoresVazios(), textoVazio(), 'manual');
    expect(erros).toEqual([
      { campo: 'solicitanteNome', idCampo: 'campo-solicitanteNome', rotulo: 'Nome do solicitante', mensagem: 'Informe o nome do solicitante.' },
      { campo: 'titulo', idCampo: 'campo-titulo', rotulo: 'Título', mensagem: 'Informe o título.' },
      // O link do resumo leva à primeira opção do grupo.
      { campo: 'tipo', idCampo: 'campo-tipo-bug', rotulo: 'Tipo', mensagem: 'Escolha o tipo.' },
    ]);
  });

  it('espaços não contam como preenchido', () => {
    const erros = validarDemanda(preenchidos({ titulo: '   ', solicitanteNome: ' ' }), textoVazio(), 'manual');
    expect(erros.map((e) => e.mensagem)).toEqual(['Informe o nome do solicitante.', 'Informe o título.']);
  });

  it('modo manual preenchido: sem erro; o texto é opcional', () => {
    expect(validarDemanda(preenchidos(), textoVazio(), 'manual')).toEqual([]);
  });

  it('modo agente: texto obrigatório, e título e tipo não são pedidos', () => {
    const erros = validarDemanda({ ...valoresVazios(), solicitanteNome: 'Pessoa Ficticia' }, textoVazio(), 'agente');
    expect(erros).toEqual([{ campo: 'texto', idCampo: 'campo-texto', rotulo: 'Texto do pedido', mensagem: 'Cole o texto do pedido para enviar ao agente.' }]);
    expect(validarDemanda({ ...valoresVazios(), solicitanteNome: 'Pessoa Ficticia' }, { ...textoVazio(), texto: '  ' }, 'agente')).toHaveLength(1);
  });

  it('texto acima de 100.000 caracteres: "O texto tem 100.001 caracteres. O limite é 100.000."', () => {
    const erros = validarDemanda(preenchidos(), { ...textoVazio(), texto: 'x'.repeat(100_001) }, 'manual');
    expect(erros).toEqual([{ campo: 'texto', idCampo: 'campo-texto', rotulo: 'Texto do pedido', mensagem: 'O texto tem 100.001 caracteres. O limite é 100.000.' }]);
    expect(validarDemanda(preenchidos(), { ...textoVazio(), texto: 'x'.repeat(100_000) }, 'manual')).toEqual([]);
  });

  it('campo livre acima de 10.000: "Este campo aceita até 10.000 caracteres."', () => {
    const erros = validarDemanda(preenchidos({ contexto: 'y'.repeat(10_001) }), textoVazio(), 'manual');
    expect(erros).toEqual([{ campo: 'contexto', idCampo: 'campo-contexto', rotulo: 'Contexto', mensagem: 'Este campo aceita até 10.000 caracteres.' }]);
  });

  it('nome e referência da origem com o limite do servidor', () => {
    const erros = validarDemanda(preenchidos({ solicitanteNome: 'n'.repeat(201) }), { ...textoVazio(), referencia: 'r'.repeat(501) }, 'manual');
    expect(erros.map((e) => [e.campo, e.mensagem])).toEqual([
      ['origem.referencia', 'Este campo aceita até 500 caracteres.'],
      ['solicitanteNome', 'Este campo aceita até 200 caracteres.'],
    ]);
  });

  it('anexos: em branco é descartado; descrição sem referência e link sem http(s) são recusados', () => {
    const v = preenchidos({ anexos: [anexo(1, '', ''), anexo(2, '', 'Planilha fictícia'), anexo(3, 'javascript:alert(1)'), anexo(4, 'contrato-ficticio.pdf', '', 'arquivo')] });
    expect(validarDemanda(v, textoVazio(), 'manual')).toEqual([
      { campo: 'anexos.1.referencia', idCampo: 'campo-anexos-1-referencia', rotulo: 'Referência do anexo 2', mensagem: 'Campo obrigatório.' },
      { campo: 'anexos.2.referencia', idCampo: 'campo-anexos-2-referencia', rotulo: 'Referência do anexo 3', mensagem: 'Use um link que comece com http:// ou https://.' },
    ]);
  });

  it('"Preencher à mão": o texto é o da entrada e não é conferido aqui', () => {
    expect(validarDemanda(preenchidos(), { ...textoVazio(), texto: 'x'.repeat(100_001) }, 'manual', { comEntradaPendente: true })).toEqual([]);
  });
});

describe('entradaDoFormulario: o que vai à Server Action', () => {
  it('modo manual: só o que foi preenchido, aparado; passa no schema da API', () => {
    const v = preenchidos({ urgencia: 'alta', justificativaUrgencia: '  Cliente parado (fictício) ', solicitantePapel: 'operacoes', contexto: '   ' });
    const { entrada, indicesAnexos } = entradaDoFormulario(v, { texto: 'Texto fictício do pedido.\n', canal: 'email', referencia: 'MSG-FICTICIA-1' }, 'manual');
    expect(entrada).toEqual({
      modo: 'manual',
      texto: 'Texto fictício do pedido.\n',
      origem: { canal: 'email', referencia: 'MSG-FICTICIA-1' },
      solicitanteNome: 'Pessoa Ficticia',
      solicitantePapel: 'operacoes',
      titulo: 'Pedidos duplicados no ERP',
      tipo: 'bug',
      urgencia: 'alta',
      justificativaUrgencia: 'Cliente parado (fictício)',
      anexos: [],
    });
    expect(indicesAnexos).toEqual([]);
    expect(entradaManualSchema.safeParse(entrada).success).toBe(true);
  });

  it('modo manual sem texto: sem texto e sem origem', () => {
    const { entrada } = entradaDoFormulario(preenchidos(), { texto: '  ', canal: '', referencia: '' }, 'manual');
    expect(entrada).not.toHaveProperty('texto');
    expect(entrada).not.toHaveProperty('origem');
  });

  it('anexos em branco saem, e o índice de cada enviado aponta para a linha da tela', () => {
    const v = preenchidos({ anexos: [anexo(1, ' '), anexo(2, 'https://exemplo.test/doc', ' Doc fictício '), anexo(3, ''), anexo(4, 'contrato.pdf', '', 'arquivo')] });
    const { entrada, indicesAnexos } = entradaDoFormulario(v, textoVazio(), 'manual');
    expect(entrada.anexos).toEqual([
      { tipo: 'url', referencia: 'https://exemplo.test/doc', descricao: 'Doc fictício' },
      { tipo: 'arquivo', referencia: 'contrato.pdf' },
    ]);
    // Sem chave com valor indefinido: o servidor compara anexos em profundidade (T15).
    expect(Object.keys((entrada.anexos as object[])[1]!)).toEqual(['tipo', 'referencia']);
    expect(indicesAnexos).toEqual([1, 3]);
  });

  it('modo agente: só texto, solicitante e origem; nada da classificação', () => {
    const v = preenchidos({ solicitantePapel: 'financeiro', contexto: 'Não vai ao agente' });
    const { entrada } = entradaDoFormulario(v, { texto: 'Texto fictício.', canal: 'mensagem', referencia: '' }, 'agente');
    expect(entrada).toEqual({ modo: 'agente', texto: 'Texto fictício.', solicitanteNome: 'Pessoa Ficticia', solicitantePapel: 'financeiro', origem: { canal: 'mensagem' } });
    expect(entradaAgenteSchema.safeParse(entrada).success).toBe(true);
  });

  it('"Preencher à mão": manda o id da entrada, e não o texto nem a origem', () => {
    const id = '0f1e2d3c-4b5a-4968-8776-655443322110';
    const { entrada } = entradaDoFormulario(preenchidos(), { texto: 'Texto da entrada (fictício)', canal: 'email', referencia: 'X' }, 'manual', id);
    expect(entrada.entradaPendenteId).toBe(id);
    expect(entrada).not.toHaveProperty('texto');
    expect(entrada).not.toHaveProperty('origem');
    expect(entradaManualSchema.safeParse(entrada).success).toBe(true);
  });
});

describe('valoresDaDemanda e mudancasDaEdicao (T06)', () => {
  const atual = {
    titulo: 'Pedidos duplicados no ERP',
    tipo: 'bug' as const,
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: 'operacoes' as const,
    linhaServicoProvavel: null,
    urgencia: 'alta' as const,
    justificativaUrgencia: null,
    contexto: 'Contexto fictício',
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [{ tipo: 'url' as const, referencia: 'https://exemplo.test/a', descricao: 'A' }, { tipo: 'arquivo' as const, referencia: 'b.pdf' }],
  };

  it('valores da demanda: nulo vira campo em branco; anexos com chave estável', () => {
    const v = valoresDaDemanda(atual);
    expect(v).toEqual({
      titulo: 'Pedidos duplicados no ERP',
      tipo: 'bug',
      solicitanteNome: 'Pessoa Ficticia',
      solicitantePapel: 'operacoes',
      linhaServicoProvavel: '',
      urgencia: 'alta',
      justificativaUrgencia: '',
      contexto: 'Contexto fictício',
      descricaoProblema: '',
      impactoPercebido: '',
      anexos: [
        { chave: 'anexo-0', tipo: 'url', referencia: 'https://exemplo.test/a', descricao: 'A' },
        { chave: 'anexo-1', tipo: 'arquivo', referencia: 'b.pdf', descricao: '' },
      ],
    });
  });

  it('sem mudança: nada vai (o servidor responde "Nada foi alterado.")', () => {
    const v = valoresDaDemanda(atual);
    expect(mudancasDaEdicao(v, { ...v, titulo: ' Pedidos duplicados no ERP ' }).mudancas).toEqual({});
  });

  it('só o que mudou; campo opcional esvaziado vai como null; passa no schema da API', () => {
    const inicial = valoresDaDemanda(atual);
    const { mudancas } = mudancasDaEdicao(inicial, { ...inicial, titulo: 'Título novo (fictício)', contexto: '  ', solicitantePapel: '', linhaServicoProvavel: 'sob_medida' });
    expect(mudancas).toEqual({ titulo: 'Título novo (fictício)', contexto: null, solicitantePapel: null, linhaServicoProvavel: 'sob_medida' });
    expect(alterarDemandaSchema.safeParse(mudancas).success).toBe(true);
  });

  it('anexos: mudou um, vai a lista inteira sem os em branco', () => {
    const inicial = valoresDaDemanda(atual);
    const anexos = [inicial.anexos[0]!, anexo(9, ''), { ...inicial.anexos[1]!, descricao: 'B' }];
    const { mudancas, indicesAnexos } = mudancasDaEdicao(inicial, { ...inicial, anexos });
    expect(mudancas).toEqual({
      anexos: [
        { tipo: 'url', referencia: 'https://exemplo.test/a', descricao: 'A' },
        { tipo: 'arquivo', referencia: 'b.pdf', descricao: 'B' },
      ],
    });
    expect(indicesAnexos).toEqual([0, 2]);
  });

  it('estaSujo: compara o que a pessoa vê, sem as chaves internas dos anexos', () => {
    const inicial = valoresDaDemanda(atual);
    expect(estaSujo(inicial, textoVazio(), { ...inicial, anexos: inicial.anexos.map((a) => ({ ...a, chave: `outra-${a.chave}` })) }, textoVazio())).toBe(false);
    expect(estaSujo(inicial, textoVazio(), { ...inicial, titulo: 'x' }, textoVazio())).toBe(true);
    expect(estaSujo(valoresVazios(), textoVazio(), valoresVazios(), { ...textoVazio(), texto: 'a' })).toBe(true);
  });
});

describe('errosDaApi: erros do servidor no mesmo resumo, com os textos da 03', () => {
  const invalida = (campos: { campo: string; mensagem: string }[]) => ({ ok: false as const, erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.', campos });

  it('obrigatórios do servidor viram as mensagens da 03', () => {
    const e = errosDaApi(
      invalida([
        { campo: 'solicitanteNome', mensagem: 'Campo obrigatório.' },
        { campo: 'titulo', mensagem: 'Campo obrigatório.' },
        { campo: 'tipo', mensagem: 'Valor inválido.' },
        { campo: 'contexto', mensagem: 'Este campo aceita até 10.000 caracteres.' },
      ]),
      { modo: 'manual', tamanhoTexto: 0, indicesAnexos: [] },
    );
    expect(e.campos.map((c) => [c.campo, c.idCampo, c.mensagem])).toEqual([
      ['solicitanteNome', 'campo-solicitanteNome', 'Informe o nome do solicitante.'],
      ['titulo', 'campo-titulo', 'Informe o título.'],
      ['tipo', 'campo-tipo-bug', 'Escolha o tipo.'],
      ['contexto', 'campo-contexto', 'Este campo aceita até 10.000 caracteres.'],
    ]);
    expect(e.porCampo.titulo).toBe('Informe o título.');
    expect(e.alerta).toBeNull();
  });

  it('texto: limite com o tamanho digitado; vazio no modo agente', () => {
    expect(errosDaApi(invalida([{ campo: 'texto', mensagem: 'Este campo aceita até 100.000 caracteres.' }]), { modo: 'manual', tamanhoTexto: 100_512, indicesAnexos: [] }).campos[0]!.mensagem).toBe(
      'O texto tem 100.512 caracteres. O limite é 100.000.',
    );
    expect(errosDaApi(invalida([{ campo: 'texto', mensagem: 'Campo obrigatório.' }]), { modo: 'agente', tamanhoTexto: 0, indicesAnexos: [] }).campos[0]!.mensagem).toBe(
      'Cole o texto do pedido para enviar ao agente.',
    );
  });

  it('anexo: o índice enviado volta para a linha da tela', () => {
    const e = errosDaApi(invalida([{ campo: 'anexos.0.referencia', mensagem: 'Use um link que comece com http:// ou https://.' }]), {
      modo: 'manual',
      tamanhoTexto: 0,
      indicesAnexos: [2],
    });
    expect(e.campos).toEqual([
      { campo: 'anexos.2.referencia', idCampo: 'campo-anexos-2-referencia', rotulo: 'Referência do anexo 3', mensagem: 'Use um link que comece com http:// ou https://.' },
    ]);
    expect(e.porCampo['anexos.2.referencia']).toBe('Use um link que comece com http:// ou https://.');
  });

  it('lista de anexos acima do limite: "Limite de 50 anexos atingido."', () => {
    const e = errosDaApi(invalida([{ campo: 'anexos', mensagem: 'Limite de 50 itens atingido.' }]), { modo: 'manual', tamanhoTexto: 0, indicesAnexos: [] });
    expect(e.campos[0]).toEqual({ campo: 'anexos', idCampo: 'adicionar-anexo', rotulo: 'Anexos (referências)', mensagem: 'Limite de 50 anexos atingido.' });
  });

  it('o resto vira alerta: conflito com prefixo, "Nada foi alterado.", erro interno com o texto da 2.8', () => {
    const ctx = { modo: 'manual' as const, tamanhoTexto: 0, indicesAnexos: [] };
    expect(errosDaApi({ ok: false, erro: 'conflito', mensagem: 'Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.' }, ctx).alerta).toBe(
      'Não foi possível concluir: Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.',
    );
    expect(errosDaApi({ ok: false, erro: 'entrada_invalida', mensagem: 'Nada foi alterado.' }, ctx)).toEqual({ campos: [], porCampo: {}, alerta: 'Nada foi alterado.', detalhes: [] });
    expect(errosDaApi({ ok: false, erro: 'erro_interno', mensagem: 'SENTINELA-detalhe-interno' }, ctx).alerta).toBe(MENSAGEM_ERRO_INTERNO);
  });

  it('errosLocais monta o mesmo formato a partir da validação do cliente', () => {
    const campos = validarDemanda(valoresVazios(), textoVazio(), 'manual');
    const e = errosLocais(campos);
    expect(e.campos).toBe(campos);
    expect(e.porCampo).toEqual({ solicitanteNome: 'Informe o nome do solicitante.', titulo: 'Informe o título.', tipo: 'Escolha o tipo.' });
    expect(e.alerta).toBeNull();
  });
});
