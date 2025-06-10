from pydantic import BaseSettings

class Settings(BaseSettings):
    kakao_api_key: str
    upload_dir: str
    tmp_dir: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings() 