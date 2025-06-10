from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
import os, time
from services.classifier_service import classify_delivery
from utils.file_utils import read_excel_file, auto_map_col, find_column
from fastapi.responses import JSONResponse
import logging
import pandas as pd

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# 절대 경로 사용
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SYSTEM_DATA_DIR = os.path.join(BASE_DIR, "data", "system")
USER_DATA_DIR = os.path.join(BASE_DIR, "data", "user")
TMP_DIR = os.path.join(BASE_DIR, "tmp")

# 분류 상태 저장용 글로벌 변수
classify_status = {
    "status": "idle",  # idle, processing, completed, error
    "progress": 0,     # 0-100
    "message": "",
    "start_time": None,
    "end_time": None,
    "stats": None,     # 분류 통계 정보
    "result_files": [] # 분류 결과 파일 목록
}

@router.post("/analyze-columns")
async def analyze_columns(file: UploadFile = File(...)):
    """
    업로드된 엑셀/CSV 파일의 헤더 컬럼을 분석하여 반환
    """
    logger.info(f"파일 분석 시작: {file.filename}")
    os.makedirs(TMP_DIR, exist_ok=True)
    file_path = os.path.join(TMP_DIR, file.filename)
    
    with open(file_path, "wb+") as buffer:
        buffer.write(await file.read())
    
    try:
        df = read_excel_file(file_path)
        columns = list(df.columns)
        logger.info(f"파일 컬럼 추출 성공: {columns}")
        
        # 주소 관련 컬럼 자동 감지 시도
        address_candidates = [
            '받는분주소', '받는분 주소', '수취인주소', '수취인 주소', '주소', 
            '배송지주소', '배송지 주소', '수령인 주소(전체)', '수령인 주소', '수령인주소'
        ]
        
        detected_address_column = None
        try:
            detected_address_column = find_column(df, address_candidates)
            logger.info(f"주소 컬럼 자동 감지: {detected_address_column}")
        except:
            logger.warning("주소 컬럼 자동 감지 실패")
            pass
            
        return JSONResponse({
            "success": True,
            "columns": columns,
            "detected_address_column": detected_address_column
        })
    except Exception as e:
        logger.error(f"파일 분석 실패: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status")
async def get_status():
    """
    현재 분류 작업의 상태를 반환
    """
    # 완료된 경우 결과 파일 경로도 함께 반환
    response = classify_status.copy()
    if response["status"] == "completed" and "result_files" in response:
        # 통계 정보 업데이트 - 실제 파일 저장 후 카운트된 행 수로 업데이트
        if "stats" in response:
            stats = response["stats"]
            
            # 필요한 키가 없는 경우 기본값 설정
            if "dawn_count" not in stats:
                stats["dawn_count"] = 0
            if "day_count" not in stats:
                stats["day_count"] = 0
            if "unclassified_count" not in stats:
                stats["unclassified_count"] = 0
            if "total_count" not in stats:
                stats["total_count"] = stats["dawn_count"] + stats["day_count"] + stats.get("unclassified_count", 0)
            
            # 다운로드 파일 목록에서 각 파일 유형별 행 수 확인
            for file_info in response["result_files"]:
                if file_info["type"] == "dawn":
                    stats["dawn_count"] = file_info["count"]
                elif file_info["type"] == "day":
                    stats["day_count"] = file_info["count"]
                elif file_info["type"] == "unclassified" or file_info["type"] == "other":
                    stats["unclassified_count"] = file_info["count"]
            
            # 전체 카운트 다시 계산
            stats["total_count"] = stats["dawn_count"] + stats["day_count"] + stats["unclassified_count"]
    
    return response

def run_classification_task(
    file_path, 
    address_column,
    request_type, 
    msg_type, 
    cycle,
    dawn_zip_path, 
    day_zip_path,
    classify_mode,
    progress_callback=None
):
    """
    백그라운드에서 실행할 분류 작업
    """
    try:
        logger.info(f"분류 작업 시작: {file_path}, 주소 컬럼: {address_column}, 모드: {classify_mode}")
        
        classify_status["message"] = "파일 분석 중..."
        
        def progress_callback_wrapper(value):
            classify_status["progress"] = value
            if progress_callback:
                progress_callback(value)
        
        # 분류 모드에 따른 처리
        if classify_mode == "day_and_dawn":
            # 일괄구분(당일&새벽)
            from services.classifier_service import classify_day_and_dawn
            
            result_path = classify_day_and_dawn(
                file_path=file_path,
                address_col=address_column,
                progress_callback=progress_callback_wrapper
            )
            
            if result_path:
                # 파일에서 행 수 확인
                import pandas as pd
                result_df = pd.read_excel(result_path)
                total_count = len(result_df)
                
                # 집하지점코드로 구분
                day_count = len(result_df[result_df['집하지점코드'] == ''])
                dawn_count = len(result_df[result_df['집하지점코드'] == '108'])
                
                stats = {
                    'total': total_count,
                    'day_count': day_count,
                    'dawn_count': dawn_count,
                    'delivery_count': 0,
                    'unclassified_count': 0
                }
                
                result_files = [{
                    "type": "day_dawn",
                    "path": f"/api/data/download/{os.path.basename(result_path)}",
                    "filename": os.path.basename(result_path),
                    "count": total_count
                }]
                
                output_paths = [result_path]
            else:
                stats = {'total': 0, 'day_count': 0, 'dawn_count': 0, 'delivery_count': 0, 'unclassified_count': 0}
                result_files = []
                output_paths = []
        
        elif classify_mode == "all_types":
            # 당일&새벽&택배 한방양식 구분
            from services.classifier_service import classify_all_delivery_types
            
            result_path = classify_all_delivery_types(
                file_path=file_path,
                address_col=address_column,
                progress_callback=progress_callback_wrapper
            )
            
            if result_path:
                # 파일에서 행 수 확인
                import pandas as pd
                result_df = pd.read_excel(result_path)
                total_count = len(result_df)
                
                # 집하지점코드로 구분
                day_count = len(result_df[result_df['집하지점코드'] == ''])
                dawn_count = len(result_df[result_df['집하지점코드'] == '108'])
                delivery_count = len(result_df[result_df['집하지점코드'] == '105'])
                
                stats = {
                    'total': total_count,
                    'day_count': day_count,
                    'dawn_count': dawn_count,
                    'delivery_count': delivery_count,
                    'unclassified_count': 0
                }
                
                result_files = [{
                    "type": "all_types",
                    "path": f"/api/data/download/{os.path.basename(result_path)}",
                    "filename": os.path.basename(result_path),
                    "count": total_count
                }]
                
                output_paths = [result_path]
                
                # 주소오류 파일도 확인
                error_file = result_path.replace('당일새벽택배한방양식', '주소오류_미분류')
                if os.path.exists(error_file):
                    error_df = pd.read_excel(error_file)
                    error_count = len(error_df)
                    stats['unclassified_count'] = error_count
                    result_files.append({
                        "type": "unclassified",
                        "path": f"/api/data/download/{os.path.basename(error_file)}",
                        "filename": os.path.basename(error_file),
                        "count": error_count
                    })
                    output_paths.append(error_file)
            else:
                stats = {'total': 0, 'day_count': 0, 'dawn_count': 0, 'delivery_count': 0, 'unclassified_count': 0}
                result_files = []
                output_paths = []
        
        else:
            # 기존 개별 분류 (all, day, dawn)
            from services.classifier_service import classify_delivery
            
            # 상세주소 컬럼 자동 감지
            import pandas as pd
            df = pd.read_excel(file_path, dtype=str)
            detail_col = None
            detail_candidates = ['수령자 상세주소', '수령인 상세주소*', '상세주소', '상세 주소', '수령인상세주소', '받는분상세주소', '수령인 상세 주소', '수령자 상세 주소']
            
            for candidate in detail_candidates:
                if candidate in df.columns:
                    detail_col = candidate
                    logger.info(f"상세주소 컬럼 자동 감지: {detail_col}")
                    break
            
            if not detail_col:
                logger.info("상세주소 컬럼을 찾을 수 없음")
            
            results = classify_delivery(
                file_path=file_path, 
                address_col=address_column, 
                detail_col=detail_col,  # 자동으로 찾은 상세주소 컬럼
                classify_mode=classify_mode,
                chasu=str(cycle) + "차" if cycle > 0 else None,
                dawn_type=request_type,
                sms_type=msg_type,
                progress_callback=progress_callback_wrapper
            )
            
            # 반환값 파싱
            output_paths = results.get('saved_files', [])
            stats = {
                'total': results.get('total', 0),
                'day_count': results.get('day_count', 0), 
                'dawn_count': results.get('dawn_count', 0),
                'delivery_count': results.get('delivery_count', 0),
                'unclassified_count': results.get('unclassified_count', 0)
            }
            
            # 결과 파일 정보 생성 (웹에서 접근 가능한 형태로 변환)
            result_files = []
            if output_paths:
                for file_path_item in output_paths:
                    file_name = os.path.basename(file_path_item)
                    file_type = "unclassified"  # 기본값
                    count = 0
                    
                    # 파일명으로 타입 판단
                    if "당일배송" in file_name:
                        file_type = "day"
                        count = stats['day_count']
                    elif "새벽배송" in file_name:
                        file_type = "dawn"
                        count = stats['dawn_count']
                    elif "택배배송" in file_name:
                        file_type = "delivery"
                        count = stats['delivery_count']
                    elif "주소오류" in file_name or "미분류" in file_name:
                        file_type = "unclassified"
                        count = stats['unclassified_count']
                    
                    # 웹에서 접근 가능한 URL로 변환
                    download_url = f"/api/data/download/{file_name}"
                    
                    result_files.append({
                        "type": file_type,
                        "path": download_url,
                        "filename": file_name,
                        "count": count
                    })
        
        # 택배배송 파일도 저장됨
        if stats['delivery_count'] > 0:
            logger.info(f"택배배송 {stats['delivery_count']}건 분류됨")
        
        classify_status["status"] = "completed"
        classify_status["message"] = f"분류 완료. {len(result_files)}개 파일 생성됨."
        classify_status["end_time"] = time.time()
        classify_status["progress"] = 100
        classify_status["stats"] = stats
        classify_status["result_files"] = result_files
        
        logger.info(f"분류 완료: {output_paths}, 통계: {stats}")
        return output_paths, stats
        
    except Exception as e:
        logger.error(f"분류 작업 중 오류 발생: {str(e)}")
        classify_status["status"] = "error"
        classify_status["message"] = f"오류 발생: {str(e)}"
        classify_status["end_time"] = time.time()
        raise e

@router.post("/")
async def classify(
    file: UploadFile = File(...),
    address_column: str = Form(...),
    request_type: str = Form(...),
    msg_type: str = Form(...),
    cycle: int = Form(...),
    classify_mode: str = Form(...),
    background_tasks: BackgroundTasks = None,
):
    """
    배송분류 실행 엔드포인트:
    - file: 주문 원본 파일(.csv/.xlsx/.xls)
    - address_column: 주소가 있는 컬럼명
    - request_type: 배송대행/택배대행
    - msg_type: 즉시전송/7시전송
    - cycle: 차수 (0은 차수없음)
    - classify_mode: 분류 모드 (all, day, dawn, day_and_dawn, all_delivery_types)
    """
    global classify_status
    
    # 파일 확장자 체크
    file_ext = os.path.splitext(file.filename)[1].lower()
    logger.info(f"업로드된 파일 이름: {file.filename}, 확장자: {file_ext}")
    
    if file_ext not in ['.xlsx', '.xls', '.csv']:
        logger.error(f"지원하지 않는 파일 형식: {file_ext}")
        raise HTTPException(status_code=400, detail=f"지원하지 않는 파일 형식입니다. .xlsx, .xls 또는 .csv 파일만 업로드해주세요.")
    
    tmp_dir = os.path.join(BASE_DIR, "tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    
    # 파일 저장
    file_path = os.path.join(tmp_dir, file.filename)
    try:
        content = await file.read()
        logger.info(f"파일 크기: {len(content)} 바이트")
        
        if len(content) == 0:
            logger.error("파일이 비어있습니다.")
            raise HTTPException(status_code=400, detail="파일이 비어있습니다.")
        
        with open(file_path, "wb+") as buffer:
            buffer.write(content)
        
        logger.info(f"파일 저장 완료: {file_path}")
        
        # 파일이 유효한지 검증 시도
        try:
            test_df = read_excel_file(file_path)
            if test_df.empty:
                logger.error("파일에 데이터가 없습니다.")
                raise HTTPException(status_code=400, detail="파일에 데이터가 없습니다.")
            
            logger.info(f"파일 검증 성공: 행 수={len(test_df)}, 열 수={len(test_df.columns)}")
            if address_column not in test_df.columns:
                available_columns = ", ".join(test_df.columns.tolist())
                logger.error(f"주소 컬럼 '{address_column}'을 찾을 수 없습니다. 사용 가능한 컬럼: {available_columns}")
                raise HTTPException(
                    status_code=400, 
                    detail=f"주소 컬럼 '{address_column}'을 찾을 수 없습니다. 사용 가능한 컬럼: {available_columns}"
                )
        except ValueError as e:
            logger.error(f"파일 형식 검증 실패: {str(e)}")
            raise HTTPException(status_code=400, detail=f"파일 형식이 올바르지 않습니다: {str(e)}")
        except Exception as e:
            logger.error(f"파일 검증 중 오류 발생: {str(e)}")
            raise HTTPException(status_code=400, detail=f"파일 처리 중 오류가 발생했습니다: {str(e)}")
    
    except Exception as e:
        logger.error(f"파일 업로드 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"파일 업로드 중 오류가 발생했습니다: {str(e)}")
    
    logger.info(f"분류 작업 시작: {file_path}, 주소 컬럼: {address_column}, 모드: {classify_mode}")
    
    # 우편번호 파일 경로
    dawn_zip_path = os.path.join(SYSTEM_DATA_DIR, "dawn_zip.csv")
    day_zip_path = os.path.join(SYSTEM_DATA_DIR, "day_zip.csv")
    
    logger.info(f"우편번호 파일 경로: 당일={day_zip_path}, 새벽={dawn_zip_path}")
    logger.info(f"파일 존재 확인: 당일={os.path.exists(day_zip_path)}, 새벽={os.path.exists(dawn_zip_path)}")
    
    # 상태 초기화
    classify_status["status"] = "processing"
    classify_status["progress"] = 0
    classify_status["message"] = "분류 작업을 시작합니다..."
    classify_status["start_time"] = time.time()
    classify_status["end_time"] = None
    classify_status["stats"] = None
    classify_status["result_files"] = []
    
    # 백그라운드 작업 처리
    logger.info("백그라운드 작업 시작")
    
    def progress_callback(value):
        classify_status["progress"] = value
    
    if background_tasks:
        background_tasks.add_task(
            run_classification_task,
            file_path=file_path,
            address_column=address_column,
            request_type=request_type,
            msg_type=msg_type,
            cycle=cycle,
            dawn_zip_path=dawn_zip_path,
            day_zip_path=day_zip_path,
            classify_mode=classify_mode
        )
    else:
        # 즉시 실행
        run_classification_task(
            file_path=file_path,
            address_column=address_column,
            request_type=request_type,
            msg_type=msg_type,
            cycle=cycle,
            dawn_zip_path=dawn_zip_path,
            day_zip_path=day_zip_path,
            classify_mode=classify_mode
        )
    
    return {"success": True, "message": "분류 작업이 시작되었습니다."} 