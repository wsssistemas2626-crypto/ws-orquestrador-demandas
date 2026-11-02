// Argumentos de linha de comando dos scripts de operação (C-37). Só a forma `--nome valor` ou `--nome=valor`, cada nome
// uma vez, conferida por um `z.strictObject`: nome que o schema não conhece (como `--senha`) é recusado. O erro cita o
// nome do argumento, nunca o valor recebido.
import type { z } from 'zod';
import { deZod, ErroDominio } from '../../src/lib/erros';

// Nome de argumento que pode aparecer na mensagem de erro; fora disso, vira '*'.
const NOME_SEGURO = /^[a-z][a-z0-9-]{0,39}$/i;
const nomeExibivel = (n: string) => (NOME_SEGURO.test(n) ? `--${n}` : '--*');

const recusar = (mensagem: string) => new ErroDominio('entrada_invalida', mensagem);

function separar(argv: readonly string[]): Record<string, string> {
  const valores: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const item = argv[i]!;
    if (!item.startsWith('--') || item.length === 2) throw recusar('Use só argumentos no formato --nome valor.');
    const igual = item.indexOf('=');
    const nome = igual > 0 ? item.slice(2, igual) : item.slice(2);
    let valor: string;
    if (igual > 0) {
      valor = item.slice(igual + 1);
    } else {
      const proximo = argv[i + 1];
      if (proximo === undefined || proximo.startsWith('--')) throw recusar(`Falta o valor de ${nomeExibivel(nome)}.`);
      valor = proximo;
      i++;
    }
    if (Object.prototype.hasOwnProperty.call(valores, nome)) throw recusar(`O argumento ${nomeExibivel(nome)} aparece mais de uma vez.`);
    valores[nome] = valor;
  }
  return valores;
}

export function lerArgumentos<S extends z.ZodType>(schema: S, argv: readonly string[]): z.infer<S> {
  const r = schema.safeParse(separar(argv));
  if (r.success) return r.data;
  const naoAceitos = r.error.issues.flatMap((i) => (i.code === 'unrecognized_keys' ? i.keys : []));
  if (naoAceitos.length > 0) {
    const nomes = [...new Set(naoAceitos.map(nomeExibivel))].join(', ');
    throw recusar(`Argumento não aceito: ${nomes}. Senha e token nunca entram por argumento: o script gera e mostra uma vez.`);
  }
  const e = deZod(r.error);
  const campos = (e.extras.campos ?? []).map((c) => `--${c.campo.split('.')[0]}`);
  throw new ErroDominio('entrada_invalida', `Corrija os argumentos: ${[...new Set(campos)].join(', ')}.`, e.extras);
}
