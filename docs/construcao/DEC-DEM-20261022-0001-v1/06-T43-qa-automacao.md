---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T43-testes
agente: qa-automacao
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, tarefas.json, 2026-10-25-ws-orquestrador-demandas-plano.md (T43), 01-analista-requisitos.md (RF-01 a RF-26, RNF, fora do escopo), 06-T43-engenheiro-frontend.md, 06-T43-tech-lead.md, git diff --stat do intervalo 004f517..ff8c403, git show --stat ff8c403, "src/app/(painel)/demandas/[id]/pacotes-decisao/novo/{page.tsx,acoes.ts,pagina.test.ts,acoes.test.ts}", "src/app/(painel)/pacotes-decisao/[decId]/{page.tsx,FormularioDecisao.tsx,acoes.ts,pagina.test.ts,acoes.test.ts}", src/components/{dados-do-pacote.ts,dados-do-pacote.test.ts,dados-da-decisao.ts,dados-da-decisao.test.ts,formulario.ts,rotulos.ts}, src/modules/{limites.ts,pacotes-decisao/schemas.ts,pacotes-decisao/decidir.ts,demandas/schemas.ts (até a linha 80),especificacoes/servico.ts (até a linha 80),acesso/ator.ts}, scripts/seed-ficticio.ts (linhas 150 a 228), test/{sessao.ts,auth.ts}, playwright.config.ts, e2e/{apoio.ts,servidor.ts,decisao.spec.ts,pacote-decisao.spec.ts,parecer-risco.spec.ts,parecer-risco-qa.spec.ts,especificacao.spec.ts,especificacao-qa.spec.ts,detalhe-demanda.spec.ts,demanda-formularios-qa.spec.ts,editar-demanda.spec.ts,nova-demanda.spec.ts,fila.spec.ts,fila-qa.spec.ts,moldura.spec.ts,autenticacao-qa.spec.ts,entrar.spec.ts (até a linha 60),configurar-2fa.spec.ts (até a linha 69)}, passagens.jsonl (no git show ce47ec5), resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/b2taf2svy.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Testei a T43 no intervalo `004f517..ff8c403`. O código e os testes estão no ce47ec5; o ff8c403 só regrava a entrega do
engenheiro.

Resultado: o código cumpre os critérios da T43. Nenhum teste novo falhou contra o código, e nada volta para o
engenheiro.

### Portões

- `pnpm test`: 184 de 184 arquivos e 3.599 de 3.599 testes. Antes desta etapa eram 3.575; os 24 a mais são os desta
  etapa.
- `pnpm test:e2e`, a suíte inteira: código 0. Com `retries: 0`, isso quer dizer nenhuma falha e nenhum 429. São 90
  testes em 16 arquivos, pela lista da entrega do engenheiro. Não acrescentei e2e (ver Decisões).
- `pnpm lint`: limpo.
- `pnpm typecheck`: limpo.

### Critérios da T43 e os testes que os cobrem

Siglas dos arquivos:
- `pac.test` = `src/components/dados-do-pacote.test.ts`
- `dec.test` = `src/components/dados-da-decisao.test.ts`
- `novo/pagina` e `novo/acoes` = `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/{pagina,acoes}.test.ts`
- `decId/pagina` e `decId/acoes` = `src/app/(painel)/pacotes-decisao/[decId]/{pagina,acoes}.test.ts`
- `e2e/pacote` = `e2e/pacote-decisao.spec.ts`; `e2e/decisao` = `e2e/decisao.spec.ts`

O que está marcado com (qa) foi escrito nesta etapa.

- **RF-10 no painel**
  - CA-10.1, sem ESP e sem RSK:
    - `novo/acoes` › "CA-10.1 (qa-automacao): sem ESP e sem RSK, …" (qa);
    - `novo/pagina` › "sem nenhuma das duas: as duas no texto e os dois botões";
    - `pac.test` › "\"Ainda não dá para criar o pacote. Falta: …\" lista só o que falta…".
  - CA-10.2, sem RSK:
    - `e2e/pacote` › "sem RSK: …";
    - `novo/acoes` › "sem RSK: o servidor recusa com `faltando`…";
    - `novo/pagina` › "sem RSK: …".
  - CA-10.3, cita a ESP e o RSK mais novos:
    - `novo/acoes` › "CA-10.3 (qa-automacao): com ESP v1 e v2 e RSK v1, o pacote cita a ESP v2…" (qa);
    - `novo/pagina` › "com ESP e RSK: a informação das versões citadas…";
    - `e2e/pacote` › "gravar: …".
  - CA-10.4, a demanda vai a Pronta para decisão:
    - `e2e/pacote` › "gravar: …";
    - `novo/acoes` › "grava a v1 com a autoria da sessão…".
- **RF-12 (CA-12.4)**, aviso de desatualizado e "Aprovar" indisponível:
  - `e2e/decisao` › "CA-12.4: desatualizado: …";
  - `decId/pagina` › "desatualizado: selo, alerta com a versão mais nova e o link, e Aprovar indisponível…";
  - `dec.test` › "\"Aprovar\" desatualizado fica no grupo…";
  - `dec.test` › "desatualizado sem versão mais nova visível na demanda: …" (qa);
  - pelo servidor (CA-12.2 e CA-12.3): `decId/acoes` › "desatualizado: Aprovar dá 409…".
- **RF-13**
  - CA-13.1:
    - `e2e/decisao` › "nível cto: aprovar A → …";
    - `decId/acoes` › "nível cto: aprova a opção A pela conta cto…".
  - CA-13.2 e CA-13.3: `decId/acoes` › "CA-13.2 e CA-13.3: opção C ou aprovar sem opção dão 400…" (qa).
  - CA-13.4, rascunho de agente sem a confirmação de revisão:
    - `decId/acoes` › "CA-13.4: pacote que cita ESP de agente: …" (qa);
    - `e2e/decisao` › "C-14: … sem marcar a revisão, o erro";
    - `dec.test` › "nada marcado: …".
  - CA-13.5, autoria só da sessão:
    - `decId/acoes` › "CA-13.5 e C-11: nome, papel e conta mandados no corpo não chegam ao banco…" (qa);
    - `dec.test` › "devolver e arquivar: … nenhum campo de autoria (C-11)".
- **RF-14**
  - CA-14.1, só o CTO aprovou:
    - `decId/acoes` › "CA-14.1 e CA-14.4: …" (qa);
    - `e2e/decisao` › "dupla aprovação: …" (parcial).
  - CA-14.2:
    - `e2e/decisao` › "dupla aprovação: …";
    - `decId/acoes` › "dupla aprovação: CTO → parcial; administradora…".
  - CA-14.3, a administradora sem o documento:
    - `e2e/decisao` › "dupla aprovação: …" (erros de documento e de data);
    - `decId/acoes` › "dupla aprovação: …" (o caso sem documento).
  - CA-14.4, opção diferente:
    - `decId/acoes` › "CA-14.1 e CA-14.4: …" (qa);
    - `dec.test` › "o que a tela aceita, o schema da API aceita; … a opção fixada é a que vai (CA-14.4)" (qa).
- **C-14**, revisão antes de decidir e repetida no diálogo:
  - `e2e/decisao` › "C-14: revisão visível antes de decidir…";
  - `decId/pagina` › "C-14: a revisão antes de decidir vem antes do formulário…";
  - `dec.test` › "revisão antes de decidir: …";
  - `dec.test` › "resume a decisão e repete o repositório destino e o nível".
- **P1-a**
  - `e2e/decisao` › "dupla aprovação: …";
  - `decId/acoes` › "P1-a: a administradora aprova primeiro; o CTO fecha com a opção fixada na dela…" (qa);
  - `dec.test` › "segunda aprovação: a opção fica fixada…";
  - `dec.test` › "dupla aprovação com as duas registradas e sem decisão gravada: …" (qa).
- **P1-b**
  - `e2e/decisao` › "P1-b: …";
  - `decId/acoes` › "P1-b: a administradora não aprova DEC de nível cto (403)";
  - `decId/pagina` › "P1-b: …";
  - `dec.test` › "nível cto: a conta cto vê o formulário…".
- **P1-d**, o lembrete:
  - `e2e/decisao` › "nível cto: … o lembrete de status manual (P1-d)";
  - `decId/pagina` › "já decidido: … o lembrete (P1-d)";
  - `decId/pagina` › "P1-d (qa-automacao): o lembrete só aparece com o pacote aprovado; …" (qa).
- **RNF-11**: o axe roda em 10 estados em `e2e/decisao` e em 5 em `e2e/pacote`, todos verdes no `pnpm test:e2e`.

### Testes acrescentados (24, todos verdes)

- `src/components/dados-da-decisao.test.ts` (10):
  - "o que a tela aceita, o schema da API aceita; sem documento fora da conta da administradora; a opção fixada é a que
    vai (CA-14.4)". É uma malha de 1.728 combinações. Em cada uma que a tela aceita, a entrada passa no
    `registrarDecisaoSchema`, leva a revisão quando ela é exigida e não leva documento fora da conta da administradora,
    nem opção fora da aprovação, nem `registrarComo`. O teste também confere que a malha não ficou vazia;
  - "comentário no limite da RNF-04: …": 10.000 caracteres passam na tela e no schema, e 10.001 são recusados pelos dois;
  - "referência ao documento no limite: …": 200 caracteres passam, 201 são recusados, e só espaço conta como vazio;
  - "\"Opção A — …\": 80 letras…": a 81ª letra corta, e a contagem é por letra;
  - "decisaoSuja: …": mudar qualquer um dos seis campos pede confirmação ao sair;
  - "erros da API: o campo raiz \"decisao\" vai ao grupo de decisão, e o mesmo campo aparece uma vez só no resumo";
  - "chegada: \"criado\" some depois de qualquer decisão; …";
  - "desatualizado sem versão mais nova visível na demanda: …";
  - "aprovação da administradora sem documento ou com data fora do formato: \"Não informado\"…";
  - "dupla aprovação com as duas registradas e sem decisão gravada: …".
- `src/components/dados-do-pacote.test.ts` (4):
  - "cada campo de texto no limite da RNF-04: …", nos 10 campos de texto;
  - "o que a tela aceita, o schema da API aceita, com qualquer combinação de campos opcionais e de nível": 256
    combinações;
  - "pacoteSujo: só marcar o nível já é conteúdo a perder";
  - "400 com `faltando` só de itens desconhecidos: …".
- `src/app/(painel)/pacotes-decisao/[decId]/acoes.test.ts` (6, Testcontainers e Better Auth reais), no describe
  "registrarDecisaoNoPainel: a regra do servidor sem a ajuda da tela (qa-automacao)":
  - "CA-14.1 e CA-14.4: …";
  - "P1-a: …";
  - "CA-13.5 e C-11: …";
  - "CA-13.2 e CA-13.3: …";
  - "CA-13.4: …";
  - "DEC no formato certo que não existe: 404 (nao_encontrado), e não 400 nem erro interno".
- `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.test.ts` (2): "CA-10.1 (qa-automacao): …" e "CA-10.3
  (qa-automacao): …".
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` (2):
  - "P1-d (qa-automacao): o lembrete só aparece com o pacote aprovado; …";
  - "decidido (qa-automacao): pacote devolvido não mostra formulário nem a opção, e o selo diz o resultado".

### C-36: uso da suíte e2e por conta

Contei pela leitura de cada spec, porque só as specs da T43 trazem a conta no comentário do topo. Os números valem para
a ordem atual da suíte (alfabética, `workers: 1`). O limite é de 30 demandas e 60 versões por conta e por hora.

| Spec | "cto": demandas | "cto": versões | "administradora": demandas | "administradora": versões |
|---|---|---|---|---|
| seed (`scripts/seed-ficticio.ts`) | 5 | 0 (a ESP, o RSK e o DEC do seed são de agentes) | 0 | 0 |
| `decisao.spec.ts` | 1 | 7 (2 ESP, 1 RSK, 4 DEC) | 0 | 0 |
| `detalhe-demanda.spec.ts` | 2 | 7 | 7 | 6 |
| `editar-demanda.spec.ts` | 5 | 0 | 0 | 0 |
| `fila-qa.spec.ts` | 5 | 0 | 0 | 0 |
| `fila.spec.ts` | 5 (a paginação não cria: quando ela roda, o total já passa de 20) | 0 | 0 | 0 |
| `nova-demanda.spec.ts` | 3 | 0 | 0 | 0 |
| `parecer-risco-qa.spec.ts` | 4 | 9 | 0 | 0 |
| `demanda-formularios-qa.spec.ts` | 0 | 0 | 3 | 0 |
| `especificacao-qa.spec.ts` | 0 | 0 | 4 | 7 |
| `especificacao.spec.ts` | 0 | 0 | 9 | 10 |
| `pacote-decisao.spec.ts` | 0 | 0 | 1 | 3 |
| `parecer-risco.spec.ts` | 0 | 0 | 6 | 9 |
| `autenticacao-qa`, `configurar-2fa`, `entrar`, `moldura` | 0 | 0 | 0 | 0 |
| **Total** | **30 de 30** | **23 de 60** | **30 de 30** | **35 de 60** |

- As duas contas estão com o limite de demandas cheio: a 31ª demanda de qualquer uma delas dá 429.
- A revisão da T43 contou 8 versões da `decisao.spec.ts` na "cto". Pela minha leitura são 7. As duas contas cabem.

## Decisões tomadas

- **Nenhum e2e novo.** As duas contas fictícias estão em 30 de 30 demandas na suíte. Um e2e a mais que crie demanda
  daria 429, e sem dado novo ele só repetiria o que os e2e do engenheiro já cobrem. O que faltava foi para o nível de
  integração, que é mais barato e não conta contra o C-36 do e2e: a regra do servidor quando a Server Action é chamada
  sem a ajuda da tela (CA-13.2 a CA-13.5, CA-14.1, CA-14.4, P1-a com a administradora primeiro) e CA-10.1 e CA-10.3 no
  painel.
- **Contrato tela e servidor por malha completa, e não por exemplo.** A validação da tela é cópia da regra do
  servidor. O risco é ela aceitar o que o servidor recusa e a pessoa ver um erro genérico. Por isso a malha confere
  todas as combinações de campos que a tela aceita contra o schema real.
- **Os limites medidos com letra do plano básico, e o emoji só no sentido seguro.** A tela conta por unidade de UTF-16;
  o Zod conta o emoji como 1. Prendi só o que é igual nos dois lados e o sentido seguro: o que a tela aceita, o
  servidor aceita. A diferença está nas Pendências.
- **O caso de duas contas com o mesmo nome não ganhou teste.** É o Minor 1 da revisão, aceito e adiado pelo
  tech-lead. As duas contas dos testes de integração se chamam "Pessoa Ficticia". Por isso o P1-a com a administradora
  primeiro confere o que foi gravado, e não o texto de chegada.
- **Cada teste novo cria os próprios dados e não depende de ordem.** Os de integração ganham um dia novo de relógio
  fixo pelo `beforeEach` do arquivo, e voltam à conta "cto" a cada teste. Os de regra não usam relógio. Nenhum lê o
  relógio real.

## Pendências

- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/b2taf2svy.txt`.
  - Li só o resumo final desse arquivo, que a minha própria execução gerou nesta etapa.
  - O `pnpm test:e2e` foi para segundo plano depois de 180 s. O resultado dele (código 0) veio do aviso de fim da
    tarefa. Não li nada em `/tmp`.
- **tech-lead, antes da T44: o C-36 não tem mais folga no e2e.**
  - Pela tabela acima, as contas "cto" e "administradora" já estão em 30 de 30 demandas.
  - A decisão da revisão da T43 prevê 1 demanda nova na T44 (`pedido-construcao.spec.ts`) e 1 na T46
    (`seguranca.spec.ts`). Qualquer uma das duas dá 429 na suíte inteira.
  - Para caber sem mudar o plano, as duas specs teriam de criar zero demandas. A outra saída é o caminho de reserva já
    descrito na revisão: a tarefa de backend que põe no seed duas contas fictícias só para o e2e, antes da T44.
  - Vale também para a homologação (`construir.mjs homologar`), que roda a mesma suíte sobre o mesmo seed.
- **Minor, para o tech-lead: a contagem do limite na tela difere da do servidor fora do plano básico.**
  - Onde: `src/components/dados-da-decisao.ts:244` e `:247`, e `dados-do-pacote.ts:121`, que usam `.trim().length`.
  - O que acontece: o Zod (`textoLivre` e `LIMITE_REFERENCIA_DOCUMENTO`) conta o emoji como 1 caractere, e a tela conta
    como 2. A tela pode recusar, com "Este campo aceita até 10.000 caracteres.", um texto que o servidor aceitaria.
    Exemplo: 5.000 emojis e mais uma letra. O contrário não acontece, e nada passa sem a regra do servidor.
  - Correção sugerida: contar por letra (`[...s].length`). Deve ser feita em todas as telas de uma vez, porque as da
    T39 a T42 seguem o mesmo molde (não conferi).
  - O teste "comentário no limite da RNF-04" diz isso num comentário e prende só o sentido seguro.
- **Minor 2 da revisão continua aberto.** O estado de módulo da `decisao.spec.ts` e da `pacote-decisao.spec.ts` liga
  cada teste à ordem da spec. Não mexi: com o limite cheio, desfazer isso pede as contas do caminho de reserva.
- **`07-qa-funcional`:** o que não é automatizado aqui segue com eles:
  - o foco preso no diálogo e devolvido;
  - o "Aprovar" indisponível alcançável pelas setas e lido pelo leitor de tela;
  - o grupo "Opção escolhida" que aparece sem mover o foco, ouvido no leitor de tela.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 35dd8be (06-T43-revisao) no topo; ff8c403, 06efb56, ce47ec5 e 004f517 abaixo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 004f517 ff8c403` — 20 arquivos, 3.647 inserções, nenhuma remoção
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline --name-only -3 -- docs/superpowers` — caminho do plano
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e` — lista das 16 specs e de apoio.ts e servidor.ts
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3 -- src/modules/especificacoes/servico.ts src/modules/pacotes-decisao/consultas.ts` — b40faaf, 69b5630, f1cd287
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/components/rotulos.ts` — rótulos do selo de decisão
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pacote.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/demandas/[id]/pacotes-decisao/novo" "src/app/(painel)/pacotes-decisao"` — 96 de 97: a minha asserção de emoji no limite estava errada (o Zod conta o emoji como 1)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts` — 36 de 37, a mesma asserção, agora com o rótulo que mostrou o caso do emoji
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao.test.ts src/components/dados-do-pacote.test.ts` — 53 de 53
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 184 de 184 arquivos, 3.599 de 3.599 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (foi para segundo plano depois de 180 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — 5 arquivos de teste alterados, nenhum outro
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat` — 383 inserções e 1 remoção (a linha de import trocada)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff -U0 -- "src/app/(painel)/pacotes-decisao/[decId]/acoes.test.ts"` — a remoção é só o import `AtorPessoa` → `AtorAgente, AtorPessoa`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat ff8c403` — só a entrega e o registro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo, depois de renomear um teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/pacotes-decisao/[decId]/acoes.test.ts"` — 12 de 12, depois de renomear o teste
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show ce47ec5 -- docs/construcao/DEC-DEM-20261022-0001-v1/passagens.jsonl` — forma do registro de um bloqueio

## Critério de pronto atendido

- [x] cada critério de aceite da tarefa tem teste
- [x] a suíte inteira passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] os testes novos não dependem de ordem nem do relógio real
- [x] nenhum teste existente foi apagado, marcado com `.skip`, `.only` ou `.todo`, nem teve a asserção afrouxada (conferido com `git diff`)
- [x] teste, fixture e dado de teste não têm segredo, token, valor de `.env` nem dado pessoal real
