// T36: acessibilidade dos componentes do design system (03, 2.3 a 2.5), conferida no HTML que o servidor gera. O que
// depende do navegador (foco, Esc no diálogo, anúncio) fica no e2e e nos casos do qa-funcional (G2).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Alerta } from './Alerta';
import { AreaTexto } from './AreaTexto';
import { BlocoJson } from './BlocoJson';
import { Botao } from './Botao';
import { CabecalhoPainel, ehPaginaAtual } from './CabecalhoPainel';
import { CaixaSelecao } from './CaixaSelecao';
import { CampoTexto } from './CampoTexto';
import { DialogoConfirmacao } from './DialogoConfirmacao';
import { Esqueleto } from './Esqueleto';
import { GrupoOpcoes } from './GrupoOpcoes';
import { Interruptor } from './Interruptor';
import { Paginacao } from './Paginacao';
import { RegiaoAviso } from './RegiaoAviso';
import { ResumoErros } from './ResumoErros';
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
    expect(html(h(Botao, { variante: 'primario' }, 'x'))).toContain('bg-primaria');
    expect(html(h(Botao, { variante: 'secundario' }, 'x'))).toContain('border-borda');
    expect(html(h(Botao, { variante: 'perigo' }, 'x'))).toContain('bg-perigo');
    expect(html(h(Botao, { variante: 'link' }, 'x'))).toContain('underline');
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
  it('Selo é texto, com 800 sobre 100 da mesma cor, e o rascunho tem borda tracejada', () => {
    const s = html(h(Selo, { cor: 'violet', children: 'Pronta para decisão' }));
    expect(s).toContain('bg-violet-100');
    expect(s).toContain('text-violet-800');
    expect(s).toContain('>Pronta para decisão</span>');
    expect(s).not.toContain('border-dashed');
    expect(html(h(Selo, { cor: 'violet', tracejado: true, children: 'Rascunho de agente' }))).toContain('border-dashed');
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
  it('nome do sistema com link para a fila, navegação "Principal", conta e botão de menu', () => {
    const s = html(h(CabecalhoPainel, { nome: 'Pessoa Ficticia CTO', papel: 'cto' }));
    expect(s).toMatch(/^<header/);
    expect(s).toMatch(/<a[^>]*href="\/demandas"[^>]*>WS Orquestrador de Demandas<\/a>/);
    expect(s).toContain('aria-label="Principal"');
    for (const [texto, href] of [
      ['Demandas', '/demandas'],
      ['Nova demanda', '/demandas/nova'],
      ['Agentes e teto', '/configuracao/agentes'],
    ])
      expect(s).toMatch(new RegExp(`href="${href}"[^>]*>${texto}</a>`));
    // Na fila, só "Demandas" é a página atual.
    expect(s).toMatch(/<a aria-current="page"[^>]*href="\/demandas">Demandas<\/a>/);
    expect(s.match(/aria-current="page"/g)).toHaveLength(1);
    expect(s).toContain('Pessoa Ficticia CTO (CTO)');
    expect(s).toMatch(/aria-expanded="false"[^>]*>Menu</);
    expect(s).toContain('>Sair</button>');
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
