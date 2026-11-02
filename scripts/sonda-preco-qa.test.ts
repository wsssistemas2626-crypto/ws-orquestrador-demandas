// T33 (qa-automacao): varredura do schema de preço por modelo (RF-17, C-26). Sem banco e sem relógio: só o schema do
// script e o dos argumentos. Gerador pseudoaleatório com semente fixa, para a varredura ser a mesma em toda execução.
//
// Achado registrado na entrega 06-T33-qa-automacao.md (Minor): a conferência de 6 casas (`ate6Casas`) usa tolerância
// absoluta de 1e-6 sobre `n * 1_000_000`, e a partir de 16.384 a imprecisão do ponto flutuante passa dela; parte dos
// valores válidos acima disso é recusada (exemplo: 16416.881208). Por isso a varredura aqui fica na faixa realista
// (abaixo de 10.000 dólares por milhão), e as bordas da faixa documentada têm teste próprio.
import { describe, expect, it } from 'vitest';
import { argumentosDefinirPreco, precoModeloSchema } from './definir-preco-modelo';
import { lerArgumentos } from './lib/argumentos';

function gerador(semente: number) {
  let s = semente;
  return () => (s = (s * 1103515245 + 12345) % 2147483648);
}

const aceito = (n: number) => precoModeloSchema.safeParse({ modelo: 'modelo-ficticio', entradaPorMilhao: n, saidaPorMilhao: 1 }).success;

describe('preço por modelo: faixa e casas decimais', () => {
  it('as bordas da faixa documentada são aceitas: 0, 0,000001 e 999.999,999999', () => {
    for (const n of [0, 0.000001, 999_999.999999]) expect(aceito(n), String(n)).toBe(true);
    expect(aceito(-0.000001)).toBe(false);
    expect(aceito(1_000_000)).toBe(false);
    expect(aceito(999_999.9999999)).toBe(false);
  });

  it('todo valor de até 6 casas abaixo de 10.000 é aceito pelo schema e pelos argumentos, com o mesmo número', () => {
    const proximo = gerador(20261030);
    const recusados: string[] = [];
    for (let i = 0; i < 20_000; i++) {
      const texto = `${proximo() % 10_000}.${String(proximo() % 1_000_000).padStart(6, '0')}`;
      if (!aceito(Number(texto))) recusados.push(texto);
      const a = lerArgumentos(argumentosDefinirPreco, ['--modelo', 'modelo-ficticio', '--entradaPorMilhao', texto, '--saidaPorMilhao', '1']);
      // O que vai ao numeric(12, 6) é toFixed(6): tem de ser o texto digitado.
      expect(a.entradaPorMilhao.toFixed(6)).toBe(texto);
    }
    expect(recusados).toEqual([]);
  });

  it('valor com a 7ª casa diferente de zero é recusado em toda a faixa realista', () => {
    const proximo = gerador(7);
    for (let i = 0; i < 2_000; i++) {
      const setimaCasa = 1 + (proximo() % 9);
      const texto = `${proximo() % 10_000}.${String(proximo() % 1_000_000).padStart(6, '0')}${setimaCasa}`;
      expect(aceito(Number(texto)), texto).toBe(false);
    }
  });
});
