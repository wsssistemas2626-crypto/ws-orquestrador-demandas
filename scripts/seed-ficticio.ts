// Dados fictícios da primeira subida da homologação (padrão técnico, seção 9; 02, seção 2; C-37). Chamado pelo
// `start:hml` depois da migração; também roda sozinho no banco de desenvolvimento:
//
//   SEED_FICTICIO=1 pnpm tsx scripts/seed-ficticio.ts
//
// Guardas (02, seção 2): só com SEED_FICTICIO=1 e com o banco sem nenhuma demanda. Esta versão também recusa banco que
// já tem conta: o seed cria contas de senha conhecida, e elas nunca podem nascer ao lado de uma conta real. Desde a 0.1.6
// (M-07), também recusa a configuração fora do loopback (BETTER_AUTH_URL), antes de abrir a transação. Tudo numa
// transação só, sob trava consultiva: duas subidas ao mesmo tempo semeiam uma vez, e uma falha no meio não deixa meio
// seed.
//
// O que cria: as quatro contas de CONTAS_FICTICIAS (cto e administradora com 2FA ativo; sem2fa e configurar2fa, papel
// cto, sem 2FA, para o e2e da T37), o preço de 'modelo-ficticio' (os agentes continuam desligados), uma demanda de cada
// tipo e, numa delas, ESP, RSK e DEC gravados como rascunho de agente (para a T43), com os exemplos de saída dos prompts;
// e as demandas próprias dos testes do e2e (TITULOS_DO_E2E), duas delas com versões de estado fixo (criarVersoesDoE2E).
//
// 0.3.0 (DEC-DEM-20261111-0016-v1, T15): também o que as integrações precisam no e2e e na homologação (V-01), por
// criarDadosDasIntegracoes: três demandas do Awave (duas em Nova, uma encerrada pela "cto", nenhuma confirmada) e dois
// Pedidos de Construção gerados pela "cto", um ainda a buscar e um já entregue e recebido pelo /construir. Os atos do
// Awave e do /construir usam o ator de integração com o prefixo fictício `ficticio` (D-09): nenhum token de serviço
// nasce num banco semeado. O seed grava com a hora do sistema, então o Awave fica com 3 das 10 demandas por hora (D2) na
// primeira hora depois da subida.
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
import { ehLoopback } from '../src/lib/env';
import { log } from '../src/lib/log';
import type { AtorAgente, AtorIntegracao, AtorPessoa, Papel } from '../src/modules/acesso/ator';
import { alterarDemandaSchema, criarDemandaSchema, type CriarDemanda } from '../src/modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../src/modules/demandas/servico';
import { criarEspecificacaoSchema } from '../src/modules/especificacoes/schemas';
import { criarEspecificacao } from '../src/modules/especificacoes/servico';
import { registrarEvento } from '../src/modules/historico/registrar';
import { saidaConsolidacaoSchema } from '../src/modules/agentes/schemas';
import { criarPacoteDecisao, NIVEL_DO_DEC_DE_AGENTE } from '../src/modules/pacotes-decisao/criar';
import { registrarDecisao } from '../src/modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../src/modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../src/modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../src/modules/pareceres-risco/servico';
import { entregarPedido } from '../src/modules/pedido-construcao/entregar';
import { gerarPedido } from '../src/modules/pedido-construcao/gerar';
import { receberPedido } from '../src/modules/pedido-construcao/receber';
import { confirmacaoDoPedidoSchema } from '../src/modules/pedido-construcao/schemas';
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

// Demandas próprias de testes do e2e que aprovam um DEC (08-correcao): cada teste que aprova precisa de uma demanda só
// dele, para começar sem DEC aprovado (desde a 0.1.13, aprovar outro DEC da demanda substitui o aprovado, e o teste
// seguinte acharia um estado que não é o dele). Elas vêm do seed, e não da API, para o e2e não gastar o limite
// de demandas por hora da conta (C-36). Nascem sem ESP, RSK nem DEC; o teste cria os dele. Os títulos são os que
// e2e/decisao.spec.ts, e2e/pedido-construcao.spec.ts, e2e/axe-todas.spec.ts e e2e/parecer-risco-qa.spec.ts procuram. A
// `axeSoCto` recebe o DEC de pessoa de nível cto da T11 da axe-todas (o DEC de agente nasce "CTO e administradora", A-04).
// DEC-DEM-20261102-0002-v1: a `decisao` é a demanda da decisao.spec (antes criada pela API na primeira vez que um teste
// precisava, e de novo a cada worker novo do Playwright), e a `rskDuploClique` e a `espListaDeTextos` são as do duplo
// clique e da T07 da parecer-risco-qa.spec. Com elas, a conta "cto" sai de 30 de 30 demandas na suíte para 27 de 30.
// U+202E (RIGHT-TO-LEFT OVERRIDE) vem de código, e não cru no literal: cru, ele inverte o resto da linha no editor e no
// diff ("Trojan Source", CVE-2021-42574); test/estatico/sem-controle-bidi.test.ts reprova o caractere cru no fonte.
const RLO = String.fromCodePoint(0x202e);
export const TITULOS_DO_E2E = {
  duplaAprovacao: 'Dupla aprovação do pacote (fictício)',
  pedidoGerar: 'Portal do pedido: gerar e baixar (fictício)',
  pedidoCopiar: 'Portal do pedido: copiar o JSON (fictício)',
  pedidoValidacao: 'Portal do pedido: validação do /construir (fictício)',
  pedidoEstudo: 'Estudo do pedido de construção (fictício)',
  axeSoCto: 'Pacote só do CTO no axe (fictício)',
  decisao: 'Demanda da decisão (fictício)',
  rskDuploClique: 'Duplo clique no parecer de risco (fictício)',
  espListaDeTextos: 'Lista de textos da especificação (fictício)',
  // 0.1.13 (DEC-DEM-20261104-0014-v1, S6): o caminho completo da substituição (R1 da 01): aprovar, a recusa por nome
  // ("Santos" no contexto), contexto corrigido, DEC novo, aprovar e gerar.
  substituicao: 'Frete da filial: substituição do pacote (fictício)',
  // 0.2.0 (DEC-DEM-20261110-0015-v1, T06, D-07): as dos e2e novos do visual, pelo mesmo limite C-36. Só a `etapasDupla` e
  // a `decisaoRecomendaB` nascem com ESP, RSK e DEC (criarVersoesDoE2E); as outras, sem versão, e o e2e cria as dele. A
  // `textoDeTerceiro` traz marcação e o caractere de direção U+202E, que a tela tem de mostrar como texto.
  textoDeTerceiro: `<script>window.__xss=1</script> Pedido ${RLO} com texto de terceiro <img src=x onerror="window.__xss=2"> (fictício)`,
  etapasSemVersoes: 'Etapas sem versões (fictício)',
  etapasDupla: 'Etapas com uma de duas aprovações (fictício)',
  decisaoOpcaoB: 'Aprovar a opção B (fictício)',
  decisaoDevolverComOpcao: 'Devolver com a opção marcada (fictício)',
  decisaoCelularCto: 'Decisão no celular, só o CTO (fictício)',
  decisaoCelularDupla: 'Decisão no celular, dupla aprovação (fictício)',
  decisaoRecomendaB: 'Recomendação do agente cita a opção B (fictício)',
  // 0.3.0 (DEC-DEM-20261111-0016-v1, T15): as das integrações (criarDadosDasIntegracoes), todas de tipo melhoria, como
  // o demandaDoSeed procura. As três do Awave nascem pelo ator de integração; as duas dos pedidos, pela `sem2fa`.
  awaveAguardando: 'Relatório do Awave aguardando confirmação (fictício)',
  awaveConfirmar: 'Relatório do Awave para confirmar no e2e (fictício)',
  awaveEncerrada: 'Relatório do Awave encerrado sem confirmação (fictício)',
  pedidoParaBuscar: 'Pedido para o /construir buscar (fictício)',
  pedidoRecebido: 'Pedido já recebido pelo /construir (fictício)',
} as const;

// A recomendação do DEC de agente da `decisaoRecomendaB`, que o e2e procura na T11 (P-01: em texto, sem opção marcada).
export const RECOMENDACAO_DO_E2E = 'Recomendo a opção B (fictício).';

// Todas com contexto: a `descricao` do Pedido de Construção sai dele, e o validarPedido recusa descrição vazia.
const DO_PORTAL = {
  solicitanteNome: 'Pessoa Ficticia Financeiro',
  solicitantePapel: 'financeiro',
  linhaServicoProvavel: 'sob_medida',
  contexto: 'Hoje o cliente pergunta a situação do pedido por mensagem.',
} as const;
const DEMANDAS_DO_E2E: ReadonlyArray<z.input<typeof criarDemandaSchema>> = [
  {
    titulo: TITULOS_DO_E2E.duplaAprovacao,
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'A mudança gera compromisso com o cliente e precisa das duas aprovações.',
  },
  { titulo: TITULOS_DO_E2E.pedidoGerar, tipo: 'novo_projeto', ...DO_PORTAL },
  { titulo: TITULOS_DO_E2E.pedidoCopiar, tipo: 'novo_projeto', ...DO_PORTAL },
  { titulo: TITULOS_DO_E2E.pedidoValidacao, tipo: 'novo_projeto', ...DO_PORTAL },
  {
    titulo: TITULOS_DO_E2E.pedidoEstudo,
    tipo: 'estudo',
    solicitanteNome: 'Pessoa Ficticia Outro',
    solicitantePapel: 'outro',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'A equipe quer comparar formas de atendimento antes de construir.',
  },
  {
    titulo: TITULOS_DO_E2E.axeSoCto,
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'Ajuste pequeno, sem compromisso com o cliente: basta a aprovação do CTO.',
  },
  {
    titulo: TITULOS_DO_E2E.decisao,
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'A equipe precisa decidir entre construir numa entrega ou em duas.',
  },
  {
    titulo: TITULOS_DO_E2E.rskDuploClique,
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'O parecer de risco é gravado uma vez só, mesmo com dois cliques seguidos.',
  },
  {
    titulo: TITULOS_DO_E2E.espListaDeTextos,
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'A especificação lista o escopo em itens, e cada item pode ser corrigido ou removido.',
  },
  {
    titulo: TITULOS_DO_E2E.substituicao,
    tipo: 'melhoria',
    solicitanteNome: 'Carla Santos Ficticia',
    solicitantePapel: 'operacoes',
    linhaServicoProvavel: 'sob_medida',
    contexto: 'A filial de Santos calcula o frete à mão.',
  },
  // 0.2.0 (T06): todas melhoria, sob_medida, de "Pessoa Ficticia …", com contexto (a descrição do Pedido sai dele).
  ...(
    [
      [TITULOS_DO_E2E.textoDeTerceiro, 'O título veio de um formulário de terceiro e traz marcação.'],
      [TITULOS_DO_E2E.etapasSemVersoes, 'A demanda ainda não tem especificação, parecer de risco nem pacote.'],
      [TITULOS_DO_E2E.etapasDupla, 'A mudança gera compromisso com o cliente e já tem a aprovação do CTO.'],
      [TITULOS_DO_E2E.decisaoOpcaoB, 'A equipe quer aprovar a segunda opção do pacote.'],
      [TITULOS_DO_E2E.decisaoDevolverComOpcao, 'O pacote volta para análise, mesmo com uma opção escolhida na tela.'],
      [TITULOS_DO_E2E.decisaoCelularCto, 'Ajuste pequeno, decidido no celular só pelo CTO.'],
      [TITULOS_DO_E2E.decisaoCelularDupla, 'Mudança com compromisso, decidida no celular com as duas aprovações.'],
      [TITULOS_DO_E2E.decisaoRecomendaB, 'O agente de consolidação recomenda a segunda opção.'],
    ] as const
  ).map(([titulo, contexto]) => ({
    titulo,
    tipo: 'melhoria' as const,
    solicitanteNome: 'Pessoa Ficticia Produto',
    solicitantePapel: 'produto' as const,
    linhaServicoProvavel: 'sob_medida' as const,
    contexto,
  })),
];

// Versões das demandas do e2e da 0.2.0 (T06). A `etapasDupla` recebe ESP, RSK e DEC de pessoa, nível
// cto_e_administradora, e a aprovação do CTO na opção A: a barra de etapas e a T11 mostram uma de duas aprovações. Texto
// só inventado.
const ESP_DO_E2E: z.input<typeof criarEspecificacaoSchema> = {
  descricaoObjetiva: 'Mostrar na demanda em que etapa o pacote de decisão está (fictício).',
  escopoInclui: ['Barra das etapas na demanda'],
  sistemaAlvo: 'painel-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/painel-ficticio',
  criteriosAceitePreliminares: ['A barra mostra a etapa atual'],
  definicaoDePronto: ['Testes automatizados verdes'],
};
const RSK_DO_E2E: z.input<typeof criarParecerRiscoSchema> = {
  resumo: 'Risco baixo: a mudança é só de exibição (fictício).',
  riscoTecnicoNivel: 'baixo',
  riscoOperacionalNivel: 'baixo',
  riscoJuridicoNivel: 'baixo',
};
const DEC_DO_E2E: z.input<typeof criarPacoteDecisaoSchema> = {
  resumoExecutivo: 'Ajuste de exibição com compromisso com o cliente, que exige as duas aprovações (fictício).',
  opcaoA: { descricao: 'Entregar a barra de etapas numa entrega só.' },
  opcaoB: { descricao: 'Entregar a barra de etapas em duas entregas.' },
  nivelAprovacaoRequerido: 'cto_e_administradora',
};

// 0.3.0 (T15): o corpo que a tool do Awave manda (contrato do awave-agents 0ab8ced), com texto só inventado e sem nome
// de pessoa no título (spec 7.2). O servidor grava "Awave" como solicitante e descarta o que não está na lista do IN-05.
const DO_AWAVE = {
  tipo: 'melhoria',
  solicitanteNome: 'Awave',
  solicitantePapel: 'outro',
  descricaoProblema: 'O relatório semanal é montado à mão a partir de três planilhas (fictício).',
  contexto: 'Demanda aberta por um agente do Awave, com a aprovação do dono em /aprovacoes (fictício).',
} as const;
const DEMANDAS_DO_AWAVE: ReadonlyArray<z.input<typeof criarDemandaSchema>> = [
  TITULOS_DO_E2E.awaveAguardando,
  TITULOS_DO_E2E.awaveConfirmar,
  TITULOS_DO_E2E.awaveEncerrada,
].map((titulo) => ({ titulo, ...DO_AWAVE }));

// 0.3.0 (T15): as demandas dos dois pedidos, como as do e2e da 0.2.0 (melhoria, sob_medida, "Pessoa Ficticia …" e
// contexto preenchido, porque a descrição do Pedido sai dele).
const DEMANDAS_DOS_PEDIDOS: ReadonlyArray<z.input<typeof criarDemandaSchema>> = (
  [
    [TITULOS_DO_E2E.pedidoParaBuscar, 'A equipe quer que o /construir busque o pedido gerado no painel, sem cópia à mão.'],
    [TITULOS_DO_E2E.pedidoRecebido, 'O /construir já buscou este pedido e confirmou o recebimento.'],
  ] as const
).map(([titulo, contexto]) => ({
  titulo,
  tipo: 'melhoria' as const,
  solicitanteNome: 'Pessoa Ficticia Produto',
  solicitantePapel: 'produto' as const,
  linhaServicoProvavel: 'sob_medida' as const,
  contexto,
}));

// Quantas demandas o seed cria: uma de cada tipo, mais as próprias do e2e e as das integrações (0.3.0).
export const TOTAL_DEMANDAS_DO_SEED = DEMANDAS.length + DEMANDAS_DO_E2E.length + DEMANDAS_DO_AWAVE.length + DEMANDAS_DOS_PEDIDOS.length;

const SISTEMA = { tipo: 'sistema' } as const;
const agente = (a: AtorAgente['agente']): AtorAgente => ({ tipo: 'agente', agente: a, prefixoToken: null });
// D-09: as integrações do seed, com o prefixo fictício de 8 caracteres, fora do formato de token (G3.3). Nenhuma linha de
// token_servico corresponde a elas.
const AWAVE_DO_SEED: AtorIntegracao = { tipo: 'integracao', integracao: 'awave', prefixoToken: 'ficticio' };
const CONSTRUIR_DO_SEED: AtorIntegracao = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'ficticio' };

export type DepsDoSeed = DepsDoScript & Partial<Pick<Deps, 'fila'>>;
// recusado: sem SEED_FICTICIO=1 ou banco com dados. recusado_producao: a configuração não aponta para o loopback (M-07).
export type ResultadoSeed = 'semeado' | 'recusado' | 'recusado_producao';

// M-07 (C-37): segunda guarda, independente do SEED_FICTICIO e do banco vazio. Lê config.urlBase (a origin do
// BETTER_AUTH_URL validada por lerConfigApp), que os três caminhos montam: homologação, e2e e script direto. O e2e passa
// um env só com SEED_FICTICIO, por isso a guarda não lê o env.
function configEmLoopback(urlBase: string): boolean {
  try {
    return ehLoopback(new URL(urlBase).hostname);
  } catch {
    return false;
  }
}

// Dez códigos de recuperação aleatórios no formato do plugin (xxxxx-xxxxx), só para a linha ficar completa: ninguém os
// vê. Cifrados com o mesmo segredo do Better Auth que o plugin usa (C-33).
function codigosDeRecuperacao(): string[] {
  return Array.from({ length: 10 }, () => {
    const s = randomBytes(8).toString('hex').slice(0, 10);
    return `${s.slice(0, 5)}-${s.slice(5)}`;
  });
}

type PessoasDoSeed = { cto: AtorPessoa; sem2fa: AtorPessoa };

async function criarContas(t: Transacao, deps: DepsDoSeed): Promise<PessoasDoSeed> {
  const ctx = await deps.auth.$context;
  let cto: AtorPessoa | null = null;
  let sem2fa: AtorPessoa | null = null;
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
    if (conta === CONTAS_FICTICIAS.sem2fa) sem2fa = { tipo: 'pessoa', usuarioId, nome: conta.nome, papel: 'cto' };
  }
  if (!cto || !sem2fa) throw new Error('seed: conta cto ou sem2fa não criada');
  return { cto, sem2fa };
}

async function criarDemandas(t: Transacao, deps: DepsDoSeed, { cto, sem2fa }: PessoasDoSeed): Promise<number> {
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
  // As do e2e pela conta fictícia `sem2fa` (papel cto): o seed grava com a hora do sistema, e elas entrariam no limite
  // de 30 demandas por hora (C-36) da conta autora. A "cto" e a "administradora" já gastam esse limite nas specs; a
  // `sem2fa` nunca cria demanda no e2e. O limite e a regra de autoria não mudam.
  const idDoE2E = new Map<string, string>();
  for (const d of DEMANDAS_DO_E2E) idDoE2E.set(d.titulo, (await criarDemanda(deps, sem2fa, criarDemandaSchema.parse(d), t)).id);
  await criarVersoesDoE2E(t, deps, { cto, sem2fa }, idDoE2E);
  const dasIntegracoes = await criarDadosDasIntegracoes(t, deps, { cto, sem2fa });
  return entradas.length + DEMANDAS_DO_E2E.length + dasIntegracoes;
}

// 0.3.0 (DEC-DEM-20261111-0016-v1, T15): os dados das integrações, pelos mesmos serviços da API, na transação do seed.
// Com `t`, os serviços não aplicam o tempo limite das integrações (T04): quem abriu a transação decide o tempo dela.
//   - Awave: três demandas pelo ator de integração (rascunho, solicitante "Awave", sem disparo do insumo técnico, IN-06);
//     a `awaveEncerrada` vai de Nova a Encerrada pela "cto", sem confirmação. Nenhuma recebe `demanda_confirmada`.
//   - /construir: duas demandas da `sem2fa` com ESP, RSK e DEC dela (o limite C-36 da "cto" fica para as specs), DEC de
//     nível cto aprovado pela "cto" na opção A e Pedido gerado pela "cto". A `pedidoRecebido` é, depois, entregue e
//     recebida pelo /construir com o hash da entrega; a `pedidoParaBuscar` fica na lista de pendentes (V-01).
async function criarDadosDasIntegracoes(t: Transacao, deps: DepsDoSeed, { cto, sem2fa }: PessoasDoSeed): Promise<number> {
  for (const d of DEMANDAS_DO_AWAVE) {
    const dem = await criarDemanda(deps, AWAVE_DO_SEED, criarDemandaSchema.parse(d), t);
    if (dem.titulo === TITULOS_DO_E2E.awaveEncerrada) await alterarDemanda(deps, cto, dem.id, alterarDemandaSchema.parse({ status: 'encerrada' }), t);
  }
  for (const d of DEMANDAS_DOS_PEDIDOS) {
    const dem = await criarDemanda(deps, sem2fa, criarDemandaSchema.parse(d), t);
    await criarEspecificacao(deps, sem2fa, dem.id, criarEspecificacaoSchema.parse(ESP_DO_E2E), t);
    await criarParecerRisco(deps, sem2fa, dem.id, criarParecerRiscoSchema.parse(RSK_DO_E2E), t);
    const dec = await criarPacoteDecisao(deps, sem2fa, dem.id, criarPacoteDecisaoSchema.parse({ ...DEC_DO_E2E, nivelAprovacaoRequerido: 'cto' }), t);
    await registrarDecisao(deps, cto, dec.id, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), t);
    await gerarPedido(deps, cto, dec.id, confirmacaoDoPedidoSchema.parse({ confirmaSemDadoPessoal: true }), t);
    if (dem.titulo === TITULOS_DO_E2E.pedidoRecebido) {
      const { sha256 } = await entregarPedido(deps, CONSTRUIR_DO_SEED, dec.id, t);
      await receberPedido(deps, CONSTRUIR_DO_SEED, dec.id, sha256, t);
    }
  }
  return DEMANDAS_DO_AWAVE.length + DEMANDAS_DOS_PEDIDOS.length;
}

// 0.2.0 (T06): as versões das duas demandas do e2e que precisam de estado fixo, pelos mesmos serviços da API e do
// worker, na transação do seed. A ESP, o RSK e o DEC de pessoa da `etapasDupla` são da `sem2fa` (papel cto), pelo
// mesmo motivo das demandas: o limite de 60 versões por hora (C-36) da "cto" fica todo para as specs. A aprovação é da
// "cto", que é quem o e2e vê como aprovador; aprovação não entra nesse limite. A `decisaoRecomendaB` recebe os três
// rascunhos de agente, como a primeira demanda, com a recomendação de RECOMENDACAO_DO_E2E.
async function criarVersoesDoE2E(t: Transacao, deps: DepsDoSeed, { cto, sem2fa }: PessoasDoSeed, idDoE2E: ReadonlyMap<string, string>): Promise<void> {
  const id = (titulo: string): string => {
    const v = idDoE2E.get(titulo);
    if (!v) throw new Error('seed: demanda do e2e não criada');
    return v;
  };
  const dupla = id(TITULOS_DO_E2E.etapasDupla);
  await criarEspecificacao(deps, sem2fa, dupla, criarEspecificacaoSchema.parse(ESP_DO_E2E), t);
  await criarParecerRisco(deps, sem2fa, dupla, criarParecerRiscoSchema.parse(RSK_DO_E2E), t);
  const dec = await criarPacoteDecisao(deps, sem2fa, dupla, criarPacoteDecisaoSchema.parse(DEC_DO_E2E), t);
  await registrarDecisao(deps, cto, dec.id, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), t);

  const recomendaB = id(TITULOS_DO_E2E.decisaoRecomendaB);
  await criarEspecificacao(deps, agente('insumo_tecnico'), recomendaB, criarEspecificacaoSchema.parse(PROMPTS.insumo_tecnico.exemploSaida), t);
  await criarParecerRisco(deps, agente('risco'), recomendaB, criarParecerRiscoSchema.parse(PROMPTS.risco.exemploSaida), t);
  // A saída de exemplo do agente com a recomendação trocada, conferida de novo pelo schema do DEC.
  const saidaRecomendaB = criarPacoteDecisaoSchema.parse({
    ...saidaConsolidacaoSchema.parse(PROMPTS.consolidacao.exemploSaida),
    recomendacao: RECOMENDACAO_DO_E2E,
    nivelAprovacaoRequerido: NIVEL_DO_DEC_DE_AGENTE,
  });
  await criarPacoteDecisao(deps, agente('consolidacao'), recomendaB, saidaRecomendaB, t);
}

export async function seedFicticio(deps: DepsDoSeed, env: Record<string, string | undefined>): Promise<ResultadoSeed> {
  if (env.SEED_FICTICIO !== '1') {
    log.info({ evento: 'seed_ficticio', status: 'recusado', codigoErro: 'sem_seed_ficticio' });
    return 'recusado';
  }
  // Antes de abrir a transação: nada é lido nem gravado, e a trava consultiva nem é pedida. O log não leva a URL.
  if (!configEmLoopback(deps.config.urlBase)) {
    log.info({ evento: 'seed_ficticio', status: 'recusado_producao', codigoErro: 'url_fora_do_loopback' });
    return 'recusado_producao';
  }
  const resultado = await comTransacao(deps.pool, async (t): Promise<{ status: ResultadoSeed; demandas: number }> => {
    await t.tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'seed_ficticio'}, 0))`);
    const [d] = await t.tx.select({ n: count() }).from(demanda);
    const [u] = await t.tx.select({ n: count() }).from(user);
    if ((d?.n ?? 0) > 0 || (u?.n ?? 0) > 0) return { status: 'recusado', demandas: 0 };
    const pessoas = await criarContas(t, deps);
    await definirPrecoModelo(deps, { modelo: MODELO_FICTICIO, ...PRECO_FICTICIO }, t);
    return { status: 'semeado', demandas: await criarDemandas(t, deps, pessoas) };
  });
  log.info({
    evento: 'seed_ficticio',
    status: resultado.status,
    quantidade: resultado.demandas,
    ...(resultado.status === 'recusado' ? { codigoErro: 'banco_com_dados' } : {}),
  });
  return resultado.status;
}

// Textos fixos: citam só nomes de variável, nunca o valor (a URL pode ter dado da produção).
export const MENSAGENS_SEED: Readonly<Record<ResultadoSeed, string>> = Object.freeze({
  semeado: `Dados fictícios criados: quatro contas @ficticio.test, o preço do modelo fictício e ${TOTAL_DEMANDAS_DO_SEED} demandas.\n`,
  recusado: 'Seed fictício não rodou: ele exige SEED_FICTICIO=1 e um banco sem nenhuma demanda e sem nenhuma conta. Nada foi alterado.\n',
  recusado_producao:
    'Seed fictício não rodou: BETTER_AUTH_URL não aponta para o loopback (127.0.0.1, localhost ou [::1]), e o seed só roda fora da produção. Nada foi alterado.\n',
});

// O `main` do script, exportado para teste. Não aceita argumento.
export async function executarSeed(deps: DepsDoSeed, argv: readonly string[], saida: Saida, env: Record<string, string | undefined> = process.env): Promise<number> {
  lerArgumentos(z.strictObject({}), argv);
  const r = await seedFicticio(deps, env);
  saida.write(MENSAGENS_SEED[r]);
  return r === 'semeado' ? 0 : 1;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript((deps, argv, saida) => executarSeed(deps, argv, saida));
}
