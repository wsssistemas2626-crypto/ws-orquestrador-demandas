CREATE SEQUENCE "public"."demanda_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9999 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "demanda" (
	"id" text PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"tipo" text NOT NULL,
	"status" text DEFAULT 'nova' NOT NULL,
	"solicitante_nome" text NOT NULL,
	"solicitante_papel" text,
	"linha_servico_provavel" text,
	"urgencia" text,
	"justificativa_urgencia" text,
	"contexto" text,
	"descricao_problema" text,
	"impacto_percebido" text,
	"anexos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duvidas_entrada" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"autor_tipo" text NOT NULL,
	"autor_id" text NOT NULL,
	"rascunho_agente" boolean DEFAULT false NOT NULL,
	"criada_em" timestamp with time zone NOT NULL,
	"atualizada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "demanda_id_check" CHECK ("id" ~ '^DEM-[0-9]{8}-[0-9]{4}$'),
	CONSTRAINT "demanda_tipo_check" CHECK ("tipo" in ('bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio')),
	CONSTRAINT "demanda_status_check" CHECK ("status" in ('nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'encerrada', 'aprovada', 'em_construcao', 'entregue', 'devolvida')),
	CONSTRAINT "demanda_solicitante_papel_check" CHECK ("solicitante_papel" in ('operacoes', 'financeiro', 'produto', 'outro')),
	CONSTRAINT "demanda_linha_servico_provavel_check" CHECK ("linha_servico_provavel" in ('sob_medida', 'automacao_integracao', 'ia_controle_humano', 'diagnostico_sustentacao', 'indefinida')),
	CONSTRAINT "demanda_urgencia_check" CHECK ("urgencia" in ('baixa', 'media', 'alta')),
	CONSTRAINT "demanda_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente')),
	CONSTRAINT "demanda_anexos_check" CHECK (jsonb_typeof("anexos") = 'array'),
	CONSTRAINT "demanda_duvidas_entrada_check" CHECK (jsonb_typeof("duvidas_entrada") = 'array')
);
--> statement-breakpoint
CREATE TABLE "entrada_bruta" (
	"demanda_id" text PRIMARY KEY NOT NULL,
	"texto" text,
	"origem" jsonb,
	"recebida_em" timestamp with time zone NOT NULL,
	"expurgada_em" timestamp with time zone,
	CONSTRAINT "entrada_bruta_expurgo_check" CHECK (("expurgada_em" is null and "texto" is not null) or ("expurgada_em" is not null and "texto" is null and "origem" is null)),
	CONSTRAINT "entrada_bruta_origem_check" CHECK (jsonb_typeof("origem") = 'object')
);
--> statement-breakpoint
CREATE TABLE "entrada_pendente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"texto" text NOT NULL,
	"origem" jsonb,
	"solicitante_nome" text NOT NULL,
	"solicitante_papel" text,
	"status" text DEFAULT 'aguardando' NOT NULL,
	"registrada_por" text NOT NULL,
	"recebida_em" timestamp with time zone NOT NULL,
	CONSTRAINT "entrada_pendente_solicitante_papel_check" CHECK ("solicitante_papel" in ('operacoes', 'financeiro', 'produto', 'outro')),
	CONSTRAINT "entrada_pendente_status_check" CHECK ("status" in ('aguardando', 'falhou')),
	CONSTRAINT "entrada_pendente_origem_check" CHECK (jsonb_typeof("origem") = 'object')
);
--> statement-breakpoint
CREATE TABLE "especificacao_tecnica" (
	"id" text PRIMARY KEY NOT NULL,
	"demanda_id" text NOT NULL,
	"versao" integer NOT NULL,
	"descricao_objetiva" text NOT NULL,
	"situacao_atual" text,
	"situacao_desejada" text,
	"escopo_inclui" jsonb NOT NULL,
	"escopo_exclui" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sistemas_erp" text,
	"sistemas_ecommerce_marketplace" text,
	"sistemas_apis_terceiros" text,
	"sistemas_servicos_internos" text,
	"dados_entidades" text,
	"dados_campos_criticos" text,
	"restricoes_tecnicas" text,
	"duvidas_em_aberto" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sistema_alvo" text,
	"repositorio_destino" text,
	"criterios_aceite_preliminares" jsonb,
	"definicao_de_pronto" jsonb,
	"autor_tipo" text NOT NULL,
	"autor_id" text NOT NULL,
	"rascunho_agente" boolean NOT NULL,
	"execucao_agente_id" uuid,
	"criada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "especificacao_tecnica_demanda_versao_unique" UNIQUE("demanda_id","versao"),
	CONSTRAINT "especificacao_tecnica_id_check" CHECK ("id" = ('ESP-' || "demanda_id" || '-v' || "versao"::text)),
	CONSTRAINT "especificacao_tecnica_versao_check" CHECK ("versao" between 1 and 9999),
	CONSTRAINT "especificacao_tecnica_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente')),
	CONSTRAINT "especificacao_tecnica_rascunho_agente_check" CHECK ("rascunho_agente" = ("autor_tipo" = 'agente')),
	CONSTRAINT "especificacao_tecnica_escopo_inclui_check" CHECK (jsonb_typeof("escopo_inclui") = 'array'),
	CONSTRAINT "especificacao_tecnica_escopo_exclui_check" CHECK (jsonb_typeof("escopo_exclui") = 'array'),
	CONSTRAINT "especificacao_tecnica_duvidas_em_aberto_check" CHECK (jsonb_typeof("duvidas_em_aberto") = 'array'),
	CONSTRAINT "especificacao_tecnica_criterios_aceite_preliminares_check" CHECK (jsonb_typeof("criterios_aceite_preliminares") = 'array'),
	CONSTRAINT "especificacao_tecnica_definicao_de_pronto_check" CHECK (jsonb_typeof("definicao_de_pronto") = 'array')
);
--> statement-breakpoint
CREATE TABLE "parecer_risco" (
	"id" text PRIMARY KEY NOT NULL,
	"demanda_id" text NOT NULL,
	"versao" integer NOT NULL,
	"resumo" text,
	"risco_tecnico_nivel" text NOT NULL,
	"risco_tecnico_comentario" text,
	"risco_operacional_nivel" text NOT NULL,
	"risco_operacional_comentario" text,
	"risco_juridico_nivel" text NOT NULL,
	"risco_juridico_comentario" text,
	"recomendacoes_mitigacao" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pre_condicoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"envolver_juridico_ou_administradora_quando" text,
	"autor_tipo" text NOT NULL,
	"autor_id" text NOT NULL,
	"rascunho_agente" boolean NOT NULL,
	"execucao_agente_id" uuid,
	"criada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "parecer_risco_demanda_versao_unique" UNIQUE("demanda_id","versao"),
	CONSTRAINT "parecer_risco_id_check" CHECK ("id" = ('RSK-' || "demanda_id" || '-v' || "versao"::text)),
	CONSTRAINT "parecer_risco_versao_check" CHECK ("versao" between 1 and 9999),
	CONSTRAINT "parecer_risco_risco_tecnico_nivel_check" CHECK ("risco_tecnico_nivel" in ('baixo', 'medio', 'alto')),
	CONSTRAINT "parecer_risco_risco_operacional_nivel_check" CHECK ("risco_operacional_nivel" in ('baixo', 'medio', 'alto')),
	CONSTRAINT "parecer_risco_risco_juridico_nivel_check" CHECK ("risco_juridico_nivel" in ('baixo', 'medio', 'alto')),
	CONSTRAINT "parecer_risco_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente')),
	CONSTRAINT "parecer_risco_rascunho_agente_check" CHECK ("rascunho_agente" = ("autor_tipo" = 'agente')),
	CONSTRAINT "parecer_risco_recomendacoes_mitigacao_check" CHECK (jsonb_typeof("recomendacoes_mitigacao") = 'array'),
	CONSTRAINT "parecer_risco_pre_condicoes_check" CHECK (jsonb_typeof("pre_condicoes") = 'array')
);
--> statement-breakpoint
CREATE TABLE "aprovacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pacote_decisao_id" text NOT NULL,
	"papel_aprovacao" text NOT NULL,
	"nome_aprovador" text NOT NULL,
	"registrada_por" text NOT NULL,
	"opcao" text NOT NULL,
	"comentario" text,
	"referencia_documento" text,
	"data_documento" date,
	"revisou_rascunhos" boolean DEFAULT false NOT NULL,
	"registrada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "aprovacao_pacote_papel_unique" UNIQUE("pacote_decisao_id","papel_aprovacao"),
	CONSTRAINT "aprovacao_papel_aprovacao_check" CHECK ("papel_aprovacao" in ('cto', 'administradora')),
	CONSTRAINT "aprovacao_opcao_check" CHECK ("opcao" in ('A', 'B')),
	CONSTRAINT "aprovacao_documento_administradora_check" CHECK ("papel_aprovacao" <> 'administradora' or ("referencia_documento" is not null and "data_documento" is not null))
);
--> statement-breakpoint
CREATE TABLE "decisao" (
	"pacote_decisao_id" text PRIMARY KEY NOT NULL,
	"status_decisao" text NOT NULL,
	"opcao_escolhida" text,
	"comentarios" text,
	"decidida_por" text NOT NULL,
	"decidida_em" timestamp with time zone NOT NULL,
	CONSTRAINT "decisao_status_decisao_check" CHECK ("status_decisao" in ('aprovada', 'devolvida', 'arquivada')),
	CONSTRAINT "decisao_opcao_escolhida_check" CHECK ("opcao_escolhida" in ('A', 'B')),
	CONSTRAINT "decisao_aprovada_tem_opcao_check" CHECK ("status_decisao" <> 'aprovada' or "opcao_escolhida" is not null),
	CONSTRAINT "decisao_opcao_so_na_aprovada_check" CHECK ("status_decisao" = 'aprovada' or "opcao_escolhida" is null)
);
--> statement-breakpoint
CREATE TABLE "pacote_decisao" (
	"id" text PRIMARY KEY NOT NULL,
	"demanda_id" text NOT NULL,
	"versao" integer NOT NULL,
	"especificacao_id" text NOT NULL,
	"especificacao_versao" integer NOT NULL,
	"parecer_risco_id" text NOT NULL,
	"parecer_risco_versao" integer NOT NULL,
	"demanda_tipo" text NOT NULL,
	"demanda_titulo" text NOT NULL,
	"demanda_descricao" text NOT NULL,
	"resumo_executivo" text NOT NULL,
	"opcao_a" jsonb NOT NULL,
	"opcao_b" jsonb NOT NULL,
	"recomendacao" text,
	"nivel_aprovacao_requerido" text NOT NULL,
	"autor_tipo" text NOT NULL,
	"autor_id" text NOT NULL,
	"rascunho_agente" boolean NOT NULL,
	"execucao_agente_id" uuid,
	"criada_em" timestamp with time zone NOT NULL,
	CONSTRAINT "pacote_decisao_demanda_versao_unique" UNIQUE("demanda_id","versao"),
	CONSTRAINT "pacote_decisao_id_check" CHECK ("id" = ('DEC-' || "demanda_id" || '-v' || "versao"::text)),
	CONSTRAINT "pacote_decisao_versao_check" CHECK ("versao" between 1 and 9999),
	CONSTRAINT "pacote_decisao_especificacao_check" CHECK ("especificacao_id" = ('ESP-' || "demanda_id" || '-v' || "especificacao_versao"::text)),
	CONSTRAINT "pacote_decisao_parecer_risco_check" CHECK ("parecer_risco_id" = ('RSK-' || "demanda_id" || '-v' || "parecer_risco_versao"::text)),
	CONSTRAINT "pacote_decisao_demanda_tipo_check" CHECK ("demanda_tipo" in ('bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio')),
	CONSTRAINT "pacote_decisao_nivel_aprovacao_requerido_check" CHECK ("nivel_aprovacao_requerido" in ('cto', 'cto_e_administradora')),
	CONSTRAINT "pacote_decisao_opcao_a_check" CHECK (jsonb_typeof("opcao_a") = 'object'),
	CONSTRAINT "pacote_decisao_opcao_b_check" CHECK (jsonb_typeof("opcao_b") = 'object'),
	CONSTRAINT "pacote_decisao_autor_tipo_check" CHECK ("autor_tipo" in ('pessoa', 'agente')),
	CONSTRAINT "pacote_decisao_rascunho_agente_check" CHECK ("rascunho_agente" = ("autor_tipo" = 'agente'))
);
--> statement-breakpoint
ALTER TABLE "entrada_bruta" ADD CONSTRAINT "entrada_bruta_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "especificacao_tecnica" ADD CONSTRAINT "especificacao_tecnica_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parecer_risco" ADD CONSTRAINT "parecer_risco_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_pacote_decisao_id_pacote_decisao_id_fk" FOREIGN KEY ("pacote_decisao_id") REFERENCES "public"."pacote_decisao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisao" ADD CONSTRAINT "decisao_pacote_decisao_id_pacote_decisao_id_fk" FOREIGN KEY ("pacote_decisao_id") REFERENCES "public"."pacote_decisao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacote_decisao" ADD CONSTRAINT "pacote_decisao_demanda_id_demanda_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demanda"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacote_decisao" ADD CONSTRAINT "pacote_decisao_especificacao_id_especificacao_tecnica_id_fk" FOREIGN KEY ("especificacao_id") REFERENCES "public"."especificacao_tecnica"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pacote_decisao" ADD CONSTRAINT "pacote_decisao_parecer_risco_id_parecer_risco_id_fk" FOREIGN KEY ("parecer_risco_id") REFERENCES "public"."parecer_risco"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "demanda_criada_idx" ON "demanda" USING btree ("criada_em");--> statement-breakpoint
CREATE INDEX "demanda_status_criada_idx" ON "demanda" USING btree ("status","criada_em");--> statement-breakpoint
CREATE INDEX "demanda_tipo_criada_idx" ON "demanda" USING btree ("tipo","criada_em");--> statement-breakpoint
CREATE INDEX "demanda_linha_criada_idx" ON "demanda" USING btree ("linha_servico_provavel","criada_em");--> statement-breakpoint
CREATE INDEX "demanda_autor_criada_idx" ON "demanda" USING btree ("autor_tipo","autor_id","criada_em");--> statement-breakpoint
CREATE INDEX "entrada_bruta_a_expurgar_idx" ON "entrada_bruta" USING btree ("recebida_em") WHERE "expurgada_em" is null;--> statement-breakpoint
CREATE INDEX "entrada_pendente_recebida_idx" ON "entrada_pendente" USING btree ("recebida_em");