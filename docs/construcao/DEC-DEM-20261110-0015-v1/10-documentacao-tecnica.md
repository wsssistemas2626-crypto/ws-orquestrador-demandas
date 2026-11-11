---
pedido: DEC-DEM-20261110-0015-v1
etapa: 10-documentacao
agente: documentacao-tecnica
leu: [contrato-passagem.md, padrao-tecnico.md, pedido.json, docs/superpowers/specs/2026-11-10-ws-orquestrador-demandas-novo-visual-design.md, docs/superpowers/plans/2026-11-10-ws-orquestrador-demandas-plano.md (G2 e estrutura, por busca), 02-arquiteto-solucoes.md (índice dos ADR-13 a ADR-19, por busca), 05-tech-lead.md, tarefas.json, 06-T06-engenheiro-backend.md (trecho da autoria sem2fa), 06-T06-tech-lead.md (trecho), 06-T16-tech-lead.md (trecho), 06-T17-engenheiro-frontend.md (seções 0 a 2), 06-T17-tech-lead.md, 07-qa-funcional.md, 08-maestro.md, 09-devops-sre.md, README.md, CHANGELOG.md, docs/manual-tecnico/README.md, docs/manual-tecnico/01-arquitetura.md, docs/manual-tecnico/03-demandas.md, docs/manual-tecnico/08-painel.md, docs/operacao/deploy.md, package.json, playwright.config.ts, src/app/fontes.ts, src/app/globals.css (tokens, por busca), src/app/(painel)/layout.tsx (por busca), src/app/(painel)/demandas/page.tsx, src/app/(painel)/demandas/ContadoresDaFila.tsx, src/app/(painel)/demandas/fila.tsx e FiltrosFila.tsx (por busca), src/app/(painel)/demandas/[id]/page.tsx (por busca), src/app/(painel)/pacotes-decisao/[decId]/page.tsx (cabeçalho), src/app/(painel)/pacotes-decisao/[decId]/FormularioDecisao.tsx (cabeçalho), src/app/entrar/FormularioEntrar.tsx (foco), src/components/CabecalhoPainel.tsx, src/components/casca/GavetaMenu.tsx, src/components/casca/navegacao.ts, src/components/casca/MolduraPublica.tsx, src/components/Recolhivel.tsx, src/components/dados-da-fila.ts, src/components/dados-das-etapas.ts, src/components/dados-da-decisao.ts (textos), src/components/rotulos.ts (selos), src/modules/demandas/resumo-da-fila.ts, src/modules/demandas/consultas.ts (listarDemandas), e2e/capturas.ts, e2e/capturas.spec.ts, test/estatico/fontes.test.ts, test/estatico/classes-antigas.test.ts, test/estatico/sem-recurso-externo.test.ts (por busca), docs/manual-tecnico/capturas/t01-entrar-1280.png, t11-decisao-1280.png, t11-decisao-390.png, t05-demanda-1280.png]
status: pronto
proximo: maestro
devolvido_para: null
---
## Entrega

O `CHANGELOG.md` **não tinha** a 0.2.0: o topo ainda era a 0.1.13. A entrada nova está no topo, e a documentação
passou a descrever o código do ramo. Nenhum arquivo fora de `README.md`, `CHANGELOG.md`, `docs/manual-tecnico/` e
`docs/operacao/` foi editado. As capturas não foram tocadas.

### Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `CHANGELOG.md` | Entrada **0.2.0 — 2026-11-11**: o que muda para quem usa, tela a tela; o que mudou no código (tokens, fontes `@fontsource` 5.3.0 exatas, casca, leituras da fila, T05, T11, superfícies congeladas com a exceção do `route-qa.test.ts`, testes, seed, capturas, versão); o que ficou fora (spec, seção 6); verificações (5.230 testes, 249 e2e três vezes, homologação, audit, ensaio de rollback); pendências abertas (Fabiano, R-01 a R-11 da 08, QF-0015-02 e 03, testes longos, M1, pipeline, marca, textos, backlog) |
| `README.md` | Versão 0.2.0 e data; um parágrafo sobre o novo visual com link ao cap. 08; spec e plano da 0.2.0 na tabela "Onde está cada coisa"; em "Instalar e verificar", as fontes em `devDependencies` (o build precisa delas) e como as capturas são gravadas e regravadas |
| `docs/manual-tecnico/README.md` | Versão 0.2.0 e data; nota de que os RF-01 a RF-17 do pedido 0015 não são os do sistema; cap. 01 com ADR-01 a ADR-19 e cap. 08 com os RF do pedido; seção nova "Requisitos do novo visual (0.2.0)", com cada RF do pedido apontando para a seção do capítulo; oito termos novos no glossário (casca, gaveta, moldura pública, token, contador de status, etapas da fila, barra de etapas, próxima ação) |
| `docs/manual-tecnico/01-arquitetura.md` | Cabeçalho; linha de `src/components/`; `resumo-da-fila.ts` no módulo `demandas/`; nota de que a CSP não mudou; seção nova "Fontes (ADR-13)"; os dois `@fontsource` na tabela de versões; ADR-13 a ADR-19 na tabela, com onde está o texto e as duas trocas do plano (D-01, D-02) |
| `docs/manual-tecnico/03-demandas.md` | Cabeçalho e fontes no código; no RF-06, as duas leituras da fila (`contarDemandasPorStatus`, `etapasDasDemandas`), quem chama, o que devolvem, custo, falha e o que não mudou na API |
| `docs/manual-tecnico/08-painel.md` | Reescrito sobre o de antes, sem apagar conteúdo vigente. Ficaram a tabela de telas, atualizada, e as seções de acessibilidade e de pendências. Entraram as seções Identidade visual (RF-01, RF-02), Casca e gaveta (RF-03, RF-04), Fila (RF-05 a RF-07), Demanda (RF-08 a RF-10, com as tabelas da barra e das 13 linhas da Próxima ação tiradas do código), Decisão (RF-11, RF-12), Telas públicas e demais (RF-13, RF-14), O que não mudou (RF-15), testes da 0.2.0 em Acessibilidade (RF-16) e Capturas de tela (RF-17). As nove PNG estão citadas e embutidas, com legendas, e as pendências de interface da 0.2.0 foram acrescentadas |
| `docs/operacao/deploy.md` | Campo "Versão" 0.2.0; "Atualizado em"; no topo da seção 4, a situação da produção em 10/11 conferida na 09 (origem GitHub, sem webhook nem segredo, o que falta conferir no painel). O texto de antes ficou como histórico ("Antes de 10/11…") |

### Pedidos do maestro atendidos

- **M3 da 06-T17-tech-lead (contorno de foco na T01):** está na seção "Capturas de tela" do cap. 08, nas observações
  comuns, e nas legendas das duas `t01-*`. O contorno é o foco com que a T01 abre (efeito de `FormularioEntrar.tsx`,
  que põe o foco no `h1`), e não defeito de layout.
- **QF-0015-03 (data em mm/dd/aaaa):** está na legenda de `t11-decisao-1280.png`, com o formato que a pessoa vê no Chrome
  em pt-BR, nas pendências do cap. 08 e no CHANGELOG. Conferi o `playwright.config.ts:26`: ele **já** usa
  `locale: 'pt-BR'`, então o ajuste que a 07 sugeriu não resolve sozinho (ver Pendências).
- **Dados:** só aparecem nomes e títulos fictícios do seed ("Pessoa Ficticia …", "(fictício)", `painel-ficticio`).
  Nenhum dado pessoal real foi escrito. A nota da 06-T06 sobre a autoria `sem2fa` das versões da `etapasDupla`, que
  aparece na T11 como "Criado em … por Pessoa Ficticia Sem 2FA", entrou nas observações das capturas.
- **Pendência da 09 para esta etapa:** fiz o campo "Versão" do `deploy.md` e o registro de como a produção ficou em
  10/11 (seção 4).

### Links internos

Conferi todos os links que escrevi, contra os arquivos (Glob) e os títulos (Grep):

- `08-painel.md`: `#identidade-visual-rf-01-rf-02`, `#casca-e-gaveta-rf-03-rf-04`, `#fila-t03-rf-05-a-rf-07`,
  `#demanda-t05-rf-08-a-rf-10`, `#decisão-t11-rf-11-rf-12`, `#telas-públicas-e-demais-telas-rf-13-rf-14`,
  `#o-que-não-mudou-rf-15`, `#acessibilidade-rnf-11` e `#capturas-de-tela`;
- `01-arquitetura.md#fontes-adr-13`, `03-demandas.md#rf-06-consultar-e-alterar` e
  `README.md#requisitos-do-novo-visual-020`;
- as nove `capturas/*.png`;
- a spec e o plano da 0.2.0;
- as âncoras que já existiam e que reusei: `05-pedido-de-construcao.md#na-t11`, `04-versoes-e-decisao.md#rf-13-decisão`
  e `#substituição-do-dec-aprovado`, `02-acesso-e-seguranca.md#rf-01-login-com-2fa` e `#log-e-sentry-rnf-10-c-20-c-21`,
  `07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail`, `06-agentes-de-ia.md#rf-20-minimização` e
  `05-pedido-de-construcao.md#corrigir-uma-recusa`;
- a âncora `08-painel.md#pendências-de-interface-conhecidas`, citada pelos cap. 04 e 05, foi mantida.

## Decisões tomadas

- Mapeei os RF-01 a RF-17 do pedido numa seção própria do índice do manual, separada do mapa dos RF do sistema. Os
  números se repetem (RF-06 do sistema é a consulta; RF-06 do pedido é a tabela densa), e misturar os dois mapas
  confundiria o leitor.
- Descrevi a barra de etapas e a Próxima ação pelo código (`dados-das-etapas.ts`), e não pela spec. Os rótulos dos links
  ("Escrever a especificação", "Abrir a decisão aprovada") e a regra de quem age na linha 8 só estão no código. Vale o
  código (padrão técnico, seção 11).
- Mantive no cap. 08 o texto de acessibilidade e de pendências das versões anteriores, que segue vigente, e acrescentei
  o da 0.2.0 em blocos marcados "Desde a 0.2.0" e "Da 0.2.0". Assim, quem lê sabe o que é novo.
- Para regravar uma captura, o README e o cap. 08 indicam apagar o PNG. É o caminho que não exige mudar código, porque
  o teste estático exige `REGRAVAR` vazio no commit. Citei o `REGRAVAR` como a segunda forma.
- Os achados da 08, da 07 e da 09 foram para as pendências do CHANGELOG com o mesmo id da origem (R-nn, QF-0015-nn), sem
  renumerar, para a Parada 3 achar cada um na entrega de origem.
- Não houve devolução. O `deploy.md` não contradiz o código: a diferença entre a seção 2 (imagem do GHCR) e a produção
  (origem GitHub) é de configuração do Easypanel, e a seção 6 já a trata. Registrei o estado na seção 4.

## Pendências

- **QF-0015-03, para a `qa-automacao`:** o `playwright.config.ts` já define `locale: 'pt-BR'` e
  `timezoneId: 'America/Sao_Paulo'` (linhas 26 e 27), e mesmo assim a captura mostra o campo de data em "mm/dd/yyyy".
  A sugestão da 07 de definir o `locale` não basta. Falta achar o ajuste do navegador dos testes que mude o formato do
  campo nativo, regravar `t11-decisao-1280.png` e, se mudar, `t11-decisao-390.png`, e tirar a observação da legenda no
  cap. 08. Até lá, a legenda explica a diferença.
- **Divergência registrada para a Parada 3 (não reabre a cadeia):** a fila marca "DEC feita" com qualquer versão de
  DEC, e a barra da T05 só marca a Decisão feita com o DEC aprovado (R-01 da 08). Os dois comportamentos seguem o
  aprovado. O manual descreve os dois e avisa da diferença no glossário ("Etapas da fila") e no cap. 08.
- **Divergência entre ADR e código, já decidida no plano:** a ADR-14 previa os nomes de cor antigos como apelidos, e a
  ADR-18 previa recolhível por `<details>`. O código seguiu o plano (D-01: os nomes antigos saíram na T16; D-02:
  componente `Recolhivel`). O cap. 01 registra a troca ao lado da tabela de ADRs.
- **Para Fabiano (Parada 3), repetidas no CHANGELOG:** UAT de 11 passos (07, seção 7), P-01, QF-0015-01, publicação da
  0.2.0, credencial de leitura do GHCR antes de publicar, conferência do "Auto Deploy" e do `db` e da `PORT` no painel
  (`deploy.md`, seção 4).
- **Para o maestro:** a seção "Capturas de tela" do cap. 08 cita o `e2e/capturas.spec.ts` como o único caminho de
  gravação. Se a 08 ou a Parada 3 regravar alguma PNG, confira de novo as legendas: a da T11 e a das `t01-*` descrevem o
  que aparece hoje.

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (10) o README diz como rodar, com os comandos do padrão técnico
- [x] (10) o manual técnico descreve cada RF e cita variável de ambiente só pelo nome
- [x] (10) as notas de versão listam o que entrou e as pendências abertas
- [x] os links internos apontam para arquivos que existem
