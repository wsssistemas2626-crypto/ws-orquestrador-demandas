// Quem é o ator de uma requisição (C-09). O token de serviço só vale em `Authorization: Bearer`; nunca na query nem
// em cookie. O cookie de sessão do Better Auth vai para `exigirPessoa` (C-04). Cookie de sessão e `Authorization`
// juntos deixam o ator ambíguo: 400. Sem nenhum dos dois: 401.
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import type { Ator } from './ator';
import { exigirPessoa } from './exigir-pessoa';
import { MENSAGENS_ACESSO as MENSAGEM } from './mensagens';
import { validarTokenServico } from './tokens-servico';

// `cookiePrefix: 'wsod'` do Better Auth (auth.ts); `__Secure-` em produção (C-07).
const COOKIES_DE_SESSAO = new Set(['wsod.session_token', '__Secure-wsod.session_token']);
const RE_BEARER = /^Bearer ([^\s]+)$/i;

// O 401 sem credencial é o mesmo de `exigirPessoa`; para token inválido, revogado ou inexistente, uma mensagem só, que
// não diz qual dos três foi.

function temCookieDeSessao(cabecalho: string | null): boolean {
  if (!cabecalho) return false;
  return cabecalho.split(';').some((par) => {
    const i = par.indexOf('=');
    return COOKIES_DE_SESSAO.has((i < 0 ? par : par.slice(0, i)).trim());
  });
}

export async function resolverAtor(req: Request, deps: Pick<Deps, 'db' | 'auth' | 'relogio'>): Promise<Ator> {
  const autorizacao = req.headers.get('authorization');
  const comCookie = temCookieDeSessao(req.headers.get('cookie'));

  if (autorizacao !== null && comCookie) throw new ErroDominio('entrada_invalida', MENSAGEM.ambiguo);
  if (autorizacao !== null) {
    const token = RE_BEARER.exec(autorizacao.trim())?.[1];
    const ator = token ? await validarTokenServico(deps.db, token) : null;
    if (!ator) throw new ErroDominio('nao_autenticado', MENSAGEM.token_invalido);
    return ator;
  }
  if (comCookie) return exigirPessoa(deps, req.headers);
  throw new ErroDominio('nao_autenticado', MENSAGEM.nao_autenticado);
}
