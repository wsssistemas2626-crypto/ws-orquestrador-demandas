CREATE TABLE "andamento_construcao" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "andamento_construcao_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"demanda_id" text NOT NULL,
	"dec_id" text NOT NULL,
	"fase" text NOT NULL,
	"tarefas_prontas" integer NOT NULL,
	"tarefas_total" integer NOT NULL,
	"status_construcao" text NOT NULL,
	"ator_token_prefixo" text NOT NULL,
	"gravado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "andamento_construcao_fase_check" CHECK ("fase" in ('entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando')),
	CONSTRAINT "andamento_construcao_status_construcao_check" CHECK ("status_construcao" in ('em_construcao', 'construido', 'cancelado')),
	CONSTRAINT "andamento_construcao_tarefas_check" CHECK ("tarefas_prontas" >= 0 and "tarefas_prontas" <= "tarefas_total" and "tarefas_total" <= 999),
	CONSTRAINT "andamento_construcao_dec_id_check" CHECK ("dec_id" ~ '^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$'),
	CONSTRAINT "andamento_construcao_ator_token_prefixo_check" CHECK ("ator_token_prefixo" ~ '^[A-Za-z0-9_-]{8}$')
);
--> statement-breakpoint
ALTER TABLE "andamento_construcao" ADD CONSTRAINT "andamento_construcao_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "andamento_construcao" ADD CONSTRAINT "andamento_construcao_dec_id_pacote_decisao_id_fk" FOREIGN KEY ("dec_id") REFERENCES "public"."pacote_decisao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "andamento_construcao_demanda_id_idx" ON "andamento_construcao" USING btree ("demanda_id","id");--> statement-breakpoint
CREATE INDEX "andamento_construcao_dec_gravado_idx" ON "andamento_construcao" USING btree ("dec_id","gravado_em");--> statement-breakpoint
CREATE INDEX "andamento_construcao_gravado_idx" ON "andamento_construcao" USING btree ("gravado_em");