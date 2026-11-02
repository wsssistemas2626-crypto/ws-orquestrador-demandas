// Ajudantes de coluna usados por todos os esquemas (parecer 3 da 06-T05-tech-lead.md): uma definição só de data, para
// nenhuma tabela ficar com precisão ou modo diferente. Não tem tabela, e por isso fica fora de schema/index.ts.
import { timestamp } from 'drizzle-orm/pg-core';

// timestamptz, lido como Date. Sem padrão no banco: a data vem do Relogio injetado (G3.4), salvo onde o Better Auth
// pede o padrão.
export const momento = () => timestamp({ withTimezone: true });
