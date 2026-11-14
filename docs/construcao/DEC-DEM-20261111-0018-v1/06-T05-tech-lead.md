---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T05-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seções 6, 7 e 12), 2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T05), 06-T05-engenheiro-backend.md, commit d9475df, src/modules/pedido-construcao/caminhos-da-criacao.ts, 01-analista-requisitos.md (CA-02.x e RNF-09, por git grep), 04-seguranca-aplicacao.md (SB-08 e SB-09, por git grep)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Parecer da revisão da T05 (D1 com o nome da criação na geração e na entrega), commit `d9475df`.

**Resultado: aprovado. Não há Critical nem Important.**

**Código de produção: `src/modules/pedido-construcao/conferir.ts`**

O diff é o do Passo 3 do plano, linha por linha:
- o `select` do `alvo` traz `caminhosComNomeNaCriacao`;
- `lerCaminhosDaCriacao` roda logo depois do 404 e antes de `travarDemanda`;
- `marcados` fica vazio quando a coluna é nula, e senão vem de `caminhosDaCriacaoNoPedido(daCriacao, escolhida)`;
- o filtro é `marcados.has(caminho) || temNome(...)`;
- entrou o import das duas funções;
- a frase do passo 4 do comentário do topo foi acrescentada.

`MENSAGENS_PEDIDO` não mudou. `gerar.ts`, `entregar.ts` e `montar.ts` também não mudaram. As duas funções chamam `conferirEMontarPedido` (`gerar.ts:33`, `entregar.ts:41`), então a geração e a entrega recusam pela mesma regra (CA-02.3).

**O D1 não ficou mais fraco que o da 0.4.0 em nenhum caminho:**
- o critério novo só entra no filtro com `||`. O critério do nome atual continua lá sem nenhuma condição;
- com a coluna nula (DEC anterior à 0.4.1), `marcados` é vazio e a regra é exatamente a da 0.4.0. Isso segue a decisão da P1, opção a, e está testado nos dois sentidos;
- com a coluna fora do formato, sai um `Error` fixo, que vira 500 sem gerar e sem entregar. Ele nunca é tratado como `null` nem como `[]` (SB-08 e).

**Testes**
- `conferir-nome-da-criacao.test.ts` cobre os casos 1 a 8 do Passo 1 e mais estes:
  - a opção escolhida com o nome antigo, em A e em B;
  - um quinto valor ruim, com `MAXIMO_DE_CAMINHOS + 1` itens;
  - as rotas na falha fechada, com o Sentry exercitado (`>= 1` envelope) e sem o valor nem a mensagem;
  - os cinco caminhos que criam DEC (06-T04-testes).
- `sentinelas-nome-da-criacao.test.ts` (SB-09 d, CA-02.5, RNF-09):
  - cria o DEC e passa pelas duas recusas, tudo pelas rotas;
  - varre o pino, o console, o Sentry, `evento` (antes e depois), a coluna e o `pgboss` atrás das duas sentinelas (o nome antigo e o atual);
  - tem controles de que as saídas foram exercitadas: as cinco linhas de log das rotas e a coluna gravada.
- O teste foi visto falhando antes do código: 18 falhas em 24, com o trecho da saída na entrega. Os 6 que já passavam são as regras da 0.4.0 que o pedido manda preservar. A explicação está na entrega e confere com o que esses casos testam.
- `gerar.test.ts`, `conferir*.test.ts` e os demais testes do D1 e do CA-22.2 não foram tocados no commit (SB-08 b). Rodados agora, passaram.
- `PISO` só ganhou entradas: 48 e 10, os mesmos números da entrega.

**Checklist da seção 12 do padrão técnico**
- [x] Faz o que o plano pede. Mudaram só os quatro arquivos listados na T05, mais a entrega e o `passagens.jsonl` do maestro. Os casos a mais são testes, não comportamento novo.
- [x] Cada comportamento novo tem teste, e o teste falharia sem o código: falhou antes do código, como mostra a entrega.
- [x] Não há segredo, `.env` nem dado pessoal real. Os nomes são fictícios e os tokens nascem durante o teste.
- [x] Entrada externa validada com Zod. A coluna passa por `caminhosSchema`, da T04. O erro é fixo, sem `issues`, e vira 500 com o corpo genérico.
- [x] Banco: sem migration nesta tarefa. A coluna é da T03.
- [x] Nada duplica função existente: são usadas `lerCaminhosDaCriacao`, `caminhosDaCriacaoNoPedido`, `textosDoPedido` e `temNome`.
- [x] Interface: a tarefa não tem tela.
- [x] O que é Minor está nas Pendências.
- [x] PR: fora desta etapa. O `/code-review` e o `/security-review` ficam com a `08-revisao` e o PR.

**Pareceres (todos Minor, nenhum bloqueia)**

1. `test/transversal/sentinelas-nome-da-criacao.test.ts:177`
   - **Problema:** neste arquivo, a varredura do Sentry não tem controle de que recebeu alguma coisa. As duas recusas são 422 (`ErroDominio`), que não vão ao Sentry, e o arquivo nunca confere que chegou algum envelope.
   - **Razão:** do jeito que está, a asserção "Sentry sem a sentinela" passaria mesmo com o Sentry desligado. O risco é baixo, porque o Sentry com 500 está provado em `conferir-nome-da-criacao.test.ts:313`. Se a `06-T05-testes` achar útil, pode juntar um 500 controlado a esse fluxo.
2. `src/modules/pedido-construcao/conferir.ts:91`
   - **Problema:** o ramo `!escolhida` não tem como ser alcançado, porque `montarPedido` já lança o 409 sem decisão aprovada.
   - **Razão:** o ramo fica como defesa e está explicado no comentário da linha 90. Não pede mudança. Registro só para a `08-revisao` não tomar o ramo por falta de cobertura.
3. `src/modules/pedido-construcao/conferir.ts:93` e `src/modules/pedido-construcao/caminhos-da-criacao.ts:26`
   - **Problema:** o predicado `valores.some((v) => temNome(v, nomes))` aparece nos dois lugares.
   - **Razão:** a duplicação vem da 0.4.0 e é o código que o plano manda escrever. Com uma função só, a regra do nome na criação e a da conferência não teriam como se separar. Vale como dívida pequena para a `08-revisao`. Não pede mudança aqui.

## Decisões tomadas

- Aprovado sem devolução. O diff de produção é o do plano, o D1 só ganha critério com `||`, a coluna nula mantém a regra da 0.4.0 e a coluna inválida falha fechada. Por isso nenhum caminho ficou mais fraco que o da 0.4.0.
- Aceitos os desvios declarados pelo engenheiro:
  - duas sentinelas no lugar de uma, o que cobre o nome antigo e o atual, como pede o SB-09 d;
  - a varredura das respostas restrita às recusas, porque a criação e a alteração da demanda devolvem o solicitante por definição;
  - os casos de teste a mais.
  Nenhum deles tira cobertura pedida.
- O Minor 3 da revisão da T04 (zero à esquerda no índice) continua só com a `08-revisao`. Na T05 ele não libera nada, porque o nome atual continua conferido.

## Pendências

- Nenhuma que impeça a próxima etapa.
- Para a `06-T05-testes`: o parecer 1, um controle de que o Sentry recebeu envelope no arquivo das sentinelas. É opcional.
- Para a `08-revisao`: os pareceres 2 e 3, e o Minor 3 da T04.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files docs/construcao/DEC-DEM-20261111-0018-v1` — 23 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Tarefa" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem resultado
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T05" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — T05 na linha 1051
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d9475df46ed45b7047c483cb5ff23c96594fb75b~1 d9475df46ed45b7047c483cb5ff23c96594fb75b --stat` — 6 arquivos: 2 testes novos, `conferir.ts`, piso, entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "^## " -- docs/construcao/padrao-tecnico.md` — seção 12 na linha 130
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show d9475df46ed45b7047c483cb5ff23c96594fb75b -- src/modules/pedido-construcao/conferir.ts test/estatico/piso-de-assercoes.test.ts` — diff igual ao Passo 3; piso +48 e +10
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show d9475df46ed45b7047c483cb5ff23c96594fb75b -- src/modules/pedido-construcao/conferir-nome-da-criacao.test.ts` — testes lidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show d9475df46ed45b7047c483cb5ff23c96594fb75b -- test/transversal/sentinelas-nome-da-criacao.test.ts` — testes lidos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "CA-02\.\|SB-09\|RNF-09" -- docs/construcao/DEC-DEM-20261111-0018-v1/01-analista-requisitos.md docs/construcao/DEC-DEM-20261111-0018-v1/04-seguranca-aplicacao.md` — critérios
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas ls-files src/modules/pedido-construcao` — 23 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules/pedido-construcao test/transversal/sentinelas-nome-da-criacao.test.ts test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 14 de 14 arquivos, 284 de 284 testes
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "conferirEMontarPedido" -- src` — usado em `gerar.ts:33` e `entregar.ts:41`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "temNome\|caminhosComNomeNaCriacao(" -- src` — duplicação do parecer 3

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
