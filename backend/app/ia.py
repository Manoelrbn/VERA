"""Tudo que conversa com o modelo de linguagem fica aqui.

Sem OPENAI_API_KEY, as funções devolvem respostas de exemplo (modo demonstração),
para que o frontend possa ser desenvolvido sem gastar crédito de API.
"""
import json

from openai import OpenAI

from .config import settings

_cliente = OpenAI(api_key=settings.openai_api_key) if not settings.modo_demo else None


# ---------------------------------------------------------------------------
# Quem é a Vera. Este texto define o tom de tudo que o aluno lê.
# ---------------------------------------------------------------------------
PERSONALIDADE_VERA = """\
Você é a Vera, mentora de estudos para concursos públicos no Brasil.

Como você fala:
- Como uma professora experiente que já foi concurseira: direta, calorosa, sem formalidade de repartição.
- Português do Brasil, frases curtas, parágrafos de no máximo 3 linhas.
- Trate o aluno por "você". Use o primeiro nome dele de vez em quando, não em toda mensagem.
- Nada de "Como uma inteligência artificial", "Ótima pergunta!", "Espero ter ajudado" ou "Claro! Aqui está".
  Vá direto ao ponto, como alguém que está do lado da pessoa estudando junto.
- No máximo um emoji por mensagem, e só quando combinar. Na maioria das vezes, nenhum.
- Evite listas longas. Se precisar listar, no máximo 4 itens.
- Termine com um próximo passo concreto quando fizer sentido ("Quer que eu monte 5 questões disso?").

Como você ensina:
- Explique o porquê, não só a resposta. Use exemplos do dia a dia do serviço público.
- Quando citar lei, diga o artigo. Se não tiver certeza do número exato ou se a lei pode ter mudado,
  diga isso abertamente e oriente a conferir no texto oficial (planalto.gov.br). Nunca invente artigo, súmula ou número.
- Se a pergunta fugir de estudos e concursos, responda brevemente com gentileza e traga a conversa de volta.

Como você cuida:
- Concurso é longo e cansa. Se o aluno demonstrar desânimo, ansiedade ou cansaço, acolha primeiro
  e só depois fale de estudo. Não minimize ("é só se esforçar") e não exagere.
- Se a pessoa falar em se machucar ou em não querer mais viver, pare o assunto de estudos,
  responda com cuidado e indique o CVV (ligue 188, gratuito, 24h) e o atendimento de emergência (192).
- Se o aluno tiver problema com pagamento, conta ou algo que você não consegue resolver,
  diga que a equipe humana resolve e indique a página Ajuda do site.
"""

PROMPT_ANALISE = """\
Você recebe o texto de um edital de concurso público brasileiro. Extraia as informações
e responda SOMENTE com um JSON válido, sem markdown, neste formato:

{
  "titulo": "nome curto do concurso, ex: TRT-3 2026 - Técnico Judiciário",
  "orgao": "órgão",
  "banca": "banca organizadora ou null",
  "resumo": "3 a 5 frases em linguagem simples, como se explicasse para um amigo o que é esse concurso",
  "cargos": [{"nome": "...", "vagas": "texto como aparece, ex: 12 + CR", "salario": "R$ ... ou null", "escolaridade": "..."}],
  "datas": [{"evento": "Inscrições", "data": "texto da data como no edital", "importante": true}],
  "requisitos": ["requisitos para tomar posse ou se inscrever, em frases curtas"],
  "etapas": ["Prova objetiva", "Prova discursiva", "..."],
  "materias": [{"nome": "Língua Portuguesa", "topicos": ["Interpretação de texto", "..."], "peso": "texto ou null"}],
  "atencao": ["pontos que o candidato costuma perder: taxa, isenção, documentos, prazos curtos"]
}

Regras:
- Use só o que está no edital. Se algo não aparece, use null ou lista vazia. Não invente.
- Em "datas", marque importante=true para inscrição, pagamento, isenção e dia da prova.
- Em "materias", mantenha os tópicos fiéis ao conteúdo programático, resumindo títulos muito longos.
"""

PROMPT_QUESTOES = """\
Crie {qtd} questões inéditas de múltipla escolha para o concurso abaixo, no estilo da banca {banca}.

Concurso: {titulo}
Matéria: {materia}
Tópicos do edital: {topicos}
Dificuldade desejada: {dificuldade}

Responda SOMENTE com JSON válido, sem markdown:
{{"questoes": [{{
  "materia": "{materia}",
  "enunciado": "...",
  "alternativas": [{{"letra": "A", "texto": "..."}}, {{"letra": "B", "texto": "..."}}, {{"letra": "C", "texto": "..."}}, {{"letra": "D", "texto": "..."}}, {{"letra": "E", "texto": "..."}}],
  "correta": "C",
  "explicacao": "Explique em 3 a 6 frases por que a correta está certa e onde estão as pegadinhas das outras. Tom de professora, sem formalidade.",
  "dificuldade": "facil|media|dificil"
}}]}}

Regras:
- Se a banca usa certo/errado (Cebraspe), use só duas alternativas: A = Certo, B = Errado.
- Distribua a letra correta entre as alternativas, sem padrão.
- Não cite número de artigo, súmula ou lei se não tiver certeza absoluta dele.
- Distratores plausíveis, do tipo que realmente confunde candidatos.
"""


def _json(modelo: str, sistema: str, usuario: str) -> dict:
    resposta = _cliente.chat.completions.create(
        model=modelo,
        response_format={"type": "json_object"},
        temperature=0.4,
        messages=[{"role": "system", "content": sistema}, {"role": "user", "content": usuario}],
    )
    return json.loads(resposta.choices[0].message.content)


def analisar_edital(texto: str) -> dict:
    if settings.modo_demo:
        return _DEMO_ANALISE
    return _json(settings.openai_modelo_principal, PROMPT_ANALISE, texto)


def gerar_questoes(analise: dict, materia: str, qtd: int = 10, dificuldade: str = "misturada") -> list[dict]:
    if settings.modo_demo:
        return [dict(q, materia=materia) for q in _DEMO_QUESTOES][:qtd]

    topicos = next((m.get("topicos", []) for m in analise.get("materias", []) if m.get("nome") == materia), [])
    prompt = PROMPT_QUESTOES.format(
        qtd=qtd,
        banca=analise.get("banca") or "mais comum para esse tipo de cargo",
        titulo=analise.get("titulo", ""),
        materia=materia,
        topicos="; ".join(topicos) or "conteúdo geral da matéria",
        dificuldade=dificuldade,
    )
    dados = _json(settings.openai_modelo_rapido, "Você é uma professora que elabora questões de concurso.", prompt)
    return _validar_questoes(dados.get("questoes", []))


def _validar_questoes(questoes: list[dict]) -> list[dict]:
    """O modelo às vezes devolve questão incompleta. Descartamos em vez de mostrar algo quebrado."""
    validas = []
    for q in questoes:
        letras = [a.get("letra") for a in q.get("alternativas", [])]
        if q.get("enunciado") and q.get("explicacao") and len(letras) >= 2 and q.get("correta") in letras:
            validas.append(q)
    return validas


def conversar(nome_aluno: str, historico: list[dict], contexto_edital: dict | None) -> str:
    if settings.modo_demo:
        primeiro = nome_aluno.split()[0]
        return (
            f"Oi, {primeiro}. Estou em modo demonstração agora, então ainda não consigo responder de verdade. "
            "Assim que a chave da API for configurada no backend, eu converso com você sobre qualquer matéria do seu edital."
        )

    sistema = PERSONALIDADE_VERA + f"\nO nome do aluno é {nome_aluno}."
    if contexto_edital:
        resumo = {k: contexto_edital.get(k) for k in ("titulo", "banca", "cargos", "etapas", "materias", "datas")}
        sistema += (
            "\n\nO aluno está estudando para este concurso. Use isso para dar exemplos e prioridades:\n"
            + json.dumps(resumo, ensure_ascii=False)
        )

    mensagens = [{"role": "system", "content": sistema}]
    for m in historico[-20:]:  # últimas 20 mensagens bastam e controlam o custo
        mensagens.append({"role": "user" if m["papel"] == "aluno" else "assistant", "content": m["conteudo"]})

    resposta = _cliente.chat.completions.create(
        model=settings.openai_modelo_principal, temperature=0.7, messages=mensagens
    )
    return resposta.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# Dados do modo demonstração
# ---------------------------------------------------------------------------
_DEMO_ANALISE = {
    "titulo": "Concurso de demonstração - Técnico Administrativo",
    "orgao": "Prefeitura de Exemplo",
    "banca": "FGV",
    "resumo": (
        "Este é um edital de exemplo, usado enquanto a chave da API não está configurada. "
        "São vagas de nível médio para trabalhar na área administrativa da prefeitura. "
        "A prova é objetiva, com português, raciocínio lógico e conhecimentos específicos."
    ),
    "cargos": [{"nome": "Técnico Administrativo", "vagas": "15 + CR", "salario": "R$ 3.850,00", "escolaridade": "Nível médio"}],
    "datas": [
        {"evento": "Inscrições", "data": "10/02 a 12/03", "importante": True},
        {"evento": "Pedido de isenção da taxa", "data": "10/02 a 14/02", "importante": True},
        {"evento": "Prova objetiva", "data": "26/04", "importante": True},
        {"evento": "Resultado final", "data": "previsto para junho", "importante": False},
    ],
    "requisitos": ["Ensino médio completo", "Ter 18 anos na data da posse", "Estar em dia com obrigações eleitorais"],
    "etapas": ["Prova objetiva"],
    "materias": [
        {"nome": "Língua Portuguesa", "topicos": ["Interpretação de texto", "Concordância", "Crase"], "peso": "2"},
        {"nome": "Raciocínio Lógico", "topicos": ["Proposições", "Porcentagem"], "peso": "1"},
        {"nome": "Direito Administrativo", "topicos": ["Princípios", "Atos administrativos"], "peso": "2"},
    ],
    "atencao": ["O prazo de isenção é de só 5 dias, bem antes do fim das inscrições."],
}

_DEMO_QUESTOES = [
    {
        "enunciado": "Assinale a alternativa em que o uso do sinal indicativo de crase está correto.",
        "alternativas": [
            {"letra": "A", "texto": "Entreguei o documento à ele."},
            {"letra": "B", "texto": "Fomos à reunião da secretaria."},
            {"letra": "C", "texto": "Começou à chover cedo."},
            {"letra": "D", "texto": "Fiquei frente à frente com o diretor."},
            {"letra": "E", "texto": "Refiro-me à esta proposta."},
        ],
        "correta": "B",
        "explicacao": (
            "Quem vai, vai a algum lugar, e reunião é palavra feminina que aceita artigo: a + a = à. "
            "Nas outras, não tem crase antes de pronome pessoal (ele), de verbo (chover), em expressão com palavra repetida "
            "(frente a frente) nem antes de pronome demonstrativo como 'esta'."
        ),
        "dificuldade": "facil",
    },
    {
        "enunciado": "O princípio que exige que a Administração trate todos os administrados sem favorecimentos pessoais é o da:",
        "alternativas": [
            {"letra": "A", "texto": "Legalidade"},
            {"letra": "B", "texto": "Publicidade"},
            {"letra": "C", "texto": "Eficiência"},
            {"letra": "D", "texto": "Impessoalidade"},
            {"letra": "E", "texto": "Moralidade"},
        ],
        "correta": "D",
        "explicacao": (
            "Impessoalidade é tratar todo mundo igual e agir em nome do órgão, não da pessoa do servidor. "
            "A pegadinha comum é confundir com moralidade, que fala de ética e boa-fé. "
            "Os cinco princípios do caput do art. 37 da Constituição formam o famoso LIMPE."
        ),
        "dificuldade": "facil",
    },
]
