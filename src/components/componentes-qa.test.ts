// Escrito na 06-T36-testes (qa-automacao). Fecha o que os testes do engenheiro deixam aberto nos componentes da T36:
//   - GrupoOpcoes: a ligação de opcaoMarcavel ao `change` e o bloqueio do clique (Observação A da revisão), chamando os
//     manipuladores que o componente põe em cada `<input>`, sem DOM;
//   - Interruptor: o clique chega a onAlternar e "Alterando…" desabilita;
//   - AvisosDaMoldura: as fronteiras do teto (> 0) e da capacidade (> LIMITE_AVISO_CAPACIDADE, a constante da T14), e o
//     aviso estático (sem role="alert", 03, 2.3);
//   - CabecalhoPainel: em cada rota do painel da 03, seção 1, exatamente um item da navegação é a página atual;
//   - ResumoErros, Botao, Paginacao e AreaTexto: casos de borda do HTML.
import { createElement as h, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LIMITE_AVISO_CAPACIDADE } from '../modules/demandas/gerar-id';
import { AreaTexto } from './AreaTexto';
import { AvisosDaMoldura } from './AvisosDaMoldura';
import { Botao } from './Botao';
import { CabecalhoPainel } from './CabecalhoPainel';
import { GrupoOpcoes, type OpcaoDoGrupo } from './GrupoOpcoes';
import { Interruptor } from './Interruptor';
import { Paginacao } from './Paginacao';
import { ResumoErros } from './ResumoErros';

const navegacao = vi.hoisted(() => ({ caminho: '/demandas' as string | null }));
vi.mock('next/navigation', () => ({
  usePathname: () => navegacao.caminho,
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);

type Elemento = ReactElement<Record<string, unknown> & { children?: unknown }>;

// Os elementos nativos (`input`, `button`) da árvore que o componente devolve, sem renderizar nem montar DOM. Só serve
// para componente sem hook (GrupoOpcoes, Interruptor), chamado como função.
function nativos(raiz: unknown, tipo: string): Elemento[] {
  const achados: Elemento[] = [];
  const visitar = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visitar(x);
      return;
    }
    if (!isValidElement(n)) return;
    const el = n as Elemento;
    if (el.type === tipo) achados.push(el);
    visitar(el.props.children);
  };
  visitar(raiz);
  return achados;
}

const chamar = (el: Elemento, prop: string, arg?: unknown) => (el.props[prop] as (a: unknown) => void)(arg);

describe('GrupoOpcoes: a opção indisponível não chega ao onMudar (03, T05 e T11; Observação A da revisão)', () => {
  const opcoes: OpcaoDoGrupo[] = [
    { valor: 'em_analise', rotulo: 'Em análise' },
    { valor: 'aprovada', rotulo: 'Aprovada', desabilitada: true, dica: 'Aprovada: precisa de um pacote de decisão aprovado e atualizado.' },
    { valor: 'encerrada', rotulo: 'Encerrada' },
  ];
  const porValor = (inputs: Elemento[], v: string) => {
    const i = inputs.find((x) => x.props.value === v);
    if (!i) throw new Error(`opção ${v} ausente`);
    return i;
  };

  it('controlado: o change da opção disponível chama onMudar; o da indisponível e o de valor de fora, não', () => {
    const onMudar = vi.fn();
    const inputs = nativos(GrupoOpcoes({ nome: 'status', legenda: 'Novo status', opcoes, valor: 'em_analise', onMudar }), 'input');
    expect(inputs).toHaveLength(3);
    expect(porValor(inputs, 'em_analise').props.checked).toBe(true);
    expect(porValor(inputs, 'aprovada').props.checked).toBe(false);

    chamar(porValor(inputs, 'aprovada'), 'onChange', { target: { value: 'aprovada' } });
    expect(onMudar).not.toHaveBeenCalled();
    // Um `change` com valor forjado, de fora do grupo, também não passa.
    chamar(porValor(inputs, 'encerrada'), 'onChange', { target: { value: 'inexistente' } });
    expect(onMudar).not.toHaveBeenCalled();

    chamar(porValor(inputs, 'encerrada'), 'onChange', { target: { value: 'encerrada' } });
    expect(onMudar).toHaveBeenCalledTimes(1);
    expect(onMudar).toHaveBeenCalledWith('encerrada');
  });

  it('não controlado (valorPadrao): defaultChecked na opção certa e o mesmo filtro no change', () => {
    const onMudar = vi.fn();
    const inputs = nativos(GrupoOpcoes({ nome: 'status', legenda: 'Novo status', opcoes, valorPadrao: 'encerrada', onMudar }), 'input');
    expect(porValor(inputs, 'encerrada').props.defaultChecked).toBe(true);
    expect(porValor(inputs, 'em_analise').props.defaultChecked).toBe(false);
    expect(porValor(inputs, 'em_analise').props.checked).toBeUndefined();
    chamar(porValor(inputs, 'aprovada'), 'onChange', { target: { value: 'aprovada' } });
    expect(onMudar).not.toHaveBeenCalled();
    chamar(porValor(inputs, 'em_analise'), 'onChange', { target: { value: 'em_analise' } });
    expect(onMudar).toHaveBeenCalledWith('em_analise');
  });

  it('o clique na opção indisponível é impedido (preventDefault); a disponível não tem bloqueio', () => {
    const inputs = nativos(GrupoOpcoes({ nome: 'status', legenda: 'Novo status', opcoes, valor: 'em_analise', onMudar: vi.fn() }), 'input');
    const preventDefault = vi.fn();
    chamar(porValor(inputs, 'aprovada'), 'onClick', { preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(porValor(inputs, 'em_analise').props.onClick).toBeUndefined();
    expect(porValor(inputs, 'encerrada').props.onClick).toBeUndefined();
  });

  it('a indisponível continua no grupo, sem `disabled` nativo (encontrável pelo teclado e explicada)', () => {
    const inputs = nativos(GrupoOpcoes({ nome: 'status', legenda: 'Novo status', opcoes }), 'input');
    const aprovada = porValor(inputs, 'aprovada');
    expect(aprovada.props.disabled).toBeUndefined();
    expect(aprovada.props['aria-disabled']).toBe(true);
    expect(aprovada.props['aria-describedby']).toBe('status-aprovada-dica');
    expect(porValor(inputs, 'em_analise').props['aria-disabled']).toBeUndefined();
    // Todas com o mesmo `name`: um grupo de rádio só.
    expect(new Set(inputs.map((i) => i.props.name))).toEqual(new Set(['status']));
  });

  it('dica e erro do grupo ligados ao fieldset; valor vazio tem id próprio', () => {
    const s = html(
      h(GrupoOpcoes, {
        nome: 'decisao',
        legenda: 'Decisão',
        dica: 'Escolha uma.',
        erro: 'Escolha a decisão.',
        opcoes: [
          { valor: '', rotulo: 'Nenhuma' },
          { valor: 'A', rotulo: 'Opção A' },
        ],
      }),
    );
    expect(s).toMatch(/<fieldset[^>]*aria-describedby="decisao-dica decisao-erro"/);
    expect(s).toContain('id="decisao-dica"');
    expect(s).toContain('id="decisao-erro"');
    expect(s).toContain('id="decisao-vazio"');
    expect(s).toContain('id="decisao-A"');
  });
});

describe('Interruptor: clique e estado ocupado', () => {
  it('o clique chama onAlternar; ocupado ou desabilitado não deixa clicar', () => {
    const onAlternar = vi.fn();
    const [botao] = nativos(Interruptor({ rotulo: 'Agente de risco (RSK)', ligado: false, onAlternar }), 'button');
    expect(botao).toBeDefined();
    expect(botao!.props.disabled).toBe(false);
    chamar(botao!, 'onClick');
    expect(onAlternar).toHaveBeenCalledTimes(1);
    const [ocupado] = nativos(Interruptor({ rotulo: 'x', ligado: true, ocupado: true, onAlternar }), 'button');
    expect(ocupado!.props.disabled).toBe(true);
    const [desabilitado] = nativos(Interruptor({ rotulo: 'x', ligado: true, desabilitado: true, onAlternar }), 'button');
    expect(desabilitado!.props.disabled).toBe(true);
  });
});

describe('AvisosDaMoldura: fronteiras (03, 2.7)', () => {
  const SUSPENSAO = 'Agentes de IA suspensos: o gasto do mês atingiu o teto.';
  const CAPACIDADE = 'Atenção: já existem';

  it('o limite é o da T14 (9.000): no limite, nada; um acima, o aviso', () => {
    expect(LIMITE_AVISO_CAPACIDADE).toBe(9000);
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: false, totalDemandas: LIMITE_AVISO_CAPACIDADE }))).toBe('');
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: false, totalDemandas: LIMITE_AVISO_CAPACIDADE + 1 }))).toContain(CAPACIDADE);
  });

  it('no fim da faixa (9.999 e 10.000) o número sai com ponto de milhar', () => {
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: false, totalDemandas: 9999 }))).toContain('já existem 9.999 demandas.');
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: false, totalDemandas: 10_000 }))).toContain('já existem 10.000 demandas.');
  });

  it('qualquer teto acima de 0 conta como definido (US$ 0,01); teto 0 nunca mostra a suspensão', () => {
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0.01, suspenso: true, totalDemandas: 0 }))).toContain(SUSPENSAO);
    expect(html(h(AvisosDaMoldura, { tetoMensal: 0, suspenso: true, totalDemandas: 9001 }))).not.toContain(SUSPENSAO);
  });

  it('suspenso com 9.000 demandas: só a suspensão', () => {
    const s = html(h(AvisosDaMoldura, { tetoMensal: 10, suspenso: true, totalDemandas: 9000 }));
    expect(s).toContain(SUSPENSAO);
    expect(s).not.toContain(CAPACIDADE);
  });

  it('os avisos são estáticos: sem role="alert" nem aria-live (03, 2.3: só o resultado de envio é anunciado)', () => {
    const s = html(h(AvisosDaMoldura, { tetoMensal: 10, suspenso: true, totalDemandas: 9001 }));
    expect(s).not.toContain('role="alert"');
    expect(s).not.toContain('aria-live');
    expect(s.match(/<a /g)).toHaveLength(1);
  });
});

describe('CabecalhoPainel: um item atual por rota do painel (03, 1 e 2.7)', () => {
  const ROTAS: Array<[string, 'Demandas' | 'Nova demanda' | 'Agentes e teto']> = [
    ['/demandas', 'Demandas'],
    ['/demandas/nova', 'Nova demanda'],
    ['/demandas/DEM-20261022-0001', 'Demandas'],
    ['/demandas/DEM-20261022-0001/editar', 'Demandas'],
    ['/demandas/DEM-20261022-0001/especificacoes/nova', 'Demandas'],
    ['/demandas/DEM-20261022-0001/pareceres-risco/novo', 'Demandas'],
    ['/demandas/DEM-20261022-0001/pacotes-decisao/novo', 'Demandas'],
    ['/especificacoes/ESP-DEM-20261022-0001-v1', 'Demandas'],
    ['/pareceres-risco/RSK-DEM-20261022-0001-v1', 'Demandas'],
    ['/pacotes-decisao/DEC-DEM-20261022-0001-v1', 'Demandas'],
    ['/configuracao/agentes', 'Agentes e teto'],
  ];

  it.each(ROTAS)('%s: só "%s" tem aria-current="page"', (caminho, atual) => {
    navegacao.caminho = caminho;
    const s = html(h(CabecalhoPainel, { nome: 'Pessoa Ficticia CTO', papel: 'cto' }));
    expect(s.match(/aria-current="page"/g)).toHaveLength(1);
    expect(s).toMatch(new RegExp(`<a aria-current="page"[^>]*>(?:<svg[\\s\\S]*?</svg>)?${atual}</a>`));
  });

  it('fora do painel (sem caminho, raiz ou /sem-permissao), nenhum item atual', () => {
    for (const caminho of [null, '/', '/sem-permissao', '/entrar']) {
      navegacao.caminho = caminho;
      expect(html(h(CabecalhoPainel, { nome: 'Pessoa Ficticia CTO', papel: 'cto' }))).not.toContain('aria-current');
    }
  });

  it('a administradora aparece com o papel da 2.6, e o nome é sempre texto', () => {
    navegacao.caminho = '/demandas';
    expect(html(h(CabecalhoPainel, { nome: 'Pessoa Ficticia Administradora', papel: 'administradora' }))).toContain(
      'Pessoa Ficticia Administradora (Administradora)',
    );
    const s = html(h(CabecalhoPainel, { nome: '<img src=x onerror=alert(1)>', papel: 'cto' }));
    expect(s).not.toContain('<img');
    expect(s).toContain('&lt;img src=x onerror=alert(1)&gt; (CTO)');
  });
});

describe('ResumoErros: bordas (03, 2.5)', () => {
  it('campo sem rótulo mostra só a mensagem; o título dá nome ao alerta', () => {
    const s = html(h(ResumoErros, { erros: [{ idCampo: 'campo-desconhecido', rotulo: null, mensagem: 'Valor inválido.' }] }));
    expect(s).toContain('role="alert"');
    expect(s).toMatch(/<a href="#campo-desconhecido"[^>]*>Valor inválido\.<\/a>/);
    const id = /aria-labelledby="([^"]+)"/.exec(s)?.[1];
    expect(id).toBeTruthy();
    expect(s).toContain(`<h2 id="${id}"`);
  });

  it('um link por campo, na ordem recebida, e a mensagem sempre como texto', () => {
    const s = html(
      h(ResumoErros, {
        erros: [
          { idCampo: 'campo-titulo', rotulo: 'Título (obrigatório)', mensagem: 'Informe o título.' },
          { idCampo: 'campo-tipo', rotulo: 'Tipo (obrigatório)', mensagem: '<b>SENTINELA</b>' },
        ],
      }),
    );
    expect(s.match(/<li>/g)).toHaveLength(2);
    expect(s.indexOf('#campo-titulo')).toBeLessThan(s.indexOf('#campo-tipo'));
    expect(s).not.toContain('<b>');
    expect(s).toContain('&lt;b&gt;SENTINELA&lt;/b&gt;');
  });

  it('o título pode vir da tela', () => {
    expect(html(h(ResumoErros, { titulo: 'Outro título', erros: [{ idCampo: 'a', mensagem: 'm' }] }))).toContain('>Outro título</h2>');
  });
});

describe('Botao, Paginacao e AreaTexto: bordas', () => {
  it('Botao carregando sem texto da tela mantém o rótulo e fica desabilitado; disabled explícito também', () => {
    const s = html(h(Botao, { carregando: true }, 'Salvar demanda'));
    expect(s).toContain('disabled=""');
    expect(s).toContain('>Salvar demanda</button>');
    expect(html(h(Botao, { disabled: true }, 'x'))).toContain('disabled=""');
    expect(html(h(Botao, null, 'x'))).not.toContain('disabled=""');
  });

  it('Paginacao com página única: "Anterior" e "Próxima" indisponíveis, sem href', () => {
    const s = html(h(Paginacao, { pagina: 1, hrefAnterior: null, hrefProxima: null }));
    expect(s.match(/aria-disabled="true"/g)).toHaveLength(2);
    expect(s).not.toContain('href=');
  });

  it('Paginacao no meio: os dois links navegam, nenhum indisponível', () => {
    const s = html(h(Paginacao, { pagina: 3, hrefAnterior: '/demandas?pagina=2', hrefProxima: '/demandas?pagina=4' }));
    expect(s).not.toContain('aria-disabled');
    expect(s).toContain('href="/demandas?pagina=2"');
    expect(s).toContain('href="/demandas?pagina=4"');
    expect(s).toMatch(/aria-current="page"[^>]*>Página 3</);
  });

  it('AreaTexto conta o valor inicial e marca o excesso; sem limite, sem contador', () => {
    const s = html(h(AreaTexto, { id: 'texto', rotulo: 'Texto', limite: 10, defaultValue: 'x'.repeat(12) }));
    expect(s).toContain('12 de 10 caracteres');
    expect(s).toMatch(/<p id="texto-contador"[^>]*text-perigo/);
    // O anúncio vem com atraso, pelo efeito: no HTML do servidor a região existe e está vazia.
    expect(s).toMatch(/<p class="sr-only" aria-live="polite"><\/p>/);
    const controlado = html(h(AreaTexto, { id: 'texto', rotulo: 'Texto', limite: 100_000, value: 'abc', onChange: () => undefined }));
    expect(controlado).toContain('3 de 100.000 caracteres');
    const semLimite = html(h(AreaTexto, { id: 'contexto', rotulo: 'Contexto' }));
    expect(semLimite).not.toContain('caracteres');
    expect(semLimite).not.toContain('aria-live');
    expect(semLimite).not.toContain('aria-describedby');
  });

  it('AreaTexto: dica, contador e erro na ordem de leitura do aria-describedby', () => {
    const s = html(h(AreaTexto, { id: 'texto', rotulo: 'Texto', limite: 10, dica: 'Cole o texto.', erro: 'Texto longo demais.' }));
    expect(s).toContain('aria-describedby="texto-dica texto-contador texto-erro"');
    expect(s).toContain('aria-invalid="true"');
  });
});
