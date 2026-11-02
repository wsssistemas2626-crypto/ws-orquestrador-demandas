// Tokens de serviço dos agentes (C-09, RF-02). O token tem 32 bytes de `randomBytes` em base64url e o prefixo fixo
// `wsod_`, para a varredura de segredo achar. Sai uma vez, para quem criou (o script da T33); o banco guarda só o
// SHA-256. O prefixo (8 caracteres depois de `wsod_`) identifica o token no histórico e na revogação, sem revelá-lo.
// Nada aqui escreve o token em log.
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db';
import { tokenServico } from '../../db/schema';
import type { Transacao } from '../../db/transacao';
import type { Relogio } from '../../lib/relogio';
import type { Agente, AtorAgente } from './ator';

const PREFIXO_FIXO = 'wsod_';
const RE_TOKEN = /^wsod_[A-Za-z0-9_-]{43}$/;
const RE_PREFIXO = /^[A-Za-z0-9_-]{8}$/;

const hashDoToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function criarTokenServico(
  t: Transacao,
  agente: Agente,
  relogio: Relogio,
): Promise<{ token: string; prefixo: string }> {
  const token = PREFIXO_FIXO + randomBytes(32).toString('base64url');
  const prefixo = token.slice(PREFIXO_FIXO.length, PREFIXO_FIXO.length + 8);
  await t.tx.insert(tokenServico).values({ agente, hash: hashDoToken(token), prefixo, criadoEm: relogio.agora() });
  return { token, prefixo };
}

// Fora do formato, nem consulta o banco. A busca é pelo hash (único), e só token não revogado vale.
export async function validarTokenServico(db: Db, token: string): Promise<AtorAgente | null> {
  if (typeof token !== 'string' || !RE_TOKEN.test(token)) return null;
  const [linha] = await db
    .select({ agente: tokenServico.agente, prefixo: tokenServico.prefixo })
    .from(tokenServico)
    .where(and(eq(tokenServico.hash, hashDoToken(token)), isNull(tokenServico.revogadoEm)));
  return linha ? { tipo: 'agente', agente: linha.agente, prefixoToken: linha.prefixo } : null;
}

// `true` quando revogou ao menos um token ativo com esse prefixo; já revogado ou inexistente, `false`.
export async function revogarTokenServico(t: Transacao, prefixo: string, relogio: Relogio): Promise<boolean> {
  if (typeof prefixo !== 'string' || !RE_PREFIXO.test(prefixo)) return false;
  const revogados = await t.tx
    .update(tokenServico)
    .set({ revogadoEm: relogio.agora() })
    .where(and(eq(tokenServico.prefixo, prefixo), isNull(tokenServico.revogadoEm)))
    .returning({ id: tokenServico.id });
  return revogados.length > 0;
}
