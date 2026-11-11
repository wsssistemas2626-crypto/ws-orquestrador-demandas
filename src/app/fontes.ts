// Noto Sans e Noto Sans Mono servidas pelo próprio app (ADR-13, RF-02; DEC-DEM-20261110-0015-v1, T02). Os arquivos
// vêm dos pacotes @fontsource (devDependencies, versão exata) e o next/font/local os copia para /_next/static/media no
// build: nenhuma chamada a outra origem, e a CSP fica como está. Os caminhos têm de ser literais: o next/font só lê
// valor escrito no código. Subconjunto latin (cobre o pt-BR). Nunca usar `.style` destes objetos (CV-02): o layout usa
// só `.variable`, e as famílias entram pelo @theme de globals.css.
import localFont from 'next/font/local';

export const fonteSans = localFont({
  src: [
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-noto-sans',
  display: 'swap',
  adjustFontFallback: 'Arial',
  fallback: ['system-ui', 'sans-serif'],
});

export const fonteMono = localFont({
  src: [
    { path: '../../node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-noto-sans-mono',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'monospace'],
});
