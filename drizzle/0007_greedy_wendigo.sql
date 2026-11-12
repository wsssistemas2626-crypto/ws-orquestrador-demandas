ALTER TABLE "evento" DROP CONSTRAINT "evento_ator_tipo_check";--> statement-breakpoint
ALTER TABLE "demanda" DROP CONSTRAINT "demanda_autor_tipo_check";--> statement-breakpoint
ALTER TABLE "token_servico" ALTER COLUMN "agente" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "token_servico" ADD COLUMN "integracao" text;--> statement-breakpoint
CREATE INDEX "evento_acao_entidade_idx" ON "evento" USING btree ("acao","entidade_id");--> statement-breakpoint
ALTER TABLE "token_servico" ADD CONSTRAINT "token_servico_integracao_check" CHECK ("integracao" in ('awave', 'construir'));--> statement-breakpoint
ALTER TABLE "token_servico" ADD CONSTRAINT "token_servico_dono_check" CHECK (num_nonnulls("agente", "integracao") = 1);--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_ator_integracao_check" CHECK ("ator_tipo" <> 'integracao' or ("ator_id" in ('awave', 'construir') and "ator_token_prefixo" is not null));--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_ator_tipo_check" CHECK ("ator_tipo" in ('pessoa', 'agente', 'sistema', 'integracao'));--> statement-breakpoint
ALTER TABLE "demanda" ADD CONSTRAINT "demanda_autor_integracao_check" CHECK ("autor_tipo" <> 'integracao' or ("autor_id" = 'awave' and "rascunho_agente"));--> statement-breakpoint
ALTER TABLE "demanda" ADD CONSTRAINT "demanda_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente', 'integracao'));