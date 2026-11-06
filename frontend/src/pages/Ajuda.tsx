import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, json } from '../lib/api';
import { useSessao } from '../lib/contexto';
import { Marca } from '../components/Marca';
import { Aviso } from '../components/Aviso';

const perguntas = [
  ['Meu edital deu erro na leitura. E agora?',
    'Quase sempre é PDF escaneado (uma foto do documento). Procure no site da banca a versão publicada no Diário Oficial, que costuma ser em texto. Envios com erro não contam no seu limite. Se mesmo assim não funcionar, mande o arquivo pelo formulário abaixo que a gente olha.'],
  ['As questões são de provas anteriores?',
    'Não. São questões inéditas, escritas no estilo da sua banca a partir do conteúdo programático do edital. Assim você treina o jeito da banca cobrar sem decorar gabarito.'],
  ['Posso confiar 100% nas respostas da Vera?',
    'A Vera acerta a grande maioria, mas pode errar, principalmente com número de artigo e leis que mudaram há pouco tempo. Quando for decorar um dispositivo de lei, confira no texto oficial. Se encontrar um erro, conta para a gente: isso melhora a Vera para todo mundo.'],
  ['Como cancelo o plano Pro?',
    'Na sua conta, a qualquer momento, sem multa. Você continua com o Pro até o fim do mês que já pagou.'],
  ['Funciona para qualquer concurso?',
    'Para qualquer concurso que tenha edital em PDF com conteúdo programático: tribunais, polícias, prefeituras, área da saúde, bancos, educação.'],
];

export function Ajuda() {
  const { usuario } = useSessao();
  const [canais, setCanais] = useState<{ email: string; whatsapp: string } | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { api<{ email: string; whatsapp: string }>('/suporte/canais').then(setCanais).catch(() => {}); }, []);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setErro('');
    setEnviando(true);
    try {
      await api('/suporte/contato', { method: 'POST', body: json(f) });
      setEnviado(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-linha bg-folha">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <Marca para={usuario ? '/painel' : '/'} />
          <Link to={usuario ? '/painel' : '/'} className="text-sm text-grafite hover:text-tinta">{usuario ? 'Voltar aos meus editais' : 'Voltar ao início'}</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Como podemos ajudar?</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-grafite">
          Aqui quem responde é a equipe, não a Vera. Respondemos em até um dia útil, normalmente bem antes.
        </p>

        <div className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <h2 className="text-lg font-semibold">Dúvidas comuns</h2>
            <div className="mt-4 divide-y divide-linha border-y border-linha">
              {perguntas.map(([p, r]) => (
                <details key={p} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="mr-2 inline-block text-grafite transition-transform group-open:rotate-90" aria-hidden="true">›</span>{p}
                  </summary>
                  <p className="mt-3 pl-5 leading-relaxed text-grafite">{r}</p>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Fale com a gente</h2>
            {canais && (
              <div className="mt-4 flex flex-wrap gap-3">
                <a className="botao botao-principal" href={`https://wa.me/${canais.whatsapp}?text=${encodeURIComponent('Oi! Preciso de ajuda com a Vera.')}`} target="_blank" rel="noreferrer">
                  Chamar no WhatsApp
                </a>
                <a className="botao botao-secundario" href={`mailto:${canais.email}`}>{canais.email}</a>
              </div>
            )}

            {enviado ? (
              <div className="mt-6"><Aviso tipo="info">Recebemos sua mensagem. Vamos responder no seu e-mail em até um dia útil.</Aviso></div>
            ) : (
              <form onSubmit={enviar} className="mt-6 space-y-4">
                <p className="text-sm text-grafite">Ou escreva aqui:</p>
                {erro && <Aviso>{erro}</Aviso>}
                <input name="nome" className="campo" placeholder="Seu nome" defaultValue={usuario?.nome} required aria-label="Seu nome" />
                <input name="email" type="email" className="campo" placeholder="Seu e-mail" defaultValue={usuario?.email} required aria-label="Seu e-mail" />
                <select name="assunto" className="campo" aria-label="Assunto" defaultValue="Dúvida sobre o uso">
                  <option>Dúvida sobre o uso</option>
                  <option>Problema com edital</option>
                  <option>Pagamento e plano</option>
                  <option>Encontrei um erro da Vera</option>
                  <option>Sugestão</option>
                </select>
                <textarea name="mensagem" className="campo" rows={5} placeholder="Conte o que aconteceu" required aria-label="Mensagem" />
                <button className="botao botao-principal" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mensagem'}</button>
              </form>
            )}

            <p className="mt-10 border-t border-linha pt-6 text-sm leading-relaxed text-grafite">
              Estudar para concurso pesa. Se não for só o estudo e você estiver passando por um momento difícil,
              o CVV atende de graça, 24 horas, pelo telefone 188 ou em cvv.org.br.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
