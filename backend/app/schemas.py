from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class CadastroIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    senha: str


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: str
    plano: str


class SessaoOut(BaseModel):
    token: str
    usuario: UsuarioOut


class EditalResumo(BaseModel):
    id: int
    titulo: str
    nome_arquivo: str
    status: str
    criado_em: datetime


class EditalOut(EditalResumo):
    mensagem_erro: str
    analise: dict | None


class GerarQuestoesIn(BaseModel):
    materia: str
    quantidade: int = Field(default=10, ge=1, le=20)
    dificuldade: str = "misturada"


class QuestaoOut(BaseModel):
    id: int
    materia: str
    enunciado: str
    alternativas: list[dict]
    dificuldade: str


class ResponderIn(BaseModel):
    escolhida: str = Field(min_length=1, max_length=1)


class CorrecaoOut(BaseModel):
    acertou: bool
    correta: str
    explicacao: str


class MensagemIn(BaseModel):
    conteudo: str = Field(min_length=1, max_length=4000)
    edital_id: int | None = None


class MensagemOut(BaseModel):
    id: int
    papel: str
    conteudo: str
    criado_em: datetime


class ContatoIn(BaseModel):
    nome: str = Field(min_length=2, max_length=120)
    email: EmailStr
    assunto: str = Field(min_length=2, max_length=120)
    mensagem: str = Field(min_length=5, max_length=4000)
