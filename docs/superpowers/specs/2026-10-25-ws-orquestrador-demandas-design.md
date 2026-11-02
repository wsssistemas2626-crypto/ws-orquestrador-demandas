# ws-orquestrador-demandas — spec consolidada da 0.1.0 (Parada 1)

Pedido `DEC-DEM-20261022-0001-v1` (DEM-20261022-0001, "WS Orquestrador de Demandas", `novo_projeto`, risco **alto**),
consolidado pelo maestro em 25/10/2026 a partir das entregas da pasta `docs/construcao/DEC-DEM-20261022-0001-v1/`:
`01-analista-requisitos.md`, `02-arquiteto-solucoes.md` (volta 3), `03-ux-ui-design.md` e `04-seguranca-aplicacao.md`
(volta 2). Esta spec resume e amarra as quatro; o detalhe (critérios Dado/Quando/Então, modelo de dados, wireframes,
STRIDE por componente) fica nelas. Onde duas entregas divergem, a seção 8 diz qual vale.

## 1. Objetivo

Um sistema interno para receber demandas técnicas, transformá-las em especificação (ESP), parecer de risco (RSK) e
pacote de decisão (DEC) **versionados e imutáveis**, registrar a decisão humana (com dupla aprovação quando o nível
pedir) e, de um DEC aprovado, gerar o **Pedido de Construção** que o /construir aceita, para baixar e copiar à mão.
Quatro agentes de IA (orquestrador, insumo técnico, risco, consolidação) podem preencher rascunhos como jobs, mas
**nascem desligados**, com teto de gasto zero, até a chave da API no CNPJ (CA-E-03). Sem eles, a pessoa preenche tudo
pelo painel.

Opção aprovada no DEC: construir como primeiro pedido real do /construir, na stack do padrão técnico, com os agentes
desligados e a entrega do pedido por cópia manual. Usuários: Fabiano (papel `cto`) e a administradora (papel
`administradora`). Volume: até 200 demandas por mês.

## 2. Requisitos e critérios de aceite

26 requisitos funcionais e 18 não funcionais, com critérios em `01-analista-requisitos.md`, seções 2 e 3.

### Requisitos funcionais

| RF | Resumo | Critérios |
|---|---|---|
| RF-01 | Login com Better Auth + TOTP obrigatório; sem cadastro público (conta por script); papéis `cto` e `administradora` | CA-01.1 a CA-01.4 |
| RF-02 | Token de serviço por agente (só hash), aceito só em rota de agente; rota de pessoa recusa token com 403 | CA-02.1 a CA-02.5 |
| RF-03 | Criar demanda pelo painel e por `POST /api/demandas` (Zod; erro sem detalhe interno) | CA-03.1 a CA-03.3 |
| RF-04 | Id `DEM-AAAAMMDD-NNNN` (data em São Paulo, sequência **global**); ESP, RSK e DEC `<prefixo>-<dem>-vN` sem número repetido sob concorrência | CA-04.1 a CA-04.4 |
| RF-05 | Entrada colando o texto bruto (guardado à parte); com o orquestrador ligado, um job propõe os campos | CA-05.1 a CA-05.3 |
| RF-06 | Consultar com filtros e paginação (máx. 100); leitura nunca traz o texto bruto; PATCH vai ao histórico | CA-06.1 a CA-06.4 |
| RF-07 | Nove status e tabela fechada de transições; quatro automáticas (ator `sistema`), o resto manual e só por pessoa | CA-07.1 a CA-07.5 |
| RF-08 | ESP versionada com listas em JSONB e os quatro campos de construção (`sistemaAlvo`, `repositorioDestino`, critérios, pronto) com as regras do `validarPedido` | CA-08.1 a CA-08.5 |
| RF-09 | RSK versionado, três níveis `baixo`/`medio`/`alto` | CA-09.1 a CA-09.3 |
| RF-10 | DEC cita a ESP e o RSK de maior versão, grava cópia da demanda; sem ESP ou RSK → 400 com `faltando` | CA-10.1 a CA-10.4 |
| RF-11 | Versão gravada nunca muda, também no banco (o papel da aplicação não consegue `UPDATE`) | CA-11.1 a CA-11.3 |
| RF-12 | DEC desatualizado (por número de versão) marcado e impossível de aprovar | CA-12.1 a CA-12.4 |
| RF-13 | Decisão só por pessoa com 2FA: `aprovada` (A ou B), `devolvida` ou `arquivada`; aprovador da sessão; rascunho de agente exige `revisouRascunhosDeAgente: true` | CA-13.1 a CA-13.5 |
| RF-14 | `cto_e_administradora` só vale com as duas aprovações, mesma opção; a da administradora exige referência ao documento assinado | CA-14.1 a CA-14.4 |
| RF-15 | Dúvida em aberto leva a `aguardando_informacao`; **nenhuma** mensagem ao solicitante | CA-15.1 a CA-15.3 |
| RF-16 | Quatro agentes como jobs do pg-boss; saída validada pelo **mesmo** Zod da rota; execução única; 3 tentativas | CA-16.1 a CA-16.5 |
| RF-17 | Linha de uso por chamada (tokens e custo pela tabela de preço), sem prompt nem resposta | CA-17.1 a CA-17.3 |
| RF-18 | Teto mensal no banco (inicial 0), conferido antes de **cada** chamada; atingido, agentes suspensos | CA-18.1 a CA-18.4 |
| RF-19 | Interruptor por agente, só `cto`; os quatro nascem desligados; operação manual pelos mesmos schemas | CA-19.1 a CA-19.4 |
| RF-20 | Minimização: ao provedor vai só o necessário; e-mail, telefone, CPF e CNPJ viram marcadores | CA-20.1, CA-20.2 |
| RF-21 | Histórico só de inclusão, com ator `pessoa`/`agente`/`sistema`, sem texto bruto nem token | CA-21.1 a CA-21.3 |
| RF-22 | Pedido de Construção de DEC aprovado (não `estudo`), validado pelo `validarPedido`, idêntico byte a byte para o mesmo DEC | CA-22.1 a CA-22.6 |
| RF-23 | `GET /api/pacotes-decisao?statusDecisao=` | CA-23.1, CA-23.2 |
| RF-24 | Expurgo diário do texto bruto e dos metadados de origem com mais de 90 dias (configurável) | CA-24.1 a CA-24.4 |
| RF-25 | E-mail (Resend) de DEC pronto, uma vez por DEC, só com ids e link | CA-25.1 a CA-25.3 |
| RF-26 | Painel em pt-BR: fila, detalhe, entrada, formulários de ESP/RSK/DEC, decisão, agentes e teto | CA-26.1 a CA-26.4 |

### Requisitos não funcionais (os números)

| ID | Requisito |
|---|---|
| RNF-01 | Stack do `padrao-tecnico.md` (Next 16.3.8, Drizzle com migrator e papel da aplicação sem DDL, pg-boss, Better Auth, Zod 4, pino, Vitest + Testcontainers, Playwright + axe) |
| RNF-02 | Porta de desenvolvimento 3101 (livre no `ss -ltn` de 25/10) |
| RNF-03 | p95 < 500 ms em `GET /demandas` e `GET /demandas/:id` com 5.000 demandas fictícias |
| RNF-04 | Texto bruto até 100.000 caracteres; campo de texto até 10.000; lista até 50 itens; `limit` até 100 |
| RNF-05 | 200 demandas por mês, 4 agentes; uma réplica de app e uma de worker |
| RNF-06 | 3 tentativas por job de agente, tempo máximo de 120 s por chamada (esperas: ver P1-e) |
| RNF-07 | Teto inicial 0; o teto é ultrapassado em no máximo o custo de uma chamada |
| RNF-08 | Texto bruto: 90 dias (configurável), expurgo a cada 24 h |
| RNF-09 | Capacidade de 9.999 ids; aviso no painel acima de 9.000 |
| RNF-10 | Nenhum log nem evento do Sentry com texto bruto, e-mail, telefone, token, senha, cookie ou conteúdo de IA (teste com sentinelas) |
| RNF-11 | 0 violação do axe em cada tela |
| RNF-12 | 2FA em 100% das contas; sessão de 8 h; 10 tentativas de login por minuto por IP; token de 32 bytes, só hash |
| RNF-13 | Segredos só por variável de ambiente, citados pelo nome |
| RNF-14 | 0 chamada real ao provedor de IA e ao Resend na construção e no CI |
| RNF-15 | Mesmo DEC → mesmo pedido byte a byte; testes sem relógio real |
| RNF-16 | Textos em pt-BR |
| RNF-17 | `/api/saude` sem autenticação, 200 em < 200 ms, sem versão nem configuração |
| RNF-18 | `pnpm test`, `lint`, `typecheck`, `test:e2e` verdes; `docker build` passa; CI com os quatro; 0 achado crítico ou alto; `package.json` 0.1.0 |

Rastreabilidade: os 14 critérios preliminares do pedido estão mapeados para RF e CA na seção 5 de `01`.

## 3. Arquitetura e ADRs

Monólito modular em Next.js 16 com **dois processos da mesma imagem**: `app` (painel e API) e `worker` (pg-boss:
agentes, aviso por e-mail, expurgo, batimento), sobre um Postgres 16 que guarda também a fila. A regra de negócio fica
em `src/modules/<domínio>`; rota, Server Action e job são adaptadores finos sobre as mesmas funções, com os mesmos
schemas Zod e a mesma `autorizar(ator, acao)`.

| Componente | Caminho | Responsabilidade |
|---|---|---|
| Painel | `src/app/(painel)/` | Telas pt-BR; Server Components e Server Actions chamam os módulos |
| API | `src/app/api/` | Resolve o ator, valida, chama o módulo, mapeia erro para HTTP |
| Acesso | `src/modules/acesso/` | Better Auth (senha + TOTP), tokens de serviço, `resolverAtor`, matriz de acesso como dado |
| Demandas | `src/modules/demandas/` | CRUD, gerador de id (`demanda_seq` com `MAXVALUE 9999`), máquina de status, entrada bruta |
| ESP, RSK, DEC | `src/modules/especificacoes/`, `pareceres-risco/`, `pacotes-decisao/` | Versões, `desatualizado`, decisão, dupla aprovação |
| Histórico | `src/modules/historico/` | Eventos só de inclusão; falha no evento desfaz a transação |
| Agentes | `src/modules/agentes/`, `src/agents/` | Interruptores, teto, preço, execução idempotente, minimização, provedor, prompts |
| Pedido de Construção | `src/modules/pedido-construcao/` | Montar, serializar determinístico, validar com o `validarPedido` copiado |
| Avisos, Retenção | `src/modules/avisos/`, `retencao/` | E-mail de DEC pronto; expurgo do texto bruto |
| Worker | `src/worker/`, `src/jobs/` | Filas, agendamentos, batimento, varredura de execuções órfãs |
| Banco | `src/db/`, `drizzle/`, `scripts/migrate.ts` | Esquema, migrations e privilégios pelo migrator |
| Scripts | `scripts/` | `criar-usuario`, `criar-token-servico`, `revogar-token-servico`, `definir-preco-modelo`, `seed-ficticio` |

Pontos do desenho que sustentam os requisitos:

- **Decisão fora do DEC**: tabelas `aprovacao` e `decisao`; `statusDecisao` e `aprovadores` são derivados. O DEC fica
  só de inclusão, e "decide uma vez só" é a restrição única de `decisao.pacote_decisao_id`.
- **Concorrência**: criar ESP, RSK ou DEC e registrar decisão fazem `SELECT … FOR UPDATE` na linha da demanda; isso
  serializa a versão N e fecha a corrida entre aprovação e ESP nova.
- **Texto bruto em tabela própria** (`entrada_bruta`): nenhuma leitura de demanda o traz por acidente.
- **Uma fila só para os quatro agentes, concorrência 1, uma réplica de worker**: no máximo uma chamada ao provedor por
  vez, o que cumpre a RNF-07 sem trava extra. Batimento alerta quando há duas instâncias.

| ADR | Decisão |
|---|---|
| ADR-01 | Monólito modular, app e worker da mesma imagem (padrão técnico, caso NutriDebby) |
| ADR-02 | Worker chama os módulos direto, não a própria API; token de serviço só para agente externo |
| ADR-03 | Imutabilidade por `GRANT` só de `SELECT, INSERT` ao papel `orquestrador_app`, com teste de guarda dos privilégios |
| ADR-04 | Esquema do pg-boss criado pelo migrator; app e worker sobem sem criar esquema |
| ADR-05 | `validarPedido` copiado sem mudança para `src/vendor/construir/pedido.mjs`, com SHA-256 conferido em teste |
| ADR-06 | Job enfileirado na mesma transação do artefato, com varredura de órfãos como rede de segurança |
| ADR-07 | Nova tentativa dos agentes calculada pela aplicação (`esperaAntesDaTentativa`), não pelo pg-boss |
| ADR-08 | Provedor de IA e e-mail atrás de interface injetável; o real só existe com a chave definida |
| ADR-09 | Schema do agente = schema da rota (o orquestrador omite os campos do solicitante) |
| ADR-10 | Acréscimos de layout: `src/agents/` (prompts em `.ts`) e `src/vendor/construir/` |
| ADR-11 | Limite de login em memória do Better Auth, sessão fixa de 8 h, 2FA conferido em `exigirPessoa` |
| ADR-12 | Migrations ao subir **só na homologação** (`pnpm start:hml`); na produção, `pnpm db:migrate` em passo separado; a saúde confere a última migration |

Integrações: Anthropic (`@anthropic-ai/sdk` 0.131.0, só no worker, 120 s, `maxRetries: 0`, desligada na 0.1.0), Resend
(10 s, 3 tentativas, `Idempotency-Key`; sem chave, não envia), Sentry (DSN ausente = desligado). Ambiente: dev em
3101, Postgres de dev em `127.0.0.1:5434`, homologação por `docker-compose.hml.yml`. Variáveis só pelo nome em
`02`, seção 9.

## 4. Interface

Doze telas e um e-mail, com design system mínimo próprio (tokens Tailwind 4, selos com texto, componentes únicos,
padrão de formulário com resumo de erros), em `03-ux-ui-design.md`. Cada tela tem os quatro estados e os textos
escritos por inteiro.

| Tela | Rota | RF |
|---|---|---|
| T01 Entrar (senha, código ou código de recuperação) | `/entrar` | RF-01 |
| T02 Configurar verificação em duas etapas | `/configurar-2fa` | RF-01 |
| T03 Fila de demandas (filtros na URL, aplicados por botão) | `/demandas` | RF-06, RF-26 |
| T04 Nova demanda (colar o texto) | `/demandas/nova` | RF-03 a RF-05, RF-20 |
| T05 Detalhe (dados, dúvidas, versões, status manual, texto recebido em `details`, histórico) | `/demandas/[id]` | RF-06, RF-07, RF-12, RF-15, RF-21, RF-24 |
| T06 Editar dados da demanda | `/demandas/[id]/editar` | RF-06 |
| T07 Nova versão da ESP (começa com a mais nova; destino por conta + sistema) | `/demandas/[id]/especificacoes/nova` | RF-08 |
| T08 Novo RSK | `/demandas/[id]/pareceres-risco/novo` | RF-09 |
| T09 Novo DEC | `/demandas/[id]/pacotes-decisao/novo` | RF-10 |
| T10 Ver versão de ESP ou RSK (somente leitura) | `/especificacoes/[espId]`, `/pareceres-risco/[rskId]` | RF-11 |
| T11 Decisão do pacote (confirmação em diálogo; aprovar indisponível e explicado se desatualizado; gerar, baixar e copiar o pedido) | `/pacotes-decisao/[decId]` | RF-12 a RF-14, RF-22 |
| T12 Agentes e teto de gasto | `/configuracao/agentes` | RF-17 a RF-19 |
| E01 E-mail de pacote pronto | Resend | RF-25 |

Acessibilidade: WCAG 2.2 AA, axe com `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa` em pelo menos três
estados por tela; foco, teclado e anúncios que o axe não pega ficam com o `qa-funcional` (`03`, seção 5). A 04
acrescenta à T11 a revisão visível do destino, dos níveis e do nível de aprovação antes de decidir (C-14), e o aviso
sobre dado pessoal no pedido (C-28).

## 5. Ameaças e controles

STRIDE nos 16 componentes de `02` e nas integrações (`04`, seção 2), com 7 fronteiras de confiança. O texto do
cliente e a saída do modelo são sempre não confiáveis; o pedido gerado vira instrução para agentes com Bash. São **40
controles** (C-01 a C-40), cada um com teste e todos critério de aceite de alguma tarefa do plano. Os que pesam mais:

| ID | Nível | Controle |
|---|---|---|
| C-01 | crítica | `disableSignUp`: `POST /api/auth/sign-up/email` não cria usuário |
| C-02 | crítica | `papel` com `input: false`: ninguém promove o próprio papel por `update-user` |
| C-04 | crítica | `exigirPessoa` dentro de **cada** rota, Server Action e página (middleware é só conveniência), com teste estático |
| C-11 | crítica | Autoria só do ator resolvido: `rascunhoAgente`, `autorTipo`, papel e aprovador nunca vêm do body |
| C-12 | crítica | `autorizar('registrar_decisao')` nega agente e sistema também no worker; papéis de aprovação conferidos |
| C-06 | alta | Limite de login por IP que o proxy sobrescreve, e bloqueio de 15 min da verificação após 5 falhas por conta |
| C-09, C-10 | alta | Token `wsod_` só em Bearer; escopo mínimo por agente (cada um cria só o seu artefato) |
| C-13 | alta | `desatualizado` recalculado sob a trava da demanda, com teste de concorrência |
| C-15, C-16 | alta, baixa | CSRF por `Origin` + JSON obrigatório, sem CORS; geração do pedido por `POST` |
| C-17 | alta | Zod em corpo, query e caminho antes do banco; corpo > 512 KB → 413; nenhum `sql.raw` |
| C-18, C-19 | alta | Texto de cliente e de agente só como texto (`react/no-danger`); CSP com nonce, `no-store` autenticado |
| C-20, C-21 | alta | Mapeador único de erro; log por lista de permissão; erro do Postgres reduzido a `{ classe, code }`; Sentry sem PII |
| C-22 | alta | Payload de job só com ids; nenhum sentinela nas tabelas do `pgboss` |
| C-23, C-24 | alta | Minimização em todo campo de todo agente (inclui cabeçalhos de e-mail encaminhado); provedor sem ferramentas, `maxTokens` ≤ 8.000, texto do cliente delimitado como dado |
| C-28 | alta | Pedido com e-mail, telefone ou CPF → 422 com o campo e o tipo, sem o valor |
| C-30 | alta | Histórico guarda só `{ "alterado": true }` para campos de texto livre |
| C-31 | alta | Expurgo inclui a entrada pendente de agente; prazo validado entre 1 e **365** dias no boot |
| C-34 | alta | `orquestrador_app` sem posse, sem DDL; nas imutáveis só `SELECT` e `INSERT`; guarda no CI |
| C-39 | alta | CI com `pnpm audit --prod --audit-level high`, varredura de segredo, `--frozen-lockfile`, actions por SHA, permissões mínimas |

Ordem exigida no plano: logger e mapeador de erro (C-20, C-21) antes de qualquer rota; guarda de privilégios (C-34)
com a primeira migration; matriz de acesso e seu teste (C-10, C-12) antes das rotas de demanda. Risco `alto` no
`tarefas.json` para autenticação e 2FA, matriz, decisão e dupla aprovação, privilégios, minimização e provedor,
gerador do pedido, log e Sentry.

**LGPD** (`04`, seção 4): doze categorias de dado (D1 a D12) com base legal, retenção e expurgo propostos. Texto bruto
90 dias; nome do solicitante, anexos e conteúdo de ESP, RSK e DEC enquanto a demanda não fecha, mais 5 anos, com
anonimização futura; sessão 8 h + 30 dias (C-32); backup no máximo 30 dias. **Pré-condição para ligar qualquer agente
em produção** (fora da construção): base legal e transferência internacional (art. 33) confirmadas por
`juridico-contratos`, termos do provedor, registro da operação com `compliance-governanca`, teto e preço definidos.

## 6. Fora do escopo

- Entrada automática por e-mail, chat ou formulário externo.
- Qualquer mensagem ao solicitante ou a cliente, inclusive as dúvidas em aberto.
- Envio automático do pedido ao /construir e retorno de andamento: o pedido é baixado e copiado à mão, e os status
  `aprovada`, `em_construcao`, `entregue` e `devolvida` mudam à mão.
- Upload de anexo (anexo é só referência; o servidor nunca busca a URL).
- Chamada real ao provedor de IA e ao Resend na construção; ativação dos agentes em produção.
- Cadastro público, recuperação de senha por e-mail, gestão de usuários pelo painel.
- Mais de uma empresa na mesma base.
- Deploy, serviços e variáveis no Easypanel, merge na main e migration em produção (ações de Fabiano).
- Integração com Notion ou Slack; opções C e D na decisão.
- Job de anonimização de 5 anos (a 0.1.0 só grava a data do status final).

## 7. Pendências

### Para Fabiano decidir nesta parada

| ID | Pendência | Origem | Se não decidir agora |
|---|---|---|---|
| P1-a | Quem registra a aprovação da administradora: ela própria, com conta e 2FA, ou o CTO, informando a referência ao documento assinado? | 01, 02, 03, 04 | O código nasce no modo mais restrito (só a própria administradora); o modelo já aceita os dois |
| P1-b | A administradora pode aprovar DEC de nível "Só o CTO"? | 03, 04 (C-12) | Não pode (tela e API restritas ao CTO) |
| P1-c | Regra mínima de nível de aprovação (ex.: risco jurídico `alto` exige `cto_e_administradora`)? | 04 | O nível escolhido no DEC vale sozinho; DEC de agente com nível rebaixado depende só da revisão humana (C-14) |
| P1-d | A aprovação do DEC muda a demanda para `aprovada` sozinha? | 01 | Não: fica manual, como diz a ESP, com lembrete na T11 |
| P1-e | Novas tentativas do agente: 3 no total (esperas de 30 s e 2 min) ou 3 **novas** (4 no total, + 10 min)? | 01, 02 | 3 no total |
| P1-f | Moeda do teto e do preço: US$? | 03 | US$ (muda só o rótulo) |

Valor do teto e tabela de preço por modelo não precisam de resposta agora: ficam no banco, o teto nasce 0 e só
importam quando um agente for ligado.

### Para outras áreas, sem bloquear a construção

| ID | Pendência | Dono |
|---|---|---|
| J-01 | Confirmar 90 dias do texto bruto, 5 anos após status final, bases legais de D1 a D8 e transferência internacional antes de ligar agente | `juridico-contratos` |
| J-02 | Registro da operação de tratamento (D1 a D12) | `compliance-governanca` |
| J-03 | Aceite formal do risco residual: nome de pessoa em texto livre ainda chega ao provedor; instrução injetada que passe pela revisão humana chega ao /construir | `gestao-riscos`, com aceite de Fabiano |
| T-01 | Onde guardar a entrada pendente do orquestrador antes de a demanda existir (03 pede lista "aguardando"; 02 tem `entrada_bruta` com PK = `demanda_id`). C-22 e C-31 valem em qualquer escolha | `tech-lead` (05) |
| T-02 | Conferir no pg-boss 12.34.0: `migrate: false` no `start`, executor de transação na opção `db` do `send` e `singletonKey` por tentativa | `tech-lead` (05) |
| T-03 | Estado do job exposto à T05 ("agente trabalhando") e total da fila em `GET /demandas` | `tech-lead` (05) |
| T-04 | Script de desativação de conta (D6): entra no plano ou fica para a 0.2.0 | `tech-lead` (05) |
| T-05 | Estrutura de `riscos` no RSK: a T08 tratou mitigação e pré-condições como listas | `tech-lead` (05) |
| O-01 | `deploy.md`: chaves só no `worker`; `app` sem `DATABASE_URL_MIGRATOR`; `db` sem porta; HSTS; cabeçalho de IP do proxy (C-06); SPF/DKIM; backup ≤ 30 dias; ordem backup → migrate → deploy; uma réplica de worker; rollback | `devops-sre` (09) |
| O-02 | Meta de disponibilidade em produção | `devops-sre` (09) |
| F-01 | Custo recorrente: Postgres e dois contêineres na VPS; IA em zero; reavaliar ao ligar agentes | `finops` |
| **X-01** | **Defeito do /construir**: o conferir recusa `git -C <repo> …`, e sem `-C` o git do agente olha a estruturaAutonoma. Bloqueou a 02 duas vezes e vai bloquear os engenheiros da 06. Corrigir antes da 06 (mudança em ferramenta ou agente) | Fabiano (demanda à parte) |

## 8. Divergências entre as entregas e o que vale

| Ponto | 02 | 03 / 04 | Vale |
|---|---|---|---|
| Prazo configurável do texto bruto | 1 a 3.650 dias | 04: 1 a 365 (C-31) | **04** |
| Geração do pedido | `GET .../pedido-construcao` | 04: `POST` (C-16) | **04** |
| Limite de corpo | — | 04: 512 KB → 413 nas rotas; Server Actions 1 MB | **04** |
| Rota da configuração | `/configuracao` | 03: `/configuracao/agentes` | o plano escolhe; tela é a T12 |
| Rota do novo RSK e do novo DEC | `/nova` | 03: `/novo` | o plano escolhe |
| Tela de edição da demanda | não listada | 03: T06 `/demandas/[id]/editar` | entra (03) |
| Revisão na T11 | — | 04 acrescenta destino, níveis e nível de aprovação (C-14) e o aviso de dado pessoal (C-28) | entra (04) |
