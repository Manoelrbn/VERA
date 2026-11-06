from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ia
from ..db import get_db
from ..limites import checar_questoes
from ..models import Edital, Questao, Resposta, Usuario
from ..schemas import CorrecaoOut, GerarQuestoesIn, QuestaoOut, ResponderIn
from ..seguranca import usuario_atual

router = APIRouter(tags=["questões"])


@router.post("/editais/{edital_id}/questoes", response_model=list[QuestaoOut])
def gerar(edital_id: int, pedido: GerarQuestoesIn, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    edital = db.get(Edital, edital_id)
    if not edital or edital.usuario_id != usuario.id:
        raise HTTPException(404, "Não encontramos esse edital na sua conta.")
    if edital.status != "pronto":
        raise HTTPException(409, "A Vera ainda está lendo esse edital. Assim que terminar, as questões ficam disponíveis.")
    checar_questoes(db, usuario, pedido.quantidade)

    try:
        geradas = ia.gerar_questoes(edital.analise, pedido.materia, pedido.quantidade, pedido.dificuldade)
    except Exception:
        raise HTTPException(503, "Não conseguimos montar as questões agora. Tente de novo em instantes.")
    if not geradas:
        raise HTTPException(503, "As questões saíram com problema e foram descartadas. Peça de novo, por favor.")

    novas = [
        Questao(
            edital_id=edital.id,
            materia=q.get("materia", pedido.materia),
            enunciado=q["enunciado"],
            alternativas=q["alternativas"],
            correta=q["correta"],
            explicacao=q["explicacao"],
            dificuldade=q.get("dificuldade", "media"),
        )
        for q in geradas
    ]
    db.add_all(novas)
    db.commit()
    return novas


@router.post("/questoes/{questao_id}/responder", response_model=CorrecaoOut)
def responder(questao_id: int, dados: ResponderIn, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    questao = db.get(Questao, questao_id)
    if not questao or questao.edital.usuario_id != usuario.id:
        raise HTTPException(404, "Questão não encontrada.")
    acertou = dados.escolhida.upper() == questao.correta.upper()
    db.add(Resposta(usuario_id=usuario.id, questao_id=questao.id, escolhida=dados.escolhida.upper(), acertou=acertou))
    db.commit()
    return CorrecaoOut(acertou=acertou, correta=questao.correta, explicacao=questao.explicacao)


@router.get("/desempenho")
def desempenho(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    respostas = db.scalars(select(Resposta).where(Resposta.usuario_id == usuario.id)).all()
    por_materia: dict[str, dict] = defaultdict(lambda: {"respondidas": 0, "acertos": 0})
    for r in respostas:
        m = por_materia[r.questao.materia]
        m["respondidas"] += 1
        m["acertos"] += int(r.acertou)
    materias = sorted(
        ({"materia": k, **v, "aproveitamento": round(100 * v["acertos"] / v["respondidas"])} for k, v in por_materia.items()),
        key=lambda m: m["aproveitamento"],
    )
    total = len(respostas)
    acertos = sum(r.acertou for r in respostas)
    return {
        "respondidas": total,
        "acertos": acertos,
        "aproveitamento": round(100 * acertos / total) if total else None,
        "materias": materias,  # da pior para a melhor: é onde focar
    }
