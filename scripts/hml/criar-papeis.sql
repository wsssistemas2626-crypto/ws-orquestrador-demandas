-- Homologação (docker-compose.hml.yml, etapa 09): roda uma vez na criação do banco, pelo docker-entrypoint-initdb.d do
-- Postgres, com o dono do banco (o migrator). Cria o papel do app antes da primeira migration (ADR-03): a migration de
-- privilégios falha sem ele, de propósito. Sem superusuário, sem CREATEDB e sem CREATEROLE (C-34).
-- Senha fictícia, só deste banco descartável da homologação; nunca é usada em produção, onde o papel é criado à mão.
CREATE ROLE orquestrador_app LOGIN PASSWORD 'app_hml_senha_ficticia' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
