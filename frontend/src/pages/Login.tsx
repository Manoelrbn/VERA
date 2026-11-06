import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Campo, TelaDeAcesso } from '../components/TelaDeAcesso';
import { Aviso } from '../components/Aviso';
import { useSessao } from '../lib/contexto';

export function Login() {
  const { entrar } = useSessao();
  const navegar = useNavigate();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErro('');
    setEnviando(true);
    try {
      await entrar(String(f.get('email')), String(f.get('senha')));
      navegar('/painel');
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaDeAcesso
      titulo="Bom te ver de novo"
      subtitulo="Entre para continuar de onde parou."
      rodape={<>Ainda não tem conta? <Link to="/cadastro" className="font-medium text-tinta underline underline-offset-4">Criar conta grátis</Link></>}
    >
      <form onSubmit={enviar} className="space-y-5" noValidate>
        {erro && <Aviso>{erro}</Aviso>}
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
        <Campo rotulo="Senha" name="senha" type="password" autoComplete="current-password" required />
        <button className="botao botao-principal w-full" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </TelaDeAcesso>
  );
}
