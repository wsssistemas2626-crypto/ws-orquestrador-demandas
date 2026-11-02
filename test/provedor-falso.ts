// Provedor de IA falso para os testes (RNF-14, CA-16.5): nenhuma chamada sai da máquina. O teste enfileira em
// `respostas` o que o provedor devolve (ou o erro que ele lança), na ordem, e confere em `chamadas` o que foi pedido.
import type { PedidoAoProvedor, ProvedorIA, RespostaDoProvedor } from '../src/modules/agentes/provedor';

export class ProvedorFalso implements ProvedorIA {
  respostas: Array<RespostaDoProvedor | Error> = [];
  chamadas: PedidoAoProvedor[] = [];

  async gerar(p: PedidoAoProvedor): Promise<RespostaDoProvedor> {
    this.chamadas.push(p);
    const proxima = this.respostas.shift();
    if (proxima === undefined) throw new Error('ProvedorFalso: nenhuma resposta enfileirada para esta chamada');
    if (proxima instanceof Error) throw proxima;
    return proxima;
  }
}
