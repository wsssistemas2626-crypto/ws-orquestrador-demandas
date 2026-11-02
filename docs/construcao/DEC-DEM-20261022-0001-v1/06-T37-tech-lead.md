---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T37-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 2026-10-25-ws-orquestrador-demandas-plano.md (fase 7, T36 e T37), 05-tech-lead.md, 06-T37-engenheiro-frontend.md, 06-T36-tech-lead.md, 03-ux-ui-design.md (2.8, T01 e T02), git diff 9472f19..27e898f, src/lib/qr.ts, src/lib/qr.test.ts, src/lib/auth-cliente.ts, src/lib/auth-cliente.test.ts, src/app/entrar/page.tsx, src/app/entrar/FormularioEntrar.tsx, src/app/entrar/entrar.test.ts, src/app/configurar-2fa/page.tsx, src/app/configurar-2fa/AssistenteDoisFatores.tsx, src/app/configurar-2fa/configurar-2fa.test.ts, e2e/entrar.spec.ts, e2e/configurar-2fa.spec.ts, src/components/Alerta.tsx, src/components/formulario.ts, src/modules/acesso/mensagens.ts, src/modules/acesso/destino-seguro.ts, saída do pnpm test guardada pelo Bash na pasta da sessão]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T37 (T01 Entrar e T02 Configurar verificação em duas etapas) no intervalo `9472f19..27e898f`. O código e os
testes entraram no `672659d`. O `89f1afb` e o `27e898f` só mexem em `passagens.jsonl` e na entrega do engenheiro (o
bloqueio só de leitura). No total, 15 arquivos de código e teste: 12 criados e 3 alterados.

**Veredito: aprovado, `pronto`, `proximo: qa-automacao` (etapa `06-T37-testes`).** Não há Critical nem Important. Os 6
pareceres abaixo são Minor e ficam em Pendências.

Portões conferidos nesta revisão:
- `pnpm test`: 153 arquivos, 2988 de 2988;
- `pnpm lint`: limpo;
- `pnpm typecheck`: limpo.

O `pnpm test:e2e` não está na minha lista Pode. Para ele, vale o 19 de 19 que o engenheiro declarou. Li os 14 testes
novos e cada um confere o que o nome diz.

### O que conferi contra o plano e os controles

- **C-05:** as duas chamadas de `verifyTotp` e a de `verifyBackupCode` passam `trustDevice: false`
  (`FormularioEntrar.tsx:126-127`, `AssistenteDoisFatores.tsx:132`). O e2e "C-05" sai, entra de novo com a senha e
  confere que o passo do código volta. Confere também que o cookie de dois fatores sozinho não abre `/demandas`.
- **C-40:** `destinoSeguro` roda na página, no servidor (`entrar/page.tsx:25`). O formulário só recebe o caminho já
  conferido. Os dois e2e cobrem a URL externa e o caminho do painel com consulta.
- **C-04 (c) e CA-01.2:** `/configurar-2fa` começa por `exigirSessaoParaConfigurar2fa()` (`configurar-2fa/page.tsx:13`).
  O e2e confere quatro coisas: sem sessão, vai a `/entrar`; com sessão sem 2FA, `/demandas` vai a `/configurar-2fa`;
  essa tela não mostra a navegação; e a API devolve 403.
- **CA-01.1 e CA-01.4:** cobertos pelo e2e (login completo; `/cadastro` dá 404, `sign-up/email` é recusado e o login
  dessa conta dá 401).
- **RNF-10:** `mensagemDoErro` decide o texto só pelo status e pelo código (`auth-cliente.ts:60-69`). O teste com
  sentinela prova que a mensagem do Better Auth nunca chega à tela.
- **Textos:** conferi um a um com a 03, T01, T02 e 2.8. Estão iguais, e os testes de `auth-cliente.test.ts` conferem
  os dois conjuntos por inteiro.
- **Segredo e códigos de recuperação:** ficam só no estado do componente. A senha é limpa depois do envio certo. A URL
  do `Blob` é revogada. O QR é SVG no DOM, com os atributos escapados pelo React, e não passa pela CSP de imagem.
- **Teste antes do código:** a entrega mostra as 4 suítes e os 3 e2e falhando antes, pelo módulo ou pela tela ausente.

### Decisão sobre o QR code: o gerador próprio fica

O engenheiro pediu a decisão. Fica `src/lib/qr.ts`, sem biblioteca nova. Não há pendência de dependência para Fabiano.

Conferi o algoritmo contra a norma. Os pontos abaixo estão certos:
- a multiplicação em GF(256) com 0x11D, o divisor e o resto de Reed-Solomon;
- o BCH do formato (0x537, máscara 0x5412) e o da versão (0x1F25);
- a posição das duas cópias do formato e do módulo escuro;
- as tabelas de blocos e de correção do nível M nas 40 versões;
- a fórmula dos módulos de dados (conferi a versão 10: 2768 bits, 346 codewords);
- a posição dos alinhamentos (conferi as versões 8, 10 e 32: 6/24/42, 6/28/50 e 6/34/60/86/112/138);
- o zigue-zague, as 8 máscaras, o terminador, o enchimento 0xEC/0x11 e a intercalação dos blocos curtos.

A penalidade é própria, mas só escolhe a máscara. Um erro nela não deixa o símbolo ilegível.

Por que fica:
1. **Falha segura.** Se o QR sair ilegível, a chave em texto da 03 continua valendo. Se o QR levasse um segredo
   errado, o primeiro código não passaria no `verifyTotp`, e a conta não ativaria com segredo trocado. Não há caminho
   que exponha o segredo nem que ative a conta errada.
2. **Uso único e entrada conhecida.** Uma tela só, com o `totpURI` do Better Auth, de cerca de 150 bytes, entre as
   versões 7 e 10. Esse intervalo está coberto pela leitura de volta nas versões 8 e 10.
3. **Dependência nova custa mais que o código.** Ela pediria a aprovação de Fabiano, entraria no `pnpm audit` e no
   lockfile, e a maioria das bibliotecas devolve SVG em texto (`dangerouslySetInnerHTML`, que a fase 7 proíbe) ou
   imagem `data:` (que a CSP bloqueia). Um módulo puro de 359 linhas, sem rede e com 12 testes, tem risco menor.

A condição para fechar a decisão é a leitura com aplicativo autenticador de verdade no `07-qa-funcional`, que já está
nas Pendências do engenheiro. Se não ler, a T37 volta, e a decisão é revista.

### Pareceres (todos Minor; não bloqueiam)

**Minor 1: a origem do algoritmo não está registrada**
- Onde: `src/lib/qr.ts:1-6`.
- Problema: o módulo segue, função por função, o "QR Code generator library" do Project Nayuki, que tem licença MIT. As
  semelhanças são várias: a fórmula de `modulosDeDados`, o passo dos alinhamentos com `splice(1, 0, pos)`, o
  `((direita + 1) & 2) === 0` do zigue-zague, o divisor com `resultado[grau - 1] = 1` e o enchimento por
  `^= 0xec ^ 0x11`. O cabeçalho só diz "implementações de referência".
- Razão: a MIT pede o aviso de copyright e de licença em cópia ou porção substancial. Hoje o sistema é interno, mas o
  aviso precisa estar no código antes de qualquer entrega a terceiro ou abertura do repositório.
- Caminho: no cabeçalho, citar a fonte (Project Nayuki, QR Code generator library, MIT) e o aviso de licença. Isso cabe
  numa volta da T37 ou na `10-documentacao`, com o `documentacao-tecnica`. Se o engenheiro escreveu o código sem partir
  dessa fonte, basta escrever isso no cabeçalho.

**Minor 2: a leitura de volta não é independente do gerador**
- Onde: `src/lib/qr.test.ts:42-83`, mais precisamente `lerSimbolo`.
- Problema: o leitor do teste usa `mapaDeFuncao` (linha 47), `blocosDaVersao` (61) e `restoReedSolomon` (75), que são
  do próprio `qr.ts`. Com isso, um erro na posição dos alinhamentos ou numa linha da tabela de blocos fora das versões 1,
  5 e 10 sairia igual na escrita e na leitura, e o teste passaria.
- Razão para não bloquear: as peças que vêm da norma estão conferidas contra valores publicados (Reed-Solomon, formato
  e versão). Eu conferi as tabelas e os alinhamentos à mão. A falha é segura (decisão acima).
- Caminho: a leitura com aplicativo de verdade no `07-qa-funcional`. Se a T37 voltar por outro motivo, vale pôr no
  teste a lista de alinhamentos da norma para as versões 2 a 10 contra `mapaDeFuncao`.

**Minor 3: a fila importa o cliente do Better Auth só para ler um texto**
- Onde: `src/app/(painel)/demandas/page.tsx:6`.
- Problema: a página é Server Component e importa `MENSAGENS_2FA` de `src/lib/auth-cliente.ts`. Esse módulo importa
  `better-auth/client` e `twoFactorClient`. O cliente não é criado no servidor (`authClient()` só roda na primeira
  chamada), mas o pacote entra no grafo da página só por causa de uma constante.
- Razão: texto e cliente HTTP mudam por motivos diferentes. A T38 reescreve essa página e vai carregar esse import.
- Caminho: levar `MENSAGENS_ENTRAR` e `MENSAGENS_2FA` para um módulo só de textos, sem import do Better Auth. Pode ser
  `src/lib/textos-auth.ts`, e `auth-cliente.ts` reexporta. Cabe na T38, que já toca a página.

**Minor 4: a forma do erro e o foco no alerta estão escritos duas vezes**
- Onde: `src/app/entrar/FormularioEntrar.tsx:22`, `30-31` e `55-57`, e `src/app/configurar-2fa/AssistenteDoisFatores.tsx:34`,
  `50-51` e `83-85`.
- Problema: o tipo `Erro`, `erroDeCampo`, `erroDeEnvio` e o efeito que leva o foco ao alerta de envio são iguais nas
  duas telas.
- Razão para não bloquear: são duas telas sobre o cliente do Better Auth, fora do `ResultadoAcao` que
  `src/components/formulario.ts` trata. Não há terceira tela desse tipo no plano. Extrair agora criaria um padrão
  paralelo ao de `formulario.ts`.
- Caminho: só extrair se uma terceira tela precisar disso. A Observação B da T36 (`rotulos` constante de módulo) não se
  aplica aqui, porque nenhuma das duas telas usa `errosDoResultado`.

**Minor 5: o seletor de alerta do e2e está escrito duas vezes**
- Onde: `e2e/entrar.spec.ts:16` e `e2e/configurar-2fa.spec.ts:19`.
- Problema: o `alerta(page)` procura o alerta dentro de `main`, para fugir do anunciador de rota do Next, e está
  repetido nos dois arquivos.
- Razão: toda tela da T38 à T46 vai precisar dele.
- Caminho: levar para `e2e/apoio.ts` na T38, junto do `semViolacoes`.

**Minor 6: senha vazia no passo 1 da T02 vira "Senha incorreta."**
- Onde: `src/app/configurar-2fa/AssistenteDoisFatores.tsx:96-101`.
- Problema: sem validação ao enviar, a senha vazia vai ao `enable`, e a resposta 400 mostra "Senha incorreta.". A T01
  tem "Preencha o e-mail e a senha." para esse caso, mas a T02 não tem texto próprio.
- Razão para não bloquear: o texto que aparece é da 03, e a regra está no servidor.
- Caminho: o `ux-ui-design` decide se a T02 ganha "Preencha a senha.". Até lá, fica como está.

### Desvios do engenheiro

| Desvio | Parecer |
|---|---|
| 1. `src/lib/qr.ts` fora da lista | Aceito. A 03 pede o QR, e o plano não trouxe biblioteca. Decisão acima |
| 2. `demandas/page.tsx` (arquivo da T38) | Aceito. A mudança é mínima: só o valor fixo `2fa-ativado` mostra o alerta, e nada da URL vai à tela. A T38 mantém o alerta |
| 3. `e2e/apoio.ts` (arquivo da T36) | Aceito. Segue o padrão do `entrarComo` |
| 4. Arquivos de teste além dos do plano | Aceito. Cobrem pelo `pnpm test` o que dá sem navegador |
| 5. Lista dos e2e da T02 | Aceito. "Marque que guardou…" e o axe dos três passos estão cobertos, só em outra divisão, e sem depender de ordem |
| 6. Sem o esqueleto "Gerando o QR code…" | Aceito. O QR sai na mesma renderização, e a espera real tem o "Verificando…" do passo 1. O `ux-ui-design` ajusta o estado da 03 |
| 7. Sem botão "Tentar de novo" no erro de servidor | Aceito. O botão de envio refaz a chamada, com o que foi digitado mantido |

### Checklist da seção 12

- [x] A tarefa faz o que o plano pede, nem mais nem menos. Os arquivos fora da lista são os desvios 1 a 4, todos
  justificados e aceitos.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código. São 32 unitários e 14 e2e, todos vistos
  falhando antes. A independência da leitura do QR fica com o Minor 2 e o `07-qa-funcional`.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. As contas vêm de `CONTAS_FICTICIAS`, os domínios são
  `.test`, o `totpURI` do teste é fictício e o IP é da faixa 198.18.0.0/15.
- [x] Entrada externa validada e erro sem vazar detalhe. A tarefa não cria rota nem Server Action. Dos parâmetros da
  URL, o `callbackURL` passa por `destinoSeguro`, e `motivo` e `aviso` só são comparados com valor fixo. O erro do
  Better Auth vira texto da 03.
- [x] Banco: a tarefa não tem migration nem acesso a banco.
- [x] Nada duplica função que já existe no repositório. `MENSAGEM_ERRO_INTERNO`, `MENSAGENS_ACESSO`, `destinoSeguro` e
  os componentes da T36 foram reutilizados. A repetição entre as duas telas novas é o Minor 4.
- [x] Textos em pt-BR e iguais aos da 03. O axe passa nos estados vazio, erro e com dados das duas telas e na fila com
  o alerta, pelo e2e declarado.
- [x] O que é Minor está nos pareceres 1 a 6 e em Pendências.
- [x] No PR: não se aplica nesta etapa (`08-revisao`).

## Decisões tomadas

- Aprovo a T37. Os controles de risco alto da tarefa (C-05, C-40, C-04 c) estão no código e no e2e, e nenhum texto vem
  do Better Auth.
- O gerador de QR próprio fica, sem dependência nova. A falha é segura, a entrada é conhecida e uma biblioteca
  traria mais risco e um pedido de aprovação, sem ganho para esta tela.
- Os 6 pareceres são Minor. Nenhum muda comportamento nem segurança da 0.1.0.

## Pendências

- 06-T37-testes (qa-automacao): os testes novos estão em `src/lib/qr.test.ts`, `src/lib/auth-cliente.test.ts`,
  `src/app/entrar/entrar.test.ts`, `src/app/configurar-2fa/configurar-2fa.test.ts`, `e2e/entrar.spec.ts` e
  `e2e/configurar-2fa.spec.ts`.
- 07-qa-funcional:
  - ler o QR code com um aplicativo autenticador de verdade (Google Authenticator ou Microsoft Authenticator). É a
    condição da decisão sobre o gerador próprio. Se não ler, a T37 volta;
  - conferir pelo teclado o foco no `h1`, no título do passo e no alerta de envio, a troca de modo do código e o anúncio
    da região de aviso.
- T38 (engenheiro-frontend):
  - manter o alerta `aviso=2fa-ativado` na fila (desvio 2);
  - levar os textos de `auth-cliente.ts` para um módulo só de textos (Minor 3);
  - levar `alerta(page)` para `e2e/apoio.ts` (Minor 5).
- 10-documentacao (documentacao-tecnica), ou uma volta da T37: registrar no cabeçalho de `src/lib/qr.ts` a fonte e a
  licença MIT do algoritmo (Minor 1).
- ux-ui-design (textos da 03):
  - o 429 do bloqueio por conta dura 15 min, mas o texto diz "um minuto";
  - a falha de cópia da chave usa o texto dos códigos;
  - a T02 não tem 429 próprio;
  - a T02 não tem texto para senha vazia (Minor 6);
  - o estado "Gerando o QR code…" não acontece (desvio 6).
- Seguem valendo as pendências da T36: o nonce da CSP, com o 09-entrega, e os textos fora da 03.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 9472f19..27e898f` — 17 arquivos (15 de código e teste, a entrega e `passagens.jsonl`)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show 27e898f --stat` — só a entrega e `passagens.jsonl`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 9472f19..27e898f -- src/components/CabecalhoPainel.tsx "src/app/(painel)/demandas/page.tsx" e2e/apoio.ts` — os 3 arquivos alterados
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline 9472f19..27e898f` — 672659d, 89f1afb e 27e898f
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat 89f1afb` — só `passagens.jsonl`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 2988 de 2988, 153 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`. O checklist está
  todo cumprido.
