import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Marca } from './Marca';
import { primeiroNome, useSessao } from '../lib/contexto';

const links = [
  { para: '/painel', texto: 'Meus editais' },
  { para: '/questoes', texto: 'Questões' },
  { para: '/conversa', texto: 'Conversar com a Vera' },
  { para: '/ajuda', texto: 'Ajuda' },
];

/** Moldura das páginas de quem já está logado. */
export function Estrutura() {
  const { usuario, sair } = useSessao();
  const navegar = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-linha bg-folha">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 gap-y-3 px-5 py-3">
          <Marca para="/painel" />
          <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
            {links.map((l) => (
              <NavLink
                key={l.para}
                to={l.para}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-2 font-medium ${isActive ? 'bg-papel text-tinta' : 'text-grafite hover:text-tinta'}`
                }
              >
                {l.texto}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-grafite sm:inline">Oi, {primeiroNome(usuario?.nome)}</span>
            <button className="text-grafite underline-offset-4 hover:text-tinta hover:underline" onClick={() => { sair(); navegar('/'); }}>
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-linha py-6 text-center text-sm text-grafite">
        Travou em alguma coisa? <NavLink to="/ajuda" className="font-medium text-tinta underline underline-offset-4">Fale com a equipe</NavLink>. Quem responde é gente.
      </footer>
    </div>
  );
}
