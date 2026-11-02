// Interruptor e modelo de cada agente de IA (RF-19, C-12, C-26). Os quatro nascem desligados e sem modelo (CA-19.1,
// semente da T06); o app só liga, desliga e troca o modelo, e só pelo CTO. Ligar exige um modelo com preço vigente no
// instante da mudança, porque o custo de cada chamada sai do preço dele (RF-17): sem isso, 409 e o agente continua
// desligado. O preço não muda por aqui (só por script, C-26). Cada mudança vai ao histórico com a pessoa da sessão e sem
// demanda; a autoria vem do ator, nunca do corpo (C-11).
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../../db';
import { configuracaoAgente, user } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { AGENTES, type Agente, type AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import type { DepsDemanda } from '../demandas/servico';
import { registrarEvento } from '../historico/registrar';
import { precoVigente } from './preco';

export type ConfiguracaoAgente = {
  agente: Agente;
  ligado: boolean;
  modelo: string | null;
  atualizadoEm: Date | null;
  // Só o nome da conta, nunca o id (03, T12: "Última mudança"). Nulo se nunca alterado ou se a conta não existe mais.
  atualizadoPor: { nome: string } | null;
};

export const LIMITE_MODELO = 100;

// Corpo de PATCH /api/agentes/:agente. Sem campo de autoria, de agente nem de data: `z.object` descarta a chave
// desconhecida (C-11).
export const alterarAgenteSchema = z.object({
  ligado: z.boolean(),
  modelo: z.string().trim().min(1).max(LIMITE_MODELO).optional(),
});
export type AlterarAgente = z.output<typeof alterarAgenteSchema>;

// Como a 03 nomeia cada agente numa frase (seção 2.6, "Ator no histórico", em minúscula).
const NOME_NA_FRASE: Record<Agente, string> = {
  orquestrador: 'agente orquestrador',
  insumo_tecnico: 'agente de insumo técnico',
  risco: 'agente de risco',
  consolidacao: 'agente de consolidação',
};

// 03, T12, "falha ao alternar". Frase inteira: a tela mostra como está, e o interruptor volta ao estado anterior.
export const mensagemNaoLigou = (agente: Agente): string => `Não foi possível ligar o ${NOME_NA_FRASE[agente]}. Ele continua desligado.`;

const ORDEM: ReadonlyMap<string, number> = new Map(AGENTES.map((a, i) => [a, i]));

type Linha = { agente: Agente; ligado: boolean; modelo: string | null; atualizadoEm: Date | null; nome: string | null };

const consultar = (db: Db) =>
  db
    .select({
      agente: configuracaoAgente.agente,
      ligado: configuracaoAgente.ligado,
      modelo: configuracaoAgente.modelo,
      atualizadoEm: configuracaoAgente.atualizadoEm,
      nome: user.name,
    })
    .from(configuracaoAgente)
    .leftJoin(user, eq(user.id, configuracaoAgente.atualizadoPor));

const vista = (l: Linha): ConfiguracaoAgente => ({
  agente: l.agente,
  ligado: l.ligado,
  modelo: l.modelo,
  atualizadoEm: l.atualizadoEm,
  atualizadoPor: l.nome === null ? null : { nome: l.nome },
});

// Na ordem de AGENTES (a da tabela da T12).
export async function listarConfiguracaoAgentes(db: Db): Promise<ConfiguracaoAgente[]> {
  const linhas = await consultar(db);
  return linhas.map(vista).sort((a, b) => (ORDEM.get(a.agente) ?? 0) - (ORDEM.get(b.agente) ?? 0));
}

// Para a execução (T27) e para a resposta do PATCH.
export async function obterConfiguracaoAgente(db: Db, agente: Agente): Promise<ConfiguracaoAgente> {
  const [linha] = await consultar(db).where(eq(configuracaoAgente.agente, agente));
  // As quatro linhas nascem na migration e o app não apaga agente; isto só protege contra base sem semente.
  if (!linha) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return vista(linha);
}

// Só o CTO (C-12): `autorizar` também protege a chamada direta, fora da rota. A linha do agente é travada, para duas
// mudanças ao mesmo tempo entrarem uma depois da outra e o "antes" do evento ser o estado que a mudança substituiu. O
// mesmo estado de novo não grava nem gera evento. Aceita a transação de quem chama (G3.8).
export async function alterarAgente(
  deps: DepsDemanda,
  ator: AtorPessoa,
  agente: Agente,
  e: AlterarAgente,
  t?: Transacao,
): Promise<ConfiguracaoAgente> {
  autorizar(ator, 'alterar_agente');

  const corpo = async ({ tx }: Transacao): Promise<ConfiguracaoAgente> => {
    const [atual] = await tx
      .select({ ligado: configuracaoAgente.ligado, modelo: configuracaoAgente.modelo })
      .from(configuracaoAgente)
      .where(eq(configuracaoAgente.agente, agente))
      .for('update');
    if (!atual) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

    const modelo = e.modelo ?? atual.modelo;
    const agora = deps.relogio.agora();
    if (e.ligado && (modelo === null || (await precoVigente(tx, modelo, agora)) === null)) {
      throw new ErroDominio('conflito', mensagemNaoLigou(agente));
    }

    if (e.ligado !== atual.ligado || modelo !== atual.modelo) {
      await tx
        .update(configuracaoAgente)
        .set({ ligado: e.ligado, modelo, atualizadoEm: agora, atualizadoPor: ator.usuarioId })
        .where(eq(configuracaoAgente.agente, agente));
      await registrarEvento(
        tx,
        {
          ator,
          demandaId: null,
          entidade: 'configuracao_agente',
          entidadeId: agente,
          acao: e.ligado ? 'agente_ligado' : 'agente_desligado',
          // Interruptor e nome do modelo: configuração, sem dado de terceiro (C-30).
          antes: { ligado: atual.ligado, modelo: atual.modelo },
          depois: { ligado: e.ligado, modelo },
        },
        deps.relogio,
      );
    }
    return obterConfiguracaoAgente(tx, agente);
  };

  return t ? corpo(t) : comTransacao(deps.pool, corpo);
}
