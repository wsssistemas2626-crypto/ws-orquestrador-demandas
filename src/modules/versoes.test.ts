// Número de versão e trava da demanda (CA-04.3, RF-11) contra o Postgres real, pelo papel do app. Dados só fictícios.
// A concorrência é coordenada por promessas e pela espera de trava vista em pg_stat_activity, não pelo relógio.
import { and, asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDb } from '../db';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../db/schema';
import { comTransacao } from '../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../lib/erros';
import { reduzirErro } from '../lib/reduzir-erro';
import { reIdVersao } from '../lib/rota';
import { idVersao, proximaVersao, RE_ID_VERSAO, travarDemanda } from './versoes';

const AGORA = new Date('2026-10-22T12:00:00Z');

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

let sequencia = 0;
async function novaDemanda(): Promise<string> {
  sequencia += 1;
  const id = `DEM-20261022-${String(sequencia).padStart(4, '0')}`;
  await criarDb(b.poolMigrator)
    .insert(demanda)
    .values({
      id,
      titulo: 'Demanda ficticia',
      tipo: 'melhoria',
      solicitanteNome: 'Pessoa Ficticia',
      autorTipo: 'pessoa',
      autorId: 'u-ficticio',
      criadaEm: AGORA,
      atualizadaEm: AGORA,
    });
  return id;
}

const linhaEsp = (demandaId: string, versao: number) => ({
  id: idVersao('ESP', demandaId, versao),
  demandaId,
  versao,
  descricaoObjetiva: 'Descricao ficticia',
  escopoInclui: ['item ficticio'],
  autorTipo: 'pessoa' as const,
  autorId: 'u-ficticio',
  rascunhoAgente: false,
  criadaEm: AGORA,
});

const linhaRsk = (demandaId: string, versao: number) => ({
  id: idVersao('RSK', demandaId, versao),
  demandaId,
  versao,
  riscoTecnicoNivel: 'baixo' as const,
  riscoOperacionalNivel: 'baixo' as const,
  riscoJuridicoNivel: 'baixo' as const,
  autorTipo: 'pessoa' as const,
  autorId: 'u-ficticio',
  rascunhoAgente: false,
  criadaEm: AGORA,
});

const linhaDec = (demandaId: string, versao: number) => ({
  id: idVersao('DEC', demandaId, versao),
  demandaId,
  versao,
  especificacaoId: idVersao('ESP', demandaId, 1),
  especificacaoVersao: 1,
  parecerRiscoId: idVersao('RSK', demandaId, 1),
  parecerRiscoVersao: 1,
  demandaTipo: 'melhoria' as const,
  demandaTitulo: 'Demanda ficticia',
  demandaDescricao: 'Descricao ficticia',
  resumoExecutivo: 'Resumo ficticio',
  opcaoA: { descricao: 'Opcao ficticia A' },
  opcaoB: { descricao: 'Opcao ficticia B' },
  nivelAprovacaoRequerido: 'cto' as const,
  autorTipo: 'pessoa' as const,
  autorId: 'u-ficticio',
  rascunhoAgente: false,
  criadaEm: AGORA,
});

function adiado() {
  let resolver!: () => void;
  const promessa = new Promise<void>((r) => {
    resolver = r;
  });
  return { promessa, resolver };
}

// Espera até haver `n` conexões deste banco paradas em espera de trava. Não mede tempo: só repete a consulta.
async function esperarBloqueio(n: number): Promise<void> {
  for (let i = 0; i < 1000; i++) {
    const r = await b.poolMigrator.query<{ n: number }>(
      "select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'",
    );
    if ((r.rows[0]?.n ?? 0) >= n) return;
    await new Promise((res) => setTimeout(res, 5));
  }
  throw new Error('nenhuma transação ficou esperando a trava');
}

const versoesGravadas = async (demandaId: string) =>
  (
    await b.db
      .select({ versao: especificacaoTecnica.versao })
      .from(especificacaoTecnica)
      .where(eq(especificacaoTecnica.demandaId, demandaId))
      .orderBy(asc(especificacaoTecnica.versao))
  ).map((l) => l.versao);

describe('travarDemanda', () => {
  it('devolve a linha da demanda', async () => {
    const id = await novaDemanda();
    const linha = await comTransacao(b.poolApp, ({ tx }) => travarDemanda(tx, id));
    expect(linha).toMatchObject({ id, titulo: 'Demanda ficticia', tipo: 'melhoria', status: 'nova' });
  });

  it('id inexistente → nao_encontrado, com a mensagem padrão', async () => {
    const tentativa = comTransacao(b.poolApp, ({ tx }) => travarDemanda(tx, 'DEM-20261022-9999'));
    await expect(tentativa).rejects.toBeInstanceOf(ErroDominio);
    await expect(tentativa).rejects.toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('segura a demanda até o fim da transação: outra trava da mesma demanda espera', async () => {
    const id = await novaDemanda();
    const aTravou = adiado();
    const liberarA = adiado();
    const ordem: string[] = [];
    const a = comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      aTravou.resolver();
      await liberarA.promessa;
      ordem.push('a terminou');
    });
    await aTravou.promessa;
    const outra = comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      ordem.push('b travou');
    });
    await esperarBloqueio(1);
    expect(ordem).toEqual([]);
    liberarA.resolver();
    await Promise.all([a, outra]);
    expect(ordem).toEqual(['a terminou', 'b travou']);
  });

  it('demandas diferentes não se esperam', async () => {
    const id1 = await novaDemanda();
    const id2 = await novaDemanda();
    const aTravou = adiado();
    const liberarA = adiado();
    const a = comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id1);
      aTravou.resolver();
      await liberarA.promessa;
    });
    await aTravou.promessa;
    // Se esperasse a trava de id1, esta transação não terminaria antes de liberar a primeira.
    const linha = await comTransacao(b.poolApp, ({ tx }) => travarDemanda(tx, id2));
    expect(linha.id).toBe(id2);
    liberarA.resolver();
    await a;
  });
});

describe('proximaVersao', () => {
  it.each([
    ['especificacao_tecnica', especificacaoTecnica],
    ['parecer_risco', parecerRisco],
    ['pacote_decisao', pacoteDecisao],
  ] as const)('%s sem versão gravada → 1', async (_nome, tabela) => {
    const id = await novaDemanda();
    expect(await comTransacao(b.poolApp, ({ tx }) => proximaVersao(tx, tabela, id))).toBe(1);
  });

  it('com v1 e v2 gravadas → 3, em cada uma das três tabelas', async () => {
    const id = await novaDemanda();
    await b.db.insert(especificacaoTecnica).values([linhaEsp(id, 1), linhaEsp(id, 2)]);
    await b.db.insert(parecerRisco).values([linhaRsk(id, 1), linhaRsk(id, 2)]);
    await b.db.insert(pacoteDecisao).values([linhaDec(id, 1), linhaDec(id, 2)]);
    await comTransacao(b.poolApp, async ({ tx }) => {
      expect(await proximaVersao(tx, especificacaoTecnica, id)).toBe(3);
      expect(await proximaVersao(tx, parecerRisco, id)).toBe(3);
      expect(await proximaVersao(tx, pacoteDecisao, id)).toBe(3);
    });
  });

  it('conta só as versões da própria demanda', async () => {
    const id = await novaDemanda();
    const outra = await novaDemanda();
    await b.db.insert(especificacaoTecnica).values([linhaEsp(outra, 1), linhaEsp(outra, 2), linhaEsp(outra, 3)]);
    await b.db.insert(especificacaoTecnica).values(linhaEsp(id, 1));
    expect(await comTransacao(b.poolApp, ({ tx }) => proximaVersao(tx, especificacaoTecnica, id))).toBe(2);
  });

  it('a versão nova vem depois da maior gravada, não da contagem', async () => {
    const id = await novaDemanda();
    await b.db.insert(especificacaoTecnica).values([linhaEsp(id, 1), linhaEsp(id, 4)]);
    expect(await comTransacao(b.poolApp, ({ tx }) => proximaVersao(tx, especificacaoTecnica, id))).toBe(5);
  });

  it('devolve número, não texto', async () => {
    const id = await novaDemanda();
    const v = await comTransacao(b.poolApp, ({ tx }) => proximaVersao(tx, parecerRisco, id));
    expect(typeof v).toBe('number');
  });
});

describe('CA-04.3: versões simultâneas da mesma demanda', () => {
  const criarVersao = (demandaId: string, depoisDaTrava?: () => Promise<void>) =>
    comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, demandaId);
      if (depoisDaTrava) await depoisDaTrava();
      const v = await proximaVersao(tx, especificacaoTecnica, demandaId);
      await tx.insert(especificacaoTecnica).values(linhaEsp(demandaId, v));
      return v;
    });

  it('a segunda espera a primeira e fica com v2', async () => {
    const id = await novaDemanda();
    const aTravou = adiado();
    const liberarA = adiado();
    const a = criarVersao(id, async () => {
      aTravou.resolver();
      await liberarA.promessa;
    });
    await aTravou.promessa;
    const segunda = criarVersao(id);
    await esperarBloqueio(1);
    liberarA.resolver();
    expect(await Promise.all([a, segunda])).toEqual([1, 2]);
    expect(await versoesGravadas(id)).toEqual([1, 2]);
  });

  it('duas criações em paralelo terminam em v1 e v2, sem repetir', async () => {
    const id = await novaDemanda();
    const r = await Promise.all([criarVersao(id), criarVersao(id)]);
    expect([...r].sort()).toEqual([1, 2]);
    expect(await versoesGravadas(id)).toEqual([1, 2]);
  });

  it('cinco criações em paralelo terminam em v1 a v5', async () => {
    const id = await novaDemanda();
    const r = await Promise.all([1, 2, 3, 4, 5].map(() => criarVersao(id)));
    expect([...r].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(await versoesGravadas(id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('sem a trava, a restrição única (demanda_id, versao) é a segunda barreira', async () => {
    const id = await novaDemanda();
    const aGravou = adiado();
    const liberarA = adiado();
    const a = comTransacao(b.poolApp, async ({ tx }) => {
      const v = await proximaVersao(tx, especificacaoTecnica, id);
      await tx.insert(especificacaoTecnica).values(linhaEsp(id, v));
      aGravou.resolver();
      await liberarA.promessa;
      return v;
    });
    await aGravou.promessa;
    const segunda = comTransacao(b.poolApp, async ({ tx }) => {
      const v = await proximaVersao(tx, especificacaoTecnica, id);
      await tx.insert(especificacaoTecnica).values(linhaEsp(id, v));
      return v;
    }).catch((e: unknown) => e);
    await esperarBloqueio(1);
    liberarA.resolver();
    expect(await a).toBe(1);
    expect(reduzirErro(await segunda).code).toBe('23505');
    expect(await versoesGravadas(id)).toEqual([1]);
  });

  it('a transação desfeita não deixa a versão gravada', async () => {
    const id = await novaDemanda();
    await comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      const v = await proximaVersao(tx, especificacaoTecnica, id);
      await tx.insert(especificacaoTecnica).values(linhaEsp(id, v));
      throw new Error('desfazer');
    }).catch(() => undefined);
    expect(await versoesGravadas(id)).toEqual([]);
    expect(await comTransacao(b.poolApp, ({ tx }) => proximaVersao(tx, especificacaoTecnica, id))).toBe(1);
  });
});

// Bordas acrescentadas na 06-T14-testes (qa-automacao). Cada teste cria a própria demanda; nenhum depende de outro.
describe('versões e trava: bordas', () => {
  const versoesRsk = async (demandaId: string) =>
    (
      await b.db
        .select({ versao: parecerRisco.versao })
        .from(parecerRisco)
        .where(eq(parecerRisco.demandaId, demandaId))
        .orderBy(asc(parecerRisco.versao))
    ).map((l) => l.versao);

  it('cada tabela tem a sua numeração: ESP até v3 não muda a próxima RSK nem a próxima DEC', async () => {
    const id = await novaDemanda();
    await b.db.insert(especificacaoTecnica).values([linhaEsp(id, 1), linhaEsp(id, 2), linhaEsp(id, 3)]);
    await comTransacao(b.poolApp, async ({ tx }) => {
      expect(await proximaVersao(tx, especificacaoTecnica, id)).toBe(4);
      expect(await proximaVersao(tx, parecerRisco, id)).toBe(1);
      expect(await proximaVersao(tx, pacoteDecisao, id)).toBe(1);
    });
  });

  it('CA-04.3: ESP e RSK criadas em paralelo na mesma demanda ficam cada uma com v1, sem erro', async () => {
    const id = await novaDemanda();
    const esp = comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      const v = await proximaVersao(tx, especificacaoTecnica, id);
      await tx.insert(especificacaoTecnica).values(linhaEsp(id, v));
      return v;
    });
    const rsk = comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      const v = await proximaVersao(tx, parecerRisco, id);
      await tx.insert(parecerRisco).values(linhaRsk(id, v));
      return v;
    });
    expect(await Promise.all([esp, rsk])).toEqual([1, 1]);
    expect(await versoesGravadas(id)).toEqual([1]);
    expect(await versoesRsk(id)).toEqual([1]);
  });

  it('a trava não impede a leitura simples da demanda (a fila e o detalhe não esperam)', async () => {
    const id = await novaDemanda();
    const aTravou = adiado();
    const liberarA = adiado();
    const a = comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      aTravou.resolver();
      await liberarA.promessa;
    });
    await aTravou.promessa;
    // Se a leitura esperasse a trava, esta consulta não terminaria antes de liberar a primeira transação.
    const linhas = await b.db.select({ id: demanda.id }).from(demanda).where(eq(demanda.id, id));
    expect(linhas).toEqual([{ id }]);
    liberarA.resolver();
    await a;
  });

  it.each(["DEM-20261022-0001' or '1'='1", "x'; drop table demanda; --"])(
    'travarDemanda com %j: nao_encontrado, sem erro de SQL e sem efeito',
    async (idMalicioso) => {
      await novaDemanda();
      const tentativa = comTransacao(b.poolApp, ({ tx }) => travarDemanda(tx, idMalicioso));
      await expect(tentativa).rejects.toBeInstanceOf(ErroDominio);
      await expect(tentativa).rejects.toMatchObject({ codigo: 'nao_encontrado' });
      const [linha] = await b.poolMigrator.query<{ existe: boolean }>("select to_regclass('public.demanda') is not null as existe").then((r) => r.rows);
      expect(linha?.existe).toBe(true);
    },
  );

  it('passada a v9999, a gravação da versão seguinte é recusada pelo banco (23514) e nada fora do formato fica gravado', async () => {
    const id = await novaDemanda();
    await b.db.insert(especificacaoTecnica).values(linhaEsp(id, 9999));
    const erro = await comTransacao(b.poolApp, async ({ tx }) => {
      await travarDemanda(tx, id);
      const v = await proximaVersao(tx, especificacaoTecnica, id);
      await tx.insert(especificacaoTecnica).values(linhaEsp(id, v));
    }).catch((e: unknown) => e);
    expect(reduzirErro(erro).code).toBe('23514');
    expect(await versoesGravadas(id)).toEqual([9999]);
  });

  it('id que não bate com a demanda e a versão é recusado pelo banco (23514)', async () => {
    const id = await novaDemanda();
    const erro = await b.db
      .insert(especificacaoTecnica)
      .values({ ...linhaEsp(id, 1), id: idVersao('ESP', id, 2) })
      .catch((e: unknown) => e);
    expect(reduzirErro(erro).code).toBe('23514');
    expect(await versoesGravadas(id)).toEqual([]);
  });
});

describe('idVersao e RE_ID_VERSAO', () => {
  it.each([
    ['ESP', 'DEM-20261022-0001', 1, 'ESP-DEM-20261022-0001-v1'],
    ['RSK', 'DEM-20261022-0042', 12, 'RSK-DEM-20261022-0042-v12'],
    ['DEC', 'DEM-20261023-9999', 9999, 'DEC-DEM-20261023-9999-v9999'],
  ] as const)('%s de %s na versão %d → %s', (prefixo, demandaId, versao, esperado) => {
    expect(idVersao(prefixo, demandaId, versao)).toBe(esperado);
    expect(esperado).toMatch(RE_ID_VERSAO);
  });

  it('o id montado é o que o banco confere (check de id derivado)', async () => {
    const id = await novaDemanda();
    await b.db.insert(especificacaoTecnica).values(linhaEsp(id, 1));
    const [linha] = await b.db
      .select({ id: especificacaoTecnica.id })
      .from(especificacaoTecnica)
      .where(and(eq(especificacaoTecnica.demandaId, id), eq(especificacaoTecnica.versao, 1)));
    expect(linha?.id).toBe(`ESP-${id}-v1`);
  });

  const AMOSTRAS = [
    'ESP-DEM-20261022-0001-v1',
    'RSK-DEM-20261022-0001-v12',
    'DEC-DEM-20261022-0001-v9999',
    'DEC-DEM-20261022-0001-v10000',
    'DEC-DEM-20261022-0001-v',
    'DEC-DEM-20261022-0001',
    'ABC-DEM-20261022-0001-v1',
    'esp-DEM-20261022-0001-v1',
    'ESP-DEM-2026102-0001-v1',
    'ESP-DEM-20261022-0001-v1 ',
    'DEM-20261022-0001',
    '',
  ];

  it.each(AMOSTRAS)('%j: aceita só se alguma regex de rota() aceita (G3.10)', (s) => {
    const daRota = (['ESP', 'RSK', 'DEC'] as const).some((p) => reIdVersao(p).test(s));
    expect(RE_ID_VERSAO.test(s)).toBe(daRota);
  });

  it('aceita as três formas válidas e recusa as inválidas', () => {
    expect(AMOSTRAS.filter((s) => RE_ID_VERSAO.test(s))).toEqual(['ESP-DEM-20261022-0001-v1', 'RSK-DEM-20261022-0001-v12', 'DEC-DEM-20261022-0001-v9999']);
  });
});
