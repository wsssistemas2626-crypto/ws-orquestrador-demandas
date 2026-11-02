'use server';

// Server Action da T07 Nova versão da ESP (RF-08, RF-15): a mesma regra de POST /api/demandas/:id/especificacoes
// (criarEspecificacao, T18), com o schema da API e a mesma autorização, pelo adaptador único do painel (acaoDoPainel,
// C-04). O id da demanda passa pela regex antes de tocar o banco (C-17); a autoria vem só da sessão (C-11: o schema
// descarta chave desconhecida). Além do schema da API, só `versaoEsperada`: a versão que a tela anunciou, para o aviso
// de conflito (03, T07). A resposta leva só ids: a versão gravada, se houve conflito e o DEC pendente que esta versão
// deixou desatualizado (03, T07, Sucesso). Nada dos campos volta ao navegador nem vai ao log (C-21).
import { z } from 'zod';
import type { ResultadoGravacao } from '../../../../../../components/dados-da-especificacao';
import { acaoDoPainel, type ResultadoAcao } from '../../../../../../lib/acao-painel';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import { obterDemanda } from '../../../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../../../modules/demandas/gerar-id';
import { criarEspecificacaoSchema } from '../../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../../modules/especificacoes/servico';

const gravacaoSchema = criarEspecificacaoSchema.extend({
  demandaId: z.string().regex(RE_ID_DEMANDA),
  versaoEsperada: z.number().int().min(1).max(9999),
});

const gravar = acaoDoPainel({ acao: 'criar_especificacao', entrada: gravacaoSchema }, async ({ ator, entrada, deps }): Promise<ResultadoGravacao> => {
  const { demandaId, versaoEsperada, ...especificacao } = entrada;
  // Os pacotes pendentes em dia antes da gravação: os que estiverem desatualizados depois foram desatualizados por ela.
  autorizar(ator, 'ler_demanda');
  const antes = await obterDemanda(deps.db, demandaId);
  const emDia = new Set(antes.pacotesDecisao.filter((p) => p.statusDecisao === 'pendente' && !p.desatualizado).map((p) => p.id));
  const esp = await criarEspecificacao(deps, ator, demandaId, especificacao);
  let decDesatualizado: string | null = null;
  if (emDia.size > 0) {
    const depois = await obterDemanda(deps.db, demandaId);
    decDesatualizado = depois.pacotesDecisao.find((p) => emDia.has(p.id) && p.statusDecisao === 'pendente' && p.desatualizado)?.id ?? null;
  }
  return { id: esp.id, demandaId, conflito: esp.versao !== versaoEsperada, decDesatualizado };
});

export async function gravarEspecificacaoNoPainel(entrada: unknown): Promise<ResultadoAcao<ResultadoGravacao>> {
  return gravar(entrada);
}
