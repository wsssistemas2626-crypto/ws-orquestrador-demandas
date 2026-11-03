# 05. Pedido de Construção

| Campo | Valor |
|---|---|
| Atualizado em | 03/11/2026 (0.1.5: limite do status final na geração) |
| Dono | `documentacao-tecnica` (sistema: Fabiano) |
| Cobre | RF-22, RF-23; RNF-15 |
| Fontes no código | `src/modules/pedido-construcao/` (`gerar.ts`, `montar.ts`, `conteudo.ts`, `serializar.ts`), `src/vendor/construir/pedido.mjs`, `src/app/api/pacotes-decisao/[decId]/pedido-construcao/route.ts`, `src/app/api/pacotes-decisao/route.ts` |

## RF-22. Gerar o pedido

`POST /api/pacotes-decisao/:decId/pedido-construcao`, só pessoa com 2FA. É `POST`, e não `GET`, porque a geração
grava evento; `GET` nessa rota responde 405. No painel, a tela de decisão (`/pacotes-decisao/[decId]`) mostra a seção
do pedido, com gerar, baixar e copiar, só para DEC aprovado e não desatualizado.

Ordem das conferências (`gerar.ts`). Recusado em qualquer passo, nada é entregue e nenhum evento é gravado:

1. DEC sem decisão `aprovada` completa (pendente, com só uma das duas aprovações, devolvido ou arquivado) → 409
   "o Pedido de Construção só é gerado de pacote aprovado.";
2. DEC desatualizado → 409 "o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a citada." (A-03 da 08);
3. demanda do tipo `estudo`, pela cópia gravada no DEC → 422 "demanda do tipo estudo não gera Pedido de Construção";
4. montagem só com a ESP e o RSK citados no DEC;
5. e-mail, telefone ou CPF em qualquer campo → 422 com `erros` no formato `<caminho>: <tipo>`, sem o valor (C-28).
   CNPJ não bloqueia o pedido;
6. `validarPedido` da cópia em `src/vendor/construir/pedido.mjs` (a mesma regra do `/construir`, conferida por SHA-256
   em teste) → 422 "O pedido não passou na validação do /construir. Nada foi entregue." com os `erros` dele;
7. evento `pedido_gerado` (sem conteúdo) e a resposta.

Limite conhecido (pendência da 0.1.5): a geração não confere o status da demanda. Um DEC aprovado de uma demanda levada
a `encerrada` ou `entregue` ainda gera o pedido. Desde a 0.1.5, só a **criação** de ESP, RSK e DEC é recusada em status
final ([cap. 04](04-versoes-e-decisao.md)).

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
  O mesmo DEC gera sempre o mesmo arquivo, byte a byte.

O pedido é **baixado e copiado à mão** para `pedidos/` da estruturaAutonoma. O sistema não envia nada ao `/construir`
e não recebe o andamento de volta: os status `em_construcao`, `entregue` e `devolvida` mudam à mão.

Limite conhecido (B-01, backlog): o nome da conta ainda pode ser alterado por `/api/auth/update-user`, e esse nome vai
para a aprovação e para o `aprovadoPor` do pedido.

## RF-23. Pacotes por status de decisão

`GET /api/pacotes-decisao?statusDecisao=<valor>` (pessoa ou qualquer agente), com `limit` (1 a 100, padrão 20) e
`offset`. `statusDecisao` aceita `pendente`, `aprovada`, `devolvida` e `arquivada`; sem ele, lista todos. `pendente` é
derivado: é o DEC sem linha em `decisao`, inclusive o que tem só uma das duas aprovações.
