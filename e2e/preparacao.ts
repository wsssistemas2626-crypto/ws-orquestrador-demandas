// DEC-DEM-20261102-0003-v1: apoio sem navegador do e2e, testado em e2e/preparacao.spec.ts com falsos. Não importa
// @playwright/test: cada função recebe as chamadas que faz, e o teste as troca por um falso que guarda o estado.

export type ChamadasDaPreparacao = {
  listarEsp(): Promise<unknown[]>;
  listarRsk(): Promise<unknown[]>;
  criarEsp(): Promise<unknown>;
  criarRsk(): Promise<unknown>;
};

// M-01: a demanda do seed termina com pelo menos uma ESP e um RSK. Cada lista é conferida separadamente, e só o que
// falta é criado: depois de uma falha parcial (a ESP gravou e o RSK recebeu 429 ou estourou o tempo), a chamada
// seguinte cria só o RSK, sem versão a mais. A ESP vem antes porque o RSK cita a ESP mais nova. A falha de uma criação
// não é engolida: chega a quem chamou e reprova o teste.
export async function prepararEspERsk(c: ChamadasDaPreparacao): Promise<void> {
  if ((await c.listarEsp()).length === 0) await c.criarEsp();
  if ((await c.listarRsk()).length === 0) await c.criarRsk();
}

// LIMITE_PAGINA de src/modules/demandas/schemas.ts e da fila de pacotes: o maior `limit` que a API aceita.
export const TAMANHO_DA_PAGINA = 100;

// N-03: percorre a lista da API de 100 em 100 (`offset`) até achar o item ou chegar ao `total`. As demandas e os DEC
// que o e2e cria a cada execução empurram os do seed para fora da primeira página numa homologação reaproveitada.
export async function procurarEmPaginas<T>(
  buscarPagina: (offset: number) => Promise<{ itens: T[]; total: number }>,
  achar: (x: T) => boolean,
): Promise<T | undefined> {
  for (let offset = 0; ; offset += TAMANHO_DA_PAGINA) {
    const { itens, total } = await buscarPagina(offset);
    const achado = itens.find(achar);
    if (achado !== undefined) return achado;
    if (itens.length === 0 || offset + TAMANHO_DA_PAGINA >= total) return undefined;
  }
}

// B-01: o id da versão seguinte à mais nova da demanda (`<tipo>-<demandaId>-v<maior + 1>`), como o servidor numera
// (versoes.ts: max(versao) + 1). O maior é pelo número, e não pela posição na lista nem pela ordem do texto. Um id de
// outro tipo, de outra demanda ou fora do formato lança erro: a lista lida não é a que o teste pensa.
export function proximoId(tipo: 'ESP' | 'RSK' | 'DEC', demandaId: string, ids: string[]): string {
  const prefixo = `${tipo}-${demandaId}-v`;
  let maior = 0;
  for (const id of ids) {
    const numero = id.startsWith(prefixo) ? id.slice(prefixo.length) : '';
    if (!/^[1-9]\d*$/.test(numero)) throw new Error(`e2e: ${id} não é uma versão ${tipo} da demanda ${demandaId}`);
    maior = Math.max(maior, Number(numero));
  }
  return `${prefixo}${maior + 1}`;
}
