// Aviso por e-mail de pacote pronto para decisão (RF-25, C-38, ADR-08; 02, seções 5 e 8).
//
// agendarAviso: chamado na transação que cria o DEC (ADR-06). Grava `aviso_email` pendente (um por DEC, a chave primária
// é o próprio DEC) e o job `aviso.dec-pronto` com payload só `{ decId }` (C-22) e `singletonKey` = id do DEC. Os dois
// somem junto com o rollback. Rota, Server Action e worker sempre têm a fila; o serviço chamado sem ela (testes de
// serviço) deixa o aviso pendente, sem job.
//
// enviarAviso: chamado pelo worker. Trava a linha do aviso (SELECT … FOR UPDATE) durante o envio, para dois jobs do mesmo
// DEC ao mesmo tempo mandarem um e-mail só (CA-25.2); o cabeçalho Idempotency-Key do enviador é a segunda barreira.
// - enviado, sem_provedor ou falhou: não tenta de novo;
// - sem enviador configurado, sem remetente ou sem destinatário: `sem_provedor`, sem chamar ninguém;
// - envio certo: `enviado`, com o id do provedor e a data;
// - falha: conta a tentativa; antes da 3ª, lança AvisoNaoEnviado (mensagem fixa) para a fila tentar de novo (retryLimit
//   2, ADR-07 (a)); na 3ª, `falhou`, log de erro e Sentry, sem relançar.
// O e-mail é montado na hora, só com o id do DEC, o id da demanda e o link (CA-25.3): destinatário só da configuração e
// link só da origem configurada, nunca de cabeçalho de requisição (C-38). O log leva só ids, tentativa, status e o erro
// reduzido (C-21): nem destinatário, nem remetente, nem corpo.
import { eq } from 'drizzle-orm';
import { avisoEmail } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import type { ConfigWorker } from '../../lib/env-worker';
import { FILAS } from '../../lib/fila';
import { log } from '../../lib/log';
import { capturarErro } from '../../lib/sentry';
import { ErroEnvioEmail, EnviadorSemProvedor, type Email, type EnviadorEmail } from './enviador';

// 1 + as 2 novas tentativas da fila aviso.dec-pronto (retryLimit 2 em src/lib/fila.ts).
export const TENTATIVAS_AVISO = 3;

export type ResultadoAviso = 'enviado' | 'ja_enviado' | 'sem_provedor' | 'falhou' | 'sem_aviso';

export type DepsAviso = Pick<Deps, 'pool' | 'relogio'> & {
  config: Pick<ConfigWorker, 'urlBase' | 'emailRemetente' | 'emailAvisoDecisao'>;
  enviador: EnviadorEmail;
};

// A fila tenta de novo. Mensagem fixa: o pg-boss guarda a mensagem do erro no job.
export class AvisoNaoEnviado extends Error {
  readonly code = 'aviso_nao_enviado';
  constructor(readonly tentativa: number) {
    super('aviso_nao_enviado');
    this.name = 'AvisoNaoEnviado';
  }
}

// A mesma forma de `reIdVersao('DEC')` (G3.10), com o id da demanda capturado. Fica aqui, e não importado de
// src/lib/rota.ts, para o worker não carregar o adaptador HTTP (e o Better Auth) só por uma regex.
const RE_DEC = /^DEC-(DEM-\d{8}-\d{4})-v\d{1,4}$/;

// DEC-<DEM-id>-vN → DEM-id; fora do formato, recusa antes de qualquer uso (C-38).
function demandaDoDec(decId: string): string {
  const m = RE_DEC.exec(decId);
  if (!m?.[1]) throw new RangeError('aviso: id de DEC fora do formato');
  return m[1];
}

export async function agendarAviso(t: Transacao, deps: Pick<Deps, 'relogio'> & Partial<Pick<Deps, 'fila'>>, decId: string): Promise<void> {
  demandaDoDec(decId);
  await t.tx
    .insert(avisoEmail)
    .values({ pacoteDecisaoId: decId, status: 'pendente', tentativas: 0, atualizadoEm: deps.relogio.agora() })
    .onConflictDoNothing({ target: avisoEmail.pacoteDecisaoId });
  if (deps.fila) await deps.fila.enviar(t.executor, FILAS.avisoDecPronto, { decId }, { singletonKey: decId });
}

// Textos da E01 (03-ux-ui-design.md).
const INTRODUCAO = 'Há um pacote de decisão pronto no WS Orquestrador de Demandas.';
const TEXTO_DO_LINK = 'Abrir a tela de decisão';
const RODAPE = 'Este aviso não traz o conteúdo da demanda. Para ler e decidir, entre no painel com sua senha e o código de verificação.';

const escaparHtml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function origemDe(urlBase: string): string {
  let url: URL;
  try {
    url = new URL(urlBase);
  } catch {
    throw new RangeError('aviso: URL base inválida');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new RangeError('aviso: URL base inválida');
  return url.origin;
}

export function montarEmailDoAviso(decId: string, demandaId: string, urlBase: string, para: string, de: string): Email {
  // C-38: o id do DEC passa pela regex antes de entrar no corpo, e a demanda tem de ser a do DEC.
  if (demandaDoDec(decId) !== demandaId) throw new RangeError('aviso: demanda não é a do DEC');
  const link = `${origemDe(urlBase)}/pacotes-decisao/${decId}`;
  const assunto = `Pacote ${decId} pronto para decisão`;
  const texto = [INTRODUCAO, '', `Pacote: ${decId}`, `Demanda: ${demandaId}`, '', `${TEXTO_DO_LINK}: ${link}`, '', RODAPE, ''].join('\n');
  const html = [
    '<!doctype html>',
    '<html lang="pt-BR">',
    `<head><meta charset="utf-8"><title>${escaparHtml(assunto)}</title></head>`,
    '<body>',
    `<p>${escaparHtml(INTRODUCAO)}</p>`,
    `<p>Pacote: ${escaparHtml(decId)}<br>Demanda: ${escaparHtml(demandaId)}</p>`,
    `<p><a href="${escaparHtml(link)}">${TEXTO_DO_LINK}</a></p>`,
    `<p>${escaparHtml(RODAPE)}</p>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
  return { para, de, assunto, texto, html, chaveIdempotencia: `dec-${decId}` };
}

type Desfecho =
  | { resultado: Exclude<ResultadoAviso, 'falhou'> }
  | { resultado: 'falhou'; erro?: unknown; tentativa?: number }
  | { resultado: 'tentar_de_novo'; erro: unknown; tentativa: number };

export async function enviarAviso(deps: DepsAviso, decId: string): Promise<ResultadoAviso> {
  // Id fora do formato: não há aviso a procurar, e nada chega ao banco.
  if (!RE_DEC.test(decId)) return 'sem_aviso';
  const demandaId = demandaDoDec(decId);
  const desfecho = await comTransacao(deps.pool, async ({ tx }): Promise<Desfecho> => {
    const [aviso] = await tx
      .select({ status: avisoEmail.status, tentativas: avisoEmail.tentativas })
      .from(avisoEmail)
      .where(eq(avisoEmail.pacoteDecisaoId, decId))
      .for('update');
    if (!aviso) return { resultado: 'sem_aviso' };
    if (aviso.status === 'enviado') return { resultado: 'ja_enviado' };
    if (aviso.status === 'sem_provedor' || aviso.status === 'falhou') return { resultado: aviso.status };

    const atualizar = (valores: Partial<typeof avisoEmail.$inferInsert>) =>
      tx
        .update(avisoEmail)
        .set({ ...valores, atualizadoEm: deps.relogio.agora() })
        .where(eq(avisoEmail.pacoteDecisaoId, decId));

    const { emailRemetente: de, emailAvisoDecisao: para } = deps.config;
    if (!de || !para || deps.enviador instanceof EnviadorSemProvedor) {
      await atualizar({ status: 'sem_provedor' });
      return { resultado: 'sem_provedor' };
    }

    const tentativa = aviso.tentativas + 1;
    const email = montarEmailDoAviso(decId, demandaId, deps.config.urlBase, para, de);
    let idProvedor: string;
    try {
      idProvedor = (await deps.enviador.enviar(email)).id;
    } catch (e) {
      if (e instanceof ErroEnvioEmail && e.tipo === 'sem_provedor') {
        await atualizar({ status: 'sem_provedor' });
        return { resultado: 'sem_provedor' };
      }
      const esgotou = tentativa >= TENTATIVAS_AVISO;
      await atualizar({ tentativas: tentativa, status: esgotou ? 'falhou' : 'pendente' });
      return esgotou ? { resultado: 'falhou', erro: e, tentativa } : { resultado: 'tentar_de_novo', erro: e, tentativa };
    }
    await atualizar({ status: 'enviado', tentativas: tentativa, idProvedor, enviadoEm: deps.relogio.agora() });
    return { resultado: 'enviado' };
  });

  if (desfecho.resultado === 'tentar_de_novo') {
    log.warn({ evento: 'aviso_email_falha', demandaId, tentativa: desfecho.tentativa, status: 'pendente', erro: desfecho.erro });
    throw new AvisoNaoEnviado(desfecho.tentativa);
  }
  if (desfecho.resultado === 'falhou' && desfecho.tentativa !== undefined) {
    log.error({ evento: 'aviso_email_falhou', demandaId, tentativa: desfecho.tentativa, status: 'falhou', erro: desfecho.erro });
    capturarErro(desfecho.erro, { evento: 'aviso_email_falhou' });
  }
  return desfecho.resultado;
}
