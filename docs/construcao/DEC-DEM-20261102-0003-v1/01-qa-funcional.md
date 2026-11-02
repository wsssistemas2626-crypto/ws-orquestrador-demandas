---
pedido: DEC-DEM-20261102-0003-v1
etapa: 01-reproducao
agente: qa-funcional
leu: [contrato-passagem.md, pedido.json, DEC-DEM-20261102-0002-v1/04-maestro.md, e2e/decisao.spec.ts, e2e/parecer-risco-qa.spec.ts, e2e/apoio.ts, scripts/seed-ficticio.ts, playwright.config.ts, vitest.config.ts, scripts/scripts.test.ts (trechos), src/modules/pacotes-decisao/criar.ts, src/modules/pacotes-decisao/decidir.ts, src/modules/pacotes-decisao/schemas.ts, src/modules/pareceres-risco/servico.ts, src/modules/demandas/transicoes.ts, src/modules/demandas/consultas.ts, src/modules/versoes.ts, src/modules/limites.ts, src/components/dados-da-decisao.ts, src/app/api/demandas/[id]/pacotes-decisao/route.ts, src/app/(painel)/demandas/[id]/pareceres-risco/novo/page.tsx, src/app/(painel)/demandas/[id]/especificacoes/nova/page.tsx]
status: pronto
proximo: tech-lead
devolvido_para: null
---
## Entrega

Reprodução feita por leitura do código (sem execução: o papel não tem Bash). Cada sequência abaixo sai das linhas
citadas e das regras do servidor que elas encontram. A demanda da decisao.spec é chamada aqui de **D**
(`TITULOS_DO_E2E.decisao`), a da dupla aprovação de **DD** (`duplaAprovacao`), a do duplo clique de **DR**
(`rskDuploClique`) e a da T07 de **DE** (`espListaDeTextos`). Todas são fictícias e vêm do seed
(`scripts/seed-ficticio.ts:141-212`), criadas pela conta `sem2fa`, sem ESP, RSK nem DEC.

### Regras do servidor que decidem o resultado

| Regra | Onde | Efeito nos testes |
|---|---|---|
| DEC exige ESP **e** RSK na demanda | `criar.ts:83-88` | sem RSK, `POST /pacotes-decisao` responde 400 `Faltam itens para o pacote.` com `faltando: ['parecer_risco']` |
| A-02: aprovar com outro DEC aprovado na demanda → 409 | `decidir.ts:90-98, 213` | qualquer aprovação numa demanda que já tem DEC aprovado falha com `outro pacote desta demanda já está aprovado.` |
| Versão = `max(versao) + 1` | `versoes.ts:25-30` | numa demanda já usada, a próxima ESP, RSK ou DEC não é v1 |
| C-36: 30 demandas e 60 artefatos (ESP+RSK+DEC) por hora por conta | `limites.ts:17, 45-55` | a RSK pode receber 429 logo depois de a ESP passar (ESP é o 60.º artefato da hora) |
| Transição automática só a partir da origem permitida; fora dela, nada muda e não há erro | `transicoes.ts:54-59, 69-71` | `dec_criado` e `decisao_devolvida` a partir de `encerrada` não fazem nada |
| Criar ESP, RSK ou DEC não confere o status da demanda | `criar.ts:80`, `pareceres-risco/servico.ts:44`, `especificacoes/servico.ts` (sem `status`) | numa demanda Encerrada, ainda se cria DEC |
| Listas de ESP, RSK e DEC vêm da versão mais nova para a mais antiga | `especificacoes/consultas.ts:75`, `pareceres-risco/consultas.ts:62`, `demandas/consultas.ts:114` | `itens[0]` é a mais nova |
| As telas novas de ESP e RSK partem da versão mais nova | `especificacoes/nova/page.tsx:3-5`, `pareceres-risco/novo/page.tsx:3-6` | numa segunda execução, o formulário já vem preenchido e o botão diz `Gravar …-v2` |
| `playwright.config.ts`: `workers: 1`, `retries: 0` | `playwright.config.ts:14-17` | teste que falha derruba o worker; o seguinte roda num processo novo e chama `demanda()` de novo |
| Sem `BASE_URL`, cada `pnpm test:e2e` sobe um Postgres novo (Testcontainers) | `playwright.config.ts:1-4, 26-37` | duas invocações locais **não** reproduzem o B-01; é preciso o mesmo banco |

### M-01 — preparação da decisao.spec com falha parcial (severidade média)

**Arquivo suspeito:** `e2e/decisao.spec.ts:37-45` (a guarda é a linha 40, `if (itens.length === 0)`, com base no GET da
linha 39).

**Sequência que leva à falha:**

1. Banco recém-semeado. D tem 0 ESP e 0 RSK.
2. O primeiro teste que chama `demanda()` é o `P1-b` (linha 149, via `prepararPacote`). O GET da linha 39 devolve
   `itens: []`, e a guarda entra.
3. `POST /especificacoes` (linha 41) grava a `ESP-<D>-v1`.
4. `POST /pareceres-risco` (linha 42) não grava: recebe 429 pelo limite de artefatos da `cto` (`limites.ts:54`), ou o
   pedido estoura o tempo antes de o servidor confirmar. O `api()` (`apoio.ts:89`) reprova o teste. A ESP fica gravada;
   o RSK, não.
   - Variante: o POST da ESP estoura o tempo do lado do cliente, mas o servidor confirma. O teste falha antes de
     tentar o RSK, e o estado fica o mesmo: ESP sim, RSK não.
5. Com `retries: 0` e `workers: 1`, o Playwright troca o worker. O próximo teste que usa D (`nível cto: aprovar A`,
   linha 160) chama `demanda()`: o GET da linha 39 devolve `[ESP-<D>-v1]`, a guarda não entra, e nenhum RSK é criado.
6. `novoPacote` (linha 61) faz `POST /pacotes-decisao` → **400** `Faltam itens para o pacote.`, com
   `faltando: ['parecer_risco']` (`criar.ts:85-88`). O `api()` reprova com
   `POST /api/demandas/<D>/pacotes-decisao respondeu 400`.
7. O mesmo 400 derruba `CA-12.4` (linha 234) e `Arquivar` (linha 264). A `dupla aprovação` não é afetada, porque usa DD.
8. O estado fica no banco. Toda execução seguinte contra o mesmo banco repete os passos 5 a 7 até alguém semear de
   novo. O RSK é só INSERT (C-34), então não há como desfazer a ESP pela API.

**Resultado esperado:** a preparação completa o que falta. Na próxima chamada, ela cria só o `RSK-<D>-v1`, sem nova
ESP, e os testes seguintes passam.
**Resultado obtido:** a preparação não faz nada, e três testes caem com 400 em `pacotes-decisao`, nesta execução e nas
seguintes.

**O que um teste precisa fazer para mostrar a M-01 de forma determinística:**

- O 429 e o tempo esgotado não se provocam de forma confiável, e o `page.route` não intercepta `page.request`.
  Por isso a falha parcial tem de vir do **estado**, não da rede. Há dois caminhos, e a escolha fica com a triagem:
  1. **Unidade, sem navegador (o mais determinístico).** A preparação vira uma função que recebe as quatro chamadas
     (listar ESP, listar RSK, criar ESP, criar RSK). Um teste Vitest usa um falso com o estado "1 ESP, 0 RSK" e
     confere: uma chamada a criar RSK e nenhuma a criar ESP. Na segunda chamada, com "1 ESP, 1 RSK", nenhuma criação.
     Há ainda um caso em que o falso rejeita criar RSK na primeira vez: a preparação propaga o erro, sem engolir, e a
     segunda chamada cria só o RSK. Atenção: o `vitest.config.ts:10` só inclui `src/`, `test/` e `scripts/`. O teste
     teria de morar em `scripts/scripts.test.ts`, que está no escopo do pedido, ou o include teria de mudar, o que
     está fora do escopo.
  2. **e2e sobre uma demanda de seed com só a ESP.** O seed criaria uma demanda com ESP e sem RSK. O teste chama a
     preparação, confere `GET /especificacoes` com o mesmo total antes e depois e `GET /pareceres-risco` com exatamente
     um a mais, e chama de novo para conferir que nada muda. Numa segunda execução contra o mesmo banco, essa demanda
     já tem RSK, e o estado "ESP sem RSK" não se recria. Nesse caso, o teste precisa de `test.skip` condicionado, com
     mensagem explícita (critério 4).
- Em qualquer dos caminhos, a decisao.spec precisa conferir a idempotência em toda execução: contar ESP e RSK de D,
  chamar a preparação duas vezes, ver no máximo uma versão nova de cada (e nenhuma, quando já existiam), e ver ao menos
  uma ESP e um RSK no fim.

### B-01 — testes que só passam com banco recém-semeado (severidade baixa)

**Gatilho:** a segunda execução contra o **mesmo** banco. Há duas formas de obtê-la:

- (a) Duas execuções com `BASE_URL` apontando para a mesma homologação, sem `homologar` entre elas (sem apagar os
  volumes).
- (b) Uma invocação local só, com `--repeat-each=2` e restrita às specs do achado, porque o `webServer` sobe um banco
  só. A ordem das repetições não é a de duas execuções completas. As conclusões de B-01.1, B-01.2, B-01.4 e B-01.5 não
  dependem dessa ordem; B-01.3 e N-01 dependem dela, e se reproduzem só pela forma (a).

#### B-01.1 Duplo clique (`e2e/parecer-risco-qa.spec.ts:152-189`)

1. 1.ª execução: DR sem RSK. O teste grava `RSK-<DR>-v1` e passa.
2. 2.ª execução: DR já tem `RSK-<DR>-v1`. A T08 parte dele (`novo/page.tsx:3-6`), e o botão passa a ser
   `Gravar RSK-<DR>-v2`.
3. A linha 177 procura o botão `Gravar RSK-<DR>-v1`, não acha, e o `dblclick` estoura o tempo. **Falha aqui.**
4. Mesmo que passasse dali, as linhas 179, 180 e 186 esperam `v1`, e a 188 espera `[RSK-<DR>-v1]`. A lista real seria
   `[RSK-<DR>-v2, RSK-<DR>-v1]`, da mais nova para a mais antiga.

**Ponto de atenção para a correção:** na 2.ª execução, o RSK de partida (v1) já tem `SENTINELA` no resumo e nas
pré-condições. Se a resposta da Server Action trouxer algum dado da versão de partida, a linha 187 reprova por esse
motivo, e não por eco do que foi digitado. É preciso conferir isso na primeira execução da correção contra o mesmo
banco.

#### B-01.2 T07 da ESP (`e2e/parecer-risco-qa.spec.ts:191-230`)

1. 1.ª execução: DE sem ESP. O teste grava `ESP-<DE>-v1` com `escopoInclui: ['Escopo corrigido (fictício)']` e passa.
2. 2.ª execução: a T07 parte da ESP v1 (`especificacoes/nova/page.tsx:3-5`), e o botão é `Gravar ESP-<DE>-v2`.
3. A linha 206 procura `Gravar ESP-<DE>-v1` e estoura o tempo. **Falha aqui.** A linha 224 também.
4. A linha 225 espera `ESP-<DE>-v1 gravada.`. A linha 226 pega `itens[0]`, que é a mais nova. Mas a v1 da execução
   anterior tem o mesmo `escopoInclui`, então essa conferência não distingue a versão nova da antiga. É um falso
   positivo latente: a correção deve conferir pelo id devolvido.

#### B-01.3 decisao.spec sobre D (`e2e/decisao.spec.ts:146-185, 232-279`)

Estado no fim da 1.ª execução (de 4 DEC): `DEC-<D>-v1` pendente (P1-b), `v2` aprovado (nível cto, A), `v3` devolvido
(CA-12.4), `v4` arquivado. D fica **Encerrada**, com `ESP-<D>-v1`, `ESP-<D>-v2` e `RSK-<D>-v1`.

Na 2.ª execução:

1. `demanda()` vê ESP e não cria nada (correto aqui).
2. `P1-b` (146-156) cria `DEC-<D>-v5`. A demanda continua Encerrada (`dec_criado` não sai de `encerrada`,
   `transicoes.ts:56, 71`). O teste só confere a tela da administradora e **passa**.
3. `nível cto: aprovar A` (158-185) cria `DEC-<D>-v6` e aprova pela tela. O servidor responde **409**
   `outro pacote desta demanda já está aprovado.`, porque `v2` está aprovado (`decidir.ts:213`). **Falha** no alerta
   da linha 173-174. Se chegasse lá, a linha 184 também falharia: espera `pronta_para_decisao`, e a demanda está
   `encerrada`.
4. `CA-12.4` (232-260) cria `DEC-<D>-v7` e `ESP-<D>-v3` e devolve. A devolução grava, mas `decisao_devolvida` não sai de
   `encerrada`, então a demanda não muda. O alerta da linha 256 **passa**, porque o texto é fixo pelo resultado
   (`dados-da-decisao.ts:126`). A linha 258 **falha**: espera `em_analise`, e o status é `encerrada`.
5. `Arquivar` (262-279) cria `DEC-<D>-v8` e arquiva. A linha 269 passa: já estava `encerrada`. O laço do 404 passa na
   2.ª execução.

#### B-01.4 Dupla aprovação sobre DD (`e2e/decisao.spec.ts:51-58, 187-230`)

1. `demandaDaDupla` **não tem guarda**: cria ESP e RSK em toda execução (linhas 55-56). Na 2.ª execução, cria
   `ESP-<DD>-v2`, `RSK-<DD>-v2` e `DEC-<DD>-v2`.
2. A aprovação do CTO pela tela recebe **409** `outro pacote desta demanda já está aprovado.`, porque `DEC-<DD>-v1` foi
   aprovado nas duas contas na 1.ª execução (`decidir.ts:213`, conferido antes de `aprovar`). **Falha** na linha 200.
   O 04-maestro já registrava que a dupla dependia disso antes do pedido 0002.

#### B-01.5 O que um teste precisa fazer para mostrar o B-01 de forma determinística

- **Reprodução:** rodar só os testes afetados duas vezes contra o mesmo banco, pela forma (a) ou (b). Com a forma (b),
  restrinja às duas specs do achado: a suíte inteira repetida estoura o C-36 (ver N-02). Hoje, a 2.ª passada falha em
  B-01.1, B-01.2, B-01.3 (passos 3 e 4) e B-01.4.
- **Teste corrigido, duplo clique e T07:**
  - antes de agir, ler a lista (`GET /pareceres-risco` ou `/especificacoes`) e guardar os ids;
  - tirar o id esperado do rótulo do botão (`Gravar RSK-<id>-vN`), conferindo que N é a mais nova antes mais 1, ou de
    `0` quando não há nenhuma;
  - depois de agir, conferir que a lista tem **exatamente** um item a mais, que `itens[0].id` é o id esperado (o mesmo
    da URL, do alerta e do corpo da Server Action) e que os itens restantes são os de antes, na mesma ordem;
  - na T07, conferir `escopoInclui` da ESP **pelo id novo**, não por `itens[0]` cego.
- **Teste corrigido, decisao.spec (aprovar, dupla, devolver):**
  - antes de agir, ler `GET /api/demandas/<id>/pacotes-decisao` (lista com a decisão de cada DEC) e `GET /api/demandas/<id>`
    (status);
  - se já houver DEC aprovado na demanda, a A-02 não permite outro caminho de aprovação. O teste precisa de
    `test.skip(condição, 'exige banco recém-semeado: a demanda <id> já tem DEC aprovado (A-02)')`, nunca de
    `return` silencioso nem de troca do 409 por sucesso;
  - o `CA-12.4` precisa de pré-condição de status de origem (`pronta_para_decisao` ou `em_analise`). Se D estiver
    `encerrada`, a devolução não leva a `em_analise`, e o teste deve ser pulado com mensagem, ou rodar sobre a demanda
    que permita a transição;
  - a A-02 continua testada em toda execução: no banco recém-semeado, pelo caminho atual; e, de preferência, também por
    uma conferência explícita de que a segunda aprovação recebe 409 `outro pacote desta demanda já está aprovado.`, o
    que vale nas duas situações de banco (critério 5).

### B-02 — comentário de `playwright.config.ts:4` (severidade baixa, documentação)

**Texto atual:** `Os dados de cada teste são criados pela API.`
**Por que está errado:** o e2e usa duas fontes de dado.

- **Seed fictício** (`scripts/seed-ficticio.ts`): as quatro contas de `CONTAS_FICTICIAS`, o DEC de rascunho de agente da
  primeira demanda e as demandas de `TITULOS_DO_E2E`, achadas por título (`apoio.ts:73-78`).
- **API**, pela sessão da página (`apoio.ts:82-91`): demandas e versões que os testes criam.

**Esperado:** o comentário cita as duas fontes e diz que as demandas do seed acumulam versões entre execuções contra o
mesmo banco. **Para mostrar:** é só leitura do arquivo. Não há teste que precise falhar. Se a triagem quiser uma
trava, uma conferência estática do comentário cabe em `test/estatico/projeto.test.ts`, mas esse arquivo está fora da
lista de arquivos do pedido.

### Achados novos da leitura (fora dos três, ligados ao critério 4)

- **N-01 (baixo, `e2e/decisao.spec.ts:271`).** O laço do 404 usa `DEC-<D>-v9` como "versão que não existe". Cada
  execução cria 4 DEC em D, então na **3.ª** execução contra o mesmo banco o `P1-b` cria a `v9`, e o `goto` da linha
  272 devolve 200. A linha 273 falha. A correção precisa usar uma versão calculada como a mais nova mais um número
  grande, ou um número fora do alcance (ex.: `v999999`), conferindo antes que ela não existe.
- **N-02 (médio para o critério 4, `limites.ts:17`).** Pelo 04-maestro do pedido 0002 (item 4), a `cto` cria 27
  demandas por execução da suíte. Duas execuções seguidas dentro de uma hora somam 54, acima das 30 do C-36. A 2.ª
  execução recebe 429 em criações pela API logo no começo, por motivo que não é o B-01. Sem afrouxar o C-36 (vetado
  pelo RSK do pedido), o critério 4 ("duas vezes seguidas contra o mesmo banco passa") só se cumpre com intervalo de
  uma hora entre as execuções, ou pulando com mensagem os testes que criam demanda pela API. A triagem precisa dizer
  qual leitura vale. Se nenhuma servir, a decisão é de Fabiano.
- **N-03 (baixo, `e2e/apoio.ts:74`).** `demandaDoSeed` busca entre as 100 demandas de tipo `melhoria` mais novas
  (`demandas/consultas.ts:196`, ordem decrescente de criação). Numa homologação longa, as demandas de `melhoria`
  criadas pela API a cada execução empurram as do seed para fora da primeira página, e o erro passa a ser
  `o seed não tem a demanda`. Não contei quantas `melhoria` cada execução cria. Fica como risco para execuções
  repetidas, e a correção pode filtrar por título ou paginar.
- **N-04 (observação de produto, fora do escopo).** A API cria DEC numa demanda **Encerrada** (`criar.ts` não confere
  status). Uma devolução depois disso mostra `A demanda voltou para Em análise.` (`dados-da-decisao.ts:126`), mas a
  demanda continua Encerrada (`transicoes.ts:57, 71`). A tela afirma algo que não aconteceu. O pedido não muda
  comportamento do sistema, então isto vai para a triagem decidir se abre demanda própria, com o `analista-requisitos`
  confirmando a regra.

## Decisões tomadas

- Reprodução por leitura do código, porque o papel não tem Bash. Cada passo cita a linha que decide o resultado.
- A M-01 fica como média: o teste falso vermelho persiste entre execuções e só sai com o banco semeado de novo. Não
  afeta o usuário do sistema.
- O B-01 e o B-02 ficam como baixos, como no 04-maestro: afetam só a homologação reaproveitada e a documentação do e2e.
- A falha parcial da M-01 deve ser simulada pelo estado ou por uma função com as chamadas injetadas. O 429 real não é
  determinístico, e o `page.route` não intercepta `page.request`.
- O N-02 está registrado porque o critério 4 do pedido, lido ao pé da letra, conflita com o C-36, que não pode ganhar
  exceção.

## Pendências

- Para o `tech-lead` (02-triagem): escolher o caminho da M-01, Vitest com o falso em `scripts/scripts.test.ts` ou
  demanda de seed com ESP sem RSK e `skip` com mensagem nas execuções seguintes.
- Para o `tech-lead` e, se preciso, Fabiano: N-02. O critério 4 só se cumpre com uma hora entre as duas execuções, ou
  com `skip` explícito nos testes que criam demanda pela API. Nunca se cumpre afrouxando o C-36.
- Para o `tech-lead`: incluir o N-01 (`v9`) e o N-03 (`limit=100`) na correção. Os dois quebram as execuções
  repetidas.
- Para a triagem e o `analista-requisitos`: N-04, uma demanda própria se confirmada. Fica fora deste pedido.
- Conferir na 1.ª execução da correção contra o mesmo banco o ponto de atenção do B-01.1 (`SENTINELA` já presente na
  versão de partida).

## Comandos executados

Nenhum.

## Critério de pronto atendido

- [x] (01) os passos de reprodução estão completos e o resultado obtido está descrito
