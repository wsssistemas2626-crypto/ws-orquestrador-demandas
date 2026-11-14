---
pedido: DEC-DEM-20261111-0018-v1
etapa: 08-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, spec 2026-11-13-ws-orquestrador-demandas-sobras-design.md, plano 2026-11-13-ws-orquestrador-demandas-sobras-plano.md, tarefas.json, 01 a 05, 06-T01 a 06-T14, 07-qa-funcional.md, git diff 41108ee...61b40db --stat]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261111-0018-v1` (topo `61b40dbe`) contra a `main` (`41108ee`, 0.4.0, em produção).
Fora de `docs/`, o ramo muda 109 arquivos: 14.659 linhas acrescentadas e 222 removidas.

**Resultado: pronto.** Não sobrou nenhum achado crítico, alto ou médio. Dois baixos tiveram voto dividido na
verificação e ficam em Pendências.

### Revisão usada

Por pedido de Fabiano (13/11: "ok, use ultracode na revisão final"), a revisão rodou como Workflow em vez das skills
`code-review` e `security-review`. Workflow `revisao-0018-ultracode`, execução `wf_aa559b73-072`, 10 agentes, só leitura.

1. **Seis revisores em paralelo, um por dimensão.**
   - **Permissões e oráculo:** a ação `ler_situacao_pedido`, a rota de situação, a visibilidade do Awave, os avisos
     novos e o CV-09.
   - **Dado pessoal e D1:** a coluna `caminhos_com_nome_na_criacao`, a marcação nos cinco caminhos de criação e o D1
     que não pode ficar mais fraco que na 0.4.0.
   - **Transições e concorrência:** o destino do arquivamento e a dica do Arquivar.
   - **Consultas e migrations:** o LATERAL, a migration 0010 e o C-27.
   - **Testes que afrouxam,** comparados com a `main` e com a G5 do plano.
   - **Segurança de aplicação:** XSS, CSP, mensagens 409, logs e seed.

   Cada revisor recebeu a spec, o plano com os registros de correção e as decisões da P1 e das voltas. A regra de
   comando foi a mesma da cadeia, como pede a lição do 0017.
2. **Verificação adversarial.** Cada achado foi para verificadores independentes com ordem de refutar: três para crítico
   ou alto, dois para médio ou baixo. As lentes foram código, reprodução e regra. O achado só fica se a maioria não o
   refutar. Com dois verificadores, o voto dividido não fica.

| Dimensão | Achados | Mantidos |
|---|---|---|
| Permissões e oráculo | 0 | 0 |
| Dado pessoal e D1 | 0 | 0 |
| Transições e concorrência | 1 baixo | 0 (voto dividido) |
| Consultas e migrations | 0 | 0 |
| Testes que afrouxam | 1 baixo | 0 (voto dividido) |
| Segurança de aplicação | 0 | 0 |

## Decisões tomadas

- **Status pronto:** nenhum crítico ou alto, então não há volta para a 08-correcao (construir.md, seção 3, passo 4).
- **Os dois baixos ficam como Pendências registradas, não como defeito.** Os dois tiveram um verificador a favor e um
  contra.
  - O primeiro é o que a decisão 7.2 da spec manda e já estava registrado em quatro lugares.
  - O segundo é cobertura extra de teste, sem efeito no código de hoje.
- **CA-04.4, CA-09.1, CA-10.2 e critério 8 (serviço `migrar`):** aceito a leitura da 07. Os quatro são documentação e
  ficam com a 09 e a 10.

## Pendências

**Baixos com voto dividido na revisão final, para Fabiano e a `ux-ui-design` decidirem ou para a dívida:**

- **R-08-1 (transições), `src/components/dados-das-etapas.ts:144` e `:246`.**
  - **Situação:** v2 arquivado, vigente desatualizado, demanda em Em análise.
  - **O que a tela mostra:** a barra marca a etapa 4 como feita e a etapa 5, Pedido de Construção, como atual, mas a
    Próxima ação manda montar pacote novo.
  - **Efeito:** o servidor continua recusando gerar o pedido do v1 com o 409 de desatualizado, então o efeito fica só na
    leitura da tela.
  - **Por que está assim:** é o que a decisão 7.2, itens 3 e 4, manda ao pé da letra. O caso já estava registrado na
    M3 da 06-T13-tech-lead, na 06-T13-qa-automacao e na EXP-07 da 07. O teste
    `detalhe-vigente-banco-qa.test.ts:172` trava esse comportamento.
  - **Opção:** se a tela confundir, a etapa 4 pode deixar de marcar como feito o vigente desatualizado. Isso é mudança
    de decisão de produto.
- **R-08-2 (testes), `src/components/dados-das-etapas-arquivamento.test.ts:162`.**
  - **O que falta:** o caso CV-19 da linha 6 e o CV-09 desse arquivo não estão no PISO.
  - **O que já existe:** o CV-09 está repetido no `-qa`, que está no PISO com 15. O link sai de `paraDemanda`, que é o
    mesmo guarda da `main`.
  - **Sugestão para a dívida:** pôr o arquivo no PISO com a contagem atual.

**Minors das revisões por tarefa, para a dívida da 0.4.x:**

- Os Minors de cada `06-Tnn-tech-lead.md`. Entre eles:
  - a dica do Arquivar calculada em toda abertura da página, em `page.tsx:164`;
  - o comentário de bloco de `dados-do-pedido.ts:46`;
  - a guarda do CV-09, que confere o nome `vigenteDe` e o argumento `d` mas não de onde a função é importada.
- **Limite do PISO:** ele conta linhas com `expect(`, então uma tabela de `it.each` não conta asserção. Fica para um
  pedido futuro.
- **C-27:** a causa ficou como "provável" (autovacuum worker no banco recém-copiado), sem reprodução. As 20 execuções
  usaram o paralelismo padrão da máquina, igual ou maior que o do CI. O `--maxWorkers` exato do CI não está liberado.
- **Instabilidade de tempo sob carga, conhecida:** `scripts/scripts.test.ts` T33, `test/desempenho/leitura.test.ts`
  (p95), `src/app/api/saude/route.test.ts`, `resumo-da-fila`, `minimizar` e, agora, `e2e/reflow-qa.spec.ts:152`, que
  mediu 5,5 s, 6,1 s e 18,1 s.
- **UAT:** o seed precisa ser refeito antes, porque o e2e grava em duas demandas da vigência. A 07 deixou roteiro de
  leitor de tela (R-A11Y.1 a 4) e as exploratórias EXP-01, EXP-02 e EXP-07.

**Para a 09-entrega:**

- Migration 0010, só aditiva. A volta para a 0.4.0 exige restaurar o backup, então o esperado é
  `volta_sem_restaurar: false`.
- Roteiro do serviço `migrar` no `deploy.md` (item 11 do pedido, acréscimo de Fabiano em 14/11). A publicação da 0.4.1
  já usa esse roteiro.
- Instabilidade de tempo sob carga, já listada acima.

**Para a 10-documentacao:** CHANGELOG 0.4.1, com a causa provável do C-27; manual caps. 04 e 08; spec do sistema
(A-02 e CA-22.x no RF-13 e RF-22); rota de situação na spec das integrações; limite do S-03 para DEC antigo e da rota de
situação com demanda encerrada.

**Registro dos comandos dos revisores:** os 10 agentes do Workflow rodaram 46 comandos, todos só de leitura, com a
regra de comando da cadeia no prompt. A lista completa está no journal da execução:
`/home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/subagents/workflows/wf_aa559b73-072/journal.jsonl`.

## Critério de pronto atendido

- [x] Revisão de código e de segurança feitas sobre o ramo inteiro, com a revisão usada registrada (Workflow ultracode
  com verificação adversarial, por pedido de Fabiano).
- [x] Sem crítico nem alto: `status: pronto`, `proximo: devops-sre`.
- [x] Médios e baixos classificados: nenhum médio; os dois baixos com voto dividido e as Minors estão em Pendências.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas rev-parse HEAD` — 61b40dbe72beeaf9be57a7a1718d6502f4b7ce7e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 41108ee...HEAD -- . ':!docs'` — 109 arquivos, 14.659 inserções e 222 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 41108ee...HEAD -- . ':!docs'` — 109 arquivos
