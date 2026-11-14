---
pedido: DEC-DEM-20261111-0018-v1
etapa: 06-T12-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md (T12, G7, G9, G10), 03-ux-ui-design.md (seções 4.1 a 4.9 e 5 a 10), 06-T12-engenheiro-frontend.md, commit 989acf1 (git show e --stat), src/modules/demandas/arquivamento.ts, src/app/(painel)/pacotes-decisao/[decId]/page.tsx (linhas 95 a 254), src/app/(painel)/pacotes-decisao/[decId]/pacote-da-pagina.ts, src/components/dados-da-decisao-vigencia.test.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T12 (avisos (a), (b), (c), dica e chegada do Arquivar; RF-03, RF-05, RF-06, SB-12), commit
`989acf1836600ef6348efaf70044a9ab8f8ff03c`. Nenhum problema Critical ou Important. Aprovada para a `06-T12-testes`.

### Pontos conferidos

1. **Textos idênticos aos da 03, seção 8.** Os oito textos novos de `TEXTOS_DECISAO` em
   `src/components/dados-da-decisao.ts:54-59`, `:100-102` e `:166-167` (`avisoVigente`, `avisoMaisNovoPendente`,
   `avisoNivelMenor`, `dicaArquivarSemMudanca`, `dicaArquivarAprovada`, `dicaArquivarEmAnalise`,
   `sucesso.arquivadaAprovada`, `sucesso.arquivadaEm`) batem caractere a caractere com a tabela da seção 8.
   `dicaArquivar`, `sucesso.arquivada`, `criarPacoteNovo` e `abrirSubstituto` ficaram como estão. O teste
   `dados-da-decisao-vigencia.test.ts:51-69` fixa cada texto inteiro.
2. **Filtros de `avisoDeVigencia`** (`dados-da-decisao.ts`, bloco "vigência (0.4.1)"), contra a 4.2:
   - status final: `FINAL` (`entregue`, `encerrada`) devolve `null` antes de tudo, nos três avisos (teste
     `:135-144`);
   - DEC desatualizado: (a) e (c) exigem `!p.desatualizado`; (b) exige `!n.desatualizado` do pendente (teste
     `:126-129` e `:146`);
   - pendente que não é o mais novo: (a) e (c) exigem `p.id === c.maisNovoId`, e `maisNovoId` vem de
     `d.pacotesDecisao[0]` em `page.tsx:147,158` (teste `:130-134`);
   - (b) com o pendente só do CTO e o vigente de dupla aprovação: `!soCtoSobreDupla(n.nivel,
     p.nivelAprovacaoRequerido)` o barra (teste `:109-112` e, na página, `pagina-vigencia.test.ts:278`);
   - (a) e (c) nunca juntos (um `if` dentro do outro); (b) só com o aberto vigente.
3. **A dica do Arquivar bate com o destino real da T06.** `page.tsx:164` calcula
   `destinoDoArquivamento(d.status, estadoDoVigente(vigente))` com o `vigente` de `vigenteDaDemanda`. O servidor faz a
   mesma conta em `src/modules/pacotes-decisao/decidir.ts:255-256` e `src/modules/demandas/transicoes.ts:110`, com a
   mesma função pura de `src/modules/demandas/arquivamento.ts`. Não há segunda tabela na tela. O caso "já em Em
   análise com vigente desatualizado" cai em `null` e vira "continua em Em análise", como manda a 4.6 (linha 3). O
   teste da página (`pagina-vigencia.test.ts:436-454`) compara a dica do HTML com `dicaDoArquivar` do destino em seis
   estados.
4. **Os avisos não expõem dado de DEC que o usuário não vê.**
   - `vigenteDaDemanda` e `lerPacoteDaPagina(maisNovo.id)` só rodam depois de `exigirPessoaNaPagina`,
     `autorizar(pessoa, 'ler_pacote_decisao')`, do pacote achado, de `autorizar(pessoa, 'ler_demanda')` e da demanda
     achada (`page.tsx:134-151`). O oráculo da G9 está provado em `pagina-vigencia.test.ts:203-238` e no estático
     `test/estatico/vigencia-t11.test.ts`, com casos plantados.
   - Os dois ids citados são DECs da mesma demanda do pacote aberto. A pessoa já tem `ler_pacote_decisao`, que lê
     qualquer DEC (`pacote-da-pagina.ts` não filtra por pessoa), e o mais novo vem da vista da demanda lida com
     `ler_demanda`.
   - Só id que casa `RE_ID_DEC` vira texto ou `href`. O `demandaId` do link de (c) passa por
     `RE_ID_DEMANDA_NA_TELA`. Nenhum nome de pessoa entra nos textos (teste SB-12 (a, b), `:259-278`).
   - A chegada sai do status gravado e do vigente, nunca da URL (`:244-248`). Os `Error` de D-13 têm mensagem fixa,
     sem o valor.
5. **Os avisos só informam.** `pagina-vigencia.test.ts:365-398` compara botões e `disabled`/`aria-disabled` com e sem
   cada aviso.
6. **Acessibilidade.** O aviso é um `Alerta` `atencao` sem `role`, com `[overflow-wrap:anywhere]` no `<p>` e
   `CLASSE_LINK_SOLTO` no link (`page.tsx:240-247`). Ele fica entre o substituído e o desatualizado, na ordem da 4.2.
   O `aria-describedby` do Arquivar não mudou (`FormularioDecisao.tsx:208`).

### Checklist da seção 12 do padrão técnico

- Faz o que o plano pede. Os únicos arquivos fora da lista da T12 são `nivel-do-pedido.test.ts` e
  `recebimento-qa.test.ts`, que só ganharam o dublê de `vigenteDaDemanda` (desvio 1, ratificado abaixo).
- Cada comportamento novo tem teste, e os testes falharam antes do código (43 de 71, com trecho na entrega).
- Sem segredo nem dado pessoal real: ids `DEC-DEM-20991231-*` e "Pessoa Ficticia".
- Entrada externa: só `?aviso=`, comparado com valor fixo. Erro sem vazar valor (D-13).
- Banco: sem migration nem tabela. A T12 só lê.
- Sem duplicação: o destino vem de `destinoDoArquivamento` (T06), os rótulos de `ROTULO_STATUS` e as regex de
  `dados-do-pacote`/`dados-das-etapas`.
- Textos em pt-BR. Nas telas tocadas, o axe passou no `pnpm test:e2e` do engenheiro (290 testes). O axe com cada aviso
  na página fica com a T14, como diz o plano.

### Verificação desta revisão

- Os oito arquivos da tarefa e os tocados: 364 testes de 364.
- `pnpm typecheck` e `pnpm lint`: limpos.

### Desvios do engenheiro: ratificados

1. Dublê de `vigenteDaDemanda` em `nivel-do-pedido.test.ts` e `recebimento-qa.test.ts`: sem ele, a leitura real
   bateria no banco dublê. Nenhuma asserção saiu.
2. O `pendenteMaisNovo` exige `statusDecisao === 'pendente'` na releitura (`page.tsx:161-162`). Isso fecha a corrida
   e só tira aviso.
3. O tipo nomeado `ContextoDaChegada` mantém a assinatura da G7.
4. As asserções a mais no estático só endurecem a guarda.

## Decisões tomadas

- Aprovada sem devolução: nenhum ponto Critical ou Important. Os textos, os filtros, o destino e a visibilidade
  conferem com a 03, a T06 e a G9.
- O desvio da tabela da 4.6, linha 1, é intencional e correto. A 03 chama de "fora das origens" `aprovada`,
  `em_construcao` e `devolvida`. A tela segue a tabela real da T06, que também trata `em_analise`. A dica tem que dizer
  o que o servidor faz, e a T06 é a fonte.

## Pendências

- Minor, `src/app/(painel)/pacotes-decisao/[decId]/page.tsx:164`: `dicaDoArquivar` roda em toda abertura da T11,
  mesmo quando o formulário não aparece (DEC decidido ou não mais novo). Hoje ela só lança com dado incoerente, que o
  CHECK de `pacote_decisao.id` impede (D-13). Mesmo assim, uma incoerência derrubaria uma página que nem mostra a dica.
  Razão para não bloquear: o caso é impossível no banco, e a tela de erro é o comportamento escolhido no D-13. Se
  quiserem, dá para calcular a dica só quando `formulario.tipo` mostra o formulário.
- Para a T14: o axe com cada aviso (a), (b) e (c) em 1280 × 720 e 390 × 844, e o e2e com as demandas da vigência do
  seed da T10. Hoje nenhum e2e confere um aviso.
- Para a `07-qa-funcional`: foco, teclado e leitor de tela nos três avisos, na dica e na chegada (03, seção 9).
- Na 1ª volta, um `git show <hash>:<caminho>` com parêntese sem aspas falhou na sintaxe do shell e não leu nada. Li o
  arquivo pelo Read.
- O texto do `pedido.json` não foi lido nesta etapa. A entrega do engenheiro não traz instrução para mudar de tarefa,
  ler segredo, chamar endereço de fora ou sair do repositório.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/estruturaAutonoma grep -n "## 12" -- docs/construcao/padrao-tecnico.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 989acf1836600ef6348efaf70044a9ab8f8ff03c~1 989acf1836600ef6348efaf70044a9ab8f8ff03c --stat`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "### Task 12" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md` — sem saída
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "T12" -- docs/superpowers/plans/2026-11-13-ws-orquestrador-demandas-sobras-plano.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 989acf1836600ef6348efaf70044a9ab8f8ff03c -- src/components/dados-da-decisao.ts "src/app/(painel)/pacotes-decisao/[decId]/page.tsx" "src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx"`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^## \|^### 4\." -- docs/construcao/DEC-DEM-20261111-0018-v1/03-ux-ui-design.md`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 989acf1836600ef6348efaf70044a9ab8f8ff03c:src/modules/demandas/arquivamento.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "vigenteDaDemanda\|estadoDoVigente\|destinoDoArquivamento" -- src`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "^import\|RE_ID_DEMANDA_NA_TELA =" -- src/components/dados-das-etapas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "criarPacoteNovo:\|RE_ID_DEC =" -- src/components`
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-decisao-vigencia.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts src/components/dados-da-decisao.test.ts "src/app/(painel)/pacotes-decisao/[decId]/pagina.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts" "src/app/(painel)/pacotes-decisao/[decId]/recebimento-qa.test.ts" test/estatico/piso-de-assercoes.test.ts --reporter=dot` — 364 de 364 (8 arquivos)
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm --dir /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "statusDecisao" -- src/modules/pacotes-decisao/consultas.ts`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas grep -n "it(\|describe(" -- "src/app/(painel)/pacotes-decisao/[decId]/pagina-vigencia.test.ts" test/estatico/vigencia-t11.test.ts`

O git show com (painel) sem aspas, da 1ª volta, está no registro (bloqueado e ajuste da 06-T12-revisao em 14/11).

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
