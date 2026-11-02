// Leitura do corpo JSON com limite de bytes (C-17): acima do limite responde 413 antes do parse. O limite conta os
// bytes de fato lidos, porque o Content-Length pode mentir; o cabeçalho só serve para recusar cedo.
import { ErroDominio } from './erros';

export const LIMITE_CORPO_PADRAO = 512 * 1024;

function erroCorpoGrande(limiteBytes: number): ErroDominio {
  const kb = Math.floor(limiteBytes / 1024);
  const limite = kb >= 1 ? `${kb.toLocaleString('pt-BR')} KB` : `${limiteBytes} bytes`;
  return new ErroDominio('corpo_grande', `O conteúdo enviado passa do limite de ${limite}.`);
}

const erroJsonInvalido = () => new ErroDominio('entrada_invalida', 'O conteúdo enviado não é um JSON válido.');

async function lerBytes(req: Request, limiteBytes: number): Promise<Uint8Array> {
  const declarado = Number(req.headers.get('content-length'));
  if (Number.isFinite(declarado) && declarado > limiteBytes) {
    await req.body?.cancel().catch(() => undefined);
    throw erroCorpoGrande(limiteBytes);
  }
  if (!req.body) return new Uint8Array(0);

  const leitor = req.body.getReader();
  const pedacos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limiteBytes) {
      await leitor.cancel().catch(() => undefined);
      throw erroCorpoGrande(limiteBytes);
    }
    pedacos.push(value);
  }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of pedacos) {
    bytes.set(p, pos);
    pos += p.byteLength;
  }
  return bytes;
}

export async function lerCorpoJson(req: Request, limiteBytes: number = LIMITE_CORPO_PADRAO): Promise<unknown> {
  const bytes = await lerBytes(req, limiteBytes);
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw erroJsonInvalido();
  }
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    throw erroJsonInvalido();
  }
}
