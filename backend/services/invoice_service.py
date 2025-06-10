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