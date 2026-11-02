// T42 (06-T42-testes, qa-automacao): o achado 1 da 06-T41-revisao (erro de item na linha errada depois de remover),
// corrigido por errosDepoisDeRemover, provado como propriedade e não só nos quatro exemplos do lista-textos.test.ts:
// depois de remover qualquer linha de qualquer lista, os erros que a tela mostra são exatamente os que uma validação nova
// daria para a lista que ficou (mesmo campo, mesma linha, mesmo id de foco, mesmo rótulo "Item N de …", mesma mensagem e
// a mesma ordem do Resumo de erros), e o objeto só muda quando os erros mudam de verdade (o Resumo de erros só pega o
// foco de novo nesse caso). Vale para as duas listas da T08 (RSK) e para as cinco da T07 (ESP), que usam a correção.
// O `nome` é o que cada formulário passa à ListaTextos. Sem banco e sem relógio; só dado fictício.
import { describe, expect, it } from 'vitest';
import { ROTULOS_ESP, TEXTOS_ESP, validarEspecificacao, valoresDaEspecificacao, type CampoListaEsp, type ValoresDaEspecificacao } from './dados-da-especificacao';
import { CAMPOS_LISTA_RSK, TEXTOS_RSK, validarParecer, valoresDoParecer, type CampoListaRsk, type ValoresDoParecer } from './dados-do-parecer';
import type { ErroDeCampo, ErrosDoFormulario } from './formulario';
import { errosDepoisDeRemover, type ItemDaLista } from './lista-textos';

const LONGO = 'x'.repeat(10_001);
// Vazio, só espaços, curto e longo: as quatro formas de linha que a validação distingue.
const FORMAS = ['', '   ', 'Item curto (fictício)', LONGO] as const;

const lista = (campo: string, valores: readonly string[]): ItemDaLista[] => valores.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));

// Todas as listas de 1 a 4 linhas com as quatro formas: 340 listas, cada uma removida em cada linha.
function todasAsListas(): string[][] {
  const saida: string[][] = [];
  let camada: string[][] = [[]];
  for (let n = 1; n <= 4; n++) {
    camada = camada.flatMap((l) => FORMAS.map((f) => [...l, f]));
    saida.push(...camada);
  }
  return saida;
}
const LISTAS = todasAsListas();

const comErros = (campos: ErroDeCampo[]): ErrosDoFormulario => ({ campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes: [] });
const semLinha = <T>(l: readonly T[], k: number): T[] => l.filter((_, i) => i !== k);

type Conferencia = { casos: number; mudaram: number; iguais: number };

// Para cada lista e cada linha removida: o que errosDepoisDeRemover devolve contra uma validação nova da lista que ficou.
function conferir<V>(
  campo: string,
  nome: string,
  valores: (linhas: readonly string[]) => V,
  validar: (v: V) => ErroDeCampo[],
  esperadoDepois: (antes: ErroDeCampo[], novo: ErroDeCampo[]) => ErroDeCampo[] = (_, novo) => novo,
): Conferencia {
  const c: Conferencia = { casos: 0, mudaram: 0, iguais: 0 };
  for (const linhas of LISTAS) {
    const antes = comErros(validar(valores(linhas)));
    for (let k = 0; k < linhas.length; k++) {
      const restantes = semLinha(linhas, k);
      const depois = errosDepoisDeRemover(antes, { campo, nome, removido: k, restantes: restantes.length });
      const esperado = esperadoDepois(antes.campos, validar(valores(restantes)));
      const caso = `${campo}: [${linhas.map((l) => (l === LONGO ? 'LONGO' : JSON.stringify(l))).join(', ')}] sem a linha ${k + 1}`;
      expect(depois.campos, caso).toEqual(esperado);
      expect(depois.porCampo, caso).toEqual(Object.fromEntries(esperado.map((e) => [e.campo, e.mensagem])));
      expect(depois.alerta, caso).toBeNull();
      // Mesmo objeto se, e só se, nada mudou: senão o Resumo de erros tomaria o foco à toa, ou deixaria de tomar.
      if (JSON.stringify(esperado) === JSON.stringify(antes.campos)) {
        expect(depois, caso).toBe(antes);
        c.iguais++;
      } else {
        expect(depois, caso).not.toBe(antes);
        c.mudaram++;
      }
      c.casos++;
    }
  }
  return c;
}

describe('errosDepoisDeRemover na T08 (RSK): igual a validar de novo a lista que ficou', () => {
  // O `nome` que o FormularioParecer passa a cada lista.
  const NOME: Record<CampoListaRsk, string> = { recomendacoesMitigacao: TEXTOS_RSK.recomendacoes, preCondicoes: TEXTOS_RSK.preCondicoes };

  it.each(CAMPOS_LISTA_RSK)('%s: qualquer linha removida, de 340 listas; os erros do Resumo, de um nível e da outra lista ficam onde estavam', (campo) => {
    const outra = CAMPOS_LISTA_RSK.find((c) => c !== campo)!;
    const valores = (linhas: readonly string[]): ValoresDoParecer => ({
      ...valoresDoParecer(null),
      resumo: LONGO,
      riscoTecnicoNivel: 'alto',
      riscoOperacionalNivel: '',
      riscoJuridicoNivel: 'baixo',
      [outra]: lista(outra, ['Outro item (fictício)', LONGO]),
      [campo]: lista(campo, linhas),
    });
    const c = conferir(campo, NOME[campo], valores, validarParecer);
    // A propriedade só vale se os dois lados aparecem: remoções que mudam os erros e remoções que não mudam.
    expect(c.casos).toBe(LISTAS.reduce((n, l) => n + l.length, 0));
    expect(c.mudaram).toBeGreaterThan(100);
    expect(c.iguais).toBeGreaterThan(100);
  });

  it('o nome que o formulário passa é o rótulo do Resumo de erros: "Item N de Recomendações de mitigação" e "Item N de Pré-condições"', () => {
    const v: ValoresDoParecer = {
      ...valoresDoParecer(null),
      riscoTecnicoNivel: 'alto',
      riscoOperacionalNivel: 'medio',
      riscoJuridicoNivel: 'baixo',
      recomendacoesMitigacao: lista('recomendacoesMitigacao', ['', LONGO]),
      preCondicoes: lista('preCondicoes', ['', '', LONGO]),
    };
    expect(validarParecer(v).map((e) => e.rotulo)).toEqual([`Item 2 de ${NOME.recomendacoesMitigacao}`, `Item 3 de ${NOME.preCondicoes}`]);
  });
});

describe('errosDepoisDeRemover na T07 (ESP): igual a validar de novo a lista que ficou', () => {
  // O `nome` que o FormularioEspecificacao passa a cada lista.
  const NOME: Record<CampoListaEsp, string> = {
    escopoInclui: 'Escopo inclui',
    escopoExclui: 'Escopo exclui',
    duvidasEmAberto: TEXTOS_ESP.secoes.duvidas,
    criteriosAceitePreliminares: 'Critérios de aceite preliminares',
    definicaoDePronto: 'Definição de pronto',
  };
  const CAMPOS = Object.keys(NOME) as CampoListaEsp[];

  const valores =
    (campo: CampoListaEsp) =>
    (linhas: readonly string[]): ValoresDaEspecificacao => ({
      ...valoresDaEspecificacao(null),
      descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
      situacaoAtual: LONGO,
      sistemaAlvo: 'sistema-ficticio',
      escopoInclui: lista('escopoInclui', ['Conferir o id (fictício)']),
      escopoExclui: lista('escopoExclui', ['Fora (fictício)', LONGO]),
      criteriosAceitePreliminares: lista('criteriosAceitePreliminares', ['Critério (fictício)']),
      definicaoDePronto: lista('definicaoDePronto', ['Pronto (fictício)']),
      [campo]: lista(campo, linhas),
    });

  it('o nome que o formulário passa é o rótulo do Resumo de erros (ROTULOS_ESP)', () => {
    for (const c of CAMPOS) expect(NOME[c], c).toBe(ROTULOS_ESP[c]);
  });

  it.each(CAMPOS.filter((c) => c !== 'criteriosAceitePreliminares' && c !== 'definicaoDePronto'))(
    '%s: qualquer linha removida, de 340 listas; os outros erros ficam onde estavam',
    (campo) => {
      const c = conferir(campo, NOME[campo], valores(campo), (v) => validarEspecificacao(v, 'melhoria'));
      expect(c.mudaram).toBeGreaterThan(100);
      expect(c.iguais).toBeGreaterThan(100);
    },
  );

  // Nas listas obrigatórias de um tipo construído, remover o último item preenchido faria a validação nova acusar
  // "Informe ao menos um…". A correção não acrescenta erro novo (só move os que existem; o próximo envio valida de novo):
  // é o único ponto em que o resultado difere da validação nova, e o teste o deixa explícito.
  it.each(['criteriosAceitePreliminares', 'definicaoDePronto'] as const)(
    '%s: qualquer linha removida, de 340 listas; o erro "Informe ao menos um…" só aparece se já estava, e então vai para o "Adicionar item" quando não sobra linha',
    (campo) => {
      const c = conferir(campo, NOME[campo], valores(campo), (v) => validarEspecificacao(v, 'melhoria'), (antes, novo) =>
        antes.some((e) => e.campo === campo) ? novo : novo.filter((e) => e.campo !== campo),
      );
      expect(c.mudaram).toBeGreaterThan(100);
      expect(c.iguais).toBeGreaterThan(50);
    },
  );
});
