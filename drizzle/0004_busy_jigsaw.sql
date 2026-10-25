CREATE TABLE "configuracao_agente" (
	"agente" text PRIMARY KEY NOT NULL,
	"ligado" boolean DEFAULT false NOT NULL,
	"modelo" text,
	"atualizado_em" timestamp with time zone,
	"atualizado_por" text,
	CONSTRAINT "configuracao_agente_agente_check" CHECK ("agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')),
	CONSTRAINT "configuracao_agente_ligado_tem_modelo_check" CHECK (not "ligado" or "modelo" is not null)
);
--> statement-breakpoint
CREATE TABLE "configuracao_ia" (
	"id" smallint PRIMARY KEY NOT NULL,
	"teto_mensal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"moeda" text DEFAULT 'USD' NOT NULL,
	"atualizado_em" timestamp with time zone,
	"atualizado_por" text,
	CONSTRAINT "configuracao_ia_id_check" CHECK ("id" = 1),
	CONSTRAINT "configuracao_ia_teto_mensal_check" CHECK ("teto_mensal" >= 0),
	CONSTRAINT "configuracao_ia_moeda_check" CHECK ("moeda" in ('USD'))
);
--> statement-breakpoint
CREATE TABLE "execucao_agente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agente" text NOT NULL,
	"chave_entrada" text NOT NULL,
	"demanda_id" text,
	"status" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"proxima_tentativa_em" timestamp with time zone,
	"bloqueada_ate" timestamp with time zone,
	"artefato_id" text,
	"criada_em" timestamp with time zone NOT NULL,
	"atualizada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "execucao_agente_agente_chave_unique" UNIQUE("agente","chave_entrada"),
	CONSTRAINT "execucao_agente_agente_check" CHECK ("agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')),
	CONSTRAINT "execucao_agente_status_check" CHECK ("status" in ('pendente', 'em_andamento', 'concluida', 'falhou', 'ignorada')),
	CONSTRAINT "execucao_agente_tentativas_check" CHECK ("tentativas" >= 0),
	CONSTRAINT "execucao_agente_chave_entrada_check" CHECK (("agente" = 'orquestrador' and "chave_entrada" ~ '^entrada:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        or ("agente" = 'insumo_tecnico' and "chave_entrada" ~ '^demanda:DEM-[0-9]{8}-[0-9]{4}$')
        or ("agente" = 'risco' and "chave_entrada" ~ '^esp:ESP-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$')
        or ("agente" = 'consolidacao' and "chave_entrada" ~ '^rsk:RSK-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$')),
	CONSTRAINT "execucao_agente_concluida_tem_artefato_check" CHECK ("status" <> 'concluida' or "artefato_id" is not null),
	CONSTRAINT "execucao_agente_em_andamento_tem_trava_check" CHECK ("status" <> 'em_andamento' or "bloqueada_ate" is not null)
);
--> statement-breakpoint
CREATE TABLE "preco_modelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo" text NOT NULL,
	"preco_entrada_por_milhao" numeric(12, 6) NOT NULL,
	"preco_saida_por_milhao" numeric(12, 6) NOT NULL,
	"moeda" text DEFAULT 'USD' NOT NULL,
	"vigente_desde" timestamp with time zone NOT NULL,
	CONSTRAINT "preco_modelo_modelo_vigencia_unique" UNIQUE("modelo","vigente_desde"),
	CONSTRAINT "preco_modelo_preco_entrada_por_milhao_check" CHECK ("preco_entrada_por_milhao" >= 0),
	CONSTRAINT "preco_modelo_preco_saida_por_milhao_check" CHECK ("preco_saida_por_milhao" >= 0),
	CONSTRAINT "preco_modelo_moeda_check" CHECK ("moeda" in ('USD'))
);
--> statement-breakpoint
CREATE TABLE "uso_ia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execucao_agente_id" uuid NOT NULL,
	"agente" text NOT NULL,
	"demanda_id" text,
	"modelo" text NOT NULL,
	"tokens_entrada" integer NOT NULL,
	"tokens_saida" integer NOT NULL,
	"custo" numeric(12, 6) NOT NULL,
	"resultado" text NOT NULL,
	"ocorrido_em" timestamp with time zone NOT NULL,
	CONSTRAINT "uso_ia_agente_check" CHECK ("agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')),
	CONSTRAINT "uso_ia_resultado_check" CHECK ("resultado" in ('sucesso', 'fora_do_schema', 'erro')),
	CONSTRAINT "uso_ia_tokens_entrada_check" CHECK ("tokens_entrada" >= 0),
	CONSTRAINT "uso_ia_tokens_saida_check" CHECK ("tokens_saida" >= 0),
	CONSTRAINT "uso_ia_custo_check" CHECK ("custo" >= 0)
);
--> statement-breakpoint
CREATE TABLE "aviso_email" (
	"pacote_decisao_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"id_provedor" text,
	"enviado_em" timestamp with time zone,
	"atualizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "aviso_email_status_check" CHECK ("status" in ('pendente', 'enviado', 'falhou', 'sem_provedor')),
	CONSTRAINT "aviso_email_tentativas_check" CHECK ("tentativas" >= 0),
	CONSTRAINT "aviso_email_enviado_tem_data_check" CHECK ("status" <> 'enviado' or "enviado_em" is not null)
);
--> statement-breakpoint
CREATE TABLE "rotina_execucao" (
	"rotina" text PRIMARY KEY NOT NULL,
	"ultima_execucao_em" timestamp with time zone NOT NULL,
	"quantidade" integer NOT NULL,
	CONSTRAINT "rotina_execucao_rotina_check" CHECK ("rotina" in ('retencao.expurgo')),
	CONSTRAINT "rotina_execucao_quantidade_check" CHECK ("quantidade" >= 0)
);
--> statement-breakpoint
CREATE TABLE "worker_batimento" (
	"instancia" text PRIMARY KEY NOT NULL,
	"visto_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "execucao_agente" ADD CONSTRAINT "execucao_agente_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_ia" ADD CONSTRAINT "uso_ia_execucao_agente_id_execucao_agente_id_fk" FOREIGN KEY ("execucao_agente_id") REFERENCES "public"."execucao_agente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_ia" ADD CONSTRAINT "uso_ia_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aviso_email" ADD CONSTRAINT "aviso_email_pacote_decisao_id_pacote_decisao_id_fk" FOREIGN KEY ("pacote_decisao_id") REFERENCES "public"."pacote_decisao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "execucao_agente_status_proxima_idx" ON "execucao_agente" USING btree ("status","proxima_tentativa_em");--> statement-breakpoint
CREATE INDEX "execucao_agente_demanda_status_idx" ON "execucao_agente" USING btree ("demanda_id","status");--> statement-breakpoint
CREATE INDEX "uso_ia_ocorrido_idx" ON "uso_ia" USING btree ("ocorrido_em");--> statement-breakpoint
CREATE INDEX "worker_batimento_visto_idx" ON "worker_batimento" USING btree ("visto_em");