// Quem age no sistema (G5): pessoa com sessão e 2FA, agente com token de serviço, integração com token de serviço
// próprio (0.3.0, ADR-20) ou o próprio sistema (jobs automáticos). As listas de agentes e de integrações têm fonte única
// no esquema do banco; aqui elas só são reexportadas.
import { INTEGRACOES, type Integracao } from '../../db/schema/acesso';
import type { Agente } from '../../db/schema/agentes';

export { AGENTES, type Agente } from '../../db/schema/agentes';
export { INTEGRACOES, type Integracao } from '../../db/schema/acesso';

export const PAPEIS = ['cto', 'administradora'] as const;
export type Papel = (typeof PAPEIS)[number];

export type AtorPessoa = { tipo: 'pessoa'; usuarioId: string; nome: string; papel: Papel };
export type AtorAgente = { tipo: 'agente'; agente: Agente; prefixoToken: string | null };
export type AtorSistema = { tipo: 'sistema' };
// Integração é o quarto tipo de ator (ADR-20), nunca agente: fora do interruptor, do teto e do uso de IA.
export type AtorIntegracao = { tipo: 'integracao'; integracao: Integracao; prefixoToken: string };
export type Ator = AtorPessoa | AtorAgente | AtorSistema | AtorIntegracao;

export const ehPapel = (p: unknown): p is Papel => typeof p === 'string' && (PAPEIS as readonly string[]).includes(p);

export const ehIntegracao = (v: unknown): v is Integracao => typeof v === 'string' && (INTEGRACOES as readonly string[]).includes(v);

// O que a integração grava como solicitante (RF-04): sem dado pessoal. A tela tem a cópia NOME_INTEGRACAO (D-14).
export const NOME_DA_INTEGRACAO: Readonly<Record<Integracao, string>> = Object.freeze({ awave: 'Awave', construir: '/construir' });

// Fim de todo `switch` por tipo de ator (ADR-22, IN-02): o tipo novo quebra o typecheck; em execução, falha fechada.
export function atorDesconhecido(nunca: never): never {
  void nunca;
  throw new Error('ator desconhecido');
}
