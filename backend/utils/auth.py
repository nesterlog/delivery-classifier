from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import hashlib
import os
import time
from jose import jwt, JWTError
from datetime import datetime, timedelta

# 관리자 비밀번호 (GUI와 동일)
ADMIN_PASSWORD = "admin1234"

# JWT 설정
SECRET_KEY = os.getenv("JWT_SECRET", "deliauto_secret_key_2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

security = HTTPBearer()

def verify_admin_password(password: str) -> bool:
    """관리자 비밀번호 검증"""
    return password == ADMIN_PASSWORD

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 토큰 생성"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role: str = payload.get("role")
        user: str = payload.get("user")
        if role is None or user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰이 유효하지 않습니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"role": role, "user": user}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰이 유효하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """현재 인증된 관리자 정보 가져오기"""
    token = credentials.credentials
    user_data = verify_token(token)
    if user_data.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다."
        )
    return user_data

class AdminRequired:
    """관리자 권한 필요 데코레이터 (더미 - 항상 성공)"""
    def __init__(self):
        pass
    
    async def __call__(self):
        return {"role": "admin", "user": "admin"} 