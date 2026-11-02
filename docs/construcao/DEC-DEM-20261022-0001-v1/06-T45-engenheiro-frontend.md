---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T45-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, 05-tech-lead.md (início), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T43 a T46, rastreabilidade), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T12, 5), 06-T43-tech-lead.md, 06-T44-engenheiro-frontend.md, 06-T44-tech-lead.md, 06-T44-qa-automacao.md, src/modules/agentes/{teto,configuracao,situacao-worker}.ts, src/modules/agentes/configuracao.test.ts (até a linha 80), src/modules/retencao/expurgar.ts, src/modules/acesso/{matriz,ator,exigir-pessoa,destino-seguro}.ts, src/db/schema/agentes.ts, src/app/api/agentes/route.ts, src/app/api/agentes/[agente]/route.ts, src/app/api/configuracao/teto/route.ts, src/lib/{acao-painel,erros,fuso}.ts, src/components/{Interruptor,DialogoConfirmacao,Tabela,Alerta,RegiaoAviso,CampoTexto,Botao,ResumoErros,AvisosDaMoldura,CabecalhoPainel}.tsx, src/components/{formulario,rotulos,dados-do-pedido}.ts, src/components/dados-do-pedido.test.ts (até a linha 40), useConfirmarSaida de src/components/CamposDaDemanda.tsx (pelo git log -L), "src/app/(painel)/layout.tsx", "src/app/(painel)/pacotes-decisao/[decId]/{page.tsx,SecaoPedido.tsx,acoes-pedido.ts,acoes-pedido.test.ts,pagina.test.ts (até a linha 150)}", "src/app/(painel)/demandas/[id]/editar/{page.tsx,FormularioEditarDemanda.tsx,acoes.ts}", scripts/seed-ficticio.ts, test/{sessao,deps}.ts, test/estatico/{exigir-pessoa,painel-qa}.test.ts, playwright.config.ts, e2e/{apoio,servidor,moldura.spec}.ts, e2e/pedido-construcao.spec.ts (até a linha 70), resumo final da saída do pnpm test gravada pela ferramenta em ~/.claude/projects/.../tool-results/bd0kd5rub.txt]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T45 faz a tela T12 Agentes e teto de gasto (`/configuracao/agentes`). Ela segue a 03 (T12), o RF-17 a RF-19, o C-12,
o C-26, o C-31, o RNF-05 e o P1-f.

Portões, todos verdes:
- `pnpm test`: 189 arquivos e 3.664 testes, nenhuma falha. Antes eram 186 e 3.622; os 42 novos estão na lista abaixo.
- `pnpm test:e2e`, a suíte inteira: código 0, com `retries: 0`. São 100 testes em 18 arquivos (`--list`): os 94 de antes e
  os 6 novos de `e2e/agentes-teto.spec.ts`. Nenhum 429.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa. `/configuracao/agentes` é dinâmica.

### O que a tela faz

- **Acesso.** A página começa por `exigirPessoaNaPagina('/configuracao/agentes')`. Depois autoriza
  `ler_configuracao_agentes` e `ler_teto`, as mesmas ações de `GET /api/agentes` e `GET /api/configuracao/teto`. Só
  então lê `situacaoDoTeto`, `listarConfiguracaoAgentes`, `situacaoDoWorker` e `ultimoExpurgo`. As duas contas leem a
  página.
- **Topo.** Vêm o título "Agentes e teto de gasto" (também na aba) e a introdução da 03. Para a conta que não é CTO,
  aparece a nota "Só o CTO altera esta configuração.".
- **Alertas do teto, um por vez:**
  - com teto 0, o de atenção: "Teto não definido: …";
  - com teto definido e atingido, o de erro: "Agentes suspensos: o gasto do mês (US$ x) atingiu o teto (US$ y). Nada é
    chamado até o teto subir ou o mês virar em dd/mm/aaaa.". A data é a de `viraEm`.
- **Alertas do worker (RNF-05):**
  - "O worker não dá sinal há mais de 5 minutos." (atenção);
  - "Há duas instâncias do worker rodando. Deixe só uma: com duas, o teto pode ser ultrapassado." (erro).
- **Gasto do mês.** A linha segue a 03:
  - "Outubro de 2026: US$ 3,20 de US$ 10,00 (32 %)";
  - sem gasto, "… US$ 0,00 de US$ <teto>. Nenhuma chamada este mês.".

  Abaixo vem o formulário do teto:
  - o campo "Teto mensal de gasto (US$)", com a dica da 03 e `inputmode="decimal"`. Aceita vírgula ou ponto;
  - o botão "Salvar teto", que mostra "Salvando…" enquanto envia. O formulário fica com `aria-busy`.

  A validação acontece ao enviar. A do navegador espelha a do servidor, e a que vale é a da Server Action. Com erro:
  - o Resumo de erros recebe o foco;
  - o campo fica com `aria-invalid`;
  - a mensagem da 03 aparece abaixo do campo;
  - o que foi digitado continua no campo.

  Quando salva:
  - "Teto salvo: US$ 10,00." vai para a região de aviso;
  - a página relê o gasto, o alerta e a moldura (`router.refresh`).

  Sair com o valor mudado e não salvo pede confirmação (`useConfirmarSaida`, 2.5).
- **Agentes.** É a tabela com `caption` "Agentes de IA" e as colunas "Agente", "Situação" e "Última mudança".
  - O interruptor é o `Interruptor` do design system: `button role="switch"`, com `aria-checked` e com o nome da 2.6
    ("Agente de risco (RSK)").
  - "Ligado" ou "Desligado" aparece em texto ao lado do interruptor.
  - "Última mudança" mostra "<nome>, <data>", com `<time datetime>`, ou "Nunca alterado".
- **Ligar** abre o diálogo da 03:
  - o título "Ligar o agente de risco?";
  - o texto com o gatilho de cada agente;
  - os botões "Ligar agente" e "Cancelar".

  O diálogo prende o foco e o devolve ao interruptor. Desligar não pede confirmação. Enquanto a mudança vai ao servidor:
  - o interruptor mostra "Alterando…" e fica desabilitado;
  - depois, o foco volta a ele.

  Se der certo, "Agente de risco ligado." ou "Agente de risco desligado." vai para a região de aviso.

  Se ligar falhar com 409, aparece "Não foi possível ligar o agente de <nome>. Ele continua desligado." num alerta de
  erro, que recebe o foco, e o interruptor volta ao estado anterior. O 409 acontece quando o agente não tem modelo com
  preço vigente. O 403 e o erro do servidor mostram os textos da 2.8, nunca a mensagem crua.
- **Último expurgo (C-31).** No fim da página aparece "Último expurgo do texto recebido: <data>." ou "O expurgo ainda não
  rodou.".
- **Administradora (C-12, C-26).** O campo, o botão e os quatro interruptores aparecem desabilitados, e os valores
  continuam legíveis. Quem decide é a matriz: a tela pergunta a `autorizar` se a conta pode `alterar_teto` e
  `alterar_agente`, e a Server Action decide de novo.
- **Server Actions** (`acoes.ts`, `'use server'`, por `acaoDoPainel`):
  - `salvarTetoNoPainel`: `alterar_teto` e `definirTetoSchema`, sobre `definirTeto`. Devolve só `{ tetoMensal }`.
  - `alternarAgenteNoPainel`: `alterar_agente` e o agente por `z.enum(AGENTES)` antes do banco (C-17), sobre
    `alterarAgente`. Devolve só `{ agente, ligado }`. O schema é o da API sem `modelo` (ver Decisões).
  - A autoria vem da sessão (C-11). A linha de log leva só o nome da ação (C-21).
- **Região de aviso.** Há uma só na página (03, 2.3), dividida pelo formulário e pela tabela. Cada ação limpa o aviso antes
  de ir ao servidor, então o mesmo texto de novo também é anunciado. Isso evita o Minor 3 da T44.

### Textos escritos nesta tarefa (a 03 não os previu; o plano manda registrar)

Os quatro primeiros vêm do plano (T45), no estilo da 2.8:
- "O worker não dá sinal há mais de 5 minutos."
- "Há duas instâncias do worker rodando. Deixe só uma: com duas, o teto pode ser ultrapassado."
- "Último expurgo do texto recebido: <data>."
- "O expurgo ainda não rodou."

Os dois seguintes foram compostos a partir da 03:
- O diálogo dos outros três agentes junta o modelo da 03 com o gatilho que ela dá para cada um. Exemplo: "Ligar o agente
  orquestrador?" / "Ele passa a chamar o provedor de IA a cada texto enviado na Nova demanda, dentro do teto mensal. …".
- "Agente orquestrador ligado." e os outros, pelo modelo de "Agente de risco ligado.".

### Arquivos

Todos são novos. Nenhum arquivo que já existia mudou.
- Do plano:
  - `src/app/(painel)/configuracao/agentes/page.tsx`
  - `src/app/(painel)/configuracao/agentes/FormularioTeto.tsx`
  - `src/app/(painel)/configuracao/agentes/TabelaAgentes.tsx`
  - `src/app/(painel)/configuracao/agentes/acoes.ts`
  - `e2e/agentes-teto.spec.ts`
- Fora da lista (desvios 1 a 3):
  - `src/components/dados-dos-agentes.ts` e o teste dele, `src/components/dados-dos-agentes.test.ts`
  - `src/app/(painel)/configuracao/agentes/AvisoDaTela.tsx`
  - `src/app/(painel)/configuracao/agentes/acoes.test.ts`
  - `src/app/(painel)/configuracao/agentes/pagina.test.ts`

### Testes criados (42 unitários e de integração, 6 e2e)

- `src/components/dados-dos-agentes.test.ts` (22):
  - os textos da 03, por inteiro, e os da tarefa;
  - `MENSAGENS_TETO` e `mensagemNaoLigou` iguais às do servidor, nos quatro agentes;
  - o título e o texto do diálogo de cada agente, e os avisos de ligado e desligado;
  - o mês por extenso e a linha do gasto, com gasto, sem gasto e com teto 0;
  - o alerta do teto: o de teto 0, o de suspensão com a data em que o mês vira, e nenhum;
  - o valor do campo, sempre aceito pelo `definirTetoSchema`, e o id do campo igual ao do Resumo de erros;
  - `validarTeto` igual ao `definirTetoSchema` em 21 amostras: vazio, espaços, negativo, três casas, ponto de milhar,
    notação científica e dígito não ASCII;
  - a recusa do teto: 400 no campo; 403 e erro interno no alerta, sem a mensagem crua;
  - a recusa do interruptor: 409 ao ligar com a frase da 03, sem "Não foi possível concluir: "; 403 e erro interno com
    os textos da 2.8;
  - as linhas da tabela, com "Nunca alterado", "<nome>, <data>" e a conta que não existe mais;
  - o texto do expurgo e os alertas do worker.
- `src/app/(painel)/configuracao/agentes/acoes.test.ts` (12, com Testcontainers, banco e Better Auth reais):
  - teto pelo CTO: grava, devolve só o teto e registra o evento com a pessoa da sessão. O mesmo valor de novo não grava;
  - negativo e três casas dão 400 com a mensagem da 03, e nada muda;
  - C-11: a autoria enviada no corpo é descartada;
  - C-12 e C-26: a administradora recebe 403 no teto e no interruptor, e nada muda;
  - sem sessão dá 401, e sem 2FA dá `sem_2fa`;
  - ligar sem modelo dá 409 com a frase da 03, sem evento;
  - o `modelo` enviado pelo painel é descartado;
  - com o modelo gravado pela API: liga e desliga, com os dois eventos. Desligar o que já está desligado não grava;
  - C-17: agente fora da lista, `__proto__`, estado que não é booleano, entrada sem agente e `null` dão
    `entrada_invalida`;
  - C-21: uma linha por chamada, só com os campos da lista, sem o valor, o agente nem o id da conta.
- `src/app/(painel)/configuracao/agentes/pagina.test.ts` (8):
  - a ordem: a pessoa, depois as duas autorizações, depois as quatro leituras, com o banco e o relógio do app;
  - o título da aba;
  - o sistema novo: o `h1`, a introdução, o alerta de teto 0, a linha do gasto, o campo com o rótulo, a dica e
    `inputmode`, a tabela com `caption` e `th scope`, os quatro interruptores desligados com o nome da 2.6, "Nunca
    alterado" quatro vezes, uma região de aviso vazia e nenhum diálogo aberto;
  - a ordem da 03 na página;
  - com dados: a porcentagem, o agente ligado com "<nome>, <time>", o modelo que não aparece e o expurgo com
    `<time datetime>`;
  - a suspensão;
  - os dois alertas do worker;
  - a administradora: a nota antes dos controles, o campo, o botão e os interruptores desabilitados, e os valores
    legíveis.
- `e2e/agentes-teto.spec.ts` (6):
  - estado inicial:
    - o título da aba e o `aria-current` em "Agentes e teto";
    - os quatro interruptores desligados;
    - o alerta de teto 0, a linha do gasto e o campo com "0,00";
    - "Última mudança" igual à de `GET /api/agentes`, e "Nunca alterado" nos três agentes que nenhuma spec liga.
  - salvar teto:
    - "-1" leva ao Resumo de erros com o foco, ao `aria-invalid`, à mensagem no campo e ao valor mantido;
    - "10,123" mostra a mensagem de formato;
    - "10,00" mostra "Teto salvo: US$ 10,00." em `role="status"`, o alerta some e a linha muda;
    - recarregada, a página mostra 10,00, e a API também.
  - ligar o risco:
    - o diálogo da 03;
    - "Cancelar" devolve o foco ao interruptor e não muda nada;
    - "Ligar agente" mostra "Agente de risco ligado.", com `aria-checked="true"` e o foco no interruptor;
    - a API grava a conta "Pessoa Ficticia CTO" com a hora, e a linha mostra o mesmo `<time datetime>`;
    - desligar não abre diálogo e mostra "Agente de risco desligado.".
  - falha ao ligar o agente de consolidação, que não tem modelo:
    - a frase da 03 num `role="alert"` com o foco;
    - o interruptor volta e continua habilitado;
    - "Nunca alterado" continua, e a API confirma que nada foi gravado.
  - administradora:
    - a nota, e o campo, o botão e os quatro interruptores desabilitados, com os valores legíveis;
    - o PUT da API dá 403.
  - expurgo: a data ou "O expurgo ainda não rodou.". No e2e local não há worker; na homologação, pode ter rodado.

  O axe roda em seis estados: inicial, com erro de teto, com o diálogo aberto, com agente ligado, com falha ao ligar e na
  conta administradora. Nenhuma violação.

  A spec passou também com `--repeat-each=2`, no mesmo banco: os testes não dependem da ordem.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-dos-agentes.test.ts "src/app/(painel)/configuracao/agentes"`, antes do código:
```
 FAIL  src/components/dados-dos-agentes.test.ts
Error: Cannot find module './dados-dos-agentes' imported from .../src/components/dados-dos-agentes.test.ts
 FAIL  src/app/(painel)/configuracao/agentes/acoes.test.ts
Error: Cannot find module '/src/components/dados-dos-agentes' imported from .../acoes.test.ts
 FAIL  src/app/(painel)/configuracao/agentes/pagina.test.ts
Error: Cannot find module '/src/app/(painel)/configuracao/agentes/page' imported from .../pagina.test.ts
 Test Files  3 failed (3)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts --max-failures=2`, antes do código:
```
  ✘  1 › estado inicial: … Expected: "Agentes e teto de gasto — WS Orquestrador de Demandas"
                           Received: "Página não encontrada — WS Orquestrador de Demandas"
  ✘  2 › salvar teto 10,00 … Test timeout of 30000ms exceeded.
  2 failed, 4 did not run
```

Depois do código:
- os testes novos passaram de primeira: 3 arquivos, 42 de 42;
- o `typecheck` acusou três propriedades a mais em objetos literais do teste. Corrigi, e ficou limpo;
- o `lint` deu um aviso de variável não usada no teste. Corrigi, e ficou limpo;
- a spec nova passou: 6 de 6, e 12 de 12 com `--repeat-each=2`;
- a suíte inteira passou nos dois portões: 3.664 de 3.664 no `pnpm test`, e código 0 no `pnpm test:e2e`.

### C-36: uso da suíte e2e por conta

A spec nova **não cria nenhuma demanda nem versão**, em nenhuma conta, como a `06-T44-revisao` fixou para a T45. Teto e
interruptor são configuração e não contam em `conferirLimite`. O comentário do topo da spec traz a conta.

| Conta | Demandas antes | Esta spec | Total | Versões antes | Esta spec | Total |
|---|---|---|---|---|---|---|
| "cto" (com as 5 do seed) | 30 | 0 | 30 de 30 | 35 | 0 | 35 de 60 |
| "administradora" | 30 | 0 | 30 de 30 | 35 | 0 | 35 de 60 |

O "antes" vem da tabela da `06-T44-testes`. Das T44 a T46, a T44 e a T45 usaram 0 das 2 demandas. A suíte inteira
terminou com código 0 e `retries: 0`, sem nenhum 429. Nenhum controle de C-36 foi tocado: nada mudou em `limites.ts`, no
seed, no `playwright.config.ts`, em variável de ambiente nem no relógio.

**Estado global.** `agentes-teto.spec.ts` é a primeira spec na ordem alfabética, e o teto e os interruptores valem para o
sistema inteiro. Um agente ligado mudaria a Nova demanda de todas as specs seguintes. Por isso:
- cada teste que altera alguma coisa devolve, num `finally` e pela API, o teto a 0 e os quatro agentes a desligados;
- desligar o que já está desligado não grava nada.

Sobra só o modelo fictício no agente de risco, que não liga nada sozinho.

### Desvios do plano

1. **`dados-dos-agentes.ts` e o teste dele, fora da lista.** Guardam a regra da tela: os textos, a linha do gasto, o
   alerta, a validação espelhada, o diálogo, as linhas da tabela, o expurgo, o worker e o texto de cada recusa. Tudo é
   testado sem tela. É o molde de `dados-do-pedido.ts` e `dados-da-decisao.ts`, aceito na T41 a T44.
2. **`AvisoDaTela.tsx`, fora da lista.** A 03 (2.3) pede uma região de aviso por página. O formulário e a tabela são dois
   componentes de cliente irmãos dentro de um Server Component, e um contexto pequeno é o jeito de os dois usarem a
   mesma região.
3. **`acoes.test.ts` e `pagina.test.ts`, fora da lista.** São o teste de integração da Server Action e o do HTML da
   página, no molde da T43 e da T44.
4. **A falha ao ligar entrou como teste e2e próprio.** O plano a descreve, mas não lista o teste. Ela roda contra o
   servidor de verdade, com o agente de consolidação sem modelo, e não grava nada.

## Decisões tomadas

- **O painel não escolhe o modelo.** A Server Action usa `alterarAgenteSchema.omit({ modelo: true })`. A 03 e o plano
  não preveem o campo, e a entrada pública fica mais estreita. O modelo continua o que a API gravou, e o C-26 deixa o
  preço só por script.
- **O interruptor fica na coluna "Situação".** O `Interruptor` já mostra "Ligado" ou "Desligado" ao lado. Assim a tabela
  tem as três colunas da 03, sem uma coluna sem cabeçalho.
- **Com teto 0 e gasto maior que 0, a linha do gasto sai sem a porcentagem.** Com teto 0 a porcentagem não existe, e a
  03 não prevê esse caso. O alerta de teto 0 explica a situação.
- **"Nenhuma chamada este mês." quando o gasto do mês é 0.** É o dado que `situacaoDoTeto` dá. Não há leitura de chamadas
  no painel.
- **Worker sem sinal é alerta de atenção, e duas instâncias é alerta de erro.** Duas instâncias põem o teto em risco
  (RNF-07). A falta de sinal só atrasa os rascunhos.
- **O alerta de worker sem sinal também aparece quando o worker nunca deu sinal.** `situacaoDoWorker` marca esse caso
  como atrasado. No e2e local, que não sobe o worker, o alerta aparece. O teste não depende dele.
- **A tela mostra os controles habilitados pela própria matriz** (`autorizar` com `alterar_teto` e `alterar_agente`), e
  não por uma comparação de papel escrita na página. Assim, tela e Server Action não divergem.
- **Sem `loading.tsx`.** Nenhuma tela do painel tem um. O "Alterando…" e o "Salvando…" cobrem o carregamento das ações, e
  a página chega pronta do servidor.

## Pendências

- **tech-lead e ux-ui-design: o painel não tem como escolher o modelo do agente.** Os quatro nascem sem modelo, e ligar
  sem modelo dá 409. A tela mostra a frase da 03 nesse caso.
  - Hoje o modelo só se grava por `PATCH /api/agentes/:agente` com `modelo`, com sessão de CTO e `Origin`. O e2e faz assim.
  - Os agentes ficam desligados até a chave da API (CA-E-03), então isso não bloqueia a 0.1.0.
  - Para ligar um agente pelo painel em produção, alguém precisa decidir: ou um campo "Modelo" na T12, com o texto da 03
    e uma tarefa nova, ou um passo no manual técnico (10-documentação) que grave o modelo pela API.
- **ux-ui-design: textos que não estão na 03.** São os quatro de worker e expurgo, que vêm do plano, e os dois compostos
  pelo molde da 03: o diálogo dos outros três agentes e os avisos de ligado e desligado. Estão listados na Entrega.
- **07-qa-funcional (G2):**
  - o diálogo prende o foco e o devolve ao interruptor no "Cancelar" e no Esc;
  - depois de ligar ou desligar, o foco volta ao interruptor;
  - na falha, o foco vai ao alerta;
  - "Alterando…" é anunciado;
  - o interruptor responde ao Espaço e ao Enter;
  - a região de aviso anuncia "Teto salvo", "ligado" e "desligado";
  - o Resumo de erros do teto leva ao campo.
- **Para o maestro: li um arquivo de saída fora do repositório.**
  - O `pnpm test` passou do limite de exibição, e a ferramenta gravou a saída em
    `~/.claude/projects/.../tool-results/bd0kd5rub.txt`. Li só o resumo final.
  - O `pnpm test:e2e` inteiro foi para segundo plano depois de 180 s. O resultado (código 0) veio do aviso de fim da
    tarefa, e a contagem veio do `--list`.
  - Não li nada em `/tmp`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit 3d5ad61 (06-T44-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- src/modules/agentes src/modules/operacao src/modules/retencao src/app src/components src/lib src/worker e2e test` — arquivos existentes
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= --diff-filter=A -- src/modules/acesso src/modules/historico src/db/schema e2e` — arquivos de acesso, histórico, esquema e specs
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log -L '/export function useConfirmarSaida/,+45:src/components/CamposDaDemanda.tsx' --format=%h -1` — o código de `useConfirmarSaida`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-dos-agentes.test.ts "src/app/(painel)/configuracao/agentes"` — FAIL: 3 arquivos falharam (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts --max-failures=2` — FAIL: 2 falharam e 4 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-dos-agentes.test.ts "src/app/(painel)/configuracao/agentes"` — 3 de 3 arquivos, 42 de 42
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — 3 erros de tipo no teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 aviso no teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts` — 6 de 6
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/agentes-teto.spec.ts --repeat-each=2` — 12 de 12
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 189 de 189 arquivos, 3.664 de 3.664 testes
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, a suíte inteira (foi para segundo plano depois de 180 s)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 10 arquivos novos, todos da tarefa
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e --list` — 100 testes em 18 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/configuracao/agentes` dinâmica
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 10 arquivos novos da tarefa e a entrega

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
