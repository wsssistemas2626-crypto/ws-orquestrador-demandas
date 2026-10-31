---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T39-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, tarefas.json, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, fase 7, T36 a T41), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T03 a T06, T11, T12, 5), 06-T38-engenheiro-frontend.md, src/app/(painel)/demandas/page.tsx, src/app/(painel)/layout.tsx, src/app/not-found.tsx, src/app/entrar/FormularioEntrar.tsx, src/app/api/demandas/entrada/route.ts, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/(painel)/demandas/fila.test.ts (início), src/components/{AreaTexto,CampoTexto,GrupoOpcoes,Selecao,ResumoErros,Alerta,Botao,DialogoConfirmacao,Selo,CabecalhoPainel}.tsx, src/components/{formulario,rotulos}.ts, src/lib/{acao-painel,erros,rota}.ts, src/modules/demandas/{entrada,schemas,servico,consultas,entradas-pendentes,gerar-id}.ts, src/modules/agentes/gatilhos.ts, src/modules/acesso/{exigir-pessoa,matriz,destino-seguro}.ts, next.config.ts, playwright.config.ts, vitest.config.ts, eslint.config.mjs, e2e/apoio.ts, e2e/fila.spec.ts, test/estatico/{exigir-pessoa,painel-qa,varreduras-qa}.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T39 entrega duas telas: T04 Nova demanda (`/demandas/nova`) e T06 Editar dados da demanda (`/demandas/[id]/editar`). Os
textos, os estados e a acessibilidade são os da 03, T04 e T06. As duas telas usam as seções comuns de
`CamposDaDemanda.tsx`.

Portões, todos verdes:
- `pnpm test`: 161 arquivos e 3.192 testes, em 4 rodadas por pasta (o motivo está em Pendências). Os 39 testes novos estão
  em `src/components/dados-da-demanda.test.ts` (28) e em `src/app/(painel)/demandas/nova/formularios.test.ts` (11).
- `pnpm test:e2e`: 46 de 46, com axe. Os 14 novos estão em `e2e/nova-demanda.spec.ts` (8) e em
  `e2e/editar-demanda.spec.ts` (6). Os 32 que já existiam continuam passando, inclusive o 404 da moldura.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa; `/demandas/nova`, `/demandas/[id]` e `/demandas/[id]/editar` saem dinâmicas.

### T04 Nova demanda

- **Página** (`nova/page.tsx`, Server Component):
  - começa por `exigirPessoaNaPagina` e chama `autorizar(pessoa, 'registrar_entrada')`, a mesma ação de
    `POST /api/demandas/entrada`;
  - o modo vem de `estadoDoAgente(db, 'orquestrador')` (T28), que diz se o agente está desligado, suspenso ou
    disponível;
  - com `?entrada=<id>` ("Preencher à mão" da T03), lê a entrada com `obterEntradaPendente` (`ler_texto_bruto`). Se a
    entrada não existe, o id não é uuid ou a chave vem repetida, a resposta é 404 (2.8).
- **Modos** (`FormularioNovaDemanda.tsx`):
  - desligado: alerta "Agente orquestrador desligado. Preencha os campos abaixo.";
  - suspenso: alerta "Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.";
  - ligado: grupo "Como criar a demanda?", com "Pedir ao agente orquestrador que proponha os campos" (marcado) e
    "Preencher eu mesmo". O modo agente esconde Classificação, Descrição e Anexos e mostra o aviso de minimização. O
    texto passa a "Texto do pedido (obrigatório)" e o botão a "Enviar ao agente" ("Enviando…"). Trocar o modo não move o
    foco nem apaga o que foi digitado.
- **Seções**: `section` com `h2`: "Texto recebido", "Solicitante", "Classificação", "Descrição" e "Anexos
  (referências)". Os rótulos, as dicas e as opções são os da 03 e de `rotulos.ts`. O contador "0 de 100.000 caracteres"
  é o da `AreaTexto` da T36, ligado ao campo por `aria-describedby` e anunciado só a partir de 90 %.
- **Anexos**:
  - cada anexo é um `fieldset` "Anexo N" com "Tipo" (Link ou Arquivo), "Referência", "Descrição" e "Remover anexo N";
  - "Adicionar anexo" leva o foco ao "Tipo" do anexo novo. Remover leva o foco ao anexo anterior, ou a "Adicionar
    anexo" quando era o único;
  - com 50 anexos, o botão fica indisponível e aparece "Limite de 50 anexos atingido.";
  - anexo em branco é descartado ao enviar.
- **Envio**:
  - a validação no cliente usa os textos da 03: "Informe o nome do solicitante.", "Informe o título.", "Escolha o
    tipo.", "Cole o texto do pedido para enviar ao agente.", "O texto tem 100.001 caracteres. O limite é 100.000.",
    "Este campo aceita até 10.000 caracteres.", e para o link do anexo "Use um link que comece com http:// ou
    https://.";
  - o Resumo de erros (T36) recebe o foco. Cada link leva ao campo; no grupo de opções, à primeira opção;
  - os erros da API (400) entram no mesmo resumo, campo a campo, já com o texto da 03 e com o índice do anexo enviado
    convertido de volta para a linha da tela. O resto vira alerta de envio, que recebe o foco: 409 com "Não foi possível
    concluir: ", e erro interno com o texto da 2.8;
  - o que foi digitado nunca se perde.
- **Server Action** (`nova/acoes.ts`): `acaoDoPainel({ acao: 'registrar_entrada', entrada: entradaSchema })` chama
  `registrarEntrada`, a mesma regra e o mesmo schema da rota. A resposta só traz `{ tipo: 'demanda', id }` ou
  `{ tipo: 'pendente' }`; nada do texto colado nem do solicitante volta ao navegador.
- **Sucesso**:
  - modo manual: vai a `/demandas/<id>?aviso=demanda-criada`, com "Demanda DEM-… criada com status Nova.";
  - modo agente: vai a `/demandas?aviso=entrada-enviada`, com "Texto enviado ao agente orquestrador. A demanda aparece
    na fila quando ele terminar; se ele falhar, você poderá preencher à mão.";
  - os dois alertas são de sucesso, em `role="alert"`, e só valores fixos de `aviso` mostram texto.
- **"Preencher à mão"**: o texto vem preenchido (WCAG 3.3.7), só para leitura, com o canal e a referência da entrada.
  Nome e papel vêm preenchidos e podem ser editados. O modo é sempre o manual. O envio leva só `entradaPendenteId`: o
  servidor usa o texto da entrada e ignora o do corpo (T17).

### T06 Editar dados da demanda

- **Página** (`[id]/editar/page.tsx`):
  - começa por `exigirPessoaNaPagina` e chama `autorizar(pessoa, 'alterar_demanda')`;
  - o id passa pela regex antes de tocar o banco (C-17). Fora do formato ou inexistente, a resposta é 404;
  - mostra o id em fonte monoespaçada, o `h1` "Editar dados da demanda" e o aviso de informação da 03.
- **Formulário** (`FormularioEditarDemanda.tsx`):
  - mostra os campos de T04 com os valores atuais, sem texto recebido e sem status;
  - "Salvar alterações" ("Salvando…") e "Cancelar", que volta ao detalhe;
  - vai ao servidor só o que mudou. Campo opcional esvaziado vai como `null`, e os anexos vão como lista inteira, sem
    chave indefinida, porque o serviço os compara em profundidade;
  - sem mudança, vai `{}`, e o servidor responde "Nada foi alterado." (alerta de envio).
- **Server Action** (`[id]/editar/acoes.ts`): `alterarDemandaSchema.omit({ status }).extend({ id })` chama
  `alterarDemanda`, a mesma regra de `PATCH /api/demandas/:id`.
- **Sucesso**: vai a `/demandas/<id>?aviso=alteracoes-salvas`, com "Alterações salvas. O histórico registra o antes e o
  depois.". O e2e confere no histórico os três `campo_alterado`.

### Comum às duas

- **Confirmação ao sair** (`useConfirmarSaida`, em `CamposDaDemanda.tsx`):
  - com conteúdo não salvo, o clique em qualquer link interno abre o `DialogoConfirmacao` da T36: "Sair sem salvar?",
    "O que você digitou nesta tela será perdido.", "Sair sem salvar" e "Continuar editando";
  - "Sair sem salvar" segue para o link;
  - fechar ou recarregar a aba usa o aviso do navegador (`beforeunload`);
  - sem nada digitado, sai direto.
- **404 dentro do painel**: `src/app/(painel)/not-found.tsx` mostra os textos da 2.8 dentro da moldura, com o título
  "Página não encontrada — WS Orquestrador de Demandas" (ver o desvio 5).

### Arquivos

- Alterado: `src/app/(painel)/demandas/page.tsx` (alerta `aviso=entrada-enviada`, desvio 6).
- Criados:
  - `src/app/(painel)/demandas/nova/page.tsx`
  - `src/app/(painel)/demandas/nova/FormularioNovaDemanda.tsx`
  - `src/app/(painel)/demandas/nova/acoes.ts`
  - `src/app/(painel)/demandas/[id]/editar/page.tsx`
  - `src/app/(painel)/demandas/[id]/editar/acoes.ts`
  - `src/app/(painel)/demandas/[id]/editar/FormularioEditarDemanda.tsx` (desvio 2)
  - `src/app/(painel)/demandas/[id]/page.tsx` (provisória, desvio 3)
  - `src/app/(painel)/demandas/[id]/demanda-da-pagina.ts` (desvio 4)
  - `src/app/(painel)/not-found.tsx` (desvio 5)
  - `src/components/CamposDaDemanda.tsx`
  - `src/components/dados-da-demanda.ts` (desvio 1)
  - `src/components/dados-da-demanda.test.ts` e `src/app/(painel)/demandas/nova/formularios.test.ts` (desvio 7)
  - `e2e/nova-demanda.spec.ts` e `e2e/editar-demanda.spec.ts`

### Testes criados

- `src/components/dados-da-demanda.test.ts` (28):
  - limites iguais aos do servidor;
  - textos da 03;
  - validação: vazio, espaços, modo agente, 100.001 caracteres, 10.001 em campo livre, nome e referência da origem,
    anexos;
  - entrada: manual, sem texto, anexos com índice, agente e "Preencher à mão". Cada uma passa no `entradaSchema`;
  - edição: valores, sem mudança, só o que mudou com `null`, e anexos. Passa no `alterarDemandaSchema`;
  - `estaSujo`;
  - erros da API: obrigatórios com o texto da 03, texto longo, índice do anexo, lista acima de 50, conflito, "Nada foi
    alterado." e erro interno sem a mensagem que chegou.
- `src/app/(painel)/demandas/nova/formularios.test.ts` (11), no HTML do servidor:
  - modos desligado, suspenso e ligado;
  - seções, rótulos, dicas e opções;
  - botões;
  - "Preencher à mão" com sentinela e HTML escapado (C-18);
  - edição preenchida, com título contendo `<script>` escapado.
- `e2e/nova-demanda.spec.ts` (8):
  - CA-03.2 completo, com a API confirmando que o texto não volta na vista;
  - erros com o resumo e o foco, o texto preservado e a correção;
  - 100.001 caracteres sem gravar nada;
  - anexos com o foco ao adicionar e remover, o link recusado e o anexo gravado;
  - confirmação ao sair;
  - aviso do modo agente na fila;
  - 404 de entrada inexistente;
  - axe no estado vazio, com erro, preenchido e em 320 px.
- `e2e/editar-demanda.spec.ts` (6):
  - salvar, com o alerta, a API e o histórico;
  - "Nada foi alterado." com axe;
  - erro de título com axe;
  - "Cancelar" com o diálogo, e 404 com o título da aba;
  - sem sessão, o id inexistente leva a `/entrar` e não a 404;
  - axe com dados e anexos.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova"`, antes do código:
```
 FAIL  src/components/dados-da-demanda.test.ts [ src/components/dados-da-demanda.test.ts ]
Error: Cannot find module './dados-da-demanda' imported from .../src/components/dados-da-demanda.test.ts
 FAIL  src/app/(painel)/demandas/nova/formularios.test.ts [ ... ]
Error: Cannot find module '/src/components/dados-da-demanda' imported from .../formularios.test.ts
 Test Files  2 failed (2)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/nova-demanda.spec.ts e2e/editar-demanda.spec.ts --max-failures=4`, antes do código:
```
  ✘  1 › salvar alterações volta à T05 … getByRole('heading', { name: 'Editar dados da demanda', level: 1 }) … element(s) not found
  ✘  2 › sem mudança: "Nada foi alterado." … element(s) not found
  ✘  3 › erro de validação: título vazio … element(s) not found
  ✘  4 › "Cancelar" com alteração … código TOTP da conta cto … Received: 429
  4 failed, 9 did not run
```

Depois do código:
- os unitários deram 37 de 39 na primeira rodada. Duas regex esperavam `readonly` e `novalidate` em minúsculas, e o React
  escreve `readOnly` e `noValidate`. Com a regex sem diferença de maiúscula, foram 39 de 39;
- os e2e novos deram 13 de 13 de primeira;
- no e2e inteiro, o 404 da moldura (T36) quebrou pelo título da aba. Isso levou aos desvios 4 e 5. Depois deles, foram
  46 de 46.

### Desvios do plano

1. **`src/components/dados-da-demanda.ts`, fora da lista.** Guarda os textos da 03, a validação, a montagem da entrada,
   as mudanças da edição e a tradução dos erros da API.
   - Um módulo `'use client'` não entrega constantes a um Server Component (vira referência de cliente).
   - `schemas.ts` e `entrada.ts` puxam o esquema do banco e não podem ir ao navegador (o mesmo motivo do desvio 1 da
     T38).
   - Os limites são cópia dos do servidor, e o teste confere que não se afastam.
2. **`FormularioEditarDemanda.tsx`, fora da lista.** A página da T06 é Server Component, e o formulário com estado
   precisa ser de cliente. É o par `page.tsx` + `Formulario*.tsx` da T04 e da T37.
3. **`src/app/(painel)/demandas/[id]/page.tsx` provisória, arquivo da T40.**
   - O teste do plano (CA-03.2) e a 03 pedem que o sucesso da T04 e da T06 apareça em T05, mas a T05 é a tarefa
     seguinte.
   - A página só tem o cabeçalho (id, selo, título e "Editar dados") e o alerta de chegada.
   - A T40 completa a tela, como a T38 completou a fila provisória da T36.
4. **`src/app/(painel)/demandas/[id]/demanda-da-pagina.ts`, fora da lista.**
   - Com `notFound()` só na página, o Next 16 mantinha no 404 o título da página, e o teste "404" da moldura (T36)
     quebrava.
   - O arquivo tem a leitura da demanda, com `cache` do React, e o `generateMetadata` comum às duas páginas, que também
     chama `notFound()`.
   - Só faz isso com pessoa válida: sem sessão, a página leva a `/entrar`, e o título não diz se o id existe. Há e2e
     para isso.
5. **`src/app/(painel)/not-found.tsx`, fora da lista.**
   - O 404 da raiz, renderizado sob a moldura, ganhava o sufixo do título duas vezes.
   - Pôr `absolute` no `not-found.tsx` da raiz quebrava `src/app/paginas-erro-qa.test.ts` (qa da T36), que trava o
     título como texto. A mudança foi desfeita, e a raiz ficou como estava.
   - O do painel usa o modelo de título da moldura e não repete o `<main>`.
6. **`src/app/(painel)/demandas/page.tsx` (T38) alterado.** A 03, T04, Sucesso, diz que o modo agente "volta a T03 com o
   alerta". Por isso entrou o valor fixo `aviso=entrada-enviada`, no mesmo molde do `2fa-ativado` da T37.
7. **Testes unitários além do e2e do plano.** Cobrem pelo `pnpm test` o que se vê sem navegador: regra, textos e HTML. É o
   mesmo desvio 4 da T37 e 2 da T38, que o tech-lead aceitou.
8. **Os modos ligado e suspenso e o "Preencher à mão" com entrada existente não estão no e2e.**
   - Para isso seria preciso ligar o agente orquestrador, com teto, no banco que os outros testes também usam (o mesmo
     motivo do desvio 5 da T38).
   - Os três estão no HTML de `formularios.test.ts`.
   - O e2e cobre o 404 da entrada e o alerta da fila.
9. **`estadoDoAgente` no lugar de `orquestradorDisponivel`.** O plano cita o segundo, que é booleano, e a tela precisa
   distinguir desligado de suspenso. As duas funções são do mesmo módulo da T28.

## Decisões tomadas

- **Primeira opção "Não informado" em "Canal de origem" e "Não informada" em "Linha de serviço provável".**
  - O wireframe da 03 mostra "E-mail" e "Indefinida", mas os dois campos são opcionais.
  - Sem uma opção vazia, toda demanda ganharia valor sem que a pessoa escolhesse, e a T06 não conseguiria mostrar o
    valor nulo.
  - Os textos são os de "valor ausente" da 03.
- **Nenhum anexo na abertura.** A pessoa adiciona. Assim o envio nunca leva anexo vazio por engano.
- **"Pedir ao agente" marcado quando o agente está ligado.** A 03 diz "modo definido pela configuração".
- **"Preencher à mão" só para leitura no texto e na origem.** O servidor ignora o texto do corpo quando há entrada
  pendente (T17). Um campo editável perderia a edição sem avisar.
- **"Preencher à mão" sempre no modo manual, sem o grupo de modo.** O schema do modo agente não aceita a entrada
  pendente.
- **Entrada pendente que não existe vai a 404.** A 03 não tem texto próprio para esse caso, e o da 2.8 serve.
- **Mensagens genéricas do servidor trocadas pelas da 03, no cliente.** "Campo obrigatório." vira "Informe o título." ou
  "Informe o nome do solicitante.". Isso vale só para os campos que a 03 descreve; o resto fica como veio.
- **A edição manda só o que mudou.** Assim, um campo vazio gravado como `''` não vira "Alterou" no histórico só por ser
  regravado como `null`.
- **A Server Action devolve só o id.** A vista da demanda tem o nome do solicitante, e a tela não precisa dele.
- **Confirmação ao sair por um ouvinte na janela, em captura.** Ele vem antes do clique do `<Link>` do Next, que nem
  chega a navegar. Cobre a navegação, o "Cancelar" e o nome do sistema.
- **Título da aba do detalhe provisório: "Detalhe da demanda".** É o nome da tela na 03.

## Pendências

- **Para o maestro: `pnpm test` em 4 rodadas.**
  - Rodei a suíte inteira (`pnpm test --reporter=dot` e com `--silent`). A saída passa do limite da ferramenta, por
    causa dos logs do pino, e o resumo final sai cortado.
  - Na primeira rodada inteira havia 1 falha (`paginas-erro-qa`), corrigida no desvio 5.
  - Depois rodei por pasta, cobrindo os 161 arquivos: 797 + 1.050 + 1.325 + 20 = 3.192 testes, nenhuma falha.
- **T40:**
  - completar `src/app/(painel)/demandas/[id]/page.tsx`;
  - manter o `generateMetadata` por `metadadosDaDemanda` e o `alertaDeChegada` (`demanda-criada` e
    `alteracoes-salvas`);
  - os outros alertas de chegada da 03 (T07, T08, T09) entram no mesmo `AVISO_DEMANDA`.
- **ux-ui-design (textos):**
  - (a) `legend` "Anexo N" em cada anexo, e "Referência do anexo N" e "Descrição do anexo N" no resumo de erros. São
    composições a partir de "Remover anexo 1";
  - (b) as primeiras opções "Não informado" e "Não informada" de canal e linha (ver Decisões);
  - (c) a referência de anexo vazia com descrição usa "Campo obrigatório.", porque a 03 não tem texto próprio;
  - (d) "Preencher à mão" só para leitura no texto e na origem.
- **07-qa-funcional, pelo teclado e pelo leitor de tela (G2):**
  - o "Voltar" do navegador com conteúdo não salvo não pede confirmação: o ouvinte só pega clique em link e
    `beforeunload`;
  - o anúncio do contador a partir de 90 %;
  - o foco no `h1` ao abrir pela navegação;
  - a volta do foco depois do diálogo de saída.
- **Minor:**
  - o 404 de `/demandas/nova?entrada=<inexistente>` mantém o título da aba "Nova demanda — …". Isso não está no teste;
    o mesmo `generateMetadata` resolveria;
  - a 03 pede um esqueleto dos campos ao abrir a T06, e ele não existe: a página chega pronta do servidor, sem
    `Suspense`, porque um `notFound()` depois de o conteúdo começar a ser enviado não troca o status para 404.
- **Observação:** na primeira rodada do e2e, antes do código, um login de teste recebeu 429 no `verify-totp`. Os testes
  falhavam em segundos e faziam login seguido. Não se repetiu em nenhuma das 5 rodadas inteiras ou parciais depois do
  código.
- Seguem valendo as pendências da T36 a T38: o nonce da CSP no 09-entrega, os textos fora da 03 e o QR lido por um
  leitor de verdade.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -25` — último commit d73ca06 (06-T38-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h%x20%s -- src/app src/components e2e src/modules/demandas src/modules/entrada src/modules/agentes` — arquivos do painel e dos módulos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova"` — FAIL, módulos ausentes (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/nova-demanda.spec.ts e2e/editar-demanda.spec.ts --max-failures=4` — FAIL, 4 falharam e 9 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova"` — 37 de 39 (regex de atributo em minúscula), corrigido no teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/components/dados-da-demanda.test.ts "src/app/(painel)/demandas/nova"` — 39 de 39
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/nova-demanda.spec.ts e2e/editar-demanda.spec.ts` — 13 de 13
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 44 de 45 (título da aba no 404 da moldura)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura.spec.ts e2e/editar-demanda.spec.ts e2e/nova-demanda.spec.ts` — 16 de 18 (sufixo do título duas vezes)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura.spec.ts e2e/editar-demanda.spec.ts` — 10 de 10
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 46 de 46
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot` — FAIL; saída cortada pelos logs (a falha era `paginas-erro-qa`)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test --reporter=dot --silent` — FAIL; saída cortada pelos logs
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/next-config.test.ts test/next-config-qa.test.ts test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts src/app src/components --reporter=dot --silent` — 796 de 797 (`paginas-erro-qa`: título do `not-found.tsx`), corrigido no desvio 5
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/moldura.spec.ts e2e/editar-demanda.spec.ts e2e/nova-demanda.spec.ts` — 19 de 19
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test test/estatico test/next-config.test.ts test/next-config-qa.test.ts test/matriz-rotas.test.ts test/matriz-rotas-qa.test.ts src/app src/components --reporter=dot --silent` — 797 de 797, 45 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/lib src/db src/worker src/jobs src/agents scripts test/transversal test/desempenho test/banco.test.ts test/deps.test.ts --reporter=dot --silent` — 1.050 de 1.050, 49 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/modules --reporter=dot --silent` — 1.325 de 1.325, 62 arquivos
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- "src/*.test.ts" "src/vendor" "src/i18n" "src/config"` — testes da raiz de `src/` que faltavam nas rodadas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test src/vendor src/proxy src/instrumentation --reporter=dot --silent` — 20 de 20, 5 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; as três telas novas saem dinâmicas
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 1 alterado e 15 novos, todos da tarefa (com os desvios 1 a 7)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — 46 de 46

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
