from fastapi import APIRouter, UploadFile, File, HTTPException
import os, csv
from fastapi.responses import JSONResponse, FileResponse

router = APIRouter()

# 절대 경로 사용
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYSTEM_DATA_DIR = os.path.join(BASE_DIR, "data", "system")

def save_zip(file: UploadFile, target_name: str) -> dict:
    """
    CSV 파일 받아서 시스템 데이터 디렉토리 아래에 target_name 으로 저장.
    저장 시 중복 우편번호를 제거하고, 저장된 우편번호 개수와 정보 리턴.
    """
    os.makedirs(SYSTEM_DATA_DIR, exist_ok=True)
    save_path = os.path.join(SYSTEM_DATA_DIR, target_name)
    
    # 파일 내용 읽기
    file_content = file.file.read()
    
    # 임시 파일로 저장
    with open(save_path, "wb+") as buf:
        buf.write(file_content)
    
    # 중복 제거를 위한 집합
    unique_zips = set()
    total_count = 0
    duplicate_count = 0
    
    # 파일 읽어서 우편번호 추출
    with open(save_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0].strip().isdigit():
                total_count += 1
                zip_code = row[0].strip()
                if zip_code in unique_zips:
                    duplicate_count += 1
                else:
                    unique_zips.add(zip_code)
    
    # 중복 제거된 우편번호로 파일 다시 작성
    with open(save_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        for zip_code in unique_zips:
            writer.writerow([zip_code])
    
    return {
        "count": len(unique_zips),
        "total_count": total_count,
        "duplicate_count": duplicate_count,
        "original_filename": file.filename
    }

@router.post("/day")
async def upload_day_zip(file: UploadFile = File(...)):
    try:
        result = save_zip(file, "day_zip.csv")
        # 원본 파일명도 저장
        with open(os.path.join(SYSTEM_DATA_DIR, "day_zip_original_name.txt"), "w", encoding="utf-8") as f:
            f.write(file.filename)
        
        return JSONResponse({
            "success": True, 
            "day_count": result["count"],
            "original_filename": result["original_filename"],
            "total_count": result["total_count"],
            "duplicate_count": result["duplicate_count"]
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/dawn")
async def upload_dawn_zip(file: UploadFile = File(...)):
    try:
        result = save_zip(file, "dawn_zip.csv")
        # 원본 파일명도 저장
        with open(os.path.join(SYSTEM_DATA_DIR, "dawn_zip_original_name.txt"), "w", encoding="utf-8") as f:
            f.write(file.filename)
        
        return JSONResponse({
            "success": True, 
            "dawn_count": result["count"],
            "original_filename": result["original_filename"],
            "total_count": result["total_count"],
            "duplicate_count": result["duplicate_count"]
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/")
async def get_zip_info():
    """
    현재 저장된 우편번호 파일명과 건수 리턴
    """
    info = {}
    day_path = os.path.join(SYSTEM_DATA_DIR, "day_zip.csv")
    dawn_path = os.path.join(SYSTEM_DATA_DIR, "dawn_zip.csv")
    day_original_name_path = os.path.join(SYSTEM_DATA_DIR, "day_zip_original_name.txt")
    dawn_original_name_path = os.path.join(SYSTEM_DATA_DIR, "dawn_zip_original_name.txt")
    
    # 카운트 계산
    day_count = 0
    dawn_count = 0
    if os.path.exists(day_path):
        with open(day_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            day_count = sum(1 for row in reader if row and row[0].strip().isdigit())
    
    if os.path.exists(dawn_path):
        with open(dawn_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            dawn_count = sum(1 for row in reader if row and row[0].strip().isdigit())
    
    # 원본 파일명 읽기
    day_original_filename = None
    dawn_original_filename = None
    
    if os.path.exists(day_original_name_path):
        with open(day_original_name_path, "r", encoding="utf-8") as f:
            day_original_filename = f.read().strip()
    
    if os.path.exists(dawn_original_name_path):
        with open(dawn_original_name_path, "r", encoding="utf-8") as f:
            dawn_original_filename = f.read().strip()
    
    info["day_filename"] = day_original_filename if os.path.exists(day_path) else None
    info["dawn_filename"] = dawn_original_filename if os.path.exists(dawn_path) else None
    info["day_count"] = day_count
    info["dawn_count"] = dawn_count
    
    return info

@router.get("/download/day")
async def download_day_zip():
    """당일배송 우편번호 CSV 파일 다운로드"""
    day_path = os.path.join(SYSTEM_DATA_DIR, "day_zip.csv")
    
    if not os.path.exists(day_path):
        raise HTTPException(status_code=404, detail="당일배송 우편번호 파일을 찾을 수 없습니다.")
    
    # 원본 파일명 가져오기
    day_original_name_path = os.path.join(SYSTEM_DATA_DIR, "day_zip_original_name.txt")
    filename = "당일배송_우편번호.csv"
    
    if os.path.exists(day_original_name_path):
        with open(day_original_name_path, "r", encoding="utf-8") as f:
            original_name = f.read().strip()
            if original_name:
                filename = original_name
    
    return FileResponse(
        path=day_path,
        filename=filename,
        media_type="text/csv"
    )

@router.get("/download/dawn")
async def download_dawn_zip():
    """새벽배송 우편번호 CSV 파일 다운로드"""
    dawn_path = os.path.join(SYSTEM_DATA_DIR, "dawn_zip.csv")
    
    if not os.path.exists(dawn_path):
        raise HTTPException(status_code=404, detail="새벽배송 우편번호 파일을 찾을 수 없습니다.")
    
    # 원본 파일명 가져오기
    dawn_original_name_path = os.path.join(SYSTEM_DATA_DIR, "dawn_zip_original_name.txt")
    filename = "새벽배송_우편번호.csv"
    
    if os.path.exists(dawn_original_name_path):
        with open(dawn_original_name_path, "r", encoding="utf-8") as f:
            original_name = f.read().strip()
            if original_name:
                filename = original_name
    
    return FileResponse(
        path=dawn_path,
        filename=filename,
        media_type="text/csv"
    ) 