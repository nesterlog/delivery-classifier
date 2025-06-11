from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os
import json
import logging
import requests
from pydantic import BaseModel

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 절대 경로로 변경
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYSTEM_DATA_DIR = os.path.join(BASE_DIR, "data", "system")
API_KEY_FILE = os.path.join(SYSTEM_DATA_DIR, "api_keys.json")

logger.info(f"API 키 라우터 초기화 - 시스템 데이터 디렉토리: {SYSTEM_DATA_DIR}")
logger.info(f"API 키 파일 경로: {API_KEY_FILE}")

# API 키 업데이트 요청 모델
class ApiKeyUpdate(BaseModel):
    new_key: str

def _load_api_keys():
    """API 키 파일에서 저장된 키를 로드합니다."""
    try:
        os.makedirs(SYSTEM_DATA_DIR, exist_ok=True)
        if not os.path.exists(API_KEY_FILE):
            # 파일이 없으면 빈 데이터로 초기화
            with open(API_KEY_FILE, 'w', encoding='utf-8') as f:
                json.dump({"kakao": "", "naver": ""}, f, ensure_ascii=False, indent=2)
            logger.info(f"API 키 파일 생성: {API_KEY_FILE}")
            
        with open(API_KEY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            logger.info(f"API 키 로드 완료: {list(data.keys())}")
            return data
    except Exception as e:
        logger.error(f"API 키 로드 오류: {str(e)}")
        return {"kakao": "", "naver": ""}

def _save_api_keys(data):
    """API 키를 파일에 저장합니다."""
    try:
        os.makedirs(SYSTEM_DATA_DIR, exist_ok=True)
        with open(API_KEY_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"API 키 저장 완료: {list(data.keys())}")
        return True
    except Exception as e:
        logger.error(f"API 키 저장 오류: {str(e)}")
        return False

@router.get("/")
async def get_api_keys():
    """
    저장된 모든 API 키를 조회합니다.
    """
    try:
        api_keys = _load_api_keys()
        # 보안을 위해 마스킹된 값만 반환
        masked_keys = {}
        for key, value in api_keys.items():
            if value and len(value) > 4:
                masked_keys[key] = "*" * (len(value) - 4) + value[-4:]
            else:
                masked_keys[key] = value
        
        return {"masked": masked_keys.get("kakao", "")}
    except Exception as e:
        logger.error(f"API 키 조회 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API 키 조회 실패: {str(e)}")

@router.get("/status")
async def get_api_key_status():
    """
    API 키 설정 상태와 작동 여부를 확인합니다. (로그인 불필요)
    """
    try:
        api_keys = _load_api_keys()
        kakao_key = api_keys.get("kakao", "")
        
        has_key = bool(kakao_key and kakao_key.strip())
        is_working = False
        
        if has_key:
            # 카카오 API 테스트 호출
            try:
                test_url = "https://dapi.kakao.com/v2/local/search/address.json"
                headers = {"Authorization": f"KakaoAK {kakao_key}"}
                params = {"query": "서울특별시 강남구 테헤란로 152"}
                
                response = requests.get(test_url, headers=headers, params=params, timeout=5)
                is_working = response.status_code == 200
                
                if response.status_code == 200:
                    logger.info("카카오 API 연결 테스트 성공")
                else:
                    logger.warning(f"카카오 API 연결 테스트 실패: {response.status_code}")
                    
            except Exception as api_error:
                logger.error(f"카카오 API 테스트 오류: {str(api_error)}")
                is_working = False
        
        return {
            "hasKey": has_key,
            "isWorking": is_working,
            "message": "API 키 상태 확인 완료"
        }
    except Exception as e:
        logger.error(f"API 키 상태 확인 오류: {str(e)}")
        return {
            "hasKey": False,
            "isWorking": False,
            "message": f"상태 확인 실패: {str(e)}"
        }

@router.put("/")
async def update_api_key_put(update_data: ApiKeyUpdate):
    """
    API 키를 업데이트합니다. (PUT 메서드)
    """
    try:
        logger.info(f"API 키 업데이트 요청 (PUT)")
        api_keys = _load_api_keys()
        
        # 카카오 API 키 업데이트
        api_keys["kakao"] = update_data.new_key
            
        success = _save_api_keys(api_keys)
        if not success:
            raise Exception("API 키 저장 실패")
            
        return JSONResponse({"success": True, "message": "API 키가 업데이트되었습니다."})
    except Exception as e:
        logger.error(f"API 키 업데이트 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API 키 업데이트 실패: {str(e)}")

@router.post("/update")
async def update_api_key(key_data: dict):
    """
    API 키를 업데이트하거나 추가합니다.
    """
    try:
        logger.info(f"API 키 업데이트 요청: {key_data}")
        api_keys = _load_api_keys()
        
        # 키 데이터 병합
        for key, value in key_data.items():
            api_keys[key] = value
            
        success = _save_api_keys(api_keys)
        if not success:
            raise Exception("API 키 저장 실패")
            
        return JSONResponse({"success": True, "message": "API 키가 업데이트되었습니다."})
    except Exception as e:
        logger.error(f"API 키 업데이트 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API 키 업데이트 실패: {str(e)}")

@router.delete("/{key_name}")
async def delete_api_key(key_name: str):
    """
    특정 API 키를 삭제합니다.
    """
    try:
        logger.info(f"API 키 삭제 요청: {key_name}")
        api_keys = _load_api_keys()
        
        if key_name in api_keys:
            del api_keys[key_name]
            success = _save_api_keys(api_keys)
            if not success:
                raise Exception("API 키 저장 실패")
            return JSONResponse({"success": True, "message": f"{key_name} API 키가 삭제되었습니다."})
        else:
            return JSONResponse({"success": False, "message": f"{key_name} API 키를 찾을 수 없습니다."}, status_code=404)
    except Exception as e:
        logger.error(f"API 키 삭제 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"API 키 삭제 실패: {str(e)}") 