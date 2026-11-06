from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ia
from ..db import get_db
from ..limites import checar_mensagens
from ..models import Edital, Mensagem, Usuario
from ..schemas import MensagemIn, MensagemOut
from ..seguranca import usuario_atual

router = APIRouter(prefix="/conversa", tags=["conversa com a Vera"])


@router.get("", response_model=list[MensagemOut])
def historico(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    consulta = select(Mensagem).where(Mensagem.usuario_id == usuario.id).order_by(Mensagem.id.desc()).limit(100)
    return list(reversed(db.scalars(consulta).all()))


@router.post("", response_model=MensagemOut)
def enviar(dados: MensagemIn, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    checar_mensagens(db, usuario)

    contexto = None
    if dados.edital_id:
        edital = db.get(Edital, dados.edital_id)
        if edital and edital.usuario_id == usuario.id and edital.analise:
            contexto = edital.analise

    db.add(Mensagem(usuario_id=usuario.id, edital_id=dados.edital_id, papel="aluno", conteudo=dados.conteudo.strip()))
    db.commit()

    anteriores = db.scalars(
        select(Mensagem).where(Mensagem.usuario_id == usuario.id).order_by(Mensagem.id.desc()).limit(20)
    ).all()
    historico_ = [{"papel": m.papel, "conteudo": m.conteudo} for m in reversed(anteriores)]

    try:
        texto = ia.conversar(usuario.nome, historico_, contexto)
    except Exception:
        raise HTTPException(503, "A Vera não conseguiu responder agora. Sua mensagem ficou salva; tente reenviar em instantes.")

    resposta = Mensagem(usuario_id=usuario.id, edital_id=dados.edital_id, papel="vera", conteudo=texto)
    db.add(resposta)
    db.commit()
    return resposta
