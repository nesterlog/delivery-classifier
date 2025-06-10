import os
import pandas as pd
from openpyxl import Workbook
from difflib import SequenceMatcher
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

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
    logger.info(f"파일 읽기 시도: {file_path}")
    
    if not os.path.exists(file_path):
        logger.error(f"파일이 존재하지 않음: {file_path}")
        raise ValueError(f"파일이 존재하지 않습니다: {file_path}")
    
    if os.path.getsize(file_path) == 0:
        logger.error(f"파일이 비어 있음: {file_path}")
        raise ValueError(f"파일이 비어 있습니다: {file_path}")
    
    ext = os.path.splitext(file_path)[1].lower()
    logger.info(f"파일 확장자: {ext}")
    
    try:
        if ext == ".xls":
            logger.info(f".xls 파일을 .xlsx로 변환 시도: {file_path}")
            file_path = convert_xls_to_xlsx(file_path)
            logger.info(f"변환된 파일 경로: {file_path}")
        
        if ext in [".xlsx", ".xls"]:
            logger.info(f"Excel 파일 읽기 시도: {file_path}")
            try:
                df = pd.read_excel(file_path, engine="openpyxl")
                logger.info(f"Excel 파일 읽기 성공: 행 수={len(df)}, 열 수={len(df.columns)}")
                return df
            except Exception as e:
                logger.error(f"Excel 파일 읽기 실패: {str(e)}")
                raise ValueError(f"Excel 파일 형식이 올바르지 않습니다: {str(e)}")
        
        elif ext == ".csv":
            logger.info(f"CSV 파일 읽기 시도: {file_path}")
            try:
                # UTF-8 인코딩으로 시도
                df = pd.read_csv(file_path, encoding="utf-8-sig")
                logger.info(f"CSV 파일 읽기 성공(UTF-8): 행 수={len(df)}, 열 수={len(df.columns)}")
                return df
            except UnicodeDecodeError:
                # CP949 인코딩으로 시도
                logger.info(f"UTF-8 디코딩 실패, CP949로 시도: {file_path}")
                try:
                    df = pd.read_csv(file_path, encoding="cp949")
                    logger.info(f"CSV 파일 읽기 성공(CP949): 행 수={len(df)}, 열 수={len(df.columns)}")
                    return df
                except Exception as e:
                    logger.error(f"CP949 인코딩으로도 CSV 파일 읽기 실패: {str(e)}")
                    raise ValueError(f"CSV 파일 인코딩을 처리할 수 없습니다: {str(e)}")
            except Exception as e:
                logger.error(f"CSV 파일 읽기 실패: {str(e)}")
                raise ValueError(f"CSV 파일 형식이 올바르지 않습니다: {str(e)}")
        
        else:
            logger.error(f"지원하지 않는 파일 확장자: {ext}")
            raise ValueError(f"지원하지 않는 파일 형식입니다: {ext} (지원: .xlsx, .xls, .csv)")
    
    except Exception as e:
        logger.error(f"파일 읽기 중 예상치 못한 오류 발생: {str(e)}")
        raise ValueError(f"파일을 처리하는 중 오류가 발생했습니다: {str(e)}")

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