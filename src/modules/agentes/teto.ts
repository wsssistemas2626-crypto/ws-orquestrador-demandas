// Teto de gasto mensal com IA (RF-18, RNF-07, P1-f). O teto é uma linha só em configuracao_ia, em USD, e nasce 0: nada
// chama o provedor até o CTO definir um valor (CA-18.3). O gasto do mês é a soma de uso_ia.custo no mês civil de São
// Paulo, pelo relógio injetado (RNF-15); gasto ≥ teto suspende os agentes, e teto 0 é sempre suspenso. A conferência
// antes de cada chamada é da execução (T27, C-26); aqui ficam a leitura, a regra e a alteração, só pelo CTO (C-12).
import { and, eq, gte, lt, sum } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db';
import { configuracaoIa, usoIa } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import { dataIsoSaoPaulo, inicioDoMesSaoPaulo, inicioDoProximoMesSaoPaulo } from '../../lib/fuso';
import type { Relogio } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import type { DepsDemanda } from '../demandas/servico';
import { registrarEvento } from '../historico/registrar';

// Textos da 03 (T12).
export const MENSAGENS_TETO = {
  formato: 'Informe o teto com até duas casas decimais, por exemplo 10,00.',
  negativo: 'O teto não pode ser negativo.',
} as const;

// Até 10 dígitos inteiros e 2 casas, com vírgula ou ponto: o numeric(12, 2) de configuracao_ia.teto_mensal.
const RE_TETO = /^\d{1,10}([.,]\d{1,2})?$/;

// As duas mensagens saem como issue `custom`, que o mapeador de erro devolve como estão (e sem o valor recebido).
export const definirTetoSchema = z.object({
  tetoMensal: z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      if (RE_TETO.test(v)) return;
      const negativo = v.startsWith('-') && RE_TETO.test(v.slice(1).trim());
      ctx.addIssue({ code: 'custom', message: negativo ? MENSAGENS_TETO.negativo : MENSAGENS_TETO.formato });
    }),
});
export type DefinirTeto = z.output<typeof definirTetoSchema>;

export type SituacaoTeto = {
  tetoMensal: number;
  moeda: 'USD';
  gastoDoMes: number;
  percentual: number;
  suspenso: boolean;
  // 'AAAA-MM' do mês civil de São Paulo.
  mesReferencia: string;
  // Meia-noite do dia 1º do mês seguinte, em São Paulo: quando o gasto volta a zero.
  viraEm: Date;
};

// Soma do custo das chamadas do mês civil corrente de São Paulo: [início do mês, início do mês seguinte). É a forma da
// consulta que sai pelo índice uso_ia_ocorrido_idx (T06).
export async function gastoDoMes(db: Db, relogio: Relogio): Promise<number> {
  const agora = relogio.agora();
  const [linha] = await db
    .select({ total: sum(usoIa.custo) })
    .from(usoIa)
    .where(and(gte(usoIa.ocorridoEm, inicioDoMesSaoPaulo(agora)), lt(usoIa.ocorridoEm, inicioDoProximoMesSaoPaulo(agora))));
  return Number(linha?.total ?? 0);
}

// Gasto ≥ teto suspende; com teto 0, o gasto (nunca negativo) sempre o alcança.
export const estaSuspenso = (gasto: number, teto: number): boolean => gasto >= teto;

// Inteiro, sem arredondar para cima: 99,99 % aparece como 99, e não como 100 com os agentes ainda rodando. Passa de 100
// quando a última chamada ultrapassa o teto (RNF-07). Com teto 0 não há proporção: o painel mostra o alerta de teto não
// definido.
const percentualDo = (gasto: number, teto: number): number => (teto > 0 ? Math.floor((gasto * 100) / teto + 1e-9) : 0);

async function tetoGravado(db: Db): Promise<number> {
  const [linha] = await db.select({ teto: configuracaoIa.tetoMensal }).from(configuracaoIa).where(eq(configuracaoIa.id, 1));
  // A linha nasce na migration (T06) e o app não a apaga; sem ela, o teto vale 0 (suspenso), nunca "sem limite".
  return Number(linha?.teto ?? 0);
}

export async function situacaoDoTeto(db: Db, relogio: Relogio): Promise<SituacaoTeto> {
  const agora = relogio.agora();
  const [tetoMensal, gasto] = [await tetoGravado(db), await gastoDoMes(db, relogio)];
  return {
    tetoMensal,
    moeda: 'USD',
    gastoDoMes: gasto,
    percentual: percentualDo(gasto, tetoMensal),
    suspenso: estaSuspenso(gasto, tetoMensal),
    mesReferencia: dataIsoSaoPaulo(inicioDoMesSaoPaulo(agora)).slice(0, 7),
    viraEm: inicioDoProximoMesSaoPaulo(agora),
  };
}

// Só o CTO (C-12, C-26): `autorizar` também protege a chamada direta, fora da rota. A linha é travada para o "antes" do
// evento ser o valor que a alteração substituiu. O mesmo valor de novo não grava nem gera evento. Aceita a transação de
// quem chama (G3.8).
export async function definirTeto(deps: DepsDemanda, ator: AtorPessoa, e: DefinirTeto, t?: Transacao): Promise<SituacaoTeto> {
  autorizar(ator, 'alterar_teto');
  const novo = e.tetoMensal.replace(',', '.');

  const corpo = async ({ tx }: Transacao): Promise<SituacaoTeto> => {
    const [atual] = await tx.select({ teto: configuracaoIa.tetoMensal }).from(configuracaoIa).where(eq(configuracaoIa.id, 1)).for('update');
    const antes = Number(atual?.teto ?? 0);
    if (Number(novo) !== antes) {
      await tx
        .update(configuracaoIa)
        .set({ tetoMensal: novo, atualizadoEm: deps.relogio.agora(), atualizadoPor: ator.usuarioId })
        .where(eq(configuracaoIa.id, 1));
      await registrarEvento(
        tx,
        {
          ator,
          demandaId: null,
          entidade: 'configuracao_ia',
          entidadeId: '1',
          acao: 'teto_alterado',
          antes: { tetoMensal: antes },
          depois: { tetoMensal: Number(novo) },
        },
        deps.relogio,
      );
    }
    return situacaoDoTeto(tx, deps.relogio);
  };

  return t ? corpo(t) : comTransacao(deps.pool, corpo);
}
