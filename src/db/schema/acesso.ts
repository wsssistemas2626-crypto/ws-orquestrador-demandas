// Tabelas de acesso: as cinco do Better Auth 1.7.6 (formato do adaptador Drizzle, chaves em camelCase que o
// `casing: 'snake_case'` grava em snake_case), o bloqueio da verificação em duas etapas (C-06) e os tokens de serviço
// dos agentes (C-09). Datas em timestamptz. Nenhuma coluna tira a hora do processo do lado da aplicação (G3.4): os
// padrões de data são do banco.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import type { Agente } from './agentes';
import { momento } from './comum';

export const user = pgTable(
  'user',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento().notNull().defaultNow(),
    twoFactorEnabled: boolean().notNull().default(false),
    papel: text().$type<'cto' | 'administradora'>().notNull(),
    desativadoEm: momento(),
  },
  () => [check('user_papel_check', sql`"papel" in ('cto', 'administradora')`)],
);

export const session = pgTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: momento().notNull(),
    token: text().notNull().unique(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento().notNull().defaultNow(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: momento(),
    refreshTokenExpiresAt: momento(),
    scope: text(),
    password: text(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento().notNull().defaultNow(),
  },
  (t) => [index('account_user_id_idx').on(t.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: momento().notNull(),
    createdAt: momento().notNull().defaultNow(),
    updatedAt: momento().notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
);

export const twoFactor = pgTable(
  'two_factor',
  {
    id: text().primaryKey(),
    secret: text().notNull(),
    backupCodes: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // T47: campos que o plugin twoFactor do Better Auth 1.7.6 confere no boot do adaptador.
    verified: boolean().default(true),
    failedVerificationCount: integer().notNull().default(0),
    lockedUntil: momento(),
  },
  (t) => [
    index('two_factor_user_id_idx').on(t.userId),
    check('two_factor_failed_verification_count_check', sql`"failed_verification_count" >= 0`),
  ],
);

// C-06: falhas de código na janela de 15 min, por conta (não por IP).
export const bloqueioVerificacao = pgTable(
  'bloqueio_verificacao',
  {
    usuarioId: text()
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    falhas: integer().notNull().default(0),
    janelaInicio: momento(),
    bloqueadoAte: momento(),
  },
  () => [check('bloqueio_verificacao_falhas_check', sql`"falhas" >= 0`)],
);

// Fonte única da lista de integrações (ADR-20), espelhada nos CHECK de token_servico, evento e demanda.
export const INTEGRACOES = ['awave', 'construir'] as const;
export type Integracao = (typeof INTEGRACOES)[number];

// C-09 e ADR-21: o banco guarda só o SHA-256 do token; o prefixo identifica o token no histórico e na revogação. O
// dono é um agente OU uma integração, nunca os dois nem nenhum.
export const tokenServico = pgTable(
  'token_servico',
  {
    id: uuid().primaryKey().defaultRandom(),
    agente: text().$type<Agente>(),
    integracao: text().$type<Integracao>(),
    hash: text().notNull().unique(),
    prefixo: text().notNull(),
    criadoEm: momento().notNull(),
    revogadoEm: momento(),
  },
  () => [
    check('token_servico_agente_check', sql`"agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')`),
    check('token_servico_integracao_check', sql`"integracao" in ('awave', 'construir')`),
    check('token_servico_dono_check', sql`num_nonnulls("agente", "integracao") = 1`),
  ],
);
