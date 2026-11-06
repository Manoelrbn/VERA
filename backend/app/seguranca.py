from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Usuario

_bearer = HTTPBearer(auto_error=False)


def gerar_hash(senha: str) -> str:
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def senha_confere(senha: str, hash_: str) -> bool:
    return bcrypt.checkpw(senha.encode(), hash_.encode())


def criar_token(usuario_id: int) -> str:
    expira = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_horas_validade)
    return jwt.encode({"sub": str(usuario_id), "exp": expira}, settings.jwt_secret, algorithm="HS256")


def usuario_atual(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    erro = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Sua sessão terminou. Entre de novo para continuar de onde parou.",
    )
    if not cred:
        raise erro
    try:
        dados = jwt.decode(cred.credentials, settings.jwt_secret, algorithms=["HS256"])
        usuario = db.get(Usuario, int(dados["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise erro
    if not usuario:
        raise erro
    return usuario
