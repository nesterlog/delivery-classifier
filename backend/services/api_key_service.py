import os
from pathlib import Path

# 절대 경로 사용
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API_KEY_FILE = Path(os.path.join(BASE_DIR, "data", "system", "api_key.txt"))

def load_api_key() -> str:
    """
    시스템 데이터 디렉토리의 api_key.txt에서 읽어와 반환. 없으면 빈 문자열 리턴.
    """
    if not API_KEY_FILE.exists():
        return ""
    return API_KEY_FILE.read_text(encoding="utf-8").strip()

def save_api_key(new_key: str) -> None:
    """
    시스템 데이터 디렉토리의 api_key.txt에 새 키 덮어쓰기.
    """
    API_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    API_KEY_FILE.write_text(new_key.strip(), encoding="utf-8") 