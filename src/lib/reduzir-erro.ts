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
  'PrazoDaTransacaoEsgotado', // src/db/transacao.ts (M-3 da 0019)
]);

// B-1 do 0009: a classe que pode sair no log e no Sentry. 'desconhecido' (o valor que não é Error), um identificador
// terminado em Error ou Exception ('Error', 'TypeError', 'DrizzleQueryError') ou uma das CLASSES_DO_PROJETO.
export function classeAceita(nome: string): boolean {
  if (nome === 'desconhecido') return true;
  if (!FORMATO_CLASSE.test(nome)) return false;
  return SUFIXO_DE_ERRO.test(nome) || CLASSES_DO_PROJETO.has(nome);
}

// B-3 da revisão do 0011: as funções exportadas daqui nunca lançam. Um getter que lança em `name`, `code`, `cause` ou
// `digest`, ou um Proxy com armadilha que lança (`get`, `has`, `ownKeys`, `getPrototypeOf`), não pode fazer o erro
// sumir do log e do Sentry, nem escapar da rota() e do gancho do Next.

// `x instanceof Error`, sem lançar: o Proxy com getPrototypeOf que lança não é tratado como Error.
export function ehErro(x: unknown): x is Error {
  try {
    return x instanceof Error;
  } catch {
    return false;
  }
}

// O `digest` (identificador do Next) de objeto ou função que o tenha; ausente, ou exceção ao ler, é indefinido.
export function lerDigest(x: unknown): unknown {
  try {
    if (x === null || (typeof x !== 'object' && typeof x !== 'function') || !('digest' in x)) return undefined;
    return (x as { digest: unknown }).digest;
  } catch {
    return undefined;
  }
}

// O corpo de lerCode, que lança se a leitura lançar: reduzirErro precisa saber da exceção para devolver { classe: 'Error' }.
function lerCodeOuLancar(x: unknown): string | undefined {
  if (!x || typeof x !== 'object' || !('code' in x)) return undefined;
  const code = (x as { code: unknown }).code;
  return typeof code === 'string' && FORMATO_CODE.test(code) && !DIGITOS_DEMAIS.test(code) ? code : undefined;
}

// Exportada para o log (B-b do 0009): o `code` de objeto que não é Error passa pelo mesmo formato. Exceção ao ler é
// indefinido.
export function lerCode(x: unknown): string | undefined {
  try {
    return lerCodeOuLancar(x);
  } catch {
    return undefined;
  }
}

// B-b do 0009: o log também recebe o erro que quem chama já reduziu (instrumentation.ts passa `reduzirErro(err)`). Só a
// forma exata { classe, code? }, com a classe aceita por classeAceita, é reconhecida; o `code` passa por lerCode.
// Qualquer outra chave faz o objeto não ser reconhecido (nulo); exceção ao ler, também.
export function erroJaReduzido(x: object): ErroReduzido | null {
  try {
    if (!Object.keys(x).every((k) => k === 'classe' || k === 'code')) return null;
    const classe = (x as { classe?: unknown }).classe;
    if (typeof classe !== 'string' || !classeAceita(classe)) return null;
    const code = lerCodeOuLancar(x);
    return code ? { classe, code } : { classe };
  } catch {
    return null;
  }
}

// Não é Error (ou não dá para saber) → 'desconhecido'. Exceção ao ler `name`, `code` ou `cause` → { classe: 'Error' },
// mesmo com o `name` já lido e aceito: nada lido antes da exceção sai.
export function reduzirErro(e: unknown): ErroReduzido {
  if (!ehErro(e)) return { classe: 'desconhecido' };
  try {
    // B-2 do 0010: o `name` é lido uma vez só e usado só se for texto aceito. Ler de novo deixaria um getter devolver na
    // segunda leitura o que não passou na primeira; um objeto ou array passaria pela conversão a texto da regex.
    const nome: unknown = e.name;
    const classe = typeof nome === 'string' && classeAceita(nome) ? nome : 'Error';
    const code = lerCodeOuLancar(e) ?? lerCodeOuLancar((e as { cause?: unknown }).cause);
    return code ? { classe, code } : { classe };
  } catch {
    return { classe: 'Error' };
  }
}
