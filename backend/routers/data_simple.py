from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os
import logging
from pathlib import Path

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 절대 경로로 변경
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USER_DATA_DIR = os.path.join(BASE_DIR, "data", "user")
SYSTEM_DATA_DIR = os.path.join(BASE_DIR, "data", "system")

logger.info(f"데이터 라우터 초기화 - 기본 디렉토리: {BASE_DIR}")
logger.info(f"사용자 데이터 디렉토리: {USER_DATA_DIR}")
logger.info(f"시스템 데이터 디렉토리: {SYSTEM_DATA_DIR}")

@router.get("/list")
async def list_files():
    """
    사용자 데이터 디렉토리 내 파일 목록 반환
    """
    try:
        # 절대 경로 확인을 위한 로깅
        logger.info(f"Listing files from directory: {USER_DATA_DIR}")
        logger.info(f"Directory exists: {os.path.exists(USER_DATA_DIR)}")
        
        os.makedirs(USER_DATA_DIR, exist_ok=True)
        items = []
        
        # 시스템 파일 목록
        system_files = ["당일배송양식.xlsx", "새벽배송양식.xlsx", "api_key.txt", "logo.png"]
        
        if os.path.exists(USER_DATA_DIR):
            for fname in os.listdir(USER_DATA_DIR):
                path = os.path.join(USER_DATA_DIR, fname)
                stat = os.stat(path)
                items.append({
                    "filename": fname,
                    "size": stat.st_size,
                    "last_modified": stat.st_mtime,
                    "is_system": fname in system_files
                })
            
            # 수정일 기준으로 최신순 정렬
            items.sort(key=lambda x: x['last_modified'], reverse=True)
            logger.info(f"Found {len(items)} files in {USER_DATA_DIR}")
        else:
            logger.error(f"Directory {USER_DATA_DIR} does not exist")
            
        return items
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        return []

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    임의 파일 업로드. 사용자 데이터 디렉토리 아래 저장.
    """
    try:
        logger.info(f"Uploading file: {file.filename}")
        os.makedirs(USER_DATA_DIR, exist_ok=True)
        save_path = os.path.join(USER_DATA_DIR, file.filename)
        with open(save_path, "wb+") as buf:
            content = await file.read()
            buf.write(content)
            logger.info(f"File saved to {save_path}, size: {len(content)} bytes")
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 업로드 실패: {str(e)}")

@router.get("/download/{filename}")
async def download_file(filename: str):
    """
    사용자 데이터 디렉토리의 파일을 스트리밍으로 반환.
    """
    try:
        file_path = os.path.join(USER_DATA_DIR, filename)
        logger.info(f"Downloading file: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
            
        return FileResponse(path=file_path, filename=filename)
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 다운로드 실패: {str(e)}")

@router.delete("/{filename}")
async def delete_file(filename: str):
    """
    사용자 데이터 디렉토리의 파일 삭제
    """
    try:
        file_path = os.path.join(USER_DATA_DIR, filename)
        logger.info(f"Deleting file: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="파일이 없습니다.")
            
        os.remove(file_path)
        logger.info(f"File deleted: {file_path}")
        return JSONResponse({"success": True})
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 삭제 실패: {str(e)}") 