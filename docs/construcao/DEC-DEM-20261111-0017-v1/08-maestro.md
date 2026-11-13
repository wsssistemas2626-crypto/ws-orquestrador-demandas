---
pedido: DEC-DEM-20261111-0017-v1
etapa: 08-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, spec 2026-11-12-ws-orquestrador-demandas-andamento-design.md, plano 2026-11-12-ws-orquestrador-demandas-plano.md, tarefas.json, 06-T01 a 06-T14 (construção, revisão e testes), 07-qa-funcional.md, git diff 0ac099a...87a4515 --stat]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261111-0017-v1` (topo `87a45150`) contra a `main` (`0ac099a`, 0.3.1, em
produção). Fora `docs/`, são 109 arquivos, com 16.320 linhas acrescentadas e 104 removidas.

**Resultado: pronto, sem achado crítico, alto ou médio.** Ficam dois baixos confirmados e as Minors das revisões por
tarefa, em Pendências.

### Revisão usada

Fabiano pediu ultracode na revisão final (13/11: "ok, use ultracode na revisão final"). Por isso, em vez da skill
`code-review` e da `security-review`, usei um Workflow (`revisao-0017-ultracode`, execução `wf_b1132e9b-520`). Foram 12
agentes, só de leitura.

1. **Seis revisores em paralelo, um por dimensão.** Cada um recebeu a spec, o plano, as decisões A1 a A3 e P-01 a P-04,
   e a lição da 0.3.1 (toda leitura nova precisa da regra de visibilidade do Awave). As dimensões:
   - permissões e visibilidade;
   - concorrência e travas;
   - prazos e transações (incluindo as migrations 0008 e 0009);
   - contratos de rota e tela (incluindo o EXP-01 da 07);
   - testes que afrouxam, comparados com a `main`;
   - segurança de aplicação (OWASP, XSS, injeção, token em log, dado pessoal, seed).
2. **Verificação adversarial de cada achado.**
   - Cada achado foi para verificadores independentes, instruídos a refutar: três para crítico e alto, dois para médio
     e baixo.
   - Cada verificador olhou por uma lente: o código, a reprodução ou a regra.
   - O achado só ficou se a maioria não conseguiu refutar.

| Dimensão | Achados | Confirmados |
|---|---|---|
| Permissões e visibilidade | 0 | 0 |
| Concorrência e travas | 0 | 0 |
| Prazos e transações | 1 | 1 baixo |
| Contratos de rota e tela | 1 | 0 (refutado como defeito; vira ponto de produto) |
| Testes que afrouxam | 1 | 1 baixo |
| Segurança | 0 | 0 |

## Decisões tomadas

- **Status pronto:** nenhum achado crítico ou alto sobreviveu à verificação, então não há volta para a 08-correcao
  (construir.md seção 3, passo 4).
- **EXP-01 não é defeito de código.** Os dois verificadores confirmam o caminho: a fila pode mostrar "Construção
  concluída" para o andamento de um DEC já substituído, enquanto o detalhe mostra o alerta e a linha 11 da Próxima ação.
  Mas o RF-08 da spec não pede vigência no selo da fila. A decisão do `ux-ui-design` (03, Decisões tomadas) e a ADR-35
  deixam a vigência só no detalhe, para a fila não ganhar consulta nova. Além disso, marcar Entregue é ato de pessoa
  (A1), feito no detalhe, que avisa. Fica como ponto de produto para Fabiano, em Pendências.
- **CA-13.1 a CA-13.3** (CHANGELOG, manual cap. 05, docs/operacao): aceito a leitura da 07. Pelo plano (G2/D-10), quem
  escreve isso é a 10-documentacao, e a conferência do conteúdo fica para depois dela.
- **Baixos e Minors:** vão para Pendências, sem correção nesta etapa. Nenhum muda resultado nem afrouxa controle, e os
  dois baixos têm correção pequena e indicada.

## Pendências

**Baixos confirmados pela revisão final**

- **B-08-1 (prazos e transações), `src/modules/andamento/consultas.ts:45`.** `andamentosDasDemandas` usa `DISTINCT ON
  (demanda_id) … ORDER BY demanda_id, id DESC`. O índice `(demanda_id, id)` da 0008 não entrega essa ordem mista, então
  a consulta lê todas as linhas de andamento das demandas da página e ordena. O resultado é certo, mas o custo de
  `/demandas` cresce com o tempo, porque a tabela só recebe inclusões e não tem teto acumulado.
  - Correção: `CROSS JOIN LATERAL (… WHERE demanda_id = d.id ORDER BY id DESC LIMIT 1)` sobre `unnest($ids)`. Ela usa o
    índice atual de trás para frente e lê uma linha por demanda. O verificador mostrou que um índice `(demanda_id, id
    DESC)` sozinho tira o Sort, mas não reduz as linhas lidas.
  - O teste de plano (`consultas.test.ts:193-196`) deve passar a exigir a ausência de Sort sobre `andamento_construcao`.
  - Sugiro entrar na 09 junto com a medição do RNF-01 com a tabela povoada, ou na 0018.
- **B-08-2 (testes), `test/estatico/piso-de-assercoes.test.ts:67`.** `src/modules/andamento/registrar-qa.test.ts` (da
  06-T07-testes, com 69 `expect(`) ficou fora do PISO de asserções.
  - É ele que cobre o AN-03 adversarial (404 sem oráculo em nove formas de DEC), o AN-05 (corrida com entrega e
    recebimento) e o AN-06. Todas as outras etapas de QA puseram seus arquivos no piso.
  - Correção: acrescentar `'src/modules/andamento/registrar-qa.test.ts': 69` com o comentário da 06-T07-testes.

**Para Fabiano decidir (produto)**

- **EXP-01:** a fila e a leitura do Awave mostram o último andamento da demanda sem olhar se o DEC foi substituído. Pela
  spec, isso está certo, e o detalhe avisa. Decidir se a fila e o Awave devem esconder o andamento de DEC substituído.
  Isso pediria uma consulta de vigência na fila, contra a ADR-35, ou o selo só depois do primeiro andamento do DEC novo.

**Minors das revisões por tarefa (06), para a 0018 ou a dívida da 0.4.x**

- `test/desempenho/leitura.test.ts:244`: o comentário diz que a consulta usa o índice, mas o banco vazio dá Seq Scan. O
  índice está provado na T06.
- Os casos depois do CA-04.6 rodam no banco sem os dois CHECK. Um banco próprio deixaria o isolamento explícito (o
  `leitura-andamento-fora-do-esquema-qa.test.ts` da 06-T09-testes já faz isso para o seu caso).
- Títulos antigos que ainda dizem "seis chaves", e o `a === null` em `paraIntegracao` (T05).
- T11: M2, a lista de status do teste escrita à mão em vez de `STATUS_DEMANDA`; M3, a guarda estática das importações
  de `dados-do-andamento.ts`.
- T13: ramo morto (`<span>` com `dec.href === null`) em `SecaoAndamento.tsx`; testes de `secaoDoAndamento` no arquivo de
  `dados-das-etapas`; teste estático de `style=` (CV-02) não localizado. A CSP e o e2e cobrem isso na execução.
- T14: a asserção de `status_alterado` em `e2e/andamento-construir.spec.ts:288` não está presa à transição. Ver
  `06-T14-qa-automacao.md`.

**Para a 09-entrega**

- Medir o RNF-01 com a tabela de andamento povoada, com o B-08-1 em mente.
- Instabilidade de tempo sob carga, já conhecida, em arquivos que não usam código deste pedido: `scripts/scripts.test.ts`
  T33, `test/desempenho/leitura.test.ts` (p95 de 522 ms contra 500 ms uma vez), `src/app/api/saude/route.test.ts`,
  `resumo-da-fila` e `minimizar`. Todos passam rodados sozinhos.
- Migrations 0008 (gerada) e 0009 (GRANT, `rls_andamento_construcao`): aditivas. A volta para a 0.3.1 exige restaurar o
  backup (`volta_sem_restaurar: false` esperado no ensaio).
- P-04: o envio de andamento por usuário próprio do sistema é pendência da publicação.

**Para a 10-documentacao:** CHANGELOG 0.4.0, manual cap. 05, docs/operacao (CA-13.1 a CA-13.3), e o manual
`10-configuracao-e-scripts.md` (o seed passou de 28 para 36 demandas).

**Registro dos comandos dos revisores.**
- Os 12 agentes do Workflow rodaram 95 comandos, todos só de leitura sobre o repositório do pedido (`git show`, `git
  grep`, `git diff`, `git log`). Alguns saíram fora da forma da lista Pode, com `$R` ou `;`.
- A lista completa está no journal da execução, em
  `/home/deploy/.claude/projects/-home-deploy-servidor-projetos-estruturaAutonoma/d7de67e8-15e3-4f45-b927-45e1f3d1b43d/subagents/workflows/wf_b1132e9b-520/journal.jsonl`.
- Na 0019, o mesmo caso (um `git grep` do revisor de segurança) ficou registrado aqui, em Pendências. Para a próxima
  revisão por Workflow, o prompt dos revisores deve trazer a mesma regra de comando dos agentes da cadeia.

## Critério de pronto atendido

- [x] Revisão de código e de segurança feitas sobre o ramo inteiro, com a revisão usada registrada (Workflow ultracode
  com verificação adversarial, por pedido de Fabiano).
- [x] Sem crítico nem alto: `status: pronto`, `proximo: devops-sre`.
- [x] Médios e baixos classificados: nenhum médio confirmado; os dois baixos e as Minors estão em Pendências.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 0ac099a...HEAD -- . ':!docs'` — 109 arquivos, 16.320 inserções e 104 remoções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline 0ac099a..HEAD` — 125 commits
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --name-only 0ac099a...HEAD -- . ':!docs'` — lista dos arquivos por pasta
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas rev-parse --short main` — 0ac099a
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas rev-parse HEAD` — 87a45150aa334c8cd99a91436378f900a150de23
