const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const CHAVE_TOKEN = 'vera_token';

export const token = {
  ler: () => localStorage.getItem(CHAVE_TOKEN),
  salvar: (t: string) => localStorage.setItem(CHAVE_TOKEN, t),
  apagar: () => localStorage.removeItem(CHAVE_TOKEN),
};

export class ErroApi extends Error {
  status: number;
  constructor(status: number, mensagem: string) {
    super(mensagem);
    this.status = status;
  }
}

/** Transforma qualquer erro do backend numa frase que uma pessoa entende. */
function mensagemDeErro(status: number, corpo: unknown): string {
  const detalhe = (corpo as { detail?: unknown })?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe)) {
    const campo = String(detalhe[0]?.loc?.at(-1) ?? '');
    if (campo === 'email') return 'Esse e-mail não parece válido. Confira se digitou certinho.';
    if (campo === 'senha') return 'A senha precisa ter pelo menos 8 caracteres.';
    if (campo === 'nome') return 'Escreva seu nome para a gente saber como te chamar.';
    if (campo === 'cpf') return 'Esse CPF não é válido. Confira os números.';
    if (campo === 'codigo') return 'O código tem 6 números. Confira no seu e-mail.';
    return 'Algum campo ficou incompleto. Confira e tente de novo.';
  }
  if (status >= 500) return 'Tivemos um problema do nosso lado. Tente de novo em instantes.';
  return 'Não deu certo dessa vez. Tente de novo.';
}

export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers = new Headers(opcoes.headers);
  const t = token.ler();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  if (opcoes.body && !(opcoes.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}${caminho}`, { ...opcoes, headers });
  } catch {
    // O fetch só falha assim quando não houve resposta nenhuma: sem internet,
    // servidor fora do ar ou bloqueio de CORS. Só a primeira depende do aluno.
    const mensagem = navigator.onLine
      ? 'Não conseguimos falar com o servidor da Vera agora. Tente de novo em instantes.'
      : 'Parece que a internet caiu. Confira sua conexão e tente de novo.';
    throw new ErroApi(0, mensagem);
  }

  if (resposta.status === 204) return undefined as T;
  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 401) token.apagar();
    throw new ErroApi(resposta.status, mensagemDeErro(resposta.status, corpo));
  }
  return corpo as T;
}

export const json = (dados: unknown) => JSON.stringify(dados);
