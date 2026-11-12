-- 0.4.0 (AN-10, ADR-30): o papel da aplicação só lê e inclui o andamento do Pedido de Construção. Sem UPDATE, DELETE
-- nem GRANT de sequência (a identidade não pede, como em `evento`). A fonte da regra é src/db/privilegios.ts, conferida
-- por src/db/privilegios.test.ts.
GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app;
