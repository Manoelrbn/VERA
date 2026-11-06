"""Validação de CPF pelos dígitos verificadores (o mesmo cálculo da Receita Federal).

Isso confirma que o número é bem formado, não que pertence à pessoa. Para checar
titularidade seria preciso consultar um serviço pago da Receita ou de um parceiro.
"""
import re


def so_digitos(cpf: str) -> str:
    return re.sub(r"\D", "", cpf or "")


def cpf_valido(cpf: str) -> bool:
    d = so_digitos(cpf)
    if len(d) != 11 or d == d[0] * 11:  # 000.000.000-00, 111.111.111-11... passam na conta mas são inválidos
        return False
    for tamanho in (9, 10):
        soma = sum(int(d[i]) * (tamanho + 1 - i) for i in range(tamanho))
        digito = (soma * 10) % 11 % 10
        if digito != int(d[tamanho]):
            return False
    return True
