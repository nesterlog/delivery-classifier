# 🚚 허우적 배송분류 자동화 시스템

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-13.5+-black.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)

엑셀 주문 데이터를 업로드하여 **당일배송**, **새벽배송**, **택배배송**으로 자동 분류하는 웹 기반 솔루션입니다.

## ✨ 주요 기능

### 📦 배송 분류 자동화
- 엑셀 파일 업로드를 통한 주문 데이터 처리
- 우편번호 기반 배송 지역 자동 분류
- 주소 정규화 및 매칭
- 당일배송만 / 일괄구분 / 전체구분 모드 지원

### 🌙 새벽배송 옵션 추가
- 기존 주문에 새벽배송 옵션 추가
- 배송 유형 및 SMS 전송 시점 설정
- 출입방법 자동 설정

### 📋 송장 매칭
- 분류된 주문과 송장 파일 자동 매칭
- 새벽배송 전용 송장 매칭
- 매칭 결과 통계 제공

### 🏠 우편번호 관리
- 당일배송/새벽배송 가능 지역 관리
- CSV 파일 업로드를 통한 일괄 등록
- 관리자 권한 기반 접근 제어

### 🔑 API 키 관리
- 카카오 주소 검색 API 연동
- 암호화된 API 키 저장
- 관리자 전용 기능

### 📊 데이터 관리
- 업로드된 파일 관리
- 결과 파일 다운로드
- 시스템 파일 보호

## 🏗️ 시스템 구조

```
deliauto/
├── frontend/          # Next.js 프론트엔드
│   ├── components/    # React 컴포넌트
│   ├── pages/         # 페이지 라우팅
│   └── styles/        # CSS 스타일
├── backend/           # FastAPI 백엔드
│   ├── routers/       # API 라우터
│   ├── services/      # 비즈니스 로직
│   ├── utils/         # 유틸리티 함수
│   └── data/          # 데이터 저장소
└── delivery_classifier.py  # GUI 버전 (독립 실행)
```

## 🚀 설치 및 실행

### 사전 요구사항
- Node.js 16.0+ 
- Python 3.8+
- pip 패키지 관리자

### 1. 프로젝트 클론
```bash
git clone https://github.com/your-username/delivery-classifier.git
cd delivery-classifier
```

### 2. 백엔드 설정
```bash
# 가상환경 생성 및 활성화
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

# 의존성 설치
pip install fastapi uvicorn pandas openpyxl python-multipart python-jose[cryptography]

# 백엔드 실행
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 프론트엔드 설정
```bash
# 새 터미널에서
cd frontend
npm install
npm run dev
```

### 4. 접속
- 웹 인터페이스: http://localhost:3000
- API 문서: http://localhost:8000/docs

## 🔐 관리자 설정

### 기본 관리자 계정
- **비밀번호**: `admin1234`
- **권한**: API 키 관리, 우편번호 관리

### 보안 권장사항
1. 프로덕션 환경에서는 관리자 비밀번호 변경 필수
2. HTTPS 사용 권장
3. API 키는 외부 노출 금지

## 📱 사용법

### 1. 배송 분류
1. **배송 분류** 메뉴 접속
2. 엑셀 파일 업로드 (주문 데이터)
3. 분류 모드 선택:
   - **당일배송만**: 당일배송 가능 주문만 분류
   - **일괄구분**: 당일배송 + 새벽배송 분류
   - **전체구분**: 당일배송 + 새벽배송 + 택배배송 분류
4. 결과 파일 다운로드

### 2. 새벽배송 옵션 추가
1. **새벽 옵션 추가** 메뉴 접속
2. 기존 주문 파일 업로드
3. 새벽배송 설정 입력
4. 변환된 파일 다운로드

### 3. 송장 매칭
1. **송장 매칭** 메뉴 접속
2. 주문 파일과 송장 파일 업로드
3. 자동 매칭 실행
4. 매칭 결과 확인 및 다운로드

## 🌐 배포

### Vercel (프론트엔드) - 무료
```bash
cd frontend
npm install -g vercel
vercel
```

### AWS Lambda (백엔드) - 저비용
1. Serverless Framework 설치
2. 배포 설정 파일 작성
3. 배포 실행

### Docker (전체)
```bash
# 프론트엔드
docker build -t delivery-frontend ./frontend

# 백엔드
docker build -t delivery-backend ./backend
```

## 🔧 환경 변수

### 백엔드 (.env)
```
JWT_SECRET=your_secret_key_here
ADMIN_PASSWORD=admin1234
KAKAO_API_KEY=your_kakao_api_key
```

### 프론트엔드 (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📊 시스템 요구사항

### 최소 사양
- **RAM**: 512MB
- **저장공간**: 1GB
- **네트워크**: 인터넷 연결

### 권장 사양  
- **RAM**: 2GB+
- **저장공간**: 5GB+
- **CPU**: 2코어+

## 🔍 SEO 최적화

✅ **완벽 구현됨**
- Sitemap.xml (동적 생성)
- Robots.txt
- 메타 태그 (OG, Twitter Card)
- 구조화된 데이터 (JSON-LD)
- 보안 헤더
- 파비콘 및 Manifest

## 🐛 문제 해결

### 자주 발생하는 문제

**1. 파일 업로드 실패**
- 파일 형식 확인 (.xlsx, .csv)
- 파일 크기 제한 확인 (50MB)
- 네트워크 연결 상태 확인

**2. 주소 매칭 오류**
- 카카오 API 키 설정 확인
- 주소 데이터 형식 검증
- 우편번호 데이터 업데이트

**3. 권한 오류**
- 관리자 비밀번호 확인
- 로그인 상태 확인
- 토큰 만료 시간 확인 (60분)

## 📄 라이선스

This project is licensed under the MIT License.

## 👥 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 지원

프로젝트 관련 문의사항이나 버그 리포트는 [Issues](https://github.com/your-username/delivery-classifier/issues)를 통해 제출해주세요.

---

**허우적 배송분류 자동화 시스템** - 효율적인 배송 관리의 새로운 기준 🚀 