# Vera

Estudo para concursos públicos a partir do edital. A pessoa envia o PDF do edital e a Vera:

- resume o concurso em linguagem simples;
- separa datas (com destaque para as que não podem passar), cargos, requisitos e etapas;
- organiza o conteúdo programático por matéria;
- gera questões inéditas no estilo da banca, corrige na hora e explica cada alternativa;
- conversa com o aluno para tirar dúvidas, usando o edital como contexto.

Tem também atendimento humano (página Ajuda, com WhatsApp, e-mail e formulário) e limites por plano (grátis e Pro).

## Estrutura

```
backend/    API em Python (FastAPI): contas, editais, IA, questões, conversa e suporte
frontend/   Site em React + TypeScript + Vite + Tailwind
database/   (reservado para migrations)
docs/
```

Escolhemos um backend só, em Python, em vez de Node + Python: a leitura de PDF e a IA já são em Python,
e com uma equipe de duas pessoas, menos peças significa entregar mais rápido.

## Como rodar no seu computador

Você precisa de Python 3.11+ e Node 20+.

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # no Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # depois edite o .env
uvicorn app.main:app --reload
```

A API sobe em http://localhost:8000 e a documentação interativa fica em http://localhost:8000/docs.

**Modo demonstração:** sem `OPENAI_API_KEY` no `.env`, a Vera devolve um edital e questões de exemplo.
Dá para desenvolver o site inteiro sem gastar crédito. Com a chave preenchida, tudo passa a usar a IA de verdade.

Sem `DATABASE_URL`, o backend usa um arquivo SQLite (`vera.db`). Para produção, use Postgres.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

O site abre em http://localhost:5173.

## Onde mexer

| Quero mudar…                                     | Arquivo                                   |
|--------------------------------------------------|-------------------------------------------|
| O jeito da Vera falar e ensinar                  | `backend/app/ia.py` (`PERSONALIDADE_VERA`) |
| O que é extraído do edital                       | `backend/app/ia.py` (`PROMPT_ANALISE`)     |
| Como as questões são geradas                     | `backend/app/ia.py` (`PROMPT_QUESTOES`)    |
| Limites do plano grátis                          | `backend/app/config.py`                    |
| Cores e fontes                                   | `frontend/src/index.css`                   |
| Perguntas frequentes e textos de ajuda           | `frontend/src/pages/Ajuda.tsx`             |

## Próximos passos

- [ ] Pagamento do plano Pro (Mercado Pago ou Stripe, com Pix) e webhook que muda `usuario.plano` para `pro`
- [ ] Recuperação de senha por e-mail
- [ ] Avisar a equipe por e-mail quando chegar um contato de suporte (`backend/app/routers/suporte.py`)
- [ ] Base de leis atualizadas para a Vera citar artigos com segurança (RAG)
- [ ] Migrations com Alembic no lugar do `create_all`
- [ ] Simulado completo cronometrado, misturando matérias com os pesos do edital

## Equipe

- Manoel Bezerra
- Bernardo Milagres
