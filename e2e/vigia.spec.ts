// e2e/vigia.spec.ts — CV-03: a vigia reprova de verdade (teste negativo). Sem ele, uma guarda que nunca reprova daria
// falsa segurança a toda a suíte.
import { test } from './apoio';

test('CV-03 (negativo): uma folha de estilo de outra origem reprova o teste', async ({ page }) => {
  test.fail();
  await page.goto('/entrar');
  const violacao = page.waitForEvent('console', (m) => /Content Security Policy/i.test(m.text()));
  await page.evaluate(() => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://exemplo.test/x.css';
    document.head.append(l);
  });
  await violacao;
});
