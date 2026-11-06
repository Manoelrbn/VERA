from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .models import Edital, Mensagem, Questao, Usuario


def _inicio_do_mes() -> datetime:
    agora = datetime.now(timezone.utc)
    return agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _contar(db: Session, consulta) -> int:
    return db.scalar(consulta) or 0


def uso_do_usuario(db: Session, usuario: Usuario) -> dict:
    mes = _inicio_do_mes()
    dia = datetime.now(timezone.utc) - timedelta(days=1)
    editais = _contar(db, select(func.count(Edital.id)).where(Edital.usuario_id == usuario.id, Edital.criado_em >= mes, Edital.status != "erro"))
    questoes = _contar(
        db,
        select(func.count(Questao.id)).join(Edital).where(Edital.usuario_id == usuario.id, Questao.criado_em >= mes),
    )
    mensagens = _contar(
        db,
        select(func.count(Mensagem.id)).where(
            Mensagem.usuario_id == usuario.id, Mensagem.papel == "aluno", Mensagem.criado_em >= dia
        ),
    )
    pro = usuario.plano == "pro"
    return {
        "plano": usuario.plano,
        "editais_mes": editais,
        "editais_limite": None if pro else settings.gratis_editais_mes,
        "questoes_mes": questoes,
        "questoes_limite": None if pro else settings.gratis_questoes_mes,
        "mensagens_24h": mensagens,
        "mensagens_limite": settings.pro_mensagens_dia if pro else settings.gratis_mensagens_dia,
    }


def exigir(disponivel: bool, mensagem: str):
    if not disponivel:
        raise HTTPException(402, mensagem)


def checar_edital(db: Session, usuario: Usuario):
    u = uso_do_usuario(db, usuario)
    exigir(
        u["editais_limite"] is None or u["editais_mes"] < u["editais_limite"],
        "Você já analisou o edital do mês no plano gratuito. No Pro você analisa quantos quiser.",
    )


def checar_questoes(db: Session, usuario: Usuario, quantidade: int):
    u = uso_do_usuario(db, usuario)
    exigir(
        u["questoes_limite"] is None or u["questoes_mes"] + quantidade <= u["questoes_limite"],
        f"Você chegou perto do limite de {u['questoes_limite']} questões do mês no plano gratuito. "
        "No Pro as questões são ilimitadas.",
    )


def checar_mensagens(db: Session, usuario: Usuario):
    u = uso_do_usuario(db, usuario)
    exigir(
        u["mensagens_24h"] < u["mensagens_limite"],
        "Você conversou bastante com a Vera hoje. O limite renova em 24 horas. "
        "Que tal usar esse tempo para resolver questões?",
    )
