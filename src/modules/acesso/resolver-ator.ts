// Quem é o ator de uma requisição (C-09). O token de serviço só vale em `Authorization: Bearer`; nunca na query nem
// em cookie. O cookie de sessão do Better Auth vai para `exigirPessoa` (C-04). Cookie de sessão e `Authorization`
// juntos deixam o ator ambíguo: 400. Sem nenhum dos dois: 401.
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import type { Ator } from './ator';
import { exigirPessoa } from './exigir-pessoa';
import { validarTokenServico } from './tokens-servico';

// `cookiePrefix: 'wsod'` do Better Auth (auth.ts); `__Secure-` em produção (C-07).
const COOKIES_DE_SESSAO = new Set(['wsod.session_token', '__Secure-wsod.session_token']);
const RE_BEARER = /^Bearer ([^\s]+)$/i;

// Mensagem de 401 da 03, seção 2.8, a mesma de `exigirPessoa`; para token inválido, revogado ou inexistente, uma só,
// que não diz qual dos três foi.
const MENSAGEM = {
  nao_autenticado: 'Sua sessão terminou. Entre de novo para continuar.',
  token_invalido: 'Token de serviço inválido ou revogado.',
  ambiguo: 'Use só uma forma de autenticação.',
} as const;

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
