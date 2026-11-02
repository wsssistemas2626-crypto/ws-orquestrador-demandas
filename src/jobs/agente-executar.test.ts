// Handler da fila agente.executar (T27, C-21, C-22): lê só { execucaoId } com o schema da fila, chama executarAgente e,
// em erro inesperado, deixa só o erro reduzido no log e no Sentry, sem derrubar o worker nem os outros jobs do lote.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../modules/agentes/executar', () => ({ executarAgente: vi.fn() }));
vi.mock('../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/sentry')>()), capturarErro: vi.fn() }));

import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { substituirDestinoDoLog } from '../lib/log';
import { capturarErro } from '../lib/sentry';
import { executarAgente, type DepsAgente } from '../modules/agentes/executar';
import { tratarAgenteExecutar } from './agente-executar';

const deps = {} as DepsAgente;
const ID_1 = '00000000-0000-4000-8000-000000000001';
const ID_2 = '00000000-0000-4000-8000-000000000002';
let linhas: string[];

beforeEach(() => {
  linhas = [];
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  vi.mocked(executarAgente).mockReset();
  vi.mocked(capturarErro).mockReset();
});
afterEach(() => substituirDestinoDoLog(null));

describe('tratarAgenteExecutar', () => {
  it('chama executarAgente com o execucaoId de cada job do lote, na ordem, e registra o resultado', async () => {
    vi.mocked(executarAgente).mockResolvedValueOnce('concluida').mockResolvedValueOnce('ja_tratada');
    await tratarAgenteExecutar(deps, [
      { id: 'job-1', data: { execucaoId: ID_1 } },
      { id: 'job-2', data: { execucaoId: ID_2 } },
    ]);
    expect(vi.mocked(executarAgente).mock.calls).toEqual([
      [deps, ID_1],
      [deps, ID_2],
    ]);
    expect(linhas.map((l) => JSON.parse(l))).toMatchObject([
      { evento: 'agente_job_tratado', fila: 'agente.executar', jobId: 'job-1', execucaoId: ID_1, status: 'concluida' },
      { evento: 'agente_job_tratado', fila: 'agente.executar', jobId: 'job-2', execucaoId: ID_2, status: 'ja_tratada' },
    ]);
  });

  it.each([
    ['com chave a mais', { execucaoId: ID_1, texto: SENTINELAS.texto }],
    ['com id fora do formato', { execucaoId: SENTINELAS.texto }],
    ['vazio', {}],
    ['nulo', null],
  ])('C-22: payload %s não chega a executarAgente, e o log não leva o conteúdo', async (_n, data) => {
    await tratarAgenteExecutar(deps, [{ id: 'job-x', data }]);
    expect(executarAgente).not.toHaveBeenCalled();
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'agente_payload_invalido', fila: 'agente.executar', jobId: 'job-x' });
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });

  it('erro inesperado: log com o erro reduzido, Sentry, sem relançar, e o job seguinte do lote ainda roda', async () => {
    const erro = new Error(`falhou com ${SENTINELAS.texto} e ${SENTINELAS.email}`);
    vi.mocked(executarAgente).mockRejectedValueOnce(erro).mockResolvedValueOnce('concluida');
    await expect(
      tratarAgenteExecutar(deps, [
        { id: 'job-1', data: { execucaoId: ID_1 } },
        { id: 'job-2', data: { execucaoId: ID_2 } },
      ]),
    ).resolves.toBeUndefined();
    expect(capturarErro).toHaveBeenCalledTimes(1);
    expect(capturarErro).toHaveBeenCalledWith(erro, { evento: 'agente_erro_inesperado' });
    expect(executarAgente).toHaveBeenCalledTimes(2);
    expect(contemSentinela(linhas.join(''))).toBe(false);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'agente_erro_inesperado', jobId: 'job-1', execucaoId: ID_1, erro: { classe: 'Error' } });
  });
});
