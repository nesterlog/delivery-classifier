import pandas as pd

# 우편번호 파일 로드
print("우편번호 파일 로드 중...")
day_df = pd.read_csv('backend/data/system/day_zip.csv', header=None, encoding='utf-8-sig')
dawn_df = pd.read_csv('backend/data/system/dawn_zip.csv', header=None, encoding='utf-8-sig')

# 우편번호 세트 생성
day_zips = set(day_df.iloc[:, 0])
dawn_zips = set(dawn_df.iloc[:, 0])

print(f"당일배송 우편번호: {len(day_zips)}개")
print(f"새벽배송 우편번호: {len(dawn_zips)}개")

# 중복 우편번호 찾기
common_zips = day_zips & dawn_zips
exclusive_dawn_zips = dawn_zips - day_zips

print(f"중복 우편번호: {len(common_zips)}개")
print(f"새벽배송 전용 우편번호: {len(exclusive_dawn_zips)}개")

# 새벽배송 전용 우편번호만 저장
with open('backend/data/system/exclusive_dawn_zip.csv', 'w', encoding='utf-8-sig') as f:
    for zip_code in exclusive_dawn_zips:
        f.write(f"{zip_code}\n")

print("새벽배송 전용 우편번호 파일 생성 완료: exclusive_dawn_zip.csv")

# 원본 파일 백업
with open('backend/data/system/dawn_zip_backup.csv', 'w', encoding='utf-8-sig') as f:
    for zip_code in dawn_zips:
        f.write(f"{zip_code}\n")

print("새벽배송 우편번호 백업 완료: dawn_zip_backup.csv")