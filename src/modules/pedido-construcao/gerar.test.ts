// Pedido de Construção (RF-22, C-28, ADR-05, RNF-15): montagem só com dado imutável, serialização determinística e
// validação pelo validarPedido copiado do /construir. Postgres real pelo papel do app (Testcontainers); o relógio é
// sempre o fixo, e cada teste fica num dia próprio para o limite por hora (C-36) de um não pesar no outro. Dados só
// fictícios.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { evento, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import { AGENTES, type AtorAgente, type AtorPessoa, type AtorSistema } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { entradaSchema, registrarEntrada } from '../demandas/entrada';
import { alterarDemandaSchema, criarDemandaSchema, type Tipo } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import type { EspecificacaoVista } from '../especificacoes/consultas';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import type { PacoteDecisaoVista } from '../pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../pacotes-decisao/criar';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import type { ParecerRiscoVista } from '../pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { nivelMaior, textoDaEspecificacao, textoDoParecer } from './conteudo';
import { MENSAGENS_PEDIDO, gerarPedido } from './gerar';
import { montarPedido } from './montar';
import { serializarPedido } from './serializar';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-pedido-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-pedido-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const sistema: AtorSistema = { tipo: 'sistema' };
const agentes = AGENTES.map((agente): AtorAgente => ({ tipo: 'agente', agente, prefixoToken: null }));

const CHAVES_DO_PEDIDO = [
  'pedido',
  'demanda',
  'especificacao',
  'risco',
  'decisao',
  'sistema_alvo',
  'repositorio_destino',
  'criterios_aceite_preliminares',
  'definicao_de_pronto',
];

const ESP_COMPLETA = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  situacaoAtual: 'O importador grava o mesmo pedido duas vezes',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const ESP_ESTUDO = { descricaoObjetiva: 'Avaliar a troca do ERP', escopoInclui: ['Levantamento'] };
const RSK_PADRAO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'pedido-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'pedido-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

type Preparo = {
  tipo?: Tipo;
  demanda?: Record<string, unknown>;
  esp?: Record<string, unknown>;
  rsk?: Record<string, unknown>;
  nivel?: 'cto' | 'cto_e_administradora';
};

// Demanda com contexto e problema, ESP v1, RSK v1 e DEC v1 pendente, tudo pelo CTO.
async function prepararDec(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const tipo = op.tipo ?? 'bug';
  const d = await criarDemanda(
    deps,
    cto,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados',
      tipo,
      solicitanteNome: 'Pessoa Ficticia',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
      ...op.demanda,
    }),
  );
  await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(op.esp ?? (tipo === 'estudo' ? ESP_ESTUDO : ESP_COMPLETA)));
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(op.rsk ?? RSK_PADRAO));
  const dec = await criarPacoteDecisao(
    deps,
    cto,
    d.id,
    criarPacoteDecisaoSchema.parse({
      resumoExecutivo: 'Corrigir a importação de pedidos',
      opcaoA: { descricao: 'Corrigir no importador' },
      opcaoB: { descricao: 'Refazer a integração' },
      nivelAprovacaoRequerido: op.nivel ?? 'cto',
    }),
  );
  return { demandaId: d.id, decId: dec.id };
}

const aprovar = (decId: string, quem: AtorPessoa = cto, opcao: 'A' | 'B' = 'A', extra: Record<string, unknown> = {}) =>
  registrarDecisao(deps, quem, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: opcao, ...extra }));

async function prepararAprovado(op: Preparo = {}): Promise<{ demandaId: string; decId: string }> {
  const r = await prepararDec(op);
  await aprovar(r.decId);
  return r;
}

const eventosDoPedido = (decId: string) =>
  b.db
    .select()
    .from(evento)
    .where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')))
    .orderBy(evento.id);

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

describe('gerarPedido: montagem (RF-22)', () => {
  it('CA-22.1: DEC aprovado com ESP e RSK completos → passa no validarPedido e pedido = decisao.id', async () => {
    const { decId } = await prepararAprovado();
    const { json } = await gerarPedido(deps, cto, decId);
    const p = JSON.parse(json);
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
    expect(p.pedido).toBe(p.decisao.id);
  });

  it('cada campo vem da origem da tabela do RF-22, com a ordem de chaves fixa', async () => {
    const { demandaId, decId } = await prepararAprovado();
    const { json, nomeArquivo } = await gerarPedido(deps, cto, decId);
    expect(nomeArquivo).toBe(`${decId}.json`);
    const p = JSON.parse(json) as Record<string, Record<string, unknown>>;
    expect(p).toEqual({
      pedido: decId,
      demanda: {
        id: demandaId,
        tipo: 'bug',
        titulo: 'Pedidos duplicados',
        descricao: 'Contexto: Importação diária do ERP\n\nProblema: Pedidos aparecem duas vezes',
      },
      especificacao: {
        id: `ESP-${demandaId}-v1`,
        conteudo: 'Descrição objetiva: Corrigir pedidos duplicados\n\nSituação atual: O importador grava o mesmo pedido duas vezes\n\nEscopo inclui:\n- Importação de pedidos',
      },
      risco: { id: `RSK-${demandaId}-v1`, nivel: 'medio', conteudo: 'Risco técnico: Médio\n\nRisco operacional: Baixo\n\nRisco jurídico: Baixo' },
      decisao: { id: decId, opcaoEscolhida: 'A: Corrigir no importador', aprovadoPor: 'Pessoa Ficticia CTO', aprovadoEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      sistema_alvo: 'meu-sistema',
      repositorio_destino: 'wsssistemas2626-crypto/meu-sistema',
      criterios_aceite_preliminares: ['Pedido importado uma vez só'],
      definicao_de_pronto: ['pnpm test verde'],
    });
    expect(Object.keys(p)).toEqual(CHAVES_DO_PEDIDO);
    expect(Object.keys(p.demanda!)).toEqual(['id', 'tipo', 'titulo', 'descricao']);
    expect(Object.keys(p.especificacao!)).toEqual(['id', 'conteudo']);
    expect(Object.keys(p.risco!)).toEqual(['id', 'nivel', 'conteudo']);
    expect(Object.keys(p.decisao!)).toEqual(['id', 'opcaoEscolhida', 'aprovadoPor', 'aprovadoEm']);
    // Sem data de geração, `ensaio` nem qualquer outra chave.
    expect(json).not.toMatch(/gerad|ensaio/i);
  });

  it('opção B escolhida → "B: <descrição da opção B>"', async () => {
    const { decId } = await prepararDec();
    await aprovar(decId, cto, 'B');
    expect(JSON.parse((await gerarPedido(deps, cto, decId)).json).decisao.opcaoEscolhida).toBe('B: Refazer a integração');
  });

  it('aprovadoEm é a data da aprovação em America/Sao_Paulo, não a UTC nem a da geração', async () => {
    const { decId } = await prepararDec();
    // 01:30 UTC do dia 23 ainda é dia 22 em São Paulo.
    relogio.definir('2026-11-23T01:30:00Z');
    await aprovar(decId);
    relogio.definir('2026-11-30T12:00:00Z');
    expect(JSON.parse((await gerarPedido(deps, cto, decId)).json).decisao.aprovadoEm).toBe('2026-11-22');
  });

  it('dupla aprovação: aprovadoPor na ordem cto, administradora, mesmo com a administradora primeiro; aprovadoEm da que completou', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    relogio.definir('2026-12-01T12:00:00Z');
    await aprovar(decId, administradora, 'A', { referenciaDocumento: 'DOC-FICTICIO-010', dataDocumento: '2026-11-30' });
    relogio.definir('2026-12-03T12:00:00Z');
    await aprovar(decId, cto);
    const p = JSON.parse((await gerarPedido(deps, cto, decId)).json);
    expect(p.decisao.aprovadoPor).toBe('Pessoa Ficticia CTO e Pessoa Ficticia Adm');
    expect(p.decisao.aprovadoEm).toBe('2026-12-03');
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
  });

  it('dupla aprovação no mesmo instante (a vista ordena pelo papel em ordem alfabética): ainda cto primeiro', async () => {
    const { decId } = await prepararDec({ nivel: 'cto_e_administradora' });
    await aprovar(decId, cto);
    await aprovar(decId, administradora, 'A', { referenciaDocumento: 'DOC-FICTICIO-011', dataDocumento: '2026-11-30' });
    expect(JSON.parse((await gerarPedido(deps, administradora, decId)).json).decisao.aprovadoPor).toBe('Pessoa Ficticia CTO e Pessoa Ficticia Adm');
  });

  it('CA-22.5: RSK baixo, alto e medio → risco.nivel alto', async () => {
    const { decId } = await prepararAprovado({ rsk: { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'alto', riscoJuridicoNivel: 'medio' } });
    expect(JSON.parse((await gerarPedido(deps, cto, decId)).json).risco.nivel).toBe('alto');
  });
});

describe('gerarPedido: determinismo (CA-22.2)', () => {
  it('CA-22.2: o mesmo DEC, duas vezes, inclusive depois de editar o título da demanda → byte a byte igual', async () => {
    const { demandaId, decId } = await prepararAprovado();
    const a = (await gerarPedido(deps, cto, decId)).json;
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ titulo: 'Título novo fictício', contexto: 'Outro contexto', tipo: 'melhoria' }));
    relogio.avancar(86_400_000);
    const b2 = (await gerarPedido(deps, cto, decId)).json;
    expect(b2).toBe(a);
    expect(JSON.parse(b2).demanda).toMatchObject({ titulo: 'Pedidos duplicados', tipo: 'bug' });
  });

  // Até a 08-correcao, o pedido saía com a ESP e o RSK citados mesmo depois de substituídos. A-03: o DEC fica
  // desatualizado e o pedido é recusado (409), em vez de mandar ao /construir a versão velha.
  it('ESP e RSK novos depois da aprovação: o DEC fica desatualizado e o pedido é recusado com 409 (A-03)', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await gerarPedido(deps, cto, decId);
    await criarEspecificacao(deps, cto, demandaId, criarEspecificacaoSchema.parse({ ...ESP_COMPLETA, sistemaAlvo: 'outro-sistema', repositorioDestino: 'fabianojp06/outro-sistema' }));
    await criarParecerRisco(deps, cto, demandaId, criarParecerRiscoSchema.parse({ ...RSK_PADRAO, riscoJuridicoNivel: 'alto' }));
    await expect(gerarPedido(deps, administradora, decId)).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_PEDIDO.desatualizado });
  });

  it('serializarPedido é JSON.stringify com 2 espaços e uma quebra de linha no fim', async () => {
    const { decId } = await prepararAprovado();
    const { json } = await gerarPedido(deps, cto, decId);
    expect(json.endsWith('}\n')).toBe(true);
    expect(json).toBe(`${JSON.stringify(JSON.parse(json), null, 2)}\n`);
    expect(serializarPedido(JSON.parse(json))).toBe(json);
  });
});

describe('gerarPedido: recusas', () => {
  it('CA-22.3: estudo → 422 com a mensagem', async () => {
    const { decId } = await prepararAprovado({ tipo: 'estudo' });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe('demanda do tipo estudo não gera Pedido de Construção');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.estudo);
    expect(await eventosDoPedido(decId)).toEqual([]);
  });

  it('CA-22.3: o tipo que conta é o copiado no DEC: demanda que virou estudo depois do DEC ainda gera', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await alterarDemanda(deps, cto, demandaId, alterarDemandaSchema.parse({ tipo: 'estudo' }));
    expect(JSON.parse((await gerarPedido(deps, cto, decId)).json).demanda.tipo).toBe('bug');
  });

  it('CA-22.4: pendente, devolvida, arquivada e só uma das duas aprovações → 409, sem evento', async () => {
    const pendente = await prepararDec();
    const devolvida = await prepararDec();
    await registrarDecisao(deps, cto, devolvida.decId, registrarDecisaoSchema.parse({ statusDecisao: 'devolvida' }));
    const arquivada = await prepararDec();
    await registrarDecisao(deps, cto, arquivada.decId, registrarDecisaoSchema.parse({ statusDecisao: 'arquivada' }));
    const parcialCto = await prepararDec({ nivel: 'cto_e_administradora' });
    await aprovar(parcialCto.decId, cto);
    const parcialAdm = await prepararDec({ nivel: 'cto_e_administradora' });
    await aprovar(parcialAdm.decId, administradora, 'A', { referenciaDocumento: 'DOC-FICTICIO-012', dataDocumento: '2026-11-30' });
    for (const { decId } of [pendente, devolvida, arquivada, parcialCto, parcialAdm]) {
      const e = await erroDe(gerarPedido(deps, cto, decId));
      expect(e.codigo, decId).toBe('conflito');
      expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoAprovado);
      expect(await eventosDoPedido(decId)).toEqual([]);
    }
  });

  it('CA-22.4 vem antes do estudo: estudo pendente → 409', async () => {
    const { decId } = await prepararDec({ tipo: 'estudo' });
    expect((await erroDe(gerarPedido(deps, cto, decId))).codigo).toBe('conflito');
  });

  it('C-28: ESP com contato@exemplo.test → 422 com "especificacao.conteudo: e-mail" e sem o valor', async () => {
    const { decId } = await prepararAprovado({ esp: { ...ESP_COMPLETA, situacaoAtual: 'Falar com contato@exemplo.test sobre o importador' } });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['especificacao.conteudo: e-mail'] });
    expect(JSON.stringify({ m: e.mensagem, x: e.extras, s: e.message })).not.toContain('contato@exemplo.test');
    expect(await eventosDoPedido(decId)).toEqual([]);
  });

  it('C-28: telefone no RSK, CPF nos critérios e e-mail no título → um erro por campo e tipo, sem os valores', async () => {
    const { decId } = await prepararAprovado({
      demanda: { titulo: `Pedido de ${SENTINELAS.email}` },
      esp: { ...ESP_COMPLETA, criteriosAceitePreliminares: ['ok', 'Cliente 123.456.789-09 recebe uma vez'] },
      rsk: { ...RSK_PADRAO, riscoOperacionalComentario: `Ligar ${SENTINELAS.telefone}` },
    });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.extras.erros).toEqual(['demanda.titulo: e-mail', 'risco.conteudo: telefone', 'criterios_aceite_preliminares[1]: CPF']);
    expect(contemSentinela(JSON.stringify(e.extras))).toBe(false);
    expect(JSON.stringify(e.extras)).not.toContain('456.789');
  });

  it('C-28: CNPJ não é procurado no pedido (decisão da 04)', async () => {
    const { decId } = await prepararAprovado({ esp: { ...ESP_COMPLETA, situacaoAtual: 'Fornecedor CNPJ 12.345.678/0001-90' } });
    expect(JSON.parse((await gerarPedido(deps, cto, decId)).json).especificacao.conteudo).toContain('12.345.678/0001-90');
  });

  it('validarPedido falhou → 422 com a lista de erros dele, e nada entregue', async () => {
    // Demanda sem contexto, problema nem impacto: a descrição copiada no DEC fica vazia.
    const { decId } = await prepararAprovado({ demanda: { contexto: undefined, descricaoProblema: undefined } });
    const e = await erroDe(gerarPedido(deps, cto, decId));
    expect(e.codigo).toBe('nao_processavel');
    expect(e.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(e.extras).toEqual({ erros: ['demanda.descricao vazio'] });
    expect(await eventosDoPedido(decId)).toEqual([]);
  });

  it('validarPedido: ESP sem os campos de construção (demanda que era estudo e virou bug) → 422 com os quatro campos', async () => {
    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Estudo fictício', tipo: 'estudo', solicitanteNome: 'Pessoa Ficticia', contexto: 'Contexto fictício' }));
    await criarEspecificacao(deps, cto, d.id, criarEspecificacaoSchema.parse(ESP_ESTUDO));
    await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse(RSK_PADRAO));
    await alterarDemanda(deps, cto, d.id, alterarDemandaSchema.parse({ tipo: 'bug' }));
    const dec = await criarPacoteDecisao(
      deps,
      cto,
      d.id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'A' }, opcaoB: { descricao: 'B' }, nivelAprovacaoRequerido: 'cto' }),
    );
    await aprovar(dec.id);
    const e = await erroDe(gerarPedido(deps, cto, dec.id));
    expect(e.extras.erros).toEqual([
      'sistema_alvo fora do formato: minúsculas, números e hífen, sem barra',
      'criterios_aceite_preliminares vazio',
      'definicao_de_pronto vazio',
    ]);
  });

  it('DEC que não existe → 404', async () => {
    expect((await erroDe(gerarPedido(deps, cto, 'DEC-DEM-20261022-9999-v1'))).codigo).toBe('nao_encontrado');
  });
});

describe('gerarPedido: dado de terceiro (CA-22.6)', () => {
  it('CA-22.6: solicitante, texto bruto, origem e anexo fictícios não aparecem no JSON', async () => {
    const r = await registrarEntrada(
      deps,
      cto,
      entradaSchema.parse({
        modo: 'manual',
        titulo: 'Pedidos duplicados',
        tipo: 'bug',
        solicitanteNome: SENTINELAS.nome,
        contexto: 'Importação diária do ERP',
        anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/SENTINELA-ANEXO' }],
        texto: `De: ${SENTINELAS.nome} <${SENTINELAS.email}>\n${SENTINELAS.texto} ${SENTINELAS.telefone}`,
        origem: { canal: 'email', referencia: 'SENTINELA-ORIGEM' },
      }),
    );
    if (r.tipo !== 'demanda') throw new Error('entrada manual sempre cria a demanda');
    const demandaId = r.demanda.id;
    await criarEspecificacao(deps, cto, demandaId, criarEspecificacaoSchema.parse(ESP_COMPLETA));
    await criarParecerRisco(deps, cto, demandaId, criarParecerRiscoSchema.parse(RSK_PADRAO));
    const dec = await criarPacoteDecisao(
      deps,
      cto,
      demandaId,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'Corrigir' }, opcaoB: { descricao: 'Refazer' }, nivelAprovacaoRequerido: 'cto' }),
    );
    await aprovar(dec.id);
    const { json } = await gerarPedido(deps, cto, dec.id);
    expect(contemSentinela(json)).toBe(false);
    expect(json).not.toContain('SENTINELA-ANEXO');
    expect(json).not.toContain('SENTINELA-ORIGEM');
    expect(json).not.toContain('Pessoa Ficticia Sentinela');
    expect(json).not.toMatch(/resumoExecutivo|Resumo|recomendacao|comentario/i);
  });
});

describe('gerarPedido: histórico e transação', () => {
  it('cada geração grava evento pedido_gerado com a pessoa, sem conteúdo', async () => {
    const { demandaId, decId } = await prepararAprovado();
    await gerarPedido(deps, cto, decId);
    await gerarPedido(deps, administradora, decId);
    const eventos = await eventosDoPedido(decId);
    expect(eventos.map((e) => ({ atorTipo: e.atorTipo, atorId: e.atorId, demandaId: e.demandaId, entidade: e.entidade, antes: e.antes, depois: e.depois }))).toEqual([
      { atorTipo: 'pessoa', atorId: cto.usuarioId, demandaId, entidade: 'pacote_decisao', antes: null, depois: null },
      { atorTipo: 'pessoa', atorId: administradora.usuarioId, demandaId, entidade: 'pacote_decisao', antes: null, depois: null },
    ]);
  });

  it('G3.8: com a transação de quem chama, o evento sai junto no rollback', async () => {
    const { decId } = await prepararAprovado();
    await expect(
      comTransacao(b.poolApp, async (t) => {
        const r = await gerarPedido(deps, cto, decId, t);
        expect(validarPedido(JSON.parse(r.json)).ok).toBe(true);
        expect((await t.tx.select().from(evento).where(and(eq(evento.entidadeId, decId), eq(evento.acao, 'pedido_gerado')))).length).toBe(1);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await eventosDoPedido(decId)).toEqual([]);
  });
});

describe('gerarPedido: acesso', () => {
  it('cada agente e o ator sistema → 403, também chamando a função direto, sem evento', async () => {
    const { decId } = await prepararAprovado();
    for (const ator of [...agentes, sistema]) {
      const e = await erroDe(gerarPedido(deps, ator, decId));
      expect(e.codigo).toBe('sem_permissao');
      expect(e.mensagem).toBe(MENSAGENS_ACESSO.sem_permissao);
    }
    expect(await eventosDoPedido(decId)).toEqual([]);
  });

  it('o 403 vem antes de qualquer leitura: DEC que não existe também dá 403 ao agente', async () => {
    expect((await erroDe(gerarPedido(deps, agentes[0]!, 'DEC-DEM-20261022-9999-v1'))).codigo).toBe('sem_permissao');
  });

  it('a administradora também gera (rota de qualquer pessoa)', async () => {
    const { decId } = await prepararAprovado();
    expect(validarPedido(JSON.parse((await gerarPedido(deps, administradora, decId)).json)).ok).toBe(true);
  });
});

// ---- Funções puras: conteúdo e montagem ----

const autor = { tipo: 'pessoa' as const, nome: 'Pessoa Ficticia' };
const criadaEm = new Date('2026-10-22T12:00:00Z');

function espVista(over: Partial<EspecificacaoVista> = {}): EspecificacaoVista {
  return {
    id: 'ESP-DEM-20261022-0001-v1',
    demandaId: 'DEM-20261022-0001',
    versao: 1,
    descricaoObjetiva: 'Descrição fictícia',
    situacaoAtual: null,
    situacaoDesejada: null,
    escopoInclui: ['Item fictício'],
    escopoExclui: [],
    sistemasErp: null,
    sistemasEcommerceMarketplace: null,
    sistemasApisTerceiros: null,
    sistemasServicosInternos: null,
    dadosEntidades: null,
    dadosCamposCriticos: null,
    restricoesTecnicas: null,
    duvidasEmAberto: [],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'fabianojp06/meu-sistema',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: ['pnpm test verde'],
    autor,
    rascunhoAgente: false,
    criadaEm,
    ...over,
  };
}

function rskVista(over: Partial<ParecerRiscoVista> = {}): ParecerRiscoVista {
  return {
    id: 'RSK-DEM-20261022-0001-v1',
    demandaId: 'DEM-20261022-0001',
    versao: 1,
    resumo: null,
    riscoTecnicoNivel: 'baixo',
    riscoTecnicoComentario: null,
    riscoOperacionalNivel: 'baixo',
    riscoOperacionalComentario: null,
    riscoJuridicoNivel: 'baixo',
    riscoJuridicoComentario: null,
    recomendacoesMitigacao: [],
    preCondicoes: [],
    envolverJuridicoOuAdministradoraQuando: null,
    autor,
    rascunhoAgente: false,
    criadaEm,
    ...over,
  };
}

function decVista(over: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  return {
    id: 'DEC-DEM-20261022-0001-v1',
    demandaId: 'DEM-20261022-0001',
    versao: 1,
    especificacaoId: 'ESP-DEM-20261022-0001-v1',
    parecerRiscoId: 'RSK-DEM-20261022-0001-v1',
    demandaTipo: 'melhoria',
    demandaTitulo: 'Título fictício',
    demandaDescricao: 'Contexto: fictício',
    resumoExecutivo: 'Resumo fictício',
    opcaoA: { descricao: 'Opção A fictícia', vantagens: 'Rápida' },
    opcaoB: { descricao: 'Opção B fictícia' },
    recomendacao: 'Recomendo a A',
    nivelAprovacaoRequerido: 'cto_e_administradora',
    autor,
    rascunhoAgente: false,
    criadaEm,
    statusDecisao: 'aprovada',
    aprovadores: [
      { papel: 'administradora', nome: 'Pessoa Ficticia Adm', opcao: 'A', registradaEm: criadaEm, referenciaDocumento: 'DOC-FICTICIO-1', dataDocumento: '2026-10-21' },
      { papel: 'cto', nome: 'Pessoa Ficticia CTO', opcao: 'A', registradaEm: criadaEm, referenciaDocumento: null, dataDocumento: null },
    ],
    desatualizado: false,
    decisao: { opcaoEscolhida: 'A', comentarios: 'Comentário fictício', decididaPor: 'Pessoa Ficticia CTO', decididaEm: new Date('2026-10-23T02:00:00Z') },
    rascunhosCitados: [],
    especificacaoCitada: { sistemaAlvo: 'meu-sistema', repositorioDestino: 'fabianojp06/meu-sistema', criteriosAceitePreliminares: ['Critério fictício'], definicaoDePronto: ['pnpm test verde'] },
    niveisRisco: { tecnico: 'baixo', operacional: 'baixo', juridico: 'baixo' },
    ...over,
  };
}

describe('textoDaEspecificacao', () => {
  it('todos os campos em ordem fixa, com os rótulos da T07; listas com hífen', () => {
    const texto = textoDaEspecificacao(
      espVista({
        situacaoAtual: 'Atual',
        situacaoDesejada: 'Desejada',
        escopoInclui: ['Inclui 1', 'Inclui 2'],
        escopoExclui: ['Exclui 1'],
        sistemasErp: 'ERP fictício',
        sistemasEcommerceMarketplace: 'Loja fictícia',
        sistemasApisTerceiros: 'API fictícia',
        sistemasServicosInternos: 'Serviço fictício',
        dadosEntidades: 'Pedido',
        dadosCamposCriticos: 'Número do pedido',
        restricoesTecnicas: 'Sem janela de manutenção',
        duvidasEmAberto: ['Dúvida fictícia'],
      }),
    );
    expect(texto).toBe(
      [
        'Descrição objetiva: Descrição fictícia',
        'Situação atual: Atual',
        'Situação desejada: Desejada',
        'Escopo inclui:\n- Inclui 1\n- Inclui 2',
        'Escopo exclui:\n- Exclui 1',
        'ERP: ERP fictício',
        'E-commerce e marketplace: Loja fictícia',
        'APIs de terceiros: API fictícia',
        'Serviços internos da WS: Serviço fictício',
        'Entidades: Pedido',
        'Campos críticos: Número do pedido',
        'Restrições técnicas: Sem janela de manutenção',
        'Dúvidas em aberto:\n- Dúvida fictícia',
      ].join('\n\n'),
    );
  });

  it('campo nulo, texto vazio e lista vazia ficam de fora; os campos de construção não entram (vão no topo do pedido)', () => {
    const texto = textoDaEspecificacao(espVista({ situacaoAtual: '', escopoExclui: [] }));
    expect(texto).toBe('Descrição objetiva: Descrição fictícia\n\nEscopo inclui:\n- Item fictício');
    expect(texto).not.toMatch(/meu-sistema|Critério fictício|pnpm/);
  });

  it('não leva id, autor, data nem a marca de rascunho', () => {
    const texto = textoDaEspecificacao(espVista({ rascunhoAgente: true }));
    expect(texto).not.toMatch(/ESP-|DEM-|Pessoa|2026|rascunho/i);
  });
});

describe('textoDoParecer e nivelMaior', () => {
  it('os três riscos com o rótulo do nível; comentário, listas e o texto do jurídico quando houver', () => {
    const texto = textoDoParecer(
      rskVista({
        resumo: 'Resumo fictício',
        riscoTecnicoNivel: 'alto',
        riscoTecnicoComentario: 'Integração frágil',
        riscoOperacionalNivel: 'medio',
        recomendacoesMitigacao: ['Mitigação 1'],
        preCondicoes: ['Pré-condição 1', 'Pré-condição 2'],
        envolverJuridicoOuAdministradoraQuando: 'Se houver contrato',
      }),
    );
    expect(texto).toBe(
      [
        'Resumo: Resumo fictício',
        'Risco técnico: Alto\nComentário: Integração frágil',
        'Risco operacional: Médio',
        'Risco jurídico: Baixo',
        'Recomendações de mitigação:\n- Mitigação 1',
        'Pré-condições:\n- Pré-condição 1\n- Pré-condição 2',
        'Quando envolver o jurídico ou a administradora: Se houver contrato',
      ].join('\n\n'),
    );
  });

  it('sem os opcionais, só os três níveis', () => {
    expect(textoDoParecer(rskVista({ riscoTecnicoComentario: '' }))).toBe('Risco técnico: Baixo\n\nRisco operacional: Baixo\n\nRisco jurídico: Baixo');
  });

  it.each([
    [['baixo', 'baixo', 'baixo'], 'baixo'],
    [['baixo', 'medio', 'baixo'], 'medio'],
    [['medio', 'medio', 'medio'], 'medio'],
    [['baixo', 'alto', 'medio'], 'alto'],
    [['alto', 'baixo', 'baixo'], 'alto'],
    [['baixo', 'baixo', 'alto'], 'alto'],
  ] as const)('CA-22.5: %j → %s', ([tecnico, operacional, juridico], esperado) => {
    expect(nivelMaior(rskVista({ riscoTecnicoNivel: tecnico, riscoOperacionalNivel: operacional, riscoJuridicoNivel: juridico }))).toBe(esperado);
  });
});

describe('montarPedido e serializarPedido', () => {
  it('monta da cópia do DEC, da ESP e do RSK citados, com aprovadoPor na ordem cto, administradora', () => {
    const p = montarPedido({ dec: decVista(), esp: espVista(), rsk: rskVista({ riscoJuridicoNivel: 'medio' }) });
    expect(p).toEqual({
      pedido: 'DEC-DEM-20261022-0001-v1',
      demanda: { id: 'DEM-20261022-0001', tipo: 'melhoria', titulo: 'Título fictício', descricao: 'Contexto: fictício' },
      especificacao: { id: 'ESP-DEM-20261022-0001-v1', conteudo: 'Descrição objetiva: Descrição fictícia\n\nEscopo inclui:\n- Item fictício' },
      risco: { id: 'RSK-DEM-20261022-0001-v1', nivel: 'medio', conteudo: 'Risco técnico: Baixo\n\nRisco operacional: Baixo\n\nRisco jurídico: Médio' },
      decisao: { id: 'DEC-DEM-20261022-0001-v1', opcaoEscolhida: 'A: Opção A fictícia', aprovadoPor: 'Pessoa Ficticia CTO e Pessoa Ficticia Adm', aprovadoEm: '2026-10-22' },
      sistema_alvo: 'meu-sistema',
      repositorio_destino: 'fabianojp06/meu-sistema',
      criterios_aceite_preliminares: ['Critério fictício'],
      definicao_de_pronto: ['pnpm test verde'],
    });
    expect(Object.keys(p)).toEqual(CHAVES_DO_PEDIDO);
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
  });

  it('não leva resumo, opções completas, recomendação, comentários nem documento da administradora', () => {
    const s = serializarPedido(montarPedido({ dec: decVista(), esp: espVista(), rsk: rskVista() }));
    expect(s).not.toMatch(/Resumo fictício|Rápida|Recomendo|Comentário fictício|DOC-FICTICIO|Opção B fictícia/);
  });

  it('as mesmas entradas dão o mesmo texto, com chaves em ordem fixa mesmo se a lista de aprovadores vier em outra ordem', () => {
    const dec = decVista();
    const invertido = decVista({ aprovadores: [...dec.aprovadores].reverse() });
    const a = serializarPedido(montarPedido({ dec, esp: espVista(), rsk: rskVista() }));
    const b2 = serializarPedido(montarPedido({ dec: invertido, esp: espVista(), rsk: rskVista() }));
    expect(b2).toBe(a);
    expect(a).toBe(`${JSON.stringify(JSON.parse(a), null, 2)}\n`);
  });

  it('DEC sem decisão aprovada → 409 (a função pura também recusa)', () => {
    for (const over of [
      { statusDecisao: 'pendente' as const, decisao: null },
      { statusDecisao: 'devolvida' as const, decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'x', decididaEm: criadaEm } },
    ]) {
      let erro: unknown;
      try {
        montarPedido({ dec: decVista(over), esp: espVista(), rsk: rskVista() });
      } catch (e) {
        erro = e;
      }
      expect(erro).toBeInstanceOf(ErroDominio);
      expect((erro as ErroDominio).codigo).toBe('conflito');
    }
  });
});
