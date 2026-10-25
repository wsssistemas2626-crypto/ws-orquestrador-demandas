import { describe, expect, it } from 'vitest';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { ErroDominio, mapearErro } from './erros';
import { LIMITE_CORPO_PADRAO, lerCorpoJson } from './corpo';

const req = (corpo: BodyInit | null, cabecalhos: Record<string, string> = {}) =>
  new Request('http://127.0.0.1:3101/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...cabecalhos },
    body: corpo,
  });

it('corpo de 600 KB responde 413 antes do parse (C-17)', async () => {
  const grande = JSON.stringify({ texto: 'a'.repeat(600 * 1024) });
  await expect(lerCorpoJson(req(grande))).rejects.toMatchObject({ codigo: 'corpo_grande' });
});

it('Content-Length mentiroso não engana: conta os bytes lidos', async () => {
  const grande = JSON.stringify({ texto: 'a'.repeat(600 * 1024) });
  await expect(lerCorpoJson(req(grande, { 'content-length': '10' }))).rejects.toBeInstanceOf(ErroDominio);
});

it('JSON inválido vira entrada_invalida', async () => {
  await expect(lerCorpoJson(req('{ruim'))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
});

it('JSON válido devolve o objeto', async () => {
  expect(await lerCorpoJson(req('{"a":1}'))).toEqual({ a: 1 });
});

describe('lerCorpoJson: limites e casos de borda', () => {
  it('o limite padrão é 512 KiB', () => {
    expect(LIMITE_CORPO_PADRAO).toBe(512 * 1024);
  });

  it('corpo com exatamente o limite passa; um byte a mais é 413', async () => {
    const base = '{"t":""}';
    const noLimite = `{"t":"${'a'.repeat(LIMITE_CORPO_PADRAO - base.length)}"}`;
    expect(new TextEncoder().encode(noLimite).byteLength).toBe(LIMITE_CORPO_PADRAO);
    expect(await lerCorpoJson(req(noLimite))).toMatchObject({ t: expect.any(String) });
    const umAMais = `{"t":"${'a'.repeat(LIMITE_CORPO_PADRAO - base.length + 1)}"}`;
    await expect(lerCorpoJson(req(umAMais))).rejects.toMatchObject({ codigo: 'corpo_grande' });
  });

  it('conta bytes, não caracteres: acentos pesam dois bytes', async () => {
    const corpo = JSON.stringify({ t: 'ã'.repeat(40) }); // 40 caracteres, 80 bytes no texto
    await expect(lerCorpoJson(req(corpo), 60)).rejects.toMatchObject({ codigo: 'corpo_grande' });
    expect(await lerCorpoJson(req(corpo), 200)).toEqual({ t: 'ã'.repeat(40) });
  });

  it('Content-Length declarado acima do limite responde 413 sem ler o corpo', async () => {
    let puxados = 0;
    const fluxo = new ReadableStream<Uint8Array>({
      pull(c) {
        puxados += 1;
        c.enqueue(new TextEncoder().encode('{}'));
        c.close();
      },
    });
    const r = new Request('http://127.0.0.1:3101/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(10 * 1024 * 1024) },
      body: fluxo,
      duplex: 'half',
    } as RequestInit);
    await expect(lerCorpoJson(r)).rejects.toMatchObject({ codigo: 'corpo_grande' });
    expect(puxados).toBe(0);
  });

  it('fluxo sem fim para de ser lido ao passar do limite', async () => {
    let puxados = 0;
    const pedaco = new Uint8Array(64 * 1024).fill(97);
    const fluxo = new ReadableStream<Uint8Array>({
      pull(c) {
        puxados += 1;
        c.enqueue(pedaco);
      },
    });
    const r = new Request('http://127.0.0.1:3101/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: fluxo,
      duplex: 'half',
    } as RequestInit);
    await expect(lerCorpoJson(r)).rejects.toMatchObject({ codigo: 'corpo_grande' });
    expect(puxados).toBeLessThan(20);
  });

  it('corpo ausente ou vazio vira entrada_invalida', async () => {
    await expect(lerCorpoJson(req(null))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    await expect(lerCorpoJson(req(''))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
  });

  it('UTF-8 inválido vira entrada_invalida', async () => {
    const ruim = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xff, 0xfe, 0x22, 0x7d]); // {"a":"\xff\xfe"}
    await expect(lerCorpoJson(req(ruim))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
  });

  it('as mensagens de 413 e de JSON inválido são pt-BR e não ecoam o corpo', async () => {
    const grande = JSON.stringify({ texto: `${SENTINELAS.texto}${'a'.repeat(600 * 1024)}` });
    const e413 = await lerCorpoJson(req(grande)).catch((e: unknown) => e);
    expect(mapearErro(e413)).toEqual({
      status: 413,
      corpo: { erro: 'corpo_grande', mensagem: 'O conteúdo enviado passa do limite de 512 KB.' },
    });
    const e400 = await lerCorpoJson(req(`{"email": "${SENTINELAS.email}", ruim`)).catch((e: unknown) => e);
    expect(mapearErro(e400)).toEqual({
      status: 400,
      corpo: { erro: 'entrada_invalida', mensagem: 'O conteúdo enviado não é um JSON válido.' },
    });
    expect(contemSentinela(JSON.stringify([mapearErro(e413), mapearErro(e400)]))).toBe(false);
  });

  it('JSON de valor simples (não objeto) é devolvido como está, para o Zod decidir', async () => {
    expect(await lerCorpoJson(req('[1,2]'))).toEqual([1, 2]);
    expect(await lerCorpoJson(req('null'))).toBeNull();
  });
});
