from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import pandas as pd
import os
import tempfile
import shutil
from datetime import datetime
import logging
import difflib
import re
from difflib import SequenceMatcher
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

def clean_address_for_matching(address):
    """주소를 매칭용으로 정리 - GUI와 동일"""
    if pd.isna(address):
        return ''
    s = str(address).lower()
    s = re.sub(r'\([^)]*\)', '', s)
    s = re.sub(r'\[[^\]]*\]', '', s)
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[^\w가-힣\s\-\.]', '', s)
    return s.strip()

def calculate_similarity(s1, s2):
    """두 문자열의 유사도 계산 - GUI와 동일"""
    if pd.isna(s1) or pd.isna(s2):
        return 0
    return SequenceMatcher(None, str(s1), str(s2)).ratio()

def auto_map_col(df, std_names, force_addr=False):
    """컬럼 자동 매핑 - GUI와 완전 동일한 로직"""
    if force_addr:
        addr_cols = [col for col in df.columns if '주소' in str(col)]
        for c in std_names:
            for col in addr_cols:
                if c == col:
                    return col
        # 부분일치
        def normalize(s):
            import re
            return re.sub(r'[^\w]', '', str(s)).lower()
        norm_std = [normalize(c) for c in std_names]
        for col in addr_cols:
            ncol = normalize(col)
            for nstd, std in zip(norm_std, std_names):
                if nstd in ncol or ncol in nstd:
                    return col
        if addr_cols:
            return addr_cols[0]  # fallback: 주소 포함된 첫 컬럼
    
    # 기존 로직
    for c in std_names:
        if c in df.columns:
            return c
    
    def normalize(s):
        import re
        return re.sub(r'[^\w]', '', str(s)).lower()
    
    norm_std = [normalize(c) for c in std_names]
    for col in df.columns:
        ncol = normalize(col)
        for nstd, std in zip(norm_std, std_names):
            if nstd in ncol or ncol in nstd:
                return col
    
    matches = difflib.get_close_matches(std_names[0], df.columns, n=1, cutoff=0.7)
    if matches:
        return matches[0]
    return None

def find_best_match(order_row, invoice_df, threshold=0.8, invoice_prod_col=None, order_prod_col=None, code_col=None, code_filter=None):
    """가장 유사한 송장 정보 찾기 (상품주문번호까지 포함, 1:1 매칭) - GUI와 완전 동일"""
    name = order_row['__clean_name']
    addr = order_row['__clean_addr']
    order_prod_code = order_row.get(order_prod_col, None) if order_prod_col else None
    logger.debug(f"매칭 시도: 주문번호({order_prod_col})={order_prod_code}")
    
    # 1. 집하지점코드 등 필터 적용
    candidates = invoice_df[invoice_df['matched'] == False]
    if code_col and code_filter is not None:
        if code_filter == '':
            # 당일배송: 집하지점코드가 105, 108이 아닌 것
            candidates = candidates[
                ~candidates[code_col].astype(str).str.startswith('105') &
                ~candidates[code_col].astype(str).str.startswith('108')
            ]
        else:
            candidates = candidates[candidates[code_col].astype(str).str.startswith(str(code_filter))]
    
    # 2. 상품주문번호까지 포함해서 후보 필터링
    if order_prod_code and invoice_prod_col and invoice_prod_col in candidates.columns:
        prod_candidates = candidates[candidates[invoice_prod_col].astype(str) == str(order_prod_code)]
        if not prod_candidates.empty:
            candidates = prod_candidates
            logger.debug(f"상품주문번호 기준 후보 수: {len(candidates)} (송장번호 컬럼: {invoice_prod_col})")
        else:
            logger.debug(f"상품주문번호 매칭 실패, 전체 후보에서 검색: {len(candidates)}")
    else:
        logger.debug(f"상품주문번호 기준 후보 없음, 전체 후보 수: {len(candidates)}")
    
    # 3. 이름/주소 유사도 계산
    if not candidates.empty:
        candidates = candidates.copy()
        candidates['name_similarity'] = candidates['__clean_name'].apply(lambda x: calculate_similarity(name, x))
        candidates['addr_similarity'] = candidates['__clean_addr'].apply(lambda x: calculate_similarity(addr, x))
        
        # 4. 유사도 기준으로 필터링
        matches = candidates[(candidates['name_similarity'] >= threshold) & (candidates['addr_similarity'] >= threshold)]
        logger.debug(f"유사도 기준 통과 후보 수: {len(matches)}")
        
        if not matches.empty:
            # 5. 가장 높은 유사도 가진 행 선택 (1:1 매칭)
            best_idx = matches['name_similarity'].idxmax()  # 이 인덱스는 invoice_df의 인덱스임
            best_match = invoice_df.loc[best_idx]  # 반드시 원본에서 가져오기
            invoice_df.at[best_idx, 'matched'] = True  # 원본에 True로!
            invoice_col_name = next((col for col in ['송장번호', '운송장번호'] if col in best_match.index), '송장번호')
            logger.debug(f"매칭 성공: 송장번호={best_match.get(invoice_col_name, None)}")
            return best_match, {
                'name_similarity': candidates.loc[best_idx, 'name_similarity'],
                'addr_similarity': candidates.loc[best_idx, 'addr_similarity']
            }
    
    logger.debug(f"매칭 실패")
    return None, None

def log_matching_details(order_row, invoice_row, similarity_scores, matched=False):
    """매칭 상세 정보 로깅 - GUI와 동일"""
    log = {
        'order_name': order_row['__clean_name'],
        'order_addr': order_row['__clean_addr'],
        'invoice_name': invoice_row['__clean_name'] if invoice_row is not None else None,
        'invoice_addr': invoice_row['__clean_addr'] if invoice_row is not None else None,
        'name_similarity': similarity_scores['name_similarity'] if similarity_scores else None,
        'addr_similarity': similarity_scores['addr_similarity'] if similarity_scores else None,
        'matched': matched
    }
    logger.debug(f"매칭상세: {log}")

def analyze_matching_results(order_df, invoice_df, unmatched_rows):
    """매칭 결과 분석 - GUI와 동일"""
    analysis = {
        'total_orders': len(order_df),
        'matched_orders': len(order_df) - len(unmatched_rows),
        'unmatched_orders': len(unmatched_rows),
        'match_rate': (len(order_df) - len(unmatched_rows)) / len(order_df) * 100 if len(order_df) > 0 else 0,
        'common_mismatch_patterns': []
    }
    
    # 미매칭 패턴 분석
    for row in unmatched_rows:
        pattern = {
            'name_length': len(str(row['__clean_name'])),
            'addr_length': len(str(row['__clean_addr'])),
            'special_chars': bool(re.search(r'[^\w가-힣\s]', str(row['__clean_addr'])))
        }
        analysis['common_mismatch_patterns'].append(pattern)
    
    logger.info(f"매칭분석: 총 주문: {analysis['total_orders']}, 매칭: {analysis['matched_orders']}, "
              f"미매칭: {analysis['unmatched_orders']}, 매칭률: {analysis['match_rate']:.2f}%")
    
    return analysis

def clean_zipcode(val):
    """우편번호 5자리 문자열 변환 - GUI와 동일"""
    if pd.isna(val) or str(val).strip() in ['', 'nan', 'None']:
        return ''
    try:
        return str(int(float(val))).zfill(5)
    except:
        return str(val).zfill(5)

@router.post("/dawn-invoice-match/")
async def dawn_invoice_match(
    dawn_order_file: UploadFile = File(...),
    dawn_invoice_file: UploadFile = File(...)
):
    """새벽배송 전용 송장매칭 - GUI와 완전 동일한 로직"""
    try:
        logger.info("새벽배송 전용 송장매칭 시작")
        
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            # 파일 저장
            order_path = os.path.join(temp_dir, dawn_order_file.filename)
            invoice_path = os.path.join(temp_dir, dawn_invoice_file.filename)
            
            with open(order_path, "wb") as f:
                shutil.copyfileobj(dawn_order_file.file, f)
            with open(invoice_path, "wb") as f:
                shutil.copyfileobj(dawn_invoice_file.file, f)
            
            # 데이터 로드
            order_df = pd.read_excel(order_path)
            invoice_df = pd.read_excel(invoice_path)
            
            logger.info(f"주문 데이터: {len(order_df)}행, 송장 데이터: {len(invoice_df)}행")
            
            # 컬럼 자동 매핑 - GUI와 완전 동일
            order_name_col = auto_map_col(order_df, ['받는분', '수령인', '수취인', '수령자'])
            order_addr_col = auto_map_col(order_df, ['받는분주소', '수령인주소', '주소', '수령자 도로명 주소', '수령자 주소'], force_addr=True)
            order_prod_col = auto_map_col(order_df, ['상품주문번호', '주문번호', '거래처주문코드', '거래처 주문번호'])
            
            invoice_name_col = auto_map_col(invoice_df, ['받는분', '수령인', '수취인', '수령자'])
            invoice_addr_col = auto_map_col(invoice_df, ['받는분주소', '수령인주소', '주소', '수령자 도로명 주소', '수령자 주소'], force_addr=True)
            invoice_prod_col = auto_map_col(invoice_df, ['상품주문번호', '주문번호', '거래처주문코드', '거래처 주문번호'])
            invoice_num_col = auto_map_col(invoice_df, ['운송장번호', '송장번호'])
            
            if not all([order_name_col, order_addr_col, invoice_name_col, invoice_addr_col, invoice_num_col]):
                missing_cols = []
                if not order_name_col: missing_cols.append("주문파일-받는분")
                if not order_addr_col: missing_cols.append("주문파일-주소")
                if not invoice_name_col: missing_cols.append("송장파일-받는분")
                if not invoice_addr_col: missing_cols.append("송장파일-주소")
                if not invoice_num_col: missing_cols.append("송장파일-송장번호")
                
                raise HTTPException(
                    status_code=400,
                    detail=f"필수 컬럼을 찾을 수 없습니다: {', '.join(missing_cols)}"
                )
            
            # 매칭용 데이터 정리
            order_df['__clean_name'] = order_df[order_name_col].apply(clean_address_for_matching)
            order_df['__clean_addr'] = order_df[order_addr_col].apply(clean_address_for_matching)
            invoice_df['__clean_name'] = invoice_df[invoice_name_col].apply(clean_address_for_matching)
            invoice_df['__clean_addr'] = invoice_df[invoice_addr_col].apply(clean_address_for_matching)
            
            # 매칭 상태 초기화
            invoice_df['matched'] = False
            order_df['송장번호'] = ''
            order_df['배송사명'] = ''
            
            matched_count = 0
            unmatched_rows = []
            
            # 매칭 실행 - GUI와 완전 동일한 로직
            for idx, row in order_df.iterrows():
                name = row['__clean_name']
                addr = row['__clean_addr']
                prod_code = row[order_prod_col] if order_prod_col else None
                
                match = None
                similarity_scores = None
                
                # 1. 상품주문번호로 우선 매칭
                if order_prod_col and invoice_prod_col and pd.notna(prod_code) and str(prod_code).strip():
                    match_df = invoice_df[
                        (invoice_df[invoice_prod_col].astype(str) == str(prod_code)) & 
                        (invoice_df['matched'] == False)
                    ]
                    if not match_df.empty:
                        match = match_df.iloc[0]
                        invoice_df.at[match.name, 'matched'] = True
                        similarity_scores = {'name_similarity': 1.0, 'addr_similarity': 1.0}
                        logger.debug(f"상품번호 매칭: {prod_code}")
                
                # 2. 이름+주소 유사도 매칭
                if match is None:
                    candidates = invoice_df[invoice_df['matched'] == False].copy()
                    if not candidates.empty:
                        candidates['name_similarity'] = candidates['__clean_name'].apply(
                            lambda x: calculate_similarity(name, x)
                        )
                        candidates['addr_similarity'] = candidates['__clean_addr'].apply(
                            lambda x: calculate_similarity(addr, x)
                        )
                        
                        # 유사도 임계값 0.8 이상
                        matches = candidates[
                            (candidates['name_similarity'] >= 0.8) & 
                            (candidates['addr_similarity'] >= 0.8)
                        ]
                        
                        if not matches.empty:
                            # 가장 높은 이름 유사도 선택
                            best_idx = matches['name_similarity'].idxmax()
                            match = invoice_df.loc[best_idx]
                            invoice_df.at[best_idx, 'matched'] = True
                            similarity_scores = {
                                'name_similarity': candidates.loc[best_idx, 'name_similarity'],
                                'addr_similarity': candidates.loc[best_idx, 'addr_similarity']
                            }
                            logger.debug(f"유사도 매칭: {name} -> {match['__clean_name']}")
                
                # 매칭 결과 적용
                if match is not None:
                    order_df.at[idx, '송장번호'] = str(match[invoice_num_col])
                    order_df.at[idx, '배송사명'] = '컬리넥스트마일'
                    matched_count += 1
                    log_matching_details(row, match, similarity_scores, True)
                else:
                    unmatched_rows.append(row)
                    log_matching_details(row, None, None, False)
            
            # 통계 계산
            total = len(order_df)
            unmatched = total - matched_count
            match_rate = (matched_count / total * 100) if total > 0 else 0
            
            logger.info(f"매칭 완료: {matched_count}/{total} ({match_rate:.1f}%)")
            
            # 임시 컬럼 제거
            order_df_clean = order_df.drop(columns=['__clean_name', '__clean_addr'])
            
            # 컬럼 순서 재배치: 배송사명 -> 송장번호 순서
            cols = list(order_df_clean.columns)
            if '배송사명' in cols and '송장번호' in cols:
                cols.remove('배송사명')
                cols.remove('송장번호')
                cols.append('배송사명')
                cols.append('송장번호')
                order_df_clean = order_df_clean[cols]
            
            # 매칭/미매칭 데이터 분리
            matched_df = order_df_clean[
                (order_df_clean['송장번호'].notna()) & 
                (order_df_clean['송장번호'] != '')
            ]
            unmatched_df = order_df_clean[
                (order_df_clean['송장번호'].isna()) | 
                (order_df_clean['송장번호'] == '')
            ]
            
            # 우편번호 5자리 변환
            for df in [matched_df, unmatched_df]:
                if '우편번호' in df.columns:
                    df['우편번호'] = df['우편번호'].apply(clean_zipcode)
            
            # 미매칭 사유 컬럼 추가
            if not unmatched_df.empty:
                unmatched_df = unmatched_df.copy()
                unmatched_df['미매칭사유'] = '매칭실패'
            
            # 결과 파일 저장
            result_dir = os.path.join('data', 'user')
            os.makedirs(result_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            matched_filename = f"새벽송장매칭완료_{timestamp}.xlsx"
            unmatched_filename = f"새벽송장미매칭_{timestamp}.xlsx"
            
            matched_path = os.path.join(result_dir, matched_filename)
            unmatched_path = os.path.join(result_dir, unmatched_filename)
            
            # 파일 저장
            matched_df.to_excel(matched_path, index=False)
            if not unmatched_df.empty:
                unmatched_df.to_excel(unmatched_path, index=False)
            
            return {
                "success": True,
                "message": "새벽배송 송장매칭이 완료되었습니다.",
                "stats": {
                    "total_orders": total,
                    "matched": matched_count,
                    "unmatched": unmatched,
                    "match_rate": round(match_rate, 1)
                },
                "matched_file": f"/api/files/download/{matched_filename}",
                "unmatched_file": f"/api/files/download/{unmatched_filename}" if not unmatched_df.empty else None
            }
            
    except Exception as e:
        logger.error(f"새벽배송 송장매칭 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"매칭 처리 중 오류가 발생했습니다: {str(e)}")

@router.post("/invoice-match/")
async def general_invoice_match(
    classified_file: UploadFile = File(...),
    invoice_day_file: UploadFile = File(...),
    invoice_dawn_file: UploadFile = File(None)
):
    """일반 송장매칭 - GUI와 완전 동일한 로직으로 구현"""
    try:
        logger.info("일반 송장매칭 시작")
        
        # 임시 디렉토리 생성
        with tempfile.TemporaryDirectory() as temp_dir:
            # 파일 저장
            classified_path = os.path.join(temp_dir, classified_file.filename)
            day_invoice_path = os.path.join(temp_dir, invoice_day_file.filename)
            
            with open(classified_path, "wb") as f:
                shutil.copyfileobj(classified_file.file, f)
            with open(day_invoice_path, "wb") as f:
                shutil.copyfileobj(invoice_day_file.file, f)
            
            dawn_invoice_path = None
            if invoice_dawn_file:
                dawn_invoice_path = os.path.join(temp_dir, invoice_dawn_file.filename)
                with open(dawn_invoice_path, "wb") as f:
                    shutil.copyfileobj(invoice_dawn_file.file, f)
            
            # 데이터 로드
            order_df = pd.read_excel(classified_path)
            day_df = pd.read_excel(day_invoice_path)
            dawn_df = None
            
            if dawn_invoice_path:
                dawn_df = pd.read_excel(dawn_invoice_path)
                logger.info(f"새벽송장: {len(dawn_df)}행")
            
            logger.info(f"분류된 주문: {len(order_df)}행, 당일송장: {len(day_df)}행")
            
            # 컬럼 자동 매핑 - GUI와 완전 동일
            if day_df is not None:
                day_name_col = auto_map_col(day_df, ['받는분', '수령인', '수취인'])
                day_addr_col = auto_map_col(day_df, ['받는분주소', '수령인주소', '주소'], force_addr=True)
                day_code_col = auto_map_col(day_df, ['배송점', '집하지점코드'])
                day_invoice_col = auto_map_col(day_df, ['송장번호', '운송장번호'])
                
                if not all([day_name_col, day_addr_col, day_code_col, day_invoice_col]):
                    raise HTTPException(
                        status_code=400,
                        detail=f"당일&택배 송장 파일의 실제 컬럼명: {list(day_df.columns)}"
                    )
                    
                day_df['__clean_name'] = day_df[day_name_col].apply(clean_address_for_matching)
                day_df['__clean_addr'] = day_df[day_addr_col].apply(clean_address_for_matching)
                day_df['matched'] = False
            
            if dawn_df is not None:
                dawn_name_col = auto_map_col(dawn_df, ['받는분', '수령인', '수취인', '수령자'])
                dawn_addr_col = auto_map_col(dawn_df, ['받는분주소', '수령인주소', '주소', '수령자 주소'], force_addr=True)
                dawn_invoice_col = auto_map_col(dawn_df, ['운송장번호', '송장번호'])
                
                if not all([dawn_name_col, dawn_addr_col, dawn_invoice_col]):
                    raise HTTPException(
                        status_code=400,
                        detail=f"새벽 송장 파일의 실제 컬럼명: {list(dawn_df.columns)}"
                    )
                    
                dawn_df['__clean_name'] = dawn_df[dawn_name_col].apply(clean_address_for_matching)
                dawn_df['__clean_addr'] = dawn_df[dawn_addr_col].apply(clean_address_for_matching)
                dawn_df['matched'] = False
            
            # 주문 데이터 컬럼 매핑
            order_name_col = auto_map_col(order_df, ['받는분', '수령인', '수취인'])
            order_addr_col = auto_map_col(order_df, ['받는분주소', '수령인주소', '주소'])
            order_code_col = auto_map_col(order_df, ['집하지점코드'])
            order_prod_col = auto_map_col(order_df, ['상품주문번호', '주문번호', '거래처주문코드'])
            
            logger.debug(f"주문 데이터 상품주문번호 컬럼: {order_prod_col}")
            
            if not all([order_name_col, order_addr_col, order_code_col]):
                raise HTTPException(
                    status_code=400,
                    detail=f"분류된 주문양식 파일의 실제 컬럼명: {list(order_df.columns)}"
                )
            
            order_df['배송사명'] = ''
            order_df['송장번호'] = ''
            order_df['__clean_name'] = order_df[order_name_col].apply(clean_address_for_matching)
            order_df['__clean_addr'] = order_df[order_addr_col].apply(clean_address_for_matching)
            
            unmatched_rows = []
            
            # GUI와 완전 동일한 매칭 로직
            for idx, row in order_df.iterrows():
                name = row['__clean_name']
                addr = row['__clean_addr']
                code = str(row[order_code_col]).strip() if pd.notna(row[order_code_col]) else ''
                
                try:
                    code_int = int(float(code)) if code else None
                    code_str = str(code_int) if code_int is not None else code
                except:
                    code_int = None
                    code_str = code
                    
                matched = False
                best_match = None
                similarity_scores = None
                
                # 당일/택배 매칭
                if day_df is not None:
                    # 상품주문번호 컬럼 찾기
                    day_prod_col = auto_map_col(day_df, ['상품주문번호', '주문번호', '거래처주문코드', '거래처 주문번호', '거래처주문번호'])
                    logger.debug(f"송장 데이터 상품주문번호 컬럼: {day_prod_col}")
                    
                    if code == '' or code == 'nan':
                        # 당일 매칭 (집하지점코드가 105, 108이 아닌 것)
                        best_match, similarity_scores = find_best_match(
                            row,
                            day_df,
                            threshold=0.8,
                            invoice_prod_col=day_prod_col,
                            order_prod_col=order_prod_col,
                            code_col=day_code_col,
                            code_filter=''  # ''로 시작하는 집하지점코드(당일)
                        )
                        if best_match is not None:
                            order_df.at[idx, '배송사명'] = '우리한방택배'
                            order_df.at[idx, '송장번호'] = str(best_match[day_invoice_col])
                            matched = True
                            log_matching_details(row, best_match, similarity_scores, matched)
                    elif code_str == '105':
                        # 택배 매칭
                        best_match, similarity_scores = find_best_match(
                            row,
                            day_df,
                            threshold=0.8,
                            invoice_prod_col=day_prod_col,
                            order_prod_col=order_prod_col,
                            code_col=day_code_col,
                            code_filter='105'
                        )
                        if best_match is not None:
                            order_df.at[idx, '배송사명'] = '롯데택배'
                            order_df.at[idx, '송장번호'] = str(best_match[day_invoice_col])
                            matched = True
                            log_matching_details(row, best_match, similarity_scores, matched)
                        
                # 새벽 매칭
                if not matched and code_str == '108' and dawn_df is not None:
                    best_match, similarity_scores = find_best_match(row, dawn_df, threshold=0.8)
                    if best_match is not None:
                        order_df.at[idx, '배송사명'] = '컬리넥스트마일'
                        order_df.at[idx, '송장번호'] = str(best_match[dawn_invoice_col])
                        matched = True
                        log_matching_details(row, best_match, similarity_scores, matched)
                        
                if not matched:
                    logger.debug(f"미매칭: idx={idx}, name={name}, addr={addr}, code={code}")
                    unmatched_rows.append(row)
                    
            # 매칭 결과 분석
            analysis = analyze_matching_results(order_df, day_df if day_df is not None else dawn_df, unmatched_rows)
            
            # 임시 컬럼 제거
            order_df_clean = order_df.drop(columns=['__clean_name', '__clean_addr'])
            
            # 매칭/미매칭 분리 및 우편번호 5자리 문자열 변환
            matched_df = order_df_clean[(order_df_clean['송장번호'].notna()) & (order_df_clean['송장번호'] != '')]
            unmatched_df = order_df_clean[(order_df_clean['송장번호'].isna()) | (order_df_clean['송장번호'] == '')]
            
            for df in [matched_df, unmatched_df]:
                if '우편번호' in df.columns:
                    df['우편번호'] = df['우편번호'].apply(clean_zipcode)
            
            # 미매칭 사유 컬럼 추가
            if not unmatched_df.empty:
                unmatched_df = unmatched_df.copy()
                unmatched_df['미매칭사유'] = '매칭실패'
            
            # 결과 파일 저장
            result_dir = os.path.join('data', 'user')
            os.makedirs(result_dir, exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            matched_filename = f"송장매칭완료_{timestamp}.xlsx"
            unmatched_filename = f"송장미매칭_{timestamp}.xlsx"
            
            matched_path = os.path.join(result_dir, matched_filename)
            unmatched_path = os.path.join(result_dir, unmatched_filename)
            
            # 파일 저장
            matched_df.to_excel(matched_path, index=False)
            if not unmatched_df.empty:
                unmatched_df.to_excel(unmatched_path, index=False)
            
            return {
                "success": True,
                "message": "일반 송장매칭이 완료되었습니다.",
                "stats": {
                    "total_orders": analysis['total_orders'],
                    "matched": analysis['matched_orders'],
                    "unmatched": analysis['unmatched_orders'],
                    "match_rate": round(analysis['match_rate'], 1)
                },
                "matched_file": f"/api/files/download/{matched_filename}",
                "unmatched_file": f"/api/files/download/{unmatched_filename}" if not unmatched_df.empty else None
            }
            
    except Exception as e:
        logger.error(f"일반 송장매칭 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"매칭 처리 중 오류가 발생했습니다: {str(e)}") 