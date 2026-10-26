// Corridas da decisão contra o Postgres real (C-13, CA-11.3, RF-14). A trava da demanda põe em fila a decisão e a
// gravação de ESP ou RSK nova: nunca fica um DEC aprovado depois de a ESP mais nova existir. Dados só fictícios; o
// relógio é o fixo, e cada rodada avança um dia para o limite por hora (C-36) não pesar.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { aprovacao, decisao, evento, user } from '../../db/schema';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { criarPacoteDecisao } from './criar';
import { registrarDecisao } from './decidir';
import { criarPacoteDecisaoSchema } from './schemas';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-corrida-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const administradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-corrida-adm', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

const espValida = criarEspecificacaoSchema.parse({
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Critério fictício'],
  definicaoDePronto: ['pnpm test verde'],
});
const rskValido = criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
const DOC = { referenciaDocumento: 'DOC-FICTICIO-002', dataDocumento: '2026-10-21' };

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values([
    { id: cto.usuarioId, name: cto.nome, email: 'corrida-cto@exemplo.test', papel: 'cto' },
    { id: administradora.usuarioId, name: administradora.nome, email: 'corrida-adm@exemplo.test', papel: 'administradora' },
  ]);
  relogio = relogioFixo('2026-10-22T12:00:00Z');
  deps = { db: b.db, pool: b.poolApp, relogio };
});
afterAll(async () => {
  await b.fechar();
});

const migrator = () => criarDb(b.poolMigrator);

// ESP v1, RSK v1, DEC v1 pendente, por pessoa. Cada rodada num dia novo (C-36).
async function prepararDemandaComDec(nivel: 'cto' | 'cto_e_administradora' = 'cto'): Promise<{ dem: { id: string }; dec: { id: string } }> {
  relogio.avancar(86_400_000);
  const dem = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(deps, cto, dem.id, espValida);
  await criarParecerRisco(deps, cto, dem.id, rskValido);
  const dec = await criarPacoteDecisao(
    deps,
    cto,
    dem.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo', opcaoA: { descricao: 'A' }, opcaoB: { descricao: 'B' }, nivelAprovacaoRequerido: nivel }),
  );
  return { dem, dec };
}

// Por id da identidade, que segue a ordem serializada pela trava.
const eventosEmOrdem = (demandaId: string) => migrator().select().from(evento).where(eq(evento.demandaId, demandaId)).orderBy(evento.id);

describe('C-13: decisão × ESP ou RSK nova', () => {
  it('aprovação e ESP v2 ao mesmo tempo: nunca DEC aprovado depois da ESP v2', async () => {
    let aprovadas = 0;
    let recusadas = 0;
    for (let i = 0; i < 20; i++) {
      const { dem, dec } = await prepararDemandaComDec();
      const [aprov, esp] = await Promise.allSettled([
        registrarDecisao(deps, cto, dec.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'A' }),
        criarEspecificacao(deps, cto, dem.id, espValida),
      ]);
      expect(esp.status).toBe('fulfilled');
      const ev = await eventosEmOrdem(dem.id);
      const iDecisao = ev.findIndex((e) => e.acao === 'decisao_registrada');
      const iEspV2 = ev.findIndex((e) => e.acao === 'especificacao_criada' && e.entidadeId.endsWith('-v2'));
      expect(iEspV2).toBeGreaterThanOrEqual(0);
      if (aprov.status === 'fulfilled') {
        aprovadas++;
        expect(iDecisao).toBeGreaterThanOrEqual(0);
        expect(iDecisao).toBeLessThan(iEspV2);
      } else {
        recusadas++;
        expect(aprov.reason).toMatchObject({ codigo: 'conflito' });
        expect(iDecisao).toBe(-1);
        expect(await migrator().select().from(decisao).where(eq(decisao.pacoteDecisaoId, dec.id))).toEqual([]);
      }
    }
    expect(aprovadas + recusadas).toBe(20);
  });

  it('aprovação e RSK v2 ao mesmo tempo: a mesma garantia', async () => {
    for (let i = 0; i < 10; i++) {
      const { dem, dec } = await prepararDemandaComDec();
      const [aprov, novo] = await Promise.allSettled([
        registrarDecisao(deps, cto, dec.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'B' }),
        criarParecerRisco(deps, cto, dem.id, rskValido),
      ]);
      expect(novo.status).toBe('fulfilled');
      const ev = await eventosEmOrdem(dem.id);
      const iDecisao = ev.findIndex((e) => e.acao === 'decisao_registrada');
      const iRskV2 = ev.findIndex((e) => e.acao === 'parecer_risco_criado' && e.entidadeId.endsWith('-v2'));
      if (aprov.status === 'fulfilled') expect(iDecisao).toBeLessThan(iRskV2);
      else expect(aprov.reason).toMatchObject({ codigo: 'conflito' });
    }
  });
});

describe('CA-11.3 e RF-14: decisões simultâneas no mesmo DEC', () => {
  it('duas aprovações do CTO ao mesmo tempo, nível cto → uma passa, a outra 409, uma decisão só', async () => {
    const { dec } = await prepararDemandaComDec();
    const r = await Promise.allSettled([
      registrarDecisao(deps, cto, dec.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'A' }),
      registrarDecisao(deps, cto, dec.id, { statusDecisao: 'arquivada' }),
    ]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const recusa = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect(recusa.reason).toMatchObject({ codigo: 'conflito' });
    expect(await migrator().select().from(decisao).where(eq(decisao.pacoteDecisaoId, dec.id))).toHaveLength(1);
  });

  it('CTO e administradora aprovando ao mesmo tempo a mesma opção → as duas aprovações e uma decisão aprovada', async () => {
    for (let i = 0; i < 5; i++) {
      const { dec } = await prepararDemandaComDec('cto_e_administradora');
      const r = await Promise.all([
        registrarDecisao(deps, cto, dec.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'A' }),
        registrarDecisao(deps, administradora, dec.id, { statusDecisao: 'aprovada', opcaoEscolhida: 'A', ...DOC }),
      ]);
      expect(r.map((x) => x.resultado).sort()).toEqual(['aprovacao_parcial', 'aprovada']);
      expect(await migrator().select().from(aprovacao).where(eq(aprovacao.pacoteDecisaoId, dec.id))).toHaveLength(2);
      const decisoes = await migrator().select().from(decisao).where(eq(decisao.pacoteDecisaoId, dec.id));
      expect(decisoes).toEqual([expect.objectContaining({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' })]);
    }
  });
});
