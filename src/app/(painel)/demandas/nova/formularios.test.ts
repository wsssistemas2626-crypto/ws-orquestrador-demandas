// T39: T04 Nova demanda e T06 Editar dados no HTML do servidor (03, T04 e T06). Os três modos da Nova demanda
// (desligado, suspenso e ligado), "Preencher à mão" com o texto da entrada, a edição preenchida e os rótulos, dicas e
// seções da 03. Envio, foco, anexos, confirmação ao sair e axe são conferidos no navegador (e2e/nova-demanda.spec.ts e
// e2e/editar-demanda.spec.ts).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { valoresDaDemanda } from '../../../../components/dados-da-demanda';
import { FormularioEditarDemanda } from '../[id]/editar/FormularioEditarDemanda';
import { FormularioNovaDemanda } from './FormularioNovaDemanda';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas/nova',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
// As Server Actions não rodam aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ registrarEntradaNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('../[id]/editar/acoes', () => ({ alterarDadosNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const html = (el: ReactElement) => renderToStaticMarkup(el);
const nova = (props: Partial<Parameters<typeof FormularioNovaDemanda>[0]> = {}) =>
  html(h(FormularioNovaDemanda, { estado: 'desligado', pendente: null, ...props }));

const rotuloDe = (pagina: string, id: string) => new RegExp(`<label for="${id}"[^>]*>([^<]*)</label>`).exec(pagina)?.[1];

describe('T04 Nova demanda: modo manual (agente desligado ou suspenso)', () => {
  it('desligado: alerta de modo, sem o grupo "Como criar a demanda?"', () => {
    const p = nova();
    expect(p).toContain('Agente orquestrador desligado. Preencha os campos abaixo.');
    expect(p).not.toContain('Como criar a demanda?');
    expect(p).not.toContain('Agentes suspensos pelo teto de gasto');
  });

  it('suspenso: o alerta do teto', () => {
    const p = nova({ estado: 'suspenso' });
    expect(p).toContain('Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.');
    expect(p).not.toContain('Agente orquestrador desligado');
    expect(p).not.toContain('Como criar a demanda?');
  });

  it('seções com título e os rótulos da 03', () => {
    const p = nova();
    for (const s of ['Texto recebido', 'Solicitante', 'Classificação', 'Descrição', 'Anexos (referências)'])
      expect(p).toMatch(new RegExp(`<section aria-labelledby="[^"]+"[^>]*><h2 id="[^"]+"[^>]*>${s.replace(/[()]/g, '\\$&')}</h2>`));
    expect(rotuloDe(p, 'campo-texto')).toBe('Texto do pedido (opcional)');
    expect(rotuloDe(p, 'campo-origem-canal')).toBe('Canal de origem (opcional)');
    expect(rotuloDe(p, 'campo-origem-referencia')).toBe('Referência da origem (opcional)');
    expect(rotuloDe(p, 'campo-solicitanteNome')).toBe('Nome do solicitante (obrigatório)');
    expect(rotuloDe(p, 'campo-solicitantePapel')).toBe('Papel do solicitante');
    expect(rotuloDe(p, 'campo-titulo')).toBe('Título (obrigatório)');
    expect(rotuloDe(p, 'campo-linhaServicoProvavel')).toBe('Linha de serviço provável');
    expect(rotuloDe(p, 'campo-justificativaUrgencia')).toBe('Justificativa da urgência');
    expect(rotuloDe(p, 'campo-contexto')).toBe('Contexto');
    expect(rotuloDe(p, 'campo-descricaoProblema')).toBe('Descrição do problema');
    expect(rotuloDe(p, 'campo-impactoPercebido')).toBe('Impacto percebido');
    expect(p).toContain('<legend class="font-medium">Tipo (obrigatório)</legend>');
    expect(p).toContain('<legend class="font-medium">Urgência</legend>');
  });

  it('dicas da 03 ligadas ao campo, e o contador "0 de 100.000 caracteres"', () => {
    const p = nova();
    expect(p).toContain(
      'Cole o e-mail, a mensagem ou o formulário como chegou. Este texto é dado pessoal de terceiro: fica guardado por 90 dias e depois é apagado.',
    );
    expect(p).toContain('Um identificador da mensagem, sem endereço de e-mail.');
    expect(p).toContain(
      'O campo não vai ao agente de IA. Evite repetir o nome no texto: o sistema troca o nome do solicitante, mas não o de outras pessoas nem a parte do nome escrita toda em minúscula.',
    );
    expect(p).not.toContain('Ele não é enviado ao agente de IA.');
    expect(p).toContain('Só a referência: o arquivo não é enviado ao sistema.');
    expect(p).toContain('0 de 100.000 caracteres');
    expect(p).toMatch(/<textarea[^>]*id="campo-texto"[^>]*aria-describedby="campo-texto-dica campo-texto-contador"/);
    expect(p).toMatch(/<input[^>]*id="campo-solicitanteNome"[^>]*aria-describedby="campo-solicitanteNome-dica"/);
  });

  it('opções: tipo, urgência com "Não informada", papel com "Não informado", canal e linha', () => {
    const p = nova();
    for (const t of ['Bug', 'Melhoria', 'Novo projeto', 'Estudo', 'Produto próprio']) expect(p).toMatch(new RegExp(`<label for="campo-tipo-[a-z_]+"[^>]*>${t}</label>`));
    for (const u of ['Não informada', 'Baixa', 'Média', 'Alta']) expect(p).toMatch(new RegExp(`<label for="campo-urgencia-[a-z_]+"[^>]*>${u}</label>`));
    expect(p).toMatch(/<select[^>]*id="campo-solicitantePapel"[^>]*>(<option[^>]*>[^<]*<\/option>)+<\/select>/);
    const opcoes = (id: string) => [...(new RegExp(`<select[^>]*id="${id}"[^>]*>(.*?)</select>`).exec(p)?.[1] ?? '').matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1]);
    expect(opcoes('campo-solicitantePapel')).toEqual(['Não informado', 'Operações', 'Financeiro', 'Produto', 'Outro']);
    expect(opcoes('campo-origem-canal')).toEqual(['Não informado', 'E-mail', 'Mensagem', 'Formulário', 'Outro']);
    expect(opcoes('campo-linhaServicoProvavel')).toEqual([
      'Não informada',
      'Sistema sob medida',
      'Automação e integração',
      'IA com controle humano',
      'Diagnóstico e sustentação',
      'Indefinida',
    ]);
  });

  it('botões "Salvar demanda" e "Adicionar anexo"; "Cancelar" volta à fila; formulário sem validação nativa', () => {
    const p = nova();
    expect(p).toMatch(/<button type="submit"[^>]*>Salvar demanda<\/button>/);
    expect(p).toMatch(/<button type="button"[^>]*id="adicionar-anexo"[^>]*>Adicionar anexo<\/button>/);
    expect(p).toMatch(/<a [^>]*href="\/demandas"[^>]*>Cancelar<\/a>/);
    // Nome de atributo em HTML não diferencia maiúscula; o React escreve `noValidate`.
    expect(p).toMatch(/<form [^>]*novalidate=""/i);
    expect(p).not.toContain('Enviar ao agente');
    // Sem anexo na abertura: a pessoa adiciona.
    expect(p).not.toContain('Remover anexo 1');
  });
});

describe('T04 Nova demanda: agente orquestrador ligado', () => {
  it('grupo "Como criar a demanda?", com "Pedir ao agente" marcado; esconde classificação, descrição e anexos', () => {
    const p = nova({ estado: 'disponivel' });
    expect(p).toContain('<legend class="font-medium">Como criar a demanda?</legend>');
    expect(p).toMatch(/<input type="radio" id="modo-agente"[^>]*checked=""/);
    expect(p).toContain('Pedir ao agente orquestrador que proponha os campos');
    expect(p).toContain('Preencher eu mesmo');
    expect(p).not.toContain('Agente orquestrador desligado');
    expect(rotuloDe(p, 'campo-texto')).toBe('Texto do pedido (obrigatório)');
    expect(rotuloDe(p, 'campo-solicitanteNome')).toBe('Nome do solicitante (obrigatório)');
    for (const fora of ['campo-titulo', 'campo-contexto', 'adicionar-anexo']) expect(p).not.toContain(`id="${fora}"`);
    expect(p).not.toContain('>Classificação</h2>');
  });

  it('aviso de minimização e o botão "Enviar ao agente"', () => {
    const p = nova({ estado: 'disponivel' });
    expect(p).toContain(
      'O agente recebe só o texto, sem a origem e com e-mails, telefones, CPF e CNPJ trocados por marcadores. O nome do solicitante também vira marcador, e cada parte com 3 letras ou mais, fora partículas como da, dos e Júnior, quando escrita com inicial maiúscula; nomes de outras pessoas, não. Você revisa a proposta antes de qualquer decisão.',
    );
    expect(p).not.toContain('sem o nome do solicitante');
    expect(p).toMatch(/<button type="submit"[^>]*>Enviar ao agente<\/button>/);
    expect(p).not.toContain('Salvar demanda');
  });
});

describe('T04 "Preencher à mão": entrada que o agente não conseguiu preparar', () => {
  const pendente = {
    id: '0f1e2d3c-4b5a-4968-8776-655443322110',
    texto: 'SENTINELA-TEXTO-DA-ENTRADA <b>negrito</b>',
    canal: 'email',
    referencia: 'SENTINELA-REF',
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: 'produto',
  };

  it('o texto vem preenchido, só para leitura, e escapado (C-18); o modo é manual, mesmo com o agente ligado', () => {
    const p = nova({ estado: 'disponivel', pendente });
    expect(p).not.toContain('Como criar a demanda?');
    expect(p).toMatch(/<textarea[^>]*id="campo-texto"[^>]*readonly=""[^>]*>SENTINELA-TEXTO-DA-ENTRADA &lt;b&gt;negrito&lt;\/b&gt;<\/textarea>/i);
    expect(p).not.toContain('<b>negrito</b>');
    expect(p).toMatch(/<input[^>]*id="campo-origem-referencia"[^>]*readonly=""[^>]*value="SENTINELA-REF"/i);
    expect(p).toMatch(/<select[^>]*id="campo-origem-canal"[^>]*disabled=""/);
    expect(p).toMatch(/<input[^>]*id="campo-solicitanteNome"[^>]*value="Pessoa Ficticia"/);
    expect(p).toMatch(/<option value="produto" selected="">Produto<\/option>/);
    expect(p).toContain('Salvar demanda');
  });
});

describe('T06 Editar dados da demanda', () => {
  const demanda = {
    titulo: 'Pedidos <script>alert(1)</script> duplicados',
    tipo: 'melhoria' as const,
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: null,
    linhaServicoProvavel: 'sob_medida' as const,
    urgencia: 'media' as const,
    justificativaUrgencia: null,
    contexto: 'Contexto fictício',
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [{ tipo: 'url' as const, referencia: 'https://exemplo.test/a' }],
  };
  const pagina = () => html(h(FormularioEditarDemanda, { id: 'DEM-20261022-0042', inicial: valoresDaDemanda(demanda) }));

  it('campos de T04 preenchidos, sem texto recebido nem status', () => {
    const p = pagina();
    expect(p).not.toContain('id="campo-texto"');
    expect(p).not.toContain('Texto recebido');
    expect(p).not.toContain('Status');
    expect(p).toMatch(/<input[^>]*id="campo-titulo"[^>]*value="Pedidos &lt;script&gt;alert\(1\)&lt;\/script&gt; duplicados"/);
    expect(p).not.toContain('<script>alert(1)</script>');
    expect(p).toMatch(/<input type="radio" id="campo-tipo-melhoria"[^>]*checked=""/);
    expect(p).toMatch(/<input type="radio" id="campo-urgencia-media"[^>]*checked=""/);
    expect(p).toMatch(/<option value="sob_medida" selected="">Sistema sob medida<\/option>/);
    expect(p).toContain('Contexto fictício</textarea>');
    expect(p).toMatch(/<input[^>]*id="campo-anexos-0-referencia"[^>]*value="https:\/\/exemplo.test\/a"/);
    expect(p).toContain('<legend class="font-medium">Anexo 1</legend>');
    expect(p).toMatch(/<button type="button"[^>]*>Remover anexo 1<\/button>/);
  });

  it('"Salvar alterações" e "Cancelar" de volta ao detalhe', () => {
    const p = pagina();
    expect(p).toMatch(/<button type="submit"[^>]*>Salvar alterações<\/button>/);
    expect(p).toMatch(/<a [^>]*href="\/demandas\/DEM-20261022-0042"[^>]*>Cancelar<\/a>/);
  });
});
