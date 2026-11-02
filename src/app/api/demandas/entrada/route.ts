// POST /api/demandas/entrada (entradaSchema) → 201 { demanda } no modo manual; 202 { entradaId } no modo agente, a
// partir da T28 (até lá, 409 com a mensagem da tela). Só pessoa (`registrar_entrada`). O texto colado nunca volta na
// resposta nem vai ao log (RF-06, C-21).
import { rota } from '../../../../lib/rota';
import { exigirAtorPessoa } from '../../../../modules/acesso/ator-pessoa';
import { entradaSchema, registrarEntrada } from '../../../../modules/demandas/entrada';

export const POST = rota({ acao: 'registrar_entrada', rota: '/api/demandas/entrada', corpo: entradaSchema }, async ({ deps, ator, corpo }) => {
  const r = await registrarEntrada(deps, exigirAtorPessoa(ator), corpo);
  return r.tipo === 'demanda' ? { status: 201, json: { demanda: r.demanda } } : { status: 202, json: { entradaId: r.entradaId } };
});
