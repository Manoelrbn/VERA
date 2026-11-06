from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..limites import uso_do_usuario
from ..models import Usuario
from ..schemas import CadastroIn, LoginIn, SessaoOut, UsuarioOut
from ..seguranca import criar_token, gerar_hash, senha_confere, usuario_atual

router = APIRouter(prefix="/auth", tags=["conta"])


def _sessao(u: Usuario) -> SessaoOut:
    return SessaoOut(token=criar_token(u.id), usuario=UsuarioOut(id=u.id, nome=u.nome, email=u.email, plano=u.plano))


@router.post("/cadastro", response_model=SessaoOut, status_code=201)
def cadastro(dados: CadastroIn, db: Session = Depends(get_db)):
    email = dados.email.lower()
    if db.scalar(select(Usuario).where(Usuario.email == email)):
        raise HTTPException(409, "Já existe uma conta com esse e-mail. Quer entrar em vez de criar outra?")
    usuario = Usuario(nome=dados.nome.strip(), email=email, senha_hash=gerar_hash(dados.senha))
    db.add(usuario)
    db.commit()
    return _sessao(usuario)


@router.post("/login", response_model=SessaoOut)
def login(dados: LoginIn, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.email == dados.email.lower()))
    if not usuario or not senha_confere(dados.senha, usuario.senha_hash):
        raise HTTPException(401, "E-mail ou senha não conferem. Confira e tente de novo.")
    return _sessao(usuario)


@router.get("/eu")
def eu(usuario: Usuario = Depends(usuario_atual), db: Session = Depends(get_db)):
    return {
        "usuario": UsuarioOut(id=usuario.id, nome=usuario.nome, email=usuario.email, plano=usuario.plano),
        "uso": uso_do_usuario(db, usuario),
    }
