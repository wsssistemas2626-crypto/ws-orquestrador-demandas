---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T40-construcao
agente: engenheiro-frontend
leu: [contrato-passagem.md, pedido.json, padrao-tecnico.md, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6, mapa das fases, T36 fim a T41 início), 03-ux-ui-design.md (1, 2.1 a 2.8, 3, T01 a T06, trecho de T11 e T12), 06-T39-engenheiro-frontend.md, 06-T39-tech-lead.md, "src/app/(painel)/demandas/[id]/{page,demanda-da-pagina}.ts(x)", "src/app/(painel)/demandas/[id]/editar/{page,acoes,FormularioEditarDemanda}.ts(x)", "src/app/(painel)/demandas/{page,fila,FiltrosFila}.tsx", "src/app/(painel)/demandas/nova/{FormularioNovaDemanda.tsx,formularios.test.ts (início)}", "src/app/(painel)/demandas/formularios-paginas-qa.test.ts", "src/app/(painel)/layout.tsx", src/app/error.tsx, src/app/api/demandas/[id]/route.ts, src/app/api/demandas/[id]/historico/route.ts, src/app/api/demandas/entrada/route.ts, src/app/api/pacotes-decisao/[decId]/decisao/route.ts, src/app/api/pacotes-decisao/decisao.test.ts (início), src/components/{rotulos,dados-da-demanda,formulario}.ts, src/components/{Alerta,Botao,CampoTexto,CamposDaDemanda (início),Esqueleto,GrupoOpcoes,Interruptor,RegiaoAviso,ResumoErros,Selo,Tabela}.tsx, src/components/rotulos-qa.test.ts (início), src/lib/{acao-painel,fuso}.ts, src/modules/acesso/{exigir-pessoa,matriz}.ts, src/modules/demandas/{consultas,schemas,servico,texto-recebido,transicoes}.ts, src/modules/especificacoes/{consultas,schemas,servico}.ts, src/modules/pareceres-risco/schemas.ts, src/modules/pacotes-decisao/{schemas,desatualizado}.ts, src/modules/historico/{consultas,registrar}.ts, src/modules/limites.ts, src/db/schema/demandas.ts, scripts/seed-ficticio.ts, playwright.config.ts, vitest.config.ts, e2e/{apoio,fila.spec,editar-demanda.spec,nova-demanda.spec (início),demanda-formularios-qa.spec}.ts, test/estatico/{exigir-pessoa,painel-qa,varreduras-qa}.test.ts]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

A T40 completa a T05 Detalhe da demanda (`/demandas/[id]`). Textos, estados e acessibilidade são os da 03, T05. A página
provisória da T39 foi alterada, e não criada: o `generateMetadata` por `metadadosDaDemanda`, o `alertaDeChegada`
(`demanda-criada` e `alteracoes-salvas`) e o `h1` com o título continuam como estavam.

Portões, todos verdes:
- `pnpm test`: 164 arquivos e 3.289 testes, numa rodada só, sem falha. Os 35 testes novos estão em
  `src/app/(painel)/demandas/[id]/detalhe.test.ts`.
- `pnpm test:e2e`: a suíte inteira terminou com código 0. Os 8 testes novos estão em `e2e/detalhe-demanda.spec.ts`, e os
  que já existiam continuam passando, inclusive os que usam o detalhe como destino (T39 e `demanda-formularios-qa`).
- `pnpm lint` e `pnpm typecheck`: limpos.
- `pnpm build`: passa; `/demandas/[id]` sai dinâmica.

### A tela

- **Leituras** (`page.tsx`, Server Component):
  - na ordem: `exigirPessoaNaPagina`, `autorizar(pessoa, 'ler_demanda')` e a demanda pela regex (C-17), com 404 para id
    fora do formato ou inexistente;
  - depois `autorizar(pessoa, 'ler_historico')` e, havendo ESP, `autorizar(pessoa, 'ler_especificacao')`;
  - em paralelo: `listarHistorico`, `obterTextoRecebido` (a leitura própria de pessoa, `ler_texto_bruto`, T17) e a ESP
    mais nova (`obterEspecificacao`), que traz as dúvidas;
  - as transições vêm de `transicoesManuaisDe` (T15). Se alguma leitura falhar, a falha sobe para a tela de erro da 2.8.
- **Cabeçalho**: id, selo de status e, quando há, o selo "Rascunho de agente". Depois o `h1`, "Editar dados" e a
  navegação `nav aria-label="Nesta página"`. "Dúvidas em aberto" só entra nela quando a seção existe.
- **Alertas de topo** (`alertasDoTopo`), no máximo um de cada, na ordem da 03:
  - **falha de agente (erro)**: vem do último evento `falha_agente` e traz o botão do artefato;
  - **aguardando informação (atenção)**: traz o link "Veja as dúvidas em aberto." quando há dúvidas;
  - **pacote desatualizado (atenção)**: vale para o DEC mais novo;
  - **agente trabalhando (informação)**: vem de `agentesEmAndamento` (T-03).
- **Dados**: lista `dl` com os 12 rótulos da 03. Valor ausente aparece como "Não informado" e lista vazia como "Nenhum
  anexo.". Cada anexo é texto ("Link: … — …"), nunca link (C-18).
- **Dúvidas em aberto**: `ol` com "Da ESP-…-vN." ou "Do agente orquestrador, na entrada.", e a nota de que nada é enviado
  (CA-15.3).
- **Versões**: três `h3`, cada um com o botão de versão nova e a tabela (Versão, Criada em, Criada por, Situação, Ação).
  - Selos: "Rascunho de agente", o selo da decisão e "Desatualizado".
  - As ações "Ver" e "Abrir decisão" têm `aria-label` com o id da versão.
  - Se faltar ESP ou RSK, no lugar de "Novo pacote de decisão" aparece "Para criar um pacote de decisão… Falta: …".
  - Cada lista vazia mostra o texto da 03.
- **Mudar status** (`MudarStatus.tsx` e `acoes.ts`):
  - mostra "Status atual: …" e o grupo "Novo status" com as transições do RF-07;
  - Aprovada sem pacote aprovado e atualizado, ou Em construção num Estudo, fica no grupo com `aria-disabled` e o motivo
    da 03 em `aria-describedby`;
  - em status final, mostra o texto da 03 e nenhum grupo. Na demanda aprovada, mostra a dica fixa;
  - sem opção marcada, o Resumo de erros mostra "Escolha o novo status." e recebe o foco;
  - um 409 vira alerta "Não foi possível concluir: …", que recebe o foco;
  - no sucesso, "Status alterado para …" aparece na Região de aviso (`role="status"`) e o `router.refresh()` atualiza o
    selo, as opções e o histórico;
  - a Server Action é `acaoDoPainel({ acao: 'alterar_demanda' })` sobre `alterarDemanda` com só o status, a mesma regra
    de `PATCH /api/demandas/:id`. A resposta leva só o id e o status.
- **Texto recebido** (`TextoRecebido.tsx`):
  - `details` fechado, com o aviso de dado pessoal e "Será apagado em <data>";
  - campos Recebido em, Canal de origem, Referência da origem e Texto, este num `pre` com `whitespace-pre-wrap`;
  - depois do expurgo, a data e o prazo de retenção da configuração; sem texto, "Esta demanda foi criada sem texto
    colado.".
- **Histórico** (`Historico.tsx`): tabela com o `caption` da 03 e as colunas Data e hora, Quem, O que aconteceu, Antes e
  Depois.
  - Os textos dos eventos e o ator vêm de `rotulos.ts`.
  - Antes e Depois só têm valor nas enumerações gravadas. Texto livre, que fica gravado como "alterado" (C-30), e valor
    fora da enumeração aparecem vazios.
- **Âncoras** (`LinkNestaPagina.tsx`): o clique leva o foco ao `h2` (`tabindex="-1"`). A âncora continua a do navegador.

### Achados da 06-T39-revisao

- **Achado 1 (rótulos duplicados): feito.** `ROTULOS_DOS_CAMPOS` agora é `{ ...ROTULO_CAMPO_DEMANDA, texto,
  entradaPendenteId, 'origem.canal', 'origem.referencia', anexos: 'Anexos (referências)' }`. Os valores não mudaram, e os
  testes da T39 passam sem edição.
- **Achado 2 (sessão lida duas vezes): não feito.** O motivo está em Pendências.

### Arquivos

- Alterados:
  - `src/app/(painel)/demandas/[id]/page.tsx` (a provisória da T39)
  - `src/app/(painel)/demandas/formularios-paginas-qa.test.ts` (desvio 3)
  - `src/components/rotulos.ts` (`ROTULO_CANAL_ORIGEM` e `ROTULO_TIPO_ANEXO`, desvio 4)
  - `src/components/dados-da-demanda.ts` (achado 1)
- Criados:
  - `src/app/(painel)/demandas/[id]/acoes.ts`
  - `src/app/(painel)/demandas/[id]/MudarStatus.tsx`
  - `src/app/(painel)/demandas/[id]/TextoRecebido.tsx`
  - `src/app/(painel)/demandas/[id]/Historico.tsx`
  - `src/app/(painel)/demandas/[id]/detalhe.ts` (desvio 1)
  - `src/app/(painel)/demandas/[id]/LinkNestaPagina.tsx` (desvio 2)
  - `src/app/(painel)/demandas/[id]/detalhe.test.ts` (desvio 1)
  - `e2e/detalhe-demanda.spec.ts`

### Testes criados

- `src/app/(painel)/demandas/[id]/detalhe.test.ts` (35):
  - **alertas**: recém-criada, falha de cada agente (1 e 3 tentativas), falha resolvida ou agente rodando de novo,
    orquestrador e evento sem agente, aguardando com e sem dúvidas, pacote desatualizado (só o mais novo), trabalhando, e
    os quatro juntos na ordem;
  - **status**: transições, Aprovada indisponível, Estudo, status final;
  - **versões e dúvidas**: o que falta para o pacote, as três origens das dúvidas, autoria;
  - **histórico**: Antes e Depois por enumeração, nulo, texto livre e valor fora da enumeração;
  - **HTML das partes**: `Historico`, `TextoRecebido` nos três estados (com sentinela e `<script>`/`<img>` escapados) e
    `MudarStatus` (grupo, `aria-disabled`, dica, final, dica fixa);
  - **HTML da página**, com dublês de sessão e leituras e a matriz real:
    - ordem de autorização e leitura;
    - navegação e `h2`;
    - `dl` com "Não informado";
    - anexos como texto e título escapado (C-18);
    - versões vazias e o motivo do pacote;
    - CA-26.2 e CA-15.3 no HTML;
    - alerta de chegada;
    - C-17 sem leitura;
    - falha de leitura que sobe.
- `e2e/detalhe-demanda.spec.ts` (8):
  - **CA-26.2**: quatro versões, "Desatualizado", "Decisão pendente", alerta, histórico com a pessoa e com o Sistema,
    links e axe;
  - **CA-07.3**: de Em construção a Entregue pela tela, com a Região de aviso, o texto do status final, o selo, a linha do
    histórico (pessoa, "Mudou o status", "Em construção" → "Entregue") e a API;
  - **409**: ESP gravada depois de a tela abrir, alerta com foco, status sem mudança, axe; ao recarregar, a opção com
    `aria-disabled` e a descrição acessível;
  - **sem opção marcada**: resumo com foco e o link que leva à primeira opção;
  - **CA-15.3**: dúvidas da ESP v2 e não da v1, a nota, o link do alerta e a navegação "Nesta página" levando o foco ao
    `h2`, axe;
  - **texto recebido**: fechado, aberto com o aviso, o `pre`, canal e referência, axe; e a demanda sem texto;
  - **C-18**: título, solicitante, contexto, anexo e texto recebido com `<script>` e `<img onerror>`, todos literais,
    nenhum `img` nem `script` em `main`, `window.__xss` indefinido e nenhum diálogo;
  - **axe** na recém-criada com anexo e em 320 px, sem rolagem horizontal.

### Teste escrito antes e visto falhando

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe.test.ts"`, antes do código:
```
 FAIL  src/app/(painel)/demandas/[id]/detalhe.test.ts [ src/app/(painel)/demandas/[id]/detalhe.test.ts ]
Error: Cannot find module '/src/app/(painel)/demandas/[id]/detalhe' imported from .../detalhe.test.ts
 Test Files  1 failed (1)
```

`pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/detalhe-demanda.spec.ts --max-failures=3`, antes do código:
```
  ✘  1 › CA-26.2 … getByText('ESP-DEM-20261031-0006-v1', { exact: true }) … element(s) not found
  ✘  2 › CA-07.3 … locator('section').filter({ has: getByRole('heading', { name: 'Mudar status', level: 2 }) }) … element(s) not found
  ✘  3 › 409 ao mudar status … getByRole('radio', { name: 'Aprovada' }) … element(s) not found
  3 failed, 5 did not run
```
A preparação pela API (ESP, RSK, DEC e aprovação) funcionou: os três testes chegaram à página e falharam na tela.

Depois do código:
- **unitários**: 34 de 35 na primeira rodada, porque uma regex esperava `href` antes de `aria-label`. Com a regex sem
  ordem de atributo, 35 de 35;
- **QA da T39**: `formularios-paginas-qa.test.ts` quebrou em 8 testes (desvio 3). Depois do ajuste, 374 de 374 em
  `src/app/(painel)` e `src/components`;
- **e2e novos**: 6 de 8 na primeira rodada. Os dois que falharam acusaram `target-size` do axe em controles que ficavam
  sob o cabeçalho fixo depois de a página rolar (desvio 8). Depois, 8 de 8.

### Desvios do plano

1. **`detalhe.ts` e `detalhe.test.ts`, fora da lista.**
   - `page.tsx` do Next só pode exportar os nomes da página. A regra (alertas, opções de status, falta para o pacote,
     dúvidas, Antes e Depois) e os textos precisam de outro módulo, que também vai ao navegador (`MudarStatus.tsx`). Por
     isso ele só importa tipos dos módulos.
   - Os testes unitários seguem o critério já aceito na T37, na T38 e na T39 (desvio 7): o que se vê sem navegador fica
     no `pnpm test`.
2. **`LinkNestaPagina.tsx`, fora da lista.** A 03 pede o foco no `h2` ao seguir uma âncora. O navegador só rola e move o
   ponto de partida do Tab, então é preciso um clique de cliente. O e2e confere o foco.
3. **`formularios-paginas-qa.test.ts` (qa-automacao, da `06-T39-testes`) alterado.** Ele testava a página provisória.
   - A fixture de `DemandaVista` não tinha `especificacoes`, `pareceresRisco`, `pacotesDecisao` nem
     `agentesEmAndamento`, e o dublê de `obterDeps` não tinha `config`.
   - A página agora também lê o histórico e o texto recebido, e autoriza `ler_historico`.
   - O que mudou no teste:
     - as quatro listas vazias na fixture e `config.retencaoDias` no dublê;
     - dublês de `listarHistorico`, `obterTextoRecebido` e da Server Action `./[id]/acoes`;
     - `ler_demanda` conferido como a primeira autorização (`toHaveBeenNthCalledWith(1, …)`), e não como a única;
     - o nome do `describe`, sem "provisória".
   - Nenhuma outra asserção mudou.
4. **`rotulos.ts` ganhou `ROTULO_CANAL_ORIGEM` e `ROTULO_TIPO_ANEXO`.** Pela G3.11, os rótulos de enumeração vêm só dele.
   Os textos são os das opções da T04.
5. **`obterEspecificacao` além das leituras listadas no plano.** O plano cita `obterDemanda`, `listarHistorico`,
   `obterTextoRecebido` e `transicoesManuaisDe`, mas o CA-15.3 pede as dúvidas da ESP mais nova, e a vista da demanda só
   traz o resumo das versões. A leitura é só da ESP mais nova, com `ler_especificacao` autorizado antes.
6. **Estado "Carregando" (esqueleto) não implementado.** Pelo mesmo motivo da T06 na T39: com `Suspense` ou `loading.tsx`,
   o `notFound()` não troca mais o status para 404, e o `demanda-formularios-qa.spec.ts` trava o 404. A página chega pronta
   do servidor.
7. **Os e2e usam a conta "administradora", menos dois.** O limite de 30 demandas por hora (C-36) conta por ator, e os
   outros e2e criam com a "cto", como fez o `demanda-formularios-qa.spec.ts`. CA-07.3 e o 409 usam a "cto", porque só ela
   aprova DEC de nível "cto" (P1-b).
8. **axe a partir do topo da página em dois testes** (`semViolacoesDoTopo`). Com a página rolada (foco num alerta, âncora
   seguida), o axe acusa `target-size` no controle que fica sob o cabeçalho fixo da moldura. Os mesmos controles passam
   com a página no topo, como nas outras telas. Também dei às ações "Ver" e "Abrir decisão" área mínima de 24 × 24 px
   (03, 2.1), porque estão sozinhas na célula e não contam como link em linha de texto.

## Decisões tomadas

- **Falha de agente só enquanto vale.** O alerta vem do último `falha_agente` de insumo técnico, risco ou consolidação.
  Some se o artefato daquele agente foi criado depois (preenchido à mão) ou se o mesmo agente está rodando de novo. Sem
  isso, "Preencha o parecer à mão" continuaria depois de o parecer existir.
- **Falha do orquestrador não gera alerta.** Ela acontece antes de a demanda existir (T-01), e não há o que preencher no
  detalhe.
- **"Desatualizado" no topo só para o DEC mais novo.** Um pacote antigo desatualizado, ao lado de um novo em dia, não
  pede pacote novo.
- **Dúvidas: a ESP mais nova manda.** Se a ESP mais nova não tem dúvida, as dúvidas anteriores, inclusive as da entrada,
  ficam resolvidas (03, seção 3: "grava ESP nova sem dúvida"). Sem ESP, valem as da entrada.
- **O alerta "aguardando informação" só tem link quando a seção existe.** Uma demanda posta à mão em "Aguardando
  informação" não tem dúvidas, e um link para uma seção ausente levaria a lugar nenhum.
- **Anexo como texto, e não como link.** A referência vem de fora (C-18). O servidor só confere a forma, e a 03 não pede
  o clique.
- **Uma leitura que falha derruba a tela inteira** (erro da 2.8), sem seção pela metade. É o mesmo comportamento da T06.
- **A Região de aviso fica montada também no status final.** Assim o anúncio "Status alterado para Entregue." não se
  perde quando o grupo some. Nesse caso o foco vai ao `h2` "Mudar status", em vez de cair no fim da página.
- **Status inválido vindo da Server Action** (só com envio adulterado) vira o alerta "Escolha o novo status.". A tela
  nunca manda status fora das opções.

## Pendências

- **Achado 2 da 06-T39-revisao (sessão lida duas vezes), não feito.**
  - Juntar as duas leituras pede uma destas três coisas, e todas passam do escopo da T40:
    - um `cache` dentro de `exigirPessoa`/`exigirPessoaNaPagina` (`src/modules/acesso/exigir-pessoa.ts`, T09, C-04);
    - passar a `exigirPessoaNaPagina` um `deps` com `getSession` embrulhado;
    - trocar no `generateMetadata` o `exigirPessoa` pelo `exigirPessoaNaPagina`, o que muda o contrato que os testes de
      título do `formularios-paginas-qa.test.ts` travam (sem sessão: título da tela, sem redirecionar).
  - Proposta: uma tarefa do `engenheiro-backend` para um `cache` por requisição em `lerPessoa`, com teste de que um id de
    sessão não vaza para outra requisição.
- **ux-ui-design (textos compostos ou ausentes na 03):**
  - (a) a coluna da ação nas tabelas de versões, com o cabeçalho "Ação";
  - (b) os nomes acessíveis "Ver ESP-…-vN" e "Abrir decisão DEC-…-vN";
  - (c) os rótulos das regiões roláveis: "Tabela de especificações técnicas", "Tabela de pareceres de risco", "Tabela de
    pacotes de decisão" e "Tabela do histórico";
  - (d) o `caption` das tabelas de versões é oculto e repete o `h3`;
  - (e) a falha dos outros agentes: "…não conseguiu gerar a especificação técnica… Preencha a especificação à mão." e
    "…o pacote de decisão… Preencha o pacote à mão.";
  - (f) "Salvando…" no botão "Mudar status", pela 2.5;
  - (g) o anexo como "Link: <referência> — <descrição>";
  - (h) a célula "Situação" vazia em ESP e RSK sem rascunho.
- **07-qa-funcional (G2):**
  - o foco no `h2` pelas âncoras com leitor de tela;
  - o anúncio da Região de aviso depois do `router.refresh()`;
  - o foco no `h2` "Mudar status" ao chegar a status final;
  - o `target-size` com a página rolada sob o cabeçalho fixo (desvio 8). O `scroll-padding-top` cobre o foco, mas não o
    que fica atrás do cabeçalho ao rolar;
  - a leitura de `details` e `summary`.
- **Minor:**
  - `FormularioNovaDemanda.tsx` (T39) ainda tem a própria lista `OPCOES_CANAL`, com os mesmos textos de
    `ROTULO_CANAL_ORIGEM`. Não mudei para não tocar arquivo fora da tarefa;
  - o estado "Carregando" da T05 (desvio 6).
- **As T41 a T44 criam os destinos dos links desta tela.** Até lá eles dão 404:
  - `/demandas/[id]/especificacoes/nova`, `/demandas/[id]/pareceres-risco/novo` e `/demandas/[id]/pacotes-decisao/novo`;
  - `/especificacoes/[espId]`, `/pareceres-risco/[rskId]` e `/pacotes-decisao/[decId]`.

  Os alertas de chegada da T07, da T08 e da T09 entram em `AVISO_DEMANDA` e no `alertaDeChegada` desta página.
- **e2e inteiro, a contagem.** A suíte terminou com código 0. Rodou mais de 180 s, a ferramenta a passou para segundo
  plano, e a saída ficou num arquivo em `/tmp`, que não li. Pela numeração vista até o teste 55 (o 4º de 8 de
  `nova-demanda.spec.ts`, último arquivo da ordem), são 59 testes, todos verdes.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, no ramo `construcao/DEC-DEM-20261022-0001-v1`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — último commit 4031f1e (06-T39-testes)
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- src/modules/demandas src/modules/historico src/modules/entrada src/app/api/demandas src/components src/app/(painel) e2e` — recusado pelo shell (parênteses sem aspas), nada rodou
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format=%h -- src/modules src/app/api/demandas src/components "src/app/(painel)" e2e src/lib` — arquivos dos módulos, do painel e do e2e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- test e2e src/vendor scripts src/app/api/pacotes-decisao src/app/error.tsx "src/app/(painel)/error.tsx" src/app/global-error.tsx` — ajudantes de teste, seed e rota da decisão
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — FAIL, módulo ausente (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/detalhe-demanda.spec.ts --max-failures=3` — FAIL, 3 falharam e 5 não rodaram (teste antes do código)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas/[id]/detalhe.test.ts"` — 34 de 35 (ordem de atributo na regex), corrigido no teste
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)/demandas"` — 185 de 193; os 8 do `formularios-paginas-qa.test.ts` (desvio 3)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test "src/app/(painel)" src/components` — 374 de 374, 13 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — 1 erro (`react/jsx-key` no `<time>` de "Criada em"), corrigido
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/detalhe-demanda.spec.ts` — 6 de 8 (`target-size` com a página rolada, desvio 8)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e e2e/detalhe-demanda.spec.ts` — 8 de 8
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test:e2e` — código 0, todos verdes (59 pela numeração, ver Pendências)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 164 de 164 arquivos, 3.289 de 3.289 testes, 82,4 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas build` — passou; `/demandas/[id]` dinâmica
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short --untracked-files=all` — 4 alterados e 8 novos, todos da tarefa (com os desvios 1 a 4)
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] o teste foi escrito antes do código e visto falhando (comando e trecho da saída na entrega)
- [x] `pnpm test` passa
- [x] `pnpm lint` e `pnpm typecheck` passam limpos
- [x] código, teste e log não têm segredo, token, valor de `.env` nem dado pessoal real
- [x] só mudaram os arquivos da tarefa
- [x] os textos são os de `03-ux-ui-design.md`, em pt-BR, e o axe não acusa violação nas telas tocadas
