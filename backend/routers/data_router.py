from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from utils.auth import get_current_admin
import os
import logging
from pathlib import Path
import glob
from datetime import datetime

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
        system_files = [
            "당일배송양식.xlsx", 
            "새벽배송양식.xlsx", 
            "api_key.txt", 
            "logo.png",
            "당일_우편번호.csv",
            "새벽_우편번호.csv"
        ]
        
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
    api_key.txt 파일은 관리자만 다운로드 가능.
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

@router.get("/download-admin/{filename}")
async def download_admin_file(filename: str, current_admin = Depends(get_current_admin)):
    """
    관리자 전용 파일 다운로드 (api_key.txt 등)
    """
    try:
        # 관리자 전용 파일 목록
        admin_only_files = ["api_key.txt"]
        
        if filename not in admin_only_files:
            raise HTTPException(status_code=403, detail="해당 파일은 관리자 전용이 아닙니다.")
        
        file_path = os.path.join(USER_DATA_DIR, filename)
        logger.info(f"Admin downloading file: {file_path}")
        
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
            
        return FileResponse(path=file_path, filename=filename)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading admin file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 다운로드 실패: {str(e)}")

@router.delete("/clean")
async def clean_data_files():
    """사용자 데이터 디렉토리의 모든 결과 파일 삭제"""
    try:
        user_data_dir = USER_DATA_DIR
        
        # 결과 파일 패턴들 (시스템 파일 제외)
        patterns = [
            "새벽배송_주문리스트*.xlsx",  # 밑줄 제거
            "당일배송_주문리스트*.xlsx", 
            "택배배송_주문리스트*.xlsx",
            "미분류_주문리스트*.xlsx",
            "주소오류_미분류*.xlsx",
            "당일새벽배송_주문리스트*.xlsx",
            "*_당일새벽택배한방양식*.xlsx",
            "결측치_오류_행*.xlsx",
            "송장매칭_완료*.xlsx",
            "송장매칭_미매칭*.xlsx",
            "dawn_option_added_*.xlsx",
            "새벽배송_옵션추가완료_*.xlsx"  # 새벽옵션 추가 결과 파일
        ]
        
        deleted_files = []
        logger.info(f"Starting cleanup in directory: {user_data_dir}")
        
        for pattern in patterns:
            files = glob.glob(os.path.join(user_data_dir, pattern))
            logger.info(f"Pattern '{pattern}' found {len(files)} files: {files}")
            for file_path in files:
                try:
                    os.remove(file_path)
                    deleted_files.append(os.path.basename(file_path))
                    logger.info(f"Deleted file: {file_path}")
                except Exception as e:
                    logger.error(f"파일 삭제 실패 {file_path}: {e}")
        
        logger.info(f"Total deleted files: {len(deleted_files)}")
        
        return JSONResponse({
            "success": True,
            "deleted_count": len(deleted_files),
            "deleted_files": deleted_files
        })
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 정리 중 오류가 발생했습니다: {str(e)}")

@router.delete("/clean/{filename}")
async def delete_specific_file(filename: str):
    """특정 파일 삭제"""
    try:
        user_data_dir = USER_DATA_DIR
        file_path = os.path.join(user_data_dir, filename)
        
        # 보안을 위해 user 디렉토리 내의 파일만 삭제 허용
        if not file_path.startswith(user_data_dir):
            raise HTTPException(status_code=403, detail="접근이 허용되지 않은 경로입니다.")
        
        # 시스템 파일은 삭제 금지
        system_files = [
            "당일배송양식.xlsx", 
            "새벽배송양식.xlsx", 
            "api_key.txt", 
            "logo.png",
            "당일_우편번호.csv",
            "새벽_우편번호.csv"
        ]
        if filename in system_files:
            raise HTTPException(status_code=403, detail="시스템 파일은 삭제할 수 없습니다.")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
        
        os.remove(file_path)
        
        return JSONResponse({
            "success": True,
            "message": f"파일 '{filename}'이 삭제되었습니다."
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 삭제 중 오류가 발생했습니다: {str(e)}")

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