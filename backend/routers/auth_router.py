from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from utils.auth import verify_admin_password, create_access_token, get_current_admin
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    access_token: str = None
    token_type: str = "bearer"

class VerifyResponse(BaseModel):
    success: bool
    message: str
    user: dict = None

@router.post("/login", response_model=LoginResponse)
async def admin_login(request: LoginRequest):
    """관리자 로그인"""
    try:
        if verify_admin_password(request.password):
            access_token = create_access_token(
                data={"role": "admin", "user": "admin"}
            )
            logger.info("관리자 로그인 성공")
            return LoginResponse(
                success=True,
                message="로그인이 성공했습니다.",
                access_token=access_token
            )
        else:
            logger.warning("관리자 로그인 실패 - 잘못된 비밀번호")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="비밀번호가 올바르지 않습니다."
            )
    except Exception as e:
        logger.error(f"로그인 처리 중 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그인 처리 중 오류가 발생했습니다."
        )

@router.get("/verify", response_model=VerifyResponse)
async def verify_admin(current_admin = Depends(get_current_admin)):
    """관리자 토큰 검증"""
    try:
        return VerifyResponse(
            success=True,
            message="유효한 관리자 토큰입니다.",
            user=current_admin
        )
    except Exception as e:
        logger.error(f"토큰 검증 중 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 검증에 실패했습니다."
        )

@router.post("/logout")
async def admin_logout(current_admin = Depends(get_current_admin)):
    """관리자 로그아웃"""
    try:
        logger.info("관리자 로그아웃")
        return {
            "success": True,
            "message": "로그아웃이 완료되었습니다."
        }
    except Exception as e:
        logger.error(f"로그아웃 처리 중 오류: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="로그아웃 처리 중 오류가 발생했습니다."
        ) 