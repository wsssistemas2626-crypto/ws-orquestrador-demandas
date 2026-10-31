---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T43-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12 e o resto), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T41 a T46, rastreabilidade), 05-tech-lead.md (início), 06-T43-engenheiro-frontend.md, git show do intervalo 004f517..ff8c403 (ce47ec5, 06efb56, ff8c403), "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/{page.tsx,FormularioPacote.tsx,acoes.ts}", "src/app/(painel)/pacotes-decisao/[decId]/{page.tsx,FormularioDecisao.tsx,RevisaoDoPacote.tsx,acoes.ts,pacote-da-pagina.ts}", "src/app/(painel)/pareceres-risco/[rskId]/parecer-da-pagina.ts", src/components/{dados-do-pacote.ts,dados-da-decisao.ts,GrupoOpcoes.tsx,dados-do-pacote.test.ts (início),dados-da-decisao.test.ts (início)}, src/modules/{versoes.ts,limites.ts}, scripts/seed-ficticio.ts, playwright.config.ts, e2e/{apoio.ts,decisao.spec.ts,pacote-decisao.spec.ts}, resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bmdhe2itr.txt]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisei a T43 no intervalo `004f517..ff8c403`.
- O código e os testes entraram no ce47ec5.
- O 06efb56 e o ff8c403 mexem só no registro e na entrega. O ff8c403 tira 6 linhas da entrega, as do bloqueio que Fabiano
  liberou.

São 18 arquivos novos de código e teste, mais a entrega. Nenhum arquivo que já existia mudou: o diff tem 3.647 linhas
acrescentadas e nenhuma removida.

Não achei nada Critical nem Important. A tarefa passa para a `06-T43-testes`. Os quatro pontos abaixo são Minor e vão
para Pendências. Depois deles vem a resposta à pendência do C-36.

### Portões, rodados nesta revisão

- `pnpm test`: 184 arquivos e 3.575 testes, todos verdes.
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.
- `pnpm test:e2e` não está na minha lista **Pode**. Vale o que a entrega relata (90 testes, código 0), e a `06-T43-testes`
  confere.

### Checklist da seção 12 do padrão técnico

- [x] **A tarefa faz o que o plano pede.** As telas T09 e T11 estão feitas. A revisão de C-14 vem antes do formulário, e
  o diálogo repete o repositório destino e o nível. O "Aprovar" desatualizado tem `aria-disabled` e o motivo por
  `aria-describedby` (CA-12.4). P1-a, P1-b e o lembrete de P1-d estão feitos. A seção do Pedido de Construção ficou para
  a T44, como o plano manda.
  - Há três arquivos fora da lista do plano: `dados-do-pacote.ts`, `dados-da-decisao.ts` e `pacote-da-pagina.ts`. Seguem
    o molde aceito na T41 e na T42: a regra da tela fica fora do componente e é testada sem tela. Aceito.
  - O desvio 6, uma demanda por spec no e2e, também fica aceito. É consequência do C-36, tratado abaixo.
- [x] **Há teste para cada comportamento novo.** São 73 testes unitários e de integração e 9 e2e, todos escritos antes. A
  entrega mostra a falha de cada grupo.
  - Os testes da Server Action rodam com banco e Better Auth reais.
  - O `registrarComo` enviado é recusado, e P1-b dá 403.
  - Também são testados o 409 de desatualizado e o de já decidido, e o C-17 com ids de ESP, RSK e DEM.
  - As constantes copiadas para o navegador são comparadas com as do servidor: regex do DEC, níveis, limite e mensagens
    de `decidir.ts`.
- [x] **Nenhum segredo nem dado pessoal real.** Só aparecem as contas `@ficticio.test` do seed, "Pessoa Ficticia",
  `DOC-FICTICIO-0001` e `wsssistemas2626-crypto/sistema-ficticio`.
- [x] **Entrada externa validada com Zod, e erro sem detalhe.**
  - As duas Server Actions passam por `acaoDoPainel`, com o schema da API. Na T09 o schema ganha `demandaId` pela regex; na
    T11, `decId` pela regex de DEC e `decisao` pelo `registrarDecisaoSchema` inteiro.
  - A autoria vem só da sessão, e a resposta leva só os ids e o resultado.
  - As páginas começam por `exigirPessoaNaPagina` e `autorizar`, conferem a regex antes do banco e dão 404 fora do
    formato.
- [x] **Banco.** Nenhuma migration, e nenhuma era esperada.
- [x] **Nada duplica função existente.** Os textos, os erros da API e a validação seguem o molde de
  `dados-do-parecer.ts`. `GrupoOpcoes`, `DialogoConfirmacao`, `useConfirmarSaida` e `errosDoResultado` foram
  reaproveitados. A cópia de `RE_ID_DEC` usada no servidor está no item 3 das Pendências.
- [x] **Textos em pt-BR, e o axe sem violação.** O axe roda em 10 estados da T11 e em 5 da T09, cobrindo os estados que o
  plano pede: pendente, desatualizado, com erro e decidido. Os textos que faltam na 03 estão listados para a
  `ux-ui-design`.
- [x] **Minor vai para Pendências.** Os quatro pontos estão lá.
- [x] **`/code-review` e `/security-review` no PR.** Não se aplica à revisão por tarefa: ficam com a `08-revisao`.

### Pareceres (todos Minor, nenhum bloqueia)

1. **`src/components/dados-da-decisao.ts:443-446`: a segunda aprovação é achada pelo nome.**
   - Problema: `segundaAprovacao` procura a aprovação pelo nome em `decisao.decididaPor`, que é texto de exibição. Se
     duas contas tiverem o mesmo nome, a função usa a última da lista. Com o mesmo instante, a vista ordena pelo papel, e a
     chegada "completa" pode dizer o papel errado.
   - Razão: nome não identifica conta. Só o texto do alerta de chegada fica errado; o que foi gravado não muda.
   - Quando houver motivo para mexer na vista, ela deve expor o papel de quem fechou a decisão.
2. **`e2e/decisao.spec.ts:27-36` e `e2e/pacote-decisao.spec.ts:41-54`: os testes de cada spec dependem da ordem.**
   - Problema: os testes guardam a demanda numa variável do módulo. Em `decisao.spec.ts`, o teste "Arquivar" deixa a
     demanda Encerrada, e quem vier depois dele no mesmo processo cria pacote sobre demanda encerrada. Em
     `pacote-decisao.spec.ts`, o teste "sem RSK" só passa antes de o RSK ser gravado.
   - Razão: o RNF-15 e o G3.4 pedem teste que não dependa da ordem. Hoje funciona, porque o `playwright.config.ts` roda
     em série (`workers: 1`, `fullyParallel: false`, `retries: 0`) e cada teste também passa sozinho.
   - É Minor porque é o preço do limite do C-36. A saída está abaixo e deve desfazer a dependência quando houver folga.
3. **`src/app/(painel)/pacotes-decisao/[decId]/acoes.ts:9` e `.../pacote-da-pagina.ts:10`: o servidor importa a regex da
   cópia do navegador.**
   - Problema: os dois arquivos importam `RE_ID_DEC` de `components/dados-do-pacote.ts`. A fonte de verdade é
     `reIdVersao('DEC')`, em `src/lib/rota.ts`.
   - Razão: a dependência fica invertida, porque a regra de servidor passa a depender da cópia. O teste prende as duas, e a
     T42 fez igual com `RE_ID_RSK`, então não vale mexer só aqui.
   - Se um dia corrigir, corrija nas três telas de versão de uma vez.
4. **`src/components/dados-da-decisao.ts:37-39` e `:80-82`, `:100-102`: textos compostos pela tarefa.**
   - Problema: alguns textos não estão na 03 e foram compostos pela tarefa. São eles: o desatualizado pelo RSK, a opção
     fixada e a mensagem de "registrada" quando a administradora aprova primeiro, os rótulos da revisão de C-14 e as linhas
     do diálogo.
   - Razão: o G3.11 pede o texto da 03 por inteiro. A entrega listou todos para a `ux-ui-design` (Pendências, itens a a g),
     e eles seguem o estilo da 03.

### C-36 no e2e: como tratar e quem trata

**O problema.**
- O `conferirLimite` (`src/modules/limites.ts`) conta, pela autoria gravada, 30 demandas e 60 versões por conta na última
  hora.
- A suíte e2e roda num banco novo e leva menos de uma hora. Então tudo o que ela cria conta contra o mesmo limite.
- O seed já cria 5 demandas com a conta "cto" (`scripts/seed-ficticio.ts:176-187`). Sobram 25 para a suíte nessa conta, e a
  entrega relata que quase todas já estão em uso. A mesma suíte roda de novo na homologação (`construir.mjs homologar`),
  com o mesmo seed e o mesmo limite.

**O que fica proibido**, porque afrouxa o C-36 ou o esconde. Se aparecer na revisão das próximas tarefas, é Important e
volta para o engenheiro:
- limite configurável por variável de ambiente, `NODE_ENV`, `BASE_URL`, `SEED_FICTICIO` ou cabeçalho;
- desvio do `conferirLimite` para conta de teste;
- relógio adiantado no servidor do e2e;
- apagar demanda entre specs;
- esperar a janela de uma hora.

**Decisão: as próximas tarefas reaproveitam dados, sem mudar o plano.** Quem faz é o `engenheiro-frontend`, só em `e2e/`,
que é dele pelo G1. Vale para cada tarefa:
- **T44 (`e2e/pedido-construcao.spec.ts`)**: no máximo 1 demanda nova, de tipo `novo_projeto`, para a spec inteira.
  - Cada teste cria a própria ESP, o RSK e um DEC novo de nível `cto`, e aprova pela API. Cada DEC cita a ESP mais nova, e
    o caso de C-28 (ESP com e-mail fictício) é só uma versão nova da ESP nessa mesma demanda.
  - O caso Estudo usa a demanda de tipo `estudo` que o seed já cria, achada por `GET /api/demandas`. Não cria outra.
- **T45 (`e2e/agentes-teto.spec.ts`)**: nenhuma demanda. A tela é de configuração.
- **T46**:
  - em `seguranca.spec.ts`, os casos C-18 e C-19 dividem 1 demanda de tipo `estudo`, e o C-15 não precisa de demanda;
  - em `axe-todas.spec.ts`, nenhuma demanda nova: a spec usa as 5 demandas do seed e as versões de agente dele, só com
    `GET`. Os estados "com erro" vêm do envio de formulário vazio, que não grava nada.
  - Atenção: `axe-todas.spec.ts` roda antes de `decisao.spec.ts` (ordem alfabética, `workers: 1`). Ela não pode registrar
    decisão no DEC de rascunho do seed, que a `decisao.spec.ts` precisa pendente.
- **Em toda spec nova ou alterada**: o comentário do topo diz quantas demandas e quantas versões ela cria em cada conta,
  como a T43 já faz. A soma tem de caber nos dois limites, contando as 5 demandas do seed na "cto". O limite de versões
  também importa: só a `decisao.spec.ts` cria 8 versões na "cto".

**Conferência.** É do `qa-automacao`, na `06-T44-testes`, na `06-T45-testes` e na `06-T46-testes`.
- Ele roda o `pnpm test:e2e` inteiro, e não só as specs novas.
- Na entrega, registra quantas demandas e versões cada conta usou, somando os comentários das specs.
- 429 em qualquer spec é falha da tarefa, mesmo que a spec nova passe sozinha.

**Caminho de reserva**, se a T44 não couber mesmo reaproveitando dados:
- O `engenheiro-frontend` marca `devolvido` para a `05-plano`, com a conta de quantas demandas faltam.
- Eu escrevo uma tarefa nova do `engenheiro-backend`, antes da T44. O `scripts/` é dele e está fora da lista **Pode** do
  frontend. A tarefa cria no seed duas contas fictícias com 2FA, só para o e2e: uma de papel `cto` e uma de papel
  `administradora`, em `@ficticio.test`. A spec que mais cria demandas passa a entrar com elas pelo `entrarComo`.
- O controle de produção não muda. O seed só roda com `SEED_FICTICIO=1` num banco sem nenhuma conta e sem nenhuma
  demanda, então essas contas nunca existem ao lado de uma conta real. O limite continua de 30 e 60 por conta.
- Com essas contas, a dependência de ordem do item 2 dos pareceres também pode ser desfeita.

## Decisões tomadas

- **Status `pronto`.** Os quatro pareceres são Minor e não impedem a T43 de fazer o que o plano pede. Pela seção 12, só
  Critical e Important bloqueiam.
- **Aceito o desvio 6 (uma demanda por spec).** O e2e fica verde sem tocar no C-36. A dependência de ordem que ele traz
  está registrada e tem saída prevista.
- **O C-36 se resolve com dados reaproveitados, e não com mudança no sistema.** O limite é controle de produção, e a
  suíte cabe nele se T44 a T46 criarem no máximo 2 demandas novas, somadas.
- **Contas extras no seed só como reserva.** Elas pedem tarefa de backend e mudança do plano. Só vale pagar esse custo se
  o reaproveitamento não couber.
- **A conferência fica com o `qa-automacao`.** É ele quem roda a suíte inteira em cada `06-Tnn-testes`.

## Pendências

- **`engenheiro-frontend` (T44 a T46): seguir a seção "C-36 no e2e" desta entrega.** A conta de demandas e versões por
  conta vai no topo de cada spec. Se a T44 não couber, devolver para a `05-plano` com a conta do que falta.
- **`qa-automacao` (`06-T43-testes` e `06-T44-testes` a `06-T46-testes`): rodar o `pnpm test:e2e` inteiro e registrar o
  uso por conta.** 429 é falha da tarefa.
- **Minor 1 (`dados-da-decisao.ts:443-446`):** expor na vista o papel de quem fechou a decisão. Fica para quando a vista
  for alterada por outro motivo.
- **Minor 2 (estado de módulo nas specs da T43):** desfazer quando houver folga de demandas, pelo caminho de reserva ou se
  as specs passarem a ser arrumadas.
- **Minor 3 (`RE_ID_DEC` no servidor):** se for corrigir, corrigir junto com `RE_ID_RSK` e a regex da ESP, nas três telas
  de versão.
- **Minor 4 (textos fora da 03):** está com a `ux-ui-design`, pelos itens a a g da entrega da T43.
- **`07-qa-funcional`:** foco no alerta de resultado, o diálogo que prende o foco e o devolve, o grupo "Opção escolhida"
  que aparece sem mover o foco, e o "Aprovar" indisponível alcançável pelas setas. São os itens que o engenheiro listou
  pelo G2.
- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bmdhe2itr.txt`.
  - Li só o resumo final desse arquivo, que a minha própria execução gerou nesta etapa.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline 004f517..ff8c403` — ce47ec5, 06efb56, ff8c403
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 004f517..ff8c403` — 20 arquivos, 3.647 inserções, nenhuma remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat ce47ec5 06efb56 ff8c403` — código e testes no ce47ec5; os outros dois só no registro e na entrega
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 184 de 184 arquivos, 3.575 de 3.575 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
