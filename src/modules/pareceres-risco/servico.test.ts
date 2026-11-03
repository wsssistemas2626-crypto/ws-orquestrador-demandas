// Serviço do parecer de risco contra o Postgres real, pelo papel do app: a recusa em demanda de status final (M-02 do
// DEC-DEM-20261103-0006-v1). Fila do pg-boss no mesmo banco, para provar que a consolidação não é disparada. Dados só
// fictícios; o relógio é sempre o fixo, e cada teste fica num dia próprio para o limite por hora (C-36) de um não pesar
// no outro.
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { demanda, evento, parecerRisco, user } from '../../db/schema';
import { ErroDominio } from '../../lib/erros';
import { criarFila, type Fila } from '../../lib/fila';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema, type Status } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { MENSAGEM_DEMANDA_FINAL } from '../demandas/transicoes';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { idVersao } from '../versoes';
import { criarParecerRiscoSchema } from './schemas';
import { criarParecerRisco } from './servico';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-rsk-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: 'Rk7sQ2wE' };

const esp = () =>
  criarEspecificacaoSchema.parse({
    descricaoObjetiva: 'Corrigir pedidos duplicados',
    escopoInclui: ['Importação de pedidos'],
    sistemaAlvo: 'meu-sistema',
    repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: ['pnpm test verde'],
  });
const rsk = () => criarParecerRiscoSchema.parse({ resumo: 'Resumo fictício', riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });

let b: BancoDeTeste;
let fila: Fila;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
  fila = await criarFila(b.urlApp);
  await b.db.insert(user).values({ id: cto.usuarioId, name: cto.nome, email: 'rsk-cto@exemplo.test', papel: 'cto' });
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});
afterAll(async () => {
  await fila.parar();
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});
afterEach(async () => {
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
});

const migrator = () => criarDb(b.poolMigrator);
const eventosDa = (demandaId: string) => b.db.select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);
const linhasRsk = (demandaId: string) => migrator().select().from(parecerRisco).where(eq(parecerRisco.demandaId, demandaId)).orderBy(parecerRisco.versao);
const levarA = (id: string, status: Status) => migrator().update(demanda).set({ status }).where(eq(demanda.id, id));
const ligarConsolidacao = () => b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = 'modelo-ficticio' where agente = 'consolidacao'`);
const execucoesDa = async (demandaId: string) =>
  Number((await b.poolMigrator.query(`select count(*) from execucao_agente where demanda_id = $1 and agente = 'consolidacao'`, [demandaId])).rows[0].count);
const jobsDa = async (demandaId: string) =>
  Number((await b.poolMigrator.query(`select count(*) from pgboss.job where name = 'agente.executar' and singleton_key like $1`, [`%${demandaId}%`])).rows[0].count);

// Demanda com a ESP v1 da pessoa, gravada antes de qualquer mudança de status.
async function demandaComEsp(): Promise<string> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(deps, cto, d.id, esp());
  return d.id;
}

describe('criarParecerRisco: demanda em status final (M-02)', () => {
  it.each([
    ['entregue', 'pessoa'],
    ['encerrada', 'pessoa'],
    ['entregue', 'agente'],
    ['encerrada', 'agente'],
  ] as const)('em %s, pelo ator %s → conflito com a mensagem fixa, sem RSK, sem evento e sem consolidação', async (status, quem) => {
    const id = await demandaComEsp();
    await levarA(id, status);
    await ligarConsolidacao();
    const eventosAntes = (await eventosDa(id)).map((e) => e.acao);
    const erro = await criarParecerRisco({ ...deps, fila }, quem === 'pessoa' ? cto : risco, id, rsk()).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'conflito', mensagem: MENSAGEM_DEMANDA_FINAL });
    expect(await linhasRsk(id)).toEqual([]);
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(eventosAntes);
    expect(await execucoesDa(id)).toBe(0);
    expect(await jobsDa(id)).toBe(0);
  });

  it.each(['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida'] as const)(
    'em %s (não final), o RSK é gravado',
    async (status) => {
      const id = await demandaComEsp();
      await levarA(id, status);
      expect(await criarParecerRisco(deps, cto, id, rsk())).toMatchObject({ id: idVersao('RSK', id, 1), versao: 1 });
      expect(await linhasRsk(id)).toHaveLength(1);
    },
  );

  it('em status não final, com a consolidação ligada, o RSK continua disparando a consolidação', async () => {
    const id = await demandaComEsp();
    await levarA(id, 'em_analise');
    await ligarConsolidacao();
    await criarParecerRisco({ ...deps, fila }, cto, id, rsk());
    expect(await execucoesDa(id)).toBe(1);
    expect(await jobsDa(id)).toBe(1);
  });

  it('demanda que não existe → nao_encontrado', async () => {
    await expect(criarParecerRisco(deps, cto, 'DEM-20261022-9999', rsk())).rejects.toMatchObject({ codigo: 'nao_encontrado' });
  });
});
