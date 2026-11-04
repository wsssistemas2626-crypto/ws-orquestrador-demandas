// M-2 (DEC-DEM-20261103-0008-v1): nas sete rotas de leitura de ESP, RSK e DEC, quem não é pessoa não recebe nome de
// pessoa (autor, aprovadores, decididaPor) nem referenciaDocumento; a autoria de pessoa vira só o tipo, a de agente fica
// igual. A pessoa lê tudo como antes. Banco, Better Auth e tokens reais (Testcontainers); dados só fictícios (01 do 0008).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import type { HandlerRota } from '../../lib/rota';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../../modules/acesso/ator';
import { criarTokenServico } from '../../modules/acesso/tokens-servico';
import { criarDemandaSchema } from '../../modules/demandas/schemas';
import { criarDemanda } from '../../modules/demandas/servico';
import { vistaDaEspecificacaoPara } from '../../modules/especificacoes/consultas';
import { criarEspecificacaoSchema } from '../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../modules/especificacoes/servico';
import { vistaDoPacotePara } from '../../modules/pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../modules/pacotes-decisao/schemas';
import { vistaDoParecerPara } from '../../modules/pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../modules/pareceres-risco/servico';
import { GET as GET_ESPS, POST as POST_ESP } from './demandas/[id]/especificacoes/route';
import { GET as GET_DECS, POST as POST_DEC } from './demandas/[id]/pacotes-decisao/route';
import { GET as GET_RSKS, POST as POST_RSK } from './demandas/[id]/pareceres-risco/route';
import { GET as GET_ESP } from './especificacoes/[espId]/route';
import { GET as GET_DEC } from './pacotes-decisao/[decId]/route';
import { GET as GET_FILA } from './pacotes-decisao/route';
import { GET as GET_RSK } from './pareceres-risco/[rskId]/route';

const CONTA = 'Carlos Exemplo CTO';
const APROVADORA = 'Joana Exemplo Silva';
const REFERENCIA = 'ATA-FICTICIA-001';
const PROIBIDOS = [CONTA, APROVADORA, REFERENCIA];

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let tokenRisco: string;
let pessoa: AtorPessoa;
type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
type Obj = Record<string, unknown>;

const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: null };

const ESP = criarEspecificacaoSchema.parse({
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação'],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Critério fictício'],
  definicaoDePronto: ['pnpm test verde'],
});
const RSK = criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
const DEC = criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'A' }, opcaoB: { descricao: 'B' }, nivelAprovacaoRequerido: 'cto' });

type Cenario = { id: string; espId: string; rskId: string; decId: string; decSemDecisao: string | null };
let dePessoa: Cenario;
let deAgente: Cenario;

async function lerTexto(handler: HandlerRota, caminho: string, params: Record<string, string>, cred: Credencial) {
  const r = await chamarRota(handler, { caminho, params, ...cred });
  expect(r.status, caminho).toBe(200);
  return r.text();
}

// As sete leituras, cada uma com o corpo em texto (para a busca dos nomes) e as vistas de ESP, RSK e DEC encontradas.
async function lerTudo(c: Cenario, cred: Credencial) {
  const textos: string[] = [];
  const ler = async (h: HandlerRota, caminho: string, params: Record<string, string> = {}) => {
    const t = await lerTexto(h, caminho, params, cred);
    textos.push(t);
    return JSON.parse(t) as Obj;
  };
  const esp = await ler(GET_ESP, `/api/especificacoes/${c.espId}`, { espId: c.espId });
  const esps = ((await ler(GET_ESPS, `/api/demandas/${c.id}/especificacoes`, { id: c.id })).itens as Obj[]);
  const rsk = await ler(GET_RSK, `/api/pareceres-risco/${c.rskId}`, { rskId: c.rskId });
  const rsks = ((await ler(GET_RSKS, `/api/demandas/${c.id}/pareceres-risco`, { id: c.id })).itens as Obj[]);
  const dec = await ler(GET_DEC, `/api/pacotes-decisao/${c.decId}`, { decId: c.decId });
  const decs = ((await ler(GET_DECS, `/api/demandas/${c.id}/pacotes-decisao`, { id: c.id })).itens as Obj[]);
  const fila = ((await ler(GET_FILA, '/api/pacotes-decisao?limit=100')).itens as Obj[]).filter((i) => i.demandaId === c.id);
  return { texto: textos.join('\n'), esp, esps, rsk, rsks, dec, decs, fila };
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  await b.poolMigrator.query('update "user" set name = $2 where id = $1', [p.usuarioId, CONTA]);
  pessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: CONTA, papel: 'cto' };
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;

  // Autoria pessoa: ESP, RSK e dois DEC; o v1 com aprovação da administradora e decisão, o v2 sem nenhuma.
  const id1 = (await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Maria Ficticia Teste' }))).id;
  const esp1 = await criarEspecificacao(deps, pessoa, id1, ESP);
  const rsk1 = await criarParecerRisco(deps, pessoa, id1, RSK);
  const dec1 = await criarPacoteDecisao(deps, pessoa, id1, DEC);
  const dec2 = await criarPacoteDecisao(deps, pessoa, id1, DEC);
  await b.poolMigrator.query(
    `insert into aprovacao (pacote_decisao_id, papel_aprovacao, nome_aprovador, registrada_por, opcao, referencia_documento, data_documento, registrada_em)
     values ($1, 'administradora', $2, $3, 'A', $4, '2026-11-03', now())`,
    [dec1.id, APROVADORA, p.usuarioId, REFERENCIA],
  );
  await b.poolMigrator.query(
    `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, decidida_por, decidida_em) values ($1, 'aprovada', 'A', $2, now())`,
    [dec1.id, p.usuarioId],
  );
  dePessoa = { id: id1, espId: esp1.id, rskId: rsk1.id, decId: dec1.id, decSemDecisao: dec2.id };

  // Autoria agente: ESP do insumo técnico, RSK do risco e DEC da consolidação.
  const id2 = (await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: 'Relatório lento', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }))).id;
  const esp2 = await criarEspecificacao(deps, insumo, id2, ESP);
  const rsk2 = await criarParecerRisco(deps, risco, id2, RSK);
  const dec3 = await criarPacoteDecisao(deps, consolidacao, id2, DEC);
  deAgente = { id: id2, espId: esp2.id, rskId: rsk2.id, decId: dec3.id, decSemDecisao: null };
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('M-2: leituras de ESP, RSK e DEC para quem não é pessoa', () => {
  it('agente, autoria pessoa: autor só { tipo: pessoa }, aprovadores sem nome e referenciaDocumento, decisão sem decididaPor', async () => {
    const r = await lerTudo(dePessoa, { bearer: tokenRisco });
    for (const v of [r.esp, ...r.esps, r.rsk, ...r.rsks, r.dec, ...r.decs, ...r.fila]) expect(v.autor, String(v.id)).toEqual({ tipo: 'pessoa' });
    const decsV1 = [r.dec, ...r.decs, ...r.fila].filter((d) => d.id === dePessoa.decId);
    expect(decsV1).toHaveLength(3);
    for (const d of decsV1) {
      const aprovadores = d.aprovadores as Obj[];
      expect(aprovadores).toHaveLength(1);
      expect(Object.keys(aprovadores[0]!).sort()).toEqual(['dataDocumento', 'opcao', 'papel', 'registradaEm']);
      expect(aprovadores[0]).toMatchObject({ papel: 'administradora', opcao: 'A', dataDocumento: '2026-11-03' });
      const decisao = d.decisao as Obj;
      expect(Object.keys(decisao)).not.toContain('decididaPor');
      expect(decisao).toMatchObject({ opcaoEscolhida: 'A' });
      expect(d.statusDecisao).toBe('aprovada');
    }
    for (const nome of PROIBIDOS) expect(r.texto).not.toContain(nome);
    // O que a leitura precisa continua lá.
    expect(r.esp).toMatchObject({ id: dePessoa.espId, descricaoObjetiva: 'Corrigir pedidos duplicados', versaoMaisNova: dePessoa.espId });
    expect(r.rsk).toMatchObject({ id: dePessoa.rskId, riscoTecnicoNivel: 'baixo', versaoMaisNova: dePessoa.rskId, especificacaoMaisNova: dePessoa.espId });
  });

  it('agente: DEC sem decisão e sem aprovadores sai com decisao null e aprovadores []', async () => {
    const r = await lerTudo(dePessoa, { bearer: tokenRisco });
    const v2 = [...r.decs, ...r.fila].filter((d) => d.id === dePessoa.decSemDecisao);
    expect(v2).toHaveLength(2);
    for (const d of v2) expect(d).toMatchObject({ decisao: null, aprovadores: [], statusDecisao: 'pendente', autor: { tipo: 'pessoa' } });
  });

  it('agente, autoria agente: autor { tipo: agente, agente } como antes', async () => {
    const r = await lerTudo(deAgente, { bearer: tokenRisco });
    for (const v of [r.esp, ...r.esps]) expect(v.autor).toEqual({ tipo: 'agente', agente: 'insumo_tecnico' });
    for (const v of [r.rsk, ...r.rsks]) expect(v.autor).toEqual({ tipo: 'agente', agente: 'risco' });
    for (const v of [r.dec, ...r.decs, ...r.fila]) expect(v.autor).toEqual({ tipo: 'agente', agente: 'consolidacao' });
  });

  it('pessoa: tudo como antes, com o nome do autor, do aprovador, a referência e decididaPor', async () => {
    const r = await lerTudo(dePessoa, { cookie });
    for (const v of [r.esp, ...r.esps, r.rsk, ...r.rsks, r.dec, ...r.decs, ...r.fila]) expect(v.autor).toEqual({ tipo: 'pessoa', nome: CONTA });
    for (const d of [r.dec, ...r.decs, ...r.fila].filter((x) => x.id === dePessoa.decId)) {
      expect(d.aprovadores).toEqual([
        { papel: 'administradora', nome: APROVADORA, opcao: 'A', registradaEm: expect.any(String), referenciaDocumento: REFERENCIA, dataDocumento: '2026-11-03' },
      ]);
      expect(d.decisao).toMatchObject({ opcaoEscolhida: 'A', decididaPor: CONTA });
    }
  });
});

// 04-regressao do 0008 (qa-automacao): a vista do agente é exatamente a da pessoa com os três cortes do M-2 (autor de
// pessoa só pelo tipo, aprovador sem nome e referenciaDocumento, decisão sem decididaPor). Nenhuma outra chave some,
// nenhuma sobra e nenhum valor muda: a montagem chave a chave não pode perder campo que o agente lia na 0.1.6.
// A expectativa é montada aqui, no teste, a partir da leitura da pessoa.
function comOsCortesDoM2(v: Obj): Obj {
  const r: Obj = { ...v };
  if ((v.autor as Obj).tipo === 'pessoa') r.autor = { tipo: 'pessoa' };
  if (Array.isArray(v.aprovadores)) {
    r.aprovadores = (v.aprovadores as Obj[]).map((a) => {
      const copia = { ...a };
      delete copia.nome;
      delete copia.referenciaDocumento;
      return copia;
    });
  }
  if (v.decisao) {
    const decisao = { ...(v.decisao as Obj) };
    delete decisao.decididaPor;
    r.decisao = decisao;
  }
  return r;
}

describe('M-2 (04-regressao): o agente recebe a vista da pessoa só com os cortes, nada a mais nem a menos', () => {
  for (const [nome, cenario] of [
    ['autoria pessoa', () => dePessoa],
    ['autoria agente', () => deAgente],
  ] as const) {
    it(`${nome}: nas sete rotas, leitura do agente = leitura da pessoa com os cortes do M-2`, async () => {
      const c = cenario();
      const daPessoa = await lerTudo(c, { cookie });
      const doAgente = await lerTudo(c, { bearer: tokenRisco });
      for (const chave of ['esp', 'rsk', 'dec'] as const) expect(doAgente[chave], chave).toEqual(comOsCortesDoM2(daPessoa[chave]));
      for (const chave of ['esps', 'rsks', 'decs'] as const) expect(doAgente[chave].length, chave).toBeGreaterThan(0);
      for (const chave of ['esps', 'rsks', 'decs', 'fila'] as const) expect(doAgente[chave], chave).toEqual(daPessoa[chave].map(comOsCortesDoM2));
    });
  }

  it('lista de permissão: o ator sistema recebe a mesma vista mínima do agente nas três funções', async () => {
    const daPessoa = await lerTudo(dePessoa, { cookie });
    const doAgente = await lerTudo(dePessoa, { bearer: tokenRisco });
    const sistema: AtorSistema = { tipo: 'sistema' };
    expect(vistaDaEspecificacaoPara(sistema, daPessoa.esp as never, NOMES_DE_PESSOA)).toEqual(doAgente.esp);
    expect(vistaDoParecerPara(sistema, daPessoa.rsk as never, NOMES_DE_PESSOA)).toEqual(doAgente.rsk);
    expect(vistaDoPacotePara(sistema, daPessoa.dec as never, NOMES_DE_PESSOA)).toEqual(doAgente.dec);
    for (const v of [vistaDaEspecificacaoPara(sistema, daPessoa.esp as never, NOMES_DE_PESSOA), vistaDoPacotePara(sistema, daPessoa.dec as never, NOMES_DE_PESSOA)]) {
      for (const proibido of PROIBIDOS) expect(JSON.stringify(v)).not.toContain(proibido);
    }
  });

  it('conta de autor e de quem decidiu sem nome (nulo): o agente segue com { tipo: pessoa } e sem decididaPor', async () => {
    const daPessoa = await lerTudo(dePessoa, { cookie });
    const semConta = { ...daPessoa.dec, autor: { tipo: 'pessoa', nome: null }, decisao: { ...(daPessoa.dec.decisao as Obj), decididaPor: null } };
    const v = vistaDoPacotePara(risco, semConta as never, NOMES_DE_PESSOA) as unknown as Obj;
    expect(v.autor).toEqual({ tipo: 'pessoa' });
    expect(Object.keys(v.decisao as Obj)).not.toContain('decididaPor');
    expect(v).toEqual(comOsCortesDoM2(semConta));
    const esp = vistaDaEspecificacaoPara(risco, { ...daPessoa.esp, autor: { tipo: 'pessoa', nome: null } } as never, NOMES_DE_PESSOA) as unknown as Obj;
    expect(esp.autor).toEqual({ tipo: 'pessoa' });
    const rsk = vistaDoParecerPara(risco, { ...daPessoa.rsk, autor: { tipo: 'pessoa', nome: null } } as never, NOMES_DE_PESSOA) as unknown as Obj;
    expect(rsk.autor).toEqual({ tipo: 'pessoa' });
  });

  it('a pessoa recebe a própria vista, sem cópia nem corte, nas três funções', async () => {
    const daPessoa = await lerTudo(dePessoa, { cookie });
    expect(vistaDaEspecificacaoPara(pessoa, daPessoa.esp as never, NOMES_DE_PESSOA)).toBe(daPessoa.esp);
    expect(vistaDoParecerPara(pessoa, daPessoa.rsk as never, NOMES_DE_PESSOA)).toBe(daPessoa.rsk);
    expect(vistaDoPacotePara(pessoa, daPessoa.dec as never, NOMES_DE_PESSOA)).toBe(daPessoa.dec);
  });
});

// M-a (DEC-DEM-20261103-0009-v1, RF-20): o texto livre de ESP, RSK e DEC (e o comentário da decisão) chega ao agente
// pelo mesmo `minimizarValor` da entrada do agente, com o nome do solicitante da própria demanda, nas sete leituras e no
// 201 dos três POST. A pessoa lê o original. Ids, sistema alvo, repositório, níveis e status não mudam. Dados fictícios
// da 01 do 0009.
const SOLICITANTE = 'Joana Fictícia Teste';
const EMAIL = 'joana.ficticia@exemplo.invalid';
const CPF = '000.000.001-91';
const TELEFONE = '(11) 90000-0001';
// B-2 da revisão de segurança (04-regressao do 0009): CNPJ fictício, que o `minimizar` também troca.
const CNPJ = '00.000.000/0001-91';
const FRAGMENTOS = [SOLICITANTE, EMAIL, CPF, CNPJ, TELEFONE];
const TRECHO = `Falar com ${SOLICITANTE}: contato ${EMAIL}, CPF ${CPF}, CNPJ ${CNPJ}, telefone ${TELEFONE}`;
const TRECHO_MINIMO = 'Falar com [nome removido]: contato [e-mail removido], CPF [CPF removido], CNPJ [CNPJ removido], telefone [telefone removido]';

const ESP_COM_DADO = {
  descricaoObjetiva: TRECHO,
  situacaoAtual: TRECHO,
  situacaoDesejada: TRECHO,
  escopoInclui: [TRECHO],
  escopoExclui: [TRECHO],
  sistemasErp: TRECHO,
  sistemasEcommerceMarketplace: TRECHO,
  sistemasApisTerceiros: TRECHO,
  sistemasServicosInternos: TRECHO,
  dadosEntidades: TRECHO,
  dadosCamposCriticos: TRECHO,
  restricoesTecnicas: TRECHO,
  duvidasEmAberto: [TRECHO],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: [TRECHO],
  definicaoDePronto: [TRECHO],
};
const RSK_COM_DADO = {
  resumo: TRECHO,
  riscoTecnicoNivel: 'medio',
  riscoTecnicoComentario: TRECHO,
  riscoOperacionalNivel: 'alto',
  riscoOperacionalComentario: TRECHO,
  riscoJuridicoNivel: 'baixo',
  riscoJuridicoComentario: TRECHO,
  recomendacoesMitigacao: [TRECHO],
  preCondicoes: [TRECHO],
  envolverJuridicoOuAdministradoraQuando: TRECHO,
};
// opcaoA com quandoEscolher e sem desvantagens; opcaoB sem vantagens e quandoEscolher: os subcampos presentes saem
// minimizados e as chaves ausentes seguem ausentes (B-2 da revisão de segurança do 0009: quandoEscolher com o dado).
const OPCAO_A_MINIMA = { descricao: TRECHO_MINIMO, vantagens: TRECHO_MINIMO, quandoEscolher: TRECHO_MINIMO };
const DEC_COM_DADO = {
  resumoExecutivo: TRECHO,
  opcaoA: { descricao: TRECHO, vantagens: TRECHO, quandoEscolher: TRECHO },
  opcaoB: { descricao: TRECHO, desvantagens: TRECHO },
  recomendacao: TRECHO,
  nivelAprovacaoRequerido: 'cto',
};

// Nomes do solicitante da demanda `dePessoa` do M-2: não aparecem em nenhum texto dela.
const NOMES_DE_PESSOA = ['Maria Ficticia Teste'];

let comDado: Cenario;
let estudo: Cenario;
let tokenInsumo: string;
let tokenConsolidacao: string;

// Os campos que não são texto livre e precisam sair iguais para os dois atores.
const fixosDaEsp = (v: Obj) => ({ id: v.id, demandaId: v.demandaId, versao: v.versao, sistemaAlvo: v.sistemaAlvo, repositorioDestino: v.repositorioDestino, versaoMaisNova: v.versaoMaisNova, rascunhoAgente: v.rascunhoAgente, criadaEm: v.criadaEm });
const fixosDoRsk = (v: Obj) => ({
  id: v.id,
  demandaId: v.demandaId,
  versao: v.versao,
  riscoTecnicoNivel: v.riscoTecnicoNivel,
  riscoOperacionalNivel: v.riscoOperacionalNivel,
  riscoJuridicoNivel: v.riscoJuridicoNivel,
  versaoMaisNova: v.versaoMaisNova,
  especificacaoMaisNova: v.especificacaoMaisNova,
  criadaEm: v.criadaEm,
});
const fixosDoDec = (v: Obj) => ({
  id: v.id,
  demandaId: v.demandaId,
  versao: v.versao,
  especificacaoId: v.especificacaoId,
  parecerRiscoId: v.parecerRiscoId,
  demandaTipo: v.demandaTipo,
  nivelAprovacaoRequerido: v.nivelAprovacaoRequerido,
  statusDecisao: v.statusDecisao,
  desatualizado: v.desatualizado,
  rascunhosCitados: v.rascunhosCitados,
  niveisRisco: v.niveisRisco,
  sistemaAlvo: (v.especificacaoCitada as Obj).sistemaAlvo,
  repositorioDestino: (v.especificacaoCitada as Obj).repositorioDestino,
  opcaoEscolhida: v.decisao === null ? null : (v.decisao as Obj).opcaoEscolhida,
});

describe('M-a: texto livre de ESP, RSK e DEC minimizado para quem não é pessoa', () => {
  beforeAll(async () => {
    tokenInsumo = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', deps.relogio))).token;
    tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;

    const id = (
      await criarDemanda(
        deps,
        pessoa,
        criarDemandaSchema.parse({ titulo: `Erro no cadastro da ${SOLICITANTE}`, tipo: 'bug', solicitanteNome: SOLICITANTE, contexto: TRECHO, descricaoProblema: TRECHO }),
      )
    ).id;
    const esp = await criarEspecificacao(deps, pessoa, id, criarEspecificacaoSchema.parse(ESP_COM_DADO));
    const rsk = await criarParecerRisco(deps, pessoa, id, criarParecerRiscoSchema.parse(RSK_COM_DADO));
    const dec = await criarPacoteDecisao(deps, pessoa, id, criarPacoteDecisaoSchema.parse(DEC_COM_DADO));
    await b.poolMigrator.query(
      `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, comentarios, decidida_por, decidida_em) values ($1, 'aprovada', 'B', $2, $3, now())`,
      [dec.id, TRECHO, pessoa.usuarioId],
    );
    comDado = { id, espId: esp.id, rskId: rsk.id, decId: dec.id, decSemDecisao: null };

    // Estudo: ESP sem os campos de construção (listas nulas), DEC sem recomendação e sem decisão.
    const idEstudo = (await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: 'Estudo fictício', tipo: 'estudo', solicitanteNome: SOLICITANTE }))).id;
    const espEstudo = await criarEspecificacao(deps, pessoa, idEstudo, criarEspecificacaoSchema.parse({ descricaoObjetiva: TRECHO, escopoInclui: [TRECHO] }));
    const rskEstudo = await criarParecerRisco(deps, pessoa, idEstudo, RSK);
    const decEstudo = await criarPacoteDecisao(deps, pessoa, idEstudo, criarPacoteDecisaoSchema.parse({ ...DEC_COM_DADO, recomendacao: undefined }));
    estudo = { id: idEstudo, espId: espEstudo.id, rskId: rskEstudo.id, decId: decEstudo.id, decSemDecisao: decEstudo.id };
  });

  it('agente: nenhum dos quatro fragmentos sai em nenhuma das sete leituras; o texto vem com os marcadores', async () => {
    const r = await lerTudo(comDado, { bearer: tokenRisco });
    for (const f of FRAGMENTOS) expect(r.texto, f).not.toContain(f);
    for (const esp of [r.esp, ...r.esps]) {
      for (const campo of ['descricaoObjetiva', 'situacaoAtual', 'situacaoDesejada', 'sistemasErp', 'sistemasEcommerceMarketplace', 'sistemasApisTerceiros', 'sistemasServicosInternos', 'dadosEntidades', 'dadosCamposCriticos', 'restricoesTecnicas']) {
        expect(esp[campo], campo).toBe(TRECHO_MINIMO);
      }
      for (const campo of ['escopoInclui', 'escopoExclui', 'duvidasEmAberto', 'criteriosAceitePreliminares', 'definicaoDePronto']) expect(esp[campo], campo).toEqual([TRECHO_MINIMO]);
    }
    for (const rsk of [r.rsk, ...r.rsks]) {
      for (const campo of ['resumo', 'riscoTecnicoComentario', 'riscoOperacionalComentario', 'riscoJuridicoComentario', 'envolverJuridicoOuAdministradoraQuando']) expect(rsk[campo], campo).toBe(TRECHO_MINIMO);
      for (const campo of ['recomendacoesMitigacao', 'preCondicoes']) expect(rsk[campo], campo).toEqual([TRECHO_MINIMO]);
    }
    const decs = [r.dec, ...r.decs, ...r.fila];
    expect(decs).toHaveLength(3);
    for (const dec of decs) {
      expect(dec.demandaTitulo).toBe('Erro no cadastro da [nome removido]');
      expect(dec.demandaDescricao).toBe(`Contexto: ${TRECHO_MINIMO}\n\nProblema: ${TRECHO_MINIMO}`);
      expect(dec.resumoExecutivo).toBe(TRECHO_MINIMO);
      expect(dec.recomendacao).toBe(TRECHO_MINIMO);
      expect(dec.opcaoA).toEqual(OPCAO_A_MINIMA);
      expect(dec.opcaoB).toEqual({ descricao: TRECHO_MINIMO, desvantagens: TRECHO_MINIMO });
      expect(dec.decisao).toMatchObject({ opcaoEscolhida: 'B', comentarios: TRECHO_MINIMO });
      expect(dec.especificacaoCitada).toEqual({
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: [TRECHO_MINIMO],
        definicaoDePronto: [TRECHO_MINIMO],
      });
    }
  });

  it('pessoa: o texto sai original nas sete leituras', async () => {
    const r = await lerTudo(comDado, { cookie });
    for (const esp of [r.esp, ...r.esps]) expect(esp).toMatchObject(ESP_COM_DADO);
    for (const rsk of [r.rsk, ...r.rsks]) expect(rsk).toMatchObject(RSK_COM_DADO);
    for (const dec of [r.dec, ...r.decs, ...r.fila]) {
      expect(dec).toMatchObject({ demandaTitulo: `Erro no cadastro da ${SOLICITANTE}`, resumoExecutivo: TRECHO, recomendacao: TRECHO, opcaoA: DEC_COM_DADO.opcaoA, opcaoB: DEC_COM_DADO.opcaoB });
      expect((dec.decisao as Obj).comentarios).toBe(TRECHO);
      expect((dec.especificacaoCitada as Obj).criteriosAceitePreliminares).toEqual([TRECHO]);
    }
  });

  it('ids, sistema alvo, repositório, níveis, status e nível de aprovação saem iguais para os dois atores', async () => {
    for (const c of [comDado, estudo]) {
      const daPessoa = await lerTudo(c, { cookie });
      const doAgente = await lerTudo(c, { bearer: tokenRisco });
      expect([doAgente.esp, ...doAgente.esps].map(fixosDaEsp)).toEqual([daPessoa.esp, ...daPessoa.esps].map(fixosDaEsp));
      expect([doAgente.rsk, ...doAgente.rsks].map(fixosDoRsk)).toEqual([daPessoa.rsk, ...daPessoa.rsks].map(fixosDoRsk));
      expect([doAgente.dec, ...doAgente.decs, ...doAgente.fila].map(fixosDoDec)).toEqual([daPessoa.dec, ...daPessoa.decs, ...daPessoa.fila].map(fixosDoDec));
      expect(doAgente.dec.nivelAprovacaoRequerido).toBe('cto');
    }
  });

  it('agente: lista nula segue nula, opcional ausente segue ausente, recomendação e decisão nulas seguem nulas', async () => {
    const r = await lerTudo(estudo, { bearer: tokenRisco });
    for (const f of FRAGMENTOS) expect(r.texto, f).not.toContain(f);
    for (const esp of [r.esp, ...r.esps]) {
      expect(esp).toMatchObject({ criteriosAceitePreliminares: null, definicaoDePronto: null, situacaoAtual: null, sistemaAlvo: null, repositorioDestino: null, escopoExclui: [], duvidasEmAberto: [] });
    }
    for (const dec of [r.dec, ...r.decs, ...r.fila]) {
      expect(dec).toMatchObject({ recomendacao: null, decisao: null, especificacaoCitada: { sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: null } });
      expect(Object.keys(dec.opcaoA as Obj).sort()).toEqual(['descricao', 'quandoEscolher', 'vantagens']);
      expect(Object.keys(dec.opcaoB as Obj).sort()).toEqual(['descricao', 'desvantagens']);
    }
    for (const rsk of [r.rsk, ...r.rsks]) expect(rsk).toMatchObject({ resumo: null, riscoTecnicoComentario: null, recomendacoesMitigacao: [], preCondicoes: [] });
  });

  it('POST de ESP, RSK e DEC: o 201 do agente vem minimizado; o da pessoa, original', async () => {
    // 04-regressao do 0009 (qa-automacao): demanda própria, com o mesmo dado fictício de `comDado`. As versões criadas
    // aqui não entram nas leituras de `comDado` dos outros testes (que contam 3 DEC), e a ordem dos testes não importa.
    const idPost = (
      await criarDemanda(
        deps,
        pessoa,
        criarDemandaSchema.parse({ titulo: `Erro no cadastro da ${SOLICITANTE}`, tipo: 'bug', solicitanteNome: SOLICITANTE, contexto: TRECHO, descricaoProblema: TRECHO }),
      )
    ).id;
    const criar = (h: HandlerRota, recurso: string, corpo: unknown, cred: Credencial) =>
      chamarRota(h, { metodo: 'POST', caminho: `/api/demandas/${idPost}/${recurso}`, params: { id: idPost }, corpo, ...cred });
    const doAgente = [
      await criar(POST_ESP, 'especificacoes', ESP_COM_DADO, { bearer: tokenInsumo }),
      await criar(POST_RSK, 'pareceres-risco', RSK_COM_DADO, { bearer: tokenRisco }),
      await criar(POST_DEC, 'pacotes-decisao', DEC_COM_DADO, { bearer: tokenConsolidacao }),
    ];
    const [esp, rsk, dec] = await Promise.all(
      doAgente.map(async (resp) => {
        expect(resp.status).toBe(201);
        const texto = await resp.text();
        for (const f of FRAGMENTOS) expect(texto, f).not.toContain(f);
        return JSON.parse(texto) as Obj;
      }),
    );
    expect(esp).toMatchObject({ descricaoObjetiva: TRECHO_MINIMO, escopoInclui: [TRECHO_MINIMO], sistemaAlvo: 'meu-sistema', autor: { tipo: 'agente', agente: 'insumo_tecnico' } });
    expect(rsk).toMatchObject({ resumo: TRECHO_MINIMO, preCondicoes: [TRECHO_MINIMO], riscoOperacionalNivel: 'alto', autor: { tipo: 'agente', agente: 'risco' } });
    expect(dec).toMatchObject({ demandaTitulo: 'Erro no cadastro da [nome removido]', resumoExecutivo: TRECHO_MINIMO, opcaoA: OPCAO_A_MINIMA, nivelAprovacaoRequerido: 'cto_e_administradora' });
    expect(Object.keys((dec as Obj).opcaoA as Obj).sort()).toEqual(['descricao', 'quandoEscolher', 'vantagens']);
    expect(Object.keys((dec as Obj).opcaoB as Obj).sort()).toEqual(['descricao', 'desvantagens']);

    const daPessoa = [
      await criar(POST_ESP, 'especificacoes', ESP_COM_DADO, { cookie }),
      await criar(POST_RSK, 'pareceres-risco', RSK_COM_DADO, { cookie }),
      await criar(POST_DEC, 'pacotes-decisao', DEC_COM_DADO, { cookie }),
    ];
    for (const resp of daPessoa) expect(resp.status).toBe(201);
    const [espP, rskP, decP] = (await Promise.all(daPessoa.map((resp) => resp.json()))) as Obj[];
    expect(espP).toMatchObject({ ...ESP_COM_DADO, autor: { tipo: 'pessoa', nome: CONTA } });
    expect(rskP).toMatchObject({ ...RSK_COM_DADO, autor: { tipo: 'pessoa', nome: CONTA } });
    expect(decP).toMatchObject({ demandaTitulo: `Erro no cadastro da ${SOLICITANTE}`, resumoExecutivo: TRECHO, opcaoA: DEC_COM_DADO.opcaoA, opcaoB: DEC_COM_DADO.opcaoB });
  });

  // 04-regressao do 0009 (qa-automacao): GET /api/pacotes-decisao cruza demandas e monta os nomes por demandaId numa
  // consulta só. Duas demandas com solicitantes diferentes (fictícios), cada DEC citando o próprio: no agente, cada item
  // sai com o nome da própria demanda trocado; na pessoa, os dois originais.
  it('fila: cada DEC é minimizado com o nome do solicitante da própria demanda', async () => {
    const nomes = ['Bruno Ficticio Exemplo', 'Carla Ficticia Exemplo'];
    const decIds: string[] = [];
    for (const nome of nomes) {
      const id = (await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: `Pedido de ${nome}`, tipo: 'bug', solicitanteNome: nome }))).id;
      await criarEspecificacao(deps, pessoa, id, ESP);
      await criarParecerRisco(deps, pessoa, id, RSK);
      decIds.push((await criarPacoteDecisao(deps, pessoa, id, criarPacoteDecisaoSchema.parse({ ...DEC, resumoExecutivo: `Falar com ${nome}` }))).id);
    }
    const lerFila = async (cred: Credencial) => {
      const texto = await lerTexto(GET_FILA, '/api/pacotes-decisao?limit=100', {}, cred);
      return ((JSON.parse(texto) as Obj).itens as Obj[]).filter((i) => decIds.includes(i.id as string));
    };
    const doAgente = await lerFila({ bearer: tokenRisco });
    expect(doAgente.map((d) => d.id).sort()).toEqual([...decIds].sort());
    for (const d of doAgente) expect(d).toMatchObject({ demandaTitulo: 'Pedido de [nome removido]', resumoExecutivo: 'Falar com [nome removido]' });
    for (const nome of nomes) expect(JSON.stringify(doAgente), nome).not.toContain(nome);
    const daPessoa = await lerFila({ cookie });
    expect(daPessoa.map((d) => d.resumoExecutivo).sort()).toEqual(nomes.map((n) => `Falar com ${n}`).sort());
  });
});

// 04-regressao do 0011 (qa-automacao), M-1 do 0009 nas vistas de ESP, RSK e DEC: o agente grava ESP, RSK e DEC pelas
// rotas com o primeiro nome e os sobrenomes do solicitante sozinhos no texto. No 201 dos três POST e nas sete leituras,
// o agente recebe as partes com inicial maiúscula trocadas, e a palavra comum em minúscula igual a uma parte do nome
// ("rosa", "campos", "30 dias") e a partícula ("dos") ficam; a pessoa lê o original, o mesmo texto que o agente mandou.
// Nome fictício.
describe('M-1 do 0009 (04-regressao do 0011): parte do nome, palavra comum e partícula nas vistas de ESP, RSK e DEC', () => {
  const NOME_PARTES = 'Carla dos Santos Rosa Campos Dias';
  const PARTES = ['Carla', 'Santos', 'Rosa', 'Campos', 'Dias'];
  const TEXTO_PARTES = 'A Carla pediu os dados dos clientes em 30 dias; camisa rosa e os campos do formulário; Santos, Rosa e Campos assinaram.';
  const M = '[nome removido]';
  const MIN_PARTES = `A ${M} pediu os dados dos clientes em 30 dias; camisa rosa e os campos do formulário; ${M}, ${M} e ${M} assinaram.`;
  const COMUNS = 'os dados dos clientes em 30 dias; camisa rosa e os campos do formulário';
  const ESP_PARTES = {
    descricaoObjetiva: TEXTO_PARTES,
    situacaoAtual: TEXTO_PARTES,
    escopoInclui: [TEXTO_PARTES],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
    criteriosAceitePreliminares: [TEXTO_PARTES],
    definicaoDePronto: [TEXTO_PARTES],
  };
  const RSK_PARTES = { resumo: TEXTO_PARTES, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo', preCondicoes: [TEXTO_PARTES] };
  const DEC_PARTES = {
    resumoExecutivo: TEXTO_PARTES,
    opcaoA: { descricao: TEXTO_PARTES },
    opcaoB: { descricao: TEXTO_PARTES },
    recomendacao: TEXTO_PARTES,
    nivelAprovacaoRequerido: 'cto',
  };

  let cen: Cenario;
  let respostas: { esp: string; rsk: string; dec: string };

  // A parte como palavra inteira: a chave "dadosCamposCriticos" da ESP tem "Campos" dentro e não é texto do pedido.
  const semPartes = (texto: string) => {
    for (const p of PARTES) expect(texto, p).not.toMatch(new RegExp(`(?<!\\p{L})${p}(?!\\p{L})`, 'u'));
    expect(texto).toContain(COMUNS);
  };
  // Só as vistas desta demanda: a fila inteira traz os DEC dos outros blocos do arquivo.
  const desta = (r: Awaited<ReturnType<typeof lerTudo>>) => JSON.stringify([r.esp, r.esps, r.rsk, r.rsks, r.dec, r.decs, r.fila]);

  beforeAll(async () => {
    const insumoTok = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', deps.relogio))).token;
    const consolidacaoTok = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
    const id = (
      await criarDemanda(deps, pessoa, criarDemandaSchema.parse({ titulo: 'Relatório da Carla', tipo: 'bug', solicitanteNome: NOME_PARTES, contexto: TEXTO_PARTES }))
    ).id;
    const postar = async (h: HandlerRota, recurso: string, corpo: unknown, bearer: string) => {
      const r = await chamarRota(h, { metodo: 'POST', caminho: `/api/demandas/${id}/${recurso}`, params: { id }, corpo, bearer });
      expect(r.status, recurso).toBe(201);
      return r.text();
    };
    const esp = await postar(POST_ESP, 'especificacoes', ESP_PARTES, insumoTok);
    const rsk = await postar(POST_RSK, 'pareceres-risco', RSK_PARTES, tokenRisco);
    const dec = await postar(POST_DEC, 'pacotes-decisao', DEC_PARTES, consolidacaoTok);
    respostas = { esp, rsk, dec };
    const idDe = (t: string) => (JSON.parse(t) as { id: string }).id;
    cen = { id, espId: idDe(esp), rskId: idDe(rsk), decId: idDe(dec), decSemDecisao: null };
  });

  it('201 dos três POST do agente: partes trocadas, palavra comum em minúscula e partícula no lugar', () => {
    for (const t of Object.values(respostas)) semPartes(t);
    const esp = JSON.parse(respostas.esp) as Obj;
    const rsk = JSON.parse(respostas.rsk) as Obj;
    const dec = JSON.parse(respostas.dec) as Obj;
    expect(esp).toMatchObject({ descricaoObjetiva: MIN_PARTES, situacaoAtual: MIN_PARTES, escopoInclui: [MIN_PARTES], criteriosAceitePreliminares: [MIN_PARTES], definicaoDePronto: [MIN_PARTES] });
    expect(rsk).toMatchObject({ resumo: MIN_PARTES, preCondicoes: [MIN_PARTES] });
    expect(dec).toMatchObject({
      demandaTitulo: `Relatório da ${M}`,
      demandaDescricao: `Contexto: ${MIN_PARTES}`,
      resumoExecutivo: MIN_PARTES,
      recomendacao: MIN_PARTES,
      opcaoA: { descricao: MIN_PARTES },
      opcaoB: { descricao: MIN_PARTES },
    });
  });

  it('agente, nas sete leituras: partes trocadas, palavra comum em minúscula e partícula no lugar', async () => {
    const r = await lerTudo(cen, { bearer: tokenRisco });
    semPartes(desta(r));
    for (const esp of [r.esp, ...r.esps]) {
      expect(esp).toMatchObject({ descricaoObjetiva: MIN_PARTES, situacaoAtual: MIN_PARTES, escopoInclui: [MIN_PARTES], criteriosAceitePreliminares: [MIN_PARTES] });
    }
    for (const rsk of [r.rsk, ...r.rsks]) expect(rsk).toMatchObject({ resumo: MIN_PARTES, preCondicoes: [MIN_PARTES] });
    const decs = [r.dec, ...r.decs, ...r.fila];
    expect(decs).toHaveLength(3);
    for (const dec of decs) {
      expect(dec).toMatchObject({ demandaTitulo: `Relatório da ${M}`, demandaDescricao: `Contexto: ${MIN_PARTES}`, resumoExecutivo: MIN_PARTES, opcaoA: { descricao: MIN_PARTES } });
      expect((dec.especificacaoCitada as Obj).criteriosAceitePreliminares).toEqual([MIN_PARTES]);
    }
  });

  it('pessoa, nas sete leituras: o texto original que o agente mandou, sem marcador', async () => {
    const r = await lerTudo(cen, { cookie });
    expect(desta(r)).not.toContain(M);
    for (const esp of [r.esp, ...r.esps]) expect(esp).toMatchObject(ESP_PARTES);
    for (const rsk of [r.rsk, ...r.rsks]) expect(rsk).toMatchObject({ resumo: TEXTO_PARTES, preCondicoes: [TEXTO_PARTES] });
    const decs = [r.dec, ...r.decs, ...r.fila];
    expect(decs).toHaveLength(3);
    for (const dec of decs) {
      expect(dec).toMatchObject({
        demandaTitulo: 'Relatório da Carla',
        demandaDescricao: `Contexto: ${TEXTO_PARTES}`,
        resumoExecutivo: TEXTO_PARTES,
        recomendacao: TEXTO_PARTES,
        opcaoA: { descricao: TEXTO_PARTES },
        opcaoB: { descricao: TEXTO_PARTES },
      });
      expect((dec.especificacaoCitada as Obj).criteriosAceitePreliminares).toEqual([TEXTO_PARTES]);
    }
  });
});
