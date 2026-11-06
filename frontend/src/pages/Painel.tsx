import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { primeiroNome, useSessao } from '../lib/contexto';
import type { Desempenho, EditalResumo } from '../lib/tipos';
import { Aviso } from '../components/Aviso';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function EnviarEdital({ aoEnviar }: { aoEnviar: () => void }) {
  const { atualizar } = useSessao();
  const entrada = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(arquivo?: File) {
    if (!arquivo) return;
    setErro('');
    if (!arquivo.name.toLowerCase().endsWith('.pdf')) {
      setErro('Esse arquivo não é um PDF. Baixe o edital no site da banca e envie o PDF.');
      return;
    }
    setEnviando(true);
    const corpo = new FormData();
    corpo.append('arquivo', arquivo);
    try {
      await api('/editais', { method: 'POST', body: corpo });
      aoEnviar();
      atualizar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastando(false); enviar(e.dataTransfer.files[0]); }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          arrastando ? 'border-tinta bg-grifo-suave' : 'border-linha bg-folha hover:border-grafite'
        }`}
      >
        <input ref={entrada} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => enviar(e.target.files?.[0])} disabled={enviando} />
        <span className="font-semibold">{enviando ? 'Enviando o edital…' : 'Envie o PDF do edital'}</span>
        <span className="mt-1 text-sm text-grafite">Arraste o arquivo para cá ou clique para escolher</span>
      </label>
      {erro && <div className="mt-3"><Aviso>{erro}</Aviso></div>}
    </div>
  );
}

const textoStatus: Record<EditalResumo['status'], string> = {
  processando: 'A Vera está lendo…',
  pronto: 'Pronto para estudar',
  erro: 'Não foi possível ler',
};

export function Painel() {
  const { usuario, uso } = useSessao();
  const local = useLocation();
  const primeiraVez = (local.state as { primeiraVez?: boolean } | null)?.primeiraVez;
  const [editais, setEditais] = useState<EditalResumo[] | null>(null);
  const [desempenho, setDesempenho] = useState<Desempenho | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    api<EditalResumo[]>('/editais').then(setEditais).catch((e) => setErro(e.message));
    api<Desempenho>('/desempenho').then(setDesempenho).catch(() => {});
  }, []);

  useEffect(carregar, [carregar]);

  // Enquanto algum edital estiver sendo lido, confere de novo a cada 4 segundos.
  useEffect(() => {
    if (!editais?.some((e) => e.status === 'processando')) return;
    const t = setInterval(carregar, 4000);
    return () => clearInterval(t);
  }, [editais, carregar]);

  const pontoFraco = desempenho?.materias.find((m) => m.respondidas >= 5 && m.aproveitamento < 70);

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">{saudacao()}, {primeiroNome(usuario?.nome)}.</h1>
        {primeiraVez ? (
          <p className="mt-3 max-w-2xl leading-relaxed text-grafite">
            Que bom ter você aqui. O primeiro passo é enviar o edital do concurso que você vai prestar.
            A Vera lê o documento inteiro e separa o que importa. Depois disso, é só praticar.
          </p>
        ) : desempenho?.respondidas ? (
          <p className="mt-3 text-grafite">
            Você já respondeu {desempenho.respondidas} {desempenho.respondidas === 1 ? 'questão' : 'questões'} e acertou {desempenho.aproveitamento}%.
            {pontoFraco && <> Vale reforçar <span className="grifo text-tinta">{pontoFraco.materia}</span>, onde você está com {pontoFraco.aproveitamento}%.</>}
          </p>
        ) : (
          <p className="mt-3 text-grafite">Escolha um edital abaixo para continuar estudando.</p>
        )}
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Meus editais</h2>
          {erro && <Aviso>{erro}</Aviso>}
          {editais === null && !erro && <p className="text-grafite">Carregando seus editais…</p>}
          {editais?.length === 0 && (
            <p className="rounded-lg border border-linha bg-folha p-5 text-grafite">
              Nenhum edital ainda. Envie o primeiro ao lado e em menos de um minuto você vê o resumo, as datas e as matérias.
            </p>
          )}
          <ul className="space-y-3">
            {editais?.map((e) => (
              <li key={e.id}>
                <Link to={`/editais/${e.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-linha bg-folha p-4 hover:border-tinta">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.titulo}</p>
                    <p className="mt-0.5 text-sm text-grafite">Enviado em {new Date(e.criado_em).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`shrink-0 text-sm ${e.status === 'erro' ? 'text-erro' : e.status === 'pronto' ? 'text-acerto' : 'text-grafite'}`}>
                    {textoStatus[e.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <EnviarEdital aoEnviar={carregar} />
          {uso && uso.plano === 'gratis' && (
            <div className="rounded-lg border border-linha bg-folha p-5 text-sm">
              <p className="font-semibold">Seu plano: grátis</p>
              <ul className="mt-3 space-y-1.5 text-grafite">
                <li>{uso.editais_mes} de {uso.editais_limite} edital este mês</li>
                <li>{uso.questoes_mes} de {uso.questoes_limite} questões este mês</li>
                <li>{uso.mensagens_24h} de {uso.mensagens_limite} mensagens nas últimas 24 h</li>
              </ul>
              <p className="mt-4 text-grafite">No Pro, por R$ 19,90 por mês, editais e questões ficam ilimitados.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
