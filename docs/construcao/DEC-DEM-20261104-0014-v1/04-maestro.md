---
pedido: DEC-DEM-20261104-0014-v1
etapa: 04-revisao
agente: maestro
leu: [construir.md seção 3, contrato-passagem.md, pedido.json, 01-qa-funcional.md, 02-tech-lead.md, 03-engenheiro-backend.md, 04-qa-automacao.md, git diff main...HEAD, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/substituicao.test.ts]
status: devolvido
proximo: engenheiro-backend
devolvido_para: 04-correcao
---
## Entrega

Revisei o ramo `construcao/DEC-DEM-20261104-0014-v1` contra a `main` (`89eca46`, 0.1.12). O commit da correção é
`d6df360`, e a entrega da 03 foi regravada em `07b50d4`. A regressão é `21dcddd`. O diff tem 35 arquivos, com 1.367
linhas a mais e 130 a menos. Sem migration. Nada mudou em `src/db/`, `drizzle/`, `.github/` nem no `pnpm-lock.yaml`.

Revisões usadas:
- **Código:** o agente `feature-dev:code-reviewer` leu os módulos, as consultas e a T11. A skill `code-review` não lê o
  repositório do pedido. O maestro conferiu os testes trocados do A-02 (`decidir-versoes.test.ts`, `decisao.test.ts`) e
  a lista dos casos novos de `substituicao.test.ts` e `gerar-substituido.test.ts`.
- **Segurança:** o agente `seguranca-aplicacao`, porque a ESP exige a revisão dele nesta etapa. Ele não gravou arquivo.

### Achados

**Crítico:** nenhum.

**Alto:**
- **S-01** (`seguranca-aplicacao`; conferido pelo maestro em `criar.ts:133` e `substituicao.test.ts:355`).
  - **O que acontece:** uma aprovação feita só pelo CTO substitui uma decisão que exigiu a assinatura da
    administradora.
  - **Por que é possível:** o nível do DEC criado por pessoa vem livre do corpo (`criar.ts:133`), e o
    `fecharAprovacao` (`decidir.ts:157-175`) não compara o nível do aprovado anterior. A `cto` cria o v2 com
    `nivelAprovacaoRequerido: 'cto'` e aprova sozinha a opção B. Com isso, o v1 de nível `cto_e_administradora`, aprovado
    com o documento da administradora na opção A, fica substituído, e só o v2 gera o Pedido de Construção.
  - **O que mudou nesta versão:** antes da 0.1.13, o A-02 impedia isso. O RSK diz que "todas as regras de hoje valem"
    ao substituir e cita a "aprovação que contorna a dupla aprovação ao substituir". O teste `substituicao.test.ts:355`
    trata o contorno como esperado.

**Médio:**
- **S-02** (`seguranca-aplicacao`).
  - **O que acontece:** um Pedido de Construção já copiado do DEC antigo continua valendo do lado do /construir,
    inclusive com a demanda em `em_construcao`. Nada avisa a construção em curso.
  - **Por que não devolve:** está dentro do risco aceito no RSK ("a regra de uso é não usar pedido de DEC substituído").
    O controle, porém, é só processual.

**Baixo:**
- **S-03:** o D1 confere o nome atual do solicitante (`gerar.ts:96`). É o E11 da 01, já existia e foi aceito no 0013.
- **S-04:** arquivar o v2 pendente encerra a demanda e tira o v1 da geração (`transicoes.ts:76` com o M-08). Já existia
  e é decisão da pessoa.
- **Observações do `feature-dev:code-reviewer`, abaixo do limiar dele:**
  - `opcoesDeStatus` (`detalhe.ts:209-210`) não exclui o substituído. Hoje não tem efeito, pelo E7.
  - A aprovação do v2 com a demanda em `em_construcao` não muda o status. É o mesmo ponto do S-02.

**Controles:**
- O `seguranca-aplicacao` conferiu um por um e nenhum destes foi afrouxado: C-10, C-13, C-21, C-23, C-28, A-03, axe,
  C-36 e 2FA. Dupla aprovação: íntegra dentro do DEC, contornável entre DECs (S-01).
- `pnpm audit --prod`: 5 moderadas transitivas, todas já existentes, nenhuma alta.
- Nenhum dado pessoal real no diff.

## Decisões tomadas

- S-01 devolve à `04-correcao`, e não vai a Fabiano como decisão nova. A correção aperta um controle e não muda a
  opção (b): o RSK do pedido já exige que a substituição siga todas as regras de hoje, inclusive a dupla aprovação. O
  dono do arquivo é o `engenheiro-backend` (`decidir.ts`; engenheiro único da 02).
- Correção pedida, a opção (a) do `seguranca-aplicacao`:
  - em `aprovar`, sob a trava e **antes** de `gravarAprovacao`, ler o aprovado vigente da demanda e o nível dele;
  - se o vigente é `cto_e_administradora` e o DEC que vai substituí-lo é `cto`, recusar com 409 e uma mensagem fixa
    nova em `MENSAGENS_DECISAO`, sem gravar aprovação, decisão nem evento;
  - inverter `substituicao.test.ts:355` e acrescentar o caso pela rota `PATCH /api/pacotes-decisao/:decId/decisao`: 409,
    nenhuma linha em `aprovacao` ou `decisao` e nenhum evento de substituição;
  - continua valendo: um DEC `cto_e_administradora` substitui um aprovado `cto`, com as duas aprovações.
- A opção (b) do achado (forçar o nível mínimo no `criar.ts`) fica de fora. A recusa na aprovação já fecha o contorno, e
  o DEC criado com nível menor não aprova, então se cria outro.
- S-02, S-03, S-04 e as observações do revisor de código vão para Pendências, porque o roteiro só devolve crítico e alto.
- Liberação nesta cadeia, só de leitura e pela regra de 25/10: na 03, `cd <repo> &&` antes dos `pnpm`, e `grep`/`tail`
  sobre a saída do próprio `pnpm test`.
- Na 04-regressao, a sessão caiu às 07h47 BRT, durante a 3ª execução do e2e (teste 76, sem falha). Fabiano mandou
  retomar, e a `qa-automacao` fechou com três execuções seguidas de 144/144.

## Pendências

- S-01 (alto): aprovação só do CTO substitui DEC aprovado com a administradora (`decidir.ts:157-175`, `criar.ts:133`, `substituicao.test.ts:355`); recusar com 409 quando o vigente é `cto_e_administradora` e o substituto é `cto`, antes de gravar, com teste no módulo e na rota.
- Para a `04-reteste` (`seguranca-aplicacao`): reteste do S-01 com o commit da `04-correcao`.
- Para a `qa-automacao`, se a correção mexer na T11 ou em `e2e/`: rodar de novo o e2e afetado.
- Para `gestao-riscos`, risco que sobra, e um pedido futuro: S-02 (a `00-inicio` do /construir consultar
  `substituido` no Orquestrador e parar).
- Para um pedido futuro: S-03 (conferir também o nome em vigor quando o DEC foi criado).
- Para a `ux-ui-design`: S-04 (aviso na T11 do DEC pendente quando há um aprovado vigente) e os textos novos da 02.
- Para a `06-documentacao`: o manual diz a regra de nível ao substituir.

## Critério de pronto atendido

- [x] escopo conferido com `git diff main...HEAD --stat`
- [x] revisão de código feita (agente `feature-dev:code-reviewer` e leitura do maestro dos testes trocados)
- [x] revisão de segurança feita (agente `seguranca-aplicacao`, obrigatória pela ESP)
- [x] achados registrados por severidade, com a revisão usada
- [ ] sem achado crítico ou alto aberto (S-01 alto: devolvido à 04-correcao)
