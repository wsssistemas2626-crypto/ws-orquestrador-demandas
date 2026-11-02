// Estreitamento de Ator para AtorPessoa nas rotas de pessoa (M-02 da 06-T16-revisao): um lugar só, sem cast.
import { describe, expect, it } from 'vitest';
import { ErroDominio } from '../../lib/erros';
import type { AtorAgente, AtorPessoa, AtorSistema } from './ator';
import { exigirAtorPessoa } from './ator-pessoa';
import { MENSAGENS_ACESSO } from './mensagens';

const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' };
const agente: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'Ab3dE5gH' };
const sistema: AtorSistema = { tipo: 'sistema' };

describe('exigirAtorPessoa', () => {
  it('devolve a própria pessoa, sem cópia nem mudança', () => {
    expect(exigirAtorPessoa(pessoa)).toBe(pessoa);
  });

  it.each([
    ['agente', agente],
    ['sistema', sistema],
  ] as const)('%s → sem_permissao com a mensagem da matriz, sem citar o ator', (_, ator) => {
    let erro: unknown;
    try {
      exigirAtorPessoa(ator);
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(JSON.stringify(erro)).not.toContain('orquestrador');
  });
});
