# 05. Pedido de Construção

| Campo | Valor |
|---|---|
| Atualizado em | 04/11/2026 (0.1.11: detector de e-mail linear e com acento no usuário, no passo 7 do RF-22); 03/11/2026 (0.1.6: trava da demanda e recusa em status final na geração) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-22, RF-23; RNF-15 |
| Fontes no código | `src/modules/pedido-construcao/` (`gerar.ts`, `montar.ts`, `conteudo.ts`, `serializar.ts`), `src/modules/dados-pessoais/detectores.ts`, `src/vendor/construir/pedido.mjs`, `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`, `src/app/api/pacotes-decisao/route.ts` |

## RF-22. Gerar o pedido

`POST /api/pacotes-decisao/:decId/pedido-construcao`, só pessoa com 2FA. É `POST`, e não `GET`, porque a geração
grava evento; `GET` nessa rota responde 405. No painel, a tela de decisão (`/pacotes-decisao/[decId]`) mostra a seção
do pedido, com gerar, baixar e copiar, só para DEC aprovado e não desatualizado.

Ordem das conferências (`gerar.ts`), numa transação. Recusado em qualquer passo, nada é entregue e nenhum evento é
gravado. A matriz vem antes (token de agente: 403):

1. o DEC existe (senão 404) e a demanda dele é travada, como na decisão (M-08, desde a 0.1.6);
2. demanda `entregue` ou `encerrada` (`ehStatusFinal`) → 409 "a demanda está em status final; o pacote não gera mais
   Pedido de Construção." (`MENSAGENS_PEDIDO.demandaFinal`). Vem antes de ler o DEC, então também um DEC pendente ou
   arquivado numa demanda final recebe esta mensagem;
3. DEC sem decisão `aprovada` completa (pendente, com só uma das duas aprovações, devolvido ou arquivado) → 409
   "o Pedido de Construção só é gerado de pacote aprovado.";
4. DEC desatualizado, lido sob a trava → 409 "o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a
   citada." (A-03 da 08);
5. demanda do tipo `estudo`, pela cópia gravada no DEC → 422 "demanda do tipo estudo não gera Pedido de Construção";
6. montagem só com a ESP e o RSK citados no DEC;
7. e-mail, telefone ou CPF em qualquer campo → 422 com `erros` no formato `<caminho>: <tipo>`, sem o valor (C-28).
   CNPJ não bloqueia o pedido. A busca é `encontrarDadosPessoais`, com os `DETECTORES` de `detectores.ts`. Desde a
   0.1.11 (M-a e B-2 da revisão do 0011), o detector de e-mail tem custo linear (100 mil caracteres abaixo de 200 ms;
   antes, cerca de 20 s com o event loop travado) e aceita letra com acento no usuário. No reteste da
   `seguranca-aplicacao`, com 300 mil textos sorteados, nenhum texto que a 0.1.10 bloqueia deixou de ser bloqueado
   ([cap. 06](06-agentes-de-ia.md#detector-de-e-mail));
8. `validarPedido` da cópia em `src/vendor/construir/pedido.mjs` (a mesma regra do `/construir`, conferida por SHA-256
   em teste) → 422 "O pedido não passou na validação do /construir. Nada foi entregue." com os `erros` dele;
9. evento `pedido_gerado` (sem conteúdo) e a resposta.

Consequência do passo 2: depois que a demanda vai a `entregue` (ou é encerrada), o Pedido do DEC aprovado não é mais
gerado de novo. Baixe o arquivo enquanto a demanda está em `aprovada` ou `em_construcao` (B-5 da 0.1.6). O texto do
passo 2 espera a revisão da `ux-ui-design` (B-4 da 0.1.6).

Resposta: 200, corpo = o JSON, com `content-disposition: attachment; filename="<decId>.json"`.

Formato (seção 3.1 da spec do `/construir`), com as chaves sempre nesta ordem:

```json
{
  "pedido": "DEC-DEM-20261022-0001-v1",
  "demanda": { "id": "DEM-20261022-0001", "tipo": "novo_projeto", "titulo": "…", "descricao": "Contexto: …\n\nProblema: …" },
  "especificacao": { "id": "ESP-DEM-20261022-0001-v1", "conteudo": "…" },
  "risco": { "id": "RSK-DEM-20261022-0001-v1", "nivel": "alto", "conteudo": "…" },
  "decisao": { "id": "DEC-DEM-20261022-0001-v1", "opcaoEscolhida": "A: …", "aprovadoPor": "<nome do CTO> e <nome da administradora>", "aprovadoEm": "2026-10-22" },
  "sistema_alvo": "ws-orquestrador-demandas",
  "repositorio_destino": "wsssistemas2626-crypto/ws-orquestrador-demandas",
  "criterios_aceite_preliminares": ["…"],
  "definicao_de_pronto": ["…"]
}
```

- `demanda` vem da cópia gravada no DEC: editar a demanda depois não muda o pedido.
- `risco.nivel` é o maior dos três níveis do RSK.
- `decisao.opcaoEscolhida` é a letra e a descrição da opção; `aprovadoPor` são os nomes das contas que aprovaram, na
  ordem CTO e administradora; `aprovadoEm` é a data, em São Paulo, da aprovação que completou a decisão.
- Fica de fora: data de geração, nome do solicitante, texto bruto, anexos, resumo, recomendação e comentários.
- **Determinístico** (RNF-15): só dado imutável, chaves em ordem fixa, dois espaços de recuo e quebra de linha no fim.
  O mesmo DEC gera sempre o mesmo arquivo, byte a byte, enquanto a demanda não está em status final (passo 2).

O pedido é **baixado e copiado à mão** para `pedidos/` da estruturaAutonoma. O sistema não envia nada ao `/construir`
e não recebe o andamento de volta: os status `em_construcao`, `entregue` e `devolvida` mudam à mão.

Limite conhecido (B-01, backlog): o nome da conta ainda pode ser alterado por `/api/auth/update-user`, e esse nome vai
para a aprovação e para o `aprovadoPor` do pedido.

## RF-23. Pacotes por status de decisão

`GET /api/pacotes-decisao?statusDecisao=<valor>` (pessoa ou qualquer agente), com `limit` (1 a 100, padrão 20) e
`offset`. `statusDecisao` aceita `pendente`, `aprovada`, `devolvida` e `arquivada`; sem ele, lista todos. `pendente` é
derivado: é o DEC sem linha em `decisao`, inclusive o que tem só uma das duas aprovações.
