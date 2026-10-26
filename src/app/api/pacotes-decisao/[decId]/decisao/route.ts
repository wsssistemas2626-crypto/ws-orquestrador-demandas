// PATCH /api/pacotes-decisao/:decId/decisao (registrarDecisaoSchema) → 200 { pacote, resultado } (RF-13, RF-14). Só
// pessoa com 2FA, pela matriz (CA-02.1: token de agente recebe 403); a autoria vem da sessão (C-11). Adaptador fino
// sobre o serviço: autorização, Zod e erro ficam em rota(). O id passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
import { registrarDecisao } from '../../../../../modules/pacotes-decisao/decidir';
import { registrarDecisaoSchema } from '../../../../../modules/pacotes-decisao/schemas';

export const PATCH = rota(
  {
    acao: 'registrar_decisao',
    rota: '/api/pacotes-decisao/[decId]/decisao',
    params: paramId.versao('decId', 'DEC'),
    corpo: registrarDecisaoSchema,
  },
  async ({ deps, ator, params, corpo }) => ({ json: await registrarDecisao(deps, ator, params.decId, corpo) }),
);
