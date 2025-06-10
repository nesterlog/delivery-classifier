import re
from difflib import SequenceMatcher

def preprocess_address(address: str) -> str:
    """
    원본 주소를 소문자화, 괄호 제거, 도로명+번지만 남기도록 최소한으로 정리.
    """
    address = address.strip().lower()
    address = re.sub(r"\([^)]*\)", "", address)  # 괄호 안 제거
    address = re.sub(r"[^0-9ㄱ-ㅎ가-힣a-z\s]", "", address)
    address = re.sub(r"\s+", " ", address).strip()
    return address

def clean_address(address: str) -> str:
    """
    전처리된 주소를 사람이 보기 좋게 띄어쓰기·대문자 재배치 등.
    """
    addr = preprocess_address(address)
    addr = re.sub(r"(서울특별시)(.+)", r"\1 \2", addr)
    addr = re.sub(r"(\d+)([가-힣])", r"\1 \2", addr)
    return addr

def clean_address_for_output(address: str) -> str:
    """
    엑셀 출력용으로 보기 좋게 만들기 위한 포맷.
    """
    addr = clean_address(address)
    return addr

def normalize(text: str) -> str:
    """
    매칭 또는 비교 시, 모든 공백·특수문자 제거 후 소문자화해서 단순화.
    """
    t = text.strip().lower()
    t = re.sub(r"[^0-9ㄱ-ㅎ가-힣a-z]", "", t)
    return t

def calculate_similarity(a: str, b: str) -> float:
    """
    두 문자열 간 유사도(SequenceMatcher) 계산.
    """
    return SequenceMatcher(None, a, b).ratio() 