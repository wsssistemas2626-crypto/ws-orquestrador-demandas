// Estreita um Ator já autorizado para AtorPessoa, sem cast (M-02 da 06-T16-revisao). As rotas de ação só de pessoa
// (`alterar_demanda`, `registrar_entrada`, `registrar_decisao`...) chamam serviços que pedem AtorPessoa; `rota()` já
// negou quem não é pessoa, e isto só protege contra uso sem autorizar. A mensagem é a da matriz e não cita o ator.
import { ErroDominio } from '../../lib/erros';
import type { Ator, AtorPessoa } from './ator';
import { MENSAGENS_ACESSO } from './mensagens';

export function exigirAtorPessoa(ator: Ator): AtorPessoa {
  if (ator.tipo !== 'pessoa') throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
  return ator;
}
