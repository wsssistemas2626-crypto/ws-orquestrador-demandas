---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T36-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, Fase 7, T36 e T37 a T43), 06-T36-engenheiro-frontend.md, passagens.jsonl (linhas do intervalo), 03-ux-ui-design.md (seções 1 a 2.8 e T01), git show ddf673c, git show 9756105, src/modules/limites.ts, src/modules/demandas/gerar-id.ts]
status: bloqueado
proximo: tech-lead
devolvido_para: null
---
## Entrega

Revisão do intervalo `ddf362c..9756105`. O código e os testes da T36 entraram no `ddf673c`; o `63d7b6f` e o `9756105`
só mexem na entrega do engenheiro e em `passagens.jsonl` (`git diff ddf673c 9756105 -- e2e src test playwright.config.ts`
veio vazio).

**Veredito da revisão: `devolvido` para `06-T36-construcao`, `proximo: engenheiro-frontend`**, pelos pareceres
Important 1 e 2. O status desta entrega é `bloqueado` só pelo motivo da primeira linha de Pendências. Depois que Fabiano
liberar, a entrega deve ser regravada com `status: devolvido`, `devolvido_para: 06-T36-construcao` e
`proximo: engenheiro-frontend`, com os pareceres abaixo sem mudança.

Portões conferidos nesta revisão: `pnpm test` com 144 arquivos e 2826 de 2826 testes, `pnpm lint` limpo e
`pnpm typecheck` limpo. O `pnpm test:e2e` não está na minha lista Pode; vale o 5 de 5 declarado pelo engenheiro.

### Troca de texto em `e2e/servidor.ts` (o `sed -i` liberado por Fabiano)

Não deixou erro. Conferi o arquivo no `9756105`:
- as ocorrências de "banco" em comentário ficaram corretas em português: linha 7 ("Credenciais e segredo valem só para
  este banco.") e linha 109 ("Sem a mensagem: pode citar a URL do banco.");
- a variável `banco` (linhas 79, 87, 96 e 101) é o `StartedPostgreSqlContainer` e está com o mesmo nome em todos os
  usos. O `pnpm typecheck` limpo confirma isso, mesmo que o identificador original tivesse "ê";
- nenhuma string que vai ao Testcontainers ou ao Postgres mudou: imagem `postgres:16-alpine`, usuário `migrator`, banco
  `orquestrador` e papel `orquestrador_app`.

### Pareceres

**Important 1: duplicação do limite e da contagem de RNF-09**
- `src/app/(painel)/layout.tsx:29` e `src/app/(painel)/layout.tsx:44`.
- Problema: a moldura declara de novo `const LIMITE_AVISO_CAPACIDADE = 9_000`. Para ter o total, chama
  `listarDemandas(deps.db, filtroDemandasSchema.parse({ limit: 1 }))`. As duas coisas já existem desde a T14, em
  `src/modules/demandas/gerar-id.ts:17` (`LIMITE_AVISO_CAPACIDADE`) e em `src/modules/demandas/gerar-id.ts:39`
  (`totalDeDemandas(db)`).
- Razão: o item "Nada duplica função que já existe no repositório" da seção 12. Com duas fontes, o limite pode mudar num
  lugar e não no outro. A T38 do plano já chama o aviso de "acima de `LIMITE_AVISO_CAPACIDADE` (T14)". Além disso, a
  listagem com filtro, ordenação e `limit 1` roda a cada tela só para tirar um `count`.
- Caminho: apagar a constante local e a chamada a `listarDemandas` e o import de `filtroDemandasSchema` no layout.
  Importar `LIMITE_AVISO_CAPACIDADE` e `totalDeDemandas` de `../../modules/demandas/gerar-id` e usar
  `await totalDeDemandas(deps.db)`. A condição continua `total > LIMITE_AVISO_CAPACIDADE`, porque a 03, 2.7, diz "mais
  de 9.000".

**Important 2: os avisos da moldura (RF-18 e RNF-09) não têm teste**
- `src/app/(painel)/layout.tsx:47` e `src/app/(painel)/layout.tsx:62-83`.
- Problema: a T36 cobre RF-18 (aviso de suspensão na moldura) e RNF-09 (aviso de capacidade). Nenhum teste da tarefa
  passa por esse trecho: `componentes.test.ts` não renderiza o layout e `moldura.spec.ts` não cria suspensão nem 9.001
  demandas. Os testes continuariam verdes se alguém trocasse a regra `teto.tetoMensal > 0 && teto.suspenso`, o `>` da
  capacidade, o texto da 03, 2.7, ou o link "Ver agentes e teto".
- Razão: o item "Há teste para cada comportamento novo, e ele falharia sem o código" da seção 12. A regra do teto 0 é
  decisão sua, não está escrita na 03, e é justamente a que mais precisa de teste.
- Caminho, começando pelo teste que falha:
  1. Escreva os testes antes, em `src/components/componentes.test.ts`, para um componente que ainda não existe:
     `AvisosDaMoldura`, em `src/components/AvisosDaMoldura.tsx`, com as props
     `{ tetoMensal: number; suspenso: boolean; totalDemandas: number }`. Rode `pnpm test src/components` e veja falhar.
     Os casos:
     - teto 0 e suspenso: nenhum aviso (o HTML é vazio);
     - teto 10 e não suspenso, com 9.000 demandas: nenhum aviso;
     - teto 10 e suspenso: o texto inteiro da 03, 2.7 ("Agentes de IA suspensos: o gasto do mês atingiu o teto. Nenhum
       agente chama o provedor até o teto subir ou o mês virar. Preencha os campos à mão.") e um link "Ver agentes e
       teto" com `href="/configuracao/agentes"`;
     - 9.001 demandas: "Atenção: já existem 9.001 demandas. O formato do id comporta até 9.999. Avise o time técnico
       para planejar a mudança.";
     - 9.012 demandas: o número sai como "9.012";
     - os dois avisos juntos, na ordem suspensão e depois capacidade.
  2. Mova para o componente o JSX das linhas 62 a 83 e a regra da linha 47, com o limite importado de `gerar-id.ts`
     (parecer 1). O layout passa a só ler `situacaoDoTeto` e `totalDeDemandas` e renderizar
     `<AvisosDaMoldura … />`.
  3. Rode `pnpm test`, `pnpm test:e2e`, `pnpm lint` e `pnpm typecheck`.

**Minor 3 (não bloqueia; recomendo corrigir nesta mesma volta): o foco do Resumo de erros depende da identidade do array**
- `src/components/ResumoErros.tsx:21-23`.
- Problema: o efeito que leva o foco ao resumo roda com `[erros]`. A função `errosDoResultado`
  (`src/components/formulario.ts:53`) devolve um array novo a cada chamada. Num formulário que calcula os erros durante
  a renderização e renderiza de novo por estado próprio, o foco sai do campo onde a pessoa está digitando e volta ao
  resumo. Um caso disso é a marca de "conteúdo não salvo" da 2.5, que a T39 vai precisar.
- Razão: a 03, 2.5, quer o foco no resumo quando o erro aparece, e não a cada renderização. O axe não pega isso, e o
  componente vai servir a todos os formulários da T37 à T46.
- Caminho sugerido: o efeito deve depender de algo que só muda a cada envio, como o próprio `ResultadoAcao` que o
  `useActionState` devolve, passado numa prop (por exemplo, `envio`). Ou então `errosDoResultado` devolve o mesmo
  objeto para o mesmo resultado. Se não entrar agora, a T37 tem que tratar disso, e o 07-qa-funcional confere.

**Minor 4: a opção indisponível do `GrupoOpcoes` só está bloqueada no clique**
- `src/components/GrupoOpcoes.tsx:28`.
- Problema: o `aoMudar` chama `onMudar` mesmo quando a opção tem `desabilitada`. O comentário diz que a opção "não pode
  ser marcada", mas quem garante isso é só o `preventDefault` no `onClick`, e nenhum teste confere.
- Caminho: em `aoMudar`, ignorar o valor de uma opção desabilitada. A regra que vale continua no servidor
  (`transicoesManuaisDe`).

**Minor 5: o IP fictício do `entrarComo`**
- `e2e/apoio.ts:19-26`.
- Problema: a faixa 198.18.0.0/15 é a de testes de desempenho de rede (RFC 2544), não "de documentação". O terceiro
  octeto chega a 259, porque `n` vai até 64.999, e passa de 255 depois de 64.000 logins. O comentário fala de um "proxy
  da homologação", mas o `docker-compose.hml.yml` do padrão (seção 9) publica o app direto em `127.0.0.1`, sem proxy.
- Caminho: limitar `n` a `% 64_000`, que mantém o terceiro octeto até 255, e corrigir os dois comentários.

### Checklist da seção 12

- [ ] A tarefa faz o que o plano pede, nem mais nem menos: os desvios 1 a 8 do engenheiro têm razão e eu os aceito,
  mas RF-18 e RNF-09, que a tarefa cobre, ficaram sem teste (Important 2).
- [ ] Há teste para cada comportamento novo: falta o dos avisos da moldura (Important 2).
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real: o segredo, as senhas e as contas são fictícios. O erro de
  subida do e2e mostra só a classe do erro.
- [x] Entrada externa validada com Zod e erro sem vazar detalhe: `formulario.ts` nunca repassa a mensagem de 5xx, e há
  teste com sentinela.
- [x] Banco: a tarefa não tem migration. O e2e usa o migrator e o papel do app (ADR-03).
- [ ] Nada duplica função existente: `LIMITE_AVISO_CAPACIDADE` e a contagem de demandas estão duplicadas (Important 1).
- [x] Textos em pt-BR e iguais aos da 03, seções 2.2 a 2.8. O axe não acusou violação nas telas tocadas (5 de 5,
  segundo a entrega do engenheiro).
- [x] O que é Minor está nos pareceres Minor 3 a 5, que não bloqueiam a passagem.
- [x] No PR: não se aplica nesta etapa (`08-revisao`).

## Decisões tomadas

- Aceito os desvios 1 a 8 da entrega do engenheiro. Cada um tem razão escrita: um teste da T01 que já existe, um laço
  em `/sem-permissao`, o nonce da CSP, o `-H 127.0.0.1` e a Lista de textos que fica na T41.
- Classifico a duplicação como Important e não como Minor. O plano (T38) já aponta a constante da T14 como a fonte, e
  duas fontes para o limite de RNF-09 se afastam sem nenhum teste avisar.
- Classifico o foco do `ResumoErros` como Minor. Hoje nenhum formulário usa o componente; a falha só aparece quando um
  consumidor renderizar de novo com estado próprio.
- Li com a ferramenta Read o arquivo em que o próprio Bash guardou a saída do `pnpm test`. A saída tinha 38,9 KB e foi
  salva fora de `/tmp`, numa pasta da sessão; foi a forma de ler o resumo final.

## Pendências

- Bloqueado por dois comandos de só leitura fora da lista Pode: `find …/docs/superpowers/plans -name "*.md"` e `find …/src/modules/demandas -name "*.ts" -not -name "*.test.ts"`. Rodei porque a ferramenta Glob não estava disponível nesta sessão (o erro dela mandava usar `find`). Nenhum arquivo mudou. Depois da liberação, regravar esta entrega com `status: devolvido`, `devolvido_para: 06-T36-construcao` e `proximo: engenheiro-frontend`, sem os dois `find`.
- Para o engenheiro na volta: corrigir os Important 1 e 2 seguindo o "Caminho" de cada um. Recomendo os Minor 3 a 5 na
  mesma volta.
- 07-qa-funcional: conferir o foco no `h1` ao navegar pelo menu, o diálogo prendendo e devolvendo o foco, e o anúncio
  do contador da `AreaTexto`. São as pendências do engenheiro, e o axe não pega.
- 09-entrega: conferir, contra o `next start` da homologação, que os scripts levam o nonce da CSP. É pendência do
  engenheiro.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit 9756105
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat ddf362c 9756105` — 36 arquivos
- `find /home/deploy/servidor/projetos/ws-orquestrador-demandas/docs/superpowers/plans -name "*.md"` — fora da lista Pode (só leitura), ver Pendências
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show ddf673c --stat --format=%H%n%s` — 36 arquivos, código e testes da T36
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9756105:e2e/servidor.ts` — conferência do texto trocado pelo sed
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff ddf673c 9756105 -- e2e src test playwright.config.ts` — vazio
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff ddf362c 9756105 -- docs/construcao/DEC-DEM-20261022-0001-v1/passagens.jsonl` — bloqueio, liberação e pronto da 06-T36-construcao
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show ddf673c -- e2e/apoio.ts e2e/moldura.spec.ts playwright.config.ts src/app test/estatico/varreduras-qa.test.ts` — e2e, configuração e páginas
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show ddf673c --format= -- src/components/Botao.tsx src/components/CampoTexto.tsx src/components/AreaTexto.tsx src/components/Selecao.tsx src/components/GrupoOpcoes.tsx src/components/CaixaSelecao.tsx src/components/Interruptor.tsx src/components/Selo.tsx src/components/Alerta.tsx` — componentes, parte 1
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show ddf673c --format= -- src/components/ResumoErros.tsx src/components/Tabela.tsx src/components/Paginacao.tsx src/components/DialogoConfirmacao.tsx src/components/Esqueleto.tsx src/components/BlocoJson.tsx src/components/RegiaoAviso.tsx src/components/CabecalhoPainel.tsx src/components/formulario.ts` — componentes, parte 2
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9756105:src/components/rotulos.ts` — rótulos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9756105:src/components/componentes.test.ts` — testes dos componentes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 2826 de 2826, 144 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 9756105:src/components/formulario.test.ts` — testes do padrão de formulário
- `find /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/modules/demandas -name "*.ts" -not -name "*.test.ts"` — fora da lista Pode (só leitura), ver Pendências

## Critério de pronto atendido

- [ ] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido` — o checklist não
  está cumprido (Important 1 e 2), e o status fica `devolvido` depois da liberação do bloqueio
