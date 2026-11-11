// Apoio dos testes e2e do painel (T36): entrar com as contas fictícias do seed, conferir o axe e chamar a API com a
// sessão da página. Tudo pela API do próprio sistema (Better Auth e rotas), para o mesmo teste rodar contra a
// homologação (BASE_URL).
import AxeBuilder from '@axe-core/playwright';
import { expect as expectBase, test as testBase, type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { relogioDoSistema } from '../src/lib/relogio';
import { codigoTotp } from '../test/sessao';
import { procurarEmPaginas, TAMANHO_DA_PAGINA } from './preparacao';
import { origemDaUrl, problemasDaVigia, type Coletor } from './vigia';

// 03, seção 5, e RNF-11: as regras do axe que toda tela cumpre.
export const TAGS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const;

const MENSAGEM_CSP = /Content Security Policy/i;

// CV-03 (04, DEC-DEM-20261110-0015-v1): fixture automática herdada por todo spec, que importa `test` e `expect` daqui.
// Reprova o teste com requisição a outra origem (inclusive websocket), com evento securitypolicyviolation e com
// mensagem de CSP no console. Console, função exposta e script inicial ficam no contexto, e não só na página: valem
// também para a aba aberta por `context.newPage()` no meio do teste.
export const test = testBase.extend<{ vigiaDeOrigemECsp: Coletor }>({
  vigiaDeOrigemECsp: [
    async ({ page, context, baseURL }, use) => {
      if (!baseURL) throw new Error('e2e: baseURL ausente no playwright.config.ts');
      const doApp = new URL(baseURL).origin;
      const c: Coletor = { outraOrigem: [], csp: [] };
      const anotar = (url: string) => {
        const o = origemDaUrl(url);
        if (o !== null && o !== doApp) c.outraOrigem.push(url);
      };
      context.on('request', (r) => anotar(r.url()));
      const vigiarWebsocket = (p: Page) => p.on('websocket', (ws) => anotar(ws.url()));
      vigiarWebsocket(page);
      context.on('page', vigiarWebsocket);
      context.on('console', (m) => {
        if (MENSAGEM_CSP.test(m.text())) c.csp.push(m.text());
      });
      await context.exposeFunction('__vigiaCsp', (texto: string) => {
        c.csp.push(texto);
      });
      await context.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (e) => {
          void (window as unknown as { __vigiaCsp: (t: string) => Promise<void> }).__vigiaCsp(`${e.violatedDirective} ${e.blockedURI}`);
        });
      });
      await use(c);
      expectBase(problemasDaVigia(c), 'CV-03: nenhuma requisição a outra origem nem violação de CSP').toEqual([]);
    },
    { auto: true },
  ],
});
export const expect = expectBase;

function origem(): string {
  const base = testBase.info().project.use.baseURL;
  if (!base) throw new Error('e2e: baseURL ausente no playwright.config.ts');
  return new URL(base).origin;
}

// IP fictício da faixa 198.18.0.0/15, reservada a testes de desempenho de rede (RFC 2544), um por chamada de login: o
// limite por IP do Better Auth (10 por minuto, C-06) não liga um teste ao outro. Com `n` abaixo de 64.000, o terceiro
// octeto vai de 0 a 255 e o quarto de 1 a 250. Se a rota passar por um proxy que regrava `x-real-ip`, o limite volta a
// valer pelo IP real. Exportado para os testes de tela de login (T37), que o põem em `setExtraHTTPHeaders`.
//
// 06-T16-testes: o contador começa num bloco de 8.000 IPs escolhido pelo índice do worker (TEST_WORKER_INDEX, que o
// Playwright põe em cada worker). Depois de um teste que falha, o Playwright troca o worker e este módulo volta a
// carregar com o contador em 0: o teste seguinte repetia os primeiros IPs do worker anterior, ainda dentro do mesmo
// minuto, e o C-06 da autenticacao-qa recebia 429 na 10.ª tentativa, e não na 11.ª. Cada worker novo tem índice novo, e
// dois workers seguidos nunca começam no mesmo bloco.
const IPS_POR_WORKER = 8_000;
const INICIO_DO_WORKER = (Number(process.env.TEST_WORKER_INDEX ?? '0') || 0) * IPS_POR_WORKER;
let contadorIp = 0;
export function ipFicticio(): string {
  const n = (INICIO_DO_WORKER + contadorIp++) % 64_000;
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

// T16 do DEC-DEM-20261110-0015-v1 (D-06, RNF-13): o axe no mesmo estado da página em 1280 × 720 e em 390 × 844, e a
// janela volta ao tamanho de antes. Nada é clicado nem criado entre as duas medições.
//
// Depois de cada troca de largura, a página volta ao topo antes do axe (06-T14-tech-lead, "Decisão sobre a pendência do
// axe target-size"): com a janela mais estreita, a ancoragem de rolagem do Chromium mantém na mesma altura o elemento que
// estava no topo, e um campo pode parar sob a barra fixa de 56 px da casca, ao lado de "Menu". O axe acusaria
// `target-size` pela posição em que o teste deixou a rolagem, e não pela tela. A regra continua ligada: com a página no
// topo, um alvo pequeno de verdade continua reprovando.
export async function semViolacoesNasDuasLarguras(page: Page, rotulo: string): Promise<void> {
  const antes = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(page, `${rotulo} (1280 × 720)`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(page, `${rotulo} (390 × 844)`);
  await page.setViewportSize(antes);
}

// 06-T16-testes (Minor 2 da 06-T16-tech-lead): os auxiliares de gaveta e de recolhível num lugar só. Antes eram cópias em
// casca.spec, casca-qa.spec, axe-todas.spec e alvo-de-toque.spec, de dois jeitos (uma delas não esperava a animação), e
// a instabilidade do M4 da 06-T13-tech-lead nasceu de duas cópias que se afastaram.
const gavetaDoMenu = (page: Page) => page.getByRole('dialog', { name: 'Menu' });

// A gaveta parada no lugar: o fim das animações do <dialog> (sem animação, com movimento reduzido, a lista é vazia).
export async function gavetaParada(page: Page): Promise<void> {
  await gavetaDoMenu(page).evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)).then(() => undefined));
}

// Abre a gaveta pelo botão "Menu" (abaixo de 768 px) e espera o fim da entrada de 200 ms.
//   - O clique antes da hidratação não faz nada; por isso a abertura é conferida e, se não abriu, o clique se repete.
//   - O clique só se repete com a gaveta ainda fechada: com a hidratação lenta, o React reaplica o clique feito antes
//     dela e a gaveta abre depois do 1 s de espera; um novo clique em "Menu" cairia no véu do <dialog> modal ("subtree
//     intercepts pointer events") até o tempo acabar (06-T13-testes e M4 da 06-T13-tech-lead).
//   - O fim da animação vem depois, para nenhum clique por coordenada nem medida cair na gaveta ainda entrando (Minor 1
//     da 06-T05-tech-lead, volta 1, e 06-T11-testes).
export async function abrirGaveta(page: Page): Promise<void> {
  const gaveta = gavetaDoMenu(page);
  await expect(async () => {
    if (!(await gaveta.isVisible())) await page.getByRole('button', { name: 'Menu', exact: true }).click({ timeout: 1_000 });
    await expect(gaveta).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await gavetaParada(page);
}

// Abre um recolhível do `main` ("Mais filtros" na T03, "Ver vantagens…" na T11), que só tem botão abaixo de 768 px. O
// clique antes da hidratação não faz nada: ele só se repete enquanto o botão segue fechado.
export async function abrirRecolhivel(page: Page, nome: RegExp): Promise<void> {
  const botao = page.locator('main').getByRole('button', { name: nome });
  await expect(async () => {
    if ((await botao.getAttribute('aria-expanded')) !== 'true') await botao.click({ timeout: 1_000 });
    await expect(botao).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
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
