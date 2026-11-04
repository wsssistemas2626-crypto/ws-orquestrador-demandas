---
pedido: DEC-DEM-20261104-0011-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261104-0011-v1` contra a `main` (`fb675ee`, versão 0.1.9). O código de produção
mudou em `src/` (19 arquivos com os testes); o resto são `package.json` (0.1.10) e as entregas. Nada em `src/db/`,
`drizzle/`, `scripts/`, `e2e/` nem `.github/`; sem migration.

- **M-1 do 0009, opção (b) refinada (decisão de Fabiano em 04/11):** `minimizar` troca primeiro o nome completo de cada
  solicitante, sem diferença de caixa nem de acento, e depois cada parte do nome com 3 letras ou mais que, no texto,
  começa por maiúscula. O nome é cortado em espaço, hífen e apóstrofo; partículas e sufixos de parentesco
  (`PARTICULAS_DO_NOME`) ficam de fora. A busca corre sobre uma cópia do texto dobrada sem mudar o comprimento, o que
  cobre o texto em NFD sem alterar o original. Nada é trocado dentro de marcador. A pessoa e o Pedido de Construção
  continuam com o original.
- **Dica e aviso da tela:** `dicaNome` e `avisoMinimizacao` (`src/components/dados-da-demanda.ts`) deixam de prometer
  que o nome nunca chega ao agente.
- **B-3 do 0010:** nos 3 POST, os nomes vêm da linha da demanda travada (`FOR UPDATE`) dentro da transação do serviço
  (`criarXComNomes`, com 4 argumentos); falha nessa leitura desfaz tudo.
- **B-2 do 0010:** `reduzirErro` usa `e.name` só se for texto aceito por `classeAceita`.
- **B-4 do 0010:** `capturarErro` marca o objeto só depois de `captureException`.

Revisões usadas:

- **Código:** li o diff de `src/` e chamei o agente `feature-dev:code-reviewer` (a skill `code-review` não lê o
  repositório do pedido). Sem achado de confiança alta.
- **Segurança:** agente `seguranca-aplicacao`, sobre o commit da correção (`f5b363b`), com a 01, a 02 e a 03. Ele rodou
  `minimizar` em memória com mais de 30 casos de borda e medição de tempo, e não gravou arquivo. A 04-regressao só
  acrescentou testes depois desse commit.

Critérios de aceite:

1. O primeiro nome e o sobrenome, sozinhos e com inicial maiúscula, saem como marcador na entrada do worker e na API de
   quem não é pessoa (`src/modules/dados-pessoais/minimizar.test.ts` e os testes das vistas).
2. Partículas e palavras comuns em minúscula iguais a parte do nome ficam no texto (`minimizar.test.ts`).
3. A pessoa e o Pedido de Construção continuam com o original (`src/app/api/vistas-para-agente.test.ts`,
   `src/app/api/pacotes-decisao/pedido.test.ts`).
4. A dica e o aviso não prometem mais do que o sistema faz, com a ressalva do B-4 abaixo.
5. Nomes do 201 vindos da demanda travada; `name` que não é texto ignorado; erro marcado só depois do envio
   (`src/app/api/demandas/nomes-antes-de-gravar.test.ts`, `src/lib/reduzir-erro.test.ts`, `src/lib/sentry.test.ts`).
6. `pnpm test` 4.081 de 4.081 (26 testes da 04, inclusive integração pelos quatro agentes, as sete leituras e o Pedido), lint e typecheck limpos, e2e 143 de 143 três vezes seguidas (04).

### Achados por severidade

**Crítico e Alto:** nenhum.

**Médio**

- **M-a (já existia na `main`, fora do diff)** (`src/modules/dados-pessoais/detectores.ts:9`, `seguranca-aplicacao`): a
  regex de e-mail tem custo quadrático numa sequência longa de caracteres de usuário sem `@`. Medido: 30 mil
  caracteres levam 1,7 s, e 100 mil levam 20,6 s, no limite do texto bruto. Cada `minimizar` e a busca do Pedido de
  Construção travam o event loop. Só pessoa autenticada dispara. Sugestão: ancorar e limitar a regex
  (`(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,}`, medida em 1 ms), com teste de tempo.

**Baixo**

- **B-1** (`minimizar.ts:97-98`): nome grudado em número, `_` ou CamelCase (`Joana2`, `Joana_Ficticia`,
  `@JoanaFicticia`) sai em claro; o RSK do 0011 não cobre esses formatos.
- **B-2 (já existia)** (detector de e-mail): usuário de e-mail com acento sai cortado (`joã[e-mail removido]`).
- **B-3** (`reduzir-erro.ts:55-60`, `sentry.ts:51`): um getter que lança em `name`, `code` ou `cause`, ou um Proxy, faz
  `reduzirErro` lançar; o erro escapa da `rota()` e fica calado. Sugestão: try/catch dentro de `reduzirErro`.
- **B-4** (`dados-da-demanda.ts:31,36`): o aviso diz "cada parte" sem dizer "com 3 letras ou mais" nem as partículas, e
  a dica não diz que o nome em minúscula sobra.
- **Registro (`feature-dev:code-reviewer`):** palavra com maiúscula igual a parte do nome ("Santos" cidade, "Paulo" em
  "São Paulo") vira marcador, falso positivo aceito na 03.

Segurança: sem achado crítico ou alto. Nenhum segredo, nenhum dado pessoal real e nenhuma dependência nova.

## Decisões tomadas

- M-a e B-1 a B-4 vão para Pendências: o roteiro só devolve Crítico e Alto. O M-a já existia na `main` e não vem desta
  correção; vai num pedido próprio, junto com os baixos.
- Rodei a revisão de código e a de segurança em paralelo com a 04-regressao, sobre o commit da correção, para caber na
  janela de Fabiano (até as 15h30 de 04/11).
- Na triagem, respondi às três ambiguidades da ESP que a 01 levantou: o nome casa também sem acento; hífen e apóstrofo
  separam partes, e sufixos de parentesco entram nas partículas; a parte em comum com o nome de outra pessoa também é
  trocada, porque reduz exposição.

## Pendências

- Para Fabiano: um pedido curto com o M-a (regex de e-mail) e B-1 a B-4 desta revisão; e o pedido 0012 (Pedido de
  Construção sem nome de pessoa, pareceres de 04/11).
- Para a `05-entrega` e a `06-documentacao`: a 0.1.10 no `CHANGELOG.md` (texto na Pendência da 03) e no `deploy.md`.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (leitura do diff de `src/` e agente `feature-dev:code-reviewer`)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, porque a skill `security-review` lê a pasta da sessão)
- [x] achados registrados por severidade, com a revisão usada
- [x] sem achado crítico ou alto aberto
