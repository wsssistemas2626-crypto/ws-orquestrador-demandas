// Padrão de formulário do painel (03, 2.5 e 2.8): o `ResultadoAcao` de uma Server Action (acaoDoPainel) vira o que a
// tela mostra. Erro de validação (400 com campos) vai ao Resumo de erros, campo a campo, e à mensagem abaixo de cada
// campo; o resto vira um alerta com o texto da 2.8. A validação no cliente é só conveniência: a regra é a do servidor.
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { MENSAGENS_ACESSO } from '../modules/acesso/mensagens';

export const TITULO_RESUMO_ERROS = 'Corrija os campos abaixo para continuar.';
export const PREFIXO_CONFLITO = 'Não foi possível concluir: ';

export type ErroDeCampo = { campo: string; idCampo: string; rotulo: string | null; mensagem: string };
export type ErrosDoFormulario = {
  // Na ordem da API, para o Resumo de erros.
  campos: ErroDeCampo[];
  // Mensagem por caminho do campo ('titulo', 'anexos.1.referencia'), para a linha abaixo de cada campo.
  porCampo: Record<string, string>;
  alerta: string | null;
  // A lista `erros` da API (422 do Pedido de Construção), mostrada depois do alerta.
  detalhes: string[];
};

const SEM_ERRO: ErrosDoFormulario = { campos: [], porCampo: {}, alerta: null, detalhes: [] };

// O id do elemento do campo na página, o mesmo que o link do Resumo de erros usa. Só letras, números e hífen.
export function idDoCampo(campo: string): string {
  return `campo-${campo.replace(/\*/g, 'x').replace(/[^A-Za-z0-9]+/g, '-')}`;
}

// O rótulo do campo na tela; o item de lista ('anexos.1.referencia') usa o da lista ('anexos').
function rotuloDe(campo: string, rotulos: Readonly<Record<string, string>>): string | null {
  return rotulos[campo] ?? rotulos[campo.split('.')[0] ?? ''] ?? null;
}

function alertaDe(r: Extract<ResultadoAcao<unknown>, { ok: false }>): string {
  switch (r.erro) {
    case 'conflito':
      return `${PREFIXO_CONFLITO}${r.mensagem}`;
    case 'sem_permissao':
      return MENSAGENS_ACESSO.sem_permissao;
    case 'erro_interno':
      // Nunca a mensagem que chegou: o texto é sempre o da 2.8 (RNF-10).
      return MENSAGEM_ERRO_INTERNO;
    default:
      return r.mensagem;
  }
}

function calcular(r: Extract<ResultadoAcao<unknown>, { ok: false }>, rotulos: Readonly<Record<string, string>>): ErrosDoFormulario {
  const detalhes = r.erros ?? [];
  if (r.erro === 'entrada_invalida' && r.campos && r.campos.length > 0) {
    const campos = r.campos.map((c) => ({ campo: c.campo, idCampo: idDoCampo(c.campo), rotulo: rotuloDe(c.campo, rotulos), mensagem: c.mensagem }));
    return { campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes };
  }
  return { campos: [], porCampo: {}, alerta: alertaDe(r), detalhes };
}

const SEM_ROTULOS: Readonly<Record<string, string>> = {};

// O mesmo resultado (e os mesmos rótulos) devolve o mesmo objeto. O Resumo de erros leva o foco quando `erros` muda:
// com um array novo a cada renderização, o foco sairia do campo em que a pessoa digita (03, 2.5). Cada envio do
// useActionState é um resultado novo, e aí o foco vai ao resumo de novo. Os rótulos devem ser uma constante do módulo
// da tela, e não um objeto montado na renderização.
const memoria = new WeakMap<object, WeakMap<object, ErrosDoFormulario>>();

export function errosDoResultado(r: ResultadoAcao<unknown>, rotulos: Readonly<Record<string, string>> = SEM_ROTULOS): ErrosDoFormulario {
  if (r.ok) return SEM_ERRO;
  let porRotulos = memoria.get(r);
  if (!porRotulos) {
    porRotulos = new WeakMap();
    memoria.set(r, porRotulos);
  }
  let erros = porRotulos.get(rotulos);
  if (!erros) {
    erros = calcular(r, rotulos);
    porRotulos.set(rotulos, erros);
  }
  return erros;
}
