// e2e/vigia-qa.spec.ts — CV-03 (04), complemento do qa-automacao na 06-T01-testes. O teste negativo (vigia.spec.ts)
// usa test.fail(): ele passa com qualquer falha, inclusive de navegação ou de tempo esgotado, e não diz qual canal
// funcionou. Aqui o coletor da vigia é lido canal por canal, depois de uma folha de estilo de outra origem injetada:
//   (a) requisição a outra origem, (b) evento securitypolicyviolation, (c) mensagem de CSP no console;
// na página do teste e numa aba aberta por context.newPage() (a vigia fica no contexto, 06-T01-engenheiro-frontend).
// No fim, depois de os três canais chegarem, o coletor é esvaziado: o que o próprio teste injetou não o reprova.
// Não entra na conta, não cria demanda nem versão (C-36): "cto" 0 e 0; "administradora" 0 e 0.
import { type Page } from '@playwright/test';
import { expect, test } from './apoio';
import { problemasDaVigia, type Coletor } from './vigia';

const FORA = 'https://exemplo.test/x.css';
const MENSAGEM_CSP = /Content Security Policy/i;

async function injetarFolhaDeFora(page: Page): Promise<void> {
  const violacao = page.waitForEvent('console', (m) => MENSAGEM_CSP.test(m.text()));
  await page.evaluate((href) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.append(l);
  }, FORA);
  await violacao;
}

async function conferirOsTresCanais(c: Coletor): Promise<void> {
  await expect.poll(() => c.outraOrigem, 'canal (a): requisição a outra origem').toContain(FORA);
  await expect.poll(() => c.csp.some((m) => /^[a-z-]+ https:\/\/exemplo\.test\/x\.css$/.test(m)), 'canal (b): securitypolicyviolation').toBe(true);
  await expect.poll(() => c.csp.some((m) => MENSAGEM_CSP.test(m)), 'canal (c): console').toBe(true);
  expect(problemasDaVigia(c)).toContain(`requisição a outra origem: ${FORA}`);
}

function esvaziar(c: Coletor): void {
  c.outraOrigem.length = 0;
  c.csp.length = 0;
}

test('CV-03: a tela do app sozinha não anota nada; a folha de fora é anotada pelos três canais', async ({ page, vigiaDeOrigemECsp }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(problemasDaVigia(vigiaDeOrigemECsp)).toEqual([]);
  await injetarFolhaDeFora(page);
  await conferirOsTresCanais(vigiaDeOrigemECsp);
  esvaziar(vigiaDeOrigemECsp);
});

test('CV-03: a aba aberta no mesmo contexto também é vigiada', async ({ context, vigiaDeOrigemECsp }) => {
  const aba = await context.newPage();
  await aba.goto('/entrar');
  await expect(aba.getByRole('heading', { level: 1 })).toBeVisible();
  expect(problemasDaVigia(vigiaDeOrigemECsp)).toEqual([]);
  await injetarFolhaDeFora(aba);
  await conferirOsTresCanais(vigiaDeOrigemECsp);
  await aba.close();
  esvaziar(vigiaDeOrigemECsp);
});
