# 04. Versões e decisão

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.6: decisão recusada em demanda em status final, no RF-13) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-08 a RF-14 |
| Fontes no código | `src/modules/especificacoes/`, `src/modules/pareceres-risco/`, `src/modules/pacotes-decisao/` (`criar.ts`, `decidir.ts`, `desatualizado.ts`, `consultas.ts`, `schemas.ts`), `src/modules/versoes.ts`, `drizzle/0003_rls_privilegios_dominio.sql` |

Toda gravação de ESP, RSK ou DEC é uma versão nova. Criar, decidir e gerar o Pedido fazem `SELECT … FOR UPDATE` na
linha da demanda:
isso serializa a versão N e fecha a corrida entre uma aprovação e uma ESP nova (C-13). Cada criação conta no limite de
60 versões por hora por ator (ESP, RSK e DEC somados); acima, 429.

Na criação de ESP, RSK e DEC, a ordem dentro da transação é: trava da demanda → recusa em status final → limite por
ator → o resto. Numa demanda `entregue` ou `encerrada` ([cap. 03](03-demandas.md#rf-07-status-e-transições)), a
criação, pela pessoa ou pelo agente, responde 409:

```json
{ "erro": "conflito", "mensagem": "Esta demanda está em status final. Não aceita nova especificação, parecer de risco nem pacote de decisão." }
```

A recusa vem antes de qualquer insert, evento, agente disparado, aviso ou job, e antes do limite: numa demanda final,
o ator que já passou do limite recebe 409, e não 429 (`recusarSeDemandaFinal`, `src/modules/demandas/transicoes.ts`).

## RF-08. Especificação técnica (ESP)

`POST /api/demandas/:id/especificacoes` (pessoa ou agente `insumo_tecnico`); lista em `GET` na mesma rota; uma versão
em `GET /api/especificacoes/:espId`. No painel, `/demandas/[id]/especificacoes/nova` começa com o conteúdo da mais nova.

| Campo | Regra |
|---|---|
| `descricaoObjetiva` | obrigatório |
| `escopoInclui` | lista obrigatória |
| `escopoExclui`, `duvidasEmAberto` | listas, padrão vazias |
| `situacaoAtual`, `situacaoDesejada`, `sistemasErp`, `sistemasEcommerceMarketplace`, `sistemasApisTerceiros`, `sistemasServicosInternos`, `dadosEntidades`, `dadosCamposCriticos`, `restricoesTecnicas` | texto opcional |
| `sistemaAlvo` | letras minúsculas, números e hífen, até 100 |
| `repositorioDestino` | `<dono>/<sistemaAlvo>`, com o dono da lista do `validarPedido` copiado (`DONOS_REPOSITORIO`) |
| `criteriosAceitePreliminares`, `definicaoDePronto` | listas |

- Fora do tipo `estudo`, os quatro campos de construção (`sistemaAlvo`, `repositorioDestino`,
  `criteriosAceitePreliminares`, `definicaoDePronto`) são obrigatórios. No `estudo` são opcionais, mas o repositório
  informado segue a mesma regra. A conferência usa as mesmas listas do `validarPedido` do `/construir`
  (`validarCamposDeConstrucao`). Erro dá 400 com a lista de `campos`.
- ESP com `duvidasEmAberto` leva a demanda a `aguardando_informacao` ([cap. 03](03-demandas.md#rf-15-dúvida-em-aberto)).
  ESP sem dúvida dispara o agente `risco`, se ligado.

## RF-09. Parecer de risco (RSK)

`POST /api/demandas/:id/pareceres-risco` (pessoa ou agente `risco`); lista em `GET` na mesma rota; uma versão em
`GET /api/pareceres-risco/:rskId`. No painel, `/demandas/[id]/pareceres-risco/novo`.

| Campo | Regra |
|---|---|
| `riscoTecnicoNivel`, `riscoOperacionalNivel`, `riscoJuridicoNivel` | obrigatórios: `baixo`, `medio` ou `alto` |
| `riscoTecnicoComentario`, `riscoOperacionalComentario`, `riscoJuridicoComentario`, `resumo`, `envolverJuridicoOuAdministradoraQuando` | texto opcional |
| `recomendacoesMitigacao`, `preCondicoes` | listas, padrão vazias |

RSK gravado numa demanda que já tem ESP dispara o agente `consolidacao`, se ligado.

## RF-10. Pacote de decisão (DEC)

`POST /api/demandas/:id/pacotes-decisao` (pessoa ou agente `consolidacao`); lista em `GET` na mesma rota; um DEC em
`GET /api/pacotes-decisao/:decId`. No painel, `/demandas/[id]/pacotes-decisao/novo`.

- Corpo: `resumoExecutivo` (obrigatório), `opcaoA` e `opcaoB` (cada uma com `descricao` obrigatória e `vantagens`,
  `desvantagens`, `quandoEscolher` opcionais), `recomendacao` opcional e `nivelAprovacaoRequerido` (`cto` ou
  `cto_e_administradora`).
- Qual ESP e qual RSK o DEC cita, lidos sob a trava da demanda:
  - DEC de pessoa (painel, rota ou Server Action) e DEC pela rota com o token da `consolidacao`: a ESP e o RSK **de
    maior versão** da demanda no momento da gravação;
  - DEC gravado pelo worker da consolidação: a ESP e o RSK **que o agente leu** (`citados` de `montarEntrada`, passados
    como `especificacaoId` e `parecerRiscoId` em `ExtrasDoPacote`). A leitura filtra por id e por demanda; id
    inexistente ou de outra demanda dá 404 e nada é gravado. Se entrou versão mais nova depois da leitura, o DEC nasce
    desatualizado (RF-12) (M-01, corrigido na 0.1.5).
  - `especificacaoId` e `parecerRiscoId` nunca vêm do corpo da requisição nem da saída do modelo: o schema da rota não
    tem esses campos, e o que vier a mais é descartado (C-11, C-25).
- O DEC grava uma cópia do tipo, do título e da descrição da demanda, que não muda se a demanda for editada.
- Sem ESP ou sem RSK: 400 "Faltam itens para o pacote." com `faltando: ["especificacao", "parecer_risco"]` (o que
  faltar).
- **DEC de agente nasce sempre `cto_e_administradora`** (`NIVEL_DO_DEC_DE_AGENTE`, A-04 da 08): o schema de saída da
  consolidação não tem o campo, e o que vier é ignorado. Rebaixar para `cto` é decisão de pessoa, gravando uma versão
  nova do DEC.
- Na mesma transação: a demanda vai a `pronta_para_decisao` (ator `sistema`) e o aviso por e-mail fica pendente, com
  o job ([cap. 07](07-worker-avisos-retencao.md#rf-25-aviso-por-e-mail)).
- Demanda em status final: 409 antes de gravar (início deste capítulo; M-02, corrigido na 0.1.5 para a criação).
  Decidir um DEC já existente (RF-13) e gerar o Pedido dele ([cap. 05](05-pedido-de-construcao.md)) também dão 409
  desde a 0.1.6 (M-08).

## RF-11. Imutabilidade

O papel `orquestrador_app` só tem `SELECT` e `INSERT` em `especificacao_tecnica`, `parecer_risco`, `pacote_decisao`,
`aprovacao`, `decisao` e `evento`. Uma versão gravada não muda nem pelo app nem por SQL com o papel da aplicação. A
decisão e as aprovações ficam em tabelas próprias; `statusDecisao` e `aprovadores` são derivados delas.

## RF-12. DEC desatualizado

Um DEC está desatualizado quando a demanda tem ESP ou RSK de **versão** maior que a citada nele
(`expressaoDesatualizado`). A marca é recalculada a cada leitura e relida sob a trava da demanda na decisão e na
geração do pedido.

- DEC desatualizado não pode ser aprovado: 409 "o pacote está desatualizado e não pode ser aprovado.". Devolver e
  arquivar continuam possíveis.
- O DEC da consolidação pode **nascer** desatualizado: ele cita a ESP e o RSK que o agente leu, e uma versão mais nova
  pode ter entrado entre o agendamento e a gravação (RF-10). Ele leva a demanda a `pronta_para_decisao` e agenda o aviso
  como qualquer DEC; a execução disparada pela versão nova gera o DEC que cita a mais nova.
- Pedido de Construção de DEC desatualizado: 409, e a tela esconde a seção do pedido
  ([cap. 05](05-pedido-de-construcao.md)).

## RF-13. Decisão

`PATCH /api/pacotes-decisao/:decId/decisao`, só pessoa com 2FA. Agente e sistema recebem 403, também quando o worker
chama a função direto (C-12).

Corpo (`registrarDecisaoSchema`):

| `statusDecisao` | Campos |
|---|---|
| `aprovada` | `opcaoEscolhida` (`A` ou `B`, obrigatória), `referenciaDocumento` (até 200), `dataDocumento` (data ISO), `registrarComo` (`administradora`), `comentarios`, `revisouRascunhosDeAgente` |
| `devolvida`, `arquivada` | `comentarios`, `revisouRascunhosDeAgente` |

Não existe opção C ou D: recusar as duas opções é `devolvida` ou `arquivada`.

Conferências, nesta ordem, dentro de uma transação:

1. o DEC existe (senão 404) e a demanda é travada;
2. demanda `entregue` ou `encerrada` (`ehStatusFinal`) → 409 "a demanda está em status final; o pacote não pode mais
   ser decidido." (`MENSAGENS_DECISAO.demandaFinal`; M-08, desde a 0.1.6). Vem antes de ler o DEC: vale para aprovar,
   devolver e arquivar, para o DEC já decidido e para a segunda aprovação de um DEC `cto_e_administradora`. Nada é
   gravado em `aprovacao`, `decisao` nem `evento`;
3. já tem decisão → 409 "este pacote já tem decisão registrada.";
4. não é o DEC mais novo da demanda → 409 "a demanda tem um pacote mais novo; só o mais novo pode ser decidido."
   (A-01 da 08);
5. aprovar com outro DEC da demanda já aprovado → 409 "outro pacote desta demanda já está aprovado." (A-02 da 08);
6. aprovar DEC desatualizado → 409;
7. o DEC cita rascunho de agente e `revisouRascunhosDeAgente` não é `true` → 400 no campo;
8. `devolvida` ou `arquivada`: grava a decisão, e a demanda muda pelo ator `sistema` (`em_analise` ou `encerrada`);
9. `aprovada`: as regras de papel e nível abaixo.

A matriz vem antes de tudo isso (`autorizar`): token de agente recebe 403 e quem não tem credencial recebe 401, também
numa demanda final. Depois de "Arquivar", que leva a demanda a `encerrada`, decidir de novo o mesmo DEC recebe o 409 do
passo 2, e não o do passo 3. O texto do passo 2 foi escrito na triagem e espera a revisão da `ux-ui-design` (B-4 da
0.1.6).

Regras de papel e nível:

- O papel da aprovação é o da conta da sessão. `registrarComo: "administradora"` só seria aceito vindo da conta `cto`
  no modo `cto_com_referencia`; o modo em vigor é `somente_propria` (`MODO_APROVACAO_ADMINISTRADORA` em
  `decidir.ts`, P1-a), então só a própria administradora, com conta e 2FA, registra a aprovação dela.
- Nível `cto`: só a conta `cto` aprova (P1-b); a administradora recebe 403. A aprovação grava a decisão na hora.
- A aprovação **não** muda o status da demanda (P1-d).

O histórico leva o papel, a opção e, na da administradora, a referência e a data do documento; nunca o comentário.

## RF-14. Dupla aprovação

Nível `cto_e_administradora`:

1. A primeira aprovação (de qualquer um dos dois papéis) é gravada em `aprovacao`; o resultado é `aprovacao_parcial`
   e o DEC continua sem decisão.
2. A aprovação da administradora exige `referenciaDocumento` e `dataDocumento` (o documento assinado fica fora do
   sistema; aqui só a referência). Faltando, 400 nos campos.
3. O mesmo papel de novo → 409 "a aprovação do CTO já está registrada." (ou da administradora).
4. A segunda aprovação precisa ser da **mesma opção** da primeira; senão 409 citando quem aprovou primeiro.
5. Com as duas, a decisão `aprovada` é gravada.

Limite conhecido (médio do reteste da 08, aberto): a regra 4 da decisão (nunca dois DEC aprovados) junto com a regra do
desatualizado pode deixar a demanda sem saída. Se o v1 é aprovado e depois entra uma ESP ou um RSK novos, o pedido do
v1 dá 409 por estar desatualizado, e o v2 não pode ser aprovado porque o v1 já está. A saída é decisão de Fabiano ou
do `tech-lead` ([CHANGELOG](../../CHANGELOG.md)).
