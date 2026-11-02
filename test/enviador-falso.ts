// Enviador de e-mail falso para os testes (RNF-14): nenhum e-mail sai da máquina. `falhasAntes` faz as N primeiras
// chamadas falharem como uma falha passageira do provedor; `enviados` guarda o que de fato "saiu", na ordem, e `chamadas`
// conta as tentativas (com e sem falha).
import { ErroEnvioEmail, type Email, type EnviadorEmail } from '../src/modules/avisos/enviador';

export class EnviadorFalso implements EnviadorEmail {
  enviados: Email[] = [];
  falhasAntes = 0;
  chamadas = 0;

  async enviar(e: Email): Promise<{ id: string }> {
    this.chamadas += 1;
    if (this.falhasAntes > 0) {
      this.falhasAntes -= 1;
      throw new ErroEnvioEmail('transitorio');
    }
    this.enviados.push(e);
    return { id: `email-falso-${this.enviados.length}` };
  }
}
