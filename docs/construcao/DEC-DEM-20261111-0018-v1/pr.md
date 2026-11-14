# Orquestrador 0.4.1: sobras da 0.1.13 e dívida da 0.4.0 · DEC-DEM-20261111-0018-v1

## Resumo

Melhoria de risco baixo com cadeia completa. Ela fecha as sobras da revisão da 0.1.13 (pedido 0014). Fabiano acrescentou
em 13/11 dois baixos da revisão final da 0.4.0 e, em 14/11, a migration pelo painel.

- **S-02, situação do DEC para o `/construir`.** A rota `GET /api/pedidos-construcao/[decId]/situacao` responde
  `{ situacao: 'vigente' | 'substituido' }`, só para a integração `construir` (ação `ler_situacao_pedido`).
  - DEC sem pedido gerado por pessoa: 404 com o mesmo corpo do inexistente.
  - Qualquer outro ator: 403, sem consulta e sem oráculo.
- **S-03, D1 com o nome da criação.** O DEC passa a guardar quais caminhos traziam o nome do solicitante na criação
  (coluna `caminhos_com_nome_na_criacao`). Ela guarda só caminhos, sem o nome nem hash dele.
  - O D1 da geração e da entrega usa essa marcação, e o DEC recusado continua recusado depois de trocar o
    `solicitanteNome`.
  - DEC criado antes da 0.4.1 confere o nome atual, como decidido na P1 (opção a).
- **S-04, arquivamento do v2 (decisão S1 de Fabiano e 7.1).** Arquivar o v2 segue o aprovado vigente.
  - Com o vigente atualizado, a demanda vai para `aprovada` e o v1 continua gerando.
  - Com o vigente desatualizado, vai para `em_analise`.
  - Sem vigente, vai para `encerrada`.
  - A dica do botão Arquivar e a barra de etapas da T05 seguem o mesmo destino.
- **C-27.** `src/lib/deps-qa.test.ts` foi estabilizado sem tirar nenhuma asserção e passou 20 vezes seguidas. A causa
  provável é o autovacuum worker entrando no banco de teste recém-copiado. As sessões passam a ser lidas pelo
  superusuário só no banco descartável de teste.
- **Textos da T11 com a `ux-ui-design`.**
  - Substituído, 409s, frase do histórico e linha 6 por nível.
  - Três avisos novos: (a) DEC pendente que substituirá o vigente; (b) vigente com DEC mais novo pendente; (c) DEC `cto`
    com vigente de dupla aprovação.
- **Dívida da 0.4.0 (acréscimo de Fabiano).**
  - B-08-1: a fila lê uma linha de andamento por demanda (`crossJoinLateral`), e o teste de plano exige ausência de Sort.
  - B-08-2: `registrar-qa.test.ts` e os testes de segurança da 0.3.x e da 0.4.0 entram no PISO de asserções.
- **Migration pelo painel (acréscimo de Fabiano em 14/11).** O `deploy.md` traz o roteiro do serviço `migrar` no
  Easypanel, e a publicação da 0.4.1 já usa esse roteiro.
- **Migration `0010`, só aditiva.** Cria uma coluna nova. Não há variável, job nem pacote novo.

A versão vai de 0.4.0 para 0.4.1. O envio do andamento sem `git` na pasta dos agentes (item 10) é ferramenta do
`/construir` e foi feito pela outra frente (estruturaAutonoma `4015b8e`).

## Etapas e tempos (cadeia completa)

| Etapa (agente) | Passagens | Minutos |
|---|---|---|
| 01 requisitos (analista-requisitos) | 1 | 7 |
| 02 arquitetura (arquiteto-solucoes) | 2 | 9 |
| 03 interface (ux-ui-design) | 1 | 7 |
| 04 ameaças (seguranca-aplicacao) | 1 | 8 |
| P1 (aprovada em nome de Fabiano, pela recomendação) | 1 | 0 |
| 05 plano (tech-lead; 2 voltas: T07 e T13) | 6 | 39 |
| P2 (até o fim; reaprovada nas duas voltas do plano) | 3 | 0 |
| 06 construção (backend, dados-bd, frontend) | 34 | 250 |
| 06 revisão (tech-lead) | 30 | 76 |
| 06 testes (qa-automacao) | 32 | 220 |
| 06 registros do maestro (bloqueios, liberações, ajustes) | 49 | 0 |
| 07 QA funcional (qa-funcional; 1 volta: CA-05.2) | 2 | 14 |
| 08 revisão (maestro, ultracode) | 1 | 6 |
| 09 entrega (devops-sre) | 3 | 25 |
| 10 documentação (documentacao-tecnica) | 1 | 17 |
| **Total** | **171** | **678** |

**Status das passagens:** 56 pronto, 54 bloqueado, 46 liberado, 8 ajuste, 4 aprovado e 3 devolvido.

- **Bloqueios:** foram todos por comando de leitura fora da lista Pode, e nenhum esperou por Fabiano
  (D-CONSTRUIR-2026-11-13).
  - A regra de leitura melhorou duas vezes durante o pedido (estruturaAutonoma `4015b8e` e `c2cc359`).
  - Com isso, os 120 comandos recusados até a metade do pedido passaram a ser aceitos.
- **Devoluções:**
  - T07 voltou ao plano porque um dublê de teste não estava na G5.
  - T13 voltou ao plano porque o CV-09 e a varredura do RF-09 não estavam na G5.
  - A 07 voltou à T11 porque o axe do CA-05.2 rodava numa largura só.

## Verificação (`verificar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| ramo | ok | `construcao/DEC-DEM-20261111-0018-v1` |
| árvore limpa | ok | limpa |
| versão | ok | 0.4.0 → 0.4.1 |
| changelog | ok | seção 0.4.1 |
| ci | ok | `.github/workflows/ci.yml` |
| remoto | ok | github.com/wsssistemas2626-crypto/ws-orquestrador-demandas |
| test | ok | 9.281 de 9.281 |
| lint | ok | limpo |
| typecheck | ok | limpo |

## Homologação (`homologar`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| subir | ok | http://127.0.0.1:3200 |
| saúde | ok | `/api/saude` respondeu 200 |
| e2e | ok | 285 passaram, contra o build de produção |
| derrubar | ok | projeto e volumes removidos |

## Ensaio de rollback (`ensaiar-rollback`)

| Verificação | Resultado | Detalhe |
|---|---|---|
| migrations da `main` | ok | nenhuma alterada |
| migrations novas | ok | 1; nenhuma altera dado existente (`alteram_dado: false`) |
| versão anterior | ok | a versão da `main` (0.4.0) respondeu 200 em 36 s |
| backup | ok | 168 KB, impressão `0a21433b1bc4d132` |
| versão nova | ok | a versão do ramo, sobre o banco da `main`, respondeu 200 em 36 s |
| restauração | ok | o banco ficou igual ao backup |
| volta | ok | a versão da `main` só volta com o backup restaurado |
| ida de novo | ok | a versão do ramo respondeu 200 em 36 s |
| derrubar | ok | projeto e volumes removidos |

> **A volta desta versão exige restaurar o backup do banco** (`volta_sem_restaurar: false`). O que for gravado depois
> do backup se perde (`deploy.md`, "Volta da 0.4.1").

## Testes

- **Unidade e integração:** 9.281 de 9.281 na verificação. Eram 7.741 na 0.4.0.
  - Cada tarefa da 06 passou por construção, revisão e testes, com o teste visto falhando antes do código.
  - Todo teste de segurança novo entrou no PISO.
- **Mudanças em teste existente:** todas aprovadas na G5 do plano, sem tirar nenhuma asserção.
  - Dublê `dbCom` em `fila-andamento.test.ts`.
  - `detalhe-dec.test.ts` (CV-09), só com acréscimo.
  - `linhaEsperada` em `dados-das-etapas.test.ts`, nas combinações `nova` e `em_analise` com o DEC arquivado.
  - Totais e listas do seed.
  - `decisao_arquivada` saiu do `it.each` de `servico.test.ts` e foi para um teste novo.
- **Ponta a ponta:** 285 na homologação. Na T14, foram 294 passados em três execuções seguidas, nenhum acima de 24 s.
- **Instabilidade conhecida sob carga**, em arquivos que não são deste pedido: `scripts/scripts.test.ts` T33,
  `test/desempenho/leitura.test.ts` (p95), `src/app/api/saude/route.test.ts`, `resumo-da-fila`, `minimizar` e
  `e2e/reflow-qa.spec.ts:152`. A causa do C-27 não explica esses casos.

## Achados da revisão (08)

Foi uma revisão por Workflow ultracode (`wf_aa559b73-072`, 10 agentes), com seis revisores, um por dimensão:
- permissões e oráculo;
- dado pessoal e D1;
- transições;
- consultas e migrations;
- testes que afrouxam;
- segurança.

Cada achado passou por verificação adversarial. **Nenhum achado crítico, alto ou médio.** Dois baixos tiveram voto
dividido e ficam como pendência conhecida:

- **R-08-1:** com o v2 arquivado e o vigente desatualizado, a barra marca a etapa 4 como feita, e a Próxima ação manda
  montar pacote novo. É o que a decisão 7.2 manda. O servidor recusa gerar com 409, e o efeito é só na tela.
- **R-08-2:** `dados-das-etapas-arquivamento.test.ts` (CV-19 da linha 6) fora do PISO. É cobertura extra.

## Pendências

**Fabiano, para publicar** (`deploy.md`, "Publicação 0.4.0 → 0.4.1"):

1. Se quiser a migration pelo painel: criar o serviço `migrar` no Easypanel, com o roteiro do `deploy.md`. O comando
   `!` continua valendo.
2. O backup sai antes da migration, e o maestro avisa quando estiver feito. Não tirar snapshot: hoje ele congela o
   servidor.
3. Migration `0010`, depois o Deploy do `worker` e por fim o do `app`. Nenhum outro merge até o fim da publicação.

**Para Fabiano decidir (produto):**

- R-08-1: a etapa 4 deve deixar de marcar como feito o vigente desatualizado?
- O "Aprovar" indisponível no caso (c) e a dica do Devolver ficam para um pedido futuro, como decidido na P1.

**Para a dívida da 0.4.x:**

- **R-08-2** e as Minors das revisões por tarefa:
  - a dica do Arquivar calculada em toda abertura da página (`page.tsx:164`);
  - o comentário em `dados-do-pedido.ts:46`;
  - a guarda do CV-09, que confere o nome `vigenteDe` e não a importação.
- **PISO:** ele conta linhas com `expect(`, então `it.each` em tabela não conta.
- **C-27:** reproduzir a causa provável. As 20 execuções usaram o paralelismo da máquina, e o `--maxWorkers` exato do CI
  não está liberado.
- **Não medidos ainda:** RNF-01 e RNF-05.
- **Capturas do manual (cap. 08):** ainda não mostram os avisos nem a dica nova.
- **`deploy.md:310`:** a frase sobre o arquivamento segue o texto da ESP. O comportamento exato está na spec do sistema
  (RF-07 revisto).
- **UAT:** refazer o seed antes. O roteiro de leitor de tela é R-A11Y.1 a 4, e as exploratórias são EXP-01, EXP-02 e
  EXP-07, todas da 07.

**Specs:** o maestro aplicou na P3 o texto que a 10 conferiu.
- Spec do sistema: RF-07 com o S-04 e a subseção "Critérios revistos depois da Parada 1", com RF-07, RF-13 e RF-22.
- Spec das integrações: a rota de situação.

## Publicação

Merge: pela política (`construir.mjs merge`, CA-P7-05) quando ela está ligada e permite; senão, de Fabiano. Serviço no
Easypanel é ação de Fabiano.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
