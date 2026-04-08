# Technical Implementation Plan: We buy K

`ProjectDest.md`와 `Research.md`의 정의에 따라, '하이브리드 K-커머스' 플랫폼을 구축하기 위한 단계별 기술 구현 계획을 수립합니다.

> [!IMPORTANT]
> **결제 및 자동화 시나리오**
> 미수령(No-show) 시의 자동 결제(Auto-payment)와 강제 배송 트리거는 법적/기술적 정밀도가 요구되므로, 초기 설계 단계에서 PG사(Portone/Eximbay)와의 기술 검토가 선행되어야 합니다.

---

## 📅 Phased Implementation

### Phase 1: 기초 인프라 및 프로젝트 환경 구축
- **Frontend**: Next.js (TypeScript) 초기화 및 Tailwind CSS, Shadcn UI 테마 설정
- **Backend**: NestJS (TypeScript) 및 Prisma (PostgreSQL) 스키마 정의
- **Localization**: `next-intl`을 이용한 다국어(영어 중심) 엔진 구축
- **CI/CD**: Vercel/AWS 초기 배포 환경 설정

### Phase 2: 회원 체계 및 가상 주소 발급 (Core Auth)
- **OAuth**: NextAuth.js 기반 글로벌 소셜 로그인 구현
- **Virtual Address Logic**: 가입 시 사용자 전용 사서함 번호(`#WBK-XXXX`) 주소 발급 모듈
- **Profile**: 본국 백업 주소 및 보상수단 저장 관리

### Phase 3: 구매 대행 및 상품 매칭 엔진 (External Mall Integration)
- **Proxy Order UI**: 외부 쇼핑몰 URL 입력 및 상품 정보 파싱 모듈 (Coupang, Naver 등)
- **Fee Engine (V1)**: Surcharge 및 Handling Charge 자동 산출 로직
- **Shopping Cart**: 하이브리드 모드(배송/픽업) 선택이 가능한 장바구니 시스템

### Phase 4: 입고/검수 및 보관 관리 (WMS Basics)
- **Warehouse Matching**: 송장 번호와 고객 가상 주소를 대조한 자동 입고 확인 기능
- **Inspection Notification**: 관리자 앱에서 검수 사진 업로드 및 고객 실시간 알림
- **Stay & Pickup Logic**: 입국 정보 연동 및 보관 장소/기간 관리 시스템

### Phase 5: 결제 고도화 및 세이프티 넷 (Settlement & Safety Net)
- **Payment Integration**: Portone 기반 글로벌 카드 결제 연동
- **Pre-auth & Auto-charge**: 미수령 시 자동 배송 전동 및 카드 예약 결제 API 연동
- **Admin Dashboard**: 전체 주문 현황, 입고 대기, 장기 미수령 건 필터링 및 관리

---

## ❓ Open Questions
1. **상품 파싱 방식**: 외부 몰 상품 정보를 URL 입력 시 실시간으로 파싱(Scraping)할 것인지, 혹은 API가 열려 있는 업체부터 우선 연동할 것인지 결정이 필요합니다.
2. **픽업 장소**: 인천공항 픽업 외에 특정 거점(서울 지점 등)을 추가할 계획이 있으신가요?

---

## ✅ Verification Plan

### Automated Verification
- **Prisma Schema**: 모델링 안정성 및 관계성 검증
- **Unit Tests**: 수수료 계산 로직 및 가상 주소 생성 로직 테스트 (Jest)

### Manual Verification
- **User Flow**: 가입 → 가상 주소 부여 → 외부 주문 대행 → 검수 확인 → 픽업 신청 전 과정을 테스트 사용자로 시뮬레이션
