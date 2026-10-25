-- Privilégios do papel da aplicação (ADR-03, C-34). O papel orquestrador_app não é criado aqui: existe antes, em cada
-- ambiente; sem ele esta migration falha de propósito. A fonte da regra é src/db/privilegios.ts, conferida pela guarda
-- src/db/privilegios.test.ts. Evento é só de inclusão (CA-21.2); token_servico só muda revogado_em.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM orquestrador_app;--> statement-breakpoint
REVOKE CREATE ON SCHEMA public FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", "session", "account", "verification", "two_factor", "bloqueio_verificacao" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "token_servico" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("revogado_em") ON "token_servico" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "evento" TO orquestrador_app;--> statement-breakpoint
GRANT USAGE ON SCHEMA drizzle TO orquestrador_app;--> statement-breakpoint
GRANT SELECT ON drizzle.__drizzle_migrations TO orquestrador_app;
