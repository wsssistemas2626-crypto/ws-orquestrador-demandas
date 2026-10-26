---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T22-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G4 e T22), 06-T22-engenheiro-backend.md, git show 7434f549, 01-analista-requisitos.md (glossário e RF-22), 03-ux-ui-design.md (T07 a T11), 04-seguranca-aplicacao.md (seções 1 a 4), src/modules/acesso/matriz.ts, src/lib/rota.ts, src/modules/pacotes-decisao/consultas.ts, src/modules/pacotes-decisao/criar.ts, test/deps.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T22 (Pedido de Construção), commit `7434f549ba9891dc6f66cc17e1b628af14ed19e7`. **Nenhum problema Critical
ou Important.** A passagem segue para a `06-T22-testes`. Os quatro pontos Minor estão em Pendências.

### Conferência contra o plano

| Item do plano | Situação |
|---|---|
| Arquivos | Os 9 da lista, todos novos. Nenhum arquivo existente mudou (`git show --stat`) |
| Interfaces | Batem com o plano. Os três desvios declarados na entrega estão aceitos (ver Decisões) |
| Detectores | As quatro expressões são as do plano, sem mudança, e todas globais. A busca usa `search`, que não depende do `lastIndex`, e há teste para isso |
| Montagem | Segue a tabela do RF-22 campo a campo: `descricao` vem da cópia do DEC; `aprovadoPor` sai na ordem `PAPEIS_APROVACAO`, unido por " e "; `aprovadoEm` sai por `dataIsoSaoPaulo(decididaEm)`; não há data de geração |
| Ordem de `gerarPedido` | autorizar → 404/409 → 422 estudo (pelo `demandaTipo` do DEC) → montagem → 422 C-28 → 422 `validarPedido` → evento → JSON. É a ordem do plano |
| Rota | Só `POST`, por `rota()` e `paramId.versao('decId', 'DEC')`. O `filename` sai de um id que já passou pela regex e pelo 404. `nosniff`, `no-store` e a ausência de CORS vêm de `rota()` |
| G3.8 | `t?` aceito; sem `t`, abre `comTransacao`. Há teste de rollback |
| RNF-15 | O relógio é fixo nos dois arquivos de integração (`relogioFixo` e `criarDepsDeTeste`) |

### Cobertura dos critérios e controles

- **CA-22.1 a CA-22.6:** um teste para cada um em `gerar.test.ts`. A CA-22.4 cobre pendente, devolvida, arquivada e as
  duas aprovações parciais. A CA-22.6 passa pela entrada manual, com texto bruto, origem e anexo sentinela. A CA-22.3,
  a CA-22.4 e a C-28 também são testadas pela rota.
- **C-16:** a rota não exporta `GET`, como o plano define.
- **C-17:** id fora do formato, inclusive com aspas e `\r\n` para forjar cabeçalho, responde 404 sem `query` nem
  `connect` no pool.
- **C-21:** uma linha por requisição, sem id, conteúdo, sentinela nem token.
- **C-28:** o caminho e o tipo saem sem o valor. Há um erro por campo e tipo, e o CNPJ fica de fora, como decidido na 04.
- **C-29:** os cabeçalhos estão testados, e o corpo é igual ao `json` gerado, byte a byte.
- **ADR-05:** o validador é o `validarPedido` de `src/vendor/construir`, e o 422 traz a lista exata dos erros dele.

Os testes falhariam sem o código: os três arquivos falharam por módulo ausente, e o trecho da saída está na entrega.
Os testes de comportamento conferem valores exatos, entre eles os textos, a ordem das chaves, os erros e a contagem
de eventos.

### Verificação própria

- `pnpm test`: 104 arquivos, 1978 de 1978.
- `pnpm lint` e `pnpm typecheck` limpos.
- `git log -S` não achou outra ordenação de nível de risco nem outro rótulo "Médio" em `src/`. As utilidades usadas já
  existiam e foram reaproveitadas: `dataIsoSaoPaulo`, `PAPEIS_APROVACAO`, `obterPacoteDecisao`, `obterEspecificacao`,
  `obterParecerRisco` e `registrarEvento`.

### Checklist da seção 12

- [x] Faz o que o plano pede, nem mais nem menos. Os arquivos fora da tarefa não mudaram.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Não há segredo, valor de `.env` nem dado pessoal real. Os dados são fictícios: domínio `.test`, "Pessoa
      Ficticia" e `SENTINELAS`.
- [x] Entrada externa validada pelo Zod (`paramId` na rota), e o erro não vaza detalhe: o 422 de C-28 sai sem o valor,
      e o resto passa por `mapearErro`.
- [x] Banco: não se aplica (sem migration nem tabela nova).
- [x] Nenhuma função nova repete uma que já existe. Há só uma terceira cópia local de `preenchido`, de uma linha, pela
      mesma dívida já aberta na T21 (Minor 1).
- [x] Textos em pt-BR. A tarefa não tem tela, então o axe não se aplica.
- [x] Os Minor estão em Pendências. Não há Critical nem Important.
- [x] PR (`/code-review`, `/security-review`): não se aplica a esta etapa, fica com a `08-revisao`.

### Pareceres (todos Minor; não bloqueiam)

| # | Arquivo:linha | Problema | Razão |
|---|---|---|---|
| 1 | `src/modules/pedido-construcao/conteudo.ts:37` | Terceira cópia local de `preenchido`. As outras duas estão em `pacotes-decisao/criar.ts:27` e na cópia apontada pelo Minor 1 da `06-T21-revisao` | A regra de "texto vazio" mora em três lugares. Se uma cópia mudar, por exemplo para tratar espaço não separável, o pedido e a descrição copiada no DEC passam a discordar. Vai para o ajudante único da 08, junto com os Minor 1 e 2 da T21 |
| 2 | `src/modules/pedido-construcao/montar.ts:30` | O texto do 409 ("o Pedido de Construção só é gerado de pacote aprovado.") não está na 03. A T11 da 03 só define os 409 da decisão | G3.11 pede os textos da 03 por inteiro. O texto segue o molde "Não foi possível concluir: …" e está correto, mas não tem origem escrita. A T44 deve usá-lo pela constante `MENSAGENS_PEDIDO.naoAprovado`, sem redigir outro |
| 3 | `src/modules/dados-pessoais/detectores.ts:10` | A expressão de telefone, que é a do plano, não acha celular sem DDD (`99999-0000`) nem fixo sem DDD (`3000-0000`) | Na C-28, um telefone de cliente escrito sem DDD passa para o git da estruturaAutonoma, onde não se expurga (D5 e D8 da 04). O plano fixou a expressão e os testes da C-28 passam; ampliar a expressão aumenta o falso positivo em número de pedido e de versão. A decisão é da `seguranca-aplicacao` na T24 (C-23) ou na `08-revisao`. Nada muda nesta tarefa |
| 4 | `src/modules/pedido-construcao/conteudo.ts:28` | `ROTULO_DO_NIVEL` repete os rótulos Baixo, Médio e Alto, que a T36 também vai definir em `src/components/rotulos.ts` | G3.11 manda tirar os rótulos de `rotulos.ts`. Aqui a cópia separada é de propósito: o pedido não é tela, e se ele importasse os rótulos da interface, uma mudança de texto no painel mudaria o pedido de DEC já aprovado, o que quebra a CA-22.2 entre versões. Fica como está, e a T36 não deve fazer `conteudo.ts` importar `rotulos.ts` (ver Decisões) |

## Decisões tomadas

- **Formato de `especificacao.conteudo` e `risco.conteudo` fixado como o contrato da 0.1.0.** Atende a pendência do
  engenheiro.
  - O formato:
    - "Rótulo: valor";
    - lista com "Rótulo:" e um item por linha, com "- ";
    - blocos separados por linha em branco;
    - campo vazio fora;
    - na ESP, os 13 campos na ordem da T07, sem os quatro campos de construção;
    - no RSK: Resumo, os três riscos com "Comentário:" na linha de baixo, Mitigação, Pré-condições e o texto do jurídico.
  - Os testes de texto exato de `gerar.test.ts` (`textoDaEspecificacao` e `textoDoParecer`) são a guarda.
  - Razão: mudar o formato muda os bytes do pedido de todo DEC já aprovado. Por isso a mudança só entra com decisão
    escrita numa etapa, e nunca como ajuste de passagem.
- **Os rótulos de nível ficam em `conteudo.ts` e não vêm de `rotulos.ts`.** Razão: o determinismo da CA-22.2 vale
  acima do reuso. O texto do pedido não pode depender de um texto de tela que muda por motivo de interface.
- **Desvio 1 aceito: `gerarPedido(deps: DepsDemanda, ator: Ator, decId, t?)`.** Razão: segue o molde já aceito de
  T18 a T21. Com `Ator` e `autorizar` na primeira linha, a função também nega agente e `sistema` quando é chamada
  direto (C-12), e o `t?` é a G3.8.
- **Desvio 2 aceito: exportações a mais.** São `MENSAGENS_PEDIDO`, `MENSAGEM_PEDIDO_SEM_APROVACAO` e
  `DadoPessoalEncontrado`. Razão: o teste usa as três, e a T44 precisa das mensagens sem copiar texto.
- **Desvio 3 aceito: a segunda barreira de 409 em `montarPedido`.** Razão: a função pura não pode montar pedido de DEC
  sem decisão, e o tipo de `opcaoEscolhida` e `aprovadoEm` fica sem nulo. A conferência em `gerarPedido` continua sendo
  a primeira.
- **DEC aprovado que depois ficou desatualizado continua gerando o mesmo pedido.** Razão: o RF-22 monta o pedido com a
  ESP e o RSK citados, que foram o que se aprovou, e o desatualizado só impede aprovar (RF-12).
- **`proximo: qa-automacao`.** Razão: a revisão não tem bloqueio. A próxima etapa da cadeia é a `06-T22-testes`.

## Pendências

- **Para a 08 (ajudante único):** o Minor 1. É a terceira cópia de `preenchido`, a somar aos Minor 1 e 2 da
  `06-T21-revisao`.
- **Para a T44 (`engenheiro-frontend`):**
  - Usar `MENSAGENS_PEDIDO` em vez de redigir os textos (Minor 2).
  - O botão manda `POST` com `Content-Type: application/json` e corpo `{}`. Sem isso, quem tem cookie recebe 415.
  - O 422 de validação traz `erros`. A tela mostra a lista depois de "Erros:", como pede a T11 da 03.
- **Para a T24 ou a `08-revisao` (`seguranca-aplicacao`):** decidir se o detector de telefone passa a pegar número
  sem DDD (Minor 3).
- **Para a T36:** não trocar `ROTULO_DO_NIVEL` de `conteudo.ts` por importação de `rotulos.ts` (Minor 4 e Decisões).
- **Registro de conduta desta etapa:** rodei uma vez, por engano, `git -C … grep` para achar as linhas da T22 no plano.
  `git grep` não está na minha lista **Pode** nem no prompt do maestro. O comando só lê arquivos rastreados e não
  alterou nada. Ele está declarado abaixo, do jeito que rodou. O resto da revisão usou Read e os comandos permitidos.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 7434f549ba9891dc6f66cc17e1b628af14ed19e7` — 11 arquivos, 9 de código e teste, todos novos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 7434f549ba9891dc6f66cc17e1b628af14ed19e7 -- src` — o diff inteiro do código e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 6` — último commit 7434f54 (06-T22-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### T22\|### T23\|## Restrições globais\|### T21" -- docs/superpowers/plans/2026-10-25-ws-orquestrador-demandas-plano.md` — fora da lista Pode, rodado por engano (ver Pendências); só leitura
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "Médio" -- src test` — só o 7434f54
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "dataIsoSaoPaulo" -- src` — já existia desde a T01
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "PAPEIS_APROVACAO" -- src` — já existia desde a T05
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "baixo: 0" -- src` — só o 7434f54
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "descricaoDaDemanda" -- src` — T20
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 104 arquivos, 1978 de 1978
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "O pedido não passou na validação do /construir. Nada foi entregue." -- docs/construcao/DEC-DEM-20261022-0001-v1/03-ux-ui-design.md` — nenhum (na 03, o texto continua com " Erros:")
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "só é gerado de pacote aprovado" -- docs` — só o 7434f54 (Minor 2)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -S "Nada foi entregue" -- docs` — 03-interface e 05-plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 235b0e5 --format= -G "Nada foi entregue" -- docs/construcao/DEC-DEM-20261022-0001-v1/03-ux-ui-design.md` — a 03 inteira, lida depois por Read nas seções T07 a T11

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
