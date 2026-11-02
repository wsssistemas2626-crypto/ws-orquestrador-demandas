---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T44-testes
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T43 a T46 e rastreabilidade), 01-analista-requisitos.md (RF-22, RF-26 e RNF), 05-tech-lead.md (início), 06-T44-engenheiro-frontend.md, 06-T44-tech-lead.md, 06-T43-qa-automacao.md, git show --stat 70da315, git show 70da315 (page.tsx e pagina.test.ts), "src/app/(painel)/pacotes-decisao/[decId]/{SecaoPedido.tsx,acoes-pedido.ts,acoes-pedido.test.ts,page.tsx,acoes.test.ts (até a linha 140)}", src/components/{dados-do-pedido.ts,dados-do-pedido.test.ts}, e2e/pedido-construcao.spec.ts, src/modules/pedido-construcao/{gerar.ts,gerar.test.ts (até a linha 320)}, src/modules/historico/registrar.ts, src/lib/{acao-painel.ts,acao-painel.test.ts,erros.ts,log.ts}, test/{deps.ts,sessao.ts}, playwright.config.ts, package.json, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bs9961qst.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testei a T44 no commit `70da315`. O código cumpre os critérios da tarefa. Nenhum teste novo falhou contra ele, e nada
volta para o engenheiro.

### Portões

- `pnpm test`: 186 de 186 arquivos e 3.622 de 3.622 testes. Antes desta etapa eram 3.619. Os 3 a mais são os desta
  etapa.
- `pnpm test:e2e`, a suíte inteira: terminou com código 0. Com `retries: 0`, isso quer dizer que nada falhou e que não
  houve 429. São 94 testes em 17 arquivos (`--list`). Não acrescentei e2e (ver Decisões).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Critérios da T44 e os testes que os cobrem

Siglas:
- `ped.test` = `src/components/dados-do-pedido.test.ts`
- `acoes-ped` = `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts`
- `pagina` = `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts`, describe "T11: Pedido de Construção (T44)"
- `e2e/pedido` = `e2e/pedido-construcao.spec.ts`

(qa) marca o que foi escrito nesta etapa.

- **A seção só aparece com a decisão aprovada completa (03, T11; RF-22)**
  - `e2e/pedido` › "CA-26.3: só depois de aprovado; …": sem seção enquanto o pacote está pendente, e com seção depois de
    aprovar.
  - `pagina` › "pendente, aprovação parcial, devolvido e arquivado: sem a seção".
  - `ped.test` › "pendente, aprovação parcial, devolvida e arquivada: sem seção" e "aprovada sem a linha da decisão
    (vista incoerente): sem seção".
  - Pelo servidor, quando alguém chama a ação direto sem passar pela tela (CA-22.4): `acoes-ped` › "pacote pendente:
    409, …", e `acoes-ped` › "CA-22.4: devolvido, arquivado e só uma das duas aprovações (do CTO ou da administradora) →
    409 nas duas contas, com o texto da tela e sem evento" (qa).
- **O texto da 03 e o aviso de C-28 antes do botão**
  - `e2e/pedido` › "CA-26.3: …".
  - `pagina` › "aprovado: a seção vem depois de \"Registrar decisão\", com o texto da 03, o aviso de C-28 e o botão; nada
    gerado ainda".
  - `ped.test` › "os da 03, por inteiro, e o aviso de C-28 do plano".
- **"Gerar" chama a Server Action, e nenhum GET pede o pedido (C-16)**
  - `e2e/pedido` › "CA-26.3: …": confere a lista de GETs vazia.
  - `pagina` › "aprovado: …": nada vem gerado ao abrir a página, e não há link, bloco, `data:` nem `<form>`.
  - `acoes-ped` › "aprovado: o JSON e o nome do arquivo de gerarPedido, byte a byte; …".
  - `acoes-ped` › "RF-21: cada geração pela ação grava um pedido_gerado com a pessoa da sessão e sem conteúdo; recusa e
    conta sem 2FA não gravam" (qa).
- **"Baixar <DEC-id>.json" igual à resposta da API (CA-26.3)**
  - `e2e/pedido` › "CA-26.3: …": o nome do arquivo, o arquivo igual byte a byte ao POST da API e igual ao bloco.
  - `ped.test` › "data:application/json;charset=utf-8, com o JSON codificado, ida e volta sem perda …".
- **"Copiar JSON" usa a área de transferência**
  - `e2e/pedido` › "Copiar JSON: …": cobre a cópia que funciona e a que falha.
- **O `BlocoJson` mostra o conteúdo exato devolvido, e gerar de novo devolve o mesmo pedido (CA-22.2)**
  - `e2e/pedido` › "CA-26.3: …".
  - `acoes-ped` › "aprovado: …": gera de novo no dia seguinte e recebe o mesmo resultado.
  - `acoes-ped` › "RF-21: …" (qa): gerado pela conta cto e pela administradora, o resultado é igual.
- **O 422 mostra a lista sem o valor e a orientação (C-28)**
  - `e2e/pedido` › "C-28: …": a tela, o foco no alerta, o e-mail ausente de `main` e a API sem o valor.
  - `acoes-ped` › "C-28: e-mail fictício na ESP → 422 …".
  - `ped.test` › "422 da validação …" e "422 de outra origem …".
- **Estudo mostra só a frase, sem botão (CA-22.3)**
  - `e2e/pedido` › "Estudo: …".
  - `pagina` › "aprovado de Estudo (tipo copiado no pacote): …".
  - `acoes-ped` › "Estudo: 422, …".
  - `ped.test` › "aprovada: gerar, em todo tipo construído; Estudo …".
- **Autorização e entrada (C-04, C-12, C-17)**
  - `acoes-ped` › "a administradora também gera …".
  - `acoes-ped` › "C-17: id fora do formato …": cobre também o 404 e o 401.
  - `acoes-ped` › "RF-21: …" (qa): uma conta com senha certa e sem 2FA recebe `sem_2fa`, e nada é gravado.
- **O log não leva nada do pedido (C-21, RNF-10)**
  - `acoes-ped` › "C-21: uma linha de log por chamada, só com a ação, o tempo, o tipo de ator e o código; nenhum log leva
    o id, o JSON nem o e-mail do 422" (qa).
- **Axe (RNF-11)**
  - `e2e/pedido`, em quatro estados: aprovado antes de gerar, gerado, com erro 422 e Estudo aprovado. Todos verdes no
    `pnpm test:e2e`.

### Testes acrescentados (3, todos verdes)

Todos ficam em `src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts`, no describe "gerarPedidoNoPainel: a
regra do servidor sem a ajuda da tela (qa-automacao)". Rodam com Testcontainers e com o Better Auth real.

- **"CA-22.4: devolvido, arquivado e só uma das duas aprovações (do CTO ou da administradora) → 409 nas duas contas, com
  o texto da tela e sem evento"**
  - Monta quatro DEC: um devolvido, um arquivado, um com só a aprovação do CTO e um com só a da administradora, os dois
    últimos em `cto_e_administradora`.
  - A ação devolve exatamente `{ ok: false, erro: 'conflito', mensagem }` nas contas cto e administradora.
  - `erroDoPedido` mostra "Não foi possível concluir: …".
  - Nenhum `pedido_gerado` é gravado.
- **"RF-21: cada geração pela ação grava um pedido_gerado com a pessoa da sessão e sem conteúdo; recusa e conta sem 2FA
  não gravam"**
  - Duas gerações, uma pela conta cto e outra pela administradora, gravam dois eventos com `atorTipo` pessoa e o
    `usuarioId` de cada sessão. Os eventos levam a entidade `pacote_decisao` e o id da demanda, com `antes` e `depois`
    nulos (C-30).
  - Uma conta sem 2FA recebe `sem_2fa`, e o total de eventos não muda.
  - O 422 de C-28 não grava evento.
- **"C-21: uma linha de log por chamada, …"**
  - O teste captura o pino com `substituirDestinoDoLog` em três chamadas: uma bem-sucedida, um 422 e uma sem sessão.
  - Saem três linhas `acao_painel`, todas com `rota` igual a `gerar_pedido_construcao`. Os pares de tipo de ator e
    código são, em ordem: `pessoa` sem código, `pessoa` com `nao_processavel` e `anonimo` com `nao_autenticado`.
  - Nenhum campo fora de `evento`, `rota`, `ms`, `atorTipo` e `codigoErro`.
  - Nenhuma linha da ação leva os ids.
  - Nenhum log leva o e-mail fictício, o sistema alvo, o texto da ESP, `"pedido":` nem o JSON gerado.

Uma mudança de apoio no mesmo arquivo: uma variável `adm` (o ator da conta administradora), preenchida no `beforeAll`
com o `usuarioId` que já existia ali. Os imports ganharam `and`, `eq`, `evento`, `substituirDestinoDoLog` e
`registrarDecisaoSchema`. Nenhum teste existente mudou (conferido com `git diff -U0`).

### C-36: uso da suíte e2e por conta

Esta etapa não acrescenta e2e, e as contas seguem como a `06-T44-revisao` registrou:

| Conta | Demandas | Versões |
|---|---|---|
| "cto" | 30 de 30 | 35 de 60 |
| "administradora" | 30 de 30 | 35 de 60 |

- A `pedido-construcao.spec.ts` não cria demanda. Ela cria 12 versões na conta "cto": 4 testes, cada um com ESP, RSK e
  DEC. Na "administradora", não cria nada.
- A suíte inteira terminou com código 0 e `retries: 0`, sem nenhum 429.
- Das T44 a T46, a T44 usou 0 das 2 demandas que a regra do maestro permite. Mesmo assim, as contas estão cheias: vale o
  teto de 0 que a `06-T44-revisao` fixou para a T46.

## Decisões tomadas

- **Nenhum e2e novo.** As duas contas estão em 30 de 30 demandas. O e2e do engenheiro já cobre a tela nos quatro
  estados. O que faltava era a regra do servidor quando alguém chama a ação sem a ajuda da tela, e isso vai no nível de
  integração, que é mais barato e não pesa no C-36.
- **CA-22.4 testado no painel, e não só no módulo.** A tela esconde a seção nesses estados, mas a Server Action pode
  ser chamada direto com qualquer DEC. O teste prende o 409 exato, sem campo a mais, nas duas contas.
- **Evento e log conferidos pela ação.** O "cada geração vai ao histórico" do RF-22 e o C-21 dependem do adaptador
  `acaoDoPainel` junto com `gerarPedido`. O módulo sozinho não mostra que a autoria vem da sessão nem o que o log
  recebe.
- **Sem teste de componente.** O repositório não tem ambiente de DOM no Vitest. O clique duplo, o foco e o
  `aria-busy` ficam no e2e e com a `07-qa-funcional`.
- **Os testes novos não dependem de ordem nem do relógio real.** Cada um cria os próprios dados no dia fixo do
  `beforeEach` do arquivo, e esse `beforeEach` devolve a sessão à conta "cto" antes de cada teste.

## Pendências

- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bs9961qst.txt`. Li só o resumo final desse arquivo, que a minha própria
    execução gerou nesta etapa.
  - O `pnpm test:e2e` foi para segundo plano depois de 180 s. O resultado (código 0) veio do aviso de fim da tarefa, e
    a contagem veio do `--list`. Não li nada em `/tmp`.
- **Para o tech-lead (T45 e T46):** as contas seguem em 30 de 30 demandas. A `seguranca.spec.ts` roda depois da
  `pedido-construcao.spec.ts`, e nesse ponto a demanda de Estudo do seed já tem um DEC aprovado. Isso já está registrado
  na `06-T44-revisao`.
- **Para a `07-qa-funcional`:** os quatro Minor da revisão continuam com eles:
  - o "Baixar" com uma ESP grande e acentuada;
  - a segunda cópia anunciada pelo leitor de tela;
  - o foco depois de gerar e no erro;
  - o anúncio de "Gerando o pedido…".

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 70da31535b7f136640491f88d733f966bf167b32` — 10 arquivos, 1.001 inserções e 1 remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 70da31535b7f136640491f88d733f966bf167b32 -- src` — diff do código e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 70da31535b7f136640491f88d733f966bf167b32 -- "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/page.tsx"` — a seção na página e o describe novo, sem teste existente alterado
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts"` — 9 de 9
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 186 de 186 arquivos, 3.622 de 3.622 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (foi para segundo plano depois de 180 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 1 arquivo de teste alterado, nenhum outro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 127 inserções e 1 remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- "src/app/(painel)/pacotes-decisao/[decId]/acoes-pedido.test.ts"` — a remoção é só o import de `criarPacoteDecisaoSchema`, que ganhou `registrarDecisaoSchema`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 94 testes em 17 arquivos

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
