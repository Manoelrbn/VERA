import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Campo, TelaDeAcesso } from '../components/TelaDeAcesso';
import { Aviso } from '../components/Aviso';
import { useSessao } from '../lib/contexto';
import { api, json } from '../lib/api';
import { cpfValido, mascaraCpf } from '../lib/cpf';

type Iniciado = { email: string; validade_minutos: number; reenviar_em_segundos: number };
type Dados = { nome: string; cpf: string; email: string; senha: string; senha_confirmacao: string };

const VAZIO: Dados = { nome: '', cpf: '', email: '', senha: '', senha_confirmacao: '' };

/** Erros que dá para mostrar antes de falar com o servidor, campo a campo. */
function errosDoFormulario(d: Dados): Partial<Record<keyof Dados, string>> {
  const e: Partial<Record<keyof Dados, string>> = {};
  if (d.nome.trim().length < 2) e.nome = 'Escreva seu nome para a gente saber como te chamar.';
  if (!cpfValido(d.cpf)) e.cpf = d.cpf.replace(/\D/g, '').length < 11 ? 'O CPF tem 11 números.' : 'Esse CPF não é válido. Confira os números.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Esse e-mail não parece válido. Confira se digitou certinho.';
  if (d.senha.length < 8) e.senha = 'A senha precisa ter pelo menos 8 caracteres.';
  if (d.senha_confirmacao !== d.senha) e.senha_confirmacao = 'As duas senhas não estão iguais.';
  return e;
}

export function Cadastro() {
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [iniciado, setIniciado] = useState<Iniciado | null>(null);

  return iniciado
    ? <Codigo iniciado={iniciado} nome={dados.nome} voltar={() => setIniciado(null)} />
    : <Formulario dados={dados} setDados={setDados} aoEnviar={setIniciado} />;
}

function Formulario({ dados, setDados, aoEnviar }: {
  dados: Dados; setDados: (d: Dados) => void; aoEnviar: (i: Iniciado) => void;
}) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [tocados, setTocados] = useState<Partial<Record<keyof Dados, boolean>>>({});

  const erros = errosDoFormulario(dados);
  const mostrar = (c: keyof Dados) => (tocados[c] ? erros[c] : undefined);
  const campo = (c: keyof Dados) => ({
    name: c,
    value: dados[c],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setDados({ ...dados, [c]: c === 'cpf' ? mascaraCpf(e.target.value) : e.target.value }),
    onBlur: () => setTocados((t) => ({ ...t, [c]: true })),
    'aria-invalid': Boolean(mostrar(c)),
  });

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTocados({ nome: true, cpf: true, email: true, senha: true, senha_confirmacao: true });
    if (Object.keys(erros).length) return;
    setErro('');
    setEnviando(true);
    try {
      const r = await api<Iniciado>('/auth/cadastro', { method: 'POST', body: json({ ...dados, email: dados.email.trim() }) });
      aoEnviar(r);
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
        <Campo rotulo="Como você quer ser chamado?" autoComplete="name" placeholder="Seu nome" erro={mostrar('nome')} {...campo('nome')} />
        <Campo rotulo="CPF" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" erro={mostrar('cpf')}
          dica="Usamos só para garantir uma conta por pessoa." {...campo('cpf')} />
        <Campo rotulo="E-mail" type="email" autoComplete="email" placeholder="voce@email.com" erro={mostrar('email')}
          dica="Vamos mandar um código para confirmar." {...campo('email')} />
        <Campo rotulo="Senha" type={verSenha ? 'text' : 'password'} autoComplete="new-password" erro={mostrar('senha')}
          dica="Pelo menos 8 caracteres." {...campo('senha')} />
        <div>
          <Campo rotulo="Confirme a senha" type={verSenha ? 'text' : 'password'} autoComplete="new-password"
            erro={mostrar('senha_confirmacao')} {...campo('senha_confirmacao')} />
          <button type="button" onClick={() => setVerSenha(!verSenha)} className="mt-1 text-xs text-grafite underline underline-offset-4">
            {verSenha ? 'Esconder senhas' : 'Mostrar senhas'}
          </button>
        </div>
        <button className="botao botao-principal w-full" disabled={enviando}>
          {enviando ? 'Enviando o código…' : 'Continuar'}
        </button>
      </form>
    </TelaDeAcesso>
  );
}

function Codigo({ iniciado, nome, voltar }: { iniciado: Iniciado; nome: string; voltar: () => void }) {
  const { confirmarCadastro } = useSessao();
  const navegar = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(iniciado.reenviar_em_segundos);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function confirmar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (codigo.length !== 6) { setErro('O código tem 6 números. Confira no seu e-mail.'); return; }
    setErro('');
    setInfo('');
    setEnviando(true);
    try {
      await confirmarCadastro(iniciado.email, codigo);
      navegar('/painel', { state: { primeiraVez: true } });
    } catch (err) {
      setErro((err as Error).message);
      setEnviando(false);
    }
  }

  async function reenviar() {
    setErro('');
    setInfo('');
    try {
      const r = await api<Iniciado>('/auth/cadastro/reenviar', { method: 'POST', body: json({ email: iniciado.email }) });
      setEspera(r.reenviar_em_segundos);
      setCodigo('');
      setInfo('Mandamos um código novo. O anterior não vale mais.');
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <TelaDeAcesso
      titulo="Confira seu e-mail"
      subtitulo={`${nome.trim().split(/\s+/)[0]}, mandamos um código de 6 números para ${iniciado.email}. Ele vale por ${iniciado.validade_minutos} minutos.`}
      rodape={<>E-mail errado? <button type="button" onClick={voltar} className="font-medium text-tinta underline underline-offset-4">Corrigir os dados</button></>}
    >
      <form onSubmit={confirmar} className="space-y-5" noValidate>
        {erro && <Aviso>{erro}</Aviso>}
        {info && <Aviso tipo="info">{info}</Aviso>}
        <Campo
          rotulo="Código"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          maxLength={6}
          className="campo text-center text-2xl tracking-[0.5em]"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          dica="Não chegou? Olhe a caixa de spam ou promoções."
        />
        <button className="botao botao-principal w-full" disabled={enviando || codigo.length !== 6}>
          {enviando ? 'Conferindo…' : 'Confirmar e criar conta'}
        </button>
        <button type="button" onClick={reenviar} disabled={espera > 0} className="botao botao-secundario w-full">
          {espera > 0 ? `Mandar outro código em ${espera}s` : 'Mandar outro código'}
        </button>
      </form>
    </TelaDeAcesso>
  );
}
