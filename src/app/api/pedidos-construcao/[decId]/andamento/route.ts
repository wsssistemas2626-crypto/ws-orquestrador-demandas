// POST /api/pedidos-construcao/:decId/andamento { fase, tarefasProntas, tarefasTotal, status } → 204 sem corpo (RF-02,
// 0.4.0). O /construir manda o Bearer, o JSON e nenhum Origin. Só a integração `construir`, pela matriz. O id passa pela
// regex antes de tudo (C-17), e o corpo pelo Zod antes de qualquer consulta: fora do formato, 422 sem eco (ADR-33,
// AN-02). Adaptador fino: autorização, erro, nosniff e no-store ficam em rota().
import { paramId, rota } from '../../../../../lib/rota';
import { registrarAndamento } from '../../../../../modules/andamento/registrar';
import { CORPO_INVALIDO_ANDAMENTO, corpoAndamentoSchema } from '../../../../../modules/andamento/schemas';

export const POST = rota(
  {
    acao: 'registrar_andamento',
    rota: '/api/pedidos-construcao/[decId]/andamento',
    params: paramId.versao('decId', 'DEC'),
    corpo: corpoAndamentoSchema,
    corpoInvalido: CORPO_INVALIDO_ANDAMENTO,
  },
  async ({ deps, ator, params, corpo }) => {
    await registrarAndamento(deps, ator, params.decId, corpo);
    return { status: 204 };
  },
);
