import csv
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_zip_codes(zip_path: str) -> set:
    """
    CSV 파일(.csv)에 줄 단위로 적힌 우편번호를 정수 집합으로 반환.
    """
    zips = set()
    
    if not os.path.exists(zip_path):
        logger.warning(f"우편번호 파일이 존재하지 않음: {zip_path}")
        return zips
        
    try:
        logger.info(f"우편번호 파일 로드 시작: {zip_path}")
        
        # 여러 인코딩 시도
        encodings = ["utf-8-sig", "utf-8", "cp949", "euc-kr"]
        success = False
        
        for encoding in encodings:
            try:
                with open(zip_path, newline="", encoding=encoding) as f:
                    reader = csv.reader(f)
                    for row in reader:
                        if not row:
                            continue
                        try:
                            # 행의 첫 번째 요소가 숫자인 경우 우편번호로 간주
                            zip_code = row[0].strip()
                            if zip_code.isdigit():
                                # 정수형 우편번호로 변환하여 세트에 추가
                                zips.add(int(zip_code))
                        except (ValueError, IndexError) as e:
                            logger.warning(f"우편번호 파싱 오류: {e}, 데이터: {row}")
                
                success = True
                logger.info(f"우편번호 파일 로드 성공 (인코딩: {encoding})")
                break
            except UnicodeDecodeError:
                logger.warning(f"인코딩 오류: {encoding} 인코딩으로 파일을 읽을 수 없음")
                continue
        
        if not success:
            logger.error(f"모든 인코딩으로 파일 읽기 실패: {zip_path}")
            # 바이너리 모드로 시도
            with open(zip_path, "rb") as f:
                for line in f:
                    try:
                        # 줄에서 숫자만 추출
                        line_str = line.decode('utf-8', errors='ignore').strip()
                        for word in line_str.split():
                            if word.isdigit() and len(word) == 5:  # 5자리 우편번호
                                zips.add(int(word))
                    except Exception as e:
                        logger.warning(f"바이너리 모드에서 파싱 오류: {e}")
        
        # 로그에 우편번호 샘플 출력
        zip_list = list(zips)
        zip_sample = zip_list[:10] if len(zip_list) >= 10 else zip_list
        logger.info(f"우편번호 {len(zips)}개 로드 완료: {zip_path}")
        logger.info(f"샘플 우편번호: {zip_sample}")
        
        return zips
    except Exception as e:
        logger.error(f"우편번호 파일 로드 오류: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return zips

def load_exclusive_dawn_zips(dawn_path: str, day_path: str) -> set:
    """
    새벽배송 우편번호에서 당일배송 우편번호를 제외한 집합을 반환합니다.
    이렇게 하면 우편번호 중복으로 인한 분류 문제를 방지할 수 있습니다.
    
    Parameters:
    - dawn_path: 새벽배송 우편번호 파일 경로
    - day_path: 당일배송 우편번호 파일 경로
    
    Returns:
    - 당일배송 우편번호를 제외한 새벽배송 우편번호 집합
    """
    dawn_zips = load_zip_codes(dawn_path)
    day_zips = load_zip_codes(day_path)
    
    # 당일배송 우편번호 제외
    exclusive_dawn_zips = dawn_zips - day_zips
    
    logger.info(f"새벽배송 우편번호: {len(dawn_zips)}개")
    logger.info(f"당일배송 우편번호: {len(day_zips)}개")
    logger.info(f"당일배송 제외 후 새벽배송 우편번호: {len(exclusive_dawn_zips)}개")
    
    return exclusive_dawn_zips 