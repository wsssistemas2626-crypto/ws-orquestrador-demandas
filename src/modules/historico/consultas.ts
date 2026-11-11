// Leitura do histórico de uma demanda (RF-21), do mais novo para o mais antigo. A pessoa aparece pelo nome e pelo papel
// da conta (junção com `user`), nunca pelo id interno; o agente, pelo nome, sem o prefixo do token, que fica só na
// coluna para auditoria (C-09). A integração (0.3.0, IN-13, D-19) aparece pelo nome da lista e pelo prefixo do token,
// só quando ele casa o formato de prefixo.
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { evento, user } from '../../db/schema';
import { AGENTES, ehIntegracao, type Agente, type Integracao, type Papel } from '../acesso/ator';
import type { AcaoEvento } from './registrar';

// `nome` e `papel` nulos só quando a conta não existe mais (o app não apaga conta: a desativação mantém a linha); o
// evento continua no histórico. `integracao` nula só para nome fora da lista (linha que o CHECK do IN-12 recusaria).
export type AtorVisivel =
  | { tipo: 'pessoa'; nome: string | null; papel: Papel | null }
  | { tipo: 'agente'; agente: Agente }
  | { tipo: 'integracao'; integracao: Integracao | null; prefixo: string | null }
  | { tipo: 'sistema' };

export type EventoVisivel = {
  id: number;
  ocorridoEm: Date;
  ator: AtorVisivel;
  entidade: string;
  entidadeId: string;
  acao: AcaoEvento;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
};

const ehAgente = (v: string): v is Agente => (AGENTES as readonly string[]).includes(v);

// O formato do prefixo gravado (tokens-servico.ts): 8 caracteres base64url.
const RE_PREFIXO = /^[A-Za-z0-9_-]{8}$/;

function atorVisivel(l: { atorTipo: string; atorId: string; prefixo: string | null; nome: string | null; papel: Papel | null }): AtorVisivel {
  switch (l.atorTipo) {
    case 'pessoa':
      return { tipo: 'pessoa', nome: l.nome, papel: l.papel };
    case 'agente':
      return ehAgente(l.atorId) ? { tipo: 'agente', agente: l.atorId } : { tipo: 'sistema' };
    case 'integracao': {
      // IN-13 e D-19: só o prefixo da coluna, só se casar a regex e só de integração da lista; nunca token, hash nem
      // sha256.
      if (!ehIntegracao(l.atorId)) return { tipo: 'integracao', integracao: null, prefixo: null };
      return { tipo: 'integracao', integracao: l.atorId, prefixo: l.prefixo !== null && RE_PREFIXO.test(l.prefixo) ? l.prefixo : null };
    }
    default:
      return { tipo: 'sistema' };
  }
}

export async function listarHistorico(db: Db, demandaId: string): Promise<EventoVisivel[]> {
  const linhas = await db
    .select({
      id: evento.id,
      ocorridoEm: evento.ocorridoEm,
      atorTipo: evento.atorTipo,
      atorId: evento.atorId,
      prefixo: evento.atorTokenPrefixo,
      nome: user.name,
      papel: user.papel,
      entidade: evento.entidade,
      entidadeId: evento.entidadeId,
      acao: evento.acao,
      antes: evento.antes,
      depois: evento.depois,
    })
    .from(evento)
    .leftJoin(user, and(eq(evento.atorTipo, 'pessoa'), eq(user.id, evento.atorId)))
    .where(eq(evento.demandaId, demandaId))
    .orderBy(desc(evento.ocorridoEm), desc(evento.id));

  return linhas.map((l) => ({
    id: l.id,
    ocorridoEm: l.ocorridoEm,
    ator: atorVisivel(l),
    entidade: l.entidade,
    entidadeId: l.entidadeId,
    acao: l.acao as AcaoEvento,
    antes: (l.antes as Record<string, unknown> | null) ?? null,
    depois: (l.depois as Record<string, unknown> | null) ?? null,
  }));
}
