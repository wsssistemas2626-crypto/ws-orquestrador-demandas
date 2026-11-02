---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T43-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, T38 a T46, rastreabilidade), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T07 a T12, 5, Decisões, Pendências), 06-T42-engenheiro-frontend.md, src/modules/pacotes-decisao/{schemas,consultas,criar,decidir}.ts, src/modules/acesso/matriz.ts, src/modules/demandas/{schemas.ts (início),consultas.ts (até a linha 110),transicoes.ts}, src/modules/{limites.ts,versoes.ts (início)}, src/db/schema/decisao.ts (início), src/lib/{erros.ts,acao-painel.ts}, src/agents/consolidacao.ts, src/app/api/pacotes-decisao/[decId]/{route.ts,decisao/route.ts}, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/components/{formulario.ts,GrupoOpcoes.tsx,rotulos.ts,DialogoConfirmacao.tsx,CaixaSelecao.tsx,CampoTexto.tsx,AreaTexto.tsx,Alerta.tsx,Botao.tsx,ResumoErros.tsx,RegiaoAviso.tsx,Selo.tsx,dados-do-parecer.ts,dados-do-parecer.test.ts (início),rotulos-qa.test.ts (início)}, "src/app/(painel)/layout.tsx", "src/app/(painel)/demandas/[id]/{page.tsx,detalhe.ts,demanda-da-pagina.ts,MudarStatus.tsx,acoes.ts}", "src/app/(painel)/demandas/[id]/pareceres-risco/novo/{page.tsx,acoes.ts,FormularioParecer.tsx,pagina.test.ts,acoes.test.ts}", "src/app/(painel)/demandas/[id]/especificacoes/nova/FormularioEspecificacao.tsx", "src/app/(painel)/pareceres-risco/[rskId]/{page.tsx,parecer-da-pagina.ts,not-found.tsx}", src/app/not-found.tsx, scripts/seed-ficticio.ts, test/sessao.ts, test/estatico/{painel-qa,exigir-pessoa,varreduras-qa}.test.ts, playwright.config.ts, e2e/{apoio,servidor,parecer-risco.spec}.ts, test-results/pacote-decisao-gravar-vai--ceef2-il-entrou-na-fila-de-envio--chromium/error-context.md (gerado nesta etapa), resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/b6rvakzya.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T43 entrega duas telas da 03:
- a T09 Novo pacote de decisão, em `/demandas/[id]/pacotes-decisao/novo`;
- a T11 Decisão do pacote, em `/pacotes-decisao/[decId]`, com os acréscimos da 04 (C-14) e os padrões P1-a, P1-b e
  P1-d.

A seção do Pedido de Construção fica para a T44.

Portões, todos verdes:
- `pnpm test`: 184 arquivos, 3.575 testes, nenhuma falha. São 73 testes novos em seis arquivos (lista abaixo).
- `pnpm test:e2e`: a suíte inteira termina com código 0, com 90 testes em 16 arquivos (`--list`). Os 9 novos estão em
  `e2e/decisao.spec.ts` e `e2e/pacote-decisao.spec.ts`.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa. As duas rotas novas saem dinâmicas.

### T09 Novo pacote de decisão

- **Página** (Server Component), nesta ordem:
  1. `exigirPessoaNaPagina`;
  2. `criar_pacote_decisao`;
  3. a demanda, lida só depois de o id passar pela regex (C-17).

  Id fora do formato ou que não existe dá 404.
- **Sem ESP ou sem RSK**: a tela abre sem formulário. Mostra "Ainda não dá para criar o pacote. Falta: …" (só o que
  falta) e o botão de cada item que falta ("Nova versão da ESP" e/ou "Novo parecer de risco").
- **Com as duas**:
  - a informação "Este será o DEC-…-vN. Ele vai citar a ESP-… e o RSK-…, as versões mais novas desta demanda. Os
    dados da demanda são copiados para o pacote e não mudam depois.";
  - o formulário em branco (03, T09, Vazio).
- **Formulário** (`FormularioPacote.tsx`):
  - "Resumo executivo (obrigatório)";
  - "Opção A" e "Opção B", cada uma num `fieldset`/`legend`. Os rótulos repetem a opção: "Descrição da opção A
    (obrigatório)", "Vantagens…", "Desvantagens…", "Quando escolher…";
  - "Recomendação", com a dica;
  - o Grupo de opções "Nível de aprovação requerido (obrigatório)", com a dica e as opções "Só o CTO" e "CTO e
    administradora";
  - "Gravar DEC-…-vN" e "Cancelar".
- **Envio**:
  - a validação é no envio, na ordem da tela, com os erros da 03 e o limite da RNF-04;
  - o botão mostra "Gravando…" e o formulário fica com `aria-busy`;
  - os erros 400 da API entram no resumo, campo a campo, com as mensagens da 03;
  - o 400 com `faltando` vira "Faltam itens para o pacote: parecer de risco.";
  - o que foi digitado nunca se perde, e sair com conteúdo não salvo pede confirmação.
- **Server Action** (`acoes.ts`):
  - usa `acaoDoPainel({ acao: 'criar_pacote_decisao' })` sobre `criarPacoteDecisao`, com o schema da API mais
    `demandaId` (pela regex);
  - a autoria vem só da sessão;
  - a resposta leva só `{ id, demandaId }`.
- **Chegada**: a tela vai à T11 com `?aviso=pacote-criado`. O texto "DEC-… criado. A demanda está pronta para decisão
  e o aviso por e-mail entrou na fila de envio." usa o id do pacote aberto, não o da URL.

### T11 Decisão do pacote

- **Ordem**: `exigirPessoaNaPagina`, `ler_pacote_decisao`, o DEC (regex de DEC antes do banco), `ler_demanda` e a
  demanda. A demanda dá as versões mais novas, para o alerta de desatualizado, e o status, para o lembrete. Id fora do
  formato, de ESP, de RSK ou que não existe dá 404 (a "Página não encontrada" da 2.8).
- **Cabeçalho**:
  - o id e os selos (decisão, "Desatualizado" e "Rascunho de agente");
  - o `h1` "Decisão: <título copiado no pacote>";
  - a linha "Demanda <id> · Nível de aprovação: … · Criado em <data> por <ator>";
  - "Cita: ESP-… (Ver) · RSK-… (Ver)".
- **Alertas de topo**:
  - o alerta de resultado, que recebe o foco;
  - o lembrete de P1-d, com "Ir para a demanda": aparece quando o pacote está aprovado e a demanda segue em Pronta para
    decisão;
  - o alerta de desatualizado, com a versão mais nova e o link "Criar pacote novo";
  - o alerta de rascunho, com os ids citados.
- **Revisão antes de decidir** (C-14, `RevisaoDoPacote.tsx`): é uma região com `h2`, antes do formulário. Ela mostra:
  - a ESP citada, com link e selo de rascunho;
  - o sistema alvo, o repositório destino, os critérios de aceite e a definição de pronto;
  - o RSK citado, com link e selo;
  - "Risco técnico: Alto" e os outros dois níveis;
  - "Nível de aprovação: …".

  São os dados citados pelo pacote, não os mais novos da demanda.
- **Conteúdo**:
  - "Resumo executivo";
  - "Opções", com A e B em colunas a partir de 1.024 px (`lg`) e empilhadas abaixo disso, na ordem do DOM. Cada opção
    tem "Descrição", "Vantagens", "Desvantagens" e "Quando escolher";
  - "Recomendação", ou "Recomendação do agente de consolidação" quando o pacote é rascunho;
  - "Aprovações", só no nível CTO e administradora, com a nota sobre o documento assinado.
- **Quem vê o formulário** (`formularioDaConta`):
  - nível "Só o CTO": só a conta cto. A administradora vê "Este pacote exige só a aprovação do CTO." (P1-b);
  - nível duplo: cada conta registra a própria aprovação uma vez. Quem já aprovou vê o aviso. Na segunda aprovação, a
    opção fica fixada na de quem aprovou primeiro, e só a administradora informa o documento e a data (P1-a);
  - pacote já decidido: "Decisão registrada: …, por <nome> em <data>.", com os comentários.
- **Formulário** (`FormularioDecisao.tsx`):
  - o grupo "Decisão (obrigatório)". "Aprovar" desatualizado fica no grupo com `aria-disabled` e o motivo por
    `aria-describedby` (CA-12.4). Devolver e Arquivar levam a dica da 03;
  - o grupo "Opção escolhida (obrigatório)" aparece só com Aprovar, logo depois, sem mover o foco. Cada opção mostra
    "Opção A — <80 letras>";
  - "Comentários (opcional)" e a caixa "Revisei os rascunhos…", quando há rascunho citado.
- **Diálogo** "Confirmar a decisão?":
  - resume a decisão e repete "Repositório destino: …." e "Nível de aprovação: …." (C-14);
  - os botões são "Confirmar e registrar" e "Voltar". Durante o envio, o botão de confirmar mostra "Registrando…";
  - o foco volta ao botão "Registrar decisão".
- **Erros**: os 400 entram no resumo, campo a campo, com as mensagens da 03. O 409 vira alerta "Não foi possível
  concluir: …", e o 403 usa o texto da 2.8.
- **Server Action** (`acoes.ts`):
  - usa `acaoDoPainel({ acao: 'registrar_decisao' })` sobre `registrarDecisao`, com o corpo da API inteiro em
    `decisao`. O schema é uma união discriminada e não aceita `.extend`;
  - não manda `registrarComo`. O papel é o da conta, conferido pelo servidor;
  - a resposta leva só `{ decId, resultado }`.
- **Chegada**: a tela vai a `?aviso=decisao-registrada`, e o texto sai do estado gravado do pacote:
  - aprovada;
  - parcial, por papel;
  - completa, por quem fechou;
  - devolvida;
  - arquivada.

### Arquivos

- Criados (todos novos; nenhum arquivo existente mudou):
  - `src/components/dados-do-pacote.ts` (desvio 1)
  - `src/components/dados-da-decisao.ts` (desvio 1)
  - `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/page.tsx`
  - `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/FormularioPacote.tsx`
  - `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts`
  - `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`
  - `src/app/(painel)/pacotes-decisao/[decId]/RevisaoDoPacote.tsx`
  - `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx` (também exporta `AlertaDeResultado`, desvio 3)
  - `src/app/(painel)/pacotes-decisao/[decId]/acoes.ts`
  - `src/app/(painel)/pacotes-decisao/[decId]/pacote-da-pagina.ts` (desvio 2)
  - `e2e/pacote-decisao.spec.ts`
  - `e2e/decisao.spec.ts`
  - os testes unitários abaixo

### Testes criados

- `src/components/dados-do-pacote.test.ts` (12):
  - nível, limite e regex iguais aos do servidor;
  - textos da 03 e o "falta";
  - vazio e validação na ordem da tela;
  - a entrada passa em `criarPacoteDecisaoSchema`, sem autoria;
  - erros da API com as mensagens da 03 e `faltando`;
  - chegada.
- `src/components/dados-da-decisao.test.ts` (27):
  - mensagens iguais às de `decidir.ts`;
  - quem vê o formulário (P1-a, P1-b, decidido);
  - grupos e "Aprovar" indisponível;
  - validação;
  - a entrada passa em `registrarDecisaoSchema`, sem `registrarComo`;
  - erros da API, com o prefixo `decisao.` tirado;
  - diálogo de C-14;
  - desatualizado (ESP ou RSK);
  - revisão, opções e aprovações;
  - chegada só por valor fixo, com o texto vindo do estado.
- `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/pagina.test.ts` (8): ordem de autorização e leitura, C-17,
  404, sem permissão, título da aba, HTML com ESP e RSK, "falta" sem formulário, C-18.
- `src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.test.ts` (5, Testcontainers, banco e Better Auth reais):
  - v1 com a autoria da sessão e a demanda em Pronta para decisão;
  - `faltando`;
  - recusa do servidor campo a campo;
  - C-17 e 404;
  - sem sessão.
- `src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts` (15):
  - ordem, C-17 com ESP, RSK e DEM, 404 e falha que sobe, título da aba;
  - cabeçalho;
  - revisão antes do formulário;
  - opções e recomendação de agente;
  - rascunho;
  - desatualizado com `aria-disabled`;
  - C-18;
  - formulário da cto, P1-b, dupla depois do CTO;
  - decidido com o lembrete;
  - chegada.
- `src/app/(painel)/pacotes-decisao/[decId]/acoes.test.ts` (6, Testcontainers, contas cto e administradora):
  - nível cto, com `registrarComo` recusado;
  - P1-b;
  - dupla aprovação com documento;
  - desatualizado (409), Devolver e 409 de já decidido;
  - Arquivar;
  - C-17, decisão inválida e sem sessão.
- `e2e/decisao.spec.ts` (6):
  - C-14 no DEC de agente do seed: revisão, erros, diálogo e "Voltar" sem registrar;
  - P1-b;
  - nível cto, com o lembrete e o foco no alerta de resultado;
  - dupla aprovação, com a troca de conta, a opção fixada, os erros de documento e data e "O pacote está aprovado.";
  - CA-12.4 com Devolver;
  - Arquivar, 404 e sem sessão.

  O axe roda nestes estados: pendente com rascunhos, com erro, com o diálogo aberto, sem formulário, pendente,
  decidido, segunda aprovação com erro, aprovado nas duas contas, desatualizado e devolvido.
- `e2e/pacote-decisao.spec.ts` (3):
  - sem RSK, com 404;
  - gravar, com a T05 → T09 → T11 e a demanda em Pronta para decisão;
  - erros, foco no grupo e saída sem salvar.

  O axe roda na T09 sem RSK, vazia, preenchida e com erro, e na T11 depois de criar.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pacote.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/demandas/[id]/pacotes-decisao/novo" "src/app/(painel)/pacotes-decisao"`, antes do código:
```
 FAIL  src/components/dados-da-decisao.test.ts
Error: Cannot find module './dados-da-decisao' imported from .../dados-da-decisao.test.ts
 FAIL  src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts
Error: Cannot find module '/src/app/(painel)/pacotes-decisao/[decId]/page' ...
 Test Files  6 failed (6)
      Tests  no tests
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/pacote-decisao.spec.ts --max-failures=3`, antes do código:
```
  ✘  1 › C-14: … Expected: "Decisão do pacote — WS Orquestrador de Demandas"  Received: "Página não encontrada — WS Orquestrador de Demandas"
  ✘  2 › P1-b: … getByText('Este pacote exige só a aprovação do CTO.', { exact: true }) … element(s) not found
  ✘  3 › nível cto: … getByRole('heading', { name: 'Decisão: Demanda da decisão (fictício)', level: 1 }) … element(s) not found
  3 failed, 6 did not run
```

Depois do código:
- **unitários**: 72 de 73 na primeira rodada. A falha estava no próprio teste: com o relógio fixo, as duas aprovações
  têm o mesmo instante, e a vista as ordena pelo papel. Isso também mostrou que a chegada "completa" não pode depender
  da ordem: ela passou a usar quem registrou a decisão. Na segunda rodada, 73 de 73.
- **e2e novos**: 7 de 9 na primeira rodada. `getByLabel('Vantagens da opção A')` também casava com "Desvantagens…"; o
  seletor passou a ser exato. Depois, 9 de 9.
- **e2e inteiro**: falhou três vezes com 429 em `POST /api/demandas` (ver o desvio 6 e as Pendências). Depois de
  reduzir as demandas da T43, terminou com código 0.

### Desvios do plano

1. **`dados-do-pacote.ts` e `dados-da-decisao.ts`, fora da lista.** Guardam a regra das telas: textos, validação,
   entrada, erros da API, quem vê o formulário, diálogo, revisão e chegada. Ela é usada pelo Server Component e pelo
   formulário de cliente, e é testada sem tela. É o molde de `dados-da-especificacao.ts` e `dados-do-parecer.ts`
   (desvios aceitos na T41 e na T42).
2. **`pacote-da-pagina.ts`, fora da lista.** É a leitura com `cache` para a página e o `generateMetadata`, no molde da
   T10 da ESP e do RSK. Não há `not-found.tsx` próprio: a 03 não dá texto de 404 para a T11, e vale a "Página não
   encontrada" da 2.8.
3. **`AlertaDeResultado`, exportado de `FormularioDecisao.tsx`.** Depois de decidir, a página é lida de novo e o
   formulário some. Sem este componente, o foco cairia no corpo da página (03, T11, Foco: "alerta de resultado"). Ele
   recebe `key` com o texto, para levar o foco de novo quando o alerta muda.
4. **Estado "Carregando" (esqueleto) não implementado**, pelo mesmo motivo da T39 a T42: com `loading.tsx`, o
   `notFound()` não troca mais o status para 404. "Gravando…" e "Registrando…" estão feitos.
5. **A T09 não tem o aviso de conflito de versão.** A 03 não o define para o DEC. Se outro pacote for gravado no meio, o
   novo vira o seguinte, e a T11 mostra o id real e as versões que ele cita.
6. **O e2e reaproveita uma demanda por spec**, e não uma por teste:
   - `decisao.spec.ts` cria um DEC novo por teste sobre uma demanda da conta "cto";
   - `pacote-decisao.spec.ts` usa uma demanda da "administradora", primeiro só com a ESP e depois com o RSK.

   Com uma demanda por teste, a suíte inteira estourou o limite por ator (C-36: 30 demandas por hora por conta). O
   motivo é que as outras specs já deixam só cerca de 1 demanda livre em cada conta (ver Pendências). Cada teste roda
   também sozinho; a ordem do arquivo segue o fluxo (aprovar, dupla, devolver, arquivar). Os casos do plano estão
   todos cobertos. "Devolver → …; Arquivar → Encerrada" virou dois testes, e o Devolver junta com o CA-12.4.

## Decisões tomadas

- **O texto de chegada sai do estado gravado do pacote, nunca da URL.** `?aviso=` só aceita os valores fixos
  `pacote-criado` e `decisao-registrada`, como na T05.
- **"Completa" é atribuída a quem registrou a decisão** (o nome em `decisao.decididaPor`), e não à última aprovação da
  lista. Com o mesmo instante, a vista ordena pelo papel.
- **O lembrete de P1-d aparece enquanto o pacote está aprovado e a demanda segue em Pronta para decisão**, e não só
  logo depois de aprovar. Assim a demanda esquecida continua lembrada.
- **A administradora não vê formulário em DEC de nível cto, nem para devolver ou arquivar** (03, fluxo; P1-b). A
  regra do servidor continua valendo.
- **O alerta de desatualizado cita a ESP mais nova quando é ela; senão, o RSK.**
- **A revisão de C-14 é uma região com `h2` própria, antes do formulário.** Os níveis aparecem em texto, e a ESP e o
  RSK citados ganham link para a T10 e o selo de rascunho.
- **O "falta" da T09 é um alerta de atenção** com os botões dentro dele. A 03 não diz o tipo.
- **As datas das linhas de aprovação e da decisão registrada vão em texto corrido**, sem `<time>`. A data de
  "Criado em" do cabeçalho usa `<time>`.

## Pendências

- **tech-lead e qa-automacao: a suíte e2e está no limite do C-36.** Com as specs atuais, cada conta fictícia, "cto" e
  "administradora", chega perto de 30 demandas na hora da suíte. A T43 coube só com uma demanda por spec. A T44, a
  T45 e a T46 (axe em todas as telas) vão precisar de dados e devem esbarrar no 429. Saídas possíveis, fora do meu
  escopo:
  - uma terceira conta fictícia com 2FA no seed (T33);
  - specs que reaproveitam dados;
  - outro desenho de dados para o e2e.

  Afrouxar o limite no e2e enfraqueceria o C-36.
- **ux-ui-design: textos compostos ou ausentes na 03.**
  - (a) Desatualizado pelo RSK: "Este pacote está desatualizado. A demanda já tem RSK-…, mais novo que o citado aqui.
    …". A 03 só traz a frase da ESP.
  - (b) A administradora aprovando primeiro:
    - "A administradora aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver
      ou arquivar.";
    - "Sua aprovação está registrada. Falta a aprovação do CTO. O pacote só vale depois dela.";
    - "Aprovação da administradora registrada. Falta a aprovação do CTO.";
    - "Aprovação do CTO registrada. O pacote está aprovado.".
  - (c) Rótulos da revisão de C-14: "Revisão antes de decidir", "Especificação técnica citada", "Parecer de risco
    citado", "Níveis de risco", "Nível de aprovação" (com o valor "Nível de aprovação: …").
  - (d) Linhas do diálogo: "Repositório destino: ….", "Repositório destino: Não informado." e "Nível de aprovação:
    …".
  - (e) O título da aba "Decisão do pacote".
  - (f) O rótulo "Comentários" na decisão registrada, e "Decisão registrada: Devolvida, por …" e "…: Arquivada, por
    …" (a 03 diz só "ou Devolvida/Arquivada").
  - (g) O "…" no fim da descrição cortada em 80 letras.
- **07-qa-funcional (G2):**
  - foco no alerta de resultado depois de decidir e de criar o pacote;
  - o diálogo, que prende o foco e o devolve a "Registrar decisão";
  - o grupo "Opção escolhida", que aparece sem mover o foco;
  - "Aprovar" indisponível, que continua alcançável pelas setas e explicado pelo leitor de tela.
- **T44:** a seção "Pedido de Construção" entra em `src/app/(painel)/pacotes-decisao/[decId]/page.tsx`, depois de
  "Registrar decisão". A condição é decisão aprovada completa, que `formularioDaConta` já identifica (`tipo:
  'decidido'` com `statusDecisao` aprovada).
- **Leituras fora de `/tmp` (para o maestro):**
  - li o resumo final da saída do `pnpm test`, que a ferramenta gravou em `~/.claude/projects/.../tool-results/`;
  - li o `error-context.md` de um teste e2e que falhou, em `test-results/`, gerado por esta etapa.

  Não li nenhum arquivo em `/tmp`. As execuções do e2e inteiro passaram de 180 s e foram para segundo plano; os testes
  que falharam vieram de `--last-failed --list`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -15` — último commit 004f517 (06-T42-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%s --grep=06-T20- --grep=06-T21- --grep=06-T22-` — arquivos de pacotes-decisao e pedido-construcao
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%s --grep=06-T36-construcao --grep=06-T41-construcao --grep=06-T40-construcao -- src/components src/lib e2e test` — componentes do design system
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%s --grep=06-T26-construcao -- src/agents` — prompts dos agentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- src/modules/demandas/consultas.ts` — b40faaf
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- e2e` — lista das specs
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pacote.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/demandas/[id]/pacotes-decisao/novo" "src/app/(painel)/pacotes-decisao"` — FAIL: 6 arquivos, nenhum teste carregado (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/pacote-decisao.spec.ts --max-failures=3` — FAIL: 3 falharam e 6 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pacote.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/demandas/[id]/pacotes-decisao/novo" "src/app/(painel)/pacotes-decisao"` — 72 de 73 (ordem das aprovações com o mesmo instante)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-do-pacote.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/demandas/[id]/pacotes-decisao/novo" "src/app/(painel)/pacotes-decisao"` — 73 de 73
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/decisao.spec.ts e2e/pacote-decisao.spec.ts` — 7 de 9 (seletor de rótulo não exato)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/pacote-decisao.spec.ts` — 3 de 3
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 184 de 184 arquivos, 3.575 de 3.575 testes, 79,9 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1 (foi para segundo plano depois de 180 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 18 arquivos novos, todos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --last-failed --list` — 5 testes das specs da T42 (429 do C-36)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1 (segundo plano)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --last-failed --list` — 7 testes (429 em `POST /api/demandas`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/parecer-risco.spec.ts e2e/parecer-risco-qa.spec.ts` — 10 de 10 (sozinhas, com banco novo)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/autenticacao-qa.spec.ts e2e/configurar-2fa.spec.ts e2e/demanda-formularios-qa.spec.ts e2e/detalhe-demanda.spec.ts e2e/editar-demanda.spec.ts e2e/entrar.spec.ts e2e/especificacao-qa.spec.ts e2e/especificacao.spec.ts e2e/fila-qa.spec.ts e2e/fila.spec.ts e2e/moldura.spec.ts e2e/nova-demanda.spec.ts e2e/parecer-risco-qa.spec.ts e2e/parecer-risco.spec.ts` — código 0 (a suíte sem as duas specs novas; em segundo plano)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -1 -- src/modules/demandas/transicoes.ts` — def1fa7
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 1 (em segundo plano)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --last-failed --list` — 2 testes de `parecer-risco-qa.spec.ts` (429)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (em segundo plano)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 90 testes em 16 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/demandas/[id]/pacotes-decisao/novo` e `/pacotes-decisao/[decId]` dinâmicas

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
