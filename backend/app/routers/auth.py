import hashlib
import hmac
import logging
import secrets
from datetime import datetime, timedelta, timezone

from email_validator import EmailNotValidError, EmailUndeliverableError, validate_email
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..correio import enviar_codigo_cadastro
from ..cpf import cpf_valido, so_digitos
from ..db import get_db
from ..limites import uso_do_usuario
from ..models import CadastroPendente, Usuario
from ..schemas import (
    CadastroIn,
    CadastroIniciadoOut,
    ConfirmarCadastroIn,
    LoginIn,
    ReenviarCodigoIn,
    SessaoOut,
    UsuarioOut,
)
from ..seguranca import criar_token, gerar_hash, senha_confere, usuario_atual

router = APIRouter(prefix="/auth", tags=["conta"])
log = logging.getLogger("vera.auth")

MSG_EMAIL_EM_USO = "Já existe uma conta com esse e-mail. Quer entrar em vez de criar outra?"
MSG_CPF_EM_USO = "Já existe uma conta com esse CPF. Se for sua, entre com o e-mail que você usou, ou fale com a equipe na página Ajuda."


def _sessao(u: Usuario) -> SessaoOut:
    return SessaoOut(token=criar_token(u.id), usuario=UsuarioOut(id=u.id, nome=u.nome, email=u.email, plano=u.plano))


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _utc(d: datetime) -> datetime:
    # O SQLite devolve datas sem fuso; tudo aqui é gravado em UTC.
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _hash_codigo(email: str, codigo: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), f"{email}:{codigo}".encode(), hashlib.sha256).hexdigest()


def _novo_codigo() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _conferir_email_existe(email: str) -> None:
    """Confere se o domínio do e-mail recebe mensagens (pega erros como gmial.com).

    Se a consulta de DNS falhar por falta de rede, deixamos passar: o código por e-mail
    é a verificação definitiva.
    """
    try:
        validate_email(email, check_deliverability=True)
    except EmailUndeliverableError:
        dominio = email.rsplit("@", 1)[-1]
        raise HTTPException(422, f"O endereço \"{dominio}\" não recebe e-mails. Confira se digitou o e-mail certinho.")
    except EmailNotValidError:
        raise HTTPException(422, "Esse e-mail não parece válido. Confira se digitou certinho.")
    except Exception:  # DNS fora do ar, timeout etc.
        log.warning("Não deu para checar o domínio de %s; seguindo com o envio do código.", email)


def _enviar_codigo(pendente: CadastroPendente, db: Session) -> None:
    codigo = _novo_codigo()
    pendente.codigo_hash = _hash_codigo(pendente.email, codigo)
    pendente.tentativas = 0
    pendente.enviado_em = _agora()
    pendente.expira_em = _agora() + timedelta(minutes=settings.codigo_validade_minutos)
    try:
        enviar_codigo_cadastro(pendente.email, pendente.nome, codigo)
    except Exception:
        db.rollback()
        log.exception("Falha ao enviar código para %s", pendente.email)
        raise HTTPException(503, "Não conseguimos enviar o e-mail com o código agora. Tente de novo em instantes.")
    db.commit()


def _iniciado(p: CadastroPendente) -> CadastroIniciadoOut:
    return CadastroIniciadoOut(
        email=p.email,
        validade_minutos=settings.codigo_validade_minutos,
        reenviar_em_segundos=settings.codigo_intervalo_reenvio_segundos,
    )


@router.post("/cadastro", response_model=CadastroIniciadoOut, status_code=202)
def iniciar_cadastro(dados: CadastroIn, db: Session = Depends(get_db)):
    """Etapa 1: confere os dados e manda um código de 6 dígitos para o e-mail."""
    email = dados.email.lower()
    cpf = so_digitos(dados.cpf)

    if dados.senha != dados.senha_confirmacao:
        raise HTTPException(422, "As duas senhas não estão iguais. Digite de novo, com calma.")
    if not cpf_valido(cpf):
        raise HTTPException(422, "Esse CPF não é válido. Confira os números.")
    if db.scalar(select(Usuario.id).where(Usuario.email == email)):
        raise HTTPException(409, MSG_EMAIL_EM_USO)
    if db.scalar(select(Usuario.id).where(Usuario.cpf == cpf)):
        raise HTTPException(409, MSG_CPF_EM_USO)
    _conferir_email_existe(email)

    pendente = db.scalar(select(CadastroPendente).where(CadastroPendente.email == email))
    if pendente:
        espera = settings.codigo_intervalo_reenvio_segundos - (_agora() - _utc(pendente.enviado_em)).total_seconds()
        if espera > 0:
            raise HTTPException(429, f"Acabamos de mandar um código para esse e-mail. Espere {int(espera) + 1} segundos para pedir outro.")
    else:
        pendente = CadastroPendente(email=email)
        db.add(pendente)
    pendente.nome = dados.nome.strip()
    pendente.cpf = cpf
    pendente.senha_hash = gerar_hash(dados.senha)
    _enviar_codigo(pendente, db)
    return _iniciado(pendente)


@router.post("/cadastro/reenviar", response_model=CadastroIniciadoOut, status_code=202)
def reenviar_codigo(dados: ReenviarCodigoIn, db: Session = Depends(get_db)):
    email = dados.email.lower()
    pendente = db.scalar(select(CadastroPendente).where(CadastroPendente.email == email))
    if not pendente:
        raise HTTPException(404, "Não achamos um cadastro em andamento com esse e-mail. Preencha o cadastro de novo.")
    espera = settings.codigo_intervalo_reenvio_segundos - (_agora() - _utc(pendente.enviado_em)).total_seconds()
    if espera > 0:
        raise HTTPException(429, f"Espere {int(espera) + 1} segundos para pedir outro código.")
    _enviar_codigo(pendente, db)
    return _iniciado(pendente)


@router.post("/cadastro/confirmar", response_model=SessaoOut, status_code=201)
def confirmar_cadastro(dados: ConfirmarCadastroIn, db: Session = Depends(get_db)):
    """Etapa 2: confere o código e só então cria a conta."""
    email = dados.email.lower()
    pendente = db.scalar(select(CadastroPendente).where(CadastroPendente.email == email))
    if not pendente:
        raise HTTPException(404, "Não achamos um cadastro em andamento com esse e-mail. Preencha o cadastro de novo.")
    if _agora() > _utc(pendente.expira_em):
        raise HTTPException(410, "Esse código expirou. Peça um novo.")
    if pendente.tentativas >= settings.codigo_max_tentativas:
        raise HTTPException(429, "Muitas tentativas com código errado. Peça um novo código.")

    if not hmac.compare_digest(pendente.codigo_hash, _hash_codigo(email, dados.codigo)):
        pendente.tentativas += 1
        db.commit()
        restam = settings.codigo_max_tentativas - pendente.tentativas
        if restam <= 0:
            raise HTTPException(429, "Muitas tentativas com código errado. Peça um novo código.")
        raise HTTPException(422, f"Código errado. Você ainda tem {restam} {'tentativa' if restam == 1 else 'tentativas'}.")

    usuario = Usuario(nome=pendente.nome, email=email, cpf=pendente.cpf, senha_hash=pendente.senha_hash)
    db.add(usuario)
    db.execute(delete(CadastroPendente).where(CadastroPendente.id == pendente.id))
    try:
        db.commit()
    except IntegrityError:
        # Alguém confirmou o mesmo e-mail ou CPF entre a etapa 1 e agora.
        db.rollback()
        if db.scalar(select(Usuario.id).where(Usuario.email == email)):
            raise HTTPException(409, MSG_EMAIL_EM_USO)
        raise HTTPException(409, MSG_CPF_EM_USO)
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
