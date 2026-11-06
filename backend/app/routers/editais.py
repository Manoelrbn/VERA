import logging

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import ia
from ..config import settings
from ..db import SessionLocal, get_db
from ..limites import checar_edital
from ..models import Edital, Usuario
from ..pdf import PdfIlegivel, extrair_texto, recortar_para_analise
from ..schemas import EditalOut, EditalResumo
from ..seguranca import usuario_atual

log = logging.getLogger("vera")
router = APIRouter(prefix="/editais", tags=["editais"])


def _processar(edital_id: int, conteudo: bytes):
    """Roda em segundo plano: a análise pode levar de 20 s a 1 min."""
    db = SessionLocal()
    edital = db.get(Edital, edital_id)
    try:
        edital.texto = extrair_texto(conteudo)
        analise = ia.analisar_edital(recortar_para_analise(edital.texto))
        edital.analise = analise
        edital.titulo = analise.get("titulo") or edital.nome_arquivo
        edital.status = "pronto"
    except PdfIlegivel as e:
        edital.status, edital.mensagem_erro = "erro", str(e)
    except Exception:
        log.exception("Falha ao analisar edital %s", edital_id)
        edital.status = "erro"
        edital.mensagem_erro = (
            "Algo deu errado do nosso lado ao ler esse edital. Tente enviar de novo daqui a pouco. "
            "Se continuar, fale com a gente na página Ajuda que a equipe resolve."
        )
    db.commit()
    db.close()


def _do_usuario(db: Session, edital_id: int, usuario: Usuario) -> Edital:
    edital = db.get(Edital, edital_id)
    if not edital or edital.usuario_id != usuario.id:
        raise HTTPException(404, "Não encontramos esse edital na sua conta.")
    return edital


@router.post("", response_model=EditalResumo, status_code=202)
async def enviar(
    tarefas: BackgroundTasks,
    arquivo: UploadFile = File(...),
    usuario: Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    if not (arquivo.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Envie o edital em PDF. É o formato que as bancas publicam.")
    checar_edital(db, usuario)

    conteudo = await arquivo.read()
    if len(conteudo) > settings.tamanho_max_pdf_mb * 1024 * 1024:
        raise HTTPException(413, f"Esse arquivo passa de {settings.tamanho_max_pdf_mb} MB. Confira se é mesmo o edital.")

    edital = Edital(usuario_id=usuario.id, nome_arquivo=arquivo.filename, titulo=arquivo.filename)
    db.add(edital)
    db.commit()
    tarefas.add_task(_processar, edital.id, conteudo)
    return edital


@router.get("", response_model=list[EditalResumo])
def listar(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return db.scalars(select(Edital).where(Edital.usuario_id == usuario.id).order_by(Edital.criado_em.desc())).all()


@router.get("/{edital_id}", response_model=EditalOut)
def detalhe(edital_id: int, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return _do_usuario(db, edital_id, usuario)


@router.get("/{edital_id}/busca")
def buscar(edital_id: int, termo: str, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    """Busca por palavra no texto original, devolvendo trechos ao redor."""
    edital = _do_usuario(db, edital_id, usuario)
    termo = termo.strip()
    if len(termo) < 3:
        return {"trechos": []}
    texto, baixo, achados, pos = edital.texto, edital.texto.lower(), [], 0
    while len(achados) < 30:
        i = baixo.find(termo.lower(), pos)
        if i == -1:
            break
        ini, fim = max(0, i - 160), min(len(texto), i + len(termo) + 160)
        achados.append({"antes": texto[ini:i], "termo": texto[i:i + len(termo)], "depois": texto[i + len(termo):fim]})
        pos = i + len(termo)
    return {"trechos": achados}


@router.delete("/{edital_id}", status_code=204)
def excluir(edital_id: int, usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    db.delete(_do_usuario(db, edital_id, usuario))
    db.commit()
