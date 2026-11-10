---
pedido: DEC-DEM-20261104-0014-v1
etapa: 04-reteste
agente: seguranca-aplicacao
leu: [contrato-passagem.md, 01-qa-funcional.md, 02-tech-lead.md, 04-maestro.md, 04-correcao-engenheiro-backend.md, "git show 995ce77", src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/substituicao.test.ts (340-428), src/app/api/pacotes-decisao/decisao.test.ts (440-472), "src/app/api/pacotes-decisao/[decId]/decisao/route.ts", "src/app/(painel)/pacotes-decisao/[decId]/acoes.ts"]
status: pronto
proximo: devops-sre
devolvido_para: null
---
## Entrega

Reteste do único achado crítico ou alto do `04-maestro.md`: o **S-01 (alto)**. Commit da correção: `995ce77`, que é o
HEAD do ramo `construcao/DEC-DEM-20261104-0014-v1` (`git log`: `995ce77`, `919a85e`, `21dcddd`). O commit muda 4
arquivos de código e teste, mais a entrega da correção e o `passagens.jsonl`. Não muda dependência, `pnpm-lock.yaml`,
`src/db/`, `drizzle/` nem `criar.ts`.

### S-01 (alto): aprovação só do CTO substituía DEC aprovado com a administradora

**Veredito: corrigido. Fechado.**

**Evidência no código**
- `src/modules/pacotes-decisao/decidir.ts:191-192`: no ramo de nível `cto` de `aprovar`, `aprovadoVigente` é lido e,
  quando o nível do vigente é `cto_e_administradora`, a função lança `conflito(MENSAGENS_DECISAO.nivelMenorQueOVigente)`
  (409).
  - A guarda vem antes de `gravarAprovacao` (`:193`) e de `fecharAprovacao` (`:194`). Na recusa, a transação não grava
    linha em `aprovacao` nem em `decisao`, nem o evento de substituição.
- `decidir.ts:230` e `:236`: a leitura acontece dentro de `registrarDecisao`, depois de `travarDemanda`, na mesma
  transação (C-13).
  - A criação de DEC (`criar.ts:136`) e as outras decisões da demanda esperam a mesma trava. Não há janela entre a
    conferência do nível e a gravação.
- `src/modules/pacotes-decisao/substituido.ts` (`aprovadoVigente`, no diff do `995ce77`): devolve o DEC aprovado de maior
  `versao` da demanda e o `nivelAprovacaoRequerido` dele. É a mesma consulta que define o "aprovado mais novo"
  (`aprovadoMaisNovo` passou a usá-la). Por isso a guarda e a substituição olham sempre o mesmo DEC.
- `decidir.ts:187` vem antes de `:191`: a administradora num DEC `cto` continua recebendo 403 (P1-b), e a ordem dos
  controles de antes ficou igual.

**Evidência nos testes** (resultado da `04-correcao`: 56 de 56 nos dois arquivos e 4465 de 4465 no `pnpm test`; os
testes foram vistos falhando antes do código, 5 falhas)
- `substituicao.test.ts:363-384` (o teste antigo de `:355`, invertido): v1 `cto_e_administradora` aprovado; v2 `cto`
  aprovado pela `cto` com a opção B e depois com a A.
  - Resultado: 409 com a mensagem fixa nas duas tentativas.
  - Nada é gravado: zero linhas em `aprovacao` e `decisao`, e a contagem de eventos da demanda fica igual.
  - Nenhuma substituição: o v1 fica `aprovada` e não substituído, e `aprovadoMaisNovo` ainda é o v1.
- `substituicao.test.ts:406-420`: a regra vale para o vigente, não só para o primeiro DEC. Depois que um v2
  `cto_e_administradora` substitui um v1 `cto`, um v3 `cto` recebe 409, nada é gravado e fica um único evento
  (v1→v2). Esse caso também confirma que o inverso, nível maior substituindo nível menor, continua permitido.
- `substituicao.test.ts:392-404`: o DEC recusado não trava a demanda. Ele pode ser devolvido, e um v3 de dupla aprovação
  com as duas aprovações substitui o v1.
- `substituicao.test.ts:422-427`: a ordem P1-b vem antes do S-01.
- `decisao.test.ts:448-471`, pela rota `PATCH /api/pacotes-decisao/:decId/decisao`, que é o vetor do achado:
  - 409 com o corpo exato `{ erro: 'conflito', mensagem }`, sem id, nome nem detalhe interno;
  - `semMudanca(v2)` e nenhum evento de substituição;
  - o v1 continua com 2 aprovações e 1 decisão.

**Cobertura dos pontos de entrada**
- A rota (`route.ts:15`) e a Server Action da T11 (`acoes.ts:20`) chamam as duas `registrarDecisao`, e a guarda está no
  domínio. Não há caminho de aprovação que passe por fora dela.
- O nível não muda depois que o DEC é criado. O DEC é uma versão imutável: o papel do app só tem SELECT e INSERT
  (`criar.ts:1-2`, C-34). Um DEC de agente nasce sempre `cto_e_administradora` (`criar.ts:133`, A-04).

### Controles conferidos de novo no diff da correção

- 2FA, `autorizar`, P1-a, P1-b, mesma opção, documento da administradora, revisão de rascunho, desatualizado, A-01, M-08
  e P1-d: nenhuma linha removida ou afrouxada no `995ce77`. A única mudança em `decidir.ts` é a guarda nova, a mensagem
  e o comentário do topo.
- A mensagem nova é texto fixo, sem id, nome nem dado pessoal (`decidir.ts:53-54`, testada em
  `substituicao.test.ts:386-390`).
- Os testes usam só dados fictícios. O diff não tem segredo nem token.

## Decisões tomadas

- S-01 fechado: a guarda está no domínio, sob a trava e antes de qualquer gravação, e tem teste no módulo e na rota que
  falhava antes do código.
- Não exijo a opção (b), que forçaria o nível mínimo no `criar.ts`. A recusa na aprovação fecha o contorno, e o maestro
  já decidiu deixar a (b) de fora.
- `pnpm audit --prod` não foi rodado de novo: o `995ce77` não mexe em `package.json` nem em `pnpm-lock.yaml`, e a
  `04-revisao` já registrou 5 moderadas transitivas, sem nenhuma alta.
- Os comandos `git` foram rodados com `git -C <repo do pedido>`, porque a sessão não roda dentro do repositório. É a
  forma liberada para o repositório do pedido (regra de 25/10, 979eb2f). Para listar os arquivos dos módulos, usei
  `git show HEAD:<pasta>`, porque Grep e Glob não estão disponíveis nesta sessão.

## Pendências

- Limite da verificação: sem Grep nesta sessão, não fiz uma busca textual no repositório inteiro por outro `insert` em
  `decisao`. Conferi os pontos de entrada da decisão (rota e Server Action), o módulo `pacotes-decisao` e a imutabilidade
  do DEC (C-34). Não encontrei outro caminho que grave `aprovada`.
- Ficam como estavam na `04-revisao`, e nenhum deles é crítico ou alto: S-02 (médio, para `gestao-riscos` e um pedido
  futuro), S-03 e S-04 (baixos).
- Para a `qa-automacao`, antes da `05-entrega`: a pendência 2 da `04-correcao`, rodar de novo `e2e/decisao.spec.ts` e
  `e2e/pedido-construcao.spec.ts`. Se um DEC `cto_e_administradora` aprovado sobrar na mesma demanda, a aprovação de um
  DEC `cto` passa a dar 409.
- Para a `ux-ui-design`: o texto `nivelMenorQueOVigente` e um aviso na T11 antes do envio.
- Para a `06-documentacao`: incluir no manual a regra de nível ao substituir.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 995ce77` — diff da correção (6 arquivos, 4 de código e teste)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/modules/pacotes-decisao` — 13 arquivos; não há módulo de edição de DEC
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show HEAD:src/app/api/pacotes-decisao/[decId]` — `decisao/`, `pedido-construcao/`, `route.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -n 3` — `995ce77`, `919a85e`, `21dcddd`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show "HEAD:src/app/(painel)/pacotes-decisao/[decId]"` — 10 arquivos; `acoes.ts` é a Server Action da decisão

## Critério de pronto atendido

- [x] (reteste) cada achado crítico ou alto tem veredito e evidência (arquivo:linha ou teste)
- [x] (reteste) nenhum achado crítico ou alto ficou aberto
