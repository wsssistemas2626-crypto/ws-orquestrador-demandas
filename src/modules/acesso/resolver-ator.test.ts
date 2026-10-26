// C-09: quem é o ator de uma requisição. Token de serviço só em `Authorization: Bearer`; cookie de sessão vai para
// `exigirPessoa`; os dois juntos são recusados; na query, nada autentica. Better Auth e banco reais (Testcontainers).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarPessoa } from '../../../test/sessao';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { mapearErro } from '../../lib/erros';
import { resolverAtor } from './resolver-ator';
import { criarTokenServico, revogarTokenServico } from './tokens-servico';

const URL_BASE = 'http://127.0.0.1:3101';
let b: BancoDeTeste;
let deps: Deps;
let tokenRisco: { token: string; prefixo: string };
let cookieCto: string;
let usuarioCto: string;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  tokenRisco = await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio));
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = p.cookie;
  usuarioCto = p.usuarioId;
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const req = (cabecalhos: Record<string, string> = {}, caminho = '/api/demandas') =>
  new Request(`${URL_BASE}${caminho}`, { headers: cabecalhos });
const falha = async (r: Request) => {
  try {
    await resolverAtor(r, deps);
  } catch (e) {
    return mapearErro(e);
  }
  throw new Error('resolverAtor devia ter recusado');
};

describe('resolverAtor', () => {
  it('Bearer válido → agente', async () => {
    expect(await resolverAtor(req({ authorization: `Bearer ${tokenRisco.token}` }), deps)).toEqual({
      tipo: 'agente',
      agente: 'risco',
      prefixoToken: tokenRisco.prefixo,
    });
  });
  it('o nome do esquema Bearer não diferencia maiúscula', async () => {
    expect(await resolverAtor(req({ authorization: `bearer ${tokenRisco.token}` }), deps)).toMatchObject({ tipo: 'agente' });
  });
  it('token na query não autentica: 401', async () => {
    expect(await falha(req({}, `/api/demandas?token=${tokenRisco.token}`))).toMatchObject({
      status: 401,
      corpo: { erro: 'nao_autenticado' },
    });
    expect(await falha(req({}, `/api/demandas?access_token=${tokenRisco.token}&authorization=Bearer%20${tokenRisco.token}`))).toMatchObject({
      status: 401,
    });
  });
  it('token em cookie não autentica: 401', async () => {
    expect(await falha(req({ cookie: `token=${tokenRisco.token}` }))).toMatchObject({ status: 401 });
    expect(await falha(req({ cookie: `wsod.token=${tokenRisco.token}` }))).toMatchObject({ status: 401 });
  });
  it('cookie de sessão e Bearer juntos: 400', async () => {
    const r = await falha(req({ cookie: cookieCto, authorization: `Bearer ${tokenRisco.token}` }));
    expect(r).toEqual({ status: 400, corpo: { erro: 'entrada_invalida', mensagem: 'Use só uma forma de autenticação.' } });
  });
  it('cookie de sessão com o prefixo __Secure- e Bearer juntos: 400', async () => {
    const r = await falha(req({ cookie: `__Secure-wsod.session_token=x`, authorization: `Bearer ${tokenRisco.token}` }));
    expect(r).toMatchObject({ status: 400, corpo: { erro: 'entrada_invalida' } });
  });
  it('cookie de sessão e Authorization de outro esquema juntos: 400', async () => {
    expect(await falha(req({ cookie: cookieCto, authorization: 'Basic dXN1YXJpbzpzZW5oYQ==' }))).toMatchObject({ status: 400 });
  });
  it('Bearer com outros cookies que não são a sessão continua agente', async () => {
    expect(
      await resolverAtor(req({ cookie: 'wsod.two_factor=x; outro=y', authorization: `Bearer ${tokenRisco.token}` }), deps),
    ).toMatchObject({ tipo: 'agente', agente: 'risco' });
  });
  it('Bearer inválido: 401; sem nada: 401', async () => {
    for (const authorization of [
      `Bearer wsod_${'A'.repeat(43)}`,
      'Bearer wsod_inventado',
      'Bearer',
      'Bearer ',
      `Bearer ${tokenRisco.token} extra`,
      `Basic ${tokenRisco.token}`,
      tokenRisco.token,
      '',
    ])
      expect(await falha(req({ authorization })), authorization.slice(0, 20)).toMatchObject({
        status: 401,
        corpo: { erro: 'nao_autenticado' },
      });
    expect(await falha(req())).toMatchObject({ status: 401, corpo: { erro: 'nao_autenticado' } });
  });
  it('CA-02.3: Bearer revogado: 401', async () => {
    const t = await comTransacao(b.poolApp, (tx) => criarTokenServico(tx, 'consolidacao', deps.relogio));
    expect(await resolverAtor(req({ authorization: `Bearer ${t.token}` }), deps)).toMatchObject({ agente: 'consolidacao' });
    await comTransacao(b.poolApp, (tx) => revogarTokenServico(tx, t.prefixo, deps.relogio));
    expect(await falha(req({ authorization: `Bearer ${t.token}` }))).toMatchObject({ status: 401 });
  });
  it('o 401 do Bearer não devolve o token nem diz se ele existiu', async () => {
    const t = await comTransacao(b.poolApp, (tx) => criarTokenServico(tx, 'orquestrador', deps.relogio));
    await comTransacao(b.poolApp, (tx) => revogarTokenServico(tx, t.prefixo, deps.relogio));
    const revogado = await falha(req({ authorization: `Bearer ${t.token}` }));
    const inventado = await falha(req({ authorization: `Bearer wsod_${'B'.repeat(43)}` }));
    expect(revogado).toEqual(inventado);
    expect(JSON.stringify(revogado)).not.toContain(t.token);
    expect(JSON.stringify(revogado)).not.toContain(t.prefixo);
  });
  it('cookie de pessoa → exigirPessoa', async () => {
    expect(await resolverAtor(req({ cookie: cookieCto }), deps)).toEqual({
      tipo: 'pessoa',
      usuarioId: usuarioCto,
      nome: 'Pessoa Ficticia',
      papel: 'cto',
    });
  });
  it('cookie de pessoa sem 2FA: 403 sem_2fa, pela regra de exigirPessoa', async () => {
    const p = await criarPessoa(deps, { papel: 'administradora', com2fa: false });
    expect(await falha(req({ cookie: p.cookie }))).toMatchObject({ status: 403, corpo: { erro: 'sem_2fa' } });
  });
  it('cookie de sessão inventado: 401', async () => {
    expect(await falha(req({ cookie: 'wsod.session_token=inventado.assinatura' }))).toMatchObject({ status: 401 });
  });
});
