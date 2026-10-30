// Bloco de JSON (03, 2.3 e T11): `<pre>` rolável pelo teclado (tabindex="0"), região com rótulo. O conteúdo é sempre
// texto: o React escapa tudo, sem HTML cru (C-18).
type Props = { rotulo: string; conteudo: string; id?: string };

export function BlocoJson({ rotulo, conteudo, id }: Props) {
  return (
    <pre
      id={id}
      tabIndex={0}
      role="region"
      aria-label={rotulo}
      className="max-h-96 overflow-auto rounded-campo border border-borda bg-fundo-suave p-3 font-mono text-sm whitespace-pre"
    >
      {conteudo}
    </pre>
  );
}
