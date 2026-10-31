---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T44-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T43 e T44), 03-ux-ui-design.md (T11, linhas 732 a 858), 06-T44-engenheiro-frontend.md, 06-T43-tech-lead.md, 06-T43-qa-automacao.md, git show 70da315, src/lib/{acao-painel,rota (até a linha 70)}.ts, src/modules/pedido-construcao/gerar.ts, src/modules/limites.ts, src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts, src/components/{BlocoJson,Botao,Alerta,RegiaoAviso}.tsx, src/components/formulario.ts, scripts/seed-ficticio.ts (linhas 100 a 228), resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bh3kil19l.txt]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisei a T44 no commit `70da315`. Ele traz 6 arquivos novos e 2 alterados de código e teste, mais a entrega e o
registro. O diff tem 1.001 linhas acrescentadas e 1 removida: a linha do comentário do topo de `page.tsx`.

Não achei nada Critical nem Important. A tarefa passa para a `06-T44-testes`. Os quatro pontos abaixo são Minor e vão
para Pendências. Depois deles vem a conferência do C-36.

### Portões, rodados nesta revisão

- `pnpm test`: 186 arquivos e 3.619 testes, todos verdes. As linhas de log de `gerar_pedido_construcao` levam só a ação,
  o tempo, o tipo de ator e o código de erro (C-21).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `pnpm test:e2e` não está na minha lista **Pode**. Vale o que a entrega relata (94 testes, código 0, nenhum 429), e a
  `06-T44-testes` confere a suíte inteira.

### Checklist da seção 12 do padrão técnico

- [x] **A tarefa faz o que o plano pede.** O plano pede a seção do Pedido de Construção na T11, e ela está feita:
  - a seção só aparece com a decisão aprovada completa, pelo `demandaTipo` copiado no pacote, o mesmo critério de
    `gerarPedido`;
  - antes do botão vêm o texto da 03 e o aviso de C-28;
  - "Gerar" chama a Server Action (POST), e o e2e confere que nenhum GET pede o pedido (C-16);
  - "Baixar" é um link com `download` e `data:application/json;charset=utf-8,`;
  - "Copiar JSON" usa a área de transferência;
  - o `BlocoJson` mostra o texto exato devolvido;
  - o 422 mostra a lista (campo e tipo, sem valor) e a orientação;
  - o Estudo mostra só a frase, sem botão.

  Os textos conferem com a 03 (T11, linhas 825 a 847). A Server Action é `acaoDoPainel` com a ação, o schema
  (`paramId.versao('decId', 'DEC')`) e a função da rota da API, e não duplica regra.

  Há três arquivos fora da lista do plano: `dados-do-pedido.ts`, o teste dele e `acoes-pedido.test.ts`. A
  `pagina.test.ts` também mudou. É o molde aceito na T41 a T43, em que a regra da tela fica fora do componente e é
  testada sem tela, e nenhum teste existente mudou. Aceito.
- [x] **Há teste para cada comportamento novo.** São 20 testes unitários e de integração e 4 e2e, todos escritos antes.
  A entrega mostra a falha das duas camadas antes do código.
  - A Server Action roda com banco e Better Auth reais. Os testes cobrem:
    - o resultado igual a `gerarPedido` byte a byte, e de novo igual no dia seguinte (CA-22.2);
    - 409 com o pacote pendente;
    - 422 do Estudo;
    - 422 de C-28, sem o valor em parte nenhuma do resultado;
    - C-17 com ids de outra versão e com aspa;
    - 404 e 401.
  - O e2e compara o arquivo baixado com o POST da API e com o texto do bloco.
  - As mensagens copiadas para o navegador são comparadas com `MENSAGENS_PEDIDO` de `gerar.ts`.
- [x] **Nenhum segredo nem dado pessoal real.** Só aparecem `pessoa.ficticia@cliente.test`, "Pessoa Ficticia",
  `sistema-ficticio` e as duas demandas fictícias do seed.
- [x] **Entrada externa validada com Zod, e erro sem detalhe.**
  - O `decId` passa pela regex de DEC de `src/lib/rota.ts` antes do banco, e não pela cópia do navegador. Assim não se
    repete o Minor 3 da T43.
  - A autorização é a mesma da rota.
  - O erro interno mostra sempre o texto da 2.8, e há teste com sentinela.
  - O resultado leva só `nomeArquivo` e `json`.
- [x] **Banco.** Nenhuma migration, e nenhuma era esperada.
- [x] **Nada duplica função existente.**
  - `acaoDoPainel`, `gerarPedido`, `BlocoJson`, `RegiaoAviso`, `Alerta`, `Botao`/`classeDoBotao` e `errosDoResultado`
    foram reaproveitados.
  - A cópia de duas mensagens do servidor existe porque `gerar.ts` não vai ao navegador, e o teste prende a cópia.
- [x] **Textos em pt-BR, e o axe sem violação.**
  - O axe roda em quatro estados: aprovado antes de gerar, gerado, com erro 422 e Estudo. Cobre os três que o plano
    pede e mais um.
  - O único texto fora da 03 é o aviso de C-28, que vem do plano e da 04.
- [x] **Minor vai para Pendências.** Os quatro pontos estão lá.
- [x] **`/code-review` e `/security-review` no PR.** Não se aplica à revisão por tarefa: ficam com a `08-revisao`.

### Pareceres (todos Minor, nenhum bloqueia)

1. **`src/components/dados-do-pedido.ts:45` e `src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx:102`: o pedido
   inteiro vai num `data:` URL.**
   - Problema: o `encodeURIComponent` triplica cada byte fora do ASCII. Um pedido com ESP e RSK perto dos limites da
     RNF-04 e da leitura de corpo (512 KB) pode passar dos cerca de 2 MB de URL que o Chromium aceita. Nesse caso
     "Baixar" falha sem aviso, e "Copiar" e o bloco continuam funcionando.
   - Razão: o plano manda o `data:` URL, e os pedidos reais ficam muito abaixo disso. Por isso é Minor.
   - O que fazer: a `07-qa-funcional` tenta o "Baixar" com uma ESP grande e acentuada. Se falhar, a troca é por
     `URL.createObjectURL(new Blob([json], { type: 'application/json' }))`, com o `revokeObjectURL` quando o pedido
     mudar. Essa troca muda o plano e passa pelo tech-lead.
2. **`src/components/dados-do-pedido.ts:52-53`: o tipo do 422 é reconhecido pelo texto da mensagem.**
   - Problema: `erroDoPedido` separa o 422 do Estudo do 422 da validação comparando `mensagem` com a cópia das frases de
     `gerar.ts`.
   - Razão: se a frase do servidor mudar, a tela cai no alerta genérico. O teste `dados-do-pedido.test.ts` pega essa
     mudança, e por isso é Minor.
   - O que fazer: se um dia o `ErroDominio` ganhar um código próprio para cada 422, a tela deve passar a usar o código.
3. **`src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx:65`: a segunda cópia seguida pode não ser anunciada.**
   - Problema: copiar duas vezes grava o mesmo texto na região `role="status"`. O texto não muda, e o leitor de tela
     pode ficar calado. O engenheiro já tinha registrado esse ponto.
   - Razão: a 03 pede o anúncio de "JSON copiado…" a cada cópia.
   - O que fazer: a `07-qa-funcional` confirma com o leitor de tela. Se confirmar, limpar o aviso antes de gravar o novo.
4. **`src/components/dados-do-pedido.ts:21-23`: o aviso de C-28 não está na 03.**
   - Problema: o texto "O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail ou telefone de
     cliente na ESP nem no parecer de risco." vem do plano (T44) e da 04, e não da 03.
   - Razão: o G3.11 pede o texto da 03 por inteiro. A entrega listou o texto para a `ux-ui-design`, no mesmo caminho do
     Minor 4 da T43.

### C-36: conferência da regra da `06-T43-revisao`

A regra era: no máximo 1 demanda nova na T44 e 2 nas T44 a T46 somadas, sem afrouxar o controle.

- **A T44 criou 0 demandas novas.** Ela ficou abaixo do teto de 1, e essa decisão estava certa. A tabela da
  `06-T43-testes` mostrou as duas contas em 30 de 30 demandas, e a 31ª daria 429.
- **A spec usa duas demandas do seed**, achadas por `GET /api/demandas?tipo=…` e pelo título:
  - "Portal de acompanhamento de pedidos (fictício)", de tipo `novo_projeto`;
  - "Estudo de atendimento com IA e revisão humana (fictício)", de tipo `estudo`.

  Conferi os dois títulos e os tipos em `scripts/seed-ficticio.ts:108-121`. O DEC de rascunho do seed, que a
  `decisao.spec.ts` precisa pendente, está na primeira demanda (`:181-184`). A spec nova não toca nele.
- **Versões:** a conta "cto" ganha 12 versões (4 testes, cada um com ESP, RSK e DEC). Conferi pela leitura da spec, e o
  comentário do topo diz o mesmo.
  - A decisão registrada e o pedido gerado não contam no limite: `conferirLimite` só conta demanda, ESP, RSK e DEC
    (`src/modules/limites.ts:51`).
  - A conta "administradora" não ganha nada.
- **Totais depois da T44:**

  | Conta | Demandas | Versões |
  |---|---|---|
  | "cto" | 30 de 30 | 35 de 60 |
  | "administradora" | 30 de 30 | 35 de 60 |

- **Nenhum controle foi tocado.** O commit não mexe em `limites.ts`, no seed, no `playwright.config.ts`, em variável de
  ambiente nem no relógio do servidor. Nenhum dos caminhos proibidos aparece.
- **Ordem e independência:** cada teste cria a própria ESP, o RSK e o DEC, e o DEC cita os mais novos. Nenhum teste
  depende do outro, e o Minor 2 da T43 não se repete aqui.

**A regra passa a valer assim para a T45 e a T46.** Ela substitui a da `06-T43-revisao`, que permitia 1 demanda na T46.
Com as duas contas em 30 de 30, nem essa demanda cabe.

- **T45 (`e2e/agentes-teto.spec.ts`)**: nenhuma demanda e nenhuma versão. Isso não muda.
- **T46 (`e2e/seguranca.spec.ts`)**: nenhuma demanda nova.
  - Os casos C-18 e C-19 usam a demanda de tipo `estudo` do seed, achada do mesmo jeito que nesta spec, e cada caso cria
    só a própria ESP.
  - A `seguranca.spec.ts` roda depois da `pedido-construcao.spec.ts`, pela ordem alfabética. A demanda de Estudo já terá
    um DEC aprovado, e a spec não pode supor que ela esteja sem pacote.
  - Sobram 25 versões em cada conta.
- **T46 (`e2e/axe-todas.spec.ts`)**: nenhuma demanda, só `GET`, como já estava.
- Se a T46 não couber sem demanda nova, o engenheiro marca `devolvido` para a `05-plano`. Aí vale o caminho de reserva
  da `06-T43-revisao`: uma tarefa de backend que põe no seed contas fictícias só para o e2e.

## Decisões tomadas

- **Status `pronto`.** Os quatro pareceres são Minor e não impedem a T44 de fazer o que o plano pede. Pela seção 12, só
  Critical e Important bloqueiam.
- **Aceito o uso das demandas do seed no lugar da demanda nova.** Fica abaixo do teto da regra, não toca no C-36 e ainda
  deixa os testes independentes.
- **A T46 passa a ter teto de 0 demandas novas.** As duas contas estão cheias, e 1 demanda a mais daria 429 na suíte
  inteira e na homologação.
- **O `data:` URL fica.** O plano o manda, e o risco só aparece com pedidos muito maiores que os reais. A troca por Blob
  depende da `07-qa-funcional`.

## Pendências

- **`engenheiro-frontend` (T45 e T46): seguir a regra nova da seção "C-36" desta entrega.** O teto é de 0 demandas
  novas. A conta de demandas e versões por conta vai no topo de cada spec. Se a T46 não couber, devolver para a
  `05-plano` com a conta do que falta.
- **`qa-automacao` (`06-T44-testes`): rodar o `pnpm test:e2e` inteiro e registrar o uso por conta.** O total esperado
  depois da T44 é de 30 de 30 demandas e 35 de 60 versões em cada conta. 429 é falha da tarefa.
- **Minor 1 (`data:` URL):** a `07-qa-funcional` tenta o "Baixar" com uma ESP grande e acentuada. Se falhar, volta ao
  tech-lead para a troca por Blob.
- **Minor 2 (422 pelo texto):** trocar pelo código do erro quando o `ErroDominio` tiver um código próprio para cada 422.
- **Minor 3 (cópia repetida):** a `07-qa-funcional` confirma com o leitor de tela se a segunda cópia é anunciada.
- **Minor 4 (aviso de C-28 fora da 03):** está com a `ux-ui-design`, junto com os textos da T43.
- **`07-qa-funcional`:** confirmar os itens que o engenheiro listou pelo G2:
  - o foco volta ao botão depois de gerar e vai ao alerta no erro;
  - "Gerando o pedido…" é anunciado;
  - o bloco rola pelo teclado;
  - a região de aviso anuncia gerado, copiado e "não foi possível copiar".
- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bh3kil19l.txt`.
  - Li só o resumo final desse arquivo, que a minha própria execução gerou nesta etapa.
  - Também li a saída do `git show` do commit, que a ferramenta gravou na mesma pasta.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 70da31535b7f136640491f88d733f966bf167b32` — 10 arquivos, 1.001 inserções e 1 remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 70da31535b7f136640491f88d733f966bf167b32 -- src e2e` — diff do código e dos testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 70da315 (06-T44-construcao) no topo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e` — 17 specs; `pedido-construcao.spec.ts` é a última na ordem alfabética
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 186 de 186 arquivos, 3.619 de 3.619 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
