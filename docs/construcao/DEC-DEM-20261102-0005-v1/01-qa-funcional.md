---
pedido: DEC-DEM-20261102-0005-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [pedido.json, contrato-passagem.md, DEC-DEM-20261102-0004-v1/04-maestro.md, e2e/decisao.spec.ts, e2e/apoio.ts, .prettierrc, eslint.config.mjs, package.json, CHANGELOG.md, src/components/dados-da-decisao.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reproduzi os dois pontos lendo o código na base do ramo (`package.json` com a versão 0.1.3; o CHANGELOG começa na
0.1.3). Não tenho Bash, então não rodei a suíte. As duas reproduções são estáticas (leitura do arquivo) e têm passos
manuais para quem tiver Bash confirmar.

### Defeito D-1: o estado arquivado não passa pelo axe

**Severidade: baixa.** Nenhuma tela quebra para o usuário. O que falta é a garantia de acessibilidade (RNF-11; 03,
seção 5) na tela que o CTO vê depois de arquivar. Uma violação real nessa tela, por exemplo foco ou contraste no
alerta de sucesso, passaria pelo CI sem aviso. Não há evidência de violação, só de que ninguém a verifica.

**Ambiente:** ramo `construcao/DEC-DEM-20261102-0005-v1`, base `main` 0.1.3, e2e Playwright com
`@axe-core/playwright` (`e2e/apoio.ts:61-70`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` e `wcag22aa`, sem regra
desligada).

**Passos para reproduzir (leitura do código):**

1. Abrir `e2e/decisao.spec.ts`, teste `'Arquivar → "Pacote arquivado. A demanda foi para Encerrada."'` (linhas 346 a
   364).
2. Seguir o fluxo: `entrarComo(page, 'cto')` (conta fictícia "Pessoa Ficticia CTO"), pré-condição
   `exigeBancoRecemSemeado` (linha 353), `novoPacote(..., 'cto')` (linha 354), status `pronta_para_decisao` (linha
   357), `goto /pacotes-decisao/<decId>` (linha 358), marcar "Arquivar" e confirmar (linhas 359 e 360), alerta
   "Pacote arquivado. A demanda foi para Encerrada." (linha 361), `statusDecisao` = `arquivada` (linha 362) e status
   `encerrada` (linha 363).
3. Procurar `semViolacoes` no corpo do teste, entre as linhas 346 e 364.

**Passos para confirmar rodando (para quem tem Bash), em banco recém-semeado:**

1. `pnpm test:e2e --grep "Arquivar"`, com o trace ou o relatório HTML do Playwright.
2. Nos passos do teste, procurar uma asserção `axe em T11 arquivado`.

**Resultado esperado** (pedido, critério 1): depois de conferir o alerta, o teste chama
`semViolacoes(page, 'T11 arquivado')` sem desligar regra nem excluir elemento, e o axe não acha violação na tela.

**Resultado obtido:** o teste não chama `semViolacoes`. As outras 10 chamadas do arquivo cobrem os estados pendente
com rascunhos, com erro, com o diálogo aberto, sem formulário, pendente, decidido, com o conflito da A-02, segunda
aprovação com erro, aprovado nas duas contas, desatualizado e devolvido (linhas 145 a 343). O arquivado é o único
estado final de decisão sem axe.

**O que não sei:** se a tela arquivada tem violação de axe. Só a execução diz. Se tiver, o pedido manda corrigir em
`src/`, não no teste.

### Defeito D-2 (B-1 da 04-revisao do pedido 0004): o comentário de cabeçalho tem linha órfã, passa de 120 colunas e não cita o arquivado

**Severidade: baixa.** É cosmético: não afeta a execução nem o usuário final, só quem mantém o arquivo.

**Passos para reproduzir:**

1. Abrir `e2e/decisao.spec.ts`, linhas 1 a 26 (o comentário vai até a linha 26; o `import` está na 27).
2. Conferir a linha 7.
3. Medir a largura de cada linha do comentário, em caracteres. O limite do projeto é o `printWidth: 120` do
   `.prettierrc`.
4. Ler a última frase da linha 11.

**Resultado esperado** (pedido, critério 2): o comentário não tem linha órfã, nenhuma linha passa de 120 colunas e o
arquivado aparece entre os estados com axe.

**Resultado obtido:**

- **Linha 7:** tem só `// (08-correcao, A-04: o nível`, e a frase continua na linha 8. É a linha órfã.
- **Linhas acima de 120 colunas** (contei à mão, em caracteres; confirme com a régua do editor):
  - linha 3: 131 colunas (`... (C-36: 30`);
  - linhas 1, 6 e 20: 121 colunas cada.
- **Por que o lint não pegou:** o Prettier não reflora comentário, e o `eslint.config.mjs` não tem `max-len`.
  `pnpm lint` passa com essas linhas.
- **Linha 11:** diz "O axe roda pendente, desatualizado, com erro e decidido." Falta o arquivado. A frase também está
  incompleta ("roda pendente", sem "nos estados") e omite estados que já têm axe (diálogo aberto, sem formulário,
  conflito da A-02, aprovado nas duas contas e devolvido).

### Arquivos suspeitos

| Arquivo | Por quê |
|---|---|
| `e2e/decisao.spec.ts:346-364` | Falta o `semViolacoes(page, 'T11 arquivado')` depois da linha 361 (D-1) |
| `e2e/decisao.spec.ts:1-11` | Linha órfã (7), linhas largas (1, 3 e 6) e estados com axe incompletos (11) (D-2) |
| `e2e/decisao.spec.ts:20` | 121 colunas, no bloco DEC-DEM-20261102-0003-v1, fora das linhas 1 a 11 que a spec cita (ver Pendências) |
| `package.json`, `CHANGELOG.md` | Versão 0.1.4 e entrada nova (definição de pronto) |
| `src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx`, `page.tsx`, `RevisaoDoPacote.tsx` e `src/components/dados-da-decisao.ts:127` | Só se o axe novo acusar violação: são a tela que mostra o alerta "Pacote arquivado" e o estado decidido |

### Casos exploratórios para a regressão (04)

1. **Ordem do axe.** O axe tem de vir depois do alerta da linha 361, para analisar a tela já arquivada e não o
   formulário. Pode vir antes ou depois das conferências pela API (linhas 362 e 363), desde que nenhuma navegação
   aconteça no meio.
2. **Controles intactos.** Sem `disableRules`, `exclude` ou tag a menos, em `e2e/apoio.ts` e no teste. Pré-condição
   (linha 353) e conferências de status (linhas 357, 362 e 363) iguais às da 0.1.3 (critério 3).
3. **Banco repetido.** Com `--repeat-each=3` no mesmo banco e sem `CI`, o "Arquivar" roda na primeira passada e é
   pulado nas outras, com a mensagem "exige banco recém-semeado: ...". O axe do arquivado só roda na primeira, e isso
   é esperado. Não pode haver falha nem pulo sem mensagem (critério 4).
4. **Diff do reflow.** O diff das linhas 1 a 26 deve mudar só linhas que começam com `//`. Nenhuma linha de código
   pode mudar junto (risco citado no RSK).
5. **Tela arquivada com teclado** (manual, se o axe passar): depois de confirmar, o foco vai ao alerta de sucesso,
   como acontece no aprovado (linha 228), e o texto "Decisão registrada: Arquivada, por Pessoa Ficticia CTO em ..."
   aparece.

## Decisões tomadas

- Severidade baixa para os dois. O critério é o impacto no usuário: D-1 é cobertura de teste que falta, sem violação
  comprovada; D-2 é estético.
- Contei as colunas em caracteres, não em bytes, porque o `printWidth` do Prettier mede assim.
- Citei a linha 20 em vez de ignorá-la: está fora das linhas 1 a 11 da spec, mas dentro do comentário de cabeçalho
  que o critério 2 cita.

## Pendências

- Para o `tech-lead` (02-triagem): a spec fala das "linhas 1 a 11", mas o comentário vai até a linha 26, e a linha 20
  também passa de 120 colunas. Decida se o reflow cobre o comentário inteiro (é o que o critério 2 pede) ou só o
  primeiro parágrafo.
- A contagem de colunas foi manual. A 03-correcao ou a 04-regressao deve confirmar com uma ferramenta.
- Não sei se a tela arquivada tem violação de axe: só a primeira execução do teste novo responde. Se tiver, a correção
  entra em `src/` neste mesmo pedido.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
