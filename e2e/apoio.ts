// Apoio dos testes e2e do painel (T36): entrar com as contas fictícias do seed, conferir o axe e chamar a API com a
// sessão da página. Tudo pela API do próprio sistema (Better Auth e rotas), para o mesmo teste rodar contra a
// homologação (BASE_URL).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { relogioDoSistema } from '../src/lib/relogio';
import { codigoTotp } from '../test/sessao';
import { procurarEmPaginas, TAMANHO_DA_PAGINA } from './preparacao';

// 03, seção 5, e RNF-11: as regras do axe que toda tela cumpre.
export const TAGS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

function origem(): string {
  const base = test.info().project.use.baseURL;
  if (!base) throw new Error('e2e: baseURL ausente no playwright.config.ts');
  return new URL(base).origin;
}

// IP fictício da faixa 198.18.0.0/15, reservada a testes de desempenho de rede (RFC 2544), um por chamada de login: o
// limite por IP do Better Auth (10 por minuto, C-06) não liga um teste ao outro. Com `n` abaixo de 64.000, o terceiro
// octeto vai de 0 a 255 e o quarto de 1 a 250. Se a rota passar por um proxy que regrava `x-real-ip`, o limite volta a
// valer pelo IP real. Exportado para os testes de tela de login (T37), que o põem em `setExtraHTTPHeaders`.
let contadorIp = 0;
export function ipFicticio(): string {
  const n = contadorIp++ % 64_000;
  return `198.18.${Math.floor(n / 250)}.${(n % 250) + 1}`;
}

// Login pela API do Better Auth: e-mail e senha, depois o código TOTP do segredo fictício do seed. Os cookies ficam no
// contexto da página, como num login pela tela.
export async function entrarComo(page: Page, conta: 'cto' | 'administradora'): Promise<void> {
  const c = CONTAS_FICTICIAS[conta];
  const cabecalhos = { origin: origem(), 'x-real-ip': ipFicticio() };
  const login = await page.request.post('/api/auth/sign-in/email', { headers: cabecalhos, data: { email: c.email, password: c.senha } });
  expect(login.status(), `login da conta ${conta}`).toBe(200);
  const codigo = codigoTotp(c.segredoTotp, relogioDoSistema.agora());
  const verificar = await page.request.post('/api/auth/two-factor/verify-totp', { headers: cabecalhos, data: { code: codigo } });
  expect(verificar.status(), `código TOTP da conta ${conta}`).toBe(200);
}

// Só a senha, pela API: as contas sem 2FA do seed (T37) ficam com a sessão curta que só abre /configurar-2fa (C-08).
export async function entrarSoComSenha(page: Page, conta: 'sem2fa' | 'configurar2fa'): Promise<void> {
  const c = CONTAS_FICTICIAS[conta];
  const login = await page.request.post('/api/auth/sign-in/email', {
    headers: { origin: origem(), 'x-real-ip': ipFicticio() },
    data: { email: c.email, password: c.senha },
  });
  expect(login.status(), `login da conta ${conta}`).toBe(200);
}

// Nenhuma violação do axe nas regras de TAGS_AXE. A mensagem do erro lista regra, impacto e alvo, sem o HTML da página.
//
// DEC-DEM-20261102-0002-v1: depois de uma Server Action, o Next 16 re-renderiza a página e o <title> chega por
// streaming, depois do corpo que o teste espera. Por isso o axe só roda depois de a página ter <title> não vazio, por
// até 5 s. A espera não decide nada: se o título não chegar, o axe roda assim mesmo e reprova pela regra
// `document-title`, para o erro dizer a regra, e não o tempo esgotado (e2e/sem-violacoes.spec.ts). As regras são as de
// TAGS_AXE, sem nenhuma desligada nem filtrada.
const ESPERA_DO_TITULO_MS = 5_000;

export async function semViolacoes(page: Page, rotulo: string): Promise<void> {
  // true: o título chegou; false: não chegou em 5 s, e o axe roda para reprovar com a regra que falta.
  const temTitulo = await page.waitForFunction(() => document.title.trim() !== '', undefined, { timeout: ESPERA_DO_TITULO_MS }).then(
    () => true,
    () => false,
  );
  const r = await new AxeBuilder({ page }).withTags([...TAGS_AXE]).analyze();
  const violacoes = r.violations.map((v) => ({ regra: v.id, impacto: v.impact, alvos: v.nodes.map((n) => n.target.join(' ')) }));
  expect(violacoes, `axe em ${rotulo}${temTitulo ? '' : ' (a página ficou sem <title> por 5 s)'}`).toEqual([]);
}

// Uma demanda própria do e2e, criada pelo seed fictício (scripts/seed-ficticio.ts, TITULOS_DO_E2E) e procurada pelo
// título entre as de tipo melhoria: o teste não gasta o limite de demandas por hora da conta (C-36).
// DEC-DEM-20261102-0003-v1 (N-03): a busca percorre as páginas (procurarEmPaginas), porque numa homologação reaproveitada
// as demandas que o e2e cria pela API empurram as do seed para fora da primeira página.
export async function demandaDoSeed(page: Page, titulo: string): Promise<string> {
  const d = await procurarEmPaginas(
    (offset) =>
      api<{ itens: { id: string; titulo: string }[]; total: number }>(page, 'GET', `/api/demandas?tipo=melhoria&limit=${TAMANHO_DA_PAGINA}&offset=${offset}`),
    (x) => x.titulo === titulo,
  );
  if (!d) throw new Error(`e2e: o seed não tem a demanda "${titulo}"`);
  return d.id;
}

// Chamada à API com a sessão da página: `Origin` do painel e corpo JSON (C-15). Resposta fora de 2xx falha o teste com
// o método, o caminho e o status.
export async function api<T>(page: Page, metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  const leitura = metodo.toUpperCase() === 'GET';
  const r = await page.request.fetch(caminho, {
    method: metodo,
    headers: leitura ? {} : { origin: origem(), 'content-type': 'application/json' },
    ...(corpo === undefined ? {} : { data: JSON.stringify(corpo) }),
  });
  expect(r.ok(), `${metodo} ${caminho} respondeu ${r.status()}`).toBe(true);
  return (await r.json()) as T;
}
