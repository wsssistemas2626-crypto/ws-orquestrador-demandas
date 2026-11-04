// POST /api/demandas/:id/especificacoes (criarEspecificacaoSchema) → 201 EspecificacaoVista; GET → 200 { itens }, da
// mais nova para a mais antiga (RF-08). Adaptadores finos sobre o serviço: autorização, Zod e erro ficam em rota(); a
// autoria vem só do ator (C-11). O id da demanda passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
import { nomesDaDemanda } from '../../../../../modules/demandas/consultas';
// M-2 do 0008: no GET, cada item segue vistaDaEspecificacaoPara. M-a do 0009: o 201 do POST também, e o texto livre sai
// minimizado para quem não é pessoa, com o nome do solicitante da demanda do caminho.
import { listarEspecificacoes, vistaDaEspecificacaoPara } from '../../../../../modules/especificacoes/consultas';
import { criarEspecificacaoSchema } from '../../../../../modules/especificacoes/schemas';
import { criarEspecificacaoComNomes } from '../../../../../modules/especificacoes/servico';

export const POST = rota(
  { acao: 'criar_especificacao', rota: '/api/demandas/[id]/especificacoes', params: paramId.demanda, corpo: criarEspecificacaoSchema },
  async ({ deps, ator, params, corpo }) => {
    // B-3 do 0010: os nomes vêm do serviço, tirados da linha da demanda travada, na mesma transação da gravação. Uma
    // renomeação no meio não sai em claro no 201, e se a conta falhar nada foi gravado (B-3 do 0009). Demanda que não
    // existe continua com o 404 do serviço.
    const { vista, nomes } = await criarEspecificacaoComNomes(deps, ator, params.id, corpo);
    return { status: 201, json: vistaDaEspecificacaoPara(ator, vista, nomes) };
  },
);

export const GET = rota({ acao: 'ler_especificacao', rota: '/api/demandas/[id]/especificacoes', params: paramId.demanda }, async ({ deps, ator, params }) => {
  const itens = await listarEspecificacoes(deps.db, params.id);
  const nomes = await nomesDaDemanda(deps.db, params.id);
  return { json: { itens: itens.map((v) => vistaDaEspecificacaoPara(ator, v, nomes)) } };
});
