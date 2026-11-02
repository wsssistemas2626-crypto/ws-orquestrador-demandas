---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T03-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (cabeçalho e G1 a G6 e T01 a T03), 04-seguranca-aplicacao.md (seções 2 e 3), 06-T02-tech-lead.md, 06-T03-engenheiro-backend.md, test/sentinelas.ts, src/lib/erros.ts, commit 1e20426a383cc7ce8b282edb2b0bcf6c5a7616f1, commit 348a1338169f8638ea86ea76d2ac726c84665b34]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T03 (Mapeador único de erro e leitura de corpo com limite, risco baixo, C-20, parte de C-17, RNF-16). O
código está no commit `1e20426`. O `348a133` só regrava a entrega do engenheiro, sem o comando fora da lista Pode, e
acrescenta uma linha ao `passagens.jsonl`. Revisei os dois commits juntos. O `1e20426` cria só os quatro arquivos da
tarefa (`src/lib/erros.ts`, `src/lib/erros.test.ts`, `src/lib/corpo.ts` e `src/lib/corpo.test.ts`), além da entrega e
do registro. Rodei de novo nesta revisão: `pnpm test` (119 de 119), `pnpm lint` e `pnpm typecheck`, todos verdes.

Não há problema Critical nem Important. A passagem segue para a `06-T03-testes`. Os achados abaixo são Minor e vão para
Pendências.

### Conferência contra o plano e os controles

- **Interfaces:** `CodigoErro`, `CampoInvalido`, `ErroDominio`, `CorpoErro`, `STATUS_DO_CODIGO` (400 401 403 403 404
  405 409 413 415 422 429 409 503), `deZod`, `mapearErro` e `lerCorpoJson(req, limiteBytes?)` com padrão de 512 KiB
  seguem o plano. As três exportações a mais (`ExtrasErro`, `MENSAGEM_ERRO_INTERNO` e `LIMITE_CORPO_PADRAO`) só dão nome
  ao que o plano já usa. Aceito.
- **C-20 (`src/lib/erros.ts:83-92`):** só `ErroDominio` sai com status e mensagem dele. Todo o resto vira 500 com a
  mensagem genérica: Postgres, Drizzle, ZodError cru e valor que não é Error. O corpo copia só `campos`, `faltando` e
  `erros`, e não espalha os extras. Isso fecha melhor que o `...e.extras` do plano.
- **Zod sem `input` (`src/lib/erros.ts:50-80`):** nenhuma mensagem do Zod é devolvida. O `input` nunca é usado para
  montar texto. O caminho só leva índice ou identificador, e chave de registro com cara de valor vira `*`.
- **Desvio do `campoAusente` (`src/lib/erros.ts:58-61`):** está certo. No Zod 4 a issue final só traz `input` com
  `reportInput`, e por isso o `i.input === undefined` do plano daria "Campo obrigatório." para todo tipo errado. O teste
  "campo ausente é obrigatório; tipo errado é valor inválido" falharia com o código do plano. Aceito.
- **Desvio da mensagem custom (`src/lib/erros.ts:72`):** o "Invalid input" padrão do `refine` sem mensagem vira
  "Valor inválido.". Isso cumpre a RNF-16, que o código do plano descumpria. Aceito.
- **C-17, parte do 413 (`src/lib/corpo.ts:15-43`):** conta os bytes lidos, para de ler e cancela o leitor ao passar do
  limite, e recusa cedo pelo Content-Length declarado acima do limite. O cabeçalho só serve para recusar e nunca para
  aceitar. Os testes "fluxo sem fim" e "Content-Length declarado acima" provam os dois caminhos. UTF-8 inválido, corpo
  vazio e JSON quebrado viram `entrada_invalida`, e as mensagens não ecoam o corpo.
- **TDD:** a entrega mostra a falha por `Cannot find module './erros'` nos dois arquivos de teste, antes do código. Os
  testes a mais falham sem o código, porque importam o módulo e conferem valor exato.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede, nem mais nem menos; arquivos fora da tarefa não mudaram. Só os quatro arquivos
      da T03 foram criados. Os desvios estão escritos na entrega, e cada um corrige um defeito do código do plano ou
      fecha melhor o C-20.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. São 31 testes novos, com os 7 do plano.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real em código, teste, log ou fixture. Os testes usam só as
      sentinelas de `test/sentinelas.ts` e a origem `127.0.0.1:3101`.
- [x] Entrada externa validada com Zod; erro sem vazar detalhe. A tarefa cria o mapeador que faz isso. Ela não cria
      rota, Server Action nem job: o uso em `rota()` é da T11.
- [x] Banco: não se aplica (sem migration nem tabela).
- [x] Nada duplica função que já existe no repositório. `reduzirErro` reduz o erro para o log, e `mapearErro` monta a
      resposta. São coisas diferentes e não se repetem.
- [x] Textos de interface e axe: as mensagens são as do plano, em pt-BR. O axe não se aplica, porque a tarefa não tem
      tela.
- [x] Minor vai para Pendências; nenhum Critical ou Important sobrou.
- [x] PR (`/code-review`, `/security-review`): não se aplica nesta etapa; fica com a `08-revisao`.

## Decisões tomadas

- Status `pronto`: o C-20 e a parte do C-17 que cabe à T03 estão cobertos por teste, e nenhum achado bloqueia.
- Os quatro desvios do plano estão aceitos: dois corrigem defeito do código do plano (`campoAusente` e mensagem custom
  padrão) e dois só restringem o que sai (caminho seguro e extras por lista).
- O comando fora da lista Pode da primeira volta não entra nesta revisão. Ele já foi tratado pelo maestro e está
  registrado no `passagens.jsonl`, e a entrega regravada não o declara mais.
- Os achados 1 a 4 são Minor: nenhum vaza dado. Nos casos de borda, o código cai na mensagem genérica "Valor
  inválido.", que é segura.

## Pendências

- Nenhuma que segure a passagem.
- Minor 1, para a T13 (testes estáticos): `src/lib/erros.ts:58-61`. O `campoAusente` lê a mensagem padrão do Zod em
  inglês (`received undefined$`). Se alguém trocar o idioma global do Zod (`z.config(z.locales.pt())` ou outro) ou
  der um `error` próprio ao tipo (`z.string({ error: ... })`), todo campo ausente passa a dizer "Valor inválido.", e não
  "Campo obrigatório.". Não vaza nada, mas muda o texto da RNF-16 sem quebrar teste nenhum se a troca for feita fora do
  teste. Na T13, acrescente ao teste estático uma regra que falha se `z.config(` aparecer em `src/`.
- Minor 2, para as tarefas que criam schema de entrada (T14 em diante): `src/lib/erros.ts:48` e `:52`. A chave de
  `z.record` vinda do cliente só vira `*` quando não tem cara de identificador. Uma chave como `PessoaFicticia` (até 64
  caracteres) volta no `campo`. A resposta vai só para quem mandou, mas pela letra do C-20 é valor recebido. A regra é
  não usar `z.record` com chave livre em schema de entrada. Se precisar de mapa, a chave é `z.enum`. O revisor da
  tarefa confere isso.
- Minor 3, para quem escrever `refine` ou `superRefine` (T14 em diante): `src/lib/erros.ts:72`. A mensagem custom passa
  como está. A segurança depende de a mensagem ser fixa, em pt-BR e sem interpolar o valor recebido. O revisor de cada
  tarefa confere isso.
- Minor 4, para as tarefas que criam schema de lista: `src/lib/erros.ts:65`. Lista com `.min(n)` e `n` maior que 1
  também diz "Informe ao menos um item.", o que fica impreciso. Hoje é o texto do plano. Se um schema usar `.min(2)` ou
  mais, a tarefa dele ajusta a mensagem, com teste.
- Segue o Minor do engenheiro para a T11: `rota()` chama `lerCorpoJson` antes do Zod e `deZod` no `safeParse` que
  falhou. O teste de integração do C-20 (violação de `CHECK` com sentinela respondendo sem o sentinela) e o 413 de
  600 KB pela rota ficam com a T11 e a T34.
- Seguem em aberto os Minors das revisões da T01 e da T02, com as tarefas já indicadas nelas.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 348a1338169f8638ea86ea76d2ac726c84665b34` — 2 arquivos: a entrega do engenheiro e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 1e20426` — código da T03: os quatro arquivos de `src/lib/`, a entrega e o `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 348a1338169f8638ea86ea76d2ac726c84665b34` — só tira da entrega o `git grep` e a pendência dele, e acrescenta uma linha ao registro
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 13 arquivos, 119 de 119 passaram
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — árvore limpa no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --stat --oneline -12` — nenhum commit da T03 mexe em arquivo fora da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
