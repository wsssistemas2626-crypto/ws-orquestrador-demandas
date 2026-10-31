---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T45-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T43 a T46, rastreabilidade), 01-analista-requisitos.md (RF-18 e RF-19), 03-ux-ui-design.md (T12 e seção 5), 06-T45-engenheiro-frontend.md, 06-T44-tech-lead.md, git show --stat 8464b66, "src/app/(painel)/configuracao/agentes/{page.tsx,FormularioTeto.tsx,TabelaAgentes.tsx,AvisoDaTela.tsx,acoes.ts,acoes.test.ts,pagina.test.ts (até a linha 110)}", src/components/dados-dos-agentes.ts, src/components/dados-dos-agentes.test.ts (até a linha 90), e2e/agentes-teto.spec.ts, src/modules/agentes/{teto,configuracao}.ts, src/modules/acesso/matriz.ts, scripts/seed-ficticio.ts (até a linha 60), playwright.config.ts, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/b7tybdx0t.txt]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisei a T45 no commit `8464b66`. Ele traz 10 arquivos novos de código e teste, mais a entrega e o registro. São 1.813
linhas acrescentadas, e nenhum arquivo que já existia mudou.

Não achei nada Critical nem Important. A tarefa passa para a `06-T45-testes`. Os cinco pontos abaixo são Minor e vão
para Pendências. Depois deles vem a conferência do C-36.

### Portões, rodados nesta revisão

- `pnpm test`: 189 arquivos e 3.664 testes, todos verdes. É o número que a entrega relata.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `pnpm test:e2e` não está na minha lista **Pode**. Vale o que a entrega relata (100 testes em 18 arquivos, código 0,
  `retries: 0`, nenhum 429). A `06-T45-testes` confere a suíte inteira.

### Checklist da seção 12 do padrão técnico

- [x] **A tarefa faz o que o plano pede.** O plano pede a T12 com quatro dados: `situacaoDoTeto`,
  `listarConfiguracaoAgentes`, `situacaoDoWorker` e `ultimoExpurgo`. A página lê os quatro, depois de
  `exigirPessoaNaPagina` e das duas autorizações de leitura (`page.tsx:56-63`).
  - Os textos de título, introdução, alertas, gasto, campo, dica, tabela, diálogo, nota da administradora, erros e
    sucesso conferem com a 03 (T12, linhas 876 a 902).
  - Os quatro textos que o plano manda escrever (worker e expurgo) estão iguais aos do plano.
  - Ligar abre o diálogo e desligar não pede confirmação (`TabelaAgentes.tsx:88-95`).
  - A falha ao ligar volta o interruptor e mostra a frase da 03 com o foco no alerta (`TabelaAgentes.tsx:76-85`).
  - A administradora vê os controles desabilitados. Quem decide é a própria matriz (`page.tsx:45-53` e `:65-66`), e a
    Server Action decide de novo.

  Há quatro arquivos fora da lista do plano: `dados-dos-agentes.ts` e o teste dele, `AvisoDaTela.tsx`, `acoes.test.ts` e
  `pagina.test.ts`. É o molde aceito na T41 a T44: a regra da tela fica fora do componente e é testada sem tela. O
  `AvisoDaTela.tsx` existe porque a 03 (2.3) pede uma região de aviso por página, e ela é dividida por dois componentes
  de cliente irmãos. Aceito.
- [x] **Há teste para cada comportamento novo.** São 42 testes unitários e de integração e 6 e2e. A entrega mostra a
  falha das duas camadas antes do código.
  - As Server Actions rodam com banco e Better Auth reais. Os testes cobrem:
    - a gravação e o evento com a pessoa da sessão;
    - o mesmo valor sem evento novo;
    - 400 com a mensagem da 03;
    - C-11, com a autoria do corpo descartada;
    - o 403 da administradora nas duas ações;
    - 401 e `sem_2fa`;
    - 409 sem modelo;
    - o `modelo` do painel descartado;
    - ligar e desligar com os dois eventos, que é o CA-19.3;
    - C-17 com `__proto__` e `null`;
    - C-21 com sentinelas de valor, agente e id.
  - A cópia das mensagens do servidor no navegador é comparada com `MENSAGENS_TETO` e com `mensagemNaoLigou`, nos quatro
    agentes. `validarTeto` é comparada com `definirTetoSchema` em 21 amostras.
- [x] **Nenhum segredo nem dado pessoal real.** Só aparecem "Pessoa Ficticia CTO", `modelo-ficticio` e as contas do
  seed.
- [x] **Entrada externa validada com Zod, e erro sem detalhe.**
  - `salvarTetoNoPainel` usa `definirTetoSchema`, o mesmo da rota.
  - `alternarAgenteNoPainel` usa `alterarAgenteSchema.omit({ modelo: true }).extend({ agente: z.enum(AGENTES) })`
    (`acoes.ts:29`). O agente passa pela lista fechada antes do banco.
  - As duas passam por `acaoDoPainel` e devolvem só `{ tetoMensal }` e `{ agente, ligado }`.
  - A tela troca o 403 e o erro interno pelos textos da 2.8 (`dados-dos-agentes.ts:127-130`), nunca pela mensagem crua.
- [x] **Banco.** Nenhuma migration, e nenhuma era esperada.
- [x] **Nada duplica função existente.**
  - Foram reaproveitados `acaoDoPainel`, `definirTeto`, `alterarAgente`, `autorizar`, `errosDoResultado`, `idDoCampo`,
    `formatarDinheiro`, `ROTULO_AGENTE`, `NOME_AGENTE`, `useConfirmarSaida`, `Interruptor`, `DialogoConfirmacao`,
    `Tabela`, `Alerta`, `RegiaoAviso`, `ResumoErros` e `CampoTexto`.
  - A cópia de duas mensagens, da regex do teto e da frase "não ligou" existe porque `teto.ts` e `configuracao.ts`
    importam o banco e não vão ao navegador. O teste prende a cópia (Minor 1).
- [x] **Textos em pt-BR, e o axe sem violação.** O axe roda em seis estados: inicial, com erro de teto, com o diálogo
  aberto, com agente ligado, com falha ao ligar e na conta administradora. Cobre os três que o plano pede e mais três.
- [x] **Minor vai para Pendências.** Os cinco pontos estão lá.
- [x] **`/code-review` e `/security-review` no PR.** Não se aplica à revisão por tarefa: ficam com a `08-revisao`.

### Pareceres (todos Minor, nenhum bloqueia)

1. **`src/components/dados-dos-agentes.ts:19-22`, `:61-62` e `:104-111`: a regra do teto e a frase "não ligou" estão
   copiadas no navegador.**
   - Problema: `MENSAGENS_TETO`, `RE_TETO` e `mensagemNaoLigou` existem em `teto.ts:18-24` e `configuracao.ts:38-46`, e
     de novo aqui.
   - Razão: os dois módulos importam o banco e não podem ir ao navegador. O teste compara as cópias com o original, e por
     isso é Minor.
   - O que fazer: numa tarefa futura que já mexa em `teto.ts` e `configuracao.ts`, levar as constantes puras para um
     módulo sem banco, importado pelos dois lados. Não cabe na T45, que não pode mudar arquivo da T23.
2. **O painel não escolhe o modelo do agente.** O engenheiro já tinha registrado esse ponto.
   - Problema: os quatro agentes nascem sem modelo, e ligar sem modelo dá 409. Hoje o modelo só se grava por
     `PATCH /api/agentes/:agente` com `modelo`, com sessão de CTO e `Origin`. Sem isso, nenhum agente liga pelo painel em
     produção.
   - Razão: o RF-19 e a 03 (T12) não preveem o campo, e a Server Action fica mais estreita sem ele. A tarefa fez o que o
     plano pede. Os agentes ficam desligados até a chave da API (CA-E-03), então a 0.1.0 não depende disso. Por isso é
     Minor.
   - O que fazer: a `10-documentacao` põe no manual técnico o passo que grava o modelo pela API, junto com as
     pré-condições para ligar agente (04, seção 5, item 7). Um campo "Modelo" na T12 é demanda nova, com texto da
     `ux-ui-design`, e passa pelo Orquestrador.
3. **`e2e/agentes-teto.spec.ts:129` e `:140`: a hora da mudança é comparada com o relógio de quem roda o teste.**
   - Problema: `Date.now()` do Playwright é comparado com o `atualizadoEm` do servidor, com 5 s de folga.
   - Razão: os dois rodam na mesma máquina, no e2e local e na homologação. A conferência que importa é a da linha 142,
     em que o `<time datetime>` da tela é igual ao da API. Por isso é Minor.
   - O que fazer: se a homologação acusar diferença de relógio, apagar a linha 140 e manter a 142.
4. **Não há o esqueleto de carregamento que a 03 prevê em "Estados".**
   - Problema: a 03 (T12) pede "esqueleto da tabela e do gasto" no carregamento, e não há `loading.tsx`.
   - Razão: nenhuma tela do painel tem um, e a página chega pronta do servidor. "Alterando…" e "Salvando…" cobrem as
     ações. O comportamento é o mesmo das telas já aceitas, e por isso é Minor.
   - O que fazer: se a `07-qa-funcional` ou a `ux-ui-design` quiserem o esqueleto, ele entra para todas as telas de uma
     vez, não só nesta.
5. **Seis textos não estão na 03.**
   - Problema: são os quatro de worker e expurgo, que vêm do plano, e os dois compostos pelo molde da 03. O primeiro é o
     diálogo dos outros três agentes, e o segundo são os avisos de ligado e desligado (`dados-dos-agentes.ts:43-47` e
     `:63-66`).
   - Razão: o G3.11 pede o texto da 03 por inteiro. A entrega listou os seis, e eles seguem o molde da 03 e da 2.8.
   - O que fazer: a `ux-ui-design` confere os seis, junto com os textos da T43 e da T44.

### C-36: conferência da regra da `06-T44-revisao`

A regra vale para a T45 e a T46: nenhuma demanda nova nas duas, e nenhuma versão na T45. Ela substitui a da
`06-T43-revisao`, que permitia até 2 demandas nas T44 a T46 juntas. A regra nova fica mais apertada, não mais frouxa.

- **A T45 criou 0 demandas e 0 versões, nas duas contas.** Li a spec inteira. Ela só chama `PUT /api/configuracao/teto`,
  `PATCH /api/agentes/:agente` e `GET /api/agentes`. Teto e interruptor são configuração e não contam em
  `conferirLimite`, que só conta demanda, ESP, RSK e DEC.
- **Totais depois da T45, iguais aos da T44:**

  | Conta | Demandas | Versões |
  |---|---|---|
  | "cto" | 30 de 30 | 35 de 60 |
  | "administradora" | 30 de 30 | 35 de 60 |

- **Das T44 a T46, 0 das 2 demandas foram usadas.** A T46 continua com teto de 0 demandas novas, pela regra da
  `06-T44-revisao`.
- **Nenhum controle foi tocado.** O commit só traz os 10 arquivos novos da tarefa. Não mexe em `limites.ts`, no seed,
  no `playwright.config.ts`, em variável de ambiente nem no relógio do servidor.
- **Estado global.** O teto e os interruptores valem para o sistema inteiro, e esta spec é a primeira na ordem
  alfabética. O cuidado está certo:
  - os testes rodam em série, com `workers: 1` e `fullyParallel: false`;
  - cada teste que altera alguma coisa devolve, num `finally` e pela API, o teto a 0 e os quatro agentes a desligados;
  - sobra só o `modelo-ficticio` no agente de risco, que não liga nada sozinho;
  - o teste do estado inicial aceita o agente de risco já alterado, e por isso a spec passa com `--repeat-each=2`.

## Decisões tomadas

- **Status `pronto`.** Os cinco pareceres são Minor e não impedem a T45 de fazer o que o plano pede. Pela seção 12, só
  Critical e Important bloqueiam.
- **Aceito que o painel não escolha o modelo.** O RF-19 e a 03 não pedem o campo, e a entrada pública fica mais estreita.
  O caminho para ligar em produção vai para o manual técnico.
- **Aceito a cópia das mensagens e da regex no navegador.** Os módulos de origem importam o banco, e o teste prende a
  cópia. Tirá-la pede mudar arquivo da T23, fora da tarefa.
- **A T46 segue com teto de 0 demandas novas.** As duas contas continuam em 30 de 30.

## Pendências

- **`qa-automacao` (`06-T45-testes`): rodar o `pnpm test:e2e` inteiro e registrar o uso por conta.**
  - O total esperado depois da T45 é de 30 de 30 demandas e 35 de 60 versões em cada conta. 429 é falha da tarefa.
  - Conferir também que, depois da `agentes-teto.spec.ts`, o teto volta a 0 e os quatro agentes ficam desligados.
- **`engenheiro-frontend` (T46): nenhuma demanda nova.** Vale a regra da seção "C-36" da `06-T44-revisao`. Se a T46 não
  couber, devolver para a `05-plano` com a conta do que falta.
- **Minor 1 (cópia no navegador):** levar as constantes puras de `teto.ts` e `configuracao.ts` para um módulo sem banco,
  numa tarefa futura que já mexa nos dois.
- **Minor 2 (modelo do agente):** a `10-documentacao` escreve no manual técnico o passo que grava o modelo pela API,
  junto com as pré-condições para ligar agente (04, seção 5, item 7). Um campo "Modelo" na T12 é demanda nova, pelo
  Orquestrador.
- **Minor 3 (relógio no e2e):** se a homologação acusar diferença de relógio, apagar `e2e/agentes-teto.spec.ts:140`.
- **Minor 4 (esqueleto de carregamento):** a `ux-ui-design` ou a `07-qa-funcional` decide, para todas as telas de uma
  vez.
- **Minor 5 (textos fora da 03):** está com a `ux-ui-design`, junto com os textos da T43 e da T44.
- **`07-qa-funcional`:** confirmar os itens que o engenheiro listou pelo G2:
  - o diálogo prende o foco e o devolve ao interruptor no "Cancelar" e no Esc;
  - o foco volta ao interruptor depois de ligar ou desligar, e vai ao alerta na falha;
  - "Alterando…" é anunciado;
  - o interruptor responde ao Espaço e ao Enter;
  - a região de aviso anuncia "Teto salvo", "ligado" e "desligado", inclusive o mesmo texto duas vezes seguidas;
  - o Resumo de erros do teto leva ao campo.
- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/b7tybdx0t.txt`.
  - Li só o resumo final desse arquivo, que a minha própria execução gerou nesta etapa.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 8464b66490fadab73bcf707aff3d3c7cd505ec8b` — 12 arquivos, 1.813 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — 8464b66 (06-T45-construcao) no topo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 189 de 189 arquivos, 3.664 de 3.664 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
