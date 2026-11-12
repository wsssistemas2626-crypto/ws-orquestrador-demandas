// Criação de token de serviço de um agente (RF-02, C-09, C-37) ou de uma integração (0.3.0, RF-02 do
// DEC-DEM-20261111-0016-v1, IN-04).
//
//   pnpm tsx scripts/criar-token-servico.ts --agente orquestrador|insumo_tecnico|risco|consolidacao
//   pnpm tsx scripts/criar-token-servico.ts --integracao awave|construir
//
// Exatamente um entre `--agente` e `--integracao`. O token é gerado aqui (32 bytes aleatórios com o prefixo `wsod_`,
// src/modules/acesso/tokens-servico.ts) e escrito uma vez na saída padrão, depois do commit. Ele nunca entra por
// argumento nem por variável de ambiente, nunca vai ao log e nunca vai ao histórico: o banco guarda só o SHA-256, e o
// evento `token_criado` leva só o dono (agente ou integração) e o prefixo.
//
// Troca (a cada 12 meses, P-04, ou já, em suspeita de vazamento): emitir o novo por este script, trocar no cliente e
// revogar o antigo pelo prefixo (revogar-token-servico.ts). Os dois valem ao mesmo tempo até a revogação.
import { z } from 'zod';
import { comTransacao, type Transacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import { deZod } from '../src/lib/erros';
import { log, type CamposLog } from '../src/lib/log';
import type { Relogio } from '../src/lib/relogio';
import { AGENTES, INTEGRACOES, type Agente, type Integracao } from '../src/modules/acesso/ator';
import { criarTokenDeIntegracao, criarTokenServico } from '../src/modules/acesso/tokens-servico';
import { registrarEvento } from '../src/modules/historico/registrar';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type Saida } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

export const MENSAGEM_UM_DOS_DOIS = 'Informe exatamente um entre --agente e --integracao.';

// `--token` não existe: o strictObject recusa qualquer argumento fora destes (C-37). Agente e integração juntos, ou
// nenhum dos dois, são recusados com a regra nos dois campos, para a mensagem citar os dois argumentos.
export const argumentosCriarToken = z
  .strictObject({ agente: z.enum(AGENTES).optional(), integracao: z.enum(INTEGRACOES).optional() })
  .superRefine((a, ctx) => {
    if ((a.agente === undefined) === (a.integracao === undefined)) {
      for (const campo of ['agente', 'integracao'] as const) ctx.addIssue({ code: 'custom', path: [campo], message: MENSAGEM_UM_DOS_DOIS });
    }
  });

const SISTEMA = { tipo: 'sistema' } as const;

type Dono = { tipo: 'agente'; agente: Agente } | { tipo: 'integracao'; integracao: Integracao };

// O que muda por dono, num lugar só: o token, o `depois` do evento (só o dono e o prefixo, chave a chave, IN-12), a
// linha de log e o texto da saída. O log só aceita os campos da lista de permissão (C-21): o agente, como antes; da
// integração, nem o nome (IN-14).
type PorDono = { criar: (t: Transacao) => Promise<{ token: string; prefixo: string }>; depois: (prefixo: string) => Record<string, string>; linhaDeLog: CamposLog; para: string };

function porDono(dono: Dono, relogio: Relogio): PorDono {
  switch (dono.tipo) {
    case 'agente':
      return {
        criar: (t) => criarTokenServico(t, dono.agente, relogio),
        depois: (prefixo) => ({ agente: dono.agente, prefixo }),
        linhaDeLog: { evento: 'token_criado', atorTipo: 'sistema', agente: dono.agente },
        para: `o agente ${dono.agente}`,
      };
    case 'integracao':
      return {
        criar: (t) => criarTokenDeIntegracao(t, dono.integracao, relogio),
        depois: (prefixo) => ({ integracao: dono.integracao, prefixo }),
        linhaDeLog: { evento: 'token_criado', atorTipo: 'sistema' },
        para: `a integração ${dono.integracao}`,
      };
    default: {
      const nunca: never = dono;
      void nunca;
      throw new Error('dono de token desconhecido');
    }
  }
}

async function emitir(deps: Pick<Deps, 'pool' | 'relogio'>, dono: Dono, saida: Saida): Promise<{ prefixo: string }> {
  const d = porDono(dono, deps.relogio);
  const { token, prefixo } = await comTransacao(deps.pool, async (t) => {
    const criado = await d.criar(t);
    await registrarEvento(
      t.tx,
      { ator: SISTEMA, entidade: 'token_servico', entidadeId: criado.prefixo, acao: 'token_criado', depois: d.depois(criado.prefixo) },
      deps.relogio,
    );
    return criado;
  });

  log.info(d.linhaDeLog);
  saida.write(
    `Token criado para ${d.para} (prefixo ${prefixo}).\n` +
      `Token, mostrado só esta vez: ${token}\n` +
      'Guarde o token agora, só no cofre de segredos de quem o usa. Para revogar, use o prefixo.\n',
  );
  return { prefixo };
}

// Chamada direta (sem o argv) também passa pelo schema: valor fora da lista, ou ausente, é recusado antes do banco.
export async function criarTokenPorScript(deps: Pick<Deps, 'pool' | 'relogio'>, agente: Agente, saida: Saida): Promise<{ prefixo: string }> {
  const r = argumentosCriarToken.safeParse({ agente });
  if (!r.success) throw deZod(r.error);
  return emitir(deps, { tipo: 'agente', agente }, saida);
}

export async function criarTokenDeIntegracaoPorScript(
  deps: Pick<Deps, 'pool' | 'relogio'>,
  integracao: Integracao,
  saida: Saida,
): Promise<{ prefixo: string }> {
  const r = argumentosCriarToken.safeParse({ integracao });
  if (!r.success) throw deZod(r.error);
  return emitir(deps, { tipo: 'integracao', integracao }, saida);
}

// O `main` do script, exportado para teste: lê os argumentos, cria e sai com 0.
export async function executarCriarToken(deps: Pick<Deps, 'pool' | 'relogio'>, argv: readonly string[], saida: Saida): Promise<number> {
  const { agente, integracao } = lerArgumentos(argumentosCriarToken, argv);
  if (agente !== undefined) await criarTokenPorScript(deps, agente, saida);
  else if (integracao !== undefined) await criarTokenDeIntegracaoPorScript(deps, integracao, saida);
  return 0;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript(executarCriarToken);
}
