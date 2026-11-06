import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Edital } from '../lib/tipos';
import { Aviso } from '../components/Aviso';

type Trecho = { antes: string; termo: string; depois: string };

function BuscaNoEdital({ id }: { id: string }) {
  const [trechos, setTrechos] = useState<Trecho[] | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const termo = String(new FormData(e.currentTarget).get('termo')).trim();
    if (termo.length < 3) return;
    setBuscando(true);
    const r = await api<{ trechos: Trecho[] }>(`/editais/${id}/busca?termo=${encodeURIComponent(termo)}`).catch(() => ({ trechos: [] }));
    setTrechos(r.trechos);
    setBuscando(false);
  }

  return (
    <div>
      <form onSubmit={buscar} className="flex gap-2">
        <label className="sr-only" htmlFor="termo">Palavra para buscar no edital</label>
        <input id="termo" name="termo" className="campo" placeholder="Ex.: isenção, altura mínima, CNH" minLength={3} />
        <button className="botao botao-secundario shrink-0" disabled={buscando}>Buscar</button>
      </form>
      {trechos && (
        <div className="mt-4 space-y-3">
          {trechos.length === 0 && <p className="text-grafite">Essa palavra não aparece no edital. Tente um sinônimo.</p>}
          {trechos.map((t, i) => (
            <p key={i} className="leitura rounded-md border border-linha bg-folha p-4 text-base">
              …{t.antes}<mark className="grifo">{t.termo}</mark>{t.depois}…
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-linha pt-8">
      <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

export function EditalPagina() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const [edital, setEdital] = useState<Edital | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    api<Edital>(`/editais/${id}`).then(setEdital).catch((e) => setErro(e.message));
  }, [id]);

  useEffect(carregar, [carregar]);
  useEffect(() => {
    if (edital?.status !== 'processando') return;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [edital?.status, carregar]);

  async function excluir() {
    if (!confirm('Excluir este edital? As questões geradas para ele também serão apagadas.')) return;
    await api(`/editais/${id}`, { method: 'DELETE' });
    navegar('/painel');
  }

  if (erro) return <Aviso>{erro} <Link to="/painel" className="underline">Voltar para meus editais</Link></Aviso>;
  if (!edital) return <p className="text-grafite">Abrindo o edital…</p>;

  if (edital.status === 'processando') {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold">A Vera está lendo o seu edital</h1>
        <p className="mt-3 leading-relaxed text-grafite">
          Editais costumam ter dezenas de páginas, então isso leva de 20 segundos a um minuto.
          Pode deixar esta página aberta: ela atualiza sozinha quando terminar.
        </p>
      </div>
    );
  }

  if (edital.status === 'erro' || !edital.analise) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Não conseguimos ler esse edital</h1>
        <Aviso>{edital.mensagem_erro || 'Tente enviar o arquivo de novo.'}</Aviso>
        <p className="text-grafite">
          Esse envio não foi descontado do seu limite. Se o problema continuar, <Link to="/ajuda" className="font-medium text-tinta underline underline-offset-4">mande o arquivo para a equipe</Link> que a gente olha pessoalmente.
        </p>
        <button onClick={excluir} className="botao botao-secundario">Remover este envio</button>
      </div>
    );
  }

  const a = edital.analise;
  return (
    <article className="space-y-8">
      <header>
        <Link to="/painel" className="text-sm text-grafite hover:text-tinta">Meus editais</Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{a.titulo}</h1>
        <p className="mt-2 text-grafite">{[a.orgao, a.banca && `Banca ${a.banca}`].filter(Boolean).join(', ')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/questoes?edital=${id}`} className="botao botao-principal">Praticar questões</Link>
          <Link to={`/conversa?edital=${id}`} className="botao botao-secundario">Tirar dúvida sobre este edital</Link>
        </div>
      </header>

      <p className="leitura max-w-3xl">{a.resumo}</p>

      {a.atencao.length > 0 && (
        <aside className="max-w-3xl rounded-lg border border-grifo bg-grifo-suave p-5">
          <p className="font-semibold">Fique de olho</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
            {a.atencao.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </aside>
      )}

      <Secao titulo="Datas">
        <ul className="max-w-3xl divide-y divide-linha rounded-lg border border-linha bg-folha">
          {a.datas.map((d) => (
            <li key={d.evento + d.data} className="flex flex-wrap justify-between gap-2 px-4 py-3">
              <span className={d.importante ? 'font-medium' : 'text-grafite'}>{d.evento}</span>
              <span>{d.importante ? <mark className="grifo">{d.data}</mark> : d.data}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-grafite">As datas grifadas são as que não podem passar. Confira sempre no site da banca, porque elas podem ser alteradas por retificação.</p>
      </Secao>

      {a.cargos.length > 0 && (
        <Secao titulo="Cargos">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-grafite">
                <tr><th className="py-2 pr-4 font-medium">Cargo</th><th className="py-2 pr-4 font-medium">Vagas</th><th className="py-2 pr-4 font-medium">Remuneração</th><th className="py-2 font-medium">Escolaridade</th></tr>
              </thead>
              <tbody className="divide-y divide-linha border-t border-linha">
                {a.cargos.map((c) => (
                  <tr key={c.nome}><td className="py-2.5 pr-4 font-medium">{c.nome}</td><td className="py-2.5 pr-4">{c.vagas ?? '–'}</td><td className="py-2.5 pr-4">{c.salario ?? '–'}</td><td className="py-2.5">{c.escolaridade ?? '–'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      )}

      <Secao titulo="O que vai cair">
        <div className="grid gap-4 md:grid-cols-2">
          {a.materias.map((m) => (
            <div key={m.nome} className="flex flex-col rounded-lg border border-linha bg-folha p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold">{m.nome}</h3>
                {m.peso && <span className="text-sm text-grafite">peso {m.peso}</span>}
              </div>
              <ul className="mt-3 flex-1 space-y-1 text-sm leading-relaxed text-grafite">
                {m.topicos.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <Link to={`/questoes?edital=${id}&materia=${encodeURIComponent(m.nome)}`} className="mt-4 text-sm font-semibold underline underline-offset-4">
                Praticar {m.nome}
              </Link>
            </div>
          ))}
        </div>
      </Secao>

      {(a.requisitos.length > 0 || a.etapas.length > 0) && (
        <Secao titulo="Requisitos e etapas">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-grafite">Para se inscrever e tomar posse</h3>
              <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">{a.requisitos.map((r) => <li key={r}>{r}</li>)}</ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-grafite">Etapas do concurso</h3>
              <ol className="list-decimal space-y-1.5 pl-5 leading-relaxed">{a.etapas.map((e) => <li key={e}>{e}</li>)}</ol>
            </div>
          </div>
        </Secao>
      )}

      <Secao titulo="Procurar no texto do edital">
        <div className="max-w-3xl"><BuscaNoEdital id={id} /></div>
      </Secao>

      <footer className="border-t border-linha pt-6">
        <button onClick={excluir} className="text-sm text-grafite underline underline-offset-4 hover:text-erro">Excluir este edital</button>
      </footer>
    </article>
  );
}
