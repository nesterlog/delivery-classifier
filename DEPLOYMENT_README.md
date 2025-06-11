# 🚀 배송분류 시스템 배포 가이드

## 📋 프로젝트 개요

**허우적 배송분류 자동화 시스템**은 마이크로서비스 아키텍처로 구성된 웹 애플리케이션입니다.

### 🔧 기술 스택
- **백엔드**: FastAPI + Python (API 서버)
- **프론트엔드**: Next.js + React + TypeScript (웹 애플리케이션)
- **배포**: AWS Lambda (백엔드) + Vercel (프론트엔드)

## 🏗️ 아키텍처

```
┌─────────────────┐    API 호출    ┌──────────────────┐
│   Next.js Web   │ ────────────── │  FastAPI Lambda  │
│   (Vercel)      │                │    (AWS)         │
└─────────────────┘                └──────────────────┘
         │                                    │
         │                                    │
         ▼                                    ▼
┌─────────────────┐                ┌──────────────────┐
│   Static CDN    │                │  Data Storage    │
│  (Vercel Edge)  │                │   (Lambda FS)   │
└─────────────────┘                └──────────────────┘
```

## 📁 핵심 배포 파일

### 백엔드 (Lambda)
```
backend/
├── main.py              # FastAPI 진입점
├── requirements.txt     # Python 의존성
├── routers/            # API 라우터들
│   ├── classify_router.py
│   ├── data_router.py
│   ├── api_key_simple.py
│   └── auth_router.py
├── services/           # 비즈니스 로직
├── utils/              # 유틸리티
└── data/               # 데이터 파일들
    ├── system/         # 시스템 설정
    └── user/           # 사용자 데이터
```

### 프론트엔드 (Vercel)
```
frontend/
├── package.json        # Node.js 의존성
├── next.config.js      # Next.js 설정
├── vercel.json         # Vercel 배포 설정
├── pages/              # 페이지 컴포넌트
│   ├── index.tsx       # 메인 페이지
│   ├── login.tsx       # 로그인
│   ├── classify.tsx    # 배송 분류
│   ├── data-manager.tsx # 데이터 관리
│   └── api-keys.tsx    # API 키 관리
├── components/         # 재사용 컴포넌트
└── styles/             # 스타일시트
```

## 🌐 배포 전략

### 1. 비용 효율적 AWS 배포

#### 현재 구성 (권장)
- **Lambda + API Gateway**: 서버리스, 요청당 과금
- **Vercel**: Next.js 최적화, 무료 티어 활용
- **총 예상 비용**: 월 $5-15 (트래픽에 따라)

#### 대안 구성
- **ECS Fargate**: 컨테이너 기반 ($20-50/월)
- **EC2**: 전통적 방식 ($10-30/월)
- **Amplify**: 풀스택 호스팅 ($15-40/월)

### 2. 배포 단계

#### 백엔드 배포 (Lambda)
1. **Zip 패키징**
   ```bash
   cd backend
   zip -r lambda-deployment.zip . -x "__pycache__/*" "*.pyc"
   ```

2. **Lambda 함수 업데이트**
   - Runtime: Python 3.9+
   - Handler: main.handler
   - Timeout: 30초
   - Memory: 512MB

3. **API Gateway 설정**
   - CORS 활성화
   - 커스텀 도메인 (선택사항)

#### 프론트엔드 배포 (Vercel)
1. **GitHub 연동**
   ```bash
   git push origin main
   ```

2. **자동 배포 트리거**
   - Vercel이 자동으로 빌드 및 배포
   - 환경변수 설정 확인

### 3. 환경변수 설정

#### Lambda 환경변수
```env
KAKAO_API_KEY=c3207609f232ab9972310f876e22e233
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin1234
ENVIRONMENT=production
```

#### Vercel 환경변수
```env
NEXT_PUBLIC_API_URL=https://your-lambda-api.amazonaws.com/prod/api
NEXT_PUBLIC_ENV=production
```

## 🔒 보안 설정

### 1. API 보안
- API Gateway에서 Rate Limiting 설정
- CORS 정책 적용
- API 키 암호화 저장

### 2. 도메인 보안
- HTTPS 강제 적용
- Security Headers 설정
- CSP (Content Security Policy) 적용

## 📊 모니터링

### 1. Lambda 모니터링
- CloudWatch Logs
- Error Rate 추적
- Duration 모니터링

### 2. Vercel 모니터링
- Analytics 대시보드
- Web Vitals 추적
- 배포 로그 확인

## 🚀 배포 체크리스트

### 배포 전 준비
- [ ] 환경변수 설정 확인
- [ ] API 키 유효성 검증
- [ ] 테스트 코드 실행
- [ ] 불필요한 파일 제거 확인

### Lambda 배포
- [ ] 패키지 크기 확인 (50MB 이하)
- [ ] Handler 설정 확인
- [ ] 환경변수 설정
- [ ] API Gateway CORS 설정

### Vercel 배포
- [ ] GitHub 저장소 연동
- [ ] 빌드 설정 확인
- [ ] 환경변수 설정
- [ ] 커스텀 도메인 설정 (선택)

### 배포 후 검증
- [ ] API 헬스체크 확인
- [ ] 프론트엔드 로딩 확인
- [ ] 로그인 기능 테스트
- [ ] 배송분류 기능 테스트
- [ ] 데이터 관리 기능 테스트

## 📞 지원

배포 관련 문제가 발생하면:
1. CloudWatch Logs 확인
2. Vercel 배포 로그 확인
3. API 응답 상태 코드 확인
4. 환경변수 설정 재검토

---

**효율적이고 저비용의 서버리스 배포로 안정적인 서비스를 제공합니다!** 🎯 