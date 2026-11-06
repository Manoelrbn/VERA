import io
import re

import pdfplumber


class PdfIlegivel(Exception):
    pass


def extrair_texto(conteudo: bytes) -> str:
    try:
        with pdfplumber.open(io.BytesIO(conteudo)) as pdf:
            paginas = [p.extract_text() or "" for p in pdf.pages]
    except Exception as e:  # PDF corrompido, protegido por senha etc.
        raise PdfIlegivel(
            "Não conseguimos abrir esse PDF. Ele pode estar protegido por senha ou corrompido. "
            "Tente baixar o edital de novo no site da banca."
        ) from e

    texto = "\n".join(paginas)
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n{3,}", "\n\n", texto).strip()

    # Edital escaneado (imagem) quase não tem texto extraível.
    if len(texto) < 500:
        raise PdfIlegivel(
            "Esse PDF parece ser uma imagem escaneada, então não dá para ler o texto dele. "
            "Procure no site da banca a versão em texto do edital (geralmente é a publicada no Diário Oficial)."
        )
    return texto


def recortar_para_analise(texto: str, limite: int = 120_000) -> str:
    """Editais longos não cabem inteiros. Mantemos o começo (cargos, datas, requisitos)
    e garantimos que o conteúdo programático, que costuma estar no fim, também vá junto."""
    if len(texto) <= limite:
        return texto
    marcador = re.search(r"conte[uú]do\s+program[aá]tico", texto, re.IGNORECASE)
    if marcador and marcador.start() > limite // 2:
        metade = limite // 2
        return texto[:metade] + "\n\n[...]\n\n" + texto[marcador.start(): marcador.start() + metade]
    return texto[:limite]
