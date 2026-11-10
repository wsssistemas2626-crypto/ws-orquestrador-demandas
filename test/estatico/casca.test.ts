// T05 (pedido 0015) — CV-16 (04): a casca não decide acesso nem lê sessão no cliente. Nome e papel da conta chegam por
// prop do layout do servidor (da pessoa de exigirPessoa); "Sair" é a função de hoje (Better Auth, POST com Origin), num
// componente só, e não existe link GET de saída. Varre o código da casca (src/components/casca/ e o header,
// src/components/CabecalhoPainel.tsx), sem os testes e sem comentários. Casos plantados provam que cada regra reprova.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
// O código sem os comentários de bloco e de linha inteira: o comentário pode citar o que o código não faz.
const semComentario = (fonte: string) => fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

type Regra = { nome: string; padrao: RegExp };
const REGRAS: readonly Regra[] = [
  { nome: 'localStorage', padrao: /\blocalStorage\b/ },
  { nome: 'sessionStorage', padrao: /\bsessionStorage\b/ },
  { nome: 'document.cookie', padrao: /\bdocument\s*\.\s*cookie\b/ },
  { nome: 'fetch(', padrao: /\bfetch\s*\(/ },
  { nome: 'saída por endereço', padrao: /sign-?out['"`/?]|\/api\/auth\b/i },
  { nome: 'leitura do servidor', padrao: /from\s+'(?:next\/headers|[^']*\/(?:lib\/deps|db(?:\/[^']*)?|modules\/acesso\/(?:auth|exigir-pessoa|autorizar|matriz)))'/ },
  { nome: 'autorizar', padrao: /\bautorizar\s*\(/ },
  { nome: 'Server Action', padrao: /^\s*['"]use server['"]/m },
];

export function achadosDaCasca(arquivo: string, fonte: string): string[] {
  const c = semComentario(fonte);
  return REGRAS.filter((r) => r.padrao.test(c)).map((r) => `${arquivo}: ${r.nome}`);
}

const arquivos = [...globSync('src/components/casca/**/*.{ts,tsx}', { cwd: raiz }), 'src/components/CabecalhoPainel.tsx']
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

describe('CV-16: a casca não decide acesso nem lê sessão no cliente', () => {
  it('a varredura enxerga a casca (falha se o glob quebrar)', () => {
    expect(arquivos).toEqual(
      expect.arrayContaining([
        'src/components/CabecalhoPainel.tsx',
        'src/components/casca/BotaoSair.tsx',
        'src/components/casca/FocoNaTrocaDeTela.tsx',
        'src/components/casca/GavetaMenu.tsx',
        'src/components/casca/ItensDoMenu.tsx',
        'src/components/casca/foco.ts',
        'src/components/casca/navegacao.ts',
      ]),
    );
  });

  it('cada regra reprova a forma plantada', () => {
    const x = 'src/components/casca/X.tsx';
    expect(achadosDaCasca(x, "const nome = localStorage.getItem('nome');")).toEqual([`${x}: localStorage`]);
    expect(achadosDaCasca(x, "const p = window.sessionStorage.getItem('papel');")).toEqual([`${x}: sessionStorage`]);
    expect(achadosDaCasca(x, 'const c = document.cookie;')).toEqual([`${x}: document.cookie`]);
    expect(achadosDaCasca(x, "await fetch('/api/sessao');")).toEqual([`${x}: fetch(`]);
    expect(achadosDaCasca(x, '<a href="/api/auth/sign-out">Sair</a>')).toEqual([`${x}: saída por endereço`]);
    expect(achadosDaCasca(x, "<Link href='/sair'>Sair</Link>; const u = '/api/auth/session';")).toEqual([`${x}: saída por endereço`]);
    expect(achadosDaCasca(x, "import { headers } from 'next/headers';")).toEqual([`${x}: leitura do servidor`]);
    expect(achadosDaCasca(x, "import { obterDeps } from '../../lib/deps';")).toEqual([`${x}: leitura do servidor`]);
    expect(achadosDaCasca(x, "import { exigirPessoa } from '../../modules/acesso/exigir-pessoa';")).toEqual([`${x}: leitura do servidor`]);
    expect(achadosDaCasca(x, 'autorizar(pessoa, "listar_demandas");')).toEqual([`${x}: autorizar`]);
    expect(achadosDaCasca(x, "'use server';\nexport async function sair() {}")).toEqual([`${x}: Server Action`]);
  });

  it('deixa passar o que é da casca: tipo do papel, cliente do Better Auth e comentário que cita o proibido', () => {
    const x = 'src/components/casca/X.tsx';
    expect(achadosDaCasca(x, "import type { Papel } from '../../modules/acesso/ator';")).toEqual([]);
    expect(achadosDaCasca(x, "import { authClient } from '../../lib/auth-cliente';\nawait authClient().signOut();")).toEqual([]);
    expect(achadosDaCasca(x, '// nunca localStorage nem document.cookie\nconst a = 1;')).toEqual([]);
  });

  it('nenhum arquivo da casca lê sessão, cookie ou armazenamento do navegador, nem chama rota por conta própria', () => {
    expect(arquivos.flatMap((a) => achadosDaCasca(a, ler(a)))).toEqual([]);
  });

  it('"Sair" é a função de hoje: authClient().signOut() e depois /entrar, só no BotaoSair, e sem link', () => {
    const sair = semComentario(ler('src/components/casca/BotaoSair.tsx'));
    expect(sair).toMatch(/await authClient\(\)\.signOut\(\);/);
    expect(sair).toMatch(/router\.replace\('\/entrar'\);/);
    expect(sair).not.toMatch(/<a\b|<Link\b|\bhref\b/);
    const comSignOut = arquivos.filter((a) => /\bsignOut\b/.test(semComentario(ler(a))));
    expect(comSignOut).toEqual(['src/components/casca/BotaoSair.tsx']);
  });

  it('o layout do painel passa nome e papel da pessoa de exigirPessoa ao header, por prop', () => {
    const layout = semComentario(ler('src/app/(painel)/layout.tsx'));
    expect(layout).toMatch(/pessoa = await exigirPessoa\(deps, cabecalhos\);/);
    expect(layout).toMatch(/<CabecalhoPainel nome=\{moldura\.pessoa\.nome\} papel=\{moldura\.pessoa\.papel\} \/>/);
    expect(layout).not.toMatch(/'use client'/);
  });

  it('os itens do menu só levam às três telas de hoje (os LINKS), e a marca só à constante dela (CV-19)', () => {
    const itens = semComentario(ler('src/components/casca/ItensDoMenu.tsx'));
    expect(itens.match(/\bhref=\{[^}]*\}/g)).toEqual(['href={l.href}']);
    const navegacao = semComentario(ler('src/components/casca/navegacao.ts'));
    expect([...navegacao.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1])).toEqual(['/demandas', '/demandas/nova', '/configuracao/agentes']);
    for (const a of ['src/components/CabecalhoPainel.tsx', 'src/components/casca/GavetaMenu.tsx'])
      expect(semComentario(ler(a)), a).not.toMatch(/\bhref\s*=\s*[{'"`]/);
  });
});
