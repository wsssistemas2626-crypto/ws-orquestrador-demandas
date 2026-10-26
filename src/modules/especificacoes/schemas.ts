// Schema de entrada da especificação técnica (ESP, RF-08), o mesmo para rota, Server Action e job do agente de insumo
// técnico (ADR-09). Escopo, dúvidas, critérios e definição de pronto são listas (CA-08.5). Nenhum campo de autoria
// (C-11: `z.object` descarta chave desconhecida). Os quatro campos de construção são conferidos à parte, com o tipo da
// demanda, pelas mesmas regras do validarPedido do /construir (cópia em src/vendor/construir, ADR-05).
import { z } from 'zod';
import type { CampoInvalido } from '../../lib/erros';
import { DONOS_REPOSITORIO, TIPOS_CONSTRUIDOS } from '../../vendor/construir/pedido.mjs';
import { listaDeTextos, textoLivre, type Tipo } from '../demandas/schemas';

export const criarEspecificacaoSchema = z.object({
  descricaoObjetiva: textoLivre.min(1),
  situacaoAtual: textoLivre.optional(),
  situacaoDesejada: textoLivre.optional(),
  escopoInclui: listaDeTextos,
  escopoExclui: listaDeTextos.default([]),
  sistemasErp: textoLivre.optional(),
  sistemasEcommerceMarketplace: textoLivre.optional(),
  sistemasApisTerceiros: textoLivre.optional(),
  sistemasServicosInternos: textoLivre.optional(),
  dadosEntidades: textoLivre.optional(),
  dadosCamposCriticos: textoLivre.optional(),
  restricoesTecnicas: textoLivre.optional(),
  duvidasEmAberto: listaDeTextos.default([]),
  sistemaAlvo: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'Sistema alvo aceita só letras minúsculas, números e hífen.')
    .max(100)
    .optional(),
  repositorioDestino: z.string().trim().max(200).optional(),
  criteriosAceitePreliminares: listaDeTextos.optional(),
  definicaoDePronto: listaDeTextos.optional(),
});

export type CriarEspecificacao = z.output<typeof criarEspecificacaoSchema>;

// Textos da 03 (T07, "Erro"); o da conta cita os donos da cópia do validarPedido.
export const MENSAGENS_CONSTRUCAO = Object.freeze({
  sistemaAlvo: 'Informe o sistema alvo.',
  repositorioDestino: 'Informe o repositório destino.',
  criteriosAceitePreliminares: 'Informe ao menos um critério de aceite preliminar.',
  definicaoDePronto: 'Informe ao menos um item da definição de pronto.',
  repositorioSemSistema: 'O repositório destino precisa terminar com o sistema alvo.',
  contaDoRepositorio: `A conta do repositório precisa ser ${DONOS_REPOSITORIO.join(' ou ')}.`,
});

const vazio = (v: string | undefined): boolean => v === undefined || v === '';
const listaVazia = (v: string[] | undefined): boolean => v === undefined || v.length === 0;

// `<dono>/<sistemaAlvo>`, com dono da lista do validarPedido (RF-08, CA-08.3).
function conferirRepositorio(repositorio: string, sistemaAlvo: string | undefined): CampoInvalido | null {
  const partes = repositorio.split('/');
  if (partes.length !== 2 || vazio(sistemaAlvo) || partes[1] !== sistemaAlvo)
    return { campo: 'repositorioDestino', mensagem: MENSAGENS_CONSTRUCAO.repositorioSemSistema };
  if (!DONOS_REPOSITORIO.includes(partes[0]!)) return { campo: 'repositorioDestino', mensagem: MENSAGENS_CONSTRUCAO.contaDoRepositorio };
  return null;
}

// Fora do tipo estudo, os quatro campos são obrigatórios (CA-08.2); no estudo, opcionais (CA-08.4), mas o repositório
// informado segue a mesma regra. Devolve a lista na ordem dos campos da tela; vazia quando está tudo certo.
export function validarCamposDeConstrucao(tipo: Tipo, e: CriarEspecificacao): CampoInvalido[] {
  const campos: CampoInvalido[] = [];
  const construido = TIPOS_CONSTRUIDOS.includes(tipo);
  // Sem sistema alvo num tipo construído, o campo dele já explica; o repositório não ganha um segundo erro por isso.
  const semSistemaAlvo = construido && vazio(e.sistemaAlvo);
  if (semSistemaAlvo) campos.push({ campo: 'sistemaAlvo', mensagem: MENSAGENS_CONSTRUCAO.sistemaAlvo });
  const repositorio = e.repositorioDestino;
  if (repositorio === undefined || repositorio === '') {
    if (construido) campos.push({ campo: 'repositorioDestino', mensagem: MENSAGENS_CONSTRUCAO.repositorioDestino });
  } else if (!semSistemaAlvo) {
    const r = conferirRepositorio(repositorio, e.sistemaAlvo);
    if (r) campos.push(r);
  }
  if (construido && listaVazia(e.criteriosAceitePreliminares))
    campos.push({ campo: 'criteriosAceitePreliminares', mensagem: MENSAGENS_CONSTRUCAO.criteriosAceitePreliminares });
  if (construido && listaVazia(e.definicaoDePronto)) campos.push({ campo: 'definicaoDePronto', mensagem: MENSAGENS_CONSTRUCAO.definicaoDePronto });
  return campos;
}
