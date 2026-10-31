---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T40-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), 05-tech-lead.md (início), 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G6 e T40), 03-ux-ui-design.md (seção 1 e T05), 06-T39-tech-lead.md, 06-T40-engenheiro-frontend.md, git diff 4031f1e..ffc0880, "src/app/(painel)/demandas/[id]/{page,detalhe,detalhe.test,acoes,MudarStatus,TextoRecebido,Historico,LinkNestaPagina}.ts(x)", "src/app/(painel)/demandas/[id]/editar/acoes.ts", e2e/detalhe-demanda.spec.ts, src/app/api/demandas/[id]/route.ts, src/modules/historico/{consultas,registrar}.ts, src/modules/demandas/texto-recebido.ts, src/modules/especificacoes/consultas.ts, src/modules/acesso/matriz.ts, src/modules/agentes/executar.ts]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T40 (T05 Detalhe da demanda), no intervalo `4031f1e..ffc0880`. O código e os testes estão no 3c9c648. O
fc9be9e e o ffc0880 só mexem em `passagens.jsonl` e na entrega do engenheiro (bloqueio só de leitura e regravação).

**Parecer: aprovada, sem problema Critical nem Important.** Os achados abaixo são Minor e vão para Pendências, como manda
a seção 12.

### Conferência própria

- `pnpm test` inteiro, numa rodada só: 164 de 164 arquivos e 3.289 de 3.289 testes, em 87,6 s. Li o resumo no fim da
  saída que a ferramenta guarda.
- `pnpm lint` e `pnpm typecheck`: limpos.
- `git status`: árvore limpa.
- Não rodei `pnpm test:e2e`: não está na minha lista Pode. Os 8 e2e novos foram lidos, e a contagem do engenheiro (8 de
  8, e a suíte com código 0) fica com a `06-T40-testes`.

### O que a tarefa pede e o que foi entregue

- **Leituras e ordem de acesso (`page.tsx:271-291`).** A ordem é pessoa, `ler_demanda`, regex do id, `ler_historico` e
  `ler_especificacao` (só quando há ESP). Depois vêm as leituras em paralelo. O texto bruto só sai por
  `obterTextoRecebido`, que autoriza `ler_texto_bruto` (T17). O teste de página prova a ordem e o 404 sem leitura (C-17).
- **Mudar status (`acoes.ts`).** Passa por `acaoDoPainel` com `alterar_demanda` e o id pela regex. Usa a mesma
  `alterarDemanda` do `PATCH /api/demandas/:id` e da T06, e a resposta leva só o id e o status. Não sobra caminho que
  pule a regra do servidor: a opção indisponível é só uma dica, e o e2e do 409 prova isso.
- **Alertas de topo (`detalhe.ts:157-205`).** Seguem a ordem e os textos da 03. A falha vem do último `falha_agente`.
  Conferi a forma do evento em `executar.ts:133-144` (`depois: { agente, tentativas, motivo }`), e ela bate com o que
  `falhaVigente` lê.
- **Histórico (`detalhe.ts:258-279`).** Antes e Depois só aparecem nas enumerações da lista de permissão de
  `registrar.ts` (C-30). Valor fora da enumeração sai vazio.
- **C-18.** Título, campos livres, anexos, dúvidas e texto recebido saem como texto, escapados pelo React. Não há
  `dangerouslySetInnerHTML`. O anexo nunca vira link. Unitários e e2e usam sentinelas `<script>` e `<img onerror>`.
- **Textos.** Conferi com a 03, T05: rótulos do `dl`, dúvidas, versões, motivo do pacote, dicas de status, status final,
  dica fixa, texto recebido (aviso, expurgado e sem texto), `caption` do histórico e os quatro alertas.
- **Achado 1 da 06-T39-revisao (rótulos duplicados).** Feito: `ROTULOS_DOS_CAMPOS` espalha `ROTULO_CAMPO_DEMANDA` e
  sobrescreve só o que é próprio.

### Desvios 1 a 8 do engenheiro

| Desvio | Parecer | Razão |
|---|---|---|
| 1. `detalhe.ts` e `detalhe.test.ts` | Aceito | `page.tsx` só exporta os nomes da página, e `MudarStatus.tsx` (cliente) precisa dos textos e das regras. O módulo só importa tipos dos módulos de servidor. Os unitários seguem o critério da T37 à T39. |
| 2. `LinkNestaPagina.tsx` | Aceito | A 03 pede o foco no `h2`, e a âncora nativa não leva o foco. O e2e confere. Sem script, o link continua uma âncora comum. |
| 3. `formularios-paginas-qa.test.ts` | Aceito | O teste conferia a página provisória. Só mudaram a fixture, os dublês e a troca de "única autorização" por "primeira autorização". Nenhuma asserção de comportamento caiu. |
| 4. `ROTULO_CANAL_ORIGEM` e `ROTULO_TIPO_ANEXO` em `rotulos.ts` | Aceito | A G3.11 manda os rótulos de enumeração para `rotulos.ts`. A cópia que já existia em `FormularioNovaDemanda.tsx` é o achado 3 abaixo. |
| 5. `obterEspecificacao` | Aceito | O CA-15.3 pede as dúvidas da ESP mais nova, e a vista da demanda só traz o resumo das versões. `ler_especificacao` é autorizado antes da leitura. |
| 6. Sem estado "Carregando" | Aceito | É o mesmo motivo já aceito na T39: com `Suspense`, o 404 perde o status. É Minor e fica em Pendências. |
| 7. Conta "administradora" na maioria dos e2e | Aceito | O limite C-36 conta por ator. A "cto" fica nos dois testes de DEC de nível `cto` (P1-b). |
| 8. axe a partir do topo em dois testes | Aceito, com pendência | O foco tem `scroll-padding-top`, e as ações ganharam a área mínima de 24 px. O controle que fica sob o cabeçalho fixo ao rolar vai ao `07-qa-funcional` (G2). |

### Pareceres por problema (todos Minor)

1. **`src/app/(painel)/demandas/[id]/MudarStatus.tsx:76-77`: depois de um 409, as opções continuam velhas.**
   - O que acontece: a tela mostra o alerta, mas não lê a página de novo. A opção "Aprovada" segue disponível até a
     pessoa recarregar, e o próprio e2e precisa de `page.reload()` para ver o `aria-disabled`.
   - Razão: a regra do servidor segura o envio, então não há risco. Mas a pessoa pode tentar de novo a mesma opção e
     receber o mesmo 409.
   - Correção: chamar `router.refresh()` também no 409, sem tirar o alerta.
2. **`src/app/(painel)/demandas/[id]/TextoRecebido.tsx:14`: o prazo do expurgo vem da configuração de hoje.**
   - O que acontece: "pela regra de retenção de N dias" usa o `retencaoDias` atual, e não o prazo que valia quando o
     texto foi apagado.
   - Razão: se `RETENCAO_TEXTO_BRUTO_DIAS` mudar, a frase fica errada para os textos antigos. O dado não está gravado
     (`expurgadaEm` só tem a data).
   - Correção: aceitar como está nesta versão, ou gravar o prazo no evento `texto_expurgado`. A decisão é da
     `ux-ui-design` com o `engenheiro-dados-bd`.
3. **`src/components/rotulos.ts:85-91`: dois rótulos com duas fontes.**
   - O que acontece: `ROTULO_CANAL_ORIGEM` repete as opções de canal de `FormularioNovaDemanda.tsx`. `ROTULO_TIPO_ANEXO`
     talvez repita as opções de tipo de `CamposDaDemanda.tsx`.
   - Razão: o formulário e o detalhe podem se afastar.
   - Correção: os dois formulários passam a montar as opções a partir de `rotulos.ts`. Cabe na próxima tarefa de tela que
     mexer neles.
4. **`src/app/(painel)/demandas/[id]/detalhe.ts:165`: falha sem `tentativas` vira "3 tentativas".**
   - O que acontece: o padrão fixo 3 inventa um número quando o evento não traz o campo.
   - Razão: hoje `executar.ts` sempre grava `tentativas`, então isso não aparece na prática.
   - Correção: usar `TENTATIVAS_MAXIMAS` ou omitir o número quando faltar.

### Pontos de risco alto (texto bruto e dado pessoal) conferidos

- O texto bruto só sai por `obterTextoRecebido`, com `ler_texto_bruto` e a regex antes do banco. A vista da demanda não
  traz texto nem origem.
- O texto fica num `details` fechado, com o aviso de dado pessoal e a data do expurgo, e sai como texto num `pre`.
- `generateMetadata` usa só o título. Nenhuma chamada de log nova. A Server Action não devolve campo livre.
- Os testes usam só "Pessoa Ficticia", domínios `.test`, `REF-FICTICIA-T40` e textos marcados como fictícios.

### Checklist da seção 12 do padrão técnico

- [x] A tarefa faz o que o plano pede. Os arquivos fora da lista são os desvios 1 a 4, todos aceitos com razão acima.
- [x] Há teste para cada comportamento novo, visto falhando antes do código: módulo ausente nos unitários e 3 falhas no e2e.
- [x] Nenhum segredo, valor de variável de ambiente ou dado pessoal real.
- [x] A entrada da Server Action é validada com Zod (regex do id e enumeração do status). O erro interno sai com o texto da 2.8.
- [x] Banco: não se aplica (a tarefa não tem migration).
- [x] Nada duplica função existente: a tarefa reusa `alterarDemanda`, `acaoDoPainel`, `GrupoOpcoes`, `Tabela`, `textoDoEvento`, `rotuloAtor` e `obterTextoRecebido`. A duplicação de dado (rótulos de canal e de anexo) é o achado 3, Minor.
- [x] Textos em pt-BR, da 03. O axe não acusa violação nas telas tocadas, pelos e2e do engenheiro.
- [x] Os achados Minor estão em Pendências; não há Critical nem Important.
- [x] Revisão de código e de segurança do PR: não se aplicam a esta etapa.

## Decisões tomadas

- Aprovar sem devolver: só há achados Minor, e pela seção 12 eles vão para Pendências.
- Aceitar que o achado 2 da T39 (sessão lida duas vezes) fique fora da T40. As três correções possíveis mexem em
  `exigir-pessoa.ts` (T09, C-04) ou no contrato de título que os testes da T39 travam. O custo é desempenho, sem efeito
  de correção.
- Não rodar `pnpm test:e2e`: está fora da minha lista Pode, e a `06-T40-testes` é a dona dessa conferência.

## Pendências

- **Tarefa à parte (`engenheiro-backend`):** o achado 2 da 06-T39-revisao. Pôr um `cache` por requisição em
  `lerPessoa`/`exigirPessoa`, com um teste de que a sessão não vaza entre requisições.
- **Próxima tarefa de tela que mexer nos formulários (T41 ou depois):** o achado 1 (`router.refresh()` no 409) e o
  achado 3 (opções de canal e de tipo de anexo vindas de `rotulos.ts`).
- **`ux-ui-design` e `engenheiro-dados-bd`:** o achado 2 (prazo de retenção mostrado depois do expurgo).
- **Minor sem dono imediato:** o achado 4 (padrão de 3 tentativas) e o estado "Carregando" da T05 (desvio 6).
- **`07-qa-funcional` (G2):** os cinco itens que o engenheiro deixou. São o foco no `h2` pelas âncoras com leitor de
  tela, o anúncio depois do `router.refresh()`, o foco no `h2` ao chegar a status final, o `target-size` com a página
  rolada sob o cabeçalho fixo (desvio 8) e a leitura de `details`/`summary`.
- **`ux-ui-design`:** as pendências de texto (a) a (h) do engenheiro.
- **`06-T40-testes` (`qa-automacao`):** confirmar a contagem do `pnpm test:e2e` inteiro. O engenheiro viu o código 0, mas
  não leu o total.
- **T41 a T44:** criam os destinos dos links desta tela (hoje 404) e ligam os alertas de chegada da T07, da T08 e da T09
  em `AVISO_DEMANDA`.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --oneline -8` — 3c9c648, fc9be9e e ffc0880 depois de 4031f1e
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --stat 4031f1e..ffc0880` — 14 arquivos, 1.970 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%H%n%s 3c9c648` — código, testes, entrega e passagens.jsonl
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4031f1e..ffc0880 -- src/components "src/app/(painel)/demandas/[id]/acoes.ts" "src/app/(painel)/demandas/[id]/MudarStatus.tsx" "src/app/(painel)/demandas/[id]/TextoRecebido.tsx" "src/app/(painel)/demandas/[id]/Historico.tsx" "src/app/(painel)/demandas/[id]/LinkNestaPagina.tsx"` — diff dos componentes e da ação
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff 4031f1e..ffc0880 -- "src/app/(painel)/demandas/formularios-paginas-qa.test.ts" "src/app/(painel)/demandas/[id]/page.tsx"` — diff da página e do teste de QA
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas log --name-only --format= -- src/jobs src/worker src/modules/agentes` — arquivos do worker, para achar quem grava `falha_agente`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat --format=%h 3c9c648 -- docs` — só a entrega e passagens.jsonl em docs
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 164 de 164 arquivos, 3.289 de 3.289 testes, 87,6 s
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status --short` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
