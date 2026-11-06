import type { ReactNode } from 'react';

/** Mensagem de erro ou de atenção. Sempre diz o que aconteceu e o que fazer. */
export function Aviso({ children, tipo = 'erro' }: { children: ReactNode; tipo?: 'erro' | 'info' }) {
  const estilo = tipo === 'erro'
    ? 'border-erro/30 bg-erro/5 text-erro'
    : 'border-grifo bg-grifo-suave text-tinta';
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${estilo}`}>
      {children}
    </div>
  );
}
