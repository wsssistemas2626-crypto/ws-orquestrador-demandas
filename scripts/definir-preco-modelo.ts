// Preço por modelo de IA (RF-17, C-26, P1-f): o preço só entra por este script, nunca pelo app (o teste estático
// test/estatico/preco-so-por-script.test.ts recusa gravação em preco_modelo dentro de src/).
//
//   pnpm tsx scripts/definir-preco-modelo.ts --modelo <id do modelo> --entradaPorMilhao <US$> --saidaPorMilhao <US$>
//
// Preço novo é vigência nova (linha nova com `vigente_desde` = agora): a anterior fica, porque o custo das chamadas já
// registradas saiu dela. Valores em dólar por milhão de tokens, de 0 a 999.999,999999, com até 6 casas (numeric(12, 6)).
import { z } from 'zod';
import { precoModelo } from '../src/db/schema';
import { comTransacao, type Transacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import { deZod, ErroDominio } from '../src/lib/erros';
import { formatarDataHora } from '../src/lib/fuso';
import { log } from '../src/lib/log';
import { reduzirErro } from '../src/lib/reduzir-erro';
import { LIMITE_MODELO } from '../src/modules/agentes/configuracao';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type Saida } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

const PRECO_MAXIMO = 999_999.999999;
const MENSAGEM_CASAS = 'Use no máximo 6 casas decimais.';
const MENSAGEM_MESMO_INSTANTE = 'Já há um preço deste modelo começando neste mesmo instante. Nada foi alterado.';

// O id do modelo como o provedor o escreve (letras, números, ponto, hífen, sublinhado, dois-pontos), com o mesmo limite
// de tamanho da configuração do agente.
const modelo = z
  .string()
  .trim()
  .min(1)
  .max(LIMITE_MODELO)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, 'Use o id do modelo como o provedor escreve: letras, números, ponto, hífen ou dois-pontos.');

const ate6Casas = (n: number) => Math.abs(Math.round(n * 1_000_000) - n * 1_000_000) < 1e-6;
const preco = z.number().min(0).max(PRECO_MAXIMO).refine(ate6Casas, MENSAGEM_CASAS);

export const precoModeloSchema = z.strictObject({ modelo, entradaPorMilhao: preco, saidaPorMilhao: preco });
export type PrecoDoModelo = z.output<typeof precoModeloSchema>;

// Na linha de comando, o valor chega como texto: só dígitos e ponto decimal, sem vírgula, sinal nem notação científica.
const precoEmTexto = z
  .string()
  .regex(/^\d{1,6}(\.\d{1,6})?$/, 'Use o valor em dólar com ponto decimal e até 6 casas, como 3 ou 0.25.')
  .transform(Number);

export const argumentosDefinirPreco = z.strictObject({ modelo, entradaPorMilhao: precoEmTexto, saidaPorMilhao: precoEmTexto });

// Aceita a transação de quem chama (G3.8): o seed fictício grava o preço junto com o resto.
export async function definirPrecoModelo(deps: Pick<Deps, 'pool' | 'relogio'>, a: PrecoDoModelo, t?: Transacao): Promise<void> {
  const r = precoModeloSchema.safeParse(a);
  if (!r.success) throw deZod(r.error);
  const gravar = (tr: Transacao) =>
    tr.tx.insert(precoModelo).values({
      modelo: r.data.modelo,
      precoEntradaPorMilhao: r.data.entradaPorMilhao.toFixed(6),
      precoSaidaPorMilhao: r.data.saidaPorMilhao.toFixed(6),
      moeda: 'USD',
      vigenteDesde: deps.relogio.agora(),
    });
  try {
    if (t) await gravar(t);
    else await comTransacao(deps.pool, gravar);
  } catch (e) {
    // UNIQUE (modelo, vigente_desde): duas definições do mesmo modelo no mesmo instante.
    if (reduzirErro(e).code === '23505') throw new ErroDominio('conflito', MENSAGEM_MESMO_INSTANTE);
    throw e;
  }
  log.info({ evento: 'preco_modelo_definido', atorTipo: 'sistema' });
}

const dolar = (n: number) => `US$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;

// O `main` do script, exportado para teste.
export async function executarDefinirPreco(deps: Pick<Deps, 'pool' | 'relogio'>, argv: readonly string[], saida: Saida): Promise<number> {
  const a = lerArgumentos(argumentosDefinirPreco, argv);
  const desde = deps.relogio.agora();
  await definirPrecoModelo(deps, a);
  saida.write(
    `Preço do modelo ${a.modelo} definido: ${dolar(a.entradaPorMilhao)} por milhão de tokens de entrada e ` +
      `${dolar(a.saidaPorMilhao)} por milhão de tokens de saída, a partir de ${formatarDataHora(desde)} (horário de Brasília).\n` +
      'O preço anterior, se houver, continua guardado para o custo já registrado.\n',
  );
  return 0;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript(executarDefinirPreco);
}
