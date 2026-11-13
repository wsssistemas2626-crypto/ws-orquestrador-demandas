// src/lib/rota-corpo-invalido.test.ts — ADR-33 e AN-02: com `corpoInvalido`, a falha do Zod do corpo vira 422 sem
// `campos`, sem eco; sem a opção, nada muda. O resto de rota() (400 de JSON malformado, 415, 413, cookie com Bearer) é
// igual com e sem a opção. Handlers sintéticos; token `construir` real; o corpo nunca é ecoado nem logado.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CONFIG_TESTE } from '../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDepsDeTeste } from '../../test/deps';
import { tokenDeIntegracao } from '../../test/integracoes';
import { chamarRota } from '../../test/requisicao';
import { definirDepsParaTeste, type Deps } from './deps';
import { substituirDestinoDoLog } from './log';
import { paramId, rota } from './rota';

const SENTINELA = 'SENTINELA-CORPO-4b2f';
const ROTA = '/api/pedidos-construcao/[decId]/andamento';
const corpo = z.strictObject({ n: z.number().int() });
const comOpcao = rota(
  { acao: 'registrar_andamento', rota: ROTA, params: paramId.versao('decId', 'DEC'), corpo, corpoInvalido: { codigo: 'nao_processavel', mensagem: 'Mensagem fixa (fictícia).' } },
  async () => ({ status: 204 }),
);
const semOpcao = rota({ acao: 'registrar_andamento', rota: ROTA, params: paramId.versao('decId', 'DEC'), corpo }, async () => ({ status: 204 }));

let b: BancoDeTeste;
let deps: Deps;
let token: string;
const linhasDoLog: string[] = [];
beforeAll(async () => {
  substituirDestinoDoLog({ write: (l: string) => void linhasDoLog.push(l) });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'construir');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

const chamar = (h: typeof comOpcao, c: unknown, extra: { cabecalhos?: Record<string, string>; semContentType?: boolean; cookie?: string } = {}) =>
  chamarRota(h, { metodo: 'POST', caminho: '/api/pedidos-construcao/DEC-DEM-20261112-0001-v1/andamento', params: { decId: 'DEC-DEM-20261112-0001-v1' }, bearer: token, semOrigin: true, corpo: c, ...extra });

describe('corpoInvalido (ADR-33)', () => {
  it('com a opção: corpo fora do schema → 422 só com erro e mensagem, sem campos e sem eco', async () => {
    const r = await chamar(comOpcao, { n: 1, [SENTINELA]: SENTINELA });
    expect(r.status).toBe(422);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: 'Mensagem fixa (fictícia).' });
    expect(texto).not.toContain(SENTINELA);
    expect(linhasDoLog.join('\n')).not.toContain(SENTINELA);
  });
  it('sem a opção: o 400 com campos de hoje', async () => {
    const r = await chamar(semOpcao, { n: 'x' });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ erro: 'entrada_invalida', campos: expect.any(Array) });
  });
  it.each([
    ['JSON malformado → 400', '{"n":', {}, 400],
    ['text/plain → 415', '{"n":1}', { semContentType: true, cabecalhos: { 'content-type': 'text/plain' } }, 415],
    ['corpo acima de 512 KB → 413', JSON.stringify({ n: 1, x: 'a'.repeat(600 * 1024) }), {}, 413],
    // Só o cookie de sessão deixa o ator ambíguo (resolverAtor); valor inventado, como em rota.test.ts.
    ['cookie de sessão com Bearer → 400', '{"n":1}', { cookie: 'wsod.session_token=inventado', cabecalhos: { origin: CONFIG_TESTE.urlBase } }, 400],
  ] as const)('com e sem a opção, igual: %s', async (_n, texto, extra, status) => {
    for (const h of [comOpcao, semOpcao]) expect((await chamar(h, texto, extra)).status).toBe(status);
  });
});
