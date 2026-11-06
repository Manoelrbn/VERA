import { createContext, useContext } from 'react';
import type { Usuario, Uso } from './tipos';

export type Sessao = {
  usuario: Usuario | null;
  uso: Uso | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  /** Última etapa do cadastro: confere o código do e-mail e já entra na conta. */
  confirmarCadastro: (email: string, codigo: string) => Promise<void>;
  sair: () => void;
  atualizar: () => Promise<void>;
};

export const ContextoSessao = createContext<Sessao | null>(null);

export function useSessao() {
  const c = useContext(ContextoSessao);
  if (!c) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>');
  return c;
}

export const primeiroNome = (nome?: string) => (nome ?? '').trim().split(/\s+/)[0];
