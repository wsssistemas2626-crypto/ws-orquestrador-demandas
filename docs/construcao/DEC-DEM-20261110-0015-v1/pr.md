# Orquestrador 0.2.0: novo visual do painel (proposta A, Mesa de controle, com a decisão no celular da proposta C) · DEC-DEM-20261110-0015-v1

## Resumo

O painel do Orquestrador ganha a identidade da WS Sistemas. A **proposta A (Mesa de controle)**, escolhida por Fabiano
em 10/11, vira a base de todas as telas, e a **tela de decisão no celular vem da proposta C**. Só a camada visual muda.

- **Casca:** menu lateral marinho com a marca WS, os itens do painel e a conta. No celular, o menu vira uma gaveta
  acessível: `aria-expanded`, foco preso enquanto está aberta e Esc fecha.
- **Fila (T03):**
  - contadores por status no topo, que funcionam como filtro (`aria-pressed`, filtro na URL);
  - tabela densa com etapas ESP/RSK/DEC com texto acessível e a idade da demanda;
  - abaixo de 768 px, a tabela vira lista de cartões.
- **Demanda (T05):** barra das 5 etapas, cartão "Próxima ação" e histórico.
- **Decisão (T11):**
  - no computador, o layout da A;
  - em 390 px, o da C2: opções como rádios grandes e rodapé fixo com "Aprovar a opção X", Devolver e Arquivar;
  - nenhuma opção vem pré-marcada (decisão P-01);
  - documento assinado e "Revisei os rascunhos de agente" continuam visíveis e obrigatórios.
- **Tokens e acessibilidade:** cores e tipografia em variáveis CSS, contraste WCAG 2.2 AA, foco visível e alvo de toque
  de 44 px no celular.
- **Fontes:** Noto Sans e Noto Sans Mono servidas pelo próprio app (`@fontsource` com `next/font/local`, ADR-13). A CSP
  não ganha nenhum domínio externo.
- **Entrar e 2FA (T01, T02):** ganham a marca e as cores, sem mudar o fluxo.

**Nada muda em:** rota de API, server action, esquema, migration, papel, permissão e regra. Os nove arquivos
`'use server'`, `src/proxy.ts`, `next.config.ts`, `Dockerfile`, `.github/`, `drizzle/` e `src/db/` não têm diff.

**O que entra de novo:**
- uma leitura só de consulta para a fila, `src/modules/demandas/resumo-da-fila.ts` (ADR-16);
- duas dependências de fonte, `@fontsource/noto-sans` e `@fontsource/noto-sans-mono` 5.3.0.

**Capturas:** nove telas, no computador e em 390 px, só com dados fictícios do seed, em `docs/manual-tecnico/capturas/`.

## Etapas e tempos

| Etapa | Quem | Passagens | Minutos |
|---|---|---|---|
| 01 requisitos | analista-requisitos | 1 | 9 |
| 02 arquitetura | arquiteto-solucoes | 3 | 10 |
| 03 interface | ux-ui-design | 1 | 15 |
| 04 ameaças | seguranca-aplicacao | 3 | 9 |
| P1 spec aprovada | Fabiano | 1 | 0 |
| 05 plano (17 tarefas, 7 fases) | tech-lead | 3 | 24 |
| P2 plano aprovado, modo `ate_o_fim` | Fabiano | 1 | 0 |
| 06 construção T01 a T17 (cada uma com construção, revisão e testes) | engenheiro-frontend, engenheiro-backend, engenheiro-dados-bd, tech-lead, qa-automacao | 110 | 1.208 |
| 07 testes funcionais | qa-funcional | 1 | 6 |
| 08 revisão de código e de segurança | maestro | 1 | 8 |
| 09 entrega | devops-sre | 3 | 31 |
| 10 documentação | documentacao-tecnica | 1 | 13 |
| **Total** | | **129** | **1.333** |

**Bloqueios:** houve 28, todos de comando só de leitura fora da lista Pode, liberados pela regra de 25/10. Os mais
comuns foram `git grep`, `git show`, `tail`/`wc`, e `|`/`<` dentro de `-G`. Outro caso foi o arquivo temporário
`e2e/tmp-corrida-fontes.spec.ts`, não rastreado, apagado com a autorização de Fabiano.

**Voltas (4):**
- teste instável das fontes, na T02;
- teste instável da gaveta, na T05;
- U+202E cru (Trojan Source), na T06: trocado por `String.fromCodePoint(0x202e)`, mais o teste estático
  `test/estatico/sem-controle-bidi.test.ts`;
- alvo de toque dos links ESP/RSK na T11 em 390 px, na T16.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261110-0015-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.1.13 → 0.2.0 |
| changelog | ok | seção 0.2.0 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 5.249 de 5.249 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 249 passaram, contra o build de produção, com `retries: 0` |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | nenhuma |
| versão anterior | ok | a versão da `main` respondeu 200 em 60 s |
| backup | ok | 106 KB, impressão `fdbfd1bf0a41780d` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 45 s |
| restauração | ok | o banco ficou igual ao backup (impressão `fdbfd1bf0a41780d`) |
| volta | ok | a versão da `main` voltou sobre o banco migrado e de novo sobre o backup, e respondeu 200 em 13 s |
| ida de novo | ok | a versão do ramo, depois da volta, respondeu 200 em 43 s |
| derrubar | ok | projeto e volumes removidos |

Voltar desta versão para a 0.1.13 **não** exige restaurar o backup (`volta_sem_restaurar: true`). Nenhuma migration
altera dado existente.

## Testes

- **Unidade e integração:** 5.249 de 5.249.
  - Cada tarefa entrou com testes escritos antes do código.
  - Os testes que já existiam mudaram só onde mudou um seletor ou um texto, sem apagar asserção de regra. O piso de
    asserções (T01) confere isso.
- **Ponta a ponta:**
  - 249 de 249 na homologação;
  - três rodadas seguidas verdes na T17 (13,3, 15,4 e 14,2 min);
  - o axe sem violação nas telas T01 a T12, no computador e em 390 px;
  - o e2e novo da aprovação em 390 px;
  - a vigia de origem e CSP (CV-03) em todos os e2e.
- **Testes funcionais (07):** os 69 critérios de aceite cobertos, 61 por teste automatizado e 8 por conferência. Há 15
  casos exploratórios e um roteiro de aceite de 11 passos para Fabiano.
- **Risco no CI:**
  - Na rodada 1 da 06-T17-testes, dois testes de `e2e/axe-todas.spec.ts` (`:229` e `:267`) falharam de forma
    intermitente, por "socket hang up" e por estourar 30 s. A rodada 2 e a homologação passaram inteiras.
  - O `decisao.spec.ts:148` chegou a 23,4 s, perto do limite de 30 s.
  - A regra é não subir `timeout` nem `retries`: acima de 24 s no CI, o teste volta para ser dividido.

## Achados da revisão (08)

- **Código:** skill `code-review`, nível alto. **Segurança:** agente `seguranca-aplicacao` sobre o diff do ramo, porque
  a skill `security-review` revisa o ramo da sessão, que é outro repositório.
- **Nenhum achado crítico ou alto.**
- **Médios**, para demandas próprias:
  - **R-01:** a fila marca ESP/DEC como "feita" com qualquer versão, conforme o RF-06 aprovado, e a barra da T05 só
    marca o DEC aprovado. Ajustar o texto ou a regra.
  - **R-02:** `dados-das-etapas.ts:62` lança erro com dado inconsistente e derruba a página inteira da demanda.
  - **R-03:** a gaveta do menu fica aberta com o gesto de voltar do celular.
  - **R-04 (QF-0015-04, já existe na 0.1.13):** "Sair" com o limite por IP estourado pode deixar a sessão válida.
- **Baixos:**
  - Enter num campo envia por "Aprovar". É o desenho da 03, e o diálogo abre com o foco no cabeçalho.
  - Sem JavaScript, os contadores perdem o `limit`.
  - A demanda carrega a vista inteira do DEC.
  - A contagem da fila repete o filtro à mão.
  - Há código morto do formulário antigo e constantes de desenho em arquivo de rota.
  - Faltam três reforços nos testes estáticos de recurso externo e de bidi.
- **Dependências:**
  - `pnpm audit --audit-level high`, sem `--prod`: 5 moderadas transitivas, as mesmas de antes do pedido, e nenhuma
    alta nem crítica.
  - Os pacotes `@fontsource` não têm script de instalação.

## Pendências

- **Fabiano, antes de publicar:**
  - roteiro de aceite da 07 em homologação, inclusive a T11 num iPhone com Safari em 390 px;
  - P-01, a opção recomendada não vem marcada;
  - QF-0015-01: a coluna "Idade" sai cortada na fila em 1280 px;
  - conferir no Easypanel que o "Auto Deploy" dos serviços `app` e `worker` está desligado.
- **Demandas próprias:** R-01 a R-04 e os baixos da 08.
- **Testes:**
  - medir no job e2e deste PR os testes longos: `decisao.spec.ts:148`, `reflow-t15-qa:105` e `axe-todas:395`;
  - M1 da 06-T17-tech-lead: teste de tipografia duplicado;
  - QF-0015-03: data em mm/dd/aaaa na captura da decisão, por causa do locale do navegador dos testes.
- **Da construção:** os contadores da fila ficam desabilitados sem JavaScript (decisão de desenho 03 §4.6). O G4 tem a
  exceção registrada de `src/app/api/saude/route-qa.test.ts` (+5 linhas, só teste).
- **Publicação do Orquestrador (CA-P5-16):**
  - P16, segredos dos webhooks, e P18, fechamento, esperavam este pedido;
  - o `docs/operacao/deploy.md` foi atualizado na 09 com a volta para a v0.1.13 e a origem da imagem.

## Publicação

Esta versão não tem migration. No push da `main`, o `deploy.yml` publica a imagem no GHCR. Os segredos dos webhooks do
Easypanel não existem, e o repositório não tem webhook, então nada vai para produção.

Os serviços no ar usam a imagem que o próprio Easypanel monta a partir do GitHub. **Publicar a 0.2.0 no ar é decisão de
Fabiano**, pelo Easypanel, depois deste PR. Se for preciso voltar, o `deploy.md` leva à v0.1.13 sem restaurar o banco.

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
