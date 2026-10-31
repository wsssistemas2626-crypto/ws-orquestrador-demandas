// Dados fictícios da primeira subida da homologação (padrão técnico, seção 9; 02, seção 2; C-37). Chamado pelo
// `start:hml` depois da migração; também roda sozinho no banco de desenvolvimento:
//
//   SEED_FICTICIO=1 pnpm tsx scripts/seed-ficticio.ts
//
// Guardas (02, seção 2): só com SEED_FICTICIO=1 e com o banco sem nenhuma demanda. Esta versão também recusa banco que
// já tem conta: o seed cria contas de senha conhecida, e elas nunca podem nascer ao lado de uma conta real. Tudo numa
// transação só, sob trava consultiva: duas subidas ao mesmo tempo semeiam uma vez, e uma falha no meio não deixa meio
// seed.
//
// O que cria: as quatro contas de CONTAS_FICTICIAS (cto e administradora com 2FA ativo; sem2fa e configurar2fa, papel
// cto, sem 2FA, para o e2e da T37), o preço de 'modelo-ficticio' (os agentes continuam desligados), uma demanda de cada
// tipo e, numa delas, ESP, RSK e DEC gravados como rascunho de agente (para a T43), com os exemplos de saída dos prompts.
//
// As senhas e os segredos TOTP abaixo são fictícios e públicos, escritos aqui de propósito: só servem a um banco
// semeado por este script, e nenhum deles tem o formato do token de serviço.
import { randomBytes, randomUUID } from 'node:crypto';
import { symmetricEncrypt } from 'better-auth/crypto';
import { count, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { PROMPTS } from '../src/agents';
import { demanda, twoFactor, user } from '../src/db/schema';
import { comTransacao, type Transacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import { log } from '../src/lib/log';
import type { AtorAgente, AtorPessoa, Papel } from '../src/modules/acesso/ator';
import { criarDemandaSchema, type CriarDemanda } from '../src/modules/demandas/schemas';
import { criarDemanda } from '../src/modules/demandas/servico';
import { criarEspecificacaoSchema } from '../src/modules/especificacoes/schemas';
import { criarEspecificacao } from '../src/modules/especificacoes/servico';
import { registrarEvento } from '../src/modules/historico/registrar';
import { saidaConsolidacaoSchema } from '../src/modules/agentes/schemas';
import { criarPacoteDecisao, NIVEL_DO_DEC_DE_AGENTE } from '../src/modules/pacotes-decisao/criar';
import { criarParecerRiscoSchema } from '../src/modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../src/modules/pareceres-risco/servico';
import { gravarConta } from './criar-usuario';
import { definirPrecoModelo } from './definir-preco-modelo';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type DepsDoScript, type Saida } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

// Base32 (RFC 4648, sem preenchimento) dos bytes do segredo: é o que o app autenticador recebe no totpURI e o que o
// e2e usa para calcular o código (test/sessao.ts, codigoTotp). O Better Auth guarda o segredo cru, cifrado.
function base32(texto: string): string {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = [...Buffer.from(texto, 'utf8')].map((b) => b.toString(2).padStart(8, '0')).join('');
  let saida = '';
  for (let i = 0; i < bits.length; i += 5) saida += alfabeto[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return saida;
}

// Segredo TOTP cru de 32 caracteres, como o que o plugin gera.
const SEGREDO_CRU = { cto: 'FicticioTotpHmlCtoSomenteTeste01', administradora: 'FicticioTotpHmlAdmSomenteTeste02' } as const;

export const CONTAS_FICTICIAS = {
  cto: {
    email: 'cto@ficticio.test',
    nome: 'Pessoa Ficticia CTO',
    papel: 'cto',
    senha: 'Senha-Ficticia-Homologacao-Cto-2026',
    segredoTotp: base32(SEGREDO_CRU.cto),
  },
  administradora: {
    email: 'administradora@ficticio.test',
    nome: 'Pessoa Ficticia Administradora',
    papel: 'administradora',
    senha: 'Senha-Ficticia-Homologacao-Adm-2026',
    segredoTotp: base32(SEGREDO_CRU.administradora),
  },
  // Papel cto, sem 2FA ativo, só para o e2e da T37: C-04 (c) e o fluxo da T02.
  sem2fa: { email: 'sem2fa@ficticio.test', nome: 'Pessoa Ficticia Sem 2FA', papel: 'cto', senha: 'Senha-Ficticia-Homologacao-Sem2fa-2026' },
  configurar2fa: {
    email: 'configurar2fa@ficticio.test',
    nome: 'Pessoa Ficticia Configurar 2FA',
    papel: 'cto',
    senha: 'Senha-Ficticia-Homologacao-Configurar-2026',
  },
} as const satisfies Record<string, { email: string; nome: string; papel: Papel; senha: string; segredoTotp?: string }>;

export const MODELO_FICTICIO = 'modelo-ficticio';
const PRECO_FICTICIO = { entradaPorMilhao: 3, saidaPorMilhao: 15 } as const;

// Uma demanda de cada tipo. Texto só inventado: sem nome real, e-mail, telefone nem documento. A primeira é a que recebe
// ESP, RSK e DEC de agente, e o texto dela casa com os exemplos de saída dos prompts (src/agents/).
const DEMANDAS: ReadonlyArray<z.input<typeof criarDemandaSchema>> = [
  {
    titulo: 'Pedidos do marketplace duplicados no ERP (fictício)',
    tipo: 'bug',
    solicitanteNome: 'Pessoa Ficticia Operacoes',
    solicitantePapel: 'operacoes',
    linhaServicoProvavel: 'automacao_integracao',
    urgencia: 'alta',
    justificativaUrgencia: 'A duplicação afeta o faturamento do mês.',
    contexto: 'A integração lê os pedidos do marketplace a cada hora e cria cada um no ERP.',
    descricaoProblema: 'O mesmo pedido aparece duas ou três vezes no ERP quando a leitura se repete.',
    impactoPercebido: 'A equipe cancela pedidos à mão todos os dias.',
  },
  {
    titulo: 'Filtro por período no relatório de chamados (fictício)',
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'sob_medida',
    urgencia: 'media',
    descricaoProblema: 'O relatório só mostra o mês corrente.',
  },
  {
    titulo: 'Portal de acompanhamento de pedidos (fictício)',
    tipo: 'novo_projeto',
    solicitanteNome: 'Pessoa Ficticia Financeiro',
    solicitantePapel: 'financeiro',
    linhaServicoProvavel: 'sob_medida',
    urgencia: 'baixa',
    contexto: 'Hoje o cliente pergunta a situação do pedido por mensagem.',
  },
  {
    titulo: 'Estudo de atendimento com IA e revisão humana (fictício)',
    tipo: 'estudo',
    solicitanteNome: 'Pessoa Ficticia Outro',
    solicitantePapel: 'outro',
    linhaServicoProvavel: 'ia_controle_humano',
  },
  {
    titulo: 'Painel de sustentação para clientes (fictício)',
    tipo: 'produto_proprio',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'diagnostico_sustentacao',
  },
];

const SISTEMA = { tipo: 'sistema' } as const;
const agente = (a: AtorAgente['agente']): AtorAgente => ({ tipo: 'agente', agente: a, prefixoToken: null });

export type DepsDoSeed = DepsDoScript & Partial<Pick<Deps, 'fila'>>;
export type ResultadoSeed = 'semeado' | 'recusado';

// Dez códigos de recuperação aleatórios no formato do plugin (xxxxx-xxxxx), só para a linha ficar completa: ninguém os
// vê. Cifrados com o mesmo segredo do Better Auth que o plugin usa (C-33).
function codigosDeRecuperacao(): string[] {
  return Array.from({ length: 10 }, () => {
    const s = randomBytes(8).toString('hex').slice(0, 10);
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

async function criarContas(t: Transacao, deps: DepsDoSeed): Promise<AtorPessoa> {
  const ctx = await deps.auth.$context;
  let cto: AtorPessoa | null = null;
  for (const conta of Object.values(CONTAS_FICTICIAS)) {
    const usuarioId = randomUUID();
    const hash = await ctx.password.hash(conta.senha);
    await gravarConta(t.tx, { usuarioId, nome: conta.nome, email: conta.email, papel: conta.papel, hash }, deps.relogio);
    if ('segredoTotp' in conta) {
      const cru = conta === CONTAS_FICTICIAS.cto ? SEGREDO_CRU.cto : SEGREDO_CRU.administradora;
      await t.tx.insert(twoFactor).values({
        id: randomUUID(),
        userId: usuarioId,
        secret: await symmetricEncrypt({ key: ctx.secret, data: cru }),
        backupCodes: await symmetricEncrypt({ key: ctx.secret, data: JSON.stringify(codigosDeRecuperacao()) }),
        verified: true,
      });
      await t.tx.update(user).set({ twoFactorEnabled: true, updatedAt: deps.relogio.agora() }).where(eq(user.id, usuarioId));
      await registrarEvento(
        t.tx,
        { ator: SISTEMA, entidade: 'usuario', entidadeId: usuarioId, acao: '2fa_ativado', antes: { twoFactorEnabled: false }, depois: { twoFactorEnabled: true } },
        deps.relogio,
      );
    }
    if (conta === CONTAS_FICTICIAS.cto) cto = { tipo: 'pessoa', usuarioId, nome: conta.nome, papel: 'cto' };
  }
  if (!cto) throw new Error('seed: conta cto não criada');
  return cto;
}

async function criarDemandas(t: Transacao, deps: DepsDoSeed, cto: AtorPessoa): Promise<number> {
  const entradas: CriarDemanda[] = DEMANDAS.map((d) => criarDemandaSchema.parse(d));
  const [primeira, ...resto] = entradas;
  if (!primeira) return 0;
  // A demanda da pessoa, e o rascunho dos três agentes pelo mesmo caminho do worker (serviço da API com o ator agente).
  const dem = await criarDemanda(deps, cto, primeira, t);
  await criarEspecificacao(deps, agente('insumo_tecnico'), dem.id, criarEspecificacaoSchema.parse(PROMPTS.insumo_tecnico.exemploSaida), t);
  await criarParecerRisco(deps, agente('risco'), dem.id, criarParecerRiscoSchema.parse(PROMPTS.risco.exemploSaida), t);
  // Como no worker: a saída do agente não tem o nível de aprovação, que é o da regra do servidor (08-correcao, A-04).
  await criarPacoteDecisao(
    deps,
    agente('consolidacao'),
    dem.id,
    { ...saidaConsolidacaoSchema.parse(PROMPTS.consolidacao.exemploSaida), nivelAprovacaoRequerido: NIVEL_DO_DEC_DE_AGENTE },
    t,
  );
  for (const e of resto) await criarDemanda(deps, cto, e, t);
  return entradas.length;
}

export async function seedFicticio(deps: DepsDoSeed, env: Record<string, string | undefined>): Promise<ResultadoSeed> {
  if (env.SEED_FICTICIO !== '1') {
    log.info({ evento: 'seed_ficticio', status: 'recusado', codigoErro: 'sem_seed_ficticio' });
    return 'recusado';
  }
  const resultado = await comTransacao(deps.pool, async (t): Promise<{ status: ResultadoSeed; demandas: number }> => {
    await t.tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'seed_ficticio'}, 0))`);
    const [d] = await t.tx.select({ n: count() }).from(demanda);
    const [u] = await t.tx.select({ n: count() }).from(user);
    if ((d?.n ?? 0) > 0 || (u?.n ?? 0) > 0) return { status: 'recusado', demandas: 0 };
    const cto = await criarContas(t, deps);
    await definirPrecoModelo(deps, { modelo: MODELO_FICTICIO, ...PRECO_FICTICIO }, t);
    return { status: 'semeado', demandas: await criarDemandas(t, deps, cto) };
  });
  log.info({
    evento: 'seed_ficticio',
    status: resultado.status,
    quantidade: resultado.demandas,
    ...(resultado.status === 'recusado' ? { codigoErro: 'banco_com_dados' } : {}),
  });
  return resultado.status;
}

const MENSAGENS: Record<ResultadoSeed, string> = {
  semeado: 'Dados fictícios criados: quatro contas @ficticio.test, o preço do modelo fictício e cinco demandas.\n',
  recusado: 'Seed fictício não rodou: ele exige SEED_FICTICIO=1 e um banco sem nenhuma demanda e sem nenhuma conta. Nada foi alterado.\n',
};

// O `main` do script, exportado para teste. Não aceita argumento.
export async function executarSeed(deps: DepsDoSeed, argv: readonly string[], saida: Saida, env: Record<string, string | undefined> = process.env): Promise<number> {
  lerArgumentos(z.strictObject({}), argv);
  const r = await seedFicticio(deps, env);
  saida.write(MENSAGENS[r]);
  return r === 'semeado' ? 0 : 1;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript((deps, argv, saida) => executarSeed(deps, argv, saida));
}
