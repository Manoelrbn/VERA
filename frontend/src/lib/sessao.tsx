import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, json, token } from './api';
import { ContextoSessao, type Sessao } from './contexto';
import type { Usuario, Uso } from './tipos';

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [uso, setUso] = useState<Uso | null>(null);
  // Só precisa esperar o servidor se já existe um token salvo.
  const [carregando, setCarregando] = useState(() => Boolean(token.ler()));

  const atualizar = useCallback(async () => {
    try {
      const r = await api<{ usuario: Usuario; uso: Uso }>('/auth/eu');
      setUsuario(r.usuario);
      setUso(r.uso);
    } catch {
      setUsuario(null);
    }
  }, []);

  // Ao abrir o site, confere se o token salvo ainda vale.
  useEffect(() => {
    if (!token.ler()) return;
    api<{ usuario: Usuario; uso: Uso }>('/auth/eu')
      .then((r) => { setUsuario(r.usuario); setUso(r.uso); })
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  const iniciar = async (caminho: string, dados: object) => {
    const r = await api<{ token: string; usuario: Usuario }>(caminho, { method: 'POST', body: json(dados) });
    token.salvar(r.token);
    setUsuario(r.usuario);
    await atualizar();
  };

  const valor: Sessao = {
    usuario, uso, carregando, atualizar,
    entrar: (email, senha) => iniciar('/auth/login', { email, senha }),
    confirmarCadastro: (email, codigo) => iniciar('/auth/cadastro/confirmar', { email, codigo }),
    sair: () => { token.apagar(); setUsuario(null); setUso(null); },
  };
  return <ContextoSessao.Provider value={valor}>{children}</ContextoSessao.Provider>;
}
