# =========================================
# 프로젝트: 배송분류 자동화 웹앱
# (Next.js + FastAPI 기반 기본 뼈대)
# =========================================

# 1. .env (루트 최상단에 위치)
``` .env
KAKAO_API_KEY=여기에_카카오_API_키를_입력하세요
UPLOAD_DIR=backend/data
TMP_DIR=backend/tmp
2. backend/config.py
backend/config.py
복사
편집
from pydantic import BaseSettings

class Settings(BaseSettings):
    kakao_api_key: str
    upload_dir: str
    tmp_dir: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
3. backend/utils/address_preprocessor.py
backend/utils/address_preprocessor.py
복사
편집
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
4. backend/utils/file_utils.py
backend/utils/file_utils.py
복사
편집
import os
import pandas as pd
from openpyxl import Workbook
from difflib import SequenceMatcher

def convert_xls_to_xlsx(xls_path: str) -> str:
    """
    .xls 파일을 읽어 .xlsx로 변환 후 경로 반환.
    """
    df = pd.read_excel(xls_path, engine="xlrd")
    new_path = xls_path.replace(".xls", ".xlsx")
    df.to_excel(new_path, index=False, engine="openpyxl")
    return new_path

def read_excel_file(file_path: str) -> pd.DataFrame:
    """
    확장자에 따라 .xls → .xlsx 변환하거나, .csv/.xlsx 읽어서 DataFrame 반환.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".xls":
        file_path = convert_xls_to_xlsx(file_path)
    if ext in [".xlsx", ".xls"]:
        return pd.read_excel(file_path, engine="openpyxl")
    elif ext == ".csv":
        return pd.read_csv(file_path, encoding="utf-8-sig")
    else:
        raise ValueError(f"지원하지 않는 파일 형식입니다: {ext}")

def find_column(df, candidates: list) -> str:
    """
    DataFrame에서 후보 컬럼명 목록(candidates)과 가장 유사한 컬럼 이름 찾아 반환.
    """
    cols = list(df.columns)
    for cand in candidates:
        if cand in cols:
            return cand
    best = None
    best_score = 0.0
    for col in cols:
        for cand in candidates:
            score = SequenceMatcher(None, col.lower(), cand.lower()).ratio()
            if score > best_score:
                best_score = score
                best = col
    if best_score > 0.7:
        return best
    raise KeyError("유효한 컬럼을 찾을 수 없습니다.")

def auto_map_col(df: pd.DataFrame) -> pd.DataFrame:
    """
    pandas DataFrame의 컬럼명을 내부 표준 컬럼명(order_id, address, request_type 등)으로 변경.
    """
    mapping = {}
    mapping['order_id'] = find_column(df, ['order_id', '주문ID', 'order id'])
    mapping['address'] = find_column(df, ['주소', 'address', '도로명주소'])
    mapping['request_type'] = find_column(df, ['요청유형', 'request_type'])
    mapping['msg_type'] = find_column(df, ['문자전송유형', 'msg_type'])
    try:
        mapping['phone_number'] = find_column(df, ['전화번호', 'phone', 'phone_number'])
    except KeyError:
        mapping['phone_number'] = None

    rename_dict = {v: k for k, v in mapping.items() if v is not None}
    df = df.rename(columns=rename_dict)
    return df
5. backend/services/zip_service.py
backend/services/zip_service.py
복사
편집
import csv
import os

def load_zip_codes(zip_path: str) -> set:
    """
    CSV 파일(.csv)에 줄 단위로 적힌 우편번호를 정수 집합으로 반환.
    """
    zips = set()
    if not os.path.exists(zip_path):
        return zips
    with open(zip_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for row in reader:
            if not row:
                continue
            try:
                zips.add(int(row[0].strip()))
            except ValueError:
                continue
    return zips
6. backend/services/api_key_service.py
backend/services/api_key_service.py
복사
편집
import os
from pathlib import Path

API_KEY_FILE = Path("backend/data/api_key.txt")

def load_api_key() -> str:
    """
    data/api_key.txt에서 읽어와 반환. 없으면 빈 문자열 리턴.
    """
    if not API_KEY_FILE.exists():
        return ""
    return API_KEY_FILE.read_text(encoding="utf-8").strip()

def save_api_key(new_key: str) -> None:
    """
    data/api_key.txt에 새 키 덮어쓰기.
    """
    API_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    API_KEY_FILE.write_text(new_key.strip(), encoding="utf-8")
7. backend/services/classifier_service.py
backend/services/classifier_service.py
복사
편집
import os
import pandas as pd
from datetime import datetime
from utils.address_preprocessor import preprocess_address, clean_address, normalize
from services.zip_service import load_zip_codes
from services.api_key_service import load_api_key
from utils.file_utils import read_excel_file, auto_map_col

def classify_delivery(
    file_path: str,
    request_type: str,
    msg_type: str,
    cycle: int,
    dawn_zip_path: str,
    day_zip_path: str
) -> (str, dict):
    """
    1) 업로드된 주문 파일 읽기 → DataFrame
    2) 카카오 API 호출 또는 전처리로 도로명 주소, 우편번호 획득
    3) 우편번호 비교하여 새벽/당일/미분류 판별
    4) cycle, request_type, msg_type을 결과에 추가
    5) 최종 결과를 엑셀로 저장, 통계 리턴
    """
    df = read_excel_file(file_path)
    df = auto_map_col(df)

    api_key = load_api_key()
    dawn_zips = load_zip_codes(dawn_zip_path)
    day_zips = load_zip_codes(day_zip_path)

    results = []
    for idx, row in df.iterrows():
        raw_addr = row.get("address", "")
        # 1) 카카오 API 주소 조회 로직 주석 처리 (구현 필요)
        # kakao_res = query_kakao_address(raw_addr, api_key)
        # if kakao_res:
        #     road_addr = kakao_res["road_address"]
        #     zip_code = int(kakao_res["zone_no"])
        # else:
        road_addr = preprocess_address(raw_addr)
        zip_code = None

        if zip_code in dawn_zips:
            delivery_type = "새벽"
        elif zip_code in day_zips:
            delivery_type = "당일"
        else:
            delivery_type = "미분류"

        results.append({
            "order_id": row.get("order_id"),
            "original_address": raw_addr,
            "cleaned_address": clean_address(road_addr),
            "zip_code": zip_code,
            "delivery_type": delivery_type,
            "cycle": cycle,
            "request_type": request_type,
            "msg_type": msg_type
        })

    result_df = pd.DataFrame(results)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = "backend/data"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"classified_{timestamp}.xlsx")
    result_df.to_excel(output_path, index=False, engine="openpyxl")

    stats = {
        "total": len(result_df),
        "dawn": len(result_df[result_df["delivery_type"] == "새벽"]),
        "day": len(result_df[result_df["delivery_type"] == "당일"]),
        "unclassified": len(result_df[result_df["delivery_type"] == "미분류"])
    }
    return output_path, stats
8. backend/services/dawn_service.py
backend/services/dawn_service.py
복사
편집
import os
import pandas as pd
from datetime import datetime
from utils.file_utils import read_excel_file

def apply_dawn_option(
    template_path: str,
    request_type: str,
    msg_type: str,
    cycle: int
) -> str:
    """
    1) 새벽배송 양식 엑셀 읽기
    2) '요청유형', '문자전송유형', '차수' 컬럼에 값 채워 넣기
    3) 결과 엑셀 저장 후 경로 반환
    """
    df = read_excel_file(template_path)
    df["요청유형"] = request_type
    df["문자전송유형"] = msg_type
    df["차수"] = cycle

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = "backend/data"
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"dawn_option_added_{timestamp}.xlsx")
    df.to_excel(output_path, index=False, engine="openpyxl")
    return output_path
9. backend/services/invoice_service.py
backend/services/invoice_service.py
복사
편집
import os
import pandas as pd
from datetime import datetime
from utils.file_utils import read_excel_file, auto_map_col
from utils.address_preprocessor import normalize, calculate_similarity

THRESHOLD = 0.8  # 유사도 임계값

def match_invoices(
    classified_path: str,
    invoice_day_path: str,
    invoice_dawn_path: str = None
) -> (str, str, dict):
    """
    1) 분류 완료 주문 파일, 당일 송장 파일, 새벽 송장 파일 읽기
    2) auto_map_col로 표준 컬럼명으로 매핑
    3) 당일 송장 매칭: 각 주문의 cleaned_address+phone → 후보 목록에서 가장 유사한 항목 찾기
    4) 새벽 송장 매칭 (유사 로직)
    5) 결과 엑셀(matched.xlsx + unmatched.xlsx) 저장
    6) 통계 반환
    """
    df_orders = read_excel_file(classified_path)
    df_day = read_excel_file(invoice_day_path)
    df_dawn = (
        read_excel_file(invoice_dawn_path)
        if invoice_dawn_path
        else pd.DataFrame()
    )

    df_orders = auto_map_col(df_orders)
    df_day["addr_norm"] = df_day["receiver_address"].apply(lambda x: normalize(x))
    df_dawn["addr_norm"] = df_dawn["receiver_address"].apply(lambda x: normalize(x))

    matched = []
    unmatched = []

    for _, order in df_orders.iterrows():
        addr_key = normalize(order.get("cleaned_address", ""))
        phone_key = str(order.get("phone_number", "")).strip()
        base_key = addr_key + phone_key

        best_score = 0.0
        best_idx = None
        for idx_day, row_day in df_day.iterrows():
            cand_key = row_day["addr_norm"] + str(row_day.get("phone_number", "")).strip()
            score = calculate_similarity(base_key, cand_key)
            if score > best_score:
                best_score = score
                best_idx = idx_day

        if best_score >= THRESHOLD:
            invoice_no = df_day.at[best_idx, "invoice_no"]
            order_data = order.to_dict()
            order_data["invoice_day"] = invoice_no
            matched.append(order_data)
        else:
            order_data = order.to_dict()
            order_data["invoice_day"] = None
            unmatched.append(order_data)

    # 새벽 매칭 로직(유사하게 추가 구현)

    df_matched = pd.DataFrame(matched)
    df_unmatched = pd.DataFrame(unmatched)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = "backend/data"
    os.makedirs(output_dir, exist_ok=True)

    matched_path = os.path.join(output_dir, f"matched_{timestamp}.xlsx")
    unmatched_path = os.path.join(output_dir, f"unmatched_{timestamp}.xlsx")

    df_matched.to_excel(matched_path, index=False, engine="openpyxl")
    df_unmatched.to_excel(unmatched_path, index=False, engine="openpyxl")

    stats = {
        "total_orders": len(df_orders),
        "matched": len(df_matched),
        "unmatched": len(df_unmatched)
    }
    return matched_path, unmatched_path, stats
10. backend/routers/classify_router.py
backend/routers/classify_router.py
복사
편집
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
from services.classifier_service import classify_delivery
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/")
async def classify(
    file: UploadFile = File(...),
    request_type: str = Form(...),
    msg_type: str = Form(...),
    cycle: int = Form(...),
    dawn_zip_file: UploadFile = File(...),
    day_zip_file: UploadFile = File(...)
):
    """
    배송분류 실행 엔드포인트:
    - file: 주문 원본 파일(.csv/.xlsx/.xls)
    - request_type: 배송대행 등
    - msg_type: 즉시전송/7시전송
    - cycle: 차수 (정수)
    - dawn_zip_file: 새벽배송 우편번호 CSV
    - day_zip_file: 당일배송 우편번호 CSV
    """
    tmp_dir = "backend/tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    order_path = os.path.join(tmp_dir, file.filename)
    with open(order_path, "wb+") as buffer:
        buffer.write(await file.read())

    dawn_zip_path = os.path.join(tmp_dir, dawn_zip_file.filename)
    with open(dawn_zip_path, "wb+") as buf2:
        buf2.write(await dawn_zip_file.read())

    day_zip_path = os.path.join(tmp_dir, day_zip_file.filename)
    with open(day_zip_path, "wb+") as buf3:
        buf3.write(await day_zip_file.read())

    try:
        output_path, stats = classify_delivery(
            order_path, request_type, msg_type, cycle,
            dawn_zip_path, day_zip_path
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return JSONResponse({
        "success": True,
        "result_file": output_path,
        "stats": stats
    })
11. backend/routers/dawn_option_router.py
backend/routers/dawn_option_router.py
복사
편집
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import os
from services.dawn_service import apply_dawn_option
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/apply")
async def apply_dawn(
    template_file: UploadFile = File(...),
    request_type: str = Form(...),
    msg_type: str = Form(...),
    cycle: int = Form(...)
):
    """
    새벽옵션추가 실행 엔드포인트:
    - template_file: 새벽배송 양식 엑셀(.xlsx/.xls/.csv)
    - request_type: 배송대행 등
    - msg_type: 즉시전송/7시전송
    - cycle: 차수 (정수)
    """
    tmp_dir = "backend/tmp"
    os.makedirs(tmp_dir, exist_ok=True)
    tpl_path = os.path.join(tmp_dir, template_file.filename)
    with open(tpl_path, "wb+") as buf:
        buf.write(await template_file.read())

    try:
        output_path = apply_dawn_option(tpl_path, request_type, msg_type, cycle)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return JSONResponse({
        "success": True,
        "result_file": output_path
    })
12. backend/routers/invoice_router.py
backend/routers/invoice_router.py
복사
편집
from fastapi import APIRouter, UploadFile, File, HTTPException
import os
from services.invoice_service import match_invoices
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/")
async def invoice_match(
    classified_file: UploadFile = File(...),
    invoice_day_file: UploadFile = File(...),
    invoice_dawn_file: UploadFile = File(None)
):
    """
    송장매칭 실행 엔드포인트:
    - classified_file: 분류 완료 주문 파일
    - invoice_day_file: 당일 배송 송장 파일
    - invoice_dawn_file: 새벽 배송 송장 파일 (옵션)
    """
    tmp_dir = "backend/tmp"
    os.makedirs(tmp_dir, exist_ok=True)

    cl_path = os.path.join(tmp_dir, classified_file.filename)
    with open(cl_path, "wb+") as buf1:
        buf1.write(await classified_file.read())

    day_path = os.path.join(tmp_dir, invoice_day_file.filename)
    with open(day_path, "wb+") as buf2:
        buf2.write(await invoice_day_file.read())

    dawn_path = None
    if invoice_dawn_file:
        dawn_path = os.path.join(tmp_dir, invoice_dawn_file.filename)
        with open(dawn_path, "wb+") as buf3:
            buf3.write(await invoice_dawn_file.read())

    try:
        matched_path, unmatched_path, stats = match_invoices(
            cl_path, day_path, dawn_path
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return JSONResponse({
        "success": True,
        "matched_file": matched_path,
        "unmatched_file": unmatched_path,
        "stats": stats
    })
13. backend/routers/zip_router.py
backend/routers/zip_router.py
복사
편집
from fastapi import APIRouter, UploadFile, File, HTTPException
import os, csv
from fastapi.responses import JSONResponse

router = APIRouter()

ZIP_DIR = "backend/data"

def save_zip(file: UploadFile, target_name: str) -> int:
    """
    CSV 파일 받아서 data/ 아래에 target_name 으로 저장.
    저장 후 파일의 우편번호 개수 리턴.
    """
    os.makedirs(ZIP_DIR, exist_ok=True)
    save_path = os.path.join(ZIP_DIR, target_name)
    with open(save_path, "wb+") as buf:
        buf.write(file.file.read())

    count = 0
    with open(save_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        for row in reader:
            if row and row[0].strip().isdigit():
                count += 1
    return count

@router.post("/day")
async def upload_day_zip(file: UploadFile = File(...)):
    try:
        count = save_zip(file, "day_zip.csv")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return JSONResponse({"success": True, "day_count": count})

@router.post("/dawn")
async def upload_dawn_zip(file: UploadFile = File(...)):
    try:
        count = save_zip(file, "dawn_zip.csv")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return JSONResponse({"success": True, "dawn_count": count})

@router.get("/")
async def get_zip_info():
    """
    현재 저장된 우편번호 파일명과 건수 리턴
    """
    info = {}
    day_path = os.path.join(ZIP_DIR, "day_zip.csv")
    dawn_path = os.path.join(ZIP_DIR, "dawn_zip.csv")
    day_count = sum(1 for _ in open(day_path, encoding="utf-8-sig")) if os.path.exists(day_path) else 0
    dawn_count = sum(1 for _ in open(dawn_path, encoding="utf-8-sig")) if os.path.exists(dawn_path) else 0
    info["day_filename"] = "day_zip.csv" if os.path.exists(day_path) else None
    info["dawn_filename"] = "dawn_zip.csv" if os.path.exists(dawn_path) else None
    info["day_count"] = day_count
    info["dawn_count"] = dawn_count
    return info
14. backend/routers/api_key_router.py
backend/routers/api_key_router.py
복사
편집
from fastapi import APIRouter, HTTPException, Body
from services.api_key_service import load_api_key, save_api_key
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/")
async def get_api_key():
    key = load_api_key()
    if not key:
        return JSONResponse({"masked": None})
    masked = key[-4:].rjust(len(key), "*")
    return JSONResponse({"masked": masked})

@router.put("/")
async def update_api_key(payload: dict = Body(...)):
    new_key = payload.get("new_key")
    if not new_key:
        raise HTTPException(status_code=400, detail="new_key가 필요합니다.")
    save_api_key(new_key)
    return JSONResponse({"success": True})
15. backend/routers/data_router.py
backend/routers/data_router.py
복사
편집
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os

router = APIRouter()
DATA_DIR = "backend/data"

@router.get("/list")
async def list_files():
    """
    backend/data 디렉토리 내 파일 목록 반환
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    items = []
    for fname in os.listdir(DATA_DIR):
        path = os.path.join(DATA_DIR, fname)
        stat = os.stat(path)
        items.append({
            "filename": fname,
            "size": stat.st_size,
            "modified": stat.st_mtime
        })
    return items

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    임의 파일 업로드. backend/data 아래 저장.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    save_path = os.path.join(DATA_DIR, file.filename)
    with open(save_path, "wb+") as buf:
        buf.write(await file.read())
    return JSONResponse({"success": True})

@router.get("/download/{filename}")
async def download_file(filename: str):
    """
    backend/data/{filename} 파일을 스트리밍으로 반환.
    """
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    return FileResponse(path=file_path, filename=filename)

@router.delete("/{filename}")
async def delete_file(filename: str):
    """
    backend/data/{filename} 삭제
    """
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="파일이 없습니다.")
    os.remove(file_path)
    return JSONResponse({"success": True})
16. backend/routers/init.py
backend/routers/__init__.py
복사
편집
# 비워 두거나, __all__ 정의용으로 남겨둘 수 있습니다.
17. backend/main.py
backend/main.py
복사
편집
from fastapi import FastAPI
from routers.classify_router import router as classify_router
from routers.dawn_option_router import router as dawn_router
from routers.invoice_router import router as invoice_router
from routers.zip_router import router as zip_router
from routers.api_key_router import router as api_key_router
from routers.data_router import router as data_router

app = FastAPI(title="배송 분류 자동화 API")

app.include_router(classify_router, prefix="/api/classify", tags=["classify"])
app.include_router(dawn_router, prefix="/api/dawn-option", tags=["dawn_option"])
app.include_router(invoice_router, prefix="/api/invoice-match", tags=["invoice"])
app.include_router(zip_router, prefix="/api/zipcode", tags=["zipcode"])
app.include_router(api_key_router, prefix="/api/api-key", tags=["api_key"])
app.include_router(data_router, prefix="/api/data", tags=["data"])

@app.get("/")
async def root():
    return {"message": "배송 분류 자동화 백엔드가 정상 실행 중입니다."}
18. frontend/package.json
frontend/package.json
복사
편집
{
  "name": "delivery-classifier-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000"
  },
  "dependencies": {
    "axios": "^1.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^13.5.0"
  }
}
19. frontend/next.config.js
frontend/next.config.js
복사
편집
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*"
      }
    ];
  },
};
20. frontend/pages/classify.tsx
frontend/pages/classify.tsx
복사
편집
import { useState } from "react";
import axios from "axios";

export default function ClassifyPage() {
  const [orderFile, setOrderFile] = useState<File | null>(null);
  const [dawnZipFile, setDawnZipFile] = useState<File | null>(null);
  const [dayZipFile, setDayZipFile] = useState<File | null>(null);
  const [requestType, setRequestType] = useState("배송대행");
  const [msgType, setMsgType] = useState("즉시전송");
  const [cycle, setCycle] = useState(1);
  const [resultLink, setResultLink] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const handleSubmit = async () => {
    if (!orderFile || !dawnZipFile || !dayZipFile) return;

    const formData = new FormData();
    formData.append("file", orderFile);
    formData.append("dawn_zip_file", dawnZipFile);
    formData.append("day_zip_file", dayZipFile);
    formData.append("request_type", requestType);
    formData.append("msg_type", msgType);
    formData.append("cycle", String(cycle));

    const res = await axios.post("/api/classify/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.success) {
      setResultLink(res.data.result_file);
      setStats(res.data.stats);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>배송 분류</h1>
      <div>
        <label>주문 파일:</label>
        <input type="file" onChange={(e) => e.target.files && setOrderFile(e.target.files[0])} />
      </div>
      <div>
        <label>새벽 배송 우편번호 파일:</label>
        <input type="file" onChange={(e) => e.target.files && setDawnZipFile(e.target.files[0])} />
      </div>
      <div>
        <label>당일 배송 우편번호 파일:</label>
        <input type="file" onChange={(e) => e.target.files && setDayZipFile(e.target.files[0])} />
      </div>
      <div>
        <label>요청유형:</label>
        <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
          <option value="배송대행">배송대행</option>
          <option value="기타">기타</option>
        </select>
      </div>
      <div>
        <label>문자전송유형:</label>
        <select value={msgType} onChange={(e) => setMsgType(e.target.value)}>
          <option value="즉시전송">즉시전송</option>
          <option value="7시전송">7시전송</option>
        </select>
      </div>
      <div>
        <label>차수:</label>
        <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))}>
          {[...Array(10)].map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}차
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleSubmit}>분류 실행</button>

      {stats && (
        <div style={{ marginTop: "1rem" }}>
          <h2>통계</h2>
          <p>총 건수: {stats.total}</p>
          <p>새벽 건수: {stats.dawn}</p>
          <p>당일 건수: {stats.day}</p>
          <p>미분류 건수: {stats.unclassified}</p>
        </div>
      )}

      {resultLink && (
        <div style={{ marginTop: "1rem" }}>
          <a href={resultLink} download>
            결과 파일 다운로드
          </a>
        </div>
      )}
    </div>
);
}
21. frontend/pages/dawn-option.tsx
frontend/pages/dawn
복사
편집
import { useState } from "react";
import axios from "axios";

export default function DawnOptionPage() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [requestType, setRequestType] = useState("배송대행");
  const [msgType, setMsgType] = useState("즉시전송");
  const [cycle, setCycle] = useState(1);
  const [resultLink, setResultLink] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!templateFile) return;

    const formData = new FormData();
    formData.append("template_file", templateFile);
    formData.append("request_type", requestType);
    formData.append("msg_type", msgType);
    formData.append("cycle", String(cycle));

    const res = await axios.post("/api/dawn-option/apply", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.success) {
      setResultLink(res.data.result_file);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>새벽 옵션 추가</h1>
      <div>
        <label>새벽배송 양식 파일:</label>
        <input type="file" onChange={(e) => e.target.files && setTemplateFile(e.target.files[0])} />
      </div>
      <div>
        <label>요청유형:</label>
        <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
          <option value="배송대행">배송대행</option>
          <option value="기타">기타</option>
        </select>
      </div>
      <div>
        <label>문자전송유형:</label>
        <select value={msgType} onChange={(e) => setMsgType(e.target.value)}>
          <option value="즉시전송">즉시전송</option>
          <option value="7시전송">7시전송</option>
        </select>
      </div>
      <div>
        <label>차수:</label>
        <select value={cycle} onChange={(e) => setCycle(Number(e.target.value))}>
          {[...Array(10)].map((_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}차
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleSubmit}>적용 및 저장</button>

      {resultLink && (
        <div style={{ marginTop: "1rem" }}>
          <a href={resultLink} download>
            결과 파일 다운로드
          </a>
        </div>
      )}
    </div>
);
}
22. frontend/pages/invoice.tsx
frontend/pages/invoice.tsx
복사
편집
import { useState } from "react";
import axios from "axios";

export default function InvoicePage() {
  const [classifiedFile, setClassifiedFile] = useState<File | null>(null);
  const [invoiceDayFile, setInvoiceDayFile] = useState<File | null>(null);
  const [invoiceDawnFile, setInvoiceDawnFile] = useState<File | null>(null);
  const [matchedLink, setMatchedLink] = useState<string | null>(null);
  const [unmatchedLink, setUnmatchedLink] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const handleSubmit = async () => {
    if (!classifiedFile || !invoiceDayFile) return;

    const formData = new FormData();
    formData.append("classified_file", classifiedFile);
    formData.append("invoice_day_file", invoiceDayFile);
    if (invoiceDawnFile) {
      formData.append("invoice_dawn_file", invoiceDawnFile);
    }

    const res = await axios.post("/api/invoice-match/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.success) {
      setMatchedLink(res.data.matched_file);
      setUnmatchedLink(res.data.unmatched_file);
      setStats(res.data.stats);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>송장 매칭</h1>
      <div>
        <label>분류 완료 주문 파일:</label>
        <input type="file" onChange={(e) => e.target.files && setClassifiedFile(e.target.files[0])} />
      </div>
      <div>
        <label>당일 배송 송장 파일:</label>
        <input type="file" onChange={(e) => e.target.files && setInvoiceDayFile(e.target.files[0])} />
      </div>
      <div>
        <label>새벽 배송 송장 파일 (선택):</label>
        <input type="file" onChange={(e) => e.target.files && setInvoiceDawnFile(e.target.files[0])} />
      </div>
      <button onClick={handleSubmit}>매칭 실행</button>

      {stats && (
        <div style={{ marginTop: "1rem" }}>
          <h2>통계</h2>
          <p>총 주문 수: {stats.total_orders}</p>
          <p>매칭 성공: {stats.matched}</p>
          <p>매칭 실패: {stats.unmatched}</p>
        </div>
      )}

      {matchedLink && (
        <div style={{ marginTop: "1rem" }}>
          <a href={matchedLink} download>
            매칭 결과 다운로드
          </a>
        </div>
      )}
      {unmatchedLink && (
        <div style={{ marginTop: "1rem" }}>
          <a href={unmatchedLink} download>
            미매칭 결과 다운로드
          </a>
        </div>
      )}
    </div>
);
}
23. frontend/pages/zipcode.tsx
frontend/pages/zipcode.tsx
복사
편집
import { useState, useEffect } from "react";
import axios from "axios";

export default function ZipcodePage() {
  const [dayFile, setDayFile] = useState<File | null>(null);
  const [dawnFile, setDawnFile] = useState<File | null>(null);
  const [info, setInfo] = useState<any>(null);

  const fetchInfo = async () => {
    const res = await axios.get("/api/zipcode/");
    setInfo(res.data);
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const uploadDay = async () => {
    if (!dayFile) return;
    const formData = new FormData();
    formData.append("file", dayFile);
    const res = await axios.post("/api/zipcode/day", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.success) {
      fetchInfo();
    }
  };

  const uploadDawn = async () => {
    if (!dawnFile) return;
    const formData = new FormData();
    formData.append("file", dawnFile);
    const res = await axios.post("/api/zipcode/dawn", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.success) {
      fetchInfo();
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>우편번호 관리</h1>
      <div>
        <label>당일배송 우편번호 교체:</label>
        <input type="file" onChange={(e) => e.target.files && setDayFile(e.target.files[0])} />
        <button onClick={uploadDay}>업로드</button>
      </div>
      <div>
        <label>새벽배송 우편번호 교체:</label>
        <input type="file" onChange={(e) => e.target.files && setDawnFile(e.target.files[0])} />
        <button onClick={uploadDawn}>업로드</button>
      </div>
      {info && (
        <div style={{ marginTop: "1rem" }}>
          <p>당일 우편번호 개수: {info.day_count}</p>
          <p>새벽 우편번호 개수: {info.dawn_count}</p>
          <p>당일 파일명: {info.day_filename}</p>
          <p>새벽 파일명: {info.dawn_filename}</p>
        </div>
      )}
    </div>
);
}
24. frontend/pages/api-key.tsx
frontend/pages/api
복사
편집
import { useState, useEffect } from "react";
import axios from "axios";

export default function ApiKeyPage() {
  const [currentMasked, setCurrentMasked] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const fetchKey = async () => {
    const res = await axios.get("/api/api-key/");
    setCurrentMasked(res.data.masked);
  };

  useEffect(() => {
    fetchKey();
  }, []);

  const handleSubmit = async () => {
    if (!newKey) return;
    const res = await axios.put("/api/api-key/", { new_key: newKey });
    if (res.data.success) {
      setMessage("API 키가 성공적으로 변경되었습니다.");
      setNewKey("");
      fetchKey();
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>API 키 관리</h1>
      <div>
        <p>현재 키(마스킹): {currentMasked || "등록된 키가 없습니다."}</p>
      </div>
      <div>
        <label>새 API 키 입력:</label>
        <input type="text" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
      </div>
      <button onClick={handleSubmit}>변경</button>
      {message && <p style={{ color: "green" }}>{message}</p>}
    </div>
);
}
25. frontend/pages/data-management.tsx
frontend/pages/data
복사
편집
import { useState, useEffect } from "react";
import axios from "axios";

export default function DataManagementPage() {
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<any[]>([]);

  const fetchFiles = async () => {
    const res = await axios.get("/api/data/list");
    setFiles(res.data);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/api/data/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (res.data.success) {
      fetchFiles();
      setFile(null);
    }
  };

  const handleDownload = (filename: string) => {
    window.location.href = `/api/data/download/${filename}`;
  };

  const handleDelete = async (filename: string) => {
    const res = await axios.delete(`/api/data/${filename}`);
    if (res.data.success) {
      fetchFiles();
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>데이터 관리</h1>
      <div>
        <label>파일 업로드:</label>
        <input type="file" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
        <button onClick={handleUpload}>업로드</button>
      </div>
      <h2 style={{ marginTop: "2rem" }}>파일 목록</h2>
      <table border={1} cellPadding={8} cellSpacing={0}>
        <thead>
          <tr>
            <th>파일명</th>
            <th>크기(byte)</th>
            <th>수정일(Unix타임)</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.filename}>
              <td>{f.filename}</td>
              <td>{f.size}</td>
              <td>{new Date(f.modified * 1000).toLocaleString()}</td>
              <td>
                <button onClick={() => handleDownload(f.filename)}>다운로드</button>
                <button onClick={() => handleDelete(f.filename)} style={{ marginLeft: "0.5rem" }}>
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
);
}

이프로젝트에 사용중인 mcp를 적극 활용하세요