-- Privilégios do papel da aplicação nas tabelas de agentes, uso de IA e operação (ADR-03, C-26, C-34), e as sementes
-- (CA-19.1, RF-18, P1-f). A fonte da regra é src/db/privilegios.ts, conferida pela guarda src/db/privilegios.test.ts.
-- Interruptor e teto mudam por coluna; preço e uso são só de inclusão; execução, aviso e rotina mudam de estado sem
-- trocar a chave. Também tira do app o UPDATE de demanda.rascunho_agente (parecer 1 da 06-T05-tech-lead.md, C-11).
GRANT SELECT ON "configuracao_agente" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("ligado", "modelo", "atualizado_em", "atualizado_por") ON "configuracao_agente" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT ON "configuracao_ia" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("teto_mensal", "atualizado_em", "atualizado_por") ON "configuracao_ia" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "preco_modelo", "uso_ia" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "execucao_agente" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("status", "tentativas", "proxima_tentativa_em", "bloqueada_ate", "artefato_id", "atualizada_em") ON "execucao_agente" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "aviso_email" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("status", "tentativas", "id_provedor", "enviado_em", "atualizado_em") ON "aviso_email" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "worker_batimento" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "rotina_execucao" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("ultima_execucao_em", "quantidade") ON "rotina_execucao" TO orquestrador_app;--> statement-breakpoint
REVOKE UPDATE ("rascunho_agente") ON "demanda" FROM orquestrador_app;--> statement-breakpoint
-- Sementes: os quatro agentes desligados, sem modelo, e o teto zero em USD (agentes suspensos até alguém definir).
INSERT INTO "configuracao_agente" ("agente", "ligado") VALUES ('orquestrador', false), ('insumo_tecnico', false), ('risco', false), ('consolidacao', false);--> statement-breakpoint
INSERT INTO "configuracao_ia" ("id", "teto_mensal", "moeda") VALUES (1, 0, 'USD');
