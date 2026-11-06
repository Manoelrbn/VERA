import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { api, json } from '../lib/api';
import { useSessao } from '../lib/contexto';
import type { Correcao, Desempenho, Edital, EditalResumo, Questao } from '../lib/tipos';
import { Aviso } from '../components/Aviso';

/** Endereço antigo (/editais/:id/praticar): manda para a aba Questões já com o edital escolhido. */
export function RedirecionarPraticar() {
  const { id = '' } = useParams();
  const [busca] = useSearchParams();
  const materia = busca.get('materia');
  return <Navigate replace to={`/questoes?edital=${id}${materia ? `&materia=${encodeURIComponent(materia)}` : ''}`} />;
}

function PainelDesempenho({ desempenho }: { desempenho: Desempenho | null }) {
  if (!desempenho?.respondidas) {
    return (
      <p className="rounded-lg border border-linha bg-folha p-5 text-sm leading-relaxed text-grafite">
        Seu desempenho aparece aqui depois da primeira rodada: quantas você acertou e em quais matérias vale reforçar.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-linha bg-folha p-5">
      <p className="text-3xl font-bold">{desempenho.aproveitamento}%</p>
      <p className="mt-1 text-sm text-grafite">
        de acerto em {desempenho.respondidas} {desempenho.respondidas === 1 ? 'questão' : 'questões'}
      </p>
      <ul className="mt-5 space-y-3">
        {desempenho.materias.map((m) => (
          <li key={m.materia} className="text-sm">
            <div className="flex justify-between gap-3">
              <span className="font-medium">{m.materia}</span>
              <span className="shrink-0 text-grafite">{m.acertos}/{m.respondidas}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-linha" aria-hidden="true">
              <div className={`h-1.5 rounded-full ${m.aproveitamento >= 70 ? 'bg-acerto' : m.aproveitamento >= 40 ? 'bg-tinta' : 'bg-erro'}`}
                style={{ width: `${m.aproveitamento}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-grafite">Da matéria mais fraca para a mais forte.</p>
    </div>
  );
}

type Resultado = { questao: Questao; escolhida: string; correcao: Correcao };

function comentarioFinal(acertos: number, total: number) {
  const p = acertos / total;
  if (p === 1) return 'Gabaritou. Hora de subir a dificuldade.';
  if (p >= 0.7) return 'Bom resultado. Revise as que errou e você fecha essa matéria.';
  if (p >= 0.4) return 'Está no caminho. Leia com calma as explicações das que errou, é ali que o conteúdo fixa.';
  return 'Essa matéria ainda está pesada, e tudo bem: é para isso que serve treinar. Que tal pedir para a Vera explicar a base antes da próxima rodada?';
}

export function Questoes() {
  const [busca, setBusca] = useSearchParams();
  const { atualizar } = useSessao();
  const [editais, setEditais] = useState<EditalResumo[] | null>(null);
  const [desempenho, setDesempenho] = useState<Desempenho | null>(null);
  const id = busca.get('edital') ?? '';
  const [edital, setEdital] = useState<Edital | null>(null);
  const [materia, setMateria] = useState(busca.get('materia') ?? '');
  const [quantidade, setQuantidade] = useState(5);
  const [dificuldade, setDificuldade] = useState('misturada');
  const [questoes, setQuestoes] = useState<Questao[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [escolhida, setEscolhida] = useState('');
  const [correcao, setCorrecao] = useState<Correcao | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

  const prontos = editais?.filter((e) => e.status === 'pronto') ?? [];

  useEffect(() => {
    api<EditalResumo[]>('/editais').then(setEditais).catch((e) => setErro(e.message));
  }, []);

  // Desempenho atualiza a cada rodada nova e ao terminar uma.
  const fimDaRodada = questoes !== null && indice >= questoes.length;
  useEffect(() => {
    api<Desempenho>('/desempenho').then(setDesempenho).catch(() => {});
  }, [questoes, fimDaRodada]);

  // Sem edital escolhido no endereço, abre no mais recente que já foi lido.
  useEffect(() => {
    if (!id && editais) {
      const primeiro = editais.find((e) => e.status === 'pronto');
      if (primeiro) setBusca({ edital: String(primeiro.id) }, { replace: true });
    }
  }, [id, editais, setBusca]);

  useEffect(() => {
    if (!id) return;
    api<Edital>(`/editais/${id}`).then((e) => {
      setEdital(e);
      const pedida = busca.get('materia');
      const nomes = e.analise?.materias.map((m) => m.nome) ?? [];
      setMateria(pedida && nomes.includes(pedida) ? pedida : nomes[0] ?? '');
    }).catch((e) => setErro(e.message));
  }, [id, busca]);

  function trocarEdital(novo: string) {
    setQuestoes(null);
    setEdital(null);
    setErro('');
    setBusca({ edital: novo });
  }

  async function gerar() {
    setErro('');
    setGerando(true);
    try {
      const qs = await api<Questao[]>(`/editais/${id}/questoes`, { method: 'POST', body: json({ materia, quantidade, dificuldade }) });
      setQuestoes(qs);
      setIndice(0);
      setResultados([]);
      setCorrecao(null);
      setEscolhida('');
      atualizar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  async function confirmar() {
    if (!questoes || !escolhida) return;
    try {
      const c = await api<Correcao>(`/questoes/${questoes[indice].id}/responder`, { method: 'POST', body: json({ escolhida }) });
      setCorrecao(c);
      setResultados((r) => [...r, { questao: questoes[indice], escolhida, correcao: c }]);
    } catch (e) {
      setErro((e as Error).message);
    }
  }

  function proxima() {
    setIndice((i) => i + 1);
    setEscolhida('');
    setCorrecao(null);
  }

  if (editais === null) return erro ? <Aviso>{erro}</Aviso> : <p className="text-grafite">Carregando…</p>;

  if (prontos.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Questões</h1>
        <p className="leitura mt-3">
          {editais.length
            ? 'A Vera ainda está lendo seu edital. Assim que terminar, as questões ficam disponíveis aqui.'
            : 'As questões são montadas a partir do edital do seu concurso. Envie o PDF do edital e a Vera cria questões no estilo da sua banca.'}
        </p>
        <Link to="/painel" className="botao botao-principal mt-6">{editais.length ? 'Ver meus editais' : 'Enviar meu edital'}</Link>
      </div>
    );
  }

  // 1. Escolher o que praticar
  if (!questoes) {
    return (
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold tracking-tight">Questões</h1>
        <p className="mt-2 text-grafite">
          Questões inéditas no estilo {edital?.analise?.banca ? `da ${edital.analise.banca}` : 'da sua banca'}, com explicação de cada alternativa.
        </p>
        <div className="mt-8 space-y-6">
          {prontos.length > 1 ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Concurso</span>
              <select className="campo" value={id} onChange={(e) => trocarEdital(e.target.value)}>
                {prontos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}
              </select>
            </label>
          ) : (
            <div>
              <span className="mb-1.5 block text-sm font-medium">Concurso</span>
              <p className="font-medium">{prontos[0].titulo}</p>
            </div>
          )}
          {!edital ? <p className="text-grafite">Carregando as matérias…</p> : (<>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Matéria</span>
            <select className="campo" value={materia} onChange={(e) => setMateria(e.target.value)}>
              {edital.analise?.materias.map((m) => <option key={m.nome}>{m.nome}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Quantas questões</legend>
            <div className="flex gap-2">
              {[5, 10, 15].map((n) => (
                <button key={n} type="button" onClick={() => setQuantidade(n)} aria-pressed={quantidade === n}
                  className={`botao ${quantidade === n ? 'botao-principal' : 'botao-secundario'}`}>{n}</button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Dificuldade</span>
            <select className="campo" value={dificuldade} onChange={(e) => setDificuldade(e.target.value)}>
              <option value="misturada">Misturada, como na prova</option>
              <option value="facil">Fácil, para revisar a base</option>
              <option value="dificil">Difícil, para quem já domina</option>
            </select>
          </label>
          {erro && <Aviso>{erro}</Aviso>}
          <button onClick={gerar} disabled={gerando || !materia} className="botao botao-principal">
            {gerando ? 'Montando suas questões…' : 'Começar'}
          </button>
          {gerando && <p className="text-sm text-grafite">Isso pode levar até um minuto. A Vera está escrevendo questões novas para você.</p>}
          </>)}
        </div>
      </div>
      <aside>
        <h2 className="mb-4 text-lg font-semibold">Seu desempenho</h2>
        <PainelDesempenho desempenho={desempenho} />
      </aside>
      </div>
    );
  }

  // 3. Fim da rodada
  if (indice >= questoes.length) {
    const acertos = resultados.filter((r) => r.correcao.acertou).length;
    const erradas = resultados.filter((r) => !r.correcao.acertou);
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Você acertou {acertos} de {questoes.length}</h1>
        <p className="leitura mt-3">{comentarioFinal(acertos, questoes.length)}</p>
        {erradas.length > 0 && (
          <div className="mt-8">
            <h2 className="font-semibold">Para revisar</h2>
            <ul className="mt-3 space-y-3">
              {erradas.map((r) => (
                <li key={r.questao.id} className="rounded-lg border border-linha bg-folha p-4 text-sm">
                  <p className="font-medium">{r.questao.enunciado}</p>
                  <p className="mt-2 text-grafite">Você marcou {r.escolhida}. A correta é {r.correcao.correta}.</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={gerar} className="botao botao-principal" disabled={gerando}>{gerando ? 'Montando…' : 'Fazer outra rodada'}</button>
          <button onClick={() => setQuestoes(null)} className="botao botao-secundario">Trocar de matéria</button>
        </div>
      </div>
    );
  }

  // 2. Respondendo
  const q = questoes[indice];
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between text-sm text-grafite">
        <span>{q.materia}</span>
        <span>Questão {indice + 1} de {questoes.length}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-linha" aria-hidden="true">
        <div className="h-1 rounded-full bg-tinta transition-[width]" style={{ width: `${(indice / questoes.length) * 100}%` }} />
      </div>

      <p className="leitura mt-8">{q.enunciado}</p>

      <fieldset className="mt-6 space-y-2" disabled={!!correcao}>
        <legend className="sr-only">Alternativas</legend>
        {q.alternativas.map((alt) => {
          const certa = correcao && alt.letra === correcao.correta;
          const errada = correcao && alt.letra === escolhida && !correcao.acertou;
          const estilo = certa ? 'border-acerto bg-acerto/5'
            : errada ? 'border-erro bg-erro/5'
            : escolhida === alt.letra ? 'border-tinta bg-folha'
            : 'border-linha bg-folha hover:border-grafite';
          return (
            <label key={alt.letra} className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 leading-relaxed ${estilo}`}>
              <input type="radio" name="alternativa" value={alt.letra} checked={escolhida === alt.letra} onChange={() => setEscolhida(alt.letra)} className="mt-1.5 accent-tinta" />
              <span><span className="font-semibold">{alt.letra})</span> {alt.texto}</span>
            </label>
          );
        })}
      </fieldset>

      {erro && <div className="mt-4"><Aviso>{erro}</Aviso></div>}

      {!correcao ? (
        <button onClick={confirmar} disabled={!escolhida} className="botao botao-principal mt-6">Confirmar resposta</button>
      ) : (
        <div className="mt-6">
          <p className={`font-semibold ${correcao.acertou ? 'text-acerto' : 'text-erro'}`}>
            {correcao.acertou ? 'Isso mesmo.' : `Não foi dessa vez. A correta é a ${correcao.correta}.`}
          </p>
          <p className="leitura mt-3 border-l-2 border-grifo pl-4">{correcao.explicacao}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button onClick={proxima} className="botao botao-principal">{indice + 1 < questoes.length ? 'Próxima questão' : 'Ver resultado'}</button>
            <Link
              to={`/conversa?edital=${id}&pergunta=${encodeURIComponent(`Não entendi esta questão: "${q.enunciado}" A correta é ${correcao.correta}. Pode me explicar de outro jeito?`)}`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Ainda ficou dúvida? Pergunte à Vera
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
