import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Marca } from './Marca';

/** Layout simples para entrar e criar conta: um formulário, sem distração. */
export function TelaDeAcesso({ titulo, subtitulo, children, rodape }: {
  titulo: string; subtitulo: string; children: ReactNode; rodape: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-5"><Marca /></header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
          <p className="mt-2 text-grafite">{subtitulo}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-8 text-sm text-grafite">{rodape}</p>
          <p className="mt-3 text-sm text-grafite">
            Problema para entrar? <Link to="/ajuda" className="font-medium text-tinta underline underline-offset-4">Fale com a equipe</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}

export function Campo({ rotulo, dica, ...props }: { rotulo: string; dica?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      <input className="campo" {...props} />
      {dica && <span className="mt-1.5 block text-xs text-grafite">{dica}</span>}
    </label>
  );
}
