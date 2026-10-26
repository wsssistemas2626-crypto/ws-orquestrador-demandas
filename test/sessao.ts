// Pessoas fictícias com sessão de verdade no Better Auth do teste: conta criada por `criarContaDeTeste`, login pela
// rota e, com 2FA, a ativação completa (enable + primeiro código). O código TOTP é calculado aqui (RFC 6238, SHA-1,
// 30 s, 6 dígitos), sem rede e sem biblioteca extra.
//
// O Better Auth confere o código e data a sessão pelo `Date` do processo, não pelo `Relogio` dos `Deps`. Por isso o
// código é gerado com `relogioDoSistema`: num teste que falsifica o `Date` (vi.setSystemTime), ele segue o `Date`
// falso; sem falsificação, segue a hora real. Nos dois casos é a mesma hora que o Better Auth usa.
import { createHmac } from 'node:crypto';
import type { Deps } from '../src/lib/deps';
import { relogioDoSistema } from '../src/lib/relogio';
import type { Auth } from '../src/modules/acesso/auth';
import { CONFIG_TESTE, criarContaDeTeste } from './auth';

type Papel = 'cto' | 'administradora';

// IPs fictícios das faixas de documentação 192.0.2.0/24 e 203.0.113.0/24 (198.51.100.0/24 é dos outros arquivos):
// um por requisição, para o limite por IP do Better Auth não ligar um teste ao outro.
let contadorIp = 0;
export function novoIp(): { 'x-real-ip': string } {
  const n = contadorIp++ % 508;
  return { 'x-real-ip': n < 254 ? `192.0.2.${n + 1}` : `203.0.113.${n - 253}` };
}

// Pote de cookies mínimo, como o do navegador: guarda o último valor de cada nome e apaga o que vem com Max-Age=0 ou
// valor vazio.
export class PoteDeCookies {
  private readonly cookies = new Map<string, string>();
  guardar(r: Response): this {
    for (const linha of r.headers.getSetCookie()) {
      const [par = '', ...atributos] = linha.split(';');
      const i = par.indexOf('=');
      const nome = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      const apaga = valor === '' || atributos.some((a) => /^\s*max-age=0\s*$/i.test(a));
      if (apaga) this.cookies.delete(nome);
      else this.cookies.set(nome, valor);
    }
    return this;
  }
  nomes(): string[] {
    return [...this.cookies.keys()];
  }
  cabecalho(): string {
    return [...this.cookies].map(([n, v]) => `${n}=${v}`).join('; ');
  }
}

export function postAuth(auth: Auth, caminho: string, corpo: unknown, cabecalhos: Record<string, string> = {}): Promise<Response> {
  return auth.handler(
    new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CONFIG_TESTE.urlBase, ...novoIp(), ...cabecalhos },
      body: JSON.stringify(corpo),
    }),
  );
}

export function getAuth(auth: Auth, caminho: string, cabecalhos: Record<string, string> = {}): Promise<Response> {
  return auth.handler(new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, { headers: { ...novoIp(), ...cabecalhos } }));
}

function base32ParaBytes(texto: string): Buffer {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of texto.replace(/=+$/, '').toUpperCase()) {
    const v = alfabeto.indexOf(c);
    if (v < 0) throw new RangeError('codigoTotp: segredo fora do base32');
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

// RFC 6238: contador de 30 s, HMAC-SHA1 sobre o segredo (o base32 do totpURI), truncamento dinâmico, 6 dígitos.
export function codigoTotp(segredo: string, agora: Date): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(agora.getTime() / 30_000)));
  const hmac = createHmac('sha1', base32ParaBytes(segredo)).update(contador).digest();
  const deslocamento = hmac[hmac.length - 1]! & 0x0f;
  const numero = (hmac.readUInt32BE(deslocamento) & 0x7fffffff) % 1_000_000;
  return String(numero).padStart(6, '0');
}

// Um código de 6 dígitos que com certeza não é o da janela atual nem das vizinhas.
export function codigoErrado(segredo: string, agora: Date): string {
  const validos = new Set([-30_000, 0, 30_000].map((d) => codigoTotp(segredo, new Date(agora.getTime() + d))));
  for (let n = 0; ; n++) {
    const c = String(n).padStart(6, '0');
    if (!validos.has(c)) return c;
  }
}

export async function criarPessoa(
  deps: Deps,
  op: { papel: Papel; com2fa?: boolean },
): Promise<{ usuarioId: string; email: string; senha: string; segredoTotp?: string; cookie: string }> {
  const conta = await criarContaDeTeste(deps.auth, { papel: op.papel });
  const pote = new PoteDeCookies();
  const login = await postAuth(deps.auth, '/sign-in/email', { email: conta.email, password: conta.senha });
  if (login.status !== 200) throw new Error(`criarPessoa: login respondeu ${login.status}`);
  pote.guardar(login);
  if (op.com2fa === false) return { ...conta, cookie: pote.cabecalho() };

  const ativar = await postAuth(deps.auth, '/two-factor/enable', { password: conta.senha }, { cookie: pote.cabecalho() });
  if (ativar.status !== 200) throw new Error(`criarPessoa: enable respondeu ${ativar.status}`);
  pote.guardar(ativar);
  const { totpURI } = (await ativar.json()) as { totpURI: string };
  const segredoTotp = new URL(totpURI).searchParams.get('secret')!;
  const codigo = codigoTotp(segredoTotp, relogioDoSistema.agora());
  const verificar = await postAuth(deps.auth, '/two-factor/verify-totp', { code: codigo }, { cookie: pote.cabecalho() });
  if (verificar.status !== 200) throw new Error(`criarPessoa: verify-totp respondeu ${verificar.status}`);
  pote.guardar(verificar);
  return { ...conta, segredoTotp, cookie: pote.cabecalho() };
}
