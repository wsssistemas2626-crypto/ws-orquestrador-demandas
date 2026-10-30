// GET /api/configuracao/teto → 200 SituacaoTeto; PUT /api/configuracao/teto (definirTetoSchema) → 200 SituacaoTeto
// (RF-18). Qualquer pessoa com 2FA lê; só o CTO altera (C-12, C-26); nenhum agente lê nem altera (C-10, CA-18.4). A
// autoria vem da sessão (C-11). Adaptadores finos: autorização, Zod e erro ficam em rota().
import { rota } from '../../../../lib/rota';
import { exigirAtorPessoa } from '../../../../modules/acesso/ator-pessoa';
import { definirTeto, definirTetoSchema, situacaoDoTeto } from '../../../../modules/agentes/teto';

export const GET = rota({ acao: 'ler_teto', rota: '/api/configuracao/teto' }, async ({ deps }) => ({
  json: await situacaoDoTeto(deps.db, deps.relogio),
}));

export const PUT = rota({ acao: 'alterar_teto', rota: '/api/configuracao/teto', corpo: definirTetoSchema }, async ({ deps, ator, corpo }) => ({
  json: await definirTeto(deps, exigirAtorPessoa(ator), corpo),
}));
