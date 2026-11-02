// 08-correcao: o atributo Secure dos cookies do Better Auth segue o protocolo do BETTER_AUTH_URL, e não o NODE_ENV. Com
// https (homologação e produção), os cookies são Secure e levam o prefixo __Secure-; com http, só aceito em produção no
// loopback (env.ts), não são, porque o navegador e o Playwright não devolvem cookie Secure por http. Era isso que
// impedia o e2e de rodar contra o build de produção (`next start` em http://127.0.0.1:3101).
import { afterAll, describe, expect, it } from 'vitest';
import { CONFIG_TESTE } from '../../../test/auth';
import { criarDb, criarPool } from '../../db';
import { criarAuth, usarCookiesSeguros } from './auth';

// Pool sem conexão: o nome e os atributos do cookie saem só da configuração, sem consulta ao banco.
const pool = criarPool(CONFIG_TESTE.databaseUrl, { max: 1 });
afterAll(async () => {
  await pool.end();
});

describe('usarCookiesSeguros', () => {
  it('https → Secure; http → sem Secure (o protocolo manda, não o NODE_ENV)', () => {
    expect(usarCookiesSeguros('https://orquestrador.exemplo.test')).toBe(true);
    expect(usarCookiesSeguros('http://127.0.0.1:3101')).toBe(false);
    expect(usarCookiesSeguros('http://localhost:3101')).toBe(false);
  });

  it('o criarAuth usa a regra, em produção: com https, o cookie de sessão é __Secure- e Secure; com http, não', async () => {
    const db = criarDb(pool);
    const comHttps = await criarAuth({ db, config: { ...CONFIG_TESTE, urlBase: 'https://orquestrador.exemplo.test', producao: true } }).$context;
    const cookieHttps = comHttps.createAuthCookie('session_token');
    expect(cookieHttps.name.startsWith('__Secure-')).toBe(true);
    expect(cookieHttps.attributes.secure).toBe(true);

    const comHttp = await criarAuth({ db, config: { ...CONFIG_TESTE, urlBase: 'http://127.0.0.1:3101', producao: true } }).$context;
    const cookieHttp = comHttp.createAuthCookie('session_token');
    expect(cookieHttp.name.startsWith('__Secure-')).toBe(false);
    expect(cookieHttp.attributes.secure).not.toBe(true);
  });
});
