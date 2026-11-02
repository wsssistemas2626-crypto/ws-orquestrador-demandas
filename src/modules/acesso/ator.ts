// Quem age no sistema (G5): pessoa com sessão e 2FA, agente com token de serviço, ou o próprio sistema (jobs
// automáticos). A lista de agentes tem fonte única no esquema do banco; aqui ela só é reexportada.
import type { Agente } from '../../db/schema/agentes';

export { AGENTES, type Agente } from '../../db/schema/agentes';

export const PAPEIS = ['cto', 'administradora'] as const;
export type Papel = (typeof PAPEIS)[number];

export type AtorPessoa = { tipo: 'pessoa'; usuarioId: string; nome: string; papel: Papel };
export type AtorAgente = { tipo: 'agente'; agente: Agente; prefixoToken: string | null };
export type AtorSistema = { tipo: 'sistema' };
export type Ator = AtorPessoa | AtorAgente | AtorSistema;

export const ehPapel = (p: unknown): p is Papel => typeof p === 'string' && (PAPEIS as readonly string[]).includes(p);
