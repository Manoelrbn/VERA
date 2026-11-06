from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    jwt_secret: str = "troque-isto"
    jwt_horas_validade: int = 24 * 7

    openai_api_key: str = ""
    openai_modelo_principal: str = "gpt-4o"
    openai_modelo_rapido: str = "gpt-4o-mini"

    frontend_url: str = "http://localhost:5173"
    suporte_email: str = "contato@vera.com.br"
    suporte_whatsapp: str = "5531999999999"

    # Limites do plano gratuito. O plano "pro" não tem limite de editais/questões,
    # mas mantém um teto diário de mensagens para proteger o custo da API.
    gratis_editais_mes: int = 1
    gratis_questoes_mes: int = 50
    gratis_mensagens_dia: int = 20
    pro_mensagens_dia: int = 200

    tamanho_max_pdf_mb: int = 25

    @property
    def url_banco(self) -> str:
        return self.database_url or "sqlite:///./vera.db"

    @property
    def modo_demo(self) -> bool:
        return not self.openai_api_key


settings = Settings()
