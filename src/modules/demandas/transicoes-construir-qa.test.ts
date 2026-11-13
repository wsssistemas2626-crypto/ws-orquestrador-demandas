// Escrito na 06-T05-testes (qa-automacao) do DEC-DEM-20261111-0017-v1. O que o teste do plano
// (transicoes-construir.test.ts) deixa aberto em mudarStatusPeloConstruir (ADR-34, AN-04, AN-06, RF-05, CA-05.x):
//   - CA-05.10 no banco: as 9 origens × 3 statusConstrucao × 2 tipos, com o status final, o atualizada_em e os eventos
//     conferidos, e o resultado igual ao de decidirPorStatus (D-08);
//   - CA-05.2 por inteiro: o status_alterado do cancelado, com ator, prefixo e o relógio injetado;
//   - CA-06.4: o prefixo gravado é o do token usado, não um valor fixo;
//   - AN-06: sem transação própria; se quem chama desfaz, nada fica (nem status nem evento);
//   - AN-04 e Minor 2 da 06-T05-revisao: as recusas de ator nas duas transições, sem evento; integração com nome
//     parecido com "construir" e tipo de ator desconhecido também lançam sem tocar o banco.
// Postgres real (Testcontainers), relógio fixo, demanda gravada pelo migrator. Dados fictícios. Cada teste cria a
// própria demanda: não depende de ordem.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao } from '../../../test/integracoes';
import { STATUS_CONSTRUCAO, type StatusConstrucao } from '../../db/schema/andamento';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import type { Ator } from '../acesso/ator';
import { decidirPorStatus } from '../andamento/regras';
import { mudarStatusPeloConstruir } from './transicoes';
import type { Status, Tipo } from './schemas';

const CRIADA = new Date('2026-11-12T10:00:00Z');
const relogio = relogioFixo('2026-11-12T14:30:00Z');
const PREFIXO = 'qa000005';
const construir = atorDeIntegracao('construir', PREFIXO);
let b: BancoDeTeste;
let n = 0;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

async function demandaEm(status: Status, tipo: Tipo = 'melhoria') {
  const id = `DEM-20261112-${String(5000 + ++n).padStart(4, '0')}`;
  await b.poolMigrator.query(
    `insert into demanda (id, titulo, tipo, status, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', $2, $3, 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $4, $4)`,
    [id, tipo, status, CRIADA],
  );
  return { id, status, tipo };
}
const mudar = (ator: Ator, d: { id: string; status: Status; tipo: Tipo }, sc: StatusConstrucao) =>
  comTransacao(b.poolApp, (t) => mudarStatusPeloConstruir(t, { relogio }, ator, d, sc));
const linha = async (id: string) =>
  (await b.poolMigrator.query(`select status, tipo, atualizada_em from demanda where id = $1`, [id])).rows[0] as { status: string; tipo: string; atualizada_em: Date };
const eventos = async (id: string) =>
  (
    await b.poolMigrator.query(
      `select ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, entidade, entidade_id, acao, antes, depois from evento where demanda_id = $1 order by id`,
      [id],
    )
  ).rows;

const STATUS: readonly Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida', 'entregue', 'encerrada'];
const TIPOS = ['melhoria', 'estudo'] as const satisfies readonly Tipo[];

describe('CA-05.10 no banco: 9 origens × 3 statusConstrucao × 2 tipos', () => {
  for (const tipo of TIPOS)
    for (const status of STATUS)
      for (const sc of STATUS_CONSTRUCAO)
        it(`${tipo} ${status} + ${sc}: o status final é o da tabela, nunca entregue nem encerrada por este envio`, async () => {
          const d = await demandaEm(status, tipo);
          const decisao = decidirPorStatus({ status, tipo }, sc);
          // A recusa (409) é do serviço (T07), antes de chamar a transição; aqui, a transição não tem regra e não toca nada.
          const esperado = decisao.tipo === 'grava' ? decisao.para : null;
          const para = await mudar(construir, d, sc);
          expect(para).toBe(esperado);
          const depois = await linha(d.id);
          expect(depois.tipo).toBe(tipo);
          if (esperado === null) {
            expect(depois).toEqual({ status, tipo, atualizada_em: CRIADA });
            expect(await eventos(d.id)).toEqual([]);
            return;
          }
          expect(['entregue', 'encerrada']).not.toContain(depois.status);
          expect(depois).toEqual({ status: esperado, tipo, atualizada_em: relogio.agora() });
          expect(await eventos(d.id)).toEqual([
            {
              ocorrido_em: relogio.agora(),
              ator_tipo: 'integracao',
              ator_id: 'construir',
              ator_token_prefixo: PREFIXO,
              entidade: 'demanda',
              entidade_id: d.id,
              acao: 'status_alterado',
              antes: { status },
              depois: { status: esperado },
            },
          ]);
        });

  it('as duas únicas mudanças acontecem só nas origens fixas (contagem sobre a tabela inteira)', () => {
    const mudam: string[] = [];
    for (const tipo of TIPOS)
      for (const status of STATUS)
        for (const sc of STATUS_CONSTRUCAO) {
          const d = decidirPorStatus({ status, tipo }, sc);
          if (d.tipo === 'grava' && d.para !== null) mudam.push(`${tipo} ${status} + ${sc} → ${d.para}`);
        }
    expect(mudam).toEqual([
      'melhoria aprovada + em_construcao → em_construcao',
      'melhoria em_construcao + cancelado → devolvida',
      'estudo em_construcao + cancelado → devolvida',
    ]);
  });
});

describe('CA-05.2 e CA-06.4: o evento do cancelado e o prefixo do token usado', () => {
  it('em_construcao + cancelado → devolvida, com status_alterado do construir, o prefixo do token e o relógio injetado', async () => {
    const outroRelogio = relogioFixo('2026-11-12T15:45:00Z');
    const d = await demandaEm('em_construcao');
    const ator = atorDeIntegracao('construir', 'qa000099');
    expect(await comTransacao(b.poolApp, (t) => mudarStatusPeloConstruir(t, { relogio: outroRelogio }, ator, d, 'cancelado'))).toBe('devolvida');
    expect(await linha(d.id)).toEqual({ status: 'devolvida', tipo: 'melhoria', atualizada_em: outroRelogio.agora() });
    expect(await eventos(d.id)).toEqual([
      {
        ocorrido_em: outroRelogio.agora(),
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: 'qa000099',
        entidade: 'demanda',
        entidade_id: d.id,
        acao: 'status_alterado',
        antes: { status: 'em_construcao' },
        depois: { status: 'devolvida' },
      },
    ]);
  });

  it('a transição usa o status recebido da trava, sem reler a demanda: origem diferente da gravada não casa regra', async () => {
    // Quem chama passa a linha da trava (AN-04). Se a linha recebida diz devolvida, nada muda, mesmo com a gravada em aprovada.
    const d = await demandaEm('aprovada');
    expect(await mudar(construir, { ...d, status: 'devolvida' }, 'em_construcao')).toBeNull();
    expect(await linha(d.id)).toEqual({ status: 'aprovada', tipo: 'melhoria', atualizada_em: CRIADA });
    expect(await eventos(d.id)).toEqual([]);
  });
});

describe('AN-06: sem transação própria', () => {
  it('se a transação de quem chama é desfeita depois da mudança, não fica status nem evento', async () => {
    const d = await demandaEm('aprovada');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        expect(await mudarStatusPeloConstruir(t, { relogio }, construir, d, 'em_construcao')).toBe('em_construcao');
        throw new Error('falha ficticia depois da mudança');
      }),
    ).rejects.toThrow('falha ficticia depois da mudança');
    expect(await linha(d.id)).toEqual({ status: 'aprovada', tipo: 'melhoria', atualizada_em: CRIADA });
    expect(await eventos(d.id)).toEqual([]);
  });

  it('a mudança e o evento ficam juntos na mesma transação de quem chama', async () => {
    const d = await demandaEm('em_construcao');
    await comTransacao(b.poolApp, async (t) => {
      await mudarStatusPeloConstruir(t, { relogio }, construir, d, 'cancelado');
    });
    expect((await linha(d.id)).status).toBe('devolvida');
    expect(await eventos(d.id)).toHaveLength(1);
  });
});

describe('AN-04: só a integração construir muda status por aqui (Minor 2 da 06-T05-revisao)', () => {
  const recusados: [string, Ator][] = [
    ['awave', atorDeIntegracao('awave', PREFIXO)],
    ['integração "Construir" (caixa trocada)', { tipo: 'integracao', integracao: 'Construir', prefixoToken: PREFIXO } as unknown as Ator],
    ['integração "construir " (espaço)', { tipo: 'integracao', integracao: 'construir ', prefixoToken: PREFIXO } as unknown as Ator],
    ['sistema', { tipo: 'sistema' }],
    ['pessoa cto', { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' }],
    ['pessoa administradora', { tipo: 'pessoa', usuarioId: 'u-ficticio-2', nome: 'Pessoa Ficticia Dois', papel: 'administradora' }],
    ['agente', { tipo: 'agente', agente: 'orquestrador', prefixoToken: PREFIXO }],
    ['tipo de ator desconhecido', { tipo: 'robo', integracao: 'construir', prefixoToken: PREFIXO } as unknown as Ator],
  ];
  for (const [origem, sc] of [['aprovada', 'em_construcao'], ['em_construcao', 'cancelado']] as const)
    it.each(recusados)(`%s, em ${origem} + ${sc}: lança, e a demanda e o histórico ficam como estavam`, async (_n, ator) => {
      const d = await demandaEm(origem);
      await expect(mudar(ator, d, sc)).rejects.toThrow();
      expect(await linha(d.id)).toEqual({ status: origem, tipo: 'melhoria', atualizada_em: CRIADA });
      expect(await eventos(d.id)).toEqual([]);
    });

  it('ator recusado lança mesmo quando não haveria regra (a autorização vem antes da tabela)', async () => {
    const d = await demandaEm('devolvida');
    await expect(mudar(atorDeIntegracao('awave', PREFIXO), d, 'construido')).rejects.toThrow();
    expect(await eventos(d.id)).toEqual([]);
  });
});
