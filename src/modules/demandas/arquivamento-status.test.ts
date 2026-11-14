// src/modules/demandas/arquivamento-status.test.ts — T06 do DEC-DEM-20261111-0018-v1 (SB-11, ADR-38):
// mudarStatusPorArquivamento contra o Postgres real, pelo papel do app. Para cada um dos nove status e cada estado do
// vigente, o status final é o da tabela de arquivamento.ts; quando muda, um status_alterado do ator sistema com antes e
// depois; quando não muda (destino nulo ou igual), nenhum evento e atualizada_em igual. A coluna `nenhum` é a mesma
// expectativa da linha da transição automática do arquivamento que saiu do it.each de servico.test.ts (G5): das quatro
// origens vai a encerrada, com evento do ator sistema; fora delas, nada e sem evento. Dados só fictícios; relógio fixo,
// cada teste num dia próprio (C-36).
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { demanda, evento } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { ESTADOS_DO_VIGENTE, type EstadoDoVigente } from './arquivamento';
import { criarDemandaSchema, STATUS, type Status } from './schemas';
import { criarDemanda } from './servico';
import { mudarStatusPorArquivamento } from './transicoes';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-arq-status-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const entrada = criarDemandaSchema.parse({ titulo: 'Arquivamento (fictício)', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' });

// A mesma tabela de arquivamento.test.ts, escrita de novo (um teste não importa de outro *.test.ts).
const ESPERADO: Readonly<Record<Status, Readonly<Record<EstadoDoVigente, Status | null>>>> = {
  nova: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  em_analise: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: null },
  aguardando_informacao: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  pronta_para_decisao: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  aprovada: { nenhum: null, atualizado: null, desatualizado: null },
  em_construcao: { nenhum: null, atualizado: null, desatualizado: null },
  devolvida: { nenhum: null, atualizado: null, desatualizado: null },
  entregue: { nenhum: null, atualizado: null, desatualizado: null },
  encerrada: { nenhum: null, atualizado: null, desatualizado: null },
};

let b: BancoDeTeste;
let relogio: RelogioFixo;
let deps: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };
let dia = 0;

beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  relogio = relogioFixo('2026-11-14T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  deps = { db: b.db, pool: b.poolApp, relogio };
});

const migrator = () => criarDb(b.poolMigrator);
const linhaDa = async (id: string) => (await b.db.select().from(demanda).where(eq(demanda.id, id)))[0]!;
const statusAlteradosDa = async (id: string) =>
  (await b.db.select().from(evento).where(eq(evento.demandaId, id)).orderBy(evento.id)).filter((e) => e.acao === 'status_alterado');

async function demandaEm(status: Status): Promise<string> {
  const d = await criarDemanda(deps, cto, entrada);
  await migrator().update(demanda).set({ status }).where(eq(demanda.id, d.id));
  return d.id;
}

describe('mudarStatusPorArquivamento (SB-11, ADR-38)', () => {
  it('a coluna nenhum é a regra do arquivamento até a 0.4.0: das quatro origens a encerrada; fora delas, nada', () => {
    const origens: Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao'];
    for (const s of STATUS) expect(ESPERADO[s].nenhum, s).toBe(origens.includes(s) ? 'encerrada' : null);
  });

  it.each(ESTADOS_DO_VIGENTE)('vigente %s: em cada status, o destino da tabela, com evento do ator sistema só quando muda', async (estado) => {
    for (const de of STATUS) {
      const id = await demandaEm(de);
      const antes = await linhaDa(id);
      relogio.avancar(1_000);
      const r = await comTransacao(b.poolApp, (t) => mudarStatusPorArquivamento(t, deps, id, estado));
      const linha = await linhaDa(id);
      const evs = await statusAlteradosDa(id);
      const destino = ESPERADO[de][estado];
      if (destino !== null && destino !== de) {
        expect(r, `${estado} de ${de}`).toBe(destino);
        expect(linha, `${estado} de ${de}`).toMatchObject({ status: destino, atualizadaEm: relogio.agora() });
        expect(evs).toEqual([
          expect.objectContaining({ atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null, antes: { status: de }, depois: { status: destino }, ocorridoEm: relogio.agora() }),
        ]);
      } else {
        expect(r, `${estado} de ${de}`).toBeNull();
        expect(linha.status, `${estado} de ${de}`).toBe(de);
        expect(linha.atualizadaEm).toEqual(antes.atualizadaEm);
        expect(evs).toEqual([]);
      }
    }
  });

  it('roda dentro da transação de quem chama: desfeita, o status volta e não fica evento', async () => {
    const id = await demandaEm('pronta_para_decisao');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        expect(await mudarStatusPorArquivamento(t, deps, id, 'atualizado')).toBe('aprovada');
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect((await linhaDa(id)).status).toBe('pronta_para_decisao');
    expect(await statusAlteradosDa(id)).toEqual([]);
  });

  it('demanda inexistente → nao_encontrado', async () => {
    const e = await comTransacao(b.poolApp, (t) => mudarStatusPorArquivamento(t, deps, 'DEM-20261114-9999', 'nenhum')).then(
      () => undefined,
      (x: unknown) => x,
    );
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'nao_encontrado' });
  });
});
