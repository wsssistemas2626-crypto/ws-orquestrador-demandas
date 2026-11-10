// Substituto de `next/font/local` nos testes de unidade (alias em vitest.config.ts). A função de verdade só existe
// dentro do compilador do Next, que lê os caminhos dos woff2 e gera as classes no build; o Vitest a recebe vazia.
// Aqui ela devolve o mesmo formato, com a classe da variável previsível ("fonte-teste-<variável sem -->"), para o
// teste do layout conferir que as duas variáveis chegam ao <html>. O build e o e2e usam a função de verdade.
type OpcoesDaFonte = { variable?: string };
type FonteCarregada = { className: string; variable: string; style: { fontFamily: string } };

export default function localFont(opcoes: OpcoesDaFonte): FonteCarregada {
  const nome = (opcoes.variable ?? '').replace(/^--/, '');
  return { className: `fonte-teste-classe-${nome}`, variable: `fonte-teste-${nome}`, style: { fontFamily: nome } };
}
