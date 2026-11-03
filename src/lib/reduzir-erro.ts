// Reduz qualquer erro a { classe, code }, sem mensagem, `detail`, parâmetros nem pilha (C-21).
// A mensagem do Postgres e a do Drizzle carregam o valor que falhou (e-mail, texto da demanda); por isso nunca saem.
export type ErroReduzido = { classe: string; code?: string };

// `code` do Postgres ('23505'), do Node ('ECONNREFUSED', 'ERR_...') e de biblioteca: curto, sem espaço nem pontuação.
const FORMATO_CODE = /^[A-Za-z0-9_]{1,40}$/;
// Nome de classe de erro: identificador, sem texto livre.
const FORMATO_CLASSE = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

// Exportada para o log (B-b do 0009): o `code` de objeto que não é Error passa pelo mesmo formato.
export function lerCode(x: unknown): string | undefined {
  if (!x || typeof x !== 'object' || !('code' in x)) return undefined;
  const code = (x as { code: unknown }).code;
  return typeof code === 'string' && FORMATO_CODE.test(code) ? code : undefined;
}

// B-b do 0009: o log também recebe o erro que quem chama já reduziu (instrumentation.ts passa `reduzirErro(err)`). Só a
// forma exata { classe, code? }, com a classe no formato de identificador, é reconhecida; o `code` passa por lerCode.
// Qualquer outra chave faz o objeto não ser reconhecido (nulo).
export function erroJaReduzido(x: object): ErroReduzido | null {
  if (!Object.keys(x).every((k) => k === 'classe' || k === 'code')) return null;
  const classe = (x as { classe?: unknown }).classe;
  if (typeof classe !== 'string' || !FORMATO_CLASSE.test(classe)) return null;
  const code = lerCode(x);
  return code ? { classe, code } : { classe };
}

export function reduzirErro(e: unknown): ErroReduzido {
  if (!(e instanceof Error)) return { classe: 'desconhecido' };
  const classe = FORMATO_CLASSE.test(e.name) ? e.name : 'Error';
  const code = lerCode(e) ?? lerCode((e as { cause?: unknown }).cause);
  return code ? { classe, code } : { classe };
}
