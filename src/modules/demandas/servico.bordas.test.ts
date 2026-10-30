// Bordas do serviço de demanda contra o Postgres real, pelo papel do app (06-T15-testes, qa-automacao): DEC aprovado
// conferido por pacote e não pela demanda (CA-07.1), transição fora da tabela e status final por inteiro (RF-07,
// CA-07.5), concorrência de status na mesma demanda, o código HTTP de cada recusa e os limites da RNF-04 gravados no
// banco. Dados só fictícios; relógio sempre fixo; a ordem vem de promessas, nunca de espera por tempo.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { decisao, demanda, especificacaoTecnica, evento, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO, mapearErro } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { idVersao } from '../versoes';
import { obterDemanda } from './consultas';
import { STATUS, criarDemandaSchema, type Status } from './schemas';
import { alterarDemanda, criarDemanda } from './servico';
import { MOTIVOS_TRANSICAO } from './transicoes';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-borda-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-borda-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };
const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'Qa7bC9dE' };

const entrada = criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' });

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: 'Pessoa Ficticia CTO', email: 'borda-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: 'Pessoa Ficticia Adm', email: 'borda-adm@exemplo.test', papel: 'administradora' },
  ]);
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  // Cada teste num dia próprio: o limite de 30 por hora (C-36) de um teste não entra no outro.
  relogio = relogioFixo('2027-03-01T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const eventosDa = (demandaId: string) => b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);
const linhaDa = async (id: string) => (await b.db.select().from(demanda).where(eq(demanda.id, id)))[0]!;

async function demandaEm(status: Status, extra: Partial<typeof demanda.$inferInsert> = {}): Promise<string> {
  const d = await criarDemanda(deps, cto, entrada);
  await migrator().update(demanda).set({ status, ...extra }).where(eq(demanda.id, d.id));
  return d.id;
}

const autor = () => ({ autorTipo: 'pessoa' as const, autorId: cto.usuarioId, rascunhoAgente: false, criadaEm: relogio.agora() });
const inserirEsp = (demandaId: string, versao: number) =>
  migrator().insert(especificacaoTecnica).values({ ...autor(), id: idVersao('ESP', demandaId, versao), demandaId, versao, descricaoObjetiva: 'x', escopoInclui: ['x'] });
const inserirRsk = (demandaId: string, versao: number) =>
  migrator()
    .insert(parecerRisco)
    .values({ ...autor(), id: idVersao('RSK', demandaId, versao), demandaId, versao, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
const inserirDec = (demandaId: string, versao: number, esp: number, rsk: number) =>
  migrator()
    .insert(pacoteDecisao)
    .values({
      ...autor(),
      id: idVersao('DEC', demandaId, versao),
      demandaId,
      versao,
      especificacaoId: idVersao('ESP', demandaId, esp),
      especificacaoVersao: esp,
      parecerRiscoId: idVersao('RSK', demandaId, rsk),
      parecerRiscoVersao: rsk,
      demandaTipo: 'bug',
      demandaTitulo: 'x',
      demandaDescricao: 'x',
      resumoExecutivo: 'x',
      opcaoA: { descricao: 'A' },
      opcaoB: { descricao: 'B' },
      nivelAprovacaoRequerido: 'cto',
    });
const aprovar = (demandaId: string, versao: number) =>
  migrator()
    .insert(decisao)
    .values({ pacoteDecisaoId: idVersao('DEC', demandaId, versao), statusDecisao: 'aprovada', opcaoEscolhida: 'A', decididaPor: cto.usuarioId, decididaEm: relogio.agora() });

const erroDe = async (p: Promise<unknown>): Promise<ErroDominio> => {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
};

describe('CA-07.1: o DEC aprovado e atualizado é conferido por pacote', () => {
  it('DEC v1 aprovado mas desatualizado pela ESP v2, e DEC v2 pendente: a demanda não vai para aprovada', async () => {
    const id = await demandaEm('pronta_para_decisao');
    await inserirEsp(id, 1);
    await inserirRsk(id, 1);
    await inserirDec(id, 1, 1, 1);
    await aprovar(id, 1);
    await inserirEsp(id, 2);
    await inserirDec(id, 2, 2, 1);
    const e = await erroDe(alterarDemanda(deps, cto, id, { status: 'aprovada' }));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MOTIVOS_TRANSICAO.semPacote });
    expect(mapearErro(e).status).toBe(409);
    expect((await linhaDa(id)).status).toBe('pronta_para_decisao');
  });

  it('DEC v1 desatualizado e DEC v2 aprovado, que cita a ESP v2: a demanda vai para aprovada', async () => {
    const id = await demandaEm('pronta_para_decisao');
    await inserirEsp(id, 1);
    await inserirRsk(id, 1);
    await inserirDec(id, 1, 1, 1);
    await aprovar(id, 1);
    await inserirEsp(id, 2);
    await inserirDec(id, 2, 2, 1);
    await aprovar(id, 2);
    await expect(alterarDemanda(deps, cto, id, { status: 'aprovada' })).resolves.toMatchObject({ status: 'aprovada' });
    const evs = (await eventosDa(id)).filter((ev) => ev.acao === 'status_alterado');
    expect(evs).toEqual([expect.objectContaining({ atorTipo: 'pessoa', atorId: cto.usuarioId, antes: { status: 'pronta_para_decisao' }, depois: { status: 'aprovada' } })]);
  });
});

describe('RF-07: recusa de transição pelo serviço', () => {
  it('fora da tabela (nova → aprovada, mesmo com DEC aprovado): 409 com o motivo genérico, e o campo enviado junto não muda', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    await inserirEsp(d.id, 1);
    await inserirRsk(d.id, 1);
    await inserirDec(d.id, 1, 1, 1);
    await aprovar(d.id, 1);
    relogio.avancar(60_000);
    const e = await erroDe(alterarDemanda(deps, cto, d.id, { status: 'aprovada', urgencia: 'alta' }));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MOTIVOS_TRANSICAO.foraDaTabela });
    expect(mapearErro(e)).toEqual({ status: 409, corpo: { erro: 'conflito', mensagem: MOTIVOS_TRANSICAO.foraDaTabela } });
    const linha = await linhaDa(d.id);
    expect(linha).toMatchObject({ status: 'nova', urgencia: null });
    expect(linha.atualizadaEm).toEqual(d.atualizadaEm);
    expect((await eventosDa(d.id)).map((ev) => ev.acao)).toEqual(['demanda_criada']);
  });

  it.each(['entregue', 'encerrada'] as const)('CA-07.5: de %s, nenhum dos outros oito status é aceito, e nada muda', async (final) => {
    const id = await demandaEm(final);
    const rotulo = final === 'entregue' ? 'Entregue' : 'Encerrada';
    for (const para of STATUS.filter((s) => s !== final)) {
      const e = await erroDe(alterarDemanda(deps, cto, id, { status: para }));
      expect(e, para).toMatchObject({ codigo: 'conflito', mensagem: `${rotulo} é um status final. Não há próxima mudança.` });
      expect(mapearErro(e).status, para).toBe(409);
    }
    expect((await linhaDa(id)).status).toBe(final);
    expect((await eventosDa(id)).filter((ev) => ev.acao === 'status_alterado')).toEqual([]);
  });

  it('CA-07.2: o 409 do estudo sai com o código HTTP certo', async () => {
    const id = await demandaEm('aprovada', { tipo: 'estudo' });
    const e = await erroDe(alterarDemanda(deps, cto, id, { status: 'em_construcao' }));
    expect(mapearErro(e)).toEqual({ status: 409, corpo: { erro: 'conflito', mensagem: MOTIVOS_TRANSICAO.estudo } });
    expect((await linhaDa(id)).status).toBe('aprovada');
  });

  it('status igual ao atual junto com um campo: só o campo muda, sem evento de status', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    await alterarDemanda(deps, cto, d.id, { status: 'nova', urgencia: 'media' });
    expect((await eventosDa(d.id)).map((ev) => ev.acao)).toEqual(['demanda_criada', 'campo_alterado']);
    expect(await linhaDa(d.id)).toMatchObject({ status: 'nova', urgencia: 'media' });
  });
});

describe('RF-07: concorrência de status na mesma demanda', () => {
  it('em_construcao → entregue e → devolvida ao mesmo tempo: uma grava, a outra recebe 409, e há um só status_alterado', async () => {
    const id = await demandaEm('em_construcao');
    const r = await Promise.allSettled([alterarDemanda(deps, cto, id, { status: 'entregue' }), alterarDemanda(deps, administradora, id, { status: 'devolvida' })]);
    const ok = r.filter((x): x is PromiseFulfilledResult<Awaited<ReturnType<typeof alterarDemanda>>> => x.status === 'fulfilled');
    const recusadas = r.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(recusadas).toHaveLength(1);
    expect(recusadas[0]!.reason).toMatchObject({ codigo: 'conflito' });
    const final = ok[0]!.value.status;
    expect(['entregue', 'devolvida']).toContain(final);
    expect((await linhaDa(id)).status).toBe(final);
    const evs = (await eventosDa(id)).filter((ev) => ev.acao === 'status_alterado');
    expect(evs).toEqual([expect.objectContaining({ antes: { status: 'em_construcao' }, depois: { status: final } })]);
  });

  it('duas nova → em_analise ao mesmo tempo: uma grava, a outra recebe "Nada foi alterado.", e há um só evento', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    const r = await Promise.allSettled([alterarDemanda(deps, cto, d.id, { status: 'em_analise' }), alterarDemanda(deps, administradora, d.id, { status: 'em_analise' })]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const [recusada] = r.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
    expect(recusada!.reason).toMatchObject({ codigo: 'entrada_invalida', mensagem: 'Nada foi alterado.' });
    expect(mapearErro(recusada!.reason).status).toBe(400);
    expect((await eventosDa(d.id)).filter((ev) => ev.acao === 'status_alterado')).toHaveLength(1);
  });
});

describe('código HTTP das recusas da T15', () => {
  it('CA-06.3: demanda inexistente → 404 com a mensagem padrão, sem o id pedido', async () => {
    // Cada chamada só começa quando o laço chega nela: criadas juntas, a segunda rejeitava antes de ter quem a
    // tratasse, e o Vitest acusava "Unhandled Rejection" conforme a carga da máquina (achado da 06-T25-testes).
    for (const chamar of [() => obterDemanda(b.db, 'DEM-20261022-9999'), () => alterarDemanda(deps, cto, 'DEM-20261022-9999', { titulo: 'x' })]) {
      const { status, corpo } = mapearErro(await erroDe(chamar()));
      expect(status).toBe(404);
      expect(corpo).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
      expect(JSON.stringify(corpo)).not.toContain('9999');
    }
  });

  it('CA-07.4: agente que tenta mudar o status → 403, sem citar o agente', async () => {
    const d = await criarDemanda(deps, cto, entrada);
    const { status, corpo } = mapearErro(await erroDe(alterarDemanda(deps, orquestrador as never, d.id, { status: 'em_analise' })));
    expect(status).toBe(403);
    expect(JSON.stringify(corpo)).not.toMatch(/orquestrador|Qa7bC9dE/);
    expect((await linhaDa(d.id)).status).toBe('nova');
  });

  it('C-36: a 31ª demanda na hora → 429, sem citar o ator', async () => {
    for (let i = 0; i < 30; i++) {
      await criarDemanda(deps, administradora, entrada);
      relogio.avancar(1_000);
    }
    const { status, corpo } = mapearErro(await erroDe(criarDemanda(deps, administradora, entrada)));
    expect(status).toBe(429);
    expect(JSON.stringify(corpo)).not.toMatch(/u-borda|Adm/);
  });
});

describe('RNF-04 no banco: o que o schema aceita grava e volta inteiro', () => {
  it('textos de 10.000 caracteres e 50 anexos com referência de 2.048 voltam sem corte', async () => {
    const longo = (letra: string) => letra.repeat(10_000);
    const referencia = 'https://exemplo.test/' + 'r'.repeat(2048 - 'https://exemplo.test/'.length);
    const corpo = criarDemandaSchema.parse({
      ...entrada,
      titulo: longo('t'),
      contexto: longo('c'),
      descricaoProblema: longo('d'),
      impactoPercebido: longo('i'),
      justificativaUrgencia: longo('j'),
      solicitanteNome: 'p'.repeat(200),
      anexos: Array.from({ length: 50 }, (_, i) => ({ tipo: 'url', referencia, descricao: `Anexo ficticio ${i}` })),
    });
    const d = await criarDemanda(deps, cto, corpo);
    const v = await obterDemanda(b.db, d.id);
    expect(v.titulo).toHaveLength(10_000);
    expect(v.contexto).toBe(longo('c'));
    expect(v.descricaoProblema).toBe(longo('d'));
    expect(v.impactoPercebido).toBe(longo('i'));
    expect(v.justificativaUrgencia).toBe(longo('j'));
    expect(v.solicitanteNome).toHaveLength(200);
    expect(v.anexos).toHaveLength(50);
    expect(v.anexos.every((a) => a.referencia === referencia)).toBe(true);
    expect(v.anexos[49]).toEqual({ tipo: 'url', referencia, descricao: 'Anexo ficticio 49' });
  });
});
