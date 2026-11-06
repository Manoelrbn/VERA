import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, json } from '../lib/api';
import { primeiroNome, useSessao } from '../lib/contexto';
import type { EditalResumo, Mensagem } from '../lib/tipos';
import { Aviso } from '../components/Aviso';

const sugestoes = [
  'Por onde eu começo a estudar para o meu edital?',
  'Me explica a diferença entre ato vinculado e discricionário',
  'Monta um cronograma para quem tem 2 horas por dia',
  'Estou desanimado com os estudos',
];

function Paragrafos({ texto }: { texto: string }) {
  return <>{texto.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line [&+&]:mt-3">{p}</p>)}</>;
}

export function Conversa() {
  const { usuario, atualizar } = useSessao();
  const [busca, setBusca] = useSearchParams();
  const [mensagens, setMensagens] = useState<Mensagem[] | null>(null);
  const [editais, setEditais] = useState<EditalResumo[]>([]);
  const [editalId, setEditalId] = useState(busca.get('edital') ?? '');
  const [texto, setTexto] = useState(busca.get('pergunta') ?? '');
  const [esperando, setEsperando] = useState(false);
  const [erro, setErro] = useState('');
  const fim = useRef<HTMLDivElement>(null);
  const contador = useRef(0);

  useEffect(() => {
    api<Mensagem[]>('/conversa').then(setMensagens).catch((e) => setErro(e.message));
    api<EditalResumo[]>('/editais').then((l) => {
      const prontos = l.filter((e) => e.status === 'pronto');
      setEditais(prontos);
      if (!busca.get('edital') && prontos[0]) setEditalId(String(prontos[0].id));
    }).catch(() => {});
    if (busca.get('pergunta')) setBusca({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [mensagens, esperando]);

  async function enviar(conteudo: string) {
    conteudo = conteudo.trim();
    if (!conteudo || esperando) return;
    setErro('');
    setTexto('');
    const provisoria: Mensagem = { id: -(++contador.current), papel: 'aluno', conteudo, criado_em: new Date().toISOString() };
    setMensagens((m) => [...(m ?? []), provisoria]);
    setEsperando(true);
    try {
      const resposta = await api<Mensagem>('/conversa', {
        method: 'POST',
        body: json({ conteudo, edital_id: editalId ? Number(editalId) : null }),
      });
      setMensagens((m) => [...(m ?? []), resposta]);
      atualizar();
    } catch (e) {
      setErro((e as Error).message);
      setTexto(conteudo);
      setMensagens((m) => (m ?? []).filter((x) => x.id !== provisoria.id));
    } finally {
      setEsperando(false);
    }
  }

  const aoEnviar = (e: FormEvent) => { e.preventDefault(); enviar(texto); };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Conversar com a Vera</h1>
        {editais.length > 0 && (
          <label className="text-sm">
            <span className="mr-2 text-grafite">Estudando para</span>
            <select value={editalId} onChange={(e) => setEditalId(e.target.value)} className="campo inline-block w-auto py-1.5 text-sm">
              <option value="">Nenhum edital específico</option>
              {editais.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mt-8 space-y-6" aria-live="polite">
        {mensagens?.length === 0 && (
          <div>
            <p className="leitura">
              Oi, {primeiroNome(usuario?.nome)}. Pode me perguntar qualquer coisa do seu edital: uma matéria que não entrou,
              uma questão que você errou, como organizar a semana. Estou aqui para isso.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {sugestoes.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="rounded-full border border-linha bg-folha px-4 py-2 text-left text-sm hover:border-tinta">{s}</button>
              ))}
            </div>
          </div>
        )}
        {mensagens?.map((m) =>
          m.papel === 'aluno' ? (
            <div key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-tinta px-4 py-3 text-white"><Paragrafos texto={m.conteudo} /></div>
          ) : (
            <div key={m.id} className="leitura max-w-[92%]">
              <p className="mb-1 font-sans text-sm font-semibold">Vera</p>
              <Paragrafos texto={m.conteudo} />
            </div>
          ),
        )}
        {esperando && <p className="text-sm text-grafite">A Vera está escrevendo…</p>}
        <div ref={fim} />
      </div>

      <form onSubmit={aoEnviar} className="sticky bottom-0 mt-8 bg-papel pb-4 pt-2">
        {erro && <div className="mb-3"><Aviso>{erro}</Aviso></div>}
        <div className="flex items-end gap-2 rounded-lg border border-linha bg-folha p-2 focus-within:border-tinta">
          <label htmlFor="mensagem" className="sr-only">Sua mensagem</label>
          <textarea
            id="mensagem"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
            rows={Math.min(6, Math.max(1, texto.split('\n').length))}
            placeholder="Escreva sua dúvida"
            className="flex-1 resize-none bg-transparent px-2 py-2 focus:outline-none"
          />
          <button className="botao botao-principal" disabled={!texto.trim() || esperando}>Enviar</button>
        </div>
        <p className="mt-2 text-xs text-grafite">A Vera pode errar, principalmente em números de artigo e leis recentes. Na dúvida, confira no texto oficial da lei.</p>
      </form>
    </div>
  );
}
