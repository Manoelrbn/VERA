import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProvedorSessao } from './lib/sessao';
import { useSessao } from './lib/contexto';
import { Estrutura } from './components/Estrutura';
import { Landing } from './pages/Landing';
import { Cadastro } from './pages/Cadastro';
import { Login } from './pages/Login';
import { Painel } from './pages/Painel';
import { EditalPagina } from './pages/Edital';
import { Questoes, RedirecionarPraticar } from './pages/Questoes';
import { Conversa } from './pages/Conversa';
import { Ajuda } from './pages/Ajuda';

function SoLogado({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();
  if (carregando) return null;
  return usuario ? children : <Navigate to="/entrar" replace />;
}

function SoVisitante({ children }: { children: ReactNode }) {
  const { usuario, carregando } = useSessao();
  if (carregando) return null;
  return usuario ? <Navigate to="/painel" replace /> : children;
}

export default function App() {
  return (
    <ProvedorSessao>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/entrar" element={<SoVisitante><Login /></SoVisitante>} />
          <Route path="/cadastro" element={<SoVisitante><Cadastro /></SoVisitante>} />
          <Route element={<SoLogado><Estrutura /></SoLogado>}>
            <Route path="/painel" element={<Painel />} />
            <Route path="/editais/:id" element={<EditalPagina />} />
            <Route path="/questoes" element={<Questoes />} />
            <Route path="/editais/:id/praticar" element={<RedirecionarPraticar />} />
            <Route path="/conversa" element={<Conversa />} />
          </Route>
          {/* A ajuda fica aberta também para quem não conseguiu entrar. */}
          <Route path="/ajuda" element={<Ajuda />} />
          <Route path="/login" element={<Navigate to="/entrar" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ProvedorSessao>
  );
}
