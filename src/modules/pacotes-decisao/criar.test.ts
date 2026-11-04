// Criação do pacote de decisão contra o Postgres real, pelo papel do app (RF-10, RF-11, C-10, C-11, C-30, C-36, G3.8).
// Dados só fictícios; o relógio é sempre o fixo, e cada teste fica num dia próprio para o limite por hora (C-36) de um
// não pesar no outro.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { criarDb } from '../../db';
import { demanda, evento, pacoteDecisao, user } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { FILAS, criarFila, type Fila } from '../../lib/fila';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from '../acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema, type Status } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { MENSAGEM_DEMANDA_FINAL } from '../demandas/transicoes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { MENSAGEM_LIMITE } from '../limites';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { obterPacoteDecisao } from './consultas';
import { MENSAGEM_FALTAM_ITENS, PARTES_DA_DESCRICAO, criarPacoteDecisao, descricaoDaDemanda, descricaoSemRotulos } from './criar';
import { criarPacoteDecisaoSchema } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-dec-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-dec-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const consolidacao: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: 'Cn5oL1dA' };
const sistema: AtorSistema = { tipo: 'sistema' };

const ENTRADA = {
  resumoExecutivo: 'Corrigir a importação de pedidos duplicados',
  opcaoA: { descricao: 'Corrigir no importador', vantagens: 'Rápido', desvantagens: 'Paliativo', quandoEscolher: 'Se o prazo for curto' },
  opcaoB: { descricao: 'Refazer a integração' },
  recomendacao: 'Opção A agora, B no próximo ciclo',
  nivelAprovacaoRequerido: 'cto',
};
const dec = (extra: Record<string, unknown> = {}) => criarPacoteDecisaoSchema.parse({ ...ENTRADA, ...extra });
const esp = (extra: Record<string, unknown> = {}) =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva: 'Corrigir pedidos duplicados',
    escopoInclui: ['Importação de pedidos'],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: ['pnpm test verde'],
    ...extra,
  });
const rsk = (extra: Record<string, unknown> = {}) =>
  criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'alto', ...extra });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'dec-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'dec-adm@exemplo.test', papel: 'administradora' },
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

const migrator = () => criarDb(b.poolMigrator);
const eventosDa = (demandaId: string) => b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);
const linhasDec = (demandaId: string) => migrator().select().from(pacoteDecisao).where(eq(pacoteDecisao.demandaId, demandaId)).orderBy(pacoteDecisao.versao);
const statusDa = async (id: string) => (await migrator().select({ s: demanda.status }).from(demanda).where(eq(demanda.id, id)))[0]!.s;

async function novaDemanda(extra: Record<string, unknown> = {}, status?: Status): Promise<string> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', ...extra }));
  if (status) await migrator().update(demanda).set({ status }).where(eq(demanda.id, d.id));
  return d.id;
}

// Demanda com ESP v1 e RSK v1, as duas por pessoa.
async function demandaPronta(extra: Record<string, unknown> = {}, status?: Status): Promise<string> {
  const id = await novaDemanda(extra, status);
  await criarEspecificacao(deps, cto, id, esp());
  await criarParecerRisco(deps, cto, id, rsk());
  return id;
}

describe('descricaoDaDemanda', () => {
  it('junta contexto, problema e impacto, com rótulo e linha em branco entre as partes', () => {
    expect(descricaoDaDemanda({ contexto: 'Loja fictícia', descricaoProblema: 'Pedidos duplicam', impactoPercebido: 'Estoque errado' })).toBe(
      'Contexto: Loja fictícia\n\nProblema: Pedidos duplicam\n\nImpacto percebido: Estoque errado',
    );
  });
  it('só com as partes preenchidas, na mesma ordem', () => {
    expect(descricaoDaDemanda({ contexto: null, descricaoProblema: 'Pedidos duplicam', impactoPercebido: 'Estoque errado' })).toBe(
      'Problema: Pedidos duplicam\n\nImpacto percebido: Estoque errado',
    );
    expect(descricaoDaDemanda({ contexto: 'Loja fictícia', impactoPercebido: '   ' })).toBe('Contexto: Loja fictícia');
  });
  it('sem nenhuma parte → texto vazio', () => {
    expect(descricaoDaDemanda({})).toBe('');
    expect(descricaoDaDemanda({ contexto: '', descricaoProblema: null, impactoPercebido: undefined })).toBe('');
  });
});

// D1 do 0013: o Pedido de Construção confere o nome do solicitante nos valores da descrição, sem os rótulos que
// descricaoDaDemanda põe no começo de cada bloco (o rótulo "Contexto" não é o nome de ninguém).
describe('descricaoSemRotulos (D1 do 0013)', () => {
  it('a descrição gravada volta só com os três valores, sem nenhum rótulo', () => {
    const d = descricaoSemRotulos(descricaoDaDemanda({ contexto: 'Loja fictícia', descricaoProblema: 'Pedidos duplicam', impactoPercebido: 'Estoque errado' }));
    for (const v of ['Loja fictícia', 'Pedidos duplicam', 'Estoque errado']) expect(d).toContain(v);
    for (const [, rotulo] of PARTES_DA_DESCRICAO) expect(d).not.toContain(rotulo);
    expect(d).toBe('Loja fictícia\n\nPedidos duplicam\n\nEstoque errado');
  });

  it('só com algumas partes, e o rótulo só sai do começo de um bloco', () => {
    expect(descricaoSemRotulos(descricaoDaDemanda({ descricaoProblema: 'Contexto: do fornecedor', impactoPercebido: 'Estoque errado' }))).toBe(
      'Contexto: do fornecedor\n\nEstoque errado',
    );
    expect(descricaoSemRotulos('Contexto: Importação diária')).toBe('Importação diária');
  });

  it('descrição vazia continua vazia', () => {
    expect(descricaoSemRotulos(descricaoDaDemanda({}))).toBe('');
    expect(descricaoSemRotulos('')).toBe('');
  });
});

describe('criarPacoteDecisao: o que falta', () => {
  it('CA-10.1: sem ESP e sem RSK → 400 com faltando: ["especificacao", "parecer_risco"], e nada gravado', async () => {
    const id = await novaDemanda();
    const erro = await criarPacoteDecisao(deps, cto, id, dec()).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'entrada_invalida', mensagem: MENSAGEM_FALTAM_ITENS, extras: { faltando: ['especificacao', 'parecer_risco'] } });
    expect(MENSAGEM_FALTAM_ITENS).toBe('Faltam itens para o pacote.');
    expect(await linhasDec(id)).toEqual([]);
    expect(await statusDa(id)).toBe('nova');
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada']);
  });

  it('CA-10.2: com ESP v1 e sem RSK → faltando: ["parecer_risco"]', async () => {
    const id = await novaDemanda();
    await criarEspecificacao(deps, cto, id, esp());
    await expect(criarPacoteDecisao(deps, cto, id, dec())).rejects.toMatchObject({ codigo: 'entrada_invalida', extras: { faltando: ['parecer_risco'] } });
    expect(await linhasDec(id)).toEqual([]);
  });

  it('com RSK e sem ESP → faltando: ["especificacao"]', async () => {
    const id = await novaDemanda();
    await criarParecerRisco(deps, cto, id, rsk());
    await expect(criarPacoteDecisao(deps, cto, id, dec())).rejects.toMatchObject({ codigo: 'entrada_invalida', extras: { faltando: ['especificacao'] } });
  });

  it('demanda que não existe → nao_encontrado', async () => {
    await expect(criarPacoteDecisao(deps, cto, 'DEM-20261022-9999', dec())).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });
});

describe('criarPacoteDecisao: gravação', () => {
  it('CA-10.3: ESP v1, v2 e RSK v1 → cita ESP-…-v2 e RSK-…-v1 e nasce pendente', async () => {
    const id = await novaDemanda();
    await criarEspecificacao(deps, cto, id, esp());
    await criarEspecificacao(deps, cto, id, esp({ sistemaAlvo: 'outro-sistema', repositorioDestino: 'fabianojp06/outro-sistema' }));
    await criarParecerRisco(deps, cto, id, rsk());
    const v = await criarPacoteDecisao(deps, cto, id, dec());
    expect(v).toMatchObject({
      id: idVersao('DEC', id, 1),
      demandaId: id,
      versao: 1,
      especificacaoId: idVersao('ESP', id, 2),
      parecerRiscoId: idVersao('RSK', id, 1),
      statusDecisao: 'pendente',
      desatualizado: false,
      aprovadores: [],
      decisao: null,
      rascunhoAgente: false,
      autor: { tipo: 'pessoa', nome: cto.nome },
      especificacaoCitada: {
        sistemaAlvo: 'outro-sistema',
        repositorioDestino: 'fabianojp06/outro-sistema',
        criteriosAceitePreliminares: ['Critério fictício'],
        definicaoDePronto: ['pnpm test verde'],
      },
      niveisRisco: { tecnico: 'medio', operacional: 'baixo', juridico: 'alto' },
      rascunhosCitados: [],
    });
    expect(v.criadaEm).toEqual(relogio.agora());
    expect(Object.keys(v)).not.toContain('autorId');
    expect(Object.keys(v)).not.toContain('execucaoAgenteId');
    const [linha] = await linhasDec(id);
    expect(linha).toMatchObject({ especificacaoVersao: 2, parecerRiscoVersao: 1, autorTipo: 'pessoa', autorId: cto.usuarioId, execucaoAgenteId: null });
  });

  // Etapa 06-T20-testes (qa-automacao): o lado do RSK de CA-10.3, com o RSK mais novo gravado pelo agente risco.
  it('CA-10.3, lado do RSK: ESP v1, RSK v1 e v2 → cita RSK-…-v2, com os níveis e o selo de rascunho dele', async () => {
    const id = await demandaPronta();
    await criarParecerRisco(deps, { tipo: 'agente', agente: 'risco', prefixoToken: null }, id, rsk({ riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'alto', riscoJuridicoNivel: 'baixo' }));
    const v = await criarPacoteDecisao(deps, cto, id, dec());
    expect(v).toMatchObject({
      especificacaoId: idVersao('ESP', id, 1),
      parecerRiscoId: idVersao('RSK', id, 2),
      desatualizado: false,
      niveisRisco: { tecnico: 'alto', operacional: 'alto', juridico: 'baixo' },
      rascunhosCitados: [idVersao('RSK', id, 2)],
    });
    expect((await linhasDec(id))[0]).toMatchObject({ especificacaoVersao: 1, parecerRiscoVersao: 2 });
  });

  it('grava as opções, a recomendação e o nível; o DEC seguinte é v2', async () => {
    const id = await demandaPronta();
    const v1 = await criarPacoteDecisao(deps, cto, id, dec());
    expect(v1).toMatchObject({
      resumoExecutivo: ENTRADA.resumoExecutivo,
      opcaoA: ENTRADA.opcaoA,
      opcaoB: ENTRADA.opcaoB,
      recomendacao: ENTRADA.recomendacao,
      nivelAprovacaoRequerido: 'cto',
    });
    const v2 = await criarPacoteDecisao(deps, administradora, id, dec({ nivelAprovacaoRequerido: 'cto_e_administradora' }));
    expect(v2).toMatchObject({ id: idVersao('DEC', id, 2), versao: 2, nivelAprovacaoRequerido: 'cto_e_administradora', autor: { tipo: 'pessoa', nome: administradora.nome } });
  });

  it('texto opcional só de espaços vira nulo (recomendação) ou sai da opção, e a opção grava só o que veio', async () => {
    const id = await demandaPronta();
    const v = await criarPacoteDecisao(deps, cto, id, dec({ recomendacao: '   ', opcaoA: { descricao: 'Só a descrição', vantagens: '  ' } }));
    expect(v.recomendacao).toBeNull();
    expect(v.opcaoA).toEqual({ descricao: 'Só a descrição' });
    const [linha] = await linhasDec(id);
    expect(linha).toMatchObject({ recomendacao: null, opcaoA: { descricao: 'Só a descrição' }, opcaoB: { descricao: 'Refazer a integração' } });
  });

  it('RF-10: copia tipo, título e descrição da demanda; a cópia não muda quando a demanda é editada', async () => {
    const id = await demandaPronta({ contexto: 'Loja fictícia', descricaoProblema: 'Pedidos duplicam', impactoPercebido: 'Estoque errado' });
    const v = await criarPacoteDecisao(deps, cto, id, dec());
    const copia = { demandaTipo: 'bug', demandaTitulo: 'Pedidos duplicados', demandaDescricao: 'Contexto: Loja fictícia\n\nProblema: Pedidos duplicam\n\nImpacto percebido: Estoque errado' };
    expect(v).toMatchObject(copia);
    await alterarDemanda(deps, cto, id, alterarDemandaSchema.parse({ titulo: 'Título novo', tipo: 'melhoria', contexto: 'Outro contexto', descricaoProblema: null }));
    expect(await obterPacoteDecisao(b.db, v.id)).toMatchObject(copia);
  });

  it('demanda sem contexto, problema e impacto → descrição gravada vazia', async () => {
    const id = await demandaPronta();
    expect((await criarPacoteDecisao(deps, cto, id, dec())).demandaDescricao).toBe('');
  });

  it('CA-10.4: depois do DEC, a demanda está em pronta_para_decisao, com evento de ator sistema', async () => {
    const id = await demandaPronta();
    await criarPacoteDecisao(deps, cto, id, dec());
    expect(await statusDa(id)).toBe('pronta_para_decisao');
    const eventos = await eventosDa(id);
    expect(eventos.map((e) => e.acao)).toEqual(['demanda_criada', 'especificacao_criada', 'parecer_risco_criado', 'pacote_decisao_criado', 'status_alterado']);
    expect(eventos[4]).toMatchObject({ atorTipo: 'sistema', atorId: 'sistema', entidade: 'demanda', entidadeId: id, antes: { status: 'nova' }, depois: { status: 'pronta_para_decisao' } });
  });

  it.each(['em_analise', 'aguardando_informacao'] as const)('de %s também vai a pronta_para_decisao', async (status) => {
    const id = await demandaPronta({}, status);
    await criarPacoteDecisao(deps, cto, id, dec());
    expect(await statusDa(id)).toBe('pronta_para_decisao');
  });

  // M-02: `encerrada` saiu desta lista e virou caso de recusa (describe "demanda em status final"); `devolvida` entrou.
  it.each(['pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida'] as const)('em %s (fora da origem), o DEC é gravado e o status não muda', async (status) => {
    const id = await demandaPronta({}, status);
    await criarPacoteDecisao(deps, cto, id, dec());
    expect(await statusDa(id)).toBe(status);
    expect((await eventosDa(id)).map((e) => e.acao)).not.toContain('status_alterado');
    expect(await linhasDec(id)).toHaveLength(1);
  });

  it('RF-11: a versão anterior continua igual depois de uma nova versão', async () => {
    const id = await demandaPronta();
    const v1 = await criarPacoteDecisao(deps, cto, id, dec({ resumoExecutivo: 'Original' }));
    await criarPacoteDecisao(deps, consolidacao, id, dec({ resumoExecutivo: 'Mudou', opcaoA: { descricao: 'Outra' }, nivelAprovacaoRequerido: 'cto_e_administradora' }));
    expect(await obterPacoteDecisao(b.db, v1.id)).toEqual(v1);
  });
});

describe('criarPacoteDecisao: autoria, acesso e histórico', () => {
  it('C-11: agente consolidacao grava rascunho de agente, com o nome do agente como autor, mesmo com autoria no corpo', async () => {
    const id = await demandaPronta();
    const entrada = criarPacoteDecisaoSchema.parse({ ...ENTRADA, rascunhoAgente: false, autorTipo: 'pessoa', autorId: cto.usuarioId, responsavel: 'x', id: 'DEC-x', versao: 9 });
    expect(entrada).not.toHaveProperty('rascunhoAgente');
    expect(entrada).not.toHaveProperty('autorTipo');
    const v = await criarPacoteDecisao(deps, consolidacao, id, entrada);
    expect(v).toMatchObject({ id: idVersao('DEC', id, 1), versao: 1, rascunhoAgente: true, autor: { tipo: 'agente', agente: 'consolidacao' }, rascunhosCitados: [idVersao('DEC', id, 1)] });
    const [linha] = await linhasDec(id);
    expect(linha).toMatchObject({ autorTipo: 'agente', autorId: 'consolidacao', rascunhoAgente: true });
  });

  it('extras.execucaoAgenteId fica gravado na versão', async () => {
    const id = await demandaPronta();
    const execucao = '00000000-0000-4000-8000-000000000020';
    await criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, { execucaoAgenteId: execucao });
    expect((await linhasDec(id))[0]!.execucaoAgenteId).toBe(execucao);
  });

  it('C-10: ator sistema e agentes fora da matriz → sem_permissao, e nada gravado', async () => {
    const id = await demandaPronta();
    const outros: AtorAgente[] = (['orquestrador', 'insumo_tecnico', 'risco'] as const).map((agente) => ({ tipo: 'agente', agente, prefixoToken: null }));
    for (const ator of [sistema, ...outros]) {
      await expect(criarPacoteDecisao(deps, ator, id, dec())).rejects.toMatchObject({ codigo: 'sem_permissao' });
    }
    expect(await linhasDec(id)).toEqual([]);
    expect(await statusDa(id)).toBe('nova');
  });

  it('RF-21 e C-30: evento pacote_decisao_criado com a pessoa, sem texto livre', async () => {
    const id = await demandaPronta();
    await criarPacoteDecisao(
      deps,
      administradora,
      id,
      dec({
        resumoExecutivo: SENTINELAS.texto,
        opcaoA: { descricao: SENTINELAS.nome, vantagens: SENTINELAS.email },
        opcaoB: { descricao: SENTINELAS.telefone, quandoEscolher: SENTINELAS.texto },
        recomendacao: SENTINELAS.email,
      }),
    );
    const eventos = await eventosDa(id);
    const ev = eventos.find((e) => e.acao === 'pacote_decisao_criado')!;
    expect(ev).toMatchObject({
      atorTipo: 'pessoa',
      atorId: administradora.usuarioId,
      entidade: 'pacote_decisao',
      entidadeId: idVersao('DEC', id, 1),
      antes: null,
      depois: { versao: 1, rascunhoAgente: false, especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 1), nivelAprovacaoRequerido: 'cto' },
    });
    expect(contemSentinela(JSON.stringify(eventos))).toBe(false);
  });

  it('o evento do agente leva o prefixo do token, para auditoria', async () => {
    const id = await demandaPronta();
    await criarPacoteDecisao(deps, consolidacao, id, dec());
    const ev = (await eventosDa(id)).find((e) => e.acao === 'pacote_decisao_criado')!;
    expect(ev).toMatchObject({ atorTipo: 'agente', atorId: 'consolidacao', atorTokenPrefixo: 'Cn5oL1dA', depois: { versao: 1, rascunhoAgente: true } });
  });
});

// M-02 (DEC-DEM-20261103-0006-v1): numa demanda em status final, o DEC é recusado sob a trava, antes do limite, do
// insert, do evento, da mudança de status e do aviso. Com a fila presente, para provar que nenhum job de aviso nasce.
describe('criarPacoteDecisao: demanda em status final (M-02)', () => {
  let fila: Fila;
  beforeAll(async () => {
    fila = await criarFila(b.urlApp);
  });
  afterAll(async () => {
    await fila.parar();
  });

  const avisosDa = async (demandaId: string) =>
    Number((await b.poolMigrator.query('select count(*) from aviso_email where pacote_decisao_id like $1', [`DEC-${demandaId}-%`])).rows[0].count);
  const jobsDeAvisoDa = async (demandaId: string) =>
    Number((await b.poolMigrator.query(`select count(*) from pgboss.job where name = $1 and data->>'decId' like $2`, [FILAS.avisoDecPronto, `DEC-${demandaId}-%`])).rows[0].count);

  it.each([
    ['entregue', 'pessoa'],
    ['encerrada', 'pessoa'],
    ['entregue', 'agente'],
    ['encerrada', 'agente'],
  ] as const)('em %s, pelo ator %s → conflito com a mensagem fixa, sem DEC, sem evento, sem aviso e sem job', async (status, quem) => {
    // ESP e RSK gravados antes de a demanda chegar ao status final.
    const id = await demandaPronta();
    await migrator().update(demanda).set({ status }).where(eq(demanda.id, id));
    const extras = quem === 'agente' ? { execucaoAgenteId: '00000000-0000-4000-8000-000000000031', especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 1) } : {};
    const erro = await criarPacoteDecisao({ ...deps, fila }, quem === 'pessoa' ? cto : consolidacao, id, dec(), undefined, extras).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'conflito', mensagem: MENSAGEM_DEMANDA_FINAL });
    expect(await linhasDec(id)).toEqual([]);
    expect(await statusDa(id)).toBe(status);
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada', 'especificacao_criada', 'parecer_risco_criado']);
    expect(await avisosDa(id)).toBe(0);
    expect(await jobsDeAvisoDa(id)).toBe(0);
  });

  it('a recusa vem antes do que falta: demanda encerrada sem ESP e sem RSK → conflito, e não entrada_invalida', async () => {
    const id = await novaDemanda({}, 'encerrada');
    await expect(criarPacoteDecisao(deps, cto, id, dec())).rejects.toMatchObject({ codigo: 'conflito', mensagem: MENSAGEM_DEMANDA_FINAL });
  });

  it.each(['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida'] as const)(
    'em %s (não final), o DEC é gravado, com aviso e job',
    async (status) => {
      const id = await demandaPronta();
      await migrator().update(demanda).set({ status }).where(eq(demanda.id, id));
      expect(await criarPacoteDecisao({ ...deps, fila }, cto, id, dec())).toMatchObject({ id: idVersao('DEC', id, 1) });
      expect(await linhasDec(id)).toHaveLength(1);
      expect(await avisosDa(id)).toBe(1);
      expect(await jobsDeAvisoDa(id)).toBe(1);
    },
  );
});

// M-01 (DEC-DEM-20261103-0006-v1): o worker passa a ESP e o RSK que a entrada da consolidação leu, e o DEC cita esses,
// mesmo com versão mais nova na demanda (o DEC nasce desatualizado). Pessoa, rota e Server Action citam os mais novos.
describe('criarPacoteDecisao: ESP e RSK citados pelo worker (M-01)', () => {
  it('com extras.especificacaoId e extras.parecerRiscoId, cita essas versões, e não as mais novas; o DEC sai desatualizado', async () => {
    const id = await demandaPronta();
    await criarEspecificacao(deps, cto, id, esp({ descricaoObjetiva: 'ESP v2' }));
    await criarParecerRisco(deps, cto, id, rsk({ riscoTecnicoNivel: 'baixo' }));
    const v = await criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, {
      execucaoAgenteId: '00000000-0000-4000-8000-000000000032',
      especificacaoId: idVersao('ESP', id, 1),
      parecerRiscoId: idVersao('RSK', id, 1),
    });
    expect(v).toMatchObject({ especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 1), desatualizado: true });
    expect((await linhasDec(id))[0]).toMatchObject({ especificacaoVersao: 1, parecerRiscoVersao: 1 });
    const ev = (await eventosDa(id)).find((e) => e.acao === 'pacote_decisao_criado')!;
    expect(ev.depois).toMatchObject({ especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 1) });
  });

  it('com os extras iguais às mais novas, o DEC não sai desatualizado', async () => {
    const id = await demandaPronta();
    const v = await criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, { especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 1) });
    expect(v).toMatchObject({ especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 1), desatualizado: false });
  });

  it('extras.parecerRiscoId de outra demanda → nao_encontrado, e nada gravado', async () => {
    const id = await demandaPronta();
    const outra = await demandaPronta();
    const erro = await criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, { especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', outra, 1) }).catch(
      (e: unknown) => e,
    );
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await linhasDec(id)).toEqual([]);
    expect(await linhasDec(outra)).toEqual([]);
  });

  it('extras.especificacaoId de outra demanda → nao_encontrado, e nada gravado', async () => {
    const id = await demandaPronta();
    const outra = await demandaPronta();
    await expect(
      criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, { especificacaoId: idVersao('ESP', outra, 1), parecerRiscoId: idVersao('RSK', id, 1) }),
    ).rejects.toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await linhasDec(id)).toEqual([]);
  });

  it('extras com versão que não existe → nao_encontrado, e nada gravado', async () => {
    const id = await demandaPronta();
    await expect(
      criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, { especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 7) }),
    ).rejects.toMatchObject({ codigo: 'nao_encontrado' });
    await expect(
      criarPacoteDecisao(deps, consolidacao, id, dec(), undefined, { especificacaoId: idVersao('ESP', id, 7), parecerRiscoId: idVersao('RSK', id, 1) }),
    ).rejects.toMatchObject({ codigo: 'nao_encontrado' });
    expect(await linhasDec(id)).toEqual([]);
  });

  it('pela pessoa, sem extras, continua citando as mais novas', async () => {
    const id = await demandaPronta();
    await criarParecerRisco(deps, cto, id, rsk());
    const v = await criarPacoteDecisao(deps, cto, id, dec());
    expect(v).toMatchObject({ especificacaoId: idVersao('ESP', id, 1), parecerRiscoId: idVersao('RSK', id, 2), desatualizado: false });
  });
});

describe('criarPacoteDecisao: transação e limite', () => {
  it('G3.8: com a transação de quem chama, o rollback desfaz o DEC, o evento e o status', async () => {
    const id = await demandaPronta();
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarPacoteDecisao(deps, cto, id, dec(), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await linhasDec(id)).toEqual([]);
    expect(await statusDa(id)).toBe('nova');
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada', 'especificacao_criada', 'parecer_risco_criado']);
  });

  it('com a transação de quem chama, a vista devolvida já enxerga o DEC e o status', async () => {
    const id = await demandaPronta();
    const v = await comTransacao(b.poolApp, (t) => criarPacoteDecisao(deps, cto, id, dec(), t));
    expect(v).toMatchObject({ id: idVersao('DEC', id, 1), statusDecisao: 'pendente' });
  });

  it('C-36: com 60 artefatos do ator na hora (ESP, RSK e DEC somados), o DEC seguinte → limite_excedido, e nada gravado', async () => {
    const id = await demandaPronta();
    const agora = relogio.agora();
    // ESP v1 e RSK v1 do cto já contam 2; mais 58 DEC do cto gravados direto.
    await migrator()
      .insert(pacoteDecisao)
      .values(
        Array.from({ length: 58 }, (_, i) => ({
          id: idVersao('DEC', id, i + 1),
          demandaId: id,
          versao: i + 1,
          especificacaoId: idVersao('ESP', id, 1),
          especificacaoVersao: 1,
          parecerRiscoId: idVersao('RSK', id, 1),
          parecerRiscoVersao: 1,
          demandaTipo: 'bug' as const,
          demandaTitulo: 'Pedidos duplicados',
          demandaDescricao: '',
          resumoExecutivo: 'x',
          opcaoA: { descricao: 'A' },
          opcaoB: { descricao: 'B' },
          nivelAprovacaoRequerido: 'cto' as const,
          autorTipo: 'pessoa' as const,
          autorId: cto.usuarioId,
          rascunhoAgente: false,
          criadaEm: agora,
        })),
      );
    await expect(criarPacoteDecisao(deps, cto, id, dec())).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await linhasDec(id)).toHaveLength(58);
    // Outro ator não é afetado; a versão seguinte é a 59.
    expect((await criarPacoteDecisao(deps, administradora, id, dec())).versao).toBe(59);
  });

  it('CA-04.3: três criações simultâneas → v1 a v3, sem número repetido', async () => {
    const id = await demandaPronta();
    const r = await Promise.all([cto, administradora, consolidacao].map((a) => criarPacoteDecisao(deps, a, id, dec())));
    expect(r.map((v) => v.versao).sort()).toEqual([1, 2, 3]);
  });
});
