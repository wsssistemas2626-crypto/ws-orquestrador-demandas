---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T38-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G4, T38, T39 e T40), 06-T38-engenheiro-frontend.md, 06-T37-tech-lead.md (cabeçalho e veredito), 03-ux-ui-design.md (1 e T03), git show 5d91af1, src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/fila.tsx, src/app/(painel)/demandas/FiltrosFila.tsx, src/app/(painel)/demandas/EntradasAguardando.tsx, src/app/(painel)/demandas/fila.test.ts, e2e/fila.spec.ts, src/app/api/demandas/route.ts, src/modules/demandas/schemas.ts, src/modules/demandas/entradas-pendentes.ts, src/lib/log.ts, src/components/rotulos.ts, saída do pnpm test guardada pelo Bash na pasta da sessão]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Esta é a revisão da T38, a tela T03 Fila de demandas, no commit `5d91af1`. Os arquivos de código e de teste são 6: 1
alterado (`page.tsx`) e 5 criados (`fila.tsx`, `FiltrosFila.tsx`, `EntradasAguardando.tsx`, `fila.test.ts` e
`e2e/fila.spec.ts`). Os outros dois arquivos do commit são a entrega do engenheiro e o `passagens.jsonl`.

**Veredito: aprovado.** Status `pronto`, `proximo: qa-automacao` (etapa `06-T38-testes`). Não achei problema Critical
nem Important. Os 6 pareceres abaixo são Minor e ficam em Pendências.

Portões que rodei nesta revisão:
- `pnpm test`: 158 arquivos, 3098 de 3098;
- `pnpm lint`: limpo;
- `pnpm typecheck`: limpo;
- `git status`: árvore limpa.

O `pnpm test:e2e` não está na minha lista Pode, então vale o 27 de 27 que o engenheiro declarou. Li os 5 testes novos
do e2e e os 30 do `fila.test.ts`, e cada um confere o que o nome diz.

### O que conferi contra o plano, a 03 e os controles

- **Filtro da URL (RF-06):** a página passa a URL por `filtroDemandasSchema.safeParse`, o mesmo schema de
  `GET /api/demandas` (`fila.tsx:39-43`). Se o filtro for inválido, aparece o alerta da 03 e a lista vem sem filtro
  (`page.tsx:73`). Valor vazio vale como "Todos", e chave repetida é recusada. Há teste para os 5 casos inválidos e para
  o vazio (`fila.test.ts:59-74`).
- **Autorização (C-04):** a página começa por `exigirPessoaNaPagina('/demandas')` e chama
  `autorizar(pessoa, 'listar_demandas')`, a mesma ação da rota (`page.tsx:55-56`). As duas portas ficam iguais.
- **Nada da URL vai para a tela:** o alerta da T37 só aparece com o valor fixo `2fa-ativado` (`page.tsx:68`). Os filtros
  aparecem só pelos rótulos de `rotulos.ts`, depois do Zod (`fila.tsx:49-59`).
- **WCAG 3.2.2:** mudar a seleção não aplica o filtro. Ele só se aplica pelo botão "Filtrar", e sem script o formulário
  faz um `GET` comum (`FiltrosFila.tsx:139-152`). Há dois testes: um confere que o HTML não tem `onchange`
  (`fila.test.ts:229`), o outro que a URL só muda depois do clique (`e2e/fila.spec.ts:59-62`).
- **Tabela da 03:** tem `caption` focável, `th scope="col"` e a região com `tabindex="0"` e o rótulo "Tabela de
  demandas". Usa a `Tabela` da T36, sem cópia. Em 320 px, só a região da tabela rola (`e2e/fila.spec.ts:129-135`).
- **T-03:** a contagem "N demandas encontradas." usa o `total` da API, e "Próxima" usa o `total` para saber se é a
  última página (`fila.tsx:110`).
- **C-18:** o título aparece como texto, e o teste com `<img onerror>` confere o escape (`fila.test.ts:156-160`).
- **Dado de terceiro (T-01, D1, D2):** `listarEntradasPendentes` não seleciona texto, origem nem nome
  (`entradas-pendentes.ts:36-41`). O componente desestrutura só os quatro campos do resumo. O teste com
  `SENTINELA-*` confere que nada disso chega à tela (`fila.test.ts:263-267`).
- **Log (C-21):** as duas falhas de leitura vão ao `log` só com `evento`, `rota` e `erro`. O `erro` passa por
  `reduzirErro` (`log.ts:52-56`), e a tela não mostra nenhum detalhe.
- **Textos:** conferi cada um com a 03, T03 (linhas 313-341). São os mesmos, em pt-BR. O singular "1 demanda
  encontrada." é só a concordância do texto da 03.
- **Desvios 1 e 2 (os arquivos `fila.tsx` e `fila.test.ts`, que não estão na lista do plano):** aceitos.
  - O Next não deixa `page.tsx` exportar outra coisa além da página.
  - `filtroDemandasSchema` importa o esquema do banco e não pode entrar no arquivo de cliente.
  - O teste unitário a mais segue o precedente da T37.
- **Desvios 3, 4 e 5 (o vazio sem demanda, o CA-26.1 contado pela API e as entradas fora do e2e):** aceitos.
  - O seed e o banco compartilhado do e2e impedem o vazio total.
  - Ligar o agente orquestrador mudaria a configuração dos outros testes.
  - Os dois estados são conferidos no HTML do servidor.
  - O CA-26.1 continua provando o filtro: confere as duas demandas criadas, a ausência das outras três e o status em
    todas as linhas.

### Pareceres (todos Minor)

1. **`src/app/(painel)/demandas/EntradasAguardando.tsx:33`.**
   - Problema: o texto "Não informado" está escrito direto no componente, como texto solto. Em `rotulos.ts:122`, o mesmo
     valor é a constante `NAO_INFORMADO`, que não é exportada.
   - Razão: pela G3.11, o rótulo de enumeração vem só de `rotulos.ts`. Se o texto mudar, vai mudar em um lugar e ficar
     velho no outro.
   - Caminho: exportar a constante (ou criar `rotuloPapelSolicitante(v)`) e usá-la aqui, numa tarefa que já mexa em
     `rotulos.ts`. A T39 usa o mesmo "Não informado" no select do papel.
2. **`src/app/(painel)/demandas/fila.tsx:67-76` e `src/app/(painel)/demandas/FiltrosFila.tsx:139-147`.**
   - Problema: o endereço da fila é montado em dois lugares. `hrefDaFila` serve à paginação e à chave; o `aoEnviar`
     do formulário monta o seu próprio.
   - Razão: o cliente não pode importar `fila.tsx`, porque `fila.tsx` puxa o schema do banco. Por isso a duplicação
     tem causa. Mesmo assim, se a ordem ou o nome de um parâmetro mudar num lado e não no outro, a chave do `Suspense`
     e o foco pedido deixam de bater.
   - Caminho: levar `hrefDaFila` a um módulo que só importe tipos (por exemplo `src/app/(painel)/demandas/endereco.ts`),
     usado pelos dois arquivos.
3. **`src/app/(painel)/demandas/fila.tsx:128-141`.**
   - Problema: sem filtro nenhum, numa página além do fim (por exemplo `?offset=200` com 3 demandas), a tela diz
     "Nenhuma demanda com esses filtros." e oferece "Limpar filtros".
   - Razão: o texto fala de um filtro que não existe. A 03 não descreve esse estado, que só se alcança editando a URL.
   - Caminho: perguntar à ux-ui-design qual é o texto desse estado (cabe junto com as pendências (a) a (c) do
     engenheiro). Até lá, fica como está.
4. **`src/app/(painel)/demandas/fila.tsx:117`, `:131` e `:165`.**
   - Problema: nos vazios e no erro, a Região de aviso fica vazia (`texto=""`).
   - Razão: a 03 só manda anunciar a contagem quando há resultado. O foco vai ao texto do estado, e o leitor de tela o
     lê. Só falta conferir esse comportamento num leitor de verdade.
   - Caminho: entra na lista da `07-qa-funcional`, junto com o anúncio de "N demandas encontradas." que o engenheiro já
     listou.
5. **`src/app/(painel)/demandas/FiltrosFila.tsx` (o arquivo todo).**
   - Problema: o arquivo se chama `FiltrosFila`, mas exporta também `AvisoDaFila`, `ResultadoAnunciado`,
     `NavegacaoDaFila` e `BotaoTentarDeNovo`. É toda a parte de cliente da fila.
   - Razão: quem procurar o foco ou a Região de aviso não vai olhar num arquivo com nome de filtros.
   - Caminho: num ajuste futuro, renomear para `fila-cliente.tsx`, ou separar o foco e o aviso. Não bloqueia.
6. **`e2e/fila.spec.ts:55-56`.**
   - Problema: o teste exige `esperadas <= 20`.
   - Razão: numa homologação com mais de 20 demandas em "Aguardando informação", as duas criadas podem cair na página 2,
     e o teste quebra sem que haja defeito. No banco novo do e2e isso não acontece.
   - Caminho: quando a `09-entrega` rodar o `homologar`, se quebrar aqui, filtrar também por um tipo próprio do teste
     ou procurar as duas pelo id na página certa.

## Decisões tomadas

- Aprovo os 5 desvios declarados. Cada um tem causa técnica (restrição do Next, código de servidor fora do cliente,
  banco do e2e compartilhado) e cobertura equivalente no HTML do servidor.
- A lista de entradas aparece sempre que há alguma, como diz o plano, e não "só com o agente ligado", como diz a 03.
  Aceito: o plano é a fonte da construção, e uma entrada que falhou precisa continuar à mão depois de o agente ser
  desligado. A divergência vai à ux-ui-design como texto, sem bloquear.
- Os pareceres 1, 2 e 5 são Minor porque não mudam o comportamento nem a segurança. São manutenção, e a seção 12 só
  deixa Critical e Important bloquearem.
- Não reproduzi o `pnpm test:e2e`, que está fora da minha lista Pode. Li os testes e aceito o resultado declarado; a
  `06-T38-testes` pode rodá-lo.

## Pendências

- Minor 1 (`EntradasAguardando.tsx:33`, "Não informado" fora de `rotulos.ts`): resolver na T39, que mexe no mesmo
  rótulo.
- Minor 2 (endereço da fila montado em dois lugares): extrair `hrefDaFila` para um módulo só com tipos.
- Minor 3 (página além do fim sem filtro diz "com esses filtros"): vai à ux-ui-design, junto com as pendências (a) a
  (c) do engenheiro.
- Minor 4 (a Região de aviso fica vazia nos vazios e no erro): vai à `07-qa-funcional`, com leitor de tela.
- Minor 5 (nome de `FiltrosFila.tsx`): renomear ou separar num ajuste futuro.
- Minor 6 (`e2e/fila.spec.ts:55-56`, limite de 20 na homologação): a `09-entrega` olha esse ponto se o `homologar`
  quebrar aqui.
- Seguem as pendências do engenheiro: (a) a (c) para a ux-ui-design, o foco depois de "Voltar" e o anúncio para a 07,
  e o link `/demandas/nova?entrada=<id>`, que dá 404 até a T39.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 5d91af195f900086275277c2f31ff936bbac073d` — 8 arquivos, 6 de código e teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5d91af195f900086275277c2f31ff936bbac073d -- src e2e` — diff do código lido
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 5d91af195f900086275277c2f31ff936bbac073d -- "src/app/(painel)/demandas/page.tsx"` — diff da página
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 3098 de 3098, 158 arquivos

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
  - [x] a tarefa faz o que o plano pede; os dois arquivos fora da lista são os desvios 1 e 2, aceitos com razão
  - [x] há teste para cada comportamento novo, e ele falharia sem o código (falha registrada pelo engenheiro: módulo ausente no unitário, 3 de 3 no e2e)
  - [x] nenhum segredo, valor de `.env` ou dado pessoal real; só "Pessoa Ficticia", "(fictício)" e `SENTINELA-*`
  - [x] entrada externa (a URL) validada com Zod, e o erro sem detalhe na tela nem no log
  - [x] banco: não se aplica (sem migration nem tabela nova)
  - [x] nada duplica função que já existe; a duplicação de texto e de endereço é Minor (pareceres 1 e 2)
  - [x] textos em pt-BR, os da 03, e o axe sem violação nas telas tocadas (5 verificações no e2e)
  - [x] o que é Minor está em Pendências; nenhum Critical nem Important
  - [x] o item do PR (`/code-review` e `/security-review`) é da `08-revisao`, pela G2 do plano
