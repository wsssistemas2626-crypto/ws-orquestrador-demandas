---
pedido: DEC-DEM-20261022-0001-v1
etapa: 06-T18-revisao
agente: tech-lead
leu: [contrato-passagem.md, padrao-tecnico.md (seção 12), tarefas.json, parada-PF-T18.md, 05-tech-lead.md, 2026-10-25-ws-orquestrador-demandas-plano.md (G1 a G4 e T18 a T21), 06-T18-engenheiro-backend.md, commit f1cd287, src/lib/erros.ts, estruturaAutonoma/ferramentas/construir/lib/pedido.mjs]
status: pronto
proximo: qa-automacao
devolvido_para: null
---
## Entrega

Revisão da T18 (especificação técnica versionada), commit `f1cd287`. Nenhum problema Critical ou Important. A
passagem segue para a `06-T18-testes`. Os cinco pontos Minor estão em Pendências, cada um com arquivo:linha, problema
e razão.

### O que foi conferido

- **Escopo do plano.** Os 12 arquivos da lista da T18 foram criados, com as interfaces do plano:
  - `criarEspecificacaoSchema` igual ao do plano;
  - `validarCamposDeConstrucao(tipo, e)`;
  - `criarEspecificacao(deps, ator, demandaId, entrada, t?, extras?)`;
  - `listarEspecificacoes` e `obterEspecificacao`, esta com `versaoMaisNova`.
- **Ordem do serviço.** Em `src/modules/especificacoes/servico.ts:53-96` a ordem é a do plano: `autorizar`,
  `travarDemanda`, `conferirLimite('artefato')`, `validarCamposDeConstrucao` com o tipo lido sob a trava,
  `proximaVersao`, insert campo a campo, evento `especificacao_criada` e `mudarStatusPeloSistema(..., 'duvida_em_aberto')`.
  A transação de quem chama é aceita (G3.8).
- **Cópia do `validarPedido` (ADR-05, C-29).** `git diff --no-index` entre a origem e `src/vendor/construir/pedido.mjs`
  saiu vazio: a cópia é byte a byte. `pedido.d.mts` traz exatamente as três declarações do plano. O `origem.test.ts` é
  o do plano.
- **Autoria só do ator (C-11).** O schema não tem campo de autoria, e o insert é campo a campo. Há testes no schema, no
  serviço e na rota com `rascunhoAgente:false`, `autorTipo`, `autorId`, `id` e `versao` no corpo.
- **Evento sem texto livre (C-30).** O `depois` leva só `{ versao, rascunhoAgente }`. O teste usa sentinelas nos
  campos de texto.
- **Testes.** Todo comportamento novo tem teste, e todos falhariam sem o código: os módulos não existiam, e a entrega
  mostra a falha. Os 7 testes do plano para a rota estão presentes, com corpo:
  - CA-08.1;
  - CA-04.3, com concorrência real;
  - CA-11.1, que confere que a rota só exporta `GET`;
  - CA-15.1;
  - CA-15.2;
  - C-11 pela rota;
  - C-36 com 429.
  Além deles há testes para:
  - id fora do formato, com 404 sem consulta (C-17);
  - Origin de outro site, com 403 (C-15);
  - 401 sem credencial;
  - o log sem id, sem token e sem sentinela (C-21).
- **Zod e erro.** A entrada da rota passa por `rota()` com `criarEspecificacaoSchema`. A recusa da regra de construção
  é `ErroDominio('entrada_invalida')` com `campos`, sem detalhe interno. O CA-08.5 confere que o valor recebido não
  volta na resposta.
- **Arquivos fora da lista.** São dois:
  - `src/modules/demandas/consultas.ts:393` e `:402`, que passam a exportar `responsavelDe` e `contaDoAutor`;
  - `src/modules/demandas/servico.ts:416`, que passa a exportar `autoriaDo`.
  A mudança é só o `export`, que evita duplicar função (seção 12, item 6). Aceito: ver Decisões.
- **Suíte nesta revisão.** `pnpm test` passou com 1548 de 1548 em 91 arquivos; `pnpm lint` e `pnpm typecheck` saíram
  limpos.

### Checklist da seção 12 do padrão técnico

- [x] Faz o que o plano pede. Há um arquivo a mais (`temporario-comparar.test.ts`, Minor 1) e duas exportações em
  arquivos da T15, aceitas pela regra de não duplicar.
- [x] Há teste para cada comportamento novo, e ele falharia sem o código.
- [x] Nenhum segredo, valor de `.env` ou dado pessoal real. Os dados são fictícios: `Pessoa Ficticia`, `.test` e
  `SENTINELAS`.
- [x] Entrada externa validada com Zod; o erro não vaza detalhe.
- [x] Banco: a tarefa não tem migration nem `tenant_id`; usa a tabela da T05. Não se aplica.
- [x] Nada duplica função existente. Há uma constante de texto repetida (Minor 2).
- [x] Interface: a tarefa não tem tela. Os textos de erro são os da 03, T07.
- [x] O que é Minor foi para Pendências; nenhum Critical ou Important.
- [x] Os itens de PR (`/code-review` e `/security-review`) são da `08-revisao`, fora desta etapa.

## Decisões tomadas

- Aceitas as três exportações em `demandas/consultas.ts` e `demandas/servico.ts`: só o `export` muda, e a alternativa
  seria copiar a regra de autoria em ESP, RSK e DEC, o que a seção 12 proíbe.
- Aceito `deps: DepsDemanda` no lugar de `Deps`: é um subconjunto, quem passa `Deps` compila, e o worker da T27 e da
  T28 chama sem Better Auth.
- Aceito `GET /api/demandas/:id/especificacoes` com `{ itens }` e 404 para demanda inexistente: segue a forma já usada
  no histórico.
- `temporario-comparar.test.ts` não bloqueia: o conteúdo é correto e portátil, e o engenheiro não tem `rm` nem `mv` na
  lista **Pode**. Devolver só criaria uma volta que ele não consegue cumprir.
- Status `pronto`: só sobraram Minor, e pela seção 12 Minor não bloqueia a passagem.

## Pendências

1. **Minor.** `src/vendor/construir/temporario-comparar.test.ts:1-4`
   - Problema: o nome e o comentário dizem "temporário", mas o arquivo fica no repositório.
   - Problema: o teste da linha 14 repete a lista literal de donos.
   - Problema: o teste da linha 18 testa o comportamento do próprio código copiado, não do app.
   - Razão: um nome enganoso num arquivo permanente leva alguém a apagá-lo ou a duvidar dele. O SHA-256 do
     `origem.test.ts` já trava qualquer mudança da cópia; o único teste com valor próprio é o da linha 10 (tipos
     construídos contra `TIPOS`).
   - Sugestão para a `08-revisao`: renomear com `git mv` para `contrato.test.ts` e manter só o teste da linha 10.
2. **Minor.** `src/modules/especificacoes/servico.ts:20`
   - Problema: `MENSAGEM_CAMPOS_INVALIDOS` repete o literal `'Corrija os campos abaixo para continuar.'`, que já está em
     `deZod`, em `src/lib/erros.ts:79`.
   - Razão: são duas fontes para o mesmo texto da 03. Se uma mudar, a tela mostra dois textos para o mesmo erro 400.
   - Sugestão: exportar a constante de `src/lib/erros.ts` e importá-la nos dois lugares, na próxima tarefa que precisar
     dela (T20 ou T21).
3. **Minor.** `src/modules/especificacoes/servico.ts:59`, com o schema em `src/modules/especificacoes/schemas.ts:30`
   - Problema: num `estudo`, um `repositorioDestino` só com espaços vira `''` depois do `trim()` e é gravado como texto
     vazio, não como `null`. Nos tipos construídos, o valor vazio já é recusado.
   - Razão: a versão é imutável. A T10 e a T22 vão ter de tratar `''` e `null` como iguais.
   - Sugestão: gravar `entrada.repositorioDestino || null`, ou pôr `.transform` no schema, na T19 ou numa correção
     da 08.
4. **Minor.** `src/app/api/especificacoes/especificacoes.test.ts:167`
   - Problema: o CA-15.2 conta todas as linhas de `pgboss.job` do banco do arquivo.
   - Razão: quando a T28 acrescentar o disparo do agente de risco na criação da ESP, ou quando outro teste do arquivo
     enviar job, a asserção quebra ou passa a depender da ordem dos testes (RNF-15).
   - Sugestão: a T28 (ou a T30) filtra a contagem pelo nome da fila de aviso.
5. **Minor.** `src/modules/especificacoes/schemas.ts:27`
   - Problema: a mensagem do `regex` de `sistemaAlvo` nunca chega à rota. O `mapearErro` da T03 só repassa mensagem de
     issue `custom`, e o 400 sai com "Valor inválido.". O engenheiro já registrou isso.
   - Razão: o texto da 03 para esse caso fica sem uso no servidor.
   - Sugestão: a T41 mostra a dica no cliente. Se a 03 exigir o texto também do servidor, a mudança é no `mensagemDoIssue`
     de `src/lib/erros.ts` (T03), aceitando `invalid_format` com mensagem nossa.

## Comandos executados

- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show --stat f1cd287e55b4ca2e260b7acc882ebccd5a78f727` — 17 arquivos, 1306 inserções
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas show f1cd287e55b4ca2e260b7acc882ebccd5a78f727 -- src` — diff completo de `src/`
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas diff --no-index --stat /home/deploy/servidor/projetos/estruturaAutonoma/ferramentas/construir/lib/pedido.mjs /home/deploy/servidor/projetos/ws-orquestrador-demandas/src/vendor/construir/pedido.mjs` — sem diferença; a cópia é byte a byte
- `git -C /home/deploy/servidor/projetos/ws-orquestrador-demandas status` — limpo, ramo `construcao/DEC-DEM-20261022-0001-v1`
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas test` — 1548 de 1548, 91 arquivos
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas lint` — limpo
- `pnpm -C /home/deploy/servidor/projetos/ws-orquestrador-demandas typecheck` — limpo

## Critério de pronto atendido

- [x] (06 revisão) o checklist da seção 12 do padrão técnico está cumprido, ou o status é `devolvido`
