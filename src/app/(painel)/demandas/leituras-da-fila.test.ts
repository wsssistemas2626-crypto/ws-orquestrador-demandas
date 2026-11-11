// T09 do DEC-DEM-20261110-0015-v1: as leituras novas da fila pela página (D-08). CV-08 (04): a falha da contagem vira
// "sem número" (null) e um log `painel_contadores_falhou` com a rota, sem filtro, SQL nem parâmetro (molde:
// src/lib/log.test.ts e o substituirDestinoDoLog do fila-qa.test.ts). A contagem recebe só tipo e linha de serviço.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db';
import { substituirDestinoDoLog } from '../../../lib/log';
import { contarDemandasPorStatus, etapasDasDemandas } from '../../../modules/demandas/resumo-da-fila';
import { filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { contagemOuNada, etapasDaPagina } from './leituras-da-fila';

vi.mock('../../../modules/demandas/resumo-da-fila', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/resumo-da-fila')>();
  return { ...real, contarDemandasPorStatus: vi.fn(real.contarDemandasPorStatus) };
});

const mContar = vi.mocked(contarDemandasPorStatus);
const SENTINELA = 'SENTINELA-SQL-CONTADORES status = $1';

// Banco falso: qualquer select lança o erro com o sentinela, como uma consulta que falhou no driver.
const dbQueFalha = {
  select: () => {
    throw new Error(SENTINELA);
  },
} as unknown as Db;

let linhasDoLog: string[] = [];
beforeEach(() => {
  linhasDoLog = [];
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  mContar.mockClear();
});
afterEach(() => {
  substituirDestinoDoLog(null);
});

const filtro = filtroDemandasSchema.parse({ status: 'em_construcao', tipo: 'produto_proprio', linhaServicoProvavel: 'diagnostico_sustentacao', offset: '40' });

describe('contagemOuNada (CV-08)', () => {
  it('banco que falha: devolve null e grava um log painel_contadores_falhou com a rota', async () => {
    await expect(contagemOuNada(dbQueFalha, filtro)).resolves.toBeNull();
    const registros = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>);
    const doPainel = registros.filter((r) => r.evento === 'painel_contadores_falhou');
    expect(doPainel).toHaveLength(1);
    expect(doPainel[0]).toMatchObject({ evento: 'painel_contadores_falhou', rota: '/demandas' });
  });

  it('o log não leva o sentinela do SQL nem nada do filtro', async () => {
    await contagemOuNada(dbQueFalha, filtro);
    const tudo = linhasDoLog.join('\n');
    expect(linhasDoLog.length).toBeGreaterThan(0);
    expect(tudo).not.toContain('SENTINELA');
    expect(tudo).not.toContain('status = $1');
    for (const valor of ['produto_proprio', 'diagnostico_sustentacao', 'em_construcao']) expect(tudo).not.toContain(valor);
  });

  it('com a contagem lida, devolve o que a leitura devolveu, sem log', async () => {
    const contagem = { porStatus: { nova: 1, em_analise: 0, aguardando_informacao: 0, pronta_para_decisao: 0, aprovada: 0, em_construcao: 0, entregue: 0, devolvida: 0, encerrada: 0 }, todas: 1 };
    mContar.mockResolvedValueOnce(contagem);
    await expect(contagemOuNada(dbQueFalha, filtro)).resolves.toEqual(contagem);
    expect(linhasDoLog).toEqual([]);
  });

  it('a leitura recebe só tipo e linha de serviço (o status, o offset e o limit da URL não entram)', async () => {
    mContar.mockResolvedValueOnce({ porStatus: {} as never, todas: 0 });
    await contagemOuNada(dbQueFalha, filtro);
    expect(mContar).toHaveBeenCalledExactlyOnceWith(dbQueFalha, { tipo: 'produto_proprio', linhaServicoProvavel: 'diagnostico_sustentacao' });
  });
});

describe('etapasDaPagina (D-08)', () => {
  it('é a leitura etapasDasDemandas, sem embrulho: a falha sobe para a lista mostrar o erro', () => {
    expect(etapasDaPagina).toBe(etapasDasDemandas);
  });
});
