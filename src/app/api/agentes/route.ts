// GET /api/agentes → 200 { agentes: ConfiguracaoAgente[] } (RF-19, CA-19.1). Qualquer pessoa com 2FA lê; nenhum agente
// lê configuração (C-10). Adaptador fino: autorização e erro ficam em rota().
import { rota } from '../../../lib/rota';
import { listarConfiguracaoAgentes } from '../../../modules/agentes/configuracao';

export const GET = rota({ acao: 'ler_configuracao_agentes', rota: '/api/agentes' }, async ({ deps }) => ({
  json: { agentes: await listarConfiguracaoAgentes(deps.db) },
}));
