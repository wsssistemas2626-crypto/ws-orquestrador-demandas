---
pedido: DEC-DEM-20261111-0016-v1
etapa: 10-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, padrao-tecnico.md (seções 3 e 11), pedido.json, spec 2026-11-11-ws-orquestrador-demandas-integracoes-design.md, plano 2026-11-11-ws-orquestrador-demandas-plano.md (cabeçalho, G1 a G8), 07-qa-funcional.md (seções 5 a 7 e Pendências), 08-maestro.md, 09-devops-sre.md, 04-seguranca-aplicacao.md (IN-14 a IN-18), 06-T20-engenheiro-frontend.md e 06-T20-qa-automacao.md (números da suíte), README.md, CHANGELOG.md, package.json, docs/manual-tecnico (README e cap. 01, 02, 03, 05, 06, 08, 09, 10), docs/operacao/deploy.md, código (matriz.ts, tokens-servico.ts, mensagens.ts, schema/acesso.ts, limites.ts, integracoes/tempo-limite.ts, demandas/servico.ts, confirmar.ts, confirmacao.ts, consultas.ts, schemas.ts, resumo-da-fila.ts, pedido-construcao/conferir.ts, gerar.ts, entregar.ts, receber.ts, pendentes.ts, as três rotas de api/pedidos-construcao, api/demandas/[id]/route.ts, lib/rota.ts, agentes/executar.ts e gatilhos.ts, components/rotulos.ts, dados-da-confirmacao.ts, dados-das-etapas.ts, dados-do-pedido.ts, painel/demandas/fila.tsx, scripts/criar-token-servico.ts, revogar-token-servico.ts, seed-ficticio.ts, drizzle/0007_greedy_wendigo.sql, test/estatico/docs-sem-token.test.ts), estruturaAutonoma/ferramentas/construir/buscar-pedidos.mjs e lib/buscar-pedidos.mjs]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

Documentação da 0.3.0 escrita a partir do código do ramo `construcao/DEC-DEM-20261111-0016-v1`. Onde a spec e o
código divergem, vale o código (padrão técnico, seção 11).

**Versão:** o `package.json` já estava em 0.3.0 (T20). O `CHANGELOG.md` não tinha a seção 0.3.0: escrevi a seção agora.
Com isso, a verificação antes do PR tem as duas coisas.

### Arquivos

| Arquivo | O que mudou |
|---|---|
| `CHANGELOG.md` | Seção **0.3.0 — 2026-11-12**: o que muda para quem usa (Awave, confirmação, origem, busca do `/construir`, histórico, T12 sem mudança), API, código, **Limitação conhecida** (não emitir os tokens de produção antes da 0.3.1, sem detalhe explorável), o que ficou fora, verificações e pendências abertas |
| `README.md` | Versão 0.3.0 e data; o pedido não é mais só copiado à mão; parágrafo das duas integrações; linhas da tabela "Onde está cada coisa" para os tokens e para a spec e o plano da 0.3.0; e2e com os tokens do banco descartável; scripts de token de integração |
| `docs/operacao/tokens-de-integracao.md` | **Novo.** Para cada integração: o que o token permite e onde ele mora; emitir; guardar (card "Token do Orquestrador" do Awave; `~/.config/ws-construir/token-orquestrador` com 600); achar o prefixo de um token ativo sem exibi-lo (saída do script, histórico do painel ou `select` só de `integracao`, `prefixo` e `criado_em`); trocar (a cada 12 meses, P-04, ou já, em suspeita); revogar; o que fazer se a integração der problema. Com a limitação conhecida no topo |
| `docs/operacao/deploy.md` | Campo "Versão" 0.3.0; "Atualizado em"; linha dos tokens na lista de rotação (seção 3); link para `tokens-de-integracao.md` no passo 8 da publicação da 0.3.0 |
| `docs/manual-tecnico/README.md` | Versão 0.3.0 e data; ponteiro para a spec da 0.3.0; capítulos 01, 02, 03 e 05 com o assunto novo; link para os tokens; RF-02, RF-03 e RF-22 do sistema com a 0.3.0; seção nova **"Requisitos das integrações (0.3.0)"**, com RF-01 a RF-16 do pedido mapeados a capítulos; glossário: Ator, Integração, Prefixo do token de serviço, Origem da demanda, Confirmação da demanda do Awave, Pedido pendente, Entrega e recebimento, Vista mínima e Próxima ação |
| `docs/manual-tecnico/01-arquitetura.md` | Integrações no diagrama; módulos `acesso/`, `demandas/`, `integracoes/` (novo), `limites.ts`, `pedido-construcao/`; 8 migrations; a `0007` descrita na seção Banco; ADR-02 com a ressalva; ADR-20 a ADR-29; a divergência do padrão técnico agora registrada pelo ADR-29 |
| `docs/manual-tecnico/02-acesso-e-seguranca.md` | Seção nova **"Atores de integração (0.3.0)"** (token, resolução, scripts, autoria, limite, tempo limite e 503, ramos exaustivos); matriz com a coluna Integração e as quatro ações novas; vista de seis chaves do Awave; Bearer sem `Origin` e `POST` sem corpo na proteção das rotas; log só com `atorTipo` |
| `docs/manual-tecnico/03-demandas.md` | RF-03 com o Awave e o limite de 10; RF-06 com a origem e o filtro `origem`; seção nova **"Demanda aberta pelo Awave (0.3.0)"** (criação, leitura, confirmação por pessoa e IN-06), com o registro de que o título não deve levar nome de pessoa (spec 7.2) e o efeito do QF-0016-01; RF-07 (entrega e recebimento não mudam status); RF-21 com os eventos novos e o ator de integração |
| `docs/manual-tecnico/05-pedido-de-construcao.md` | `conferir.ts` compartilhado; o parágrafo "baixado e copiado à mão" trocado pelos dois caminhos; texto novo da seção na T11 e a linha "Recebido pelo /construir"; seção nova **"Entrega ao /construir (0.3.0)"**: ciclo, pendentes, entrega, recebimento (tabela de respostas), painel e o que fazer se a busca falhar |
| `docs/manual-tecnico/06-agentes-de-ia.md` | `insumo_tecnico` disparado pela confirmação na demanda do Awave; guarda do disparo para os quatro agentes; integrações fora da tela, do teto e do uso; passo `sem_confirmacao` no worker e o rótulo dele |
| `docs/manual-tecnico/08-painel.md` | Telas T03, T05 e T11; filtro e linha "Origem"; cartão com Origem; seção "Confirmação do Awave" com a tabela de estados; linha 14 da Próxima ação; selo; T11 com "Recebido pelo /construir"; aviso de que as capturas são da 0.2.0 |
| `docs/manual-tecnico/09-referencia-api.md` | Autenticação da integração; rotas com `awave` e `origem`; as três rotas de `/api/pedidos-construcao`; quem recebe 403; exemplos "o Awave cria e lê uma demanda" e "o /construir busca um pedido"; 401, 409, 429 e 503 atualizados |
| `docs/manual-tecnico/10-configuracao-e-scripts.md` | `E2E_ARQUIVO_TOKENS` (não configurar); `--integracao` no script de criação; revogação dos dois tipos; seed com 28 demandas (o texto antigo dizia 14 e estava errado desde a 0.2.0); link para os tokens |

### Conferências

- **Nenhum token real nem valor no formato de token.** Busquei `wsod_[A-Za-z0-9_-]{43}` (a regex de
  `test/estatico/docs-sem-token.test.ts`) em `docs/**/*.md`, `CHANGELOG.md` e `README.md`: nenhum arquivo. Os exemplos
  usam `wsod_<token…>`, `<prefixo>` e `<SHA-256 …>`. Nenhum hash, senha ou valor de `.env`.
- **Variável de ambiente só pelo nome.** A única nova citada é a `E2E_ARQUIVO_TOKENS`, do e2e. O app e o worker não
  ganharam variável.
- **Links internos.** Os 13 links para `tokens-de-integracao.md` (8 arquivos) apontam para o arquivo novo, que existe.
  As âncoras novas seguem o formato que o GitHub gera dos títulos: `#atores-de-integração-030`,
  `#demanda-aberta-pelo-awave-030`, `#entrega-ao-construir-030`, `#pendentes-listar_pedidos_pendentes`,
  `#entrega-entregar_pedido`, `#recebimento-confirmar_recebimento_pedido`, `#no-painel`, `#token-awave` e
  `#requisitos-das-integrações-030`. As de antes (`#matriz-de-acesso`, `#proteção-das-rotas`, `#na-t11`,
  `#rf-21-histórico`, `#os-quatro-agentes`, `#capturas-de-tela`, `#scripts-de-operação` e as das seções do cap. 08)
  correspondem a títulos que existem.
- **Texto que sobrou da 0.2.0.** Busquei "copiado à mão", "não envia nada ao `/construir`" e "token de serviço só
  para" no manual, no `docs/operacao` e no README. Atualizei os trechos que achei (cap. 05, README e ADR-02 do cap. 01).

## Decisões tomadas

- O procedimento dos tokens foi para um arquivo próprio em `docs/operacao/`, e não para o `deploy.md`. O `deploy.md` é
  do `devops-sre` e já tem 590 linhas, e a troca a cada 12 meses vai ser lida fora de uma publicação. O `deploy.md`
  aponta para ele no passo 8 e na rotação.
- O lugar do token do Awave segue o UAT-03 da 07: o card "Token do Orquestrador" em `/config` do Awave. A opção do
  IN-18, as variáveis do serviço `empresa-ia`, também ficou no texto.
- O caminho do token do `/construir` é o que o `buscar-pedidos.mjs` lê (`~/.config/ws-construir/token-orquestrador`,
  no `token_arquivo` do `orquestrador.json`). O passo de guardar cria o arquivo com 600 **antes** de pôr o token nele,
  para o valor não passar pelo terminal nem pelo histórico do shell.
- A recomendação da 0.3.1 entrou como "Limitação conhecida" no CHANGELOG e no `tokens-de-integracao.md`, sem os
  achados, o arquivo nem a linha. O CHANGELOG só remete à entrega da revisão. Os baixos B-1 a B-7 aparecem em uma
  linha genérica. O `deploy.md` já citava "M-1 a M-5" no passo 8, pela 09, e ficou como estava.
- Os eventos `token_criado` e `token_revogado` não aparecem no histórico de uma demanda, porque não têm demanda. Por
  isso, "achar o prefixo pelo histórico" usa o ato da integração numa demanda (criação pelo Awave, entrega ou recebimento
  pelo `/construir`), e não o evento do token.
- Corrigi o seed do cap. 10 para 28 demandas, contando os arrays de `seed-ficticio.ts` (5 + 18 + 3 + 2). O texto
  anterior (14) já estava errado desde a 0.2.0.
- As capturas do cap. 08 não foram regravadas: o `e2e/capturas.spec.ts` só roda pelo Playwright, fora da minha lista
  Pode. O capítulo e o CHANGELOG avisam que elas são da 0.2.0.

## Pendências

- **Para Fabiano, na UAT (UAT-03 e UAT-04):** confirmar o endereço completo do Awave na rede interna. O DEC diz
  `http://orquestrador_app`, e o app escuta na `PORT` do serviço (3101 quando ela não é definida). O
  `tokens-de-integracao.md` (seção 2) pede essa confirmação. Se o endereço certo tiver porta, corrigir a seção 2 e o
  exemplo do cap. 09.
- **Para Fabiano:** o `tokens-de-integracao.md` ainda não foi executado por ninguém. A primeira execução é a UAT
  (UAT-03, UAT-09, UAT-10 e UAT-12), que também testa o texto. O padrão pede que outra pessoa teste o procedimento.
- **Para o maestro, antes do PR:** rodar o `pnpm test` com os documentos novos. O `test/estatico/docs-sem-token.test.ts`
  lê `docs/**/*.md`, o `CHANGELOG.md` e o `README.md`. Fiz a mesma conferência pela regex, com Grep, e não achei nada;
  não rodei o teste, porque não tenho Bash.
- **Para o maestro:** V-01, V-02 e as medidas do RNF-01 e do RNF-02, que a 09 deixou em aberto. O CHANGELOG registra
  que não rodaram.
- **Para a `qa-automacao` (candidato da 07):** teste estático de que o `CHANGELOG.md` tem a seção da versão do
  `package.json`.
- **Para a `ux-ui-design` ou o `engenheiro-frontend`, em pedido próprio:** regravar as capturas da T03, da T05 e da T11
  com a origem, a confirmação e o recebimento.
- **Para quem cuida do `padrao-tecnico.md`:** versões da stack do ADR-29 (já estava na spec, 7.2).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (10) o README diz como rodar, com os comandos do padrão técnico (seções "Instalar e verificar", "Desenvolver com banco local" e "Comandos do `package.json`", sem mudança de comando na 0.3.0)
- [x] (10) o manual técnico descreve cada RF e cita variável de ambiente só pelo nome (RF do sistema no "Mapa de cada RF"; RF-01 a RF-16 do pedido em "Requisitos das integrações (0.3.0)", cada um com o capítulo)
- [x] (10) as notas de versão listam o que entrou e as pendências abertas (`CHANGELOG.md`, 0.3.0, com a limitação conhecida)
- [x] os links internos apontam para arquivos que existem
