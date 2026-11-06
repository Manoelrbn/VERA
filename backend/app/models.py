from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def agora() -> datetime:
    return datetime.now(timezone.utc)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    # Só dígitos. Pode ser nulo em contas criadas antes de o CPF passar a ser pedido.
    cpf: Mapped[str | None] = mapped_column(String(11), unique=True, index=True, nullable=True)
    senha_hash: Mapped[str] = mapped_column(String(200))
    plano: Mapped[str] = mapped_column(String(20), default="gratis")  # gratis | pro
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)

    editais: Mapped[list["Edital"]] = relationship(back_populates="usuario", cascade="all, delete-orphan")


class CadastroPendente(Base):
    """Cadastro esperando a pessoa digitar o código que chegou no e-mail.

    A conta (Usuario) só é criada depois da confirmação, então e-mail que ninguém
    confirmou não ocupa espaço nem bloqueia um cadastro futuro.
    """
    __tablename__ = "cadastros_pendentes"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(120))
    cpf: Mapped[str] = mapped_column(String(11))
    senha_hash: Mapped[str] = mapped_column(String(200))
    codigo_hash: Mapped[str] = mapped_column(String(64))
    tentativas: Mapped[int] = mapped_column(Integer, default=0)
    expira_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    enviado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)


class Edital(Base):
    __tablename__ = "editais"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    nome_arquivo: Mapped[str] = mapped_column(String(255))
    titulo: Mapped[str] = mapped_column(String(255), default="")
    texto: Mapped[str] = mapped_column(Text, default="")
    # processando | pronto | erro
    status: Mapped[str] = mapped_column(String(20), default="processando")
    mensagem_erro: Mapped[str] = mapped_column(Text, default="")
    analise: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)

    usuario: Mapped[Usuario] = relationship(back_populates="editais")
    questoes: Mapped[list["Questao"]] = relationship(back_populates="edital", cascade="all, delete-orphan")


class Questao(Base):
    __tablename__ = "questoes"

    id: Mapped[int] = mapped_column(primary_key=True)
    edital_id: Mapped[int] = mapped_column(ForeignKey("editais.id"), index=True)
    materia: Mapped[str] = mapped_column(String(200))
    enunciado: Mapped[str] = mapped_column(Text)
    alternativas: Mapped[list] = mapped_column(JSON)  # [{"letra": "A", "texto": "..."}]
    correta: Mapped[str] = mapped_column(String(1))
    explicacao: Mapped[str] = mapped_column(Text)
    dificuldade: Mapped[str] = mapped_column(String(20), default="media")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)

    edital: Mapped[Edital] = relationship(back_populates="questoes")


class Resposta(Base):
    __tablename__ = "respostas"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    questao_id: Mapped[int] = mapped_column(ForeignKey("questoes.id"), index=True)
    escolhida: Mapped[str] = mapped_column(String(1))
    acertou: Mapped[bool] = mapped_column(Boolean)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)

    questao: Mapped[Questao] = relationship()


class Mensagem(Base):
    __tablename__ = "mensagens"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), index=True)
    edital_id: Mapped[int | None] = mapped_column(ForeignKey("editais.id"), nullable=True)
    papel: Mapped[str] = mapped_column(String(20))  # aluno | vera
    conteudo: Mapped[str] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)


class ContatoSuporte(Base):
    __tablename__ = "contatos_suporte"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(200))
    assunto: Mapped[str] = mapped_column(String(120))
    mensagem: Mapped[str] = mapped_column(Text)
    respondido: Mapped[bool] = mapped_column(Boolean, default=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=agora)
