'use server';

// Server Action da T08 Novo parecer de risco (RF-09, RF-19): a mesma regra de POST /api/demandas/:id/pareceres-risco
// (criarParecerRisco, T19), com o schema da API e a mesma autorização, pelo adaptador único do painel (acaoDoPainel,
// C-04). O id da demanda passa pela regex antes de tocar o banco (C-17); a autoria vem só da sessão (C-11: o schema
// descarta chave desconhecida). Além do schema da API, só `versaoEsperada`: a versão que a tela anunciou, para o aviso
// de conflito (03, T08, como T07). A resposta leva só ids: a versão gravada, se houve conflito e o DEC pendente que esta
// versão deixou desatualizado (03, T08, Sucesso). Nada dos campos volta ao navegador nem vai ao log (C-21).
import { z } from 'zod';
import type { ResultadoGravacaoParecer } from '../../../../../../components/dados-do-parecer';
import { acaoDoPainel, type ResultadoAcao } from '../../../../../../lib/acao-painel';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../../../modules/demandas/gerar-id';
import { criarParecerRiscoSchema } from '../../../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../../../modules/pareceres-risco/servico';

const gravacaoSchema = criarParecerRiscoSchema.extend({
  demandaId: z.string().regex(RE_ID_DEMANDA),
  versaoEsperada: z.number().int().min(1).max(9999),
});

const gravar = acaoDoPainel({ acao: 'criar_parecer_risco', entrada: gravacaoSchema }, async ({ ator, entrada, deps }): Promise<ResultadoGravacaoParecer> => {
  const { demandaId, versaoEsperada, ...parecer } = entrada;
  // Os pacotes pendentes em dia antes da gravação: os que estiverem desatualizados depois foram desatualizados por ela.
  autorizar(ator, 'ler_demanda');
  const antes = await obterDemanda(deps.db, demandaId);
  const emDia = new Set(antes.pacotesDecisao.filter((p) => p.statusDecisao === 'pendente' && !p.desatualizado).map((p) => p.id));
  const rsk = await criarParecerRisco(deps, ator, demandaId, parecer);
  let decDesatualizado: string | null = null;
  if (emDia.size > 0) {
    const depois = await obterDemanda(deps.db, demandaId);
    decDesatualizado = depois.pacotesDecisao.find((p) => emDia.has(p.id) && p.statusDecisao === 'pendente' && p.desatualizado)?.id ?? null;
  }
  return { id: rsk.id, demandaId, conflito: rsk.versao !== versaoEsperada, decDesatualizado };
});

export async function gravarParecerNoPainel(entrada: unknown): Promise<ResultadoAcao<ResultadoGravacaoParecer>> {
  return gravar(entrada);
}
