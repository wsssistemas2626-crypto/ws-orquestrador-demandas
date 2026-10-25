// Reduz qualquer erro a { classe, code }, sem mensagem, `detail`, parâmetros nem pilha (C-21).
// A mensagem do Postgres e a do Drizzle carregam o valor que falhou (e-mail, texto da demanda); por isso nunca saem.
export type ErroReduzido = { classe: string; code?: string };

// `code` do Postgres ('23505'), do Node ('ECONNREFUSED', 'ERR_...') e de biblioteca: curto, sem espaço nem pontuação.
const FORMATO_CODE = /^[A-Za-z0-9_]{1,40}$/;
// Nome de classe de erro: identificador, sem texto livre.
const FORMATO_CLASSE = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;

function lerCode(x: unknown): string | undefined {
  if (!x || typeof x !== 'object' || !('code' in x)) return undefined;
  const code = (x as { code: unknown }).code;
  return typeof code === 'string' && FORMATO_CODE.test(code) ? code : undefined;
}

export function reduzirErro(e: unknown): ErroReduzido {
  if (!(e instanceof Error)) return { classe: 'desconhecido' };
  const classe = FORMATO_CLASSE.test(e.name) ? e.name : 'Error';
  const code = lerCode(e) ?? lerCode((e as { cause?: unknown }).cause);
  return code ? { classe, code } : { classe };
}
