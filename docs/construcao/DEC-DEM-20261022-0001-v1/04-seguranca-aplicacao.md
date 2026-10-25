---
pedido: DEC-DEM-20261022-0001-v1
etapa: 04-ameacas
agente: seguranca-aplicacao
leu: [pedido.json, 01-analista-requisitos.md, 02-arquiteto-solucoes.md, 03-ux-ui-design.md, padrao-tecnico.md, contrato-passagem.md, passagens.jsonl, pedido.mjs]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Modelo de ameaças do WS Orquestrador de Demandas 0.1.0, sobre o desenho da etapa 02 (volta 3) e as telas da etapa
03. Referências: OWASP Top 10 (2021), OWASP ASVS 4.0.3 nível 2 e LGPD (Lei 13.709/2018). Escala de nível: crítica,
alta, média, baixa. É o nível da ameaça **antes** do controle. Na dúvida entre dois níveis, ficou o mais alto.

### 1. Fronteiras de confiança

| # | Fronteira | O que atravessa | Confiança |
|---|---|---|---|
| F1 | Navegador → app | sessão do Better Auth, Server Actions, rotas `/api` | não confiável até `exigirPessoa` |
| F2 | Agente externo → app | `Authorization: Bearer` de token de serviço | não confiável até `resolverAtor` e `autorizar` |
| F3 | Texto do cliente → sistema | texto bruto, anexos (referências), campos descritivos | **sempre** não confiável, inclusive depois de gravado |
| F4 | Worker → provedor de IA | conteúdo minimizado; volta texto gerado | a saída do modelo é não confiável (injeção de instrução) |
| F5 | App → /construir | Pedido de Construção baixado e copiado à mão para o git da estruturaAutonoma | o pedido vira instrução para agentes com Bash |
| F6 | App e worker → Sentry, Resend, log | erros, aviso de DEC, linhas do pino | sem dado pessoal nem segredo |
| F7 | App → Postgres | papel `orquestrador_app` (sem DDL); migrator só em `scripts/migrate.ts` | o banco é a última barreira da imutabilidade |

### 2. STRIDE por componente

Cada componente da seção 2 de `02-arquiteto-solucoes.md` tem as seis letras avaliadas. As integrações externas da
seção 5 de 02 ficam no fim (2.17). A coluna "Controle" cita os controles da seção 3 ou peças já previstas em 01 e 02.

#### 2.1 Painel (`src/app/(painel)/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Página ou Server Component aberto sem sessão, ou com sessão sem 2FA, por confiar só no proxy ou middleware do Next (desvio de middleware, como no CVE-2025-29927) | crítica | C-04 |
| T | Server Action chamada por POST forjado de outro site (CSRF) ou com campos extras de autoria e papel (atribuição em massa) | alta | C-11, C-15 |
| R | Pessoa nega ter registrado uma decisão | média | diálogo de confirmação da T11, evento com a pessoa (RF-21), sessão com 2FA (C-04) |
| I | XSS por texto do cliente ou de agente (ESP, RSK, anexo `javascript:`); página com texto bruto guardada em cache; clickjacking da T11; redirecionamento aberto depois do login | alta | C-18, C-19, C-40 |
| D | Formulário com corpo enorme | baixa | limite de 1 MB das Server Actions, RNF-04, C-17 |
| E | Conta administradora usa a ação de CTO que a T12 só mostra desabilitada | alta | C-12, C-26: a API decide; a tela só reflete |

#### 2.2 API (`src/app/api/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Token forjado, roubado ou passado na query; requisição com cookie e Bearer ao mesmo tempo, com ator ambíguo | alta | C-09 |
| T | Injeção SQL por parâmetro de caminho ou filtro; atribuição em massa (`autorTipo`, `rascunhoAgente`, `aprovadorNome`) | alta | C-17, C-11 |
| R | Ação feita com token sem identificar o agente | média | CA-02.4; evento com o agente e o prefixo do token (C-09) |
| I | Resposta de erro com SQL, pilha ou parâmetros da consulta (mensagem do Drizzle); CORS aberto; cabeçalhos de segurança ausentes | alta | C-20, C-15, C-19 |
| D | Corpo gigante; criação em massa que esgota os 9.999 ids | média | C-17, C-36 |
| E | Token de agente em rota de pessoa; rota nova sem linha na matriz | crítica | matriz como dado (02, seção 6) e teste que percorre todas as rotas (CA-02.1, CA-02.2); C-10 |

#### 2.3 Autenticação e acesso (`src/modules/acesso/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Cadastro aberto pelo endpoint padrão do Better Auth (`/api/auth/sign-up/email`); força bruta de senha e de código TOTP; IP forjado no `X-Forwarded-For` para fugir do limite; "confiar neste dispositivo" pulando o código | crítica | C-01, C-05, C-06 |
| T | Usuário muda o próprio `papel` por `/api/auth/update-user` (administradora vira CTO) | crítica | C-02 |
| R | Login, ativação e desativação de 2FA, criação e revogação de token sem rastro durável | média | C-08, C-37 |
| I | Segredo TOTP ou códigos de recuperação em claro; token em claro; e-mail no log de login que falhou | alta | C-33, C-09, C-21 |
| D | Quem tem a senha trava a verificação da conta legítima, errando o código de propósito | baixa | bloqueio só da verificação e só por 15 min (C-06); risco aceito na Decisão 6 |
| E | Plugins ou rotas extras (admin, magic link, troca de e-mail, exclusão de conta); primeira configuração do 2FA tomada por quem conhece a senha inicial | alta | C-03, C-08 |

#### 2.4 Demandas (`src/modules/demandas/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Demanda criada em nome de outro ator (autoria vinda do body) | alta | C-11 |
| T | Transição de status fora da tabela do RF-07, ou feita por agente | alta | `transicoes.ts` puro (02), CA-07.1 a CA-07.5, C-10 |
| R | Campo alterado sem registro | baixa | RF-21, com o recorte de C-30 |
| I | Texto bruto devolvido na leitura a um token de agente; nome do solicitante gravado no histórico imutável | alta | RF-06 (a leitura não traz texto bruto, com teste); C-30 |
| D | Sequência de ids esgotada por criação em massa, ou por `nextval` gasto em requisição recusada | média | C-36 |
| E | Token de agente muda status | alta | CA-07.4, C-10 |

#### 2.5 Especificações (`src/modules/especificacoes/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | ESP de agente gravada como se fosse de pessoa (`rascunho_agente` falso), o que dispensa a confirmação de revisão do RF-13 | crítica | C-11 |
| T | Edição de ESP gravada; injeção de instrução no texto do cliente que leva `sistemaAlvo` e `repositorioDestino` a um sistema que já está em produção (por exemplo `fabianojp06/nutridebby`, que passa no `validarPedido`) | alta | ADR-03 e C-34; C-14 (revisão humana do destino); C-24 |
| R | Autor da versão não identificado | baixa | autor e evento (RF-21) |
| I | ESP com dado pessoal de cliente que vai para o pedido e para o git | alta | C-28 |
| D | Listas enormes | baixa | RNF-04, C-17 |
| E | Agente grava ESP sem dúvida para pular `aguardando_informacao` | média | só gera mais rascunho, nunca decisão; C-14 |

#### 2.6 Pareceres de risco (`src/modules/pareceres-risco/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | RSK de agente gravado como de pessoa | crítica | C-11 |
| T | Agente (ou injeção) rebaixa os três níveis para facilitar a aprovação; edição de RSK gravado | alta | C-14 (níveis visíveis na T11), CA-13.4, C-34 |
| R | Autor não identificado | baixa | autor e evento |
| I | Comentário com dado pessoal que vai para `risco.conteudo` do pedido | alta | C-28 |
| D | Listas enormes | baixa | RNF-04 |
| E | Token de outro agente cria RSK | média | C-10 |

#### 2.7 Pacotes de decisão (`src/modules/pacotes-decisao/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Aprovação registrada em nome de outro papel (CTO como administradora; `aprovadorNome` do body) | crítica | C-11, C-12 |
| T | DEC desatualizado aprovado por corrida com ESP ou RSK nova; segunda decisão no mesmo DEC; aprovações com opções diferentes | alta | C-13, CA-11.3, CA-14.4 |
| R | Administradora nega a aprovação | média | referência ao documento assinado obrigatória (CA-14.3), evento, sessão com 2FA |
| I | Token de agente lê o DEC | baixa | só leitura, prevista no RF-02; C-10 |
| D | Nenhuma relevante (volume baixo) | baixa | — |
| E | Agente aprova pela rota ou pelo worker; agente de consolidação rebaixa `nivelAprovacaoRequerido` para `cto` e dispensa a dupla aprovação | crítica | C-12, CA-02.1; para o nível, C-14 mais a pendência a Fabiano (regra mínima de nível) |

#### 2.8 Histórico (`src/modules/historico/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Ator errado no evento | média | ator só de `resolverAtor` (C-11) |
| T | Evento apagado ou editado | alta | C-34, CA-21.2 |
| R | Ação de negócio gravada sem evento | média | evento na mesma transação; falha no evento desfaz tudo (02) |
| I | Texto bruto, nome ou anexo do solicitante em `antes` e `depois`, numa tabela que não aceita expurgo | alta | C-30, CA-21.3 |
| D | Crescimento da tabela | baixa | 200 demandas por mês (RNF-05) |
| E | Leitura do histórico por agente | baixa | rota só de pessoa (02, seção 6) |

#### 2.9 Agentes de IA (`src/modules/agentes/`, `src/agents/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Provedor real usado na construção ou no CI | baixa | a fábrica só devolve o real com a chave definida (ADR-08); CA-16.5 |
| T | Injeção de instrução no texto do cliente altera a saída (campos, destino, níveis, dúvidas, recomendação) | alta | C-24, schema Zod da rota (ADR-09), C-14, rascunho de agente |
| R | Chamada ao provedor sem linha de uso | média | CA-17.1, CA-17.2 |
| I | Dado pessoal de terceiro enviado ao provedor, fora do Brasil | alta | C-23; base legal e transferência internacional antes de ligar (seção 4) |
| D | Custo sem controle (saída longa, laço de tentativas, duas réplicas de worker) | alta | teto (RF-18), C-24 (`maxTokens`), 3 tentativas (RNF-06), batimento (02) |
| E | Modelo com ferramentas (tool use, MCP) executando uma ação | alta | C-24 |

#### 2.10 Pedido de Construção (`src/modules/pedido-construcao/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Pedido montado de DEC pendente, devolvido ou com só uma das duas aprovações | alta | CA-22.4 |
| T | Pedido que leva instrução injetada aos agentes do /construir, que têm Bash; JSON editado entre o download e a cópia | alta | C-14; `validarPedido` de novo na entrada do /construir; risco residual com `gestao-riscos` |
| R | Geração não registrada | baixa | evento de geração (RF-22) |
| I | Dado pessoal de cliente gravado no git da estruturaAutonoma, onde não há expurgo | alta | C-28 |
| D | Nenhuma relevante | baixa | — |
| E | Token de agente gera pedido | alta | rota só de pessoa (CA-02.2) |

#### 2.11 Avisos (`src/modules/avisos/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | E-mail falso de "pacote pronto" (phishing) | baixa | o e-mail não pede credencial; SPF e DKIM do remetente no `deploy.md` (seção 5) |
| T | Link do e-mail montado com o cabeçalho `Host` e apontando para outro domínio | média | C-38 |
| R | Envio sem registro | baixa | `aviso_email` (02) |
| I | Título ou nome do solicitante no corpo do e-mail | média | CA-25.3, C-38 |
| D | Falha do Resend trava a decisão | baixa | a decisão não depende do e-mail (02) |
| E | Nenhuma (não há entrada externa) | baixa | — |

#### 2.12 Retenção (`src/modules/retencao/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nenhuma (job interno) | baixa | — |
| T | Expurgo apaga campos estruturados ou histórico | média | `UPDATE` só nas três colunas de `entrada_bruta` (C-34) |
| R | Expurgo sem rastro | média | CA-24.1 |
| I | Texto que escapa do expurgo: payload de job, entrada pendente de agente, backup, prazo configurado alto demais | alta | C-22, C-31; backup na seção 5 |
| D | Job falhando por dias seguidos | média | Sentry e nova tentativa no dia seguinte (02); data do último expurgo visível (C-31) |
| E | Nenhuma | baixa | — |

#### 2.13 Worker (`src/worker/`, `src/jobs/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Segunda instância processa a fila | média | batimento e alerta de duas instâncias (02, seção 8) |
| T | Payload de job adulterado no banco | baixa | payload só com ids; o worker relê tudo do banco (C-22) |
| R | Falha de agente sem evento | baixa | CA-16.3 |
| I | Chave do provedor de IA ou do Resend acessível ao processo do app | média | C-27 |
| D | Job travado ou órfão | média | reivindicação condicional e varredura (02, seção 8) |
| E | Worker age como pessoa (decide, liga agente, muda teto) | crítica | `autorizar` também no worker, com ator agente ou sistema (C-12) |

#### 2.14 Banco (`src/db/`, `drizzle/`, `scripts/migrate.ts`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | App usando a credencial do migrator | alta | ADR-12, C-27 |
| T | `UPDATE`, `DELETE` ou `TRUNCATE` em versão e histórico; papel do app dono das tabelas, o que anula o `GRANT` | alta | C-34 |
| R | Nenhuma nova (o histórico cobre) | baixa | — |
| I | Porta do banco publicada; backup com texto bruto fora do prazo | média | C-35; backup na seção 5 |
| D | Consulta longa | baixa | `statement_timeout` de 10 s (02) |
| E | DDL pelo papel do app | alta | C-34, ADR-04 |

#### 2.15 Utilidades (`src/lib/`: log, erros, relógio, adaptador HTTP)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Nenhuma | baixa | — |
| T | Relógio injetável aceitando valor externo em produção | baixa | o relógio só é injetado nos testes; em produção a fábrica usa o do sistema |
| R | Linha de log sem tipo de ator | baixa | log por requisição com tipo de ator (02, seção 11) |
| I | Dado pessoal ou segredo no pino ou no Sentry (parâmetros na mensagem do Drizzle, `detail` do Postgres com a linha recusada, `input` em issue do Zod) | alta | C-21, C-20 |
| D | Log volumoso | baixa | — |
| E | Nenhuma | baixa | — |

#### 2.16 Scripts (`scripts/`)

| STRIDE | Ameaça | Nível | Controle |
|---|---|---|---|
| S | Senha ou token capturados no histórico do shell ou no `ps`, por virem em argumento | média | C-08, C-37 |
| T | `seed-ficticio.ts` rodando em banco real | média | guarda de 02 e C-37 |
| R | Token criado ou revogado sem evento | média | C-37 |
| I | Token impresso pelo pino | média | C-37 |
| D | Nenhuma | baixa | — |
| E | `criar-usuario.ts` grava papel fora de `cto` e `administradora` | média | Zod no script (C-37) |

#### 2.17 Integrações externas (seção 5 de 02)

| Integração | Ameaça principal | Nível | Controle |
|---|---|---|---|
| API Anthropic | I: dado pessoal enviado; E: uso de ferramentas; D: custo | alta | C-23, C-24, RF-18 |
| Resend | I: dado de terceiro no corpo; T: link adulterado | média | C-38 |
| Sentry | I: corpo de requisição, cookie, parâmetros de SQL no evento | alta | C-21 |
| Pedido → /construir | T e I: injeção e dado pessoal | alta | C-14, C-28 |

### 3. Controles exigidos

Todo controle é critério de aceite de alguma tarefa do plano. "Teste" quer dizer teste automatizado no Vitest
(Testcontainers) ou no Playwright, com dado fictício.

| Id | Nível | Controle (critério verificável) | Cobre |
|---|---|---|---|
| C-01 | crítica | Better Auth com `emailAndPassword.disableSignUp: true`. Teste: `POST /api/auth/sign-up/email` com dados fictícios responde fora de 2xx e `user` não ganha linha | 2.3 S, CA-01.4 |
| C-02 | crítica | `papel` declarado como campo adicional com `input: false`; toda rota de pessoa exige `papel` em (`cto`, `administradora`). Teste: conta administradora chama `POST /api/auth/update-user` com `papel: "cto"` e o papel no banco continua `administradora`; conta sem papel válido recebe 403 | 2.3 T |
| C-03 | alta | Só os plugins de senha e `twoFactor`; sem provedor social, magic link, OTP por e-mail, `admin` ou `anonymous`; `user.changeEmail.enabled` e `user.deleteUser.enabled` falsos; sem `sendResetPassword`; `trustedOrigins` só com a origem de `BETTER_AUTH_URL`. Teste que lê as opções de `auth` e confere a lista; teste em que a rota de redefinição de senha não gera e-mail no `EnviadorFalso` | 2.3 E |
| C-04 | crítica | `exigirPessoa` (sessão válida, TOTP ativo, papel válido) chamado dentro de **cada** rota de pessoa, **cada** Server Action e **cada** página do painel fora de `/entrar` e `/configurar-2fa`; o proxy ou middleware é só conveniência. Testes: (a) a matriz percorre todas as rotas de pessoa com sessão sem 2FA e espera 403; (b) teste estático varre `src/app/**` e falha se um arquivo com `'use server'` ou `page.tsx` do painel não chamar `exigirPessoa`; (c) e2e: conta sem 2FA que abre `/demandas` vai a `/configurar-2fa` | 2.1 S, 2.3 S |
| C-05 | alta | Verificação do código sempre com `trustDevice` falso; a T01 não tem "lembrar dispositivo". Teste: depois de sair, novo login da mesma conta no mesmo contexto do navegador pede o código | 2.3 S |
| C-06 | alta | Login: 10 tentativas por minuto por IP (RNF-12). Código TOTP e de recuperação: 5 falhas por conta em 15 min bloqueiam a verificação dessa conta por 15 min, de qualquer IP. O IP vem do cabeçalho que o proxy do Easypanel **sobrescreve**, nunca do primeiro valor do `X-Forwarded-For` mandado pelo cliente. Testes: 11ª tentativa no minuto responde 429 mesmo com o `X-Forwarded-For` trocado a cada requisição; a 6ª verificação de código, de IPs diferentes, é recusada durante o bloqueio | 2.3 S |
| C-07 | alta | Cookie de sessão `HttpOnly`, `Secure` fora do desenvolvimento, `SameSite=Lax`, prefixo `__Secure-`; sessão de 8 h fixa (ADR-11); "Sair" apaga a sessão no banco. Teste: `Set-Cookie` do login com os atributos em modo produção; o cookie antigo recebe 401 depois de sair | 2.3 S |
| C-08 | média | `criar-usuario.ts` gera senha inicial aleatória de 20 ou mais caracteres, mostrada uma vez e nunca recebida por argumento ou variável de ambiente. Conta sem 2FA ativo: a sessão vale 15 min e só abre `/configurar-2fa`. Ativar e desativar 2FA grava evento (ator pessoa, sem segredo). Testes: script com `argv` sem senha; `exigirPessoa` com relógio injetado recusa a sessão sem 2FA aos 16 min; evento presente | 2.3 E e R |
| C-09 | alta | Token de serviço com 32 bytes de `crypto.randomBytes` e prefixo fixo `wsod_` (para a varredura de segredo achar); guardado só como SHA-256; aceito só em `Authorization: Bearer`, nunca em query ou cookie; requisição com cookie de sessão e Bearer juntos responde 400; o evento do ator agente leva o agente e o prefixo do token, nunca o token. Testes: CA-02.3, CA-02.5, token na query responde 401, cookie e Bearer juntos respondem 400 | 2.2 S e R |
| C-10 | alta | Escopo mínimo por agente na matriz: `orquestrador` cria demanda; `insumo_tecnico` cria ESP; `risco` cria RSK; `consolidacao` cria DEC; os quatro leem demanda, ESP, RSK e DEC; nenhum lê histórico, texto bruto ou configuração. Teste da matriz: token de `risco` em `POST /api/demandas/:id/especificacoes` responde 403 (e as combinações equivalentes) | 2.2 E, 2.6 E |
| C-11 | crítica | Autoria vem só do ator resolvido: `autor_tipo`, `autor_id`, `rascunho_agente`, `responsavel`, `papel_aprovacao`, `registrada_por`, `nome_aprovador` e `decidida_por` não existem nos schemas de entrada, e chave desconhecida é descartada. Testes: token de agente envia `rascunhoAgente: false` e `autorTipo: "pessoa"` e o artefato fica com `rascunho_agente = true` e autor agente; CA-13.5; CTO envia `papelAprovacao: "administradora"` e a aprovação fica com papel `cto` | 2.1 T, 2.2 T, 2.4 S, 2.5 S, 2.6 S, 2.7 S |
| C-12 | crítica | `autorizar('registrar_decisao')` nega ator agente e sistema, também quando chamado pelo worker (teste unitário de `autorizar`, além de CA-02.1). Aprovação com papel `administradora` só por conta de papel `administradora`; DEC de nível `cto` só aprovado por conta `cto` (a mesma regra da T11), até Fabiano decidir as pendências. Ligar agente e mudar teto só por `cto`. Testes: CTO registrando como administradora responde 403; administradora aprovando DEC de nível `cto` responde 403; `PATCH /api/agentes/:agente` e `PUT /api/configuracao/teto` com conta administradora respondem 403 | 2.7 S e E, 2.13 E, 2.1 E |
| C-13 | alta | `desatualizado` recalculado na transação da decisão, sob `SELECT … FOR UPDATE` da demanda (02, seção 4). Teste de concorrência com duas conexões: aprovação e gravação de ESP v2 ao mesmo tempo terminam em um destes dois resultados: DEC aprovado e ESP v2 gravada depois, ou ESP v2 gravada e aprovação com 409. Nunca DEC aprovado depois da ESP v2 | 2.7 T |
| C-14 | alta | Revisão humana visível na T11: antes do formulário aparecem, da ESP citada, `sistema_alvo`, `repositorio_destino`, critérios de aceite e definição de pronto; do RSK citado, os três níveis; o nível de aprovação do DEC; e o selo "Rascunho de agente" em cada artefato gerado por agente. O diálogo de confirmação repete o repositório destino e o nível. E2e confere esses textos num DEC fictício de agente | 2.5 T, 2.6 T, 2.7 E, 2.9 T, 2.10 T |
| C-15 | alta | CSRF: rota com cookie e método `POST`, `PATCH`, `PUT` ou `DELETE` exige `Origin` igual à origem de `BETTER_AUTH_URL` (ausente ou diferente: 403) e `Content-Type: application/json`; `serverActions.allowedOrigins` só com essa origem; nenhuma resposta com cabeçalho CORS. Requisição só com Bearer, sem cookie, não precisa de `Origin`. Testes: `PATCH` da decisão com cookie válido e `Origin: https://atacante.test` responde 403; sem `Origin` responde 403; `OPTIONS` não devolve `Access-Control-Allow-Origin` | 2.1 T, 2.2 I |
| C-16 | baixa | O que grava evento não aceita `GET`: a geração do pedido vira `POST /api/pacotes-decisao/:decId/pedido-construcao` (grava evento e devolve o JSON com `Content-Disposition: attachment`). Teste: `GET` responde 405 | 2.10 R (e CSRF por navegação, com `SameSite=Lax`) |
| C-17 | alta | Corpo, query e parâmetro de caminho validados por Zod antes de tocar o banco; parâmetro de caminho pela regex do formato (`^DEM-\d{8}-\d{4}$`, `^(ESP\|RSK\|DEC)-DEM-\d{8}-\d{4}-v\d{1,4}$`), fora dela 404 sem consulta; limites da RNF-04; corpo acima de 512 KB responde 413 antes do parse; nenhum `sql.raw` nem interpolação de entrada em SQL. Testes: CA-03.3, CA-06.2, corpo de 600 KB responde 413, teste estático falha se `sql.raw(` aparecer em `src/` | 2.2 T e D |
| C-18 | alta | Anexo `url` só com `https:` ou `http:` e até 2.048 caracteres; o servidor nunca busca a URL de anexo (sem pré-visualização, sem SSRF). O painel mostra texto de cliente e de agente como texto: sem autolink, sem markdown, sem `dangerouslySetInnerHTML` (regra ESLint `react/no-danger` como erro); link de anexo com `rel="noopener noreferrer"`. Testes: anexo `javascript:alert(1)` responde 400; e2e com ESP fictícia contendo `<script>` e `<img src=x onerror=…>` mostra o texto literal e não executa nada | 2.1 I |
| C-19 | alta | Cabeçalhos em toda resposta do app: CSP com nonce (`default-src 'self'; script-src 'self' 'nonce-…'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security` em produção, `poweredByHeader: false`; resposta autenticada (página e API) com `Cache-Control: no-store`. Teste de integração confere os cabeçalhos em `/demandas/[id]` e em `GET /api/demandas/:id` | 2.1 I, 2.2 I |
| C-20 | alta | Um mapeador único de erro: `ErroDominio` vira 400, 403, 404, 409 ou 422 com mensagem pt-BR; qualquer outro vira 500 genérico; a resposta nunca leva a mensagem do Postgres, do Drizzle (que traz os parâmetros da consulta) nem `input` de issue do Zod. Teste: violação de `CHECK` provocada com valor-sentinela fictício responde sem o sentinela | 2.2 I, 2.15 I |
| C-21 | alta | Log por lista de permissão: a linha de requisição tem só método, rota-padrão, status, duração, tipo de ator e código de erro. Erro do Postgres e do Drizzle vira `{ classe, code }` **antes** de ir ao pino ou ao Sentry (a mensagem traz os parâmetros e o `detail` traz a linha recusada). Login que falhou é registrado sem o e-mail. O `redact` de 02 continua como segunda barreira, com `*.email`, `*.nome`, `*.anexos` e `*.referencia` a mais. Sentry com `sendDefaultPii: false` e `beforeSend` que remove `request.data`, cookies, cabeçalhos e `extra`. Teste da RNF-10 ampliado: fluxo completo **e** caminhos de erro (400, 409, violação de restrição, agente fora do schema, Resend falhando) com sentinelas fictícios; zero ocorrência na saída capturada do pino e no transporte falso do Sentry | 2.15 I, 2.17 Sentry |
| C-22 | alta | Payload de job só com ids: `agente.executar` leva `{ execucaoId }`, `aviso.dec-pronto` leva `{ decId }`; nenhum texto, nome ou e-mail em tabela do esquema `pgboss` nem em `execucao_agente`. Teste: depois do fluxo com sentinelas, nenhuma linha das tabelas do esquema `pgboss` contém um sentinela | 2.12 I, 2.13 T |
| C-23 | alta | Minimização em **todo** campo de texto enviado a **todo** agente, não só no texto bruto: e-mail, telefone brasileiro, CPF e CNPJ viram marcadores, e linhas de cabeçalho de e-mail encaminhado (`De:`, `Para:`, `Cc:`, `Cco:`, `Enviado:`, `Responder para:`, `From:`, `To:`, `Cc:`, `Bcc:`, `Sent:`, `Reply-To:`) saem inteiras. Lista de permissão de campos por agente (02, seção 8, passo 4). Testes: CA-20.1, CA-20.2, mais `contexto` com e-mail fictício e um cabeçalho `De: Pessoa Ficticia <x@exemplo.test>`, que não chegam ao provedor falso | 2.9 I |
| C-24 | alta | Provedor sem ferramentas: `ProvedorIA.gerar` não aceita `tools`; o `ProvedorAnthropic` não passa `tools`, `tool_choice` nem servidor MCP; `maxTokens` por agente de no máximo 8.000; o texto do cliente vai depois das instruções, num bloco delimitado como dado, com a instrução de que ordens dentro dele não valem. Testes: `ProvedorAnthropic` com `fetch` injetado, sem rede, confere que o corpo enviado não tem `tools` e tem `max_tokens` ≤ 8.000; teste do montador confere o delimitador | 2.9 T, D e E |
| C-25 | alta | Saída de agente só por `safeParse` no schema da rota (ADR-09); nada da saída define status, autoria ou ator; os textos da saída seguem as regras de exibição de C-18 e de pedido de C-28. Testes: CA-16.2, CA-16.3; saída com `status: "aprovada"` ou `rascunhoAgente: false` não muda nada | 2.9 T |
| C-26 | alta | Teto e interruptor conferidos antes de **cada** chamada (CA-18.1, CA-18.3, CA-19.4); valor inicial 0; preço por modelo só por script (02). Teste: CA-18.4, mais a conta administradora em `PUT /api/configuracao/teto` respondendo 403 | 2.1 E, 2.9 D |
| C-27 | média | `ANTHROPIC_API_KEY` e `RESEND_API_KEY` lidas só pelo worker e pelas fábricas que ele usa; `DATABASE_URL_MIGRATOR` lida só por `scripts/migrate.ts` e pelo `start:hml`. Teste estático: o nome da variável fora dos arquivos permitidos quebra o teste | 2.13 I, 2.14 S |
| C-28 | alta | Pedido sem dado pessoal: antes de responder, o gerador passa o JSON inteiro pelos detectores de C-23 (e-mail, telefone e CPF; CNPJ não, ver Decisões); achou, responde 422 com o caminho do campo e o tipo (`especificacao.conteudo: e-mail`), **sem o valor**, e nada é entregue. A T11 avisa: "O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail ou telefone de cliente na ESP nem no parecer de risco." Testes: ESP fictícia com `contato@exemplo.test` responde 422 sem o valor; CA-22.6 | 2.5 I, 2.6 I, 2.10 I |
| C-29 | média | Download com `Content-Type: application/json; charset=utf-8`, `nosniff` e `filename` montado do id já validado pela regex; cópia do `validarPedido` conferida por SHA-256 (ADR-05). Teste de cabeçalho e o teste do `ORIGEM.md` | 2.10 T |
| C-30 | alta | Histórico sem dado de terceiro: em mudança de campo, `antes` e `depois` só guardam enumeração, status, id, número e data. Para `titulo`, `solicitanteNome`, `anexos`, `contexto`, `descricaoProblema`, `impactoPercebido` e `justificativaUrgencia`, grava só `{ "alterado": true }`. Testes: `PATCH` de `solicitanteNome` com sentinela e nenhum evento contém o sentinela; CA-06.4 (enumeração) continua com antes e depois | 2.4 I, 2.8 I |
| C-31 | alta | O expurgo do RF-24 também limpa a entrada pendente de agente (texto, nome e papel guardados antes de a demanda nascer, T03 e T04), seja qual for a tabela que a 05 escolher; `RETENCAO_TEXTO_BRUTO_DIAS` validado entre 1 e **365** no boot (fora disso, o app e o worker não sobem); a data do último expurgo aparece em `/configuracao`. Testes: CA-24.1 a CA-24.4; entrada pendente de 91 dias expurgada; boot com 400 falha | 2.12 I e D |
| C-32 | média | O job diário também apaga as linhas de `session` vencidas há mais de 30 dias e as de `verification` vencidas (a sessão guarda IP e user agent). Teste com relógio injetado | LGPD D7 |
| C-33 | média | Segredo TOTP e códigos de recuperação cifrados pelo plugin (padrão do Better Auth), códigos de recuperação de uso único; `BETTER_AUTH_SECRET` com 32 bytes ou mais, conferido no boot. Testes: a coluna do segredo em `two_factor` não é o segredo base32 em claro; código de recuperação usado duas vezes é recusado na segunda; boot com segredo curto falha | 2.3 I |
| C-34 | alta | Papel `orquestrador_app` sem posse de tabela ou sequência, sem superusuário, `CREATEROLE`, `CREATEDB` ou `CREATE` em esquema; nas tabelas imutáveis, só `SELECT` e `INSERT` (sem `UPDATE`, `DELETE`, `TRUNCATE`, `TRIGGER` nem `REFERENCES`); em `entrada_bruta`, `UPDATE` só em `texto`, `origem` e `expurgada_em`. A guarda da ADR-03 confere tudo isso por `pg_catalog` e roda no CI. Testes: CA-11.2, CA-21.2 e `TRUNCATE evento` recusado com o papel do app | 2.8 T, 2.12 T, 2.14 T e E |
| C-35 | média | Postgres de desenvolvimento só em `127.0.0.1`; na produção, sem porta publicada (item do `deploy.md`). Conferência: `docker-compose.dev.yml` e `docker-compose.hml.yml` sem publicação do `db` fora de `127.0.0.1` | 2.14 I |
| C-36 | média | Por ator, no máximo 30 demandas e 60 artefatos (ESP, RSK, DEC somados) por hora, com 429 acima disso; o `nextval` da sequência só roda depois da validação Zod, dentro da transação de inserção. Testes: 31ª criação na hora, com relógio injetado, responde 429; um 400 de validação não avança a sequência | 2.2 D, 2.4 D |
| C-37 | média | Scripts: senha e token nunca em argumento nem em variável de ambiente; o token sai uma vez na saída padrão e nunca no pino; criar e revogar token gravam evento com o prefixo; papel validado por Zod (`cto` ou `administradora`); `seed-ficticio.ts` com as guardas de 02. Teste de cada script com banco do Testcontainers | 2.16 |
| C-38 | média | Destinatário do aviso só de `EMAIL_AVISO_DECISAO`; link montado de `BETTER_AUTH_URL`, nunca de cabeçalho; id do DEC validado pela regex antes de entrar no corpo. Testes: CA-25.3 e o link do e-mail começando pela origem configurada | 2.11 |
| C-39 | alta | Portões no CI: `pnpm audit --prod --audit-level high` quebra o job; varredura de segredo (gitleaks ou equivalente) no histórico do ramo; `pnpm install --frozen-lockfile`; actions fixadas por SHA de commit; `permissions` mínimas por workflow (`contents: read` no `ci.yml`; `packages: write` só no `deploy.yml`). Conferência na revisão da tarefa de CI e no CI verde do PR | dependência vulnerável, segredo em repositório |
| C-40 | média | Volta depois do login só para caminho relativo do painel (começa com `/`, não com `//` nem `/\`, e está na lista de rotas do painel); fora disso, vai para `/demandas`. Teste: `/entrar?callbackURL=https://atacante.test` termina em `/demandas` | 2.1 I |

### 4. Dados pessoais (LGPD)

Bases legais e prazos são proposta desta etapa; `juridico-contratos` confirma na Parada 1, como o 01 e a ESP já
preveem para os 90 dias. "Status final" = `entregue` ou `encerrada`.

| Id | Dado | Titular | Onde fica | Finalidade | Base legal (proposta) | Retenção | Expurgo |
|---|---|---|---|---|---|---|---|
| D1 | Texto bruto colado | solicitante e terceiros citados | `entrada_bruta.texto`; entrada pendente de agente | entender a demanda | art. 7º, V (procedimentos preliminares a contrato, a pedido do titular) para cliente e prospect; art. 7º, IX (legítimo interesse, com teste de balanceamento) para terceiros citados e solicitante interno | 90 dias desde `recebida_em` (configurável de 1 a 365) | job diário do RF-24 com C-31; nenhuma cópia em log, job ou histórico (C-21, C-22, C-30) |
| D2 | Metadados de origem (canal, referência) | idem | `entrada_bruta.origem` | rastrear a origem | idem D1 | 90 dias | idem D1 |
| D3 | Nome e papel do solicitante | solicitante | `demanda.solicitante_nome`, `solicitante_papel` | contato e contexto | idem D1 | enquanto a demanda não chega a status final, mais 5 anos (prazo prescricional; CC art. 206 e CDC art. 27) | anonimização ("Solicitante removido") por job, a entregar antes de o primeiro registro chegar ao prazo (2031); a 0.1.0 grava a data do status final em evento, o que basta para o job futuro achar os registros. Nunca no histórico (C-30), no provedor (RF-20) nem no pedido (CA-22.6) |
| D4 | Referências de anexo | solicitante e terceiros (a URL pode ter nome ou e-mail) | `demanda.anexos` | localizar o material | idem D1 | idem D3 | idem D3; nunca vai ao provedor (RF-20) nem ao pedido |
| D5 | Dado pessoal incidental em campo descritivo e no conteúdo de ESP, RSK e DEC (com a cópia da descrição no DEC) | terceiros citados | `demanda`, `especificacao_tecnica`, `parecer_risco`, `pacote_decisao` | registro técnico e da decisão | art. 7º, IX e VI (exercício regular de direitos) | idem D3 | as versões são imutáveis por desenho: a anonimização futura roda com o migrator, por migration de dado registrada no histórico. Minimização na entrada: dica na T07 e na T08 e C-28 no pedido |
| D6 | Conta: nome, e-mail, hash de senha, segredo TOTP, códigos de recuperação | Fabiano e a administradora | `user`, `account`, `two_factor` | autenticação | art. 7º, IX (segurança do acesso, art. 46) | enquanto a conta existir | remoção por script quando a pessoa deixar a função (pendência de script de desativação); segredo cifrado (C-33) |
| D7 | Sessão: IP e user agent | idem | `session` | segurança da sessão | art. 7º, IX | validade de 8 h, mais 30 dias | C-32 |
| D8 | Identificação de quem decidiu (ator, nome do aprovador) | idem | `evento`, `aprovacao`, `decisao`; `aprovadoPor` no pedido | prestação de contas da decisão (Regimento Interno) | art. 7º, VI e IX | igual a D5 no sistema; no pedido, permanente no git (só nome de pessoa da empresa, na função) | junto com D5; no git, não se expurga e por isso só vai o nome |
| D9 | Log do pino e evento do Sentry | não devem ter dado pessoal | saída do contêiner; Sentry | diagnóstico | — | rotação do log do Docker; Sentry com o padrão do plano | C-21 e o teste da RNF-10 garantem que não há dado pessoal para expurgar |
| D10 | Conteúdo minimizado enviado ao provedor de IA | terceiros | Anthropic (operador, fora do Brasil) | gerar rascunho | a de D1, mais a transferência internacional (art. 33) a definir | a do provedor | fora do controle da WSS; por isso C-23. Pré-condição de ligar agente em produção (seção 5) |
| D11 | E-mail de destino do aviso | Fabiano | variável de ambiente; Resend | aviso de DEC | art. 7º, IX | a do provedor | sem dado de terceiro no corpo (C-38, CA-25.3) |
| D12 | Backup do banco | todos acima | backup do Postgres na VPS e snapshot do hPanel | continuidade | a do dado original | no máximo 30 dias (proposta) | rotação do backup; o prazo efetivo do texto bruto fica em 90 + 30 dias e precisa estar escrito no `deploy.md` |

### 5. O que o plano (05) precisa conter

1. **Cada controle C-01 a C-40 como critério de aceite de uma tarefa**, com o teste citado na coluna do controle. Os
   controles críticos (C-01, C-02, C-04, C-11, C-12) e os de banco, log e acesso (C-09, C-10, C-15, C-17, C-20, C-21,
   C-34) entram na fase de fundação, **antes** da primeira rota de negócio.
2. **Ordem**: logger por lista de permissão e mapeador de erro (C-20, C-21) antes de qualquer rota; guarda de
   privilégios (C-34) junto da primeira migration; matriz de acesso com o teste que percorre as rotas (C-10, C-12) antes
   das rotas de demanda.
3. **Risco `alto` no `tarefas.json`** para as tarefas de: autenticação e 2FA, matriz e `autorizar`, decisão e dupla
   aprovação, privilégios do banco, minimização e provedor de IA, gerador do pedido, log e Sentry.
4. **Testes transversais obrigatórios**: o da matriz (todas as rotas × atores proibidos); o da RNF-10 ampliado (C-21);
   o de payload de job (C-22); o de concorrência da decisão (C-13); os estáticos (`exigirPessoa` em toda Server Action e
   página, `react/no-danger`, `sql.raw`, nomes de variável de segredo).
5. **CI** com os portões de C-39. Antes da 08, `pnpm audit --prod --audit-level high` limpo; dependência alta ou crítica
   bloqueia o release.
6. **Para o `deploy.md` (etapa 09)**: `ANTHROPIC_API_KEY` e `RESEND_API_KEY` só no serviço `worker`; o serviço `app` sem
   `DATABASE_URL_MIGRATOR`; `db` sem porta publicada; HTTPS com HSTS no proxy; qual cabeçalho do proxy do Easypanel
   leva o IP do cliente (C-06); SPF e DKIM do remetente; retenção de backup de no máximo 30 dias (D12).
7. **Pré-condições para ligar qualquer agente em produção** (fora da construção, para o manual técnico): base legal e
   transferência internacional confirmadas por `juridico-contratos`; termos comerciais do provedor com a retenção
   aplicável e, se possível, retenção zero; registro da operação de tratamento com `compliance-governanca`; teto e preço
   definidos por Fabiano.
8. **Revisão final (08)**: `/security-review` no PR e reteste deste agente para todo achado crítico ou alto.

### 6. Respostas às pendências dirigidas à 04

- 01, dado pessoal no pedido copiado para o git: tratado por C-28 (bloqueio com 422) e pelo aviso na T11.
- 02, matriz de acesso: aprovada com três ajustes: escopo por agente (C-10), aprovação de nível `cto` só por conta
  `cto` (C-12) e `exigirPessoa` dentro de cada Server Action e página (C-04).
- 02, CSRF por `Origin`: aprovado, com `Content-Type` JSON obrigatório, `allowedOrigins` das Server Actions e sem CORS
  (C-15).
- 02, `redact` do pino: sozinho não basta, porque o caminho com curinga pega um nível só e a mensagem do Drizzle leva os
  parâmetros. Vira a segunda barreira, atrás do log por lista de permissão (C-21).
- 02, minimização (RF-20): aprovada e ampliada para todo campo e todo agente, com remoção de cabeçalho de e-mail
  (C-23).
- 03, códigos de recuperação do 2FA: mantidos, cifrados e de uso único (C-33).
- 03, administradora em DEC de nível `cto`: a API segue a tela (só `cto`) até Fabiano decidir (C-12).

## Decisões tomadas

- Nenhuma devolução: as lacunas de 01, 02 e 03 viraram controles verificáveis que cabem no plano, sem refazer etapa anterior.
- Os campos de revisão que faltam na T11 (destino, níveis e nível de aprovação, C-14) são acréscimo de conteúdo numa tela que já existe, por isso foram tratados como controle e não como devolução à 03.
- O histórico grava só "alterado" nos campos de texto livre (C-30): é uma tabela imutável e sem expurgo, então não pode guardar dado de terceiro. O CA-06.4 é sobre enumeração e continua valendo.
- Retenção configurável limitada a 365 dias (C-31): o 3.650 de 02 deixaria o prazo da LGPD a um clique de valer dez anos.
- O detector do pedido (C-28) não bloqueia CNPJ: CNPJ de empresa cliente costuma ser dado legítimo da ESP e, em regra, não é dado pessoal. O de RF-20 continua trocando CNPJ antes de ir ao provedor.
- Bloqueio da verificação do código por conta (C-06): sem ele, a troca de IP dá um número ilimitado de chutes. O custo é que quem já tem a senha pode travar a conta por 15 min, o que é aceitável.
- Escopo por agente (C-10): um token vazado de um agente não deve criar artefato dos outros três.
- A geração do pedido vai para `POST` (C-16): ação que grava evento não fica em `GET` alcançável por navegação de outro site.
- Retenção de 5 anos para os campos estruturados (D3 a D5, D8) com anonimização futura: o registro da decisão é evidência em eventual disputa de contrato; o prazo é proposta para o jurídico.
- Recuperação por código mantida: sem ela, a perda do celular trava a única conta que decide.

## Pendências

- Nenhuma bloqueia a etapa. Itens para a Parada 1 e para as etapas seguintes:
- Registro de comando: no início da etapa rodei pelo Bash um `ls -la` da pasta do pedido, que não está na minha lista Pode (deveria ter usado Glob). Só leu a lista de arquivos e não mudou nada. Está declarado em Comandos executados; se o conferir recusar por isso, o conteúdo desta entrega não muda.
- Fabiano: regra mínima de nível de aprovação (por exemplo, risco jurídico `alto` exige `cto_e_administradora`). Sem ela, um DEC de agente com nível rebaixado depende só da revisão humana (C-14).
- Fabiano: quem registra a aprovação da administradora, e se ela aprova DEC de nível `cto` (afeta C-12; o código nasce no modo mais restrito).
- `juridico-contratos` (Parada 1): confirmar as bases legais e os prazos de D1 a D8 (90 dias; 5 anos depois do status final); transferência internacional (art. 33) antes de ligar qualquer agente.
- `compliance-governanca`: registro da operação de tratamento (D1 a D12) como evidência para a LGPD e a ISO 27001.
- `gestao-riscos`: risco residual para aceite formal de Fabiano: (a) nome de pessoa dentro de texto livre ainda chega ao provedor depois da minimização; (b) instrução injetada que passe pela revisão humana chega ao /construir, cujos agentes têm Bash.
- `tech-lead` (05): a 03 prevê "Entradas aguardando o agente orquestrador" com nome, papel e texto guardados antes de a demanda existir, e a 02 tem `entrada_bruta` com chave igual a `demanda_id`. A escolha de onde guardar essa entrada é da 05; C-22 e C-31 valem para qualquer escolha.
- `devops-sre` (09): itens do `deploy.md` da seção 5, item 6.
- `pnpm audit --prod` não rodou: o repositório ainda não tem `package.json`. Roda no CI (C-39) e antes da 08.
- Script de desativação de conta (D6) não está na lista de scripts de 02: entra no plano ou fica registrado para a 0.2.0.

## Comandos executados

- `ls -la /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/construcao/DEC-DEM-20261022-0001-v1` — fora da lista Pode, rodado por engano no início; só listou `pedido.json`, `01`, `02`, `03` e `passagens.jsonl`

## Critério de pronto atendido

- [x] (04) cada componente de 02 tem as ameaças STRIDE avaliadas
- [x] (04) cada ameaça alta ou crítica tem controle, escrito como critério verificável
- [x] (04) cada dado pessoal tem base legal, retenção e expurgo
