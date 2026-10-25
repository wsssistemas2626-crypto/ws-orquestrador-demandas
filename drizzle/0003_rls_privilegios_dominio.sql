-- Privilégios do papel da aplicação nas tabelas de demanda, versões e decisão (ADR-03, C-34, RF-11). A fonte da regra
-- é src/db/privilegios.ts, conferida pela guarda src/db/privilegios.test.ts. Versões e decisão são só de inclusão; a
-- demanda muda por coluna, sem id, autoria nem criação; a entrada bruta só muda no expurgo; a sequência dá só nextval.
GRANT SELECT, INSERT ON "demanda" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("titulo", "tipo", "status", "solicitante_nome", "solicitante_papel", "linha_servico_provavel", "urgencia", "justificativa_urgencia", "contexto", "descricao_problema", "impacto_percebido", "anexos", "duvidas_entrada", "rascunho_agente", "atualizada_em") ON "demanda" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "entrada_bruta" TO orquestrador_app;--> statement-breakpoint
GRANT UPDATE ("texto", "origem", "expurgada_em") ON "entrada_bruta" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "entrada_pendente" TO orquestrador_app;--> statement-breakpoint
GRANT SELECT, INSERT ON "especificacao_tecnica", "parecer_risco", "pacote_decisao", "aprovacao", "decisao" TO orquestrador_app;--> statement-breakpoint
GRANT USAGE ON SEQUENCE "demanda_seq" TO orquestrador_app;
