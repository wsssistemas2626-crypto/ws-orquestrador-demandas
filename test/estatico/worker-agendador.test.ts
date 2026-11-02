// 06-T29-testes (qa-automacao), Minor 1 da 06-T29-revisao: sem `schedule` no pg-boss do worker, o cron de
// worker.batimento e de retencao.expurgo não dispara, e a suíte de integração continua verde (os testes enviam o job à
// mão). Esperar o disparo real custa até um minuto de relógio real, então a ligação é conferida no código: o worker
// sobe a fila com `agendador: true`, e `criarFila` passa a opção ao `schedule` e ao `supervise` do pg-boss.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');

// Chamadas a criarFila com o objeto de opções literal `{ agendador: true }` (espaços livres).
const FILA_DO_WORKER = /criarFila\(\s*[\w.]+\s*,\s*\{\s*agendador:\s*true\s*,?\s*\}\s*\)/;
// O construtor do pg-boss em criarFila com as duas opções ligadas à variável `agendador`.
const SCHEDULE = /\bschedule:\s*agendador\b/;
const SUPERVISE = /\bsupervise:\s*agendador\b/;

it('src/worker/index.ts sobe a fila com o agendador ligado', () => {
  const texto = ler('src/worker/index.ts');
  const chamadas = texto.match(/criarFila\([^)]*\)/g) ?? [];
  expect(chamadas).toHaveLength(1);
  expect(chamadas[0]).toMatch(FILA_DO_WORKER);
});

it('criarFila liga schedule e supervise do pg-boss pela opção agendador, e o app fica com os dois desligados', () => {
  const texto = ler('src/lib/fila.ts');
  const inicio = texto.indexOf('export async function criarFila(');
  expect(inicio).toBeGreaterThan(-1);
  const corpo = texto.slice(inicio, texto.indexOf('\n}\n', inicio));
  expect(corpo).toMatch(/const agendador = op\.agendador \?\? false;/);
  expect(corpo).toMatch(SCHEDULE);
  expect(corpo).toMatch(SUPERVISE);
});

it('as regras recusam a ligação errada (o teste não passa por qualquer motivo)', () => {
  expect('criarFila(config.databaseUrl)').not.toMatch(FILA_DO_WORKER);
  expect('criarFila(config.databaseUrl, { agendador: false })').not.toMatch(FILA_DO_WORKER);
  expect('criarFila(config.databaseUrl, {})').not.toMatch(FILA_DO_WORKER);
  expect('criarFila(config.databaseUrl, { agendador: true })').toMatch(FILA_DO_WORKER);
  expect('schedule: false').not.toMatch(SCHEDULE);
  expect('supervise: false').not.toMatch(SUPERVISE);
});
