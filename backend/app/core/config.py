import os

class Settings:
    PROJECT_NAME: str = "FastAPI Backend"
    VERSION: str = "1.0.0"
    ENV: str = os.getenv("ENV", "development")

settings = Settings()
