# Origem da cópia do `validarPedido`

Cópia sem mudança, byte a byte, da validação do Pedido de Construção do `/construir` (ADR-05, C-29). O Orquestrador de
Demandas usa a lista de donos de repositório e a lista de tipos construídos na ESP (T18) e a função inteira na geração
do Pedido de Construção (T22), para que o pedido gerado passe pelas mesmas regras que o `/construir` aplica.

- Arquivo copiado: `pedido.mjs`
- Origem: `estruturaAutonoma/ferramentas/construir/lib/pedido.mjs`
- Data da cópia: 26/10/2026 (etapa `06-T18-construcao` do pedido `DEC-DEM-20261022-0001-v1`)
- SHA-256: `cd014814f3b898bfbb320eadefa3fd28c8efdf5707a733352f441cb83d35f016`

`pedido.mjs` não se edita aqui. O teste `origem.test.ts` falha se o arquivo mudar. Quando a origem mudar, copie de novo o
arquivo inteiro, atualize a data e o SHA-256 acima e confira as tarefas que usam a cópia.

`pedido.d.mts` declara os tipos do que a cópia exporta. Ele é nosso, e não da origem.
