from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from routers.classify_router import router as classify_router
from routers.dawn_option_router import router as dawn_router
from routers.invoice_router import router as invoice_router
from routers.zip_router import router as zip_router
from routers.api_key_simple import router as api_key_router
from routers.data_router import router as data_router
from routers.auth_router import router as auth_router

app = FastAPI(title="배송 분류 자동화 API",
             description="주소 기반 우편번호 매칭 배송방법 자동분류 시스템")

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모든 origin 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록 (auth_router 제거)
app.include_router(classify_router, prefix="/api/classify", tags=["classify"])
app.include_router(dawn_router, prefix="/api/dawn-option", tags=["dawn_option"])
app.include_router(invoice_router, prefix="/api/invoice-match", tags=["invoice"])
app.include_router(zip_router, prefix="/api/zipcode", tags=["zipcode"])
app.include_router(api_key_router, prefix="/api/api-key", tags=["api_key"])
app.include_router(data_router, prefix="/api/data", tags=["data"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

# 데이터 디렉토리 생성 및 경로 확인
logger.info("현재 작업 디렉토리: %s", os.getcwd())

# 절대 경로 계산
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
logger.info("백엔드 기본 디렉토리: %s", BASE_DIR)

# 시스템 디렉토리 확인
system_dir = os.path.join(BASE_DIR, "data", "system")
system_abs_path = os.path.abspath(system_dir)
logger.info("시스템 데이터 디렉토리 절대 경로: %s", system_abs_path)
logger.info("시스템 데이터 디렉토리 존재 여부: %s", os.path.exists(system_abs_path))
os.makedirs(system_dir, exist_ok=True)

# 사용자 디렉토리 확인
user_dir = os.path.join(BASE_DIR, "data", "user")
user_abs_path = os.path.abspath(user_dir)
logger.info("사용자 데이터 디렉토리 절대 경로: %s", user_abs_path)
logger.info("사용자 데이터 디렉토리 존재 여부: %s", os.path.exists(user_abs_path))
os.makedirs(user_dir, exist_ok=True)

# 백엔드/backend/data 디렉토리도 확인
backend_data_dir = os.path.join(BASE_DIR, "backend", "data")
if os.path.exists(backend_data_dir):
    logger.info("중복 데이터 디렉토리 발견: %s", backend_data_dir)
    
    # 기존 데이터 복사 로직 추가
    try:
        import shutil
        from pathlib import Path
        
        # 시스템 파일 복사
        backend_system_dir = os.path.join(backend_data_dir, "system")
        if os.path.exists(backend_system_dir):
            for filename in os.listdir(backend_system_dir):
                src_file = os.path.join(backend_system_dir, filename)
                dst_file = os.path.join(system_dir, filename)
                if os.path.isfile(src_file) and not os.path.exists(dst_file):
                    shutil.copy2(src_file, dst_file)
                    logger.info("파일 복사됨: %s -> %s", src_file, dst_file)
                    
        # 사용자 파일 복사
        backend_user_dir = os.path.join(backend_data_dir, "user")
        if os.path.exists(backend_user_dir):
            for filename in os.listdir(backend_user_dir):
                src_file = os.path.join(backend_user_dir, filename)
                dst_file = os.path.join(user_dir, filename)
                if os.path.isfile(src_file) and not os.path.exists(dst_file):
                    shutil.copy2(src_file, dst_file)
                    logger.info("파일 복사됨: %s -> %s", src_file, dst_file)
    except Exception as e:
        logger.error("파일 복사 중 오류 발생: %s", str(e))

# 정적 파일 제공 설정
data_dir = os.path.join(BASE_DIR, "data")
app.mount("/data", StaticFiles(directory=data_dir), name="data")

@app.get("/")
async def root():
    return {
        "message": "배송 분류 자동화 백엔드가 정상 실행 중입니다.", 
        "version": "2.0",
        "working_directory": os.getcwd(),
        "backend_directory": BASE_DIR,
        "user_data_path": user_abs_path,
        "system_data_path": system_abs_path
    } 
 