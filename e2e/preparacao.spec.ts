// DEC-DEM-20261102-0003-v1: o apoio sem navegador do e2e (e2e/preparacao.ts), com falsos no lugar da API. Os testes não
// usam a fixture `page`: não abrem navegador nem chamam o servidor.
//   - prepararEspERsk (M-01): confere a ESP e o RSK separadamente e cria só o que falta; a falha de uma criação chega a
//     quem chamou, e a chamada seguinte completa a demanda sem versão a mais;
//   - procurarEmPaginas (N-03): percorre a lista de 100 em 100 até o `total`;
//   - proximoId (B-01): o id da versão seguinte à mais nova, sem supor v1.
// Uso por conta deste arquivo: "cto" 0 demandas e 0 versões; "administradora" 0 e 0.
import { expect, test } from './apoio';
import { prepararEspERsk, procurarEmPaginas, proximoId, type ChamadasDaPreparacao } from './preparacao';

const DEMANDA = 'DEM-20261102-0099';

// Falso da API: guarda quantas ESP e RSK a demanda tem e conta as criações. `falharRsk` faz a criação do RSK rejeitar
// esse número de vezes antes de passar, como o 429 do C-36 ou o tempo esgotado depois de a ESP gravar.
function falso(inicio: { esp: number; rsk: number }, falharRsk = 0) {
  const estado = { ...inicio };
  const criadas = { esp: 0, rsk: 0 };
  let falhasRestantes = falharRsk;
  const lista = (n: number, tipo: string) => Array.from({ length: n }, (_, i) => ({ id: `${tipo}-${DEMANDA}-v${n - i}` }));
  const chamadas: ChamadasDaPreparacao = {
    listarEsp: async () => lista(estado.esp, 'ESP'),
    listarRsk: async () => lista(estado.rsk, 'RSK'),
    criarEsp: async () => {
      estado.esp += 1;
      criadas.esp += 1;
      return { id: `ESP-${DEMANDA}-v${estado.esp}` };
    },
    criarRsk: async () => {
      if (falhasRestantes > 0) {
        falhasRestantes -= 1;
        throw new Error('POST /api/demandas/<id>/pareceres-risco respondeu 429');
      }
      estado.rsk += 1;
      criadas.rsk += 1;
      return { id: `RSK-${DEMANDA}-v${estado.rsk}` };
    },
  };
  return { chamadas, estado, criadas };
}

test.describe('prepararEspERsk (M-01)', () => {
  test('0 ESP e 0 RSK: cria uma ESP e um RSK', async () => {
    const f = falso({ esp: 0, rsk: 0 });
    await prepararEspERsk(f.chamadas);
    expect(f.criadas).toEqual({ esp: 1, rsk: 1 });
    expect(f.estado).toEqual({ esp: 1, rsk: 1 });
  });

  test('1 ESP e 0 RSK (a falha parcial da M-01): não cria ESP e cria um RSK', async () => {
    const f = falso({ esp: 1, rsk: 0 });
    await prepararEspERsk(f.chamadas);
    expect(f.criadas).toEqual({ esp: 0, rsk: 1 });
    expect(f.estado).toEqual({ esp: 1, rsk: 1 });
  });

  test('1 ESP e 1 RSK: não cria nada', async () => {
    const f = falso({ esp: 1, rsk: 1 });
    await prepararEspERsk(f.chamadas);
    expect(f.criadas).toEqual({ esp: 0, rsk: 0 });
    expect(f.estado).toEqual({ esp: 1, rsk: 1 });
  });

  test('a criação do RSK falha uma vez: a 1.ª chamada rejeita com o mesmo erro, a 2.ª cria só o RSK, a 3.ª não cria nada', async () => {
    const f = falso({ esp: 0, rsk: 0 }, 1);
    await expect(prepararEspERsk(f.chamadas)).rejects.toThrow('POST /api/demandas/<id>/pareceres-risco respondeu 429');
    expect(f.estado).toEqual({ esp: 1, rsk: 0 });
    await prepararEspERsk(f.chamadas);
    expect(f.criadas).toEqual({ esp: 1, rsk: 1 });
    expect(f.estado).toEqual({ esp: 1, rsk: 1 });
    await prepararEspERsk(f.chamadas);
    expect(f.criadas).toEqual({ esp: 1, rsk: 1 });
    expect(f.estado).toEqual({ esp: 1, rsk: 1 });
  });
});

test.describe('procurarEmPaginas (N-03)', () => {
  // 250 itens em páginas de 100, como a fila da API (LIMITE_PAGINA).
  const itens = Array.from({ length: 250 }, (_, i) => ({ n: i + 1 }));
  function paginas() {
    const offsets: number[] = [];
    const buscar = async (offset: number) => {
      offsets.push(offset);
      return { itens: itens.slice(offset, offset + 100), total: itens.length };
    };
    return { buscar, offsets };
  }

  test('acha o item 230, na 3.ª página', async () => {
    const p = paginas();
    expect(await procurarEmPaginas(p.buscar, (x) => x.n === 230)).toEqual({ n: 230 });
    expect(p.offsets).toEqual([0, 100, 200]);
  });

  test('para na página do item, sem buscar as seguintes', async () => {
    const p = paginas();
    expect(await procurarEmPaginas(p.buscar, (x) => x.n === 5)).toEqual({ n: 5 });
    expect(p.offsets).toEqual([0]);
  });

  test('item que não existe: devolve undefined e para no total, sem página a mais (3 chamadas)', async () => {
    const p = paginas();
    expect(await procurarEmPaginas(p.buscar, (x) => x.n === 999)).toBeUndefined();
    expect(p.offsets).toEqual([0, 100, 200]);
  });

  test('lista vazia: uma chamada só e undefined', async () => {
    const offsets: number[] = [];
    const vazio = async (offset: number) => {
      offsets.push(offset);
      return { itens: [] as { n: number }[], total: 0 };
    };
    expect(await procurarEmPaginas(vazio, () => true)).toBeUndefined();
    expect(offsets).toEqual([0]);
  });
});

test.describe('proximoId (B-01)', () => {
  const id = (tipo: string, v: number, demanda = DEMANDA) => `${tipo}-${demanda}-v${v}`;

  test('lista vazia dá v1', () => {
    expect(proximoId('RSK', DEMANDA, [])).toBe(id('RSK', 1));
  });

  test('[v3, v2, v1] dá v4', () => {
    expect(proximoId('ESP', DEMANDA, [id('ESP', 3), id('ESP', 2), id('ESP', 1)])).toBe(id('ESP', 4));
  });

  test('[v1, v10, v2] dá v11: o maior pelo número, não pela posição nem pelo texto', () => {
    expect(proximoId('DEC', DEMANDA, [id('DEC', 1), id('DEC', 10), id('DEC', 2)])).toBe(id('DEC', 11));
  });

  test('id de outra demanda, de outro tipo ou fora do formato lança erro', () => {
    expect(() => proximoId('RSK', DEMANDA, [id('RSK', 1, 'DEM-20261102-0098')])).toThrow();
    expect(() => proximoId('RSK', DEMANDA, [id('ESP', 1)])).toThrow();
    expect(() => proximoId('RSK', DEMANDA, [`RSK-${DEMANDA}-vx`])).toThrow();
    expect(() => proximoId('RSK', DEMANDA, [`RSK-${DEMANDA}-v1-extra`])).toThrow();
  });
});
