"""Envio de e-mails da Vera.

Com SMTP configurado no .env, envia de verdade. Sem SMTP, escreve o e-mail no terminal
do backend, para dar para testar o cadastro sem servidor de e-mail.
"""
import logging
import smtplib
from email.message import EmailMessage

from .config import settings

log = logging.getLogger("vera.correio")


def enviar_email(para: str, assunto: str, texto: str) -> None:
    if not settings.smtp_host:
        log.warning(
            "\n================ E-MAIL (modo desenvolvimento, sem SMTP) ================\n"
            "Para: %s\nAssunto: %s\n\n%s\n"
            "=========================================================================",
            para, assunto, texto,
        )
        return

    msg = EmailMessage()
    msg["From"] = settings.smtp_remetente
    msg["To"] = para
    msg["Subject"] = assunto
    msg.set_content(texto)

    porta = settings.smtp_porta
    if porta == 465:
        servidor = smtplib.SMTP_SSL(settings.smtp_host, porta, timeout=20)
    else:
        servidor = smtplib.SMTP(settings.smtp_host, porta, timeout=20)
        servidor.starttls()
    with servidor:
        if settings.smtp_usuario:
            servidor.login(settings.smtp_usuario, settings.smtp_senha)
        servidor.send_message(msg)


def enviar_codigo_cadastro(para: str, nome: str, codigo: str) -> None:
    primeiro = nome.split()[0] if nome.strip() else ""
    enviar_email(
        para,
        f"{codigo} é o seu código da Vera",
        f"Oi, {primeiro}.\n\n"
        f"Seu código para confirmar o cadastro na Vera é: {codigo}\n\n"
        f"Ele vale por {settings.codigo_validade_minutos} minutos. "
        "Se não foi você que pediu, é só ignorar este e-mail.\n\n"
        "Bons estudos,\nVera",
    )
