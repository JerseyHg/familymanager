from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://familymanager:Zz010013@shared-postgres:5432/familymanager"

    # 爬虫配置
    SCRAPER_INTERVAL_HOURS: int = 1
    SCRAPER_ENABLED: bool = True

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
