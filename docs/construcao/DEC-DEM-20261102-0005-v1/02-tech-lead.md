---
pedido: DEC-DEM-20261102-0005-v1
etapa: 02-triagem
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, 01-qa-funcional.md, DEC-DEM-20261102-0004-v1/02-tech-lead.md, e2e/decisao.spec.ts, e2e/apoio.ts, package.json, test/estatico/projeto.test.ts, src/components/dados-da-decisao.ts, src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx, .claude/agents/engenheiro-frontend.md]
status: pronto
proximo: engenheiro-frontend
devolvido_para: null
---
## Entrega

### Causa provável

Concordo com a reprodução da 01. Os dois pontos estão só no teste. Nenhum comportamento do sistema está errado.

1. **D-1, o arquivado sem axe.** O teste "Arquivar" (`e2e/decisao.spec.ts:346-364`) termina nas conferências pela API
   (`:362` e `:363`) e não chama `semViolacoes`. O pedido 0004 refez a pré-condição e as conferências desse teste, mas
   não acrescentou o axe que os outros estados finais têm. O devolvido tem axe na `:343`, o aprovado na `:234` e o
   aprovado nas duas contas na `:310`.
2. **D-2, o cabeçalho.** O reflow manual do pedido 0004 deixou a linha 7 órfã e deixou linhas acima de 120 colunas. O
   Prettier não reflora comentário, e o `eslint.config.mjs` não tem `max-len`, por isso o `pnpm lint` passa. Contei de
   novo em caracteres, que é como o `printWidth` mede:
   - linha 1: 121;
   - linha 3: 131;
   - linha 6: 121;
   - linha 20: 121 (`... prova a mudança para`).

   A linha 18 tem 120, e as outras linhas do comentário têm menos de 120. A frase da linha 11 está incompleta e não
   cita o arquivado.

**Expectativa sobre o axe da tela arquivada (a confirmar na execução).** A tela arquivada usa os mesmos componentes da
tela devolvida: o `AlertaDeResultado` com o `Alerta` de sucesso (`FormularioDecisao.tsx:208-220`), o texto fixo
`sucesso.arquivada` (`dados-da-decisao.ts:127`) e a linha "Decisão registrada: Arquivada, por ..." (`:104` e `:132`). O
devolvido já passa no axe (`:343`), então espero que o arquivado também passe. Se acusar violação, a correção vai para
`src/` neste pedido (ver passo 2).

### Quem corrige

**`engenheiro-frontend`, numa `03-correcao` só.** O que muda está em `e2e/decisao.spec.ts`, no campo `version` do
`package.json`, numa linha de `test/estatico/projeto.test.ts` e, só se o axe acusar violação, em `src/` (tela). Todos
esses arquivos estão na lista **Pode** do frontend, e o `pnpm test:e2e` também. O backend não tem `e2e/` nem
`pnpm test:e2e` na lista dele.

### O que a 03-correcao faz, em ordem, com o teste antes do código

**Arquivos que mudam:**
- `e2e/decisao.spec.ts`: o axe no "Arquivar" e o comentário de cabeçalho;
- `test/estatico/projeto.test.ts`: só o `it` da versão;
- `package.json`: só `version`;
- `src/`: só se o passo 2 achar violação real.

**Arquivos que não mudam:** `e2e/apoio.ts` (`semViolacoes` e `TAGS_AXE`), `e2e/preparacao.ts`, os outros `e2e/*.spec.ts`,
`scripts/`, `playwright.config.ts`, `.github/`, `Dockerfile` e `CHANGELOG.md`. O `CHANGELOG.md` fica com a
`06-documentacao`.

**Passo 0. Versão 0.1.4 (o teste que falha primeiro)**

1. Comece pelo teste. Em `test/estatico/projeto.test.ts`, no `it` da versão (linhas 27-30), troque `0.1.3` por `0.1.4`
   no título e no `expect`. Troque o comentário da linha 27 por:
   `// 0.1.4: DEC-DEM-20261102-0005-v1 (axe no estado arquivado da decisão e cabeçalho da decisao.spec.ts, sem mudança de comportamento).`
   Se o axe do passo 2 obrigar a mudar `src/`, tire o "sem mudança de comportamento" e escreva o que mudou na tela.
2. Rode `pnpm test` e registre a falha na entrega (`expected '0.1.3' to be '0.1.4'`).
3. Mude `"version": "0.1.3"` para `"0.1.4"` no `package.json`.
4. Rode `pnpm test` de novo. Tem de ficar verde.

**Passo 1. O axe no estado arquivado**

- No "Arquivar", depois da última conferência (linha 363, `toBe('encerrada')`), acrescente a linha abaixo:
  `await semViolacoes(page, 'T11 arquivado');`
  O lugar e a forma são os do devolvido (`:342-343`).
- As chamadas `api(...)` usam `page.request` e não navegam, então a página continua na tela arquivada.
- As linhas 346 a 363 não mudam:
  - o título do teste;
  - o comentário das linhas 350 a 352 e o das linhas 355 e 356;
  - a pré-condição `exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), ...)`;
  - o `novoPacote`;
  - o `expect` "antes de arquivar";
  - o alerta;
  - o `statusDecisao: 'arquivada'` e o `encerrada`.
- Nada de `disableRules`, `exclude`, `include`, `withRules`, tag a menos ou `AxeBuilder` próprio. A chamada é só ao
  `semViolacoes` de `e2e/apoio.ts`.

**Passo 2. Rodar o axe novo e decidir pela tela**

- Rode `pnpm test:e2e e2e/decisao.spec.ts --grep "Arquivar"` num banco novo. A pré-condição só vale num banco
  recém-semeado, então suba o banco de desenvolvimento do zero com `docker compose -f docker-compose.dev.yml down` e
  `up -d`, ou use o banco novo que o `webServer` do e2e já prepara.
- Registre na entrega que o "Arquivar" foi **aprovado e não pulado**, com a contagem da saída. Se ele aparecer pulado,
  o banco não era novo, e a execução não vale como prova.
- **Se passar:** o D-1 está resolvido. A partir daqui, a chamada nova faz a tela arquivada reprovar no CI se uma
  violação aparecer. Ela não falha antes porque a tela não tem violação: o defeito era falta de verificação. O teste
  que falha primeiro neste pedido é o do passo 0.
- **Se reprovar com `axe em T11 arquivado`:** copie para a entrega a regra, o impacto e o alvo que o erro lista. Faça
  então assim:
  - corrija a tela em `src/`, no componente que o alvo indica;
  - deixe o teste como está: ele já é o teste que falha e só tem de ficar verde depois da correção;
  - se o alvo for um componente que outras telas também usam (`Alerta`, `AlertaDeResultado`), rode a suíte e2e
    inteira depois, para ver se alguma tela mudou;
  - se a correção exigir mudar texto ou estrutura da `03-ux-ui-design` do sistema, ou mexer em regra do servidor, não
    corrija: devolva para a `02-triagem` com `proximo: tech-lead` e a regra do axe na primeira linha de Pendências.

**Passo 3. O comentário de cabeçalho, linhas 1 a 26**

O critério 2 fala do comentário de cabeçalho inteiro. A linha 20, que está no segundo bloco, também passa de 120
colunas, então o reflow cobre as linhas 1 a 26 (pendência da 01). O conteúdo só muda num ponto: a frase do axe, que
passa a listar todos os estados com axe, o arquivado entre eles.

Regras:
- no `git diff`, só mudam linhas que começam com `//`, e a linha 27 (`import`) em diante fica igual;
- cada linha tem no máximo 120 caracteres, contando `//`, a indentação da lista e os acentos como um caractere cada;
- nenhuma linha tem uma palavra ou um fragmento sozinho que a anterior comportaria;
- os sinais `//`, `//   - ` e `//     ` da lista do segundo bloco ficam como estão;
- a linha 26 (`// Uso por conta deste arquivo: ...`) fica igual.

Texto que eu proponho para o primeiro parágrafo (linhas 1 a 11, que passam a ser 13). Contei cada linha em caracteres,
e a mais longa tem 118:

```
// T43: T11 Decisão do pacote (03, T11; RF-12 a RF-14; 04, C-14; P1-a, P1-b, P1-d). Os pacotes são criados pela API
// com a sessão da conta fictícia "cto", um DEC novo por teste, todos sobre uma demanda só desta spec (do seed, com a
// ESP e o RSK gravados na primeira vez que um teste precisa). Uma demanda por teste estourava o limite por ator da
// suíte inteira (C-36: 30 demandas por hora por conta). A ordem do arquivo é a do fluxo: aprovar e a dupla aprovação
// deixam a demanda em Pronta para decisão; devolver a leva a Em análise; arquivar, a Encerrada; depois, o 404 e a
// sessão, sem mudar o banco. Cada teste roda também sozinho. O pacote de rascunho de agente é o do seed fictício
// (T33), que nasce "CTO e administradora" (08-correcao, A-04: o nível do DEC de agente é da regra do servidor), e
// nenhum teste daqui registra decisão nele. O P1-b usa um DEC de pessoa de nível "Só o CTO", criado pela "cto". Com
// A-02 (só um DEC aprovado por demanda), a dupla aprovação usa uma demanda própria, que vem do seed
// (TITULOS_DO_E2E.duplaAprovacao) e não da API, pelo mesmo limite C-36; ela troca a sessão da página da "cto" para
// a "administradora". O axe roda nos estados pendente (com e sem rascunho de agente), com erro, com o diálogo aberto,
// sem formulário, com o conflito da A-02, desatualizado e decidido (aprovado, aprovado nas duas contas, devolvido e
// arquivado).
```

No segundo bloco, só as linhas 20 a 23 mudam. A palavra "para" desce da 20 para a 21 e empurra o resto até a 23. O
texto proposto, com a mais longa em 118:

```
//     do "Arquivar" ela fica Encerrada, que é final) e "Arquivar" (só a partida de ORIGENS_DO_FLUXO prova a mudança
//     para Encerrada: B-01 do DEC-DEM-20261102-0003-v1, corrigido no DEC-DEM-20261102-0004-v1). Fora do CI, eles
//     são pulados com a mensagem "exige banco recém-semeado: ..."; no CI, o banco é sempre novo (Testcontainers), e a
//     mesma pré-condição falsa reprova o teste;
```

- Outro reflow serve, se cumprir as regras acima.
- Confira a largura de cada linha do cabeçalho pelo `Read`, linha a linha, e escreva na entrega a largura da linha mais
  longa. Nenhum comando da sua lista mede colunas, então o maestro confere de novo na `04-revisao`.
- O reflow não toca linhas de código. Há linhas de código acima de 120 colunas no arquivo (`:49-51`, `:143` e `:214`,
  entre outras), mas elas estão fora deste pedido: o Prettier reflora código, e o risco do pedido proíbe mudar código
  junto com o comentário.

**Comandos da 03-correcao** (todos na lista **Pode** do frontend):
- `pnpm test`, `pnpm lint` e `pnpm typecheck`;
- `pnpm test:e2e` inteiro, uma vez, num banco novo: tudo aprovado e 0 pulado;
- `pnpm test:e2e e2e/decisao.spec.ts --repeat-each=3` num banco só, com o resultado de cada repetição na entrega (ver
  "Teste de regressão esperado").

### Proibido, e recusado na revisão como alto

- Desligar, filtrar ou restringir o axe:
  - `disableRules`, `exclude` ou `include`;
  - tirar tag de `TAGS_AXE`;
  - mexer em `semViolacoes` ou em `ESPERA_DO_TITULO_MS`.
- Corrigir uma violação do axe no teste em vez de na tela.
- Mudar a pré-condição do "Arquivar", `ORIGENS_DO_FLUXO` ou `exigeBancoRecemSemeado`, ou tirar ou afrouxar uma das
  conferências de status (o "antes de arquivar", o `arquivada` e o `encerrada`).
- Mudar uma linha de código no reflow do cabeçalho, ou mudar outro comentário do arquivo.
- Pular sem mensagem:
  - `return` silencioso;
  - `test.skip` sem condição;
  - `test.fixme`, `.only` ou `.todo`;
  - pular dentro do CI.
- Subir `retries`, mudar `workers` ou mudar `fullyParallel`.
- Mexer no C-36 ou na A-02: variável, cabeçalho, conta ou relógio.
- Ler `.env` ou usar dado pessoal real.

### Teste de regressão esperado

- **"Arquivar"** (`e2e/decisao.spec.ts`): no fim, `semViolacoes(page, 'T11 arquivado')`, depois das três conferências
  de status. A pré-condição e as conferências ficam como estão na 0.1.3.
- **`--grep "Arquivar"` num banco novo:** 1 aprovado, 0 pulado e nenhuma violação em `axe em T11 arquivado`.
- **`pnpm test:e2e e2e/decisao.spec.ts --repeat-each=3`, num banco só, sem `CI`.** A spec continua com 9 testes:
  - na 1.ª repetição, 9 aprovados e 0 pulado, e o axe do arquivado roda;
  - na 2.ª e na 3.ª, 5 aprovados (C-14, M-01, P1-b, A-02 e o de 404 e sessão) e 4 pulados com
    `exige banco recém-semeado: ...` ("nível cto: aprovar A", "dupla aprovação", "CA-12.4" e "Arquivar");
  - total: 19 aprovados, 8 pulados e 0 falha. O axe do arquivado só roda na 1.ª repetição, e isso é esperado (caso 3
    da 01).
- **`test/estatico/projeto.test.ts`:** versão 0.1.4.

### Definição de pronto do pedido, por etapa da cadeia curta

| Item | Etapa dona |
|---|---|
| `pnpm test`, `pnpm lint` e `pnpm typecheck` verdes | `03-correcao` (engenheiro-frontend). O maestro confere de novo no `verificar` |
| `pnpm test:e2e` verde três vezes seguidas | `04-regressao` (qa-automacao). A `03-correcao` roda a suíte uma vez, mais o `--repeat-each=3` da `decisao.spec.ts` |
| `CHANGELOG.md` com a versão 0.1.4 | `06-documentacao` (documentacao-tecnica). O `version` do `package.json` e o `test/estatico/projeto.test.ts` ficam com a `03-correcao` (passo 0) |
| PR com CI verde | Parada 3 (maestro), depois da `05-entrega` |

**Para a `04-regressao`:**
- `pnpm test:e2e` três vezes seguidas. Cada execução sobe um banco novo e tem de terminar com 0 pulado.
- O `--repeat-each=3` da `decisao.spec.ts`, com o resultado esperado acima.
- Pelo `git diff`:
  - nenhuma asserção afrouxada;
  - nenhum `.skip`, `.only` ou `.todo` novo;
  - nenhuma mudança em `e2e/apoio.ts`;
  - no reflow das linhas 1 a 26, só linhas que começam com `//`.

**Para a `05-entrega`:** nada muda em `Dockerfile`, nos workflows nem em `docs/operacao/`. O `docker build` confere que
a imagem sai igual. Se o passo 2 mudar `src/`, a imagem muda só nesse componente.

## Decisões tomadas

- Engenheiro-frontend: `e2e/`, `test/`, `package.json`, `src/` (para o caso de violação) e `pnpm test:e2e` estão na lista Pode dele; o backend não tem `e2e/` nem `pnpm test:e2e`.
- O reflow cobre o comentário inteiro (linhas 1 a 26), e não só as linhas 1 a 11 que a ESP cita: o critério 2 fala do comentário de cabeçalho e a linha 20 tem 121 caracteres.
- Contei as larguras em caracteres, pela régua do `printWidth`. Minha conta bate com a da 01 nas linhas 1, 3, 6 e 20.
- O axe fica no fim do "Arquivar", depois das conferências de status, como no devolvido (`:342-343`): as linhas 346 a 363 não mudam, e o critério 3 fica provado no diff.
- A frase do axe passa a listar todos os estados que têm axe, e não só a acrescentar o arquivado: a frase da 0.1.3 já omitia cinco estados, e uma lista incompleta engana quem mantém o arquivo.
- O teste que falha primeiro é o da versão (passo 0). O axe novo só falha se a tela tiver violação: o defeito é falta de verificação, e a prova é o "Arquivar" aprovado, sem pulo, num banco novo, com a chamada no diff.
- `test/estatico/projeto.test.ts` muda uma linha, fora da lista de arquivos da ESP: ele confere a versão, e sem a troca o `pnpm test` reprova com o `package.json` em 0.1.4. Fiz o mesmo no pedido 0004.
- Violação real do axe vai para `src/` neste pedido, como a ESP manda. Se a correção pedir mudança de texto ou de estrutura da interface, volta para a triagem: é uma decisão de interface e passa do tamanho de um pedido de correção.

## Pendências

- Para a `03-correcao`: só a execução diz se a tela arquivada tem violação de axe. Espero que não tenha, porque os componentes são os do devolvido, que já passa. Se tiver, a correção em `src/` segue o passo 2.
- Para o maestro, na `04-revisao`: medir com uma ferramenta a largura das linhas 1 a 28 do novo cabeçalho. Nenhum comando da lista Pode do frontend nem da minha mede colunas, e as contas desta triagem e da 01 foram feitas à mão.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — ramo construcao/DEC-DEM-20261102-0005-v1, limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -3` — 5a96a98 (01-reproducao) sobre 2bfc680 (00-inicio) e 00a924e (main 0.1.3)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo

## Critério de pronto atendido

- [x] (02 triagem) `proximo` é um dos três engenheiros
- [x] (02 triagem) cada item da definição de pronto do pedido está atribuído a uma etapa da cadeia curta, pela lista da Entrega
