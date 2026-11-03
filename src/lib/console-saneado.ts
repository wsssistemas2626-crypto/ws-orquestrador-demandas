// M-05 (c) (C-21, G3.7): o Next escreve pelo console o erro que não foi tratado em página, layout ou Server Component,
// com mensagem, pilha e `cause`; na falha de banco, a mensagem do Drizzle traz o SQL e os `params` (id, texto da demanda
// e, na sessão, o token). Instalado no boot (instrumentation.ts, depois da configuração e do Sentry), troca
// console.error e console.warn por uma linha do `log` por lista de permissão:
//   { evento: 'console_erro' | 'console_aviso', erro, erroId }
// `erro` é o primeiro argumento que for Error, reduzido pelo log a { classe, code }; `erroId` é o `digest` dele, que o
// log só aceita no formato fixo. Texto solto e objeto não saem. console.log e console.info não mudam.
//
// O erro de configuração do boot sai antes da troca, legível (C-31, só o nome da variável).
import { log } from './log';
import { capturarErro } from './sentry';

type MetodosTrocados = { error: Console['error']; warn: Console['warn'] };

let originais: MetodosTrocados | null = null;
let escrevendo = false;

function trocar(m: MetodosTrocados): void {
  // eslint-disable-next-line no-console -- G3.7: único ponto que troca console.error e console.warn; depois dele, os dois só escrevem pelo log (M-05, C-21).
  [console.error, console.warn] = [m.error, m.warn];
}

const digestDe = (e: Error): unknown => ('digest' in e ? (e as { digest: unknown }).digest : undefined);

function saneado(nivel: 'error' | 'warn'): (...args: unknown[]) => void {
  const evento = nivel === 'error' ? 'console_erro' : 'console_aviso';
  return (...args: unknown[]) => {
    // Sem reentrada: se o próprio log escrever no console ao falhar, a linha some, sem laço.
    if (escrevendo) return;
    escrevendo = true;
    try {
      const erro = args.find((a): a is Error => a instanceof Error);
      log[nivel]({ evento, ...(erro ? { erro, erroId: digestDe(erro) } : {}) });
      // M-3 (0008): o erro fora de requisição (uncaughtException, unhandledRejection, onError do after()) chega aqui
      // pelo console.error e vai ao Sentry pelo mesmo saneamento das rotas. Com `digest`, o onRequestError já mandou (ou
      // é controle do Next): não vai de novo. console.warn é aviso, não falha: fica só no log. Dentro da guarda e do try:
      // falha do Sentry não entra em laço, não cai no console original e não derruba quem chamou.
      if (nivel === 'error' && erro && !('digest' in erro)) capturarErro(erro, { evento });
    } catch {
      // Falha do log não derruba quem chamou e não cai no console original.
    } finally {
      escrevendo = false;
    }
  };
}

export function instalarConsoleSaneado(): void {
  if (originais) return;
  const { error, warn } = console;
  originais = { error, warn };
  trocar({ error: saneado('error'), warn: saneado('warn') });
}

// Para teste: devolve os métodos originais.
export function desinstalarConsoleSaneado(): void {
  if (!originais) return;
  trocar(originais);
  originais = null;
}
