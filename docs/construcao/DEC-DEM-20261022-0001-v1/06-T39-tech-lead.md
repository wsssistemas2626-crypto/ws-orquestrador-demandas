---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T39-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (T39 e início da T40), 06-T39-engenheiro-frontend.md, git diff d73ca06..0793e00 (src/app, src/components), git show --stat b3e5935 0793e00, e2e/nova-demanda.spec.ts, e2e/editar-demanda.spec.ts, src/modules/demandas/entradas-pendentes.ts, src/modules/acesso/exigir-pessoa.ts, src/modules/acesso/matriz.ts, src/lib/acao-painel.ts, src/lib/log.ts, src/components/rotulos.ts, src/components/formulario.ts, src/components/GrupoOpcoes.tsx, vitest.config.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T39 (T04 Nova demanda e T06 Editar dados), no intervalo `d73ca06..0793e00`. O código e os testes estão no
3bdc321. O b3e5935 e o 0793e00 só mexem em `passagens.jsonl` e na entrega do engenheiro.

**Parecer: aprovada, sem problema Critical nem Important.** Os achados abaixo são Minor e ficam em Pendências, como
manda a seção 12.

### Conferência própria

- `pnpm test` inteiro, numa rodada só: 161 de 161 arquivos e 3.192 de 3.192 testes, em 83,6 s.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: árvore limpa.

### Pareceres por problema (todos Minor)

1. **`src/components/dados-da-demanda.ts:130-146`: rótulos duplicados.** `ROTULOS_DOS_CAMPOS` repete 10 dos 11 rótulos
   de `ROTULO_CAMPO_DEMANDA` (`src/components/rotulos.ts:108-120`).
   - Razão: o histórico (T05) e o resumo de erros (T04/T06) passam a ter duas fontes para o mesmo rótulo e podem se
     afastar. `rotulos.ts` só importa tipos e pode ir ao navegador, então o desvio 1 não impede o reuso.
   - Correção: `{ ...ROTULO_CAMPO_DEMANDA, anexos: 'Anexos (referências)', texto: …, entradaPendenteId: …, 'origem.canal': …, 'origem.referencia': … }`.
     Cabe na T40, que mexe nos mesmos rótulos.
2. **`src/app/(painel)/demandas/[id]/demanda-da-pagina.ts:29-39`: sessão lida duas vezes.** `metadadosDaDemanda` chama
   `exigirPessoa`, e a página chama `exigirPessoaNaPagina`. Cada abertura de `/demandas/[id]` e de `/editar` faz dois
   `getSession` no Better Auth.
   - Razão: custo dobrado de sessão em toda tela de demanda. O `cache` do React só cobre `lerDemandaDaPagina`.
   - Correção: pôr a leitura da pessoa num `cache` do React por requisição, usado pelas duas. Pode ficar para a T40.
3. **`e2e/editar-demanda.spec.ts:93-97` e `e2e/nova-demanda.spec.ts:163-169`: o 404 não confere o status HTTP.** Os
   testes conferem o título e o `h1`, mas não `response.status() === 404`.
   - Razão: o engenheiro deixou de fora o esqueleto da 03 (`Suspense`) justamente para não perder o status 404. Hoje
     nenhum teste segura essa escolha.
   - Correção: `const r = await page.goto(caminho); expect(r?.status()).toBe(404);`. Fica para a `06-T39-testes`.
4. **`src/app/(painel)/demandas/nova/page.tsx:16, 29, 41`: título errado no 404 da entrada.** Com
   `?entrada=<inexistente>`, a aba continua "Nova demanda — …" no 404. O próprio engenheiro registrou isso.
   - Razão: diverge do título da 2.8 que as telas de `[id]` já usam.
   - Correção: `generateMetadata` no mesmo molde de `metadadosDaDemanda`.
5. **`src/components/CamposDaDemanda.tsx:126` e `:163-171`: dica de anexos solta.** A dica "Só a referência: o arquivo
   não é enviado ao sistema." não está ligada a nenhum controle. O botão "Adicionar anexo" só ganha `aria-describedby`
   no limite ou com erro.
   - Razão: quem navega por Tab não ouve a dica. O axe não acusa isso.
   - Correção: ligar `anexos-dica` ao `aria-describedby` do botão, junto com a mensagem de limite quando ela aparecer.
     Vai para o `07-qa-funcional` (G2) e o `ux-ui-design`.

### Desvios 1 a 9 do engenheiro

| Desvio | Parecer | Razão |
|---|---|---|
| 1. `dados-da-demanda.ts` | Aceito | `schemas.ts` e `entrada.ts` puxam o esquema do banco e não vão ao navegador. Os limites copiados têm teste que trava a igualdade com o servidor (`dados-da-demanda.test.ts`). |
| 2. `FormularioEditarDemanda.tsx` | Aceito | É o par `page.tsx` (servidor) + `Formulario*.tsx` (cliente) da T37, da T38 e da própria T04. O plano esqueceu esse arquivo. |
| 3. `[id]/page.tsx` provisória (arquivo da T40) | Aceito | A falha é do plano (05), não do engenheiro. O teste do próprio plano para a T39 (CA-03.2, e "volta à T05" na T06) exige o destino T05. A página tem só o cabeçalho e o alerta de chegada, sem nada do escopo da T40 (dados, versões, status, texto recebido, histórico). |
| 4. `[id]/demanda-da-pagina.ts` | Aceito | Conserta o título do 404 que a T36 trava em e2e. Só chama `notFound()` com pessoa válida, e há e2e para isso. Pela matriz, `ler_demanda` e `alterar_demanda` valem para qualquer pessoa, então dar 404 só depois da sessão não revela nada a quem não tem acesso. |
| 5. `(painel)/not-found.tsx` | Aceito | Conserta o sufixo duplicado do título sem mexer no `not-found.tsx` da raiz nem no `paginas-erro-qa.test.ts` da T36. |
| 6. `demandas/page.tsx` (T38) | Aceito | São 7 linhas, no molde do `aviso=2fa-ativado` da T37. Só um valor fixo mostra o texto, e nada da URL vai para a tela. |
| 7. Testes unitários além do e2e | Aceito | Mesmo critério da T37 e da T38: cobrem pelo `pnpm test` a regra, os textos e o HTML escapado (C-18). |
| 8. Modos ligado e suspenso e "Preencher à mão" fora do e2e | Aceito | Ligar o agente mudaria o banco de todos os e2e. Os três estão no HTML do servidor (`formularios.test.ts`), e o plano só pedia o modo desligado no e2e. |
| 9. `estadoDoAgente` em vez de `orquestradorDisponivel` | Aceito | O booleano não separa desligado de suspenso, e a 03 tem um alerta para cada um. A função é do mesmo módulo da T28. |

### Pontos de risco alto (texto bruto e dado pessoal) conferidos

- `obterEntradaPendente` autoriza `ler_texto_bruto` e confere o uuid antes do banco (`entradas-pendentes.ts:44-53`).
- "Preencher à mão" envia só `entradaPendenteId`, e o servidor usa o texto gravado.
- As duas Server Actions passam por `acaoDoPainel`: pessoa, `autorizar` e Zod sem chave desconhecida.
- As respostas das Server Actions levam só o id. Não há chamada nova de log.
- O texto e o título com `<script>` saem escapados (teste com sentinela).
- `?aviso=` só aceita valores fixos.
- `useConfirmarSaida` só navega para a mesma origem.
- Nenhum dado pessoal real nos testes: só "Pessoa Ficticia" e textos fictícios.

### `pnpm test` e os logs do pino: precisa de correção antes da verificação da P3?

**Não bloqueia.** Rodei `pnpm test` inteiro, em primeiro plano e sem filtro. A saída tem cerca de 33 KB, quase toda de
linhas JSON do pino. A ferramenta guardou a saída inteira, e o resumo final está no fim dela, sem corte: "Test Files 161
passed (161) / Tests 3192 passed (3192)". O corte que o engenheiro viu foi com `--reporter=dot` e `--silent`.

A causa do ruído:
- `src/lib/log.ts:74` escreve direto no descritor 1 (`pino.destination(1)`), por fora do `console`. Por isso o `--silent`
  do Vitest não segura nada.
- Os testes de integração que passam pelo `log` padrão (worker, agentes, better_auth, login) imprimem cada evento.

A correção é dívida de infraestrutura de teste, não da T39. Proposta de dono e forma: `qa-automacao`, numa tarefa
própria. Por exemplo, um `setupFiles` no `vitest.config.ts` que chame `substituirDestinoDoLog({ write() {} })`, com os
testes de log que voltam com `substituirDestinoDoLog(null)` passando a voltar para o mesmo destino mudo. Não usar
`LOG_LEVEL=silent` global: os testes do próprio logger leem o nível de `process.env.LOG_LEVEL` e quebrariam.

A suíte cresce a cada tarefa, e 33 KB hoje viram mais. Por isso convém fazer isso antes de a saída realmente passar do
limite. Quando a verificação da P3 rodar `pnpm test`, o maestro deve ler o fim da saída guardada.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede. Os arquivos fora da lista são os desvios 1 a 6, todos aceitos com razão acima.
- [x] Há teste para cada comportamento novo, visto falhando antes do código: módulo ausente nos unitários, 4 falhas no e2e.
- [x] Nenhum segredo, valor de variável de ambiente ou dado pessoal real.
- [x] Entrada das duas Server Actions validada com Zod pelo adaptador do painel; o erro interno sai com o texto da 2.8.
- [x] Banco: não se aplica (a tarefa não tem migration).
- [x] Nada duplica função existente: reusa a tradução de erros, o id do campo, o adaptador do painel, o registro de entrada e a alteração de demanda. A duplicação de dado (rótulos) é o achado 1, Minor.
- [x] Textos em pt-BR, da 03; axe sem violação nas telas tocadas (46 de 46 no e2e do engenheiro).
- [x] Os achados Minor estão em Pendências; não há Critical nem Important.
- [x] Revisão de código e de segurança do PR: não se aplicam a esta etapa.

## Decisões tomadas

- Aprovar sem devolver: só há achados Minor. Pela seção 12, Minor vai para Pendências e não bloqueia.
- Aceitar a página provisória da T40 (desvio 3): o furo foi do plano, que deu à T39 um teste com destino na T05.
- Não pedir a correção do ruído do pino na T39: a T39 não causou o ruído, e a suíte inteira passa e se lê numa rodada só.
- Li a saída dos meus comandos grandes (diff e testes) pelo arquivo que a própria ferramenta guarda, com a Read, e não
  por /tmp.
- Para achar a T39 no plano, rodei uma busca só de leitura fora da lista Pode. O maestro a liberou, e a liberação está
  registrada em passagens.jsonl.

## Pendências

- **T40 (`engenheiro-frontend`):** o plano (linha 3687) manda criar `src/app/(painel)/demandas/[id]/page.tsx`, mas o
  arquivo já existe. A T40 passa a alterá-lo. Ela deve manter:
  - `generateMetadata` por `metadadosDaDemanda`;
  - `alertaDeChegada`, com `demanda-criada` e `alteracoes-salvas`;
  - o `h1` com o título da demanda, que os e2e da T39 conferem.

  Na mesma tarefa: os achados 1 e 2 desta revisão.
- **`06-T39-testes` (`qa-automacao`):** o achado 3 (status 404 no e2e).
- **`qa-automacao`, tarefa à parte:** destino mudo do pino nos testes, como descrito na seção do `pnpm test`.
- **`07-qa-funcional` e `ux-ui-design`:**
  - o achado 5;
  - as pendências de texto (a) a (d) do engenheiro;
  - o "Voltar" do navegador sem confirmação, o contador a 90 %, o foco no `h1` e a volta do foco depois do diálogo.
- **Minor do engenheiro mantido:** o achado 4 (título do 404 da entrada) e o esqueleto da T06, que ficou de fora para
  não perder o status 404.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 3bdc321, b3e5935 e 0793e00 depois de d73ca06
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat d73ca06..0793e00` — 18 arquivos, 2.262 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d73ca06..0793e00 -- src/app` — diff das páginas, ações e testes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff d73ca06..0793e00 -- src/components` — diff dos componentes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 161 de 161 arquivos, 3.192 de 3.192 testes, 83,6 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat b3e5935 0793e00` — só passagens.jsonl e a entrega do engenheiro

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
