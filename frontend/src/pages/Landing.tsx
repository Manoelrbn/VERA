import { Link } from 'react-router-dom';
import { Marca } from '../components/Marca';

/** Trecho de edital fictício, grifado como um concurseiro faria. */
function FolhaDeEdital() {
  const grifo = (atraso: number) => ({ className: 'grifo grifo-animado', style: { animationDelay: `${atraso}ms` } });
  return (
    <figure className="relative rotate-[0.6deg] rounded-sm border border-linha bg-folha p-6 shadow-[0_1px_0_#D9DEE6,0_14px_30px_-18px_#16233A55] sm:p-8">
      <p className="mb-4 text-xs text-grafite">Edital nº 01/2026 · página 4 de 38</p>
      <div className="leitura space-y-3 text-[0.98rem] leading-relaxed text-tinta/85">
        <p>
          <strong className="font-medium text-tinta">4.1</strong> As inscrições serão realizadas exclusivamente pela internet, no período de{' '}
          <mark {...grifo(500)}>10 de fevereiro a 12 de março de 2026</mark>, observado o horário oficial de Brasília.
        </p>
        <p>
          <strong className="font-medium text-tinta">4.3</strong> O candidato poderá requerer isenção da taxa de inscrição{' '}
          <mark {...grifo(1000)}>somente entre 10 e 14 de fevereiro</mark>, mediante comprovação de inscrição no CadÚnico.
        </p>
        <p>
          <strong className="font-medium text-tinta">5.2</strong> A prova objetiva terá duração de 4 horas e será aplicada em{' '}
          <mark {...grifo(1500)}>26 de abril de 2026</mark>.
        </p>
      </div>
      <figcaption className="mt-6 border-t border-dashed border-linha pt-4 text-sm text-grafite">
        <span className="font-semibold text-tinta">Nota da Vera:</span> o prazo de isenção é de só 5 dias e fecha um mês antes das inscrições.
        É o item que mais gente perde.
      </figcaption>
    </figure>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Marca />
        <nav className="flex items-center gap-2 text-sm">
          <a href="#precos" className="hidden px-3 py-2 text-grafite hover:text-tinta sm:inline">Preço</a>
          <Link to="/ajuda" className="hidden px-3 py-2 text-grafite hover:text-tinta sm:inline">Ajuda</Link>
          <Link to="/entrar" className="px-3 py-2 font-medium">Entrar</Link>
          <Link to="/cadastro" className="botao botao-principal py-2">Criar conta</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Mande o edital. A Vera lê tudo e monta o seu estudo.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-grafite">
            Ela separa datas, requisitos e matérias, cria questões no estilo da sua banca e explica cada erro como uma professora explicaria.
            Funciona para qualquer concurso que tenha edital em PDF.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/cadastro" className="botao botao-principal px-6 py-3 text-base">Analisar meu edital grátis</Link>
            <span className="text-sm text-grafite">Sem cartão. O primeiro edital é por nossa conta.</span>
          </div>
        </div>
        <FolhaDeEdital />
      </section>

      <section className="border-y border-linha bg-folha">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-bold tracking-tight">Como funciona</h2>
          <ol className="mt-8 grid gap-10 md:grid-cols-3">
            {[
              ['Envie o PDF do edital', 'O mesmo arquivo que você baixou no site da banca. Em menos de um minuto a leitura fica pronta.'],
              ['Veja o que importa', 'Resumo em linguagem simples, datas com alerta, requisitos de posse e o conteúdo programático organizado por matéria.'],
              ['Pratique e tire dúvidas', 'Questões inéditas por matéria, correção na hora e uma conversa com a Vera sempre que travar em algum assunto.'],
            ].map(([titulo, texto], i) => (
              <li key={titulo} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-tinta text-sm font-semibold">{i + 1}</span>
                <div>
                  <h3 className="font-semibold">{titulo}</h3>
                  <p className="mt-2 leading-relaxed text-grafite">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Errou? A explicação vem do jeito que você entende.</h2>
          <p className="mt-4 leading-relaxed text-grafite">
            Nada de gabarito seco. A Vera mostra por que a certa está certa e onde está a pegadinha das outras.
            Se ainda ficar dúvida, você continua a conversa ali mesmo.
          </p>
        </div>
        <div className="rounded-lg border border-linha bg-folha p-6">
          <p className="text-sm text-grafite">Direito Administrativo · FGV</p>
          <p className="mt-3 font-medium leading-relaxed">
            O princípio que exige que a Administração trate todos os administrados sem favorecimentos pessoais é o da:
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="rounded-md border border-erro/40 bg-erro/5 px-3 py-2"><span className="font-semibold">E)</span> Moralidade <span className="text-erro">· sua resposta</span></li>
            <li className="rounded-md border border-acerto/40 bg-acerto/5 px-3 py-2"><span className="font-semibold">D)</span> Impessoalidade <span className="text-acerto">· correta</span></li>
          </ul>
          <p className="leitura mt-5 border-l-2 border-grifo pl-4 text-base">
            Impessoalidade é tratar todo mundo igual e agir em nome do órgão, não da pessoa do servidor. A confusão com moralidade é comum:
            moralidade fala de ética e boa-fé. Quer que eu traga mais 5 questões sobre os princípios?
          </p>
        </div>
      </section>

      <section id="precos" className="border-t border-linha bg-folha">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-2xl font-bold tracking-tight">Preço</h2>
          <p className="mt-2 text-grafite">Cancele quando quiser, direto na sua conta.</p>
          <div className="mt-10 grid max-w-3xl gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-linha p-7">
              <h3 className="font-semibold">Para conhecer</h3>
              <p className="mt-3 text-3xl font-bold">Grátis</p>
              <ul className="mt-6 space-y-3 text-grafite">
                <li>1 edital analisado por mês</li>
                <li>50 questões por mês</li>
                <li>20 mensagens por dia com a Vera</li>
              </ul>
              <Link to="/cadastro" className="botao botao-secundario mt-8 w-full">Começar grátis</Link>
            </div>
            <div className="rounded-lg border-2 border-tinta p-7">
              <h3 className="font-semibold">Vera Pro</h3>
              <p className="mt-3 text-3xl font-bold">R$ 19,90<span className="text-base font-normal text-grafite"> por mês</span></p>
              <ul className="mt-6 space-y-3 text-grafite">
                <li>Editais ilimitados</li>
                <li>Questões ilimitadas</li>
                <li>200 mensagens por dia com a Vera</li>
                <li>Atendimento prioritário pela equipe</li>
              </ul>
              <Link to="/cadastro" className="botao botao-principal mt-8 w-full">Assinar o Pro</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight">Do outro lado tem gente</h2>
          <p className="mt-4 leading-relaxed text-grafite">
            A Vera ajuda no estudo, mas a Vera é feita por duas pessoas que respondem pessoalmente quando você precisa:
            problema com pagamento, edital que não abriu, sugestão ou só uma dúvida sobre como usar.
          </p>
          <Link to="/ajuda" className="botao botao-secundario mt-6">Falar com a equipe</Link>
        </div>
      </section>

      <footer className="border-t border-linha">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-grafite">
          <Marca />
          <p>Feito por Manoel Bezerra e Bernardo Milagres.</p>
          <div className="flex gap-5">
            <Link to="/ajuda" className="hover:text-tinta">Ajuda</Link>
            <a href="#precos" className="hover:text-tinta">Preço</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
