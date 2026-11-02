'use server';

// Server Actions da T12 Agentes e teto de gasto (RF-18, RF-19; 04, C-12 e C-26), pelo adaptador único do painel
// (acaoDoPainel, C-04), com a mesma autorização e a mesma regra das rotas da API:
// - "Salvar teto": `alterar_teto` e definirTetoSchema, sobre definirTeto (PUT /api/configuracao/teto);
// - o interruptor: `alterar_agente` e o agente pela lista fechada (C-17), sobre alterarAgente (PATCH /api/agentes/:agente).
//   O painel só liga e desliga: o modelo não faz parte da entrada (o `z.object` descarta a chave) e continua o que a API
//   gravou; sem modelo com preço vigente, ligar dá 409 e o agente continua desligado.
// Só o CTO passa; a autoria vem da sessão (C-11). A resposta leva só o necessário para a tela; o log de acaoDoPainel leva
// só o nome da ação (C-21).
import { z } from 'zod';
import { acaoDoPainel, type ResultadoAcao } from '../../../../lib/acao-painel';
import { AGENTES, type Agente } from '../../../../modules/acesso/ator';
import { alterarAgente, alterarAgenteSchema } from '../../../../modules/agentes/configuracao';
import { definirTeto, definirTetoSchema } from '../../../../modules/agentes/teto';

export type TetoSalvo = { tetoMensal: number };
export type AgenteAlterado = { agente: Agente; ligado: boolean };

const salvar = acaoDoPainel({ acao: 'alterar_teto', entrada: definirTetoSchema }, async ({ ator, entrada, deps }): Promise<TetoSalvo> => {
  const s = await definirTeto(deps, ator, entrada);
  return { tetoMensal: s.tetoMensal };
});

export async function salvarTetoNoPainel(entrada: unknown): Promise<ResultadoAcao<TetoSalvo>> {
  return salvar(entrada);
}

const alternarSchema = alterarAgenteSchema.omit({ modelo: true }).extend({ agente: z.enum(AGENTES) });

const alternar = acaoDoPainel({ acao: 'alterar_agente', entrada: alternarSchema }, async ({ ator, entrada, deps }): Promise<AgenteAlterado> => {
  const c = await alterarAgente(deps, ator, entrada.agente, { ligado: entrada.ligado });
  return { agente: c.agente, ligado: c.ligado };
});

export async function alternarAgenteNoPainel(entrada: unknown): Promise<ResultadoAcao<AgenteAlterado>> {
  return alternar(entrada);
}
