// Tokens de serviço dos agentes (C-09, RF-02) e das integrações (0.3.0, ADR-20, ADR-21). O token tem 32 bytes de
// `randomBytes` em base64url e o prefixo fixo `wsod_`, para a varredura de segredo achar. Sai uma vez, para quem criou
// (os scripts de token); o banco guarda só o SHA-256. O prefixo (8 caracteres depois de `wsod_`) identifica o token no
// histórico e na revogação, sem revelá-lo. Nada aqui escreve o token em log.
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../../db';
import { tokenServico } from '../../db/schema';
import type { Transacao } from '../../db/transacao';
import type { Relogio } from '../../lib/relogio';
import { AGENTES, ehIntegracao, type Agente, type AtorAgente, type AtorIntegracao, type Integracao } from './ator';

const PREFIXO_FIXO = 'wsod_';
const RE_TOKEN = /^wsod_[A-Za-z0-9_-]{43}$/;
// O formato do prefixo gravado. A tela (rotulos.ts) e o histórico (historico/consultas.ts) têm cópias, conferidas por
// teste (tokens-integracao.test.ts).
export const RE_PREFIXO = /^[A-Za-z0-9_-]{8}$/;

const hashDoToken = (token: string) => createHash('sha256').update(token).digest('hex');

// O dono é um agente OU uma integração (ADR-21, CHECK token_servico_dono_check).
type Dono = { agente: Agente; integracao: null } | { agente: null; integracao: Integracao };

async function gravarToken(t: Transacao, dono: Dono, relogio: Relogio): Promise<{ token: string; prefixo: string }> {
  const token = PREFIXO_FIXO + randomBytes(32).toString('base64url');
  const prefixo = token.slice(PREFIXO_FIXO.length, PREFIXO_FIXO.length + 8);
  await t.tx
    .insert(tokenServico)
    .values({ agente: dono.agente, integracao: dono.integracao, hash: hashDoToken(token), prefixo, criadoEm: relogio.agora() });
  return { token, prefixo };
}

// D-02: a assinatura de hoje continua; a de integração é irmã, sobre o mesmo `gravarToken`.
export const criarTokenServico = (t: Transacao, agente: Agente, relogio: Relogio): Promise<{ token: string; prefixo: string }> =>
  gravarToken(t, { agente, integracao: null }, relogio);

export const criarTokenDeIntegracao = (
  t: Transacao,
  integracao: Integracao,
  relogio: Relogio,
): Promise<{ token: string; prefixo: string }> => gravarToken(t, { agente: null, integracao }, relogio);

const ehAgente = (v: unknown): v is Agente => typeof v === 'string' && (AGENTES as readonly string[]).includes(v);

// Fora do formato, nem consulta o banco. A busca é pelo hash (único), e só token não revogado vale.
// IN-03: só lista. Agente só com `agente` na lista e `integracao` nula; integração só com `integracao` na lista e
// `agente` nulo. Qualquer outra linha (dois nulos, os dois, valor fora da lista) é token inválido (401).
export async function validarTokenServico(db: Db, token: string): Promise<AtorAgente | AtorIntegracao | null> {
  if (typeof token !== 'string' || !RE_TOKEN.test(token)) return null;
  const [linha] = await db
    .select({ agente: tokenServico.agente, integracao: tokenServico.integracao, prefixo: tokenServico.prefixo })
    .from(tokenServico)
    .where(and(eq(tokenServico.hash, hashDoToken(token)), isNull(tokenServico.revogadoEm)));
  if (!linha) return null;
  if (linha.integracao === null && ehAgente(linha.agente)) return { tipo: 'agente', agente: linha.agente, prefixoToken: linha.prefixo };
  if (linha.agente === null && ehIntegracao(linha.integracao)) return { tipo: 'integracao', integracao: linha.integracao, prefixoToken: linha.prefixo };
  return null;
}

// `true` quando revogou ao menos um token ativo com esse prefixo; já revogado ou inexistente, `false`. Vale para token
// de agente e de integração.
export async function revogarTokenServico(t: Transacao, prefixo: string, relogio: Relogio): Promise<boolean> {
  if (typeof prefixo !== 'string' || !RE_PREFIXO.test(prefixo)) return false;
  const revogados = await t.tx
    .update(tokenServico)
    .set({ revogadoEm: relogio.agora() })
    .where(and(eq(tokenServico.prefixo, prefixo), isNull(tokenServico.revogadoEm)))
    .returning({ id: tokenServico.id });
  return revogados.length > 0;
}
