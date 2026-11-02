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

// Testes da etapa 06-T03-testes (qa-automacao): casos de borda de C-17 (413) que a construção não cobria.
describe('lerCorpoJson: fluxo em pedaços, cabeçalho inválido e mensagens (C-17)', () => {
  const doFluxo = (pedacos: Uint8Array[], aoCancelar?: () => void) => {
    let i = 0;
    const fluxo = new ReadableStream<Uint8Array>({
      pull(c) {
        const p = pedacos[i++];
        if (p) c.enqueue(p);
        else c.close();
      },
      cancel() {
        aoCancelar?.();
      },
    });
    return new Request('http://127.0.0.1:3101/api/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: fluxo,
      duplex: 'half',
    } as RequestInit);
  };
  const emTres = (b: Uint8Array) => [b.slice(0, 33), b.slice(33, 66), b.slice(66)];
  const bytes = (s: string) => new TextEncoder().encode(s);

  it('junta os pedaços na ordem, mesmo com caractere de dois bytes partido entre eles', async () => {
    const b = bytes('{"t":"ação"}');
    const corte = b.indexOf(0xc3) + 1; // meio do "ã"
    expect(await lerCorpoJson(doFluxo([b.slice(0, 3), b.slice(3, corte), b.slice(corte)]))).toEqual({ t: 'ação' });
  });

  it('em vários pedaços, a soma exata do limite passa e um byte a mais é 413', async () => {
    const limite = 100;
    const noLimite = bytes(`{"t":"${'a'.repeat(limite - 8)}"}`);
    expect(noLimite.byteLength).toBe(limite);
    expect(await lerCorpoJson(doFluxo(emTres(noLimite)), limite)).toEqual({ t: 'a'.repeat(limite - 8) });
    const umAMais = bytes(`{"t":"${'a'.repeat(limite - 7)}"}`);
    await expect(lerCorpoJson(doFluxo(emTres(umAMais)), limite)).rejects.toMatchObject({ codigo: 'corpo_grande' });
  });

  it('ao passar do limite, cancela o fluxo do corpo', async () => {
    let cancelado = 0;
    const r = doFluxo(emTres(bytes(`{"t":"${'a'.repeat(200)}"}`)), () => (cancelado += 1));
    await expect(lerCorpoJson(r, 100)).rejects.toMatchObject({ codigo: 'corpo_grande' });
    expect(cancelado).toBe(1);
  });

  it.each(['abc', '-1', ''])('Content-Length inválido (%j) não decide nada: vale a contagem dos bytes', async (cl) => {
    expect(await lerCorpoJson(req('{"a":1}', { 'content-length': cl }))).toEqual({ a: 1 });
    await expect(
      lerCorpoJson(req(JSON.stringify({ t: 'a'.repeat(200) }), { 'content-length': cl }), 100),
    ).rejects.toMatchObject({ codigo: 'corpo_grande' });
  });

  it.each(['   ', 'undefined', "{'a':1}", '{"a":1}{"b":2}', '{"a":1,}', '\u0000'])(
    'texto que não é um JSON só (%j) vira entrada_invalida',
    async (corpo) => {
      await expect(lerCorpoJson(req(corpo))).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    },
  );

  it('a mensagem de 413 diz o limite usado: em bytes abaixo de 1 KB e em KB com milhar pt-BR', async () => {
    const pequeno = await lerCorpoJson(req(JSON.stringify({ t: 'a'.repeat(200) })), 100).catch((e: unknown) => e);
    expect(mapearErro(pequeno)).toEqual({
      status: 413,
      corpo: { erro: 'corpo_grande', mensagem: 'O conteúdo enviado passa do limite de 100 bytes.' },
    });
    const grande = await lerCorpoJson(req('{}', { 'content-length': String(3 * 1024 * 1024) }), 2 * 1024 * 1024).catch(
      (e: unknown) => e,
    );
    expect(mapearErro(grande).corpo.mensagem).toBe('O conteúdo enviado passa do limite de 2.048 KB.');
  });

  it('o erro de 413 e o de JSON inválido são ErroDominio, para o mapeador nunca cair no 500', async () => {
    const e413 = await lerCorpoJson(req(JSON.stringify({ t: 'a'.repeat(200) })), 100).catch((e: unknown) => e);
    const e400 = await lerCorpoJson(req('{ruim')).catch((e: unknown) => e);
    expect(e413).toBeInstanceOf(ErroDominio);
    expect(e400).toBeInstanceOf(ErroDominio);
    expect(mapearErro(e413).status).toBe(413);
    expect(mapearErro(e400).status).toBe(400);
  });
});
