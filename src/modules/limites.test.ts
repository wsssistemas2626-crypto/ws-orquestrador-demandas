// Limite por ator (C-36): 30 demandas e 60 artefatos (ESP, RSK e DEC somados) por hora. Postgres real, papel do app,
// relógio fixo. Cada teste usa um ator próprio, para a contagem de um não entrar na do outro.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDb } from '../db';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../db/schema';
import { comTransacao } from '../db/transacao';
import { ErroDominio } from '../lib/erros';
import { relogioFixo } from '../lib/relogio';
import type { AtorAgente, AtorPessoa, AtorSistema } from './acesso/ator';
import { conferirLimite, LIMITE_POR_HORA, MENSAGEM_LIMITE } from './limites';
import { idVersao } from './versoes';

const AGORA = '2026-10-22T12:00:00Z';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

let seq = 0;
const pessoa = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-lim-${++seq}`, nome: 'Pessoa Ficticia', papel: 'cto' });

type Autor = { autorTipo: 'pessoa' | 'agente'; autorId: string };
const autorDe = (a: AtorPessoa | AtorAgente): Autor =>
  a.tipo === 'pessoa' ? { autorTipo: 'pessoa', autorId: a.usuarioId } : { autorTipo: 'agente', autorId: a.agente };

let nDemanda = 0;
async function inserirDemandas(autor: Autor, quantas: number, criadaEm: Date): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < quantas; i++) {
    nDemanda += 1;
    const id = `DEM-20261022-${String(nDemanda).padStart(4, '0')}`;
    ids.push(id);
    await criarDb(b.poolMigrator)
      .insert(demanda)
      .values({ id, titulo: 'Demanda ficticia', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia', ...autor, criadaEm, atualizadaEm: criadaEm });
  }
  return ids;
}

// Uma demanda de outro autor recebe `quantas` versões de ESP, RSK e DEC, nesta ordem, até somar `quantas` artefatos.
async function inserirArtefatos(autor: Autor, quantas: number, criadaEm: Date): Promise<void> {
  const db = criarDb(b.poolMigrator);
  const [dem] = await inserirDemandas({ autorTipo: 'pessoa', autorId: 'u-lim-outro' }, 1, criadaEm);
  const comum = { demandaId: dem!, ...autor, rascunhoAgente: autor.autorTipo === 'agente', criadaEm };
  // ESP v1 e RSK v1 de outro autor, para o DEC ter o que citar sem contar para o autor do teste.
  await db.insert(especificacaoTecnica).values({ ...comum, autorTipo: 'pessoa', autorId: 'u-lim-outro', rascunhoAgente: false, id: idVersao('ESP', dem!, 1), versao: 1, descricaoObjetiva: 'x', escopoInclui: ['x'] });
  await db.insert(parecerRisco).values({ ...comum, autorTipo: 'pessoa', autorId: 'u-lim-outro', rascunhoAgente: false, id: idVersao('RSK', dem!, 1), versao: 1, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
  for (let i = 0; i < quantas; i++) {
    const versao = Math.floor(i / 3) + 2;
    if (i % 3 === 0) await db.insert(especificacaoTecnica).values({ ...comum, id: idVersao('ESP', dem!, versao), versao, descricaoObjetiva: 'x', escopoInclui: ['x'] });
    else if (i % 3 === 1)
      await db.insert(parecerRisco).values({ ...comum, id: idVersao('RSK', dem!, versao), versao, riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
    else
      await db.insert(pacoteDecisao).values({
        ...comum,
        id: idVersao('DEC', dem!, versao - 1),
        versao: versao - 1,
        especificacaoId: idVersao('ESP', dem!, 1),
        especificacaoVersao: 1,
        parecerRiscoId: idVersao('RSK', dem!, 1),
        parecerRiscoVersao: 1,
        demandaTipo: 'melhoria',
        demandaTitulo: 'x',
        demandaDescricao: 'x',
        resumoExecutivo: 'x',
        opcaoA: { descricao: 'A' },
        opcaoB: { descricao: 'B' },
        nivelAprovacaoRequerido: 'cto',
      });
  }
}

const conferir = (ator: AtorPessoa | AtorAgente | AtorSistema, tipo: 'demanda' | 'artefato', iso = AGORA) =>
  comTransacao(b.poolApp, ({ tx }) => conferirLimite(tx, ator, tipo, relogioFixo(iso)));

describe('conferirLimite', () => {
  it('os limites são 30 demandas e 60 artefatos por hora', () => {
    expect(LIMITE_POR_HORA).toEqual({ demanda: 30, artefato: 60 });
  });

  it('C-36: com 29 demandas na hora passa; com 30, responde limite_excedido (429) com a mensagem', async () => {
    const a = pessoa();
    await inserirDemandas(autorDe(a), 29, new Date('2026-10-22T11:30:00Z'));
    await expect(conferir(a, 'demanda')).resolves.toBeUndefined();
    await inserirDemandas(autorDe(a), 1, new Date('2026-10-22T11:59:00Z'));
    const e = await conferir(a, 'demanda').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.demanda });
  });

  it('C-36: a janela é a última hora; o que tem uma hora ou mais não conta', async () => {
    const a = pessoa();
    await inserirDemandas(autorDe(a), 30, new Date('2026-10-22T11:00:00Z'));
    await expect(conferir(a, 'demanda', '2026-10-22T11:59:59Z')).rejects.toMatchObject({ codigo: 'limite_excedido' });
    await expect(conferir(a, 'demanda', '2026-10-22T12:00:00Z')).resolves.toBeUndefined();
  });

  it('a contagem é por ator: outra pessoa, o mesmo id como agente e o artefato não entram na conta da demanda', async () => {
    const a = pessoa();
    await inserirDemandas(autorDe(a), 30, new Date('2026-10-22T11:30:00Z'));
    await expect(conferir(pessoa(), 'demanda')).resolves.toBeUndefined();
    await expect(conferir(a, 'artefato')).resolves.toBeUndefined();
  });

  it('agente conta pelo nome do agente, com o prefixo de token que for', async () => {
    await inserirDemandas({ autorTipo: 'agente', autorId: 'orquestrador' }, 30, new Date('2026-10-22T11:30:00Z'));
    await expect(conferir({ tipo: 'agente', agente: 'orquestrador', prefixoToken: 'Ab3dE5gH' }, 'demanda')).rejects.toMatchObject({ codigo: 'limite_excedido' });
    await expect(conferir({ tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, 'demanda')).rejects.toMatchObject({ codigo: 'limite_excedido' });
    await expect(conferir({ tipo: 'agente', agente: 'risco', prefixoToken: null }, 'demanda')).resolves.toBeUndefined();
  });

  it('C-36: artefatos de ESP, RSK e DEC somam; 59 passa, 60 responde 429 com a mensagem', async () => {
    const a = pessoa();
    await inserirArtefatos(autorDe(a), 59, new Date('2026-10-22T11:30:00Z'));
    await expect(conferir(a, 'artefato')).resolves.toBeUndefined();
    await inserirArtefatos(autorDe(a), 1, new Date('2026-10-22T11:31:00Z'));
    await expect(conferir(a, 'artefato')).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    await expect(conferir(a, 'artefato', '2026-10-22T12:31:00Z')).resolves.toBeUndefined();
  });

  it('agente de risco com 60 RSK na hora responde 429', async () => {
    const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };
    await inserirArtefatos(autorDe(risco), 60, new Date('2026-10-22T11:45:00Z'));
    await expect(conferir(risco, 'artefato')).rejects.toMatchObject({ codigo: 'limite_excedido' });
  });

  it('o ator sistema não cria demanda nem artefato e não é contado', async () => {
    await expect(conferir({ tipo: 'sistema' }, 'demanda')).resolves.toBeUndefined();
  });

  it('a mensagem não cita o ator', () => {
    for (const m of Object.values(MENSAGEM_LIMITE)) {
      // "pareceres de risco" é o nome do artefato; o que não pode aparecer é id de conta, de agente ou de token.
      expect(m).not.toMatch(/u-lim|orquestrador|insumo_tecnico|consolidacao|Ab3dE5gH/);
      expect(m.length).toBeGreaterThan(10);
    }
  });

  it('a trava por ator dura até o fim da transação: a segunda conferência do mesmo ator espera a primeira', async () => {
    const a = pessoa();
    let soltar!: () => void;
    const segura = new Promise<void>((r) => {
      soltar = r;
    });
    let primeiraConferiu!: () => void;
    const conferiu = new Promise<void>((r) => {
      primeiraConferiu = r;
    });
    const ordem: string[] = [];
    const primeira = comTransacao(b.poolApp, async ({ tx }) => {
      await conferirLimite(tx, a, 'demanda', relogioFixo(AGORA));
      primeiraConferiu();
      await segura;
      ordem.push('primeira terminou');
    });
    await conferiu;
    const segunda = comTransacao(b.poolApp, async ({ tx }) => {
      await conferirLimite(tx, a, 'demanda', relogioFixo(AGORA));
      ordem.push('segunda conferiu');
    });
    // A segunda fica parada na trava enquanto a primeira não termina.
    for (let i = 0; i < 1000; i++) {
      const r = await b.poolMigrator.query<{ n: number }>(
        "select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'",
      );
      if ((r.rows[0]?.n ?? 0) >= 1) break;
      await new Promise((res) => setTimeout(res, 5));
    }
    expect(ordem).toEqual([]);
    soltar();
    await Promise.all([primeira, segunda]);
    expect(ordem).toEqual(['primeira terminou', 'segunda conferiu']);
  });

  it('a trava é por ator: outro ator não espera', async () => {
    const a = pessoa();
    const outro = pessoa();
    let soltar!: () => void;
    const segura = new Promise<void>((r) => {
      soltar = r;
    });
    let conferiu!: () => void;
    const jaConferiu = new Promise<void>((r) => {
      conferiu = r;
    });
    const primeira = comTransacao(b.poolApp, async ({ tx }) => {
      await conferirLimite(tx, a, 'demanda', relogioFixo(AGORA));
      conferiu();
      await segura;
    });
    await jaConferiu;
    await expect(conferir(outro, 'demanda')).resolves.toBeUndefined();
    soltar();
    await primeira;
  });
});
