// T36: acessibilidade dos componentes do design system (03, 2.3 a 2.5), conferida no HTML que o servidor gera. O que
// depende do navegador (foco, Esc no diálogo, anúncio) fica no e2e e nos casos do qa-funcional (G2).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Alerta } from './Alerta';
import { AreaTexto } from './AreaTexto';
import { AvisosDaMoldura } from './AvisosDaMoldura';
import { BlocoJson } from './BlocoJson';
import { Botao, classeDoBotao } from './Botao';
import { CabecalhoPainel, ehPaginaAtual } from './CabecalhoPainel';
import { CaixaSelecao } from './CaixaSelecao';
import { Cartao } from './Cartao';
import { CampoTexto, classeDoCampo } from './CampoTexto';
import { DialogoConfirmacao } from './DialogoConfirmacao';
import { Esqueleto } from './Esqueleto';
import { GrupoOpcoes, opcaoMarcavel } from './GrupoOpcoes';
import { Interruptor } from './Interruptor';
import { Paginacao } from './Paginacao';
import { RegiaoAviso } from './RegiaoAviso';
import { ResumoErros } from './ResumoErros';
import type { CorSelo } from './rotulos';
import { Selecao } from './Selecao';
import { Selo } from './Selo';
import { Tabela } from './Tabela';

// O roteador do App Router só existe dentro do Next: aqui, o caminho atual é fixo e a navegação não faz nada.
vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);
const nada = () => undefined;

describe('Botao', () => {
  it('é type="button" por padrão, com alvo de 44 px', () => {
    const s = html(h(Botao, null, 'Filtrar'));
    expect(s).toMatch(/^<button type="button"/);
    expect(s).toContain('min-h-11');
    expect(s).toContain('>Filtrar</button>');
  });
  it('carregando: texto da tela e desabilitado', () => {
    const s = html(h(Botao, { type: 'submit', carregando: true, textoCarregando: 'Salvando…' }, 'Salvar demanda'));
    expect(s).toContain('type="submit"');
    expect(s).toContain('disabled=""');
    expect(s).toContain('>Salvando…</button>');
  });
  it('variantes primário, secundário, perigo e link', () => {
    expect(html(h(Botao, { variante: 'primario' }, 'x'))).toContain('bg-acao');
    expect(html(h(Botao, { variante: 'secundario' }, 'x'))).toContain('border-tinta-suave');
    expect(html(h(Botao, { variante: 'perigo' }, 'x'))).toContain('bg-erro');
    expect(html(h(Botao, { variante: 'link' }, 'x'))).toContain('underline');
  });
  // 0.2.0 (T03; 03, 2.6): variações novas, com os tokens da 03, 2.1.
  it('variantes sobre-escuro e claro-sobre-escuro', () => {
    const escuro = html(h(Botao, { variante: 'sobre-escuro' }, 'Sair'));
    for (const c of ['border-azul-claro', 'bg-transparent', 'text-branco', 'hover:bg-marinho-luz']) expect(escuro).toContain(c);
    const claro = classeDoBotao('claro-sobre-escuro');
    for (const c of ['bg-branco', 'text-marinho', 'font-bold', 'min-h-11']) expect(claro).toContain(c);
  });
  it('estado aria-disabled: continua focável (sem disabled), com o visual indisponível e o motivo ligado', () => {
    const s = html(h(Botao, { type: 'submit', 'aria-disabled': true, 'aria-describedby': 'motivo' }, 'Aprovar a opção A'));
    expect(s).toContain('aria-disabled="true"');
    expect(s).toContain('aria-describedby="motivo"');
    expect(s).not.toContain('disabled=""');
    for (const c of ['aria-disabled:bg-selo-cinza-fundo', 'aria-disabled:text-tinta-media', 'aria-disabled:border-dashed', 'aria-disabled:border-tinta-suave'])
      expect(s).toContain(c);
  });
  it('nenhuma variante usa cor da paleta do Tailwind nem o branco literal', () => {
    for (const v of ['primario', 'secundario', 'perigo', 'link', 'sobre-escuro', 'claro-sobre-escuro'] as const)
      expect(classeDoBotao(v), v).not.toMatch(/\b(?:bg|text|border)-(?:white|black|(?:slate|gray|blue|red|green|amber|violet|cyan|emerald|orange)-\d+)\b/);
  });
});

describe('Cartao (03, 2.4 e 2.6)', () => {
  it('section com borda linha, fundo branco, raio de cartão e preenchimento 16/24, sem sombra', () => {
    const s = html(h(Cartao, { id: 'c1', rotuloPor: 'c1-titulo', children: h('h2', { id: 'c1-titulo' }, 'Resumo') }));
    expect(s).toMatch(/^<section[^>]*id="c1"/);
    expect(s).toContain('aria-labelledby="c1-titulo"');
    for (const c of ['rounded-cartao', 'border', 'border-linha', 'bg-branco', 'p-4', 'md:p-6']) expect(s).toContain(c);
    expect(s).not.toMatch(/shadow/);
    expect(s).toContain('>Resumo</h2></section>');
  });
});

describe('CampoTexto, AreaTexto, Selecao e CaixaSelecao (03, 2.5)', () => {
  it('rótulo visível ligado ao campo; dica e erro por aria-describedby; aria-invalid só com erro', () => {
    const s = html(h(CampoTexto, { id: 'titulo', rotulo: 'Título (obrigatório)', obrigatorio: true, dica: 'Uma linha.', erro: 'Informe o título.' }));
    expect(s).toContain('<label for="titulo"');
    expect(s).toContain('>Título (obrigatório)</label>');
    expect(s).toContain('id="titulo"');
    expect(s).toContain('aria-required="true"');
    expect(s).toContain('aria-invalid="true"');
    expect(s).toContain('aria-describedby="titulo-dica titulo-erro"');
    expect(s).toContain('id="titulo-dica"');
    expect(s).toContain('id="titulo-erro"');
    expect(s).toContain('Informe o título.');
    const limpo = html(h(CampoTexto, { id: 'contexto', rotulo: 'Contexto' }));
    expect(limpo).not.toContain('aria-invalid');
    expect(limpo).not.toContain('aria-describedby');
    expect(limpo).not.toContain('required');
  });
  it('AreaTexto com contador "0 de 100.000 caracteres" ligado à área', () => {
    const s = html(h(AreaTexto, { id: 'texto', rotulo: 'Texto do pedido (opcional)', limite: 100_000 }));
    expect(s).toContain('<textarea');
    expect(s).toContain('0 de 100.000 caracteres');
    expect(s).toMatch(/aria-describedby="[^"]*texto-contador/);
  });
  it('Selecao com as opções na ordem dada', () => {
    const s = html(
      h(Selecao, {
        id: 'status',
        rotulo: 'Status',
        opcoes: [
          { valor: '', rotulo: 'Todos' },
          { valor: 'nova', rotulo: 'Nova' },
        ],
      }),
    );
    expect(s).toContain('<label for="status"');
    expect(s).toMatch(/<select[^>]*id="status"/);
    expect(s.indexOf('Todos')).toBeLessThan(s.indexOf('Nova'));
  });
  // 0.2.0 (T03; 03, 2.3 e 2.6): borda tinta-suave (4,5:1), erro em erro, raio de campo e 16 px.
  it('campos com os tokens da 0.2.0: borda tinta-suave, erro em erro, fundo branco, raio de campo e 16 px', () => {
    const limpo = classeDoCampo(false);
    for (const c of ['border-tinta-suave', 'bg-branco', 'text-tinta', 'rounded-campo', 'text-base', 'min-h-11']) expect(limpo).toContain(c);
    const comErro = classeDoCampo(true);
    for (const c of ['border-2', 'border-erro']) expect(comErro).toContain(c);
    expect(comErro).not.toContain('border-tinta-suave');
  });
  it('CaixaSelecao com rótulo, não ícone', () => {
    const s = html(h(CaixaSelecao, { id: 'mostrar', rotulo: 'Mostrar senha' }));
    expect(s).toContain('type="checkbox"');
    expect(s).toContain('<label for="mostrar"');
    expect(s).toContain('Mostrar senha');
  });
});

describe('GrupoOpcoes (03, 2.3 e T05)', () => {
  it('fieldset com legend; opção indisponível com aria-disabled e o motivo por aria-describedby', () => {
    const s = html(
      h(GrupoOpcoes, {
        nome: 'status',
        legenda: 'Novo status',
        opcoes: [
          { valor: 'em_analise', rotulo: 'Em análise' },
          { valor: 'aprovada', rotulo: 'Aprovada', desabilitada: true, dica: 'Aprovada: precisa de um pacote de decisão aprovado e atualizado.' },
        ],
      }),
    );
    expect(s).toContain('<fieldset');
    expect(s).toContain('<legend');
    expect(s).toContain('>Novo status</legend>');
    expect(s).toContain('type="radio"');
    expect(s).toMatch(/id="status-aprovada"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*id="status-aprovada"/);
    expect(s).toContain('aria-describedby="status-aprovada-dica"');
    expect(s).toContain('id="status-aprovada-dica"');
  });
  // 0.2.0 (T03; 03, 2.6): variante cartão, com os mesmos ids, name e aria-* da lista.
  it('variante cartão: cada opção num cartão de 44 px com borda tinta-suave; marcada com borda marinho e fundo nevoa', () => {
    const props = {
      nome: 'opcao',
      legenda: 'Opção',
      opcoes: [
        { valor: 'A', rotulo: 'Opção A' },
        { valor: 'B', rotulo: 'Opção B', desabilitada: true, dica: 'Indisponível (fictício).' },
      ],
    };
    const lista = html(h(GrupoOpcoes, props));
    const cartao = html(h(GrupoOpcoes, { ...props, variante: 'cartao' as const }));
    const atributos = (s: string) => [...s.matchAll(/<(?:input|label|p|fieldset|legend)\b([^>]*)>/g)].map((m) => m[1]!.replace(/\s*class="[^"]*"/, ''));
    expect(atributos(cartao)).toEqual(atributos(lista));
    expect(cartao.match(/type="radio"/g)).toHaveLength(2);
    for (const c of ['rounded-campo', 'border-tinta-suave', 'min-h-11', 'has-[:checked]:border-2', 'has-[:checked]:border-marinho', 'has-[:checked]:bg-nevoa'])
      expect(cartao).toContain(c);
    expect(lista).not.toContain('has-[:checked]');
  });
  it('a opção indisponível não chega ao onMudar, nem pelo teclado', () => {
    const opcoes = [
      { valor: 'em_analise', rotulo: 'Em análise' },
      { valor: 'aprovada', rotulo: 'Aprovada', desabilitada: true },
    ];
    expect(opcaoMarcavel(opcoes, 'em_analise')).toBe(true);
    expect(opcaoMarcavel(opcoes, 'aprovada')).toBe(false);
    expect(opcaoMarcavel(opcoes, 'inexistente')).toBe(false);
  });
});

describe('AvisosDaMoldura (03, 2.7: RF-18 e RNF-09)', () => {
  const SUSPENSAO =
    'Agentes de IA suspensos: o gasto do mês atingiu o teto. Nenhum agente chama o provedor até o teto subir ou o mês virar. Preencha os campos à mão.';
  const capacidade = (n: string) =>
    `Atenção: já existem ${n} demandas. O formato do id comporta até 9.999. Avise o time técnico para planejar a mudança.`;

  it('teto 0 (não definido) e suspenso: nenhum aviso', () => {
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: true, totalDemandas: 10 }))).toBe('');
  });
  it('teto 10, não suspenso, com 9.000 demandas: nenhum aviso', () => {
    expect(html(h(AvisosDaMoldura, { tetoMensal: 10, suspenso: false, totalDemandas: 9000 }))).toBe('');
  });
  it('teto 10 e suspenso: o texto da 03, 2.7, e o link "Ver agentes e teto"', () => {
    const s = html(h(AvisosDaMoldura, { tetoMensal: 10, suspenso: true, totalDemandas: 10 }));
    expect(s).toContain(SUSPENSAO);
    expect(s).toMatch(/<a[^>]*href="\/configuracao\/agentes"[^>]*>Ver agentes e teto<\/a>/);
    expect(s).not.toContain('Atenção: já existem');
  });
  it('9.001 demandas: o aviso de capacidade, sem o de suspensão', () => {
    const s = html(h(AvisosDaMoldura, { tetoMensal: 10, suspenso: false, totalDemandas: 9001 }));
    expect(s).toContain(capacidade('9.001'));
    expect(s).not.toContain('Agentes de IA suspensos');
  });
  it('9.012 demandas: o número sai como "9.012"', () => {
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: false, totalDemandas: 9012 }))).toContain(capacidade('9.012'));
  });
  it('os dois avisos juntos, na ordem suspensão e depois capacidade', () => {
    const s = html(h(AvisosDaMoldura, { tetoMensal: 10, suspenso: true, totalDemandas: 9001 }));
    const i = s.indexOf(SUSPENSAO);
    const j = s.indexOf(capacidade('9.001'));
    expect(i).toBeGreaterThanOrEqual(0);
    expect(j).toBeGreaterThan(i);
  });
});

describe('Interruptor (03, 2.3 e T12)', () => {
  it('button role="switch" com aria-checked, nome acessível e estado em texto', () => {
    const s = html(h(Interruptor, { rotulo: 'Agente de risco (RSK)', ligado: false, onAlternar: nada }));
    expect(s).toMatch(/<button[^>]*type="button"/);
    expect(s).toContain('role="switch"');
    expect(s).toContain('aria-checked="false"');
    expect(s).toContain('aria-label="Agente de risco (RSK)"');
    expect(s).toContain('Desligado');
    const ligado = html(h(Interruptor, { rotulo: 'Agente de risco (RSK)', ligado: true, onAlternar: nada }));
    expect(ligado).toContain('aria-checked="true"');
    expect(ligado).toContain('Ligado');
    const ocupado = html(h(Interruptor, { rotulo: 'Agente de risco (RSK)', ligado: true, ocupado: true, onAlternar: nada }));
    expect(ocupado).toContain('disabled=""');
    expect(ocupado).toContain('Alterando…');
  });
});

describe('Selo, Alerta, ResumoErros e RegiaoAviso', () => {
  it('Selo é texto, com o texto e o fundo do token da cor, e o rascunho tem borda tracejada', () => {
    const s = html(h(Selo, { cor: 'violeta', children: 'Em análise' }));
    expect(s).toContain('bg-selo-violeta-fundo');
    expect(s).toContain('text-selo-violeta');
    expect(s).toContain('>Em análise</span>');
    expect(s).not.toContain('border-dashed');
    expect(html(h(Selo, { cor: 'violeta', tracejado: true, children: 'Rascunho de agente' }))).toContain('border-dashed');
  });
  // 0.2.0 (T03; 03, 2.5; D-15): data-cor com o nome da cor, 13 px, peso 700, pílula; cada cor com o par de tokens.
  it('Selo: data-cor, 13 px em peso 700, e o par texto/fundo de cada cor da 03, 2.5', () => {
    const PARES: ReadonlyArray<readonly [CorSelo, string, string]> = [
      ['azul', 'text-acao-escura', 'bg-nevoa'],
      ['violeta', 'text-selo-violeta', 'bg-selo-violeta-fundo'],
      ['ambar', 'text-atencao', 'bg-atencao-fundo'],
      ['petroleo', 'text-selo-petroleo', 'bg-selo-petroleo-fundo'],
      ['verde', 'text-selo-verde', 'bg-selo-verde-fundo'],
      ['marinho', 'text-marinho', 'bg-selo-marinho-fundo'],
      ['verde-cheio', 'text-branco', 'bg-selo-verde'],
      ['laranja', 'text-selo-laranja', 'bg-selo-laranja-fundo'],
      ['cinza', 'text-tinta-media', 'bg-selo-cinza-fundo'],
      ['vermelho', 'text-erro', 'bg-erro-fundo'],
    ];
    for (const [cor, texto, fundo] of PARES) {
      const s = html(h(Selo, { cor, children: 'Texto' }));
      expect(s, cor).toMatch(new RegExp(`^<span data-cor="${cor}"`));
      expect(s.split('"'), cor).toEqual(expect.arrayContaining([expect.stringMatching(new RegExp(`(?:^| )${texto}(?: |$)`))]));
      expect(s.split('"'), cor).toEqual(expect.arrayContaining([expect.stringMatching(new RegExp(`(?:^| )${fundo}(?: |$)`))]));
      for (const c of ['text-[0.8125rem]', 'font-bold', 'rounded-full']) expect(s, cor).toContain(c);
      expect(s, cor).toContain('>Texto</span>');
    }
  });
  it('Alerta de informação: fundo nevoa, texto tinta, borda esquerda de 4 px acao-escura (03, 2.6)', () => {
    const s = html(h(Alerta, { tipo: 'informacao', children: 'Info.' }));
    for (const c of ['bg-nevoa', 'text-tinta', 'border-l-4', 'border-acao-escura']) expect(s).toContain(c);
    expect(html(h(Alerta, { tipo: 'erro', children: 'x' }))).toContain('bg-erro-fundo');
    expect(html(h(Alerta, { tipo: 'sucesso', children: 'x' }))).toContain('bg-positivo-fundo');
    expect(html(h(Alerta, { tipo: 'atencao', children: 'x' }))).toContain('bg-atencao-fundo');
  });
  it('Alerta de envio (erro e sucesso) em role="alert"; o resto, estático', () => {
    expect(html(h(Alerta, { tipo: 'erro', envio: true, children: 'Falhou.' }))).toContain('role="alert"');
    expect(html(h(Alerta, { tipo: 'sucesso', envio: true, children: 'Feito.' }))).toContain('role="alert"');
    expect(html(h(Alerta, { tipo: 'erro', children: 'Erro estático.' }))).not.toContain('role=');
    expect(html(h(Alerta, { tipo: 'atencao', children: 'Atenção.' }))).not.toContain('role=');
    expect(html(h(Alerta, { tipo: 'informacao', children: 'Info.' }))).not.toContain('role=');
  });
  it('ResumoErros: título da 03, foco programável e um link por campo', () => {
    const s = html(h(ResumoErros, { erros: [{ idCampo: 'campo-titulo', rotulo: 'Título (obrigatório)', mensagem: 'Informe o título.' }] }));
    expect(s).toContain('tabindex="-1"');
    expect(s).toContain('Corrija os campos abaixo para continuar.');
    expect(s).toContain('href="#campo-titulo"');
    expect(s).toContain('Título (obrigatório): Informe o título.');
    expect(html(h(ResumoErros, { erros: [] }))).toBe('');
  });
  it('RegiaoAviso é role="status"', () => {
    expect(html(h(RegiaoAviso, null, '12 demandas encontradas.'))).toMatch(/role="status"[^>]*>12 demandas encontradas\.</);
  });
});

describe('Tabela, Paginacao, Esqueleto e BlocoJson', () => {
  it('Tabela com caption focável, th scope="col" e rolagem própria por teclado', () => {
    const s = html(h(Tabela, { legenda: 'Demandas, da mais nova para a mais antiga', rotuloRegiao: 'Tabela de demandas', colunas: ['Id', 'Título'], linhas: [['DEM-20261022-0001', 'Exemplo']] }));
    expect(s).toContain('role="region"');
    expect(s).toContain('aria-label="Tabela de demandas"');
    expect(s).toContain('tabindex="0"');
    expect(s).toMatch(/<caption[^>]*tabindex="-1"[^>]*>Demandas, da mais nova para a mais antiga<\/caption>/);
    expect(s).toContain('<th scope="col"');
    expect(s).toContain('DEM-20261022-0001');
    expect(html(h(Tabela, { legenda: 'x', rotuloRegiao: 'y', colunas: ['a'], linhas: [], ocupado: true }))).toContain('aria-busy="true"');
  });
  it('Paginacao: nav "Paginação", página atual e "Anterior" indisponível na primeira', () => {
    const s = html(h(Paginacao, { pagina: 1, hrefAnterior: null, hrefProxima: '/demandas?pagina=2' }));
    expect(s).toContain('aria-label="Paginação"');
    expect(s).toMatch(/aria-disabled="true"[^>]*>Anterior</);
    expect(s).toMatch(/aria-current="page"[^>]*>Página 1</);
    expect(s).toContain('href="/demandas?pagina=2"');
    expect(s).toContain('>Próxima<');
  });
  it('Esqueleto: texto oculto para o leitor de tela e barras escondidas dele', () => {
    const s = html(h(Esqueleto, { rotulo: 'Carregando demandas…', linhas: 5 }));
    expect(s).toContain('Carregando demandas…');
    expect(s).toContain('sr-only');
    expect(s.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(1);
  });
  it('BlocoJson: <pre> rolável por teclado, com rótulo, e conteúdo sempre como texto', () => {
    const s = html(h(BlocoJson, { rotulo: 'Conteúdo do Pedido de Construção', conteudo: '{"x":"<script>alert(1)</script>"}' }));
    expect(s).toMatch(/^<pre/);
    expect(s).toContain('tabindex="0"');
    expect(s).toContain('role="region"');
    expect(s).toContain('aria-label="Conteúdo do Pedido de Construção"');
    expect(s).not.toContain('<script>');
    expect(s).toContain('&lt;script&gt;');
  });
});

describe('DialogoConfirmacao (03, 2.3)', () => {
  it('<dialog> nativo com título ligado e os dois botões', () => {
    const s = html(
      h(DialogoConfirmacao, {
        aberto: false,
        titulo: 'Confirmar a decisão?',
        rotuloConfirmar: 'Confirmar e registrar',
        rotuloCancelar: 'Voltar',
        onConfirmar: nada,
        onCancelar: nada,
        children: 'Depois de registrada, a decisão deste pacote não muda.',
      }),
    );
    expect(s).toMatch(/^<dialog[^>]*aria-labelledby="([^"]+)"/);
    const id = /aria-labelledby="([^"]+)"/.exec(s)![1]!;
    expect(s).toMatch(new RegExp(`<h2[^>]*id="${id}"[^>]*tabindex="-1"|<h2[^>]*tabindex="-1"[^>]*id="${id}"`));
    expect(s).toContain('>Confirmar a decisão?</h2>');
    expect(s).toContain('>Confirmar e registrar</button>');
    expect(s).toContain('>Voltar</button>');
  });
});

describe('CabecalhoPainel (03, 2.7)', () => {
  // 0.2.0 (T05; 03, 3.2 e 3.3): o header da casca. A marca vem em três blocos de texto (MarcaWs) e cada item do menu
  // tem um ícone SVG aria-hidden antes do texto; o "Menu" controla a gaveta (`gaveta-menu`), e não mais a navegação.
  it('nome do sistema com link para a fila, navegação "Principal", conta e botão de menu', () => {
    const s = html(h(CabecalhoPainel, { nome: 'Pessoa Ficticia CTO', papel: 'cto' }));
    expect(s).toMatch(/^<header/);
    expect(s).toMatch(/<a[^>]*href="\/demandas"[^>]*><span[^>]*>WS<\/span> <span[^>]*><span[^>]*>Orquestrador<\/span> <span[^>]*>de Demandas<\/span><\/span><\/a>/);
    expect(s).toContain('aria-label="Principal"');
    for (const [texto, href] of [
      ['Demandas', '/demandas'],
      ['Nova demanda', '/demandas/nova'],
      ['Agentes e teto', '/configuracao/agentes'],
    ])
      expect(s).toMatch(new RegExp(`href="${href}"[^>]*>(?:<svg[^>]*aria-hidden="true"[\\s\\S]*?</svg>)?${texto}</a>`));
    // Na fila, só "Demandas" é a página atual.
    expect(s).toMatch(/<a aria-current="page"[^>]*href="\/demandas">(?:<svg[\s\S]*?<\/svg>)?Demandas<\/a>/);
    expect(s.match(/aria-current="page"/g)).toHaveLength(1);
    expect(s).toContain('Pessoa Ficticia CTO (CTO)');
    expect(s).toMatch(/aria-expanded="false"[^>]*>(?:<svg[\s\S]*?<\/svg>)?Menu</);
    expect(s).toContain('aria-controls="gaveta-menu"');
    expect(s).toContain('>Sair</button>');
  });

  // 0.2.0 (T05; ADR-15, D-09): a gaveta é um <dialog> fechado e vazio até abrir; o menu lateral e a conta só aparecem a
  // partir de 768 px, e a barra com "Menu" só abaixo. Um só nav "Principal" e um só "Sair" no HTML do servidor.
  it('casca: gaveta fechada e vazia, menu lateral só a partir de 768 px, barra só abaixo, superfície escura', () => {
    const s = html(h(CabecalhoPainel, { nome: 'Pessoa Ficticia CTO', papel: 'cto' }));
    expect(s).toMatch(/<dialog id="gaveta-menu" aria-label="Menu"[^>]*><\/dialog>/);
    expect(s).not.toMatch(/<dialog[^>]*\bopen\b/);
    expect(s.match(/aria-label="Principal"/g)).toHaveLength(1);
    expect(s.match(/>Sair<\/button>/g)).toHaveLength(1);
    expect(s).toMatch(/<header class="[^"]*\bsuperficie-escura\b[^"]*\bbg-marinho\b/);
    // A barra do celular (com "Menu") some a partir de 768 px; o menu lateral só aparece a partir de 768 px.
    expect(s).toMatch(/<div class="[^"]*\bmd:hidden\b[^"]*"><button[^>]*aria-expanded="false"/);
    expect(s).toMatch(/<div class="[^"]*\bhidden\b[^"]*\bmd:flex\b[^"]*">[\s\S]*aria-label="Principal"/);
    // Ícones decorativos: todo SVG da casca fica fora da leitura.
    expect(s.match(/<svg\b/g)?.length).toBeGreaterThanOrEqual(4);
    expect(s.match(/<svg\b(?![^>]*aria-hidden="true")/g)).toBeNull();
  });

  it('página atual: telas da demanda contam como "Demandas"; "Nova demanda" e "Agentes e teto" têm o próprio item', () => {
    expect(ehPaginaAtual('/demandas', '/demandas')).toBe(true);
    expect(ehPaginaAtual('/demandas', '/demandas/DEM-20261022-0001')).toBe(true);
    expect(ehPaginaAtual('/demandas', '/pacotes-decisao/DEC-DEM-20261022-0001-v1')).toBe(true);
    expect(ehPaginaAtual('/demandas', '/demandas/nova')).toBe(false);
    expect(ehPaginaAtual('/demandas/nova', '/demandas/nova')).toBe(true);
    expect(ehPaginaAtual('/configuracao/agentes', '/configuracao/agentes')).toBe(true);
    expect(ehPaginaAtual('/configuracao/agentes', '/demandas')).toBe(false);
    expect(ehPaginaAtual('/demandas', '/demandasx')).toBe(false);
    expect(ehPaginaAtual('/demandas', null)).toBe(false);
  });
});
