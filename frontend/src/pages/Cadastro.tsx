import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Campo, TelaDeAcesso } from '../components/TelaDeAcesso';
import { Aviso } from '../components/Aviso';
import { useSessao } from '../lib/contexto';

export function Cadastro() {
  const { cadastrar } = useSessao();
  const navegar = useNavigate();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErro('');
    setEnviando(true);
    try {
      await cadastrar(String(f.get('nome')), String(f.get('email')), String(f.get('senha')));
      navegar('/painel', { state: { primeiraVez: true } });
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <TelaDeAcesso
      titulo="Criar sua conta"
      subtitulo="Leva menos de um minuto. Seu primeiro edital é grátis."
      rodape={<>Já tem conta? <Link to="/entrar" className="font-medium text-tinta underline underline-offset-4">Entrar</Link></>}
    >
      <form onSubmit={enviar} className="space-y-5" noValidate>
        {erro && <Aviso>{erro}</Aviso>}
        <Campo rotulo="Como você quer ser chamado?" name="nome" autoComplete="name" required placeholder="Seu nome" />
        <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
        <div>
          <Campo
            rotulo="Senha"
            name="senha"
            type={verSenha ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            dica="Pelo menos 8 caracteres."
          />
          <button type="button" onClick={() => setVerSenha(!verSenha)} className="mt-1 text-xs text-grafite underline underline-offset-4">
            {verSenha ? 'Esconder senha' : 'Mostrar senha'}
          </button>
        </div>
        <button className="botao botao-principal w-full" disabled={enviando}>
          {enviando ? 'Criando sua conta…' : 'Criar conta'}
        </button>
      </form>
    </TelaDeAcesso>
  );
}
