// Reduz qualquer erro a { classe, code }, sem mensagem, `detail`, parâmetros nem pilha (C-21).
// A mensagem do Postgres e a do Drizzle carregam o valor que falhou (e-mail, texto da demanda); por isso nunca saem.
export type ErroReduzido = { classe: string; code?: string };

// `code` do Postgres ('23505'), do Node ('ECONNREFUSED', 'ERR_...') e de biblioteca: curto, sem espaço nem pontuação.
// B-1 do 0009 (C-21): nem com 10 ou mais dígitos seguidos, em qualquer posição. Assim um CPF, um CNPJ ou um telefone
// que quem chama passe como `code` não sai; nenhum código conhecido tem tantos dígitos (o do Postgres tem 5 caracteres).
const FORMATO_CODE = /^[A-Za-z0-9_]{1,40}$/;
const DIGITOS_DEMAIS = /\d{10}/;
// Nome de classe de erro: identificador, sem texto livre.
const FORMATO_CLASSE = /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/;
// B-1 do 0009 (C-21): e com cara de classe de erro. Um identificador qualquer pode ser um nome de pessoa ('Joana').
const SUFIXO_DE_ERRO = /(?:Error|Exception)$/;

// B-1 do 0009: as classes que o próprio projeto põe em `name` e que não terminam em Error ou Exception. Lista fechada:
// classe nova fora do sufixo entra aqui, e o teste estático test/estatico/classes-de-erro.test.ts avisa quando faltar.
export const CLASSES_DO_PROJETO: ReadonlySet<string> = new Set([
  'ErroEnvioEmail', // src/modules/avisos/enviador.ts
  'ErroDominio', // src/lib/erros.ts
  'ErroProvedor', // src/modules/agentes/provedor.ts
  'ErroConfiguracao', // src/lib/env.ts
  'ErroLeituraSessao', // src/modules/acesso/exigir-pessoa.ts
  'AvisoNaoEnviado', // src/modules/avisos/aviso-dec.ts
  'ExecucaoPerdida', // src/modules/agentes/execucoes.ts
  'TempoEsgotado', // src/app/api/saude/route.ts
]);

// B-1 do 0009: a classe que pode sair no log e no Sentry. 'desconhecido' (o valor que não é Error), um identificador
// terminado em Error ou Exception ('Error', 'TypeError', 'DrizzleQueryError') ou uma das CLASSES_DO_PROJETO.
export function classeAceita(nome: string): boolean {
  if (nome === 'desconhecido') return true;
  if (!FORMATO_CLASSE.test(nome)) return false;
  return SUFIXO_DE_ERRO.test(nome) || CLASSES_DO_PROJETO.has(nome);
}

// Exportada para o log (B-b do 0009): o `code` de objeto que não é Error passa pelo mesmo formato.
export function lerCode(x: unknown): string | undefined {
  if (!x || typeof x !== 'object' || !('code' in x)) return undefined;
  const code = (x as { code: unknown }).code;
  return typeof code === 'string' && FORMATO_CODE.test(code) && !DIGITOS_DEMAIS.test(code) ? code : undefined;
}

// B-b do 0009: o log também recebe o erro que quem chama já reduziu (instrumentation.ts passa `reduzirErro(err)`). Só a
// forma exata { classe, code? }, com a classe aceita por classeAceita, é reconhecida; o `code` passa por lerCode.
// Qualquer outra chave faz o objeto não ser reconhecido (nulo).
export function erroJaReduzido(x: object): ErroReduzido | null {
  if (!Object.keys(x).every((k) => k === 'classe' || k === 'code')) return null;
  const classe = (x as { classe?: unknown }).classe;
  if (typeof classe !== 'string' || !classeAceita(classe)) return null;
  const code = lerCode(x);
  return code ? { classe, code } : { classe };
}

export function reduzirErro(e: unknown): ErroReduzido {
  if (!(e instanceof Error)) return { classe: 'desconhecido' };
  const classe = classeAceita(e.name) ? e.name : 'Error';
  const code = lerCode(e) ?? lerCode((e as { cause?: unknown }).cause);
  return code ? { classe, code } : { classe };
}
