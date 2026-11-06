import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .config import settings
from .db import Base, engine
from .routers import auth, conversa, editais, questoes, suporte

logging.basicConfig(level=logging.INFO)

# Cria as tabelas na primeira execução. Quando o projeto crescer, troque por migrations (Alembic).
Base.metadata.create_all(engine)


def _adicionar_colunas_novas() -> None:
    """O create_all não mexe em tabela que já existe. Até termos Alembic, as colunas novas entram aqui."""
    colunas = {c["name"] for c in inspect(engine).get_columns("usuarios")}
    if "cpf" not in colunas:
        with engine.begin() as con:
            con.execute(text("ALTER TABLE usuarios ADD COLUMN cpf VARCHAR(11)"))
            con.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_cpf ON usuarios (cpf)"))


_adicionar_colunas_novas()

app = FastAPI(title="Vera API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    # Em desenvolvimento o Vite pode abrir como localhost ou 127.0.0.1.
    allow_origins=list({settings.frontend_url, "http://localhost:5173", "http://127.0.0.1:5173"}),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, editais, questoes, conversa, suporte):
    app.include_router(r.router)


@app.get("/saude")
def saude():
    return {"ok": True, "modo_demo": settings.modo_demo}
