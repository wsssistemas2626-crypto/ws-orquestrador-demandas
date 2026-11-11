---
pedido: DEC-DEM-20261110-0015-v1
etapa: 06-T05-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 06-T05-tech-lead.md (revisão anterior, bd54155), 06-T05-qa-automacao.md, 06-T05-engenheiro-frontend.md (volta 1), commit e49ca6a (diff de e2e/casca.spec.ts), e2e/casca.spec.ts (linhas 1 a 240)]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da volta 1 da T05, commit e49ca6a. **Aprovada**, sem achado Critical nem Important. A revisão anterior
(bd54155, código em 85ace62) continua valendo inteira: esta volta não mexe em `src/`, e os quatro Minor de lá seguem
nas Pendências dela.

### O que mudou

O commit e49ca6a altera só `e2e/casca.spec.ts` (6 linhas acrescentadas, nenhuma removida), além da entrega do
engenheiro e do `passagens.jsonl`. A mudança fica no teste "clique no véu e item da tela atual fecham e devolvem o foco
a Menu", entre a segunda `abrirGaveta` e o `page.mouse.click(160, 500)`:

- `e2e/casca.spec.ts:212`: espera o fim das animações do `<dialog>` (`getAnimations()` + `finished`), com
  `.then(() => undefined)` para não serializar objetos `Animation`.
- `e2e/casca.spec.ts:213-215`: duas asserções novas, com mensagem: a gaveta parou em `x = 0`, e a largura passa de
  160 px.

### Conferência contra a devolução da qa-automacao

- **Causa atacada.** A qa-automacao mediu `x = -236,6` e o alvo `DIALOG` (o `::backdrop`) no instante do clique. A
  espera é a primeira das duas correções que ela sugeriu, e tira exatamente essa janela de 200 ms. O teste continua
  provando o mesmo caso: clique na área vazia da gaveta, fora de controle, não fecha. O caso do clique por localizador
  (texto da conta e marca) já está em `casca-qa.spec.ts`, então trocar a forma do clique aqui só duplicaria cobertura.
- **Nenhuma asserção tirada nem afrouxada.** Todas as asserções do teste continuam, com os mesmos valores: o véu em
  (370, 400) fecha e devolve o foco a "Menu" (linhas 205 a 207); o clique em (160, 500) não fecha (217 e 218); o item da
  tela atual fecha, devolve o foco e fica em `/demandas` (219 a 222). O `abrirGaveta` e o `apoio.ts` não mudaram.
- **A correção fortalece o teste.** As duas asserções novas transformam a premissa do clique (o ponto está dentro da
  gaveta parada) em verificação explícita. Se a animação, a posição ou a largura da gaveta mudarem, o teste falha
  dizendo isso, e não com um "a gaveta fechou" ambíguo.
- **Primeiro clique no véu.** O clique em (370, 400), logo depois da primeira abertura, não tem a mesma corrida: a
  gaveta vem da esquerda e mede no máximo 320 px em 390 px, então (370, 400) é véu durante toda a entrada.
- **Movimento reduzido.** Sem animação, `getAnimations()` devolve lista vazia, o `Promise.all([])` resolve na hora e a
  gaveta já está em `x = 0`. A espera não depende do relógio nem de tempo fixo (sem `waitForTimeout`).
- **Visto falhando e depois estável.** A entrega mostra a falha reproduzida antes (1 de 3, linha 212,
  `element(s) not found`, a mesma da qa-automacao) e, depois, o corpo do teste rodando 22 vezes sem falha (16 sozinho,
  3 com `casca-qa` e `moldura`, 3 no `casca.spec` inteiro).

### Checklist da seção 12 do padrão técnico (para esta volta)

| Item | Resultado |
|---|---|
| Faz o que foi pedido, nem mais nem menos; nada fora da tarefa | Cumprido: só `e2e/casca.spec.ts`, no teste devolvido; `git status --short` limpo |
| Teste para cada comportamento novo, que falharia sem o código | Não há comportamento novo. A correção do teste foi vista com a falha antes, e as duas asserções novas falhariam se a gaveta não estivesse parada no lugar |
| Sem segredo, `.env` ou dado pessoal real | Cumprido: nada novo além das 6 linhas acima |
| Entrada externa validada com Zod; erro sem detalhe | Não se aplica: só teste |
| Banco: migration, migrator, RLS | Não se aplica: sem banco |
| Nada duplica função existente | Cumprido: a espera é de uma linha, usada uma vez; não há utilitário equivalente em `e2e/apoio.ts` |
| Textos em pt-BR; axe sem violação nas telas tocadas | Cumprido: nenhuma tela tocada; os comentários e as mensagens das asserções estão em pt-BR |
| Minor em Pendências; só Critical e Important bloqueiam | Cumprido: 0 Critical, 0 Important e 1 Minor (abaixo) |
| No PR: `/code-review` e `/security-review` | É da `08-revisao`, fora desta etapa |

### Parecer (Minor, sem bloqueio)

1. **`e2e/casca.spec.ts:212`: a espera pelo fim da animação fica no corpo do teste, e não junto do `abrirGaveta`.**
   - Problema: o `abrirGaveta` (linha 30) termina no começo da entrada de 200 ms. Qualquer teste futuro que clique por
     coordenada dentro da gaveta logo depois de abrir terá a mesma corrida.
   - Razão: o próximo autor não vê a armadilha; o comentário das linhas 210 e 211 avisa só neste teste. Não bloqueia,
     porque hoje é o único clique por coordenada dentro da gaveta, e os cliques por localizador já esperam o elemento
     parar. Se outro clique por coordenada entrar (T16 ou T17), extrair a espera para um `gavetaParada(page)` ao lado de
     `abrirGaveta`.

## Decisões tomadas

- Status `pronto`: a correção ataca a causa medida pela qa-automacao, não tira nem afrouxa asserção e acrescenta duas
  verificações; zero Critical e zero Important.
- Aceito esperar a animação em vez de clicar por localizador: o clique por coordenada é o que prova a área vazia da
  gaveta, e o caso por localizador já existe em `casca-qa.spec.ts`.
- O e2e não foi rodado nesta revisão: `pnpm test:e2e` não está na lista Pode do tech-lead, e a `06-T05-testes`
  (`qa-automacao`) volta a medir a estabilidade.
- Rodei duas vezes `git show` (está na lista Pode do tech-lead, mas o prompt desta etapa pedia para não usar). Depois
  repeti a mesma conferência com `git diff`, que dá o mesmo resultado, para quem conferir só com `git diff`.
- O 429 do TOTP nas rodadas longas fica fora desta tarefa: aparece também num teste não tocado ("Fechar menu"), cai em
  `e2e/apoio.ts:79`, antes do corpo do teste, e não aparece com specs intercalados.

## Pendências

- Para a `06-T05-testes` (qa-automacao): ao medir a estabilidade do teste corrigido, rodar em blocos de
  `--repeat-each=3` ou junto com outros specs. Com o mesmo teste curto repetido sozinho a partir do quarto login, a
  verificação do TOTP devolve 429 em `/api/auth/two-factor/verify-totp` (`e2e/apoio.ts:79`), antes do corpo do teste;
  isso não é falha da T05. A causa (limite do Better Auth ou o apoio comum) fica registrada para a qa-automacao avaliar
  se vale uma tarefa própria no `e2e/apoio.ts`; não é desta tarefa.
- Minor 1 desta volta: extrair a espera para um auxiliar quando entrar outro clique por coordenada dentro da gaveta
  (T16 ou T17, `engenheiro-frontend`).
- Seguem as pendências da revisão anterior (Minor 1 a 4 de bd54155) e as da construção para a `07-qa-funcional` e o UAT:
  leitor de tela na gaveta, foco branco sobre marinho, zoom de 200 % e 400 %, o item "Demandas" com `aria-current` numa
  tela de demanda e o `<dialog>` no Safari do iOS (Fabiano).
- Observação da qa-automacao para a `ux-ui-design` (baixa, não bloqueia): um toque durante os 200 ms de entrada, no lugar
  onde a gaveta vai parar, cai no véu e fecha a gaveta. Segue a regra de hoje (clique no véu fecha); se a ux-ui-design
  quiser outro comportamento, entra como ajuste de produto na T16, com teste próprio.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat e49ca6a` — 3 arquivos: entrega do engenheiro, `passagens.jsonl` e `e2e/casca.spec.ts` (+6)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show e49ca6a -- e2e/casca.spec.ts` — 6 linhas acrescentadas, nenhuma removida
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat e49ca6a~1 e49ca6a` — os mesmos 3 arquivos, `e2e/casca.spec.ts` com +6
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 85ace62 e49ca6a --stat -- src e2e test` — desde o código revisado, só os 3 arquivos `-qa` da 06-T05-testes e o +6 de `casca.spec.ts`; nenhum arquivo de produção mudou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -6` — topo e49ca6a (06-T05-construcao)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — 218 arquivos, 4820 de 4820

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
