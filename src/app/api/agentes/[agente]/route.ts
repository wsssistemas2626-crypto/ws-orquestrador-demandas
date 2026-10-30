// PATCH /api/agentes/:agente (alterarAgenteSchema) → 200 ConfiguracaoAgente (RF-19, CA-19.3). Só pessoa de papel cto,
// pela matriz (C-12, C-26); a autoria vem da sessão (C-11). O agente do caminho passa pela lista fechada antes de
// qualquer consulta: fora dela, 404 (C-17). Ligar sem modelo com preço vigente responde 409.
import { z } from 'zod';
import { rota } from '../../../../lib/rota';
import { AGENTES } from '../../../../modules/acesso/ator';
import { exigirAtorPessoa } from '../../../../modules/acesso/ator-pessoa';
import { alterarAgente, alterarAgenteSchema } from '../../../../modules/agentes/configuracao';

const paramAgente = z.object({ agente: z.enum(AGENTES) });

export const PATCH = rota(
  { acao: 'alterar_agente', rota: '/api/agentes/[agente]', params: paramAgente, corpo: alterarAgenteSchema },
  async ({ deps, ator, params, corpo }) => ({ json: await alterarAgente(deps, exigirAtorPessoa(ator), params.agente, corpo) }),
);
