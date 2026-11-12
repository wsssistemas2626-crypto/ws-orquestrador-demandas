---
pedido: DEC-DEM-20261111-0016-v1
etapa: 06-T09-revisao
agente: tech-lead
leu: [contrato-passagem.md, tarefas.json, 05-tech-lead.md, docs/superpowers/plans/2026-11-11-ws-orquestrador-demandas-plano.md (T09, linhas 1841 a 1891, e o uso na T10 e na T11, linhas 1893 a 2052), 06-T09-engenheiro-backend.md, padrao-tecnico.md (seção 12), o commit b4b68ef (diff de src/ contra o pai)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T09 (commit `b4b68ef`): `conferirEMontarPedido` extraída de `gerarPedido`. **Aprovada.** Nenhum problema
Critical ou Important; três pontos Minor, nas Pendências.

### O que foi conferido

| Ponto do plano | Resultado |
|---|---|
| Arquivos: criar `conferir.ts`, `conferir.test.ts`, `gerar-bytes.test.ts`; modificar `gerar.ts` | Exatamente esses quatro em `src/`. Fora de `src/`, só a entrega da 06 e o `passagens.jsonl` do maestro |
| Passo 1: caracterização verde antes do refatoramento, SHA-256 registrado | `gerar-bytes.test.ts:126` grava `fc020cf0…69d8d` por `toMatchInlineSnapshot`; a entrega mostra o snapshot escrito antes de mexer em `gerar.ts` e a segunda execução sem reescrever |
| Passos 2 e 3: teste da função nova, visto falhando | `Cannot find module './conferir'`, na entrega |
| Passo 4: corpo movido do select do alvo até o `validarPedido` | Comparei bloco a bloco o trecho removido de `gerar.ts` com `conferir.ts:55-87`: mesma ordem (alvo, 404, trava, status final, aprovada, substituído, desatualizado, estudo, ESP e RSK citados, C-28 mais nome, `validarPedido`), mesmas mensagens e mesmos códigos. Só muda o comentário que aponta onde fica a confirmação |
| `conferirEMontarPedido(tx: Db, decId)` devolve `{ dec, json }`, sem autorizar, sem confirmação, sem evento | `conferir.ts:55`; o teste confere as chaves, a contagem de `evento` e a aridade (`conferir.test.ts:164`) |
| `gerarPedido`: `autorizar`, confirmação antes do banco, conferência e o mesmo `pedido_gerado`; devolve `{ nomeArquivo, json }` | `gerar.ts:30-33`; o evento tem os mesmos campos de antes. A serialização passou a vir antes do evento, sem efeito: o evento não leva o JSON |
| `MENSAGENS_PEDIDO` continua exportado de `gerar.ts` | Reexportado em `gerar.ts:20`. Desvio 1 da entrega aceito: o objeto mora em `conferir.ts` para evitar import circular, e quem importa de `gerar.ts` não muda |
| Passo 5: testes de hoje verdes sem mudança, SHA igual | Nenhum teste existente foi tocado (o diff só cria dois arquivos de teste). Rodei a suíte: verde. O snapshot inline não foi reescrito no commit, então o SHA depois é o mesmo de antes |
| G4 | Nenhuma superfície congelada no diff (só `src/modules/pedido-construcao/`) |

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Os testes a mais em
      `conferir.test.ts` (desvio 3: entregue, devolvido, C-28, `validarPedido`, transação de quem chama, `extras`) só
      reforçam a mesma garantia e não mudam código.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. `conferir.test.ts` falha sem `conferir.ts`. Cada
      recusa é comparada com a da geração (código, mensagem e `extras`) por `recusaIgualAGeracao`, então uma divergência
      futura entre geração e entrega quebra o teste. A caracterização nasce verde por definição (G3.1) e guarda os bytes.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Nomes "Pessoa Ficticia" e "Joana Ficticia", e-mails
      `@exemplo.test`, sentinelas de `test/sentinelas.ts`, sem token. O teste do nome confere que "Joana" e "Ficticia" não
      saem na mensagem, nos `extras` nem no `message`; o do C-28 confere a sentinela.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. Sem rota, Server Action ou job novo; as recusas mantêm as
      mensagens fixas e os erros só com caminho e tipo.
- [x] Banco: sem migration, sem GRANT, sem tabela. A trava `FOR UPDATE` continua dentro da transação de quem chama
      (`conferir.ts` não abre transação própria), como o G7 pede para a T11.
- [x] Nada duplica função que já existe. O corpo foi movido, não copiado: `gerar.ts` não tem mais nenhuma das conferências.
- [x] Textos de interface em pt-BR; axe: não se aplica, nenhuma tela tocada.
- [x] O que é Minor vai para Pendências.
- [x] No PR: `/code-review` e `/security-review` — não se aplica a esta etapa; fica com a `08-revisao`.

### Verificação própria

- `pnpm test src/modules/pedido-construcao`: 5 de 5 arquivos, 105 de 105 testes.
- `pnpm test` inteiro: 268 de 268 arquivos, 5682 de 5682 testes, os mesmos números da entrega.
- `pnpm typecheck` e `pnpm lint`: limpos.
- `git status --short`: árvore limpa no `b4b68ef`.

## Decisões tomadas

- Desvio 1 aceito (`MENSAGENS_PEDIDO` em `conferir.ts`, reexportado de `gerar.ts`): a conferência lança as mensagens, e o
  import ao contrário seria circular; o contrato do plano ("continua exportado de `gerar.ts`") segue cumprido.
- Desvio 2 aceito (SHA-256 em `toMatchInlineSnapshot`): torna automática a comparação antes e depois e protege o CA-22.2
  daqui para frente; o pedido fictício é determinístico (banco novo, relógio fixo, ids iguais).
- Desvio 3 aceito (testes além do plano): cobrem as recusas que o plano não listou e a transação de quem chama, que é
  justamente o uso da T11.
- O item do `/code-review` e do `/security-review` do PR é da `08-revisao`, não desta tarefa; marcado como não aplicável
  aqui, sem bloquear a passagem.

## Pendências

- Nenhuma bloqueia a T09.
- Minor M1 (`gerar-bytes.test.ts:126`): o SHA-256 fixo no teste quebra com qualquer mudança intencional no formato do
  pedido (por exemplo, um campo novo em `montarPedido` ou outra versão do `validarPedido` do `/construir`). É o
  comportamento desejado, mas quem mudar o formato precisa atualizar o snapshot de propósito e dizer na entrega por quê,
  nunca rodar com `-u` para "consertar". Para a `10-documentacao`: uma linha no manual técnico (cap. 05) sobre essa guarda.
- Minor M2 (`conferir.test.ts:164`): `conferirEMontarPedido.length).toBe(2)` é uma guarda estrutural fraca (um terceiro
  parâmetro opcional com valor padrão não mudaria o `length`). A garantia real de "sem confirmação" já vem de o teste
  chamar a função só com transação e id e ela montar o pedido; fica como está.
- Minor M3 (`conferir.ts:1-14`): o cabeçalho numera os passos de 1 a 5, e o de `gerar.ts` chama tudo de "passo 3". Os
  dois estão certos, mas quem ler o cap. 05 vê "RF-22 passos 3 a 11". Sem ação agora; a `10-documentacao` pode alinhar a
  numeração no manual.
- Para a T11 (`entregar.ts`): chamar `conferirEMontarPedido(tx, decId)` dentro da mesma transação que grava o
  `pedido_entregue`, e só depois de `pedidoGeradoPorPessoa` (T10), como o plano mostra nas linhas 2019 a 2031. A função
  não autoriza nem confere quem gerou.
- Para o maestro: as caixas `- [ ]` da T09 no plano (linhas 1855 a 1889) ainda não foram marcadas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat b4b68ef2ed2b84741200899ffbeec6aba7e8bef9~1 b4b68ef2ed2b84741200899ffbeec6aba7e8bef9` — 6 arquivos: os 4 de `src/` da tarefa, a entrega da 06 e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff b4b68ef2ed2b84741200899ffbeec6aba7e8bef9~1 b4b68ef2ed2b84741200899ffbeec6aba7e8bef9 -- src` — o diff do código, lido com Read
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — HEAD em `b4b68ef`, sobre a 06-T08-testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — árvore limpa
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao` — 5 de 5 arquivos, 105 de 105 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 268 de 268 arquivos, 5682 de 5682 testes (saída longa lida com Read)

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
