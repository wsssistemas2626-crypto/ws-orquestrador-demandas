'use client';

// "Sair" da casca (03, 3.2 e 3.3; CV-16): a mesma função de hoje, pelo cliente do Better Auth (T37), que encerra a
// sessão no servidor por POST com Origin; depois a tela vai a /entrar, e entrar de novo pede o código (C-05). Falha ao
// sair também vai a /entrar (03, 3.4). Um componente só, usado pelo menu lateral e pela gaveta; enquanto sai, "Saindo…"
// e desabilitado. Nada de link: não existe saída por GET.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '../../lib/auth-cliente';
import { Botao } from '../Botao';

export function BotaoSair({ className }: { className?: string }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    try {
      await authClient().signOut();
    } finally {
      router.replace('/entrar');
      router.refresh();
    }
  }

  return (
    <Botao variante="sobre-escuro" onClick={sair} carregando={saindo} textoCarregando="Saindo…" className={className}>
      Sair
    </Botao>
  );
}
