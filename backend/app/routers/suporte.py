from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import ContatoSuporte
from ..schemas import ContatoIn
from ..seguranca import usuario_atual

router = APIRouter(prefix="/suporte", tags=["suporte"])
_bearer_opcional = HTTPBearer(auto_error=False)


@router.get("/canais")
def canais():
    return {"email": settings.suporte_email, "whatsapp": settings.suporte_whatsapp}


@router.post("/contato", status_code=201)
def contato(
    dados: ContatoIn,
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer_opcional),
    db: Session = Depends(get_db),
):
    usuario_id = None
    if cred:
        try:
            usuario_id = usuario_atual(cred, db).id
        except Exception:
            pass
    db.add(ContatoSuporte(usuario_id=usuario_id, **dados.model_dump()))
    db.commit()
    # Próximo passo: enviar um e-mail para a equipe (ex.: Resend, SendGrid) a cada contato novo.
    return {"ok": True}
