// DEC-DEM-20261112-0019-v1, 03-correcao, B-2: o script de token não tem caminho de sucesso sem emissão. A decisão do alvo
// é uma função pura com a falha fechada no fim; se a validação dos argumentos regredir e deixar passar "nenhum dos dois",
// executarCriarToken lança (e rodarScript sai com 1), sem gravar. Banco real, relógio fixo, saída falsa.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/argumentos', async (importOriginal) => {
  const m = await importOriginal<typeof import('./lib/argumentos')>();
  return { ...m, lerArgumentos: vi.fn(m.lerArgumentos) };
});

import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import type { Deps } from '../src/lib/deps';
import { ErroDominio } from '../src/lib/erros';
import { relogioFixo } from '../src/lib/relogio';
import { donoDosArgumentos, executarCriarToken, MENSAGEM_UM_DOS_DOIS } from './criar-token-servico';
import { lerArgumentos } from './lib/argumentos';

let b: BancoDeTeste;
let deps: Deps;
beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-12T12:00:00Z') });
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const contar = async (consulta: string) => Number((await b.poolMigrator.query(consulta)).rows[0].n);

describe('B-2: donoDosArgumentos', () => {
  it('um agente ou uma integração: o dono certo', () => {
    expect(donoDosArgumentos({ agente: 'risco' })).toEqual({ tipo: 'agente', agente: 'risco' });
    expect(donoDosArgumentos({ integracao: 'awave' })).toEqual({ tipo: 'integracao', integracao: 'awave' });
  });

  it('nenhum dos dois, ou os dois: lança a mensagem fixa, sem valor de argumento', () => {
    for (const a of [{}, { agente: undefined, integracao: undefined }, { agente: 'risco' as const, integracao: 'awave' as const }]) {
      let e: unknown;
      try {
        donoDosArgumentos(a);
      } catch (x) {
        e = x;
      }
      expect(e, JSON.stringify(a)).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'entrada_invalida', mensagem: MENSAGEM_UM_DOS_DOIS });
    }
  });
});

describe('B-2: executarCriarToken sem alvo', () => {
  it('com a validação regredida (nenhum dos dois passa), lança, não escreve na saída e não grava token nem evento', async () => {
    vi.mocked(lerArgumentos).mockReturnValueOnce({ agente: undefined, integracao: undefined });
    const tokens = await contar('select count(*) as n from token_servico');
    const eventos = await contar('select count(*) as n from evento');
    const partes: string[] = [];
    await expect(executarCriarToken(deps, [], { write: (s) => void partes.push(s) })).rejects.toMatchObject({
      codigo: 'entrada_invalida',
      mensagem: MENSAGEM_UM_DOS_DOIS,
    });
    expect(partes).toEqual([]);
    expect(await contar('select count(*) as n from token_servico')).toBe(tokens);
    expect(await contar('select count(*) as n from evento')).toBe(eventos);
  });
});
