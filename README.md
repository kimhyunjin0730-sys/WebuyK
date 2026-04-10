# We buy K

하이브리드 K-커머스 플랫폼 — 외국인 방문객이 한국 쇼핑몰의 상품을 대리 구매하고, 인천공항/거점에서 픽업하거나 본국으로 배송받을 수 있는 서비스.

`Technical_Implementation_Plan_We_buy_K.md`의 5단계 플랜을 기반으로 한 **풀스택 모노레포 구현체**입니다.

## 구조

```
.
├── apps/
│   ├── api/   # NestJS + Prisma (SQLite) 백엔드
│   └── web/   # Next.js (App Router) + Tailwind + next-intl 프런트엔드
└── packages/
    └── shared/  # 공유 TypeScript 타입 / Zod 스키마
```

## 빠른 시작

```bash
pnpm install
pnpm db:push          # Prisma 스키마를 SQLite에 푸시
pnpm db:seed          # 초기 데이터 시드 (관리자/예시 상품)
pnpm dev              # web (3000) + api (4000) 동시 실행
```

기본 계정:
- 사용자: `demo@wbk.test` / `demo1234` — 5개 샘플 주문이 모든 상태별로 미리 들어 있음
- 관리자: `admin@wbk.test` / `admin1234`
- Mock OAuth 전용: `google-test@wbk.test`, `kakao-test@wbk.test` — 로그인 페이지의 OAuth 버튼 클릭으로 진입

## 구현 상태 (Plan 매핑)

| Phase | 영역 | 상태 |
|-------|------|------|
| 1 | 인프라 / Tailwind / next-intl / Prisma | ✅ |
| 2 | 인증 (이메일+JWT, OAuth는 어댑터만) / 가상주소 #WBK-XXXX | ✅ |
| 3 | 외부 URL 파싱 / 수수료 엔진 / 하이브리드 장바구니 | ✅ |
| 4 | WMS — 입고/검수/픽업 | ⚙️ 인터페이스 + Mock 어댑터 |
| 5 | 결제 / Pre-auth / 자동 청구 | ⚙️ 인터페이스 + Mock PG |

> Phase 4·5는 실제 PG·물류 계정이 필요해 **어댑터 패턴으로 스텁** 처리되어 있습니다.
> `apps/api/src/payments/portone.adapter.ts` 등에서 실제 SDK로 교체하면 됩니다.

## OAuth 설정 (Google + Kakao)

### 🧪 테스트 모드 (기본값 — 별도 설정 불필요)
`apps/api/.env`에 OAuth 키가 비어 있으면 자동으로 **mock 모드**가 켜집니다. 로그인/가입 페이지의 **Continue with Google / Kakao** 버튼에는 작은 `TEST` 뱃지가 붙고, 클릭하면 외부 호출 없이 즉시 미리 시드된 테스트 계정으로 로그인됩니다.

| 버튼 | 결과 |
|---|---|
| Continue with Google (test) | `google-test@wbk.test`로 로그인 |
| Continue with Kakao (test) | `kakao-test@wbk.test`로 로그인 |

다른 정체성으로 테스트하려면 URL 파라미터를 직접 추가:
```
http://localhost:4000/api/auth/mock?provider=google&email=alice@wbk.test&name=Alice
```
- 처음 호출되는 이메일은 자동으로 새 User + 가상주소 발급
- 같은 이메일로 다시 호출하면 동일 계정 재로그인 (`mock-google-<email>` 형태의 안정적인 providerAccountId 사용)

### 🔐 실제 모드 (Google/Kakao 키 있을 때)
`.env`에 자격증명을 채워넣으면 같은 버튼이 실제 Passport 흐름을 사용합니다 — `TEST` 뱃지가 사라지고 실제 동의 화면으로 redirect됩니다.

### Google
1. https://console.cloud.google.com/apis/credentials → **Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback` (.env의 `GOOGLE_CALLBACK_URL`과 정확히 일치)
4. 발급된 Client ID/Secret을 `.env`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 입력
5. API 재시작

### Kakao
1. https://developers.kakao.com/console/app → 앱 생성
2. **앱 설정 → 플랫폼 → Web** 에 `http://localhost:3000` 등록
3. **제품 설정 → 카카오 로그인** 활성화 후 Redirect URI에 `http://localhost:4000/api/auth/kakao/callback` 등록
4. **카카오 로그인 → 동의항목** 에서 `카카오계정(이메일)` 선택 (검수 필요할 수 있음 — 검수 전에는 placeholder 이메일 `kakao_<id>@noemail.kakao`로 가입됨)
5. **앱 키**의 **REST API 키**를 `.env`의 `KAKAO_CLIENT_ID`에 입력. Client Secret은 사용 시에만 `KAKAO_CLIENT_SECRET`에 입력
6. API 재시작

### 동작 흐름
1. 사용자가 `Continue with Google/Kakao` 클릭 → `GET /api/auth/{provider}` (Passport가 공급자로 redirect)
2. 공급자 동의 후 `GET /api/auth/{provider}/callback` 으로 돌아옴
3. `AuthService.findOrCreateOAuthUser`가 동일 provider+id면 재사용, 동일 email이면 기존 계정에 연결, 아니면 새 User + 가상주소 생성
4. JWT를 발급해 `http://localhost:3000/en/auth/callback?token=...`로 redirect
5. Web의 `/auth/callback` 페이지가 토큰을 localStorage에 저장하고 `/order`로 이동

### 주의사항
- OAuth 전용 가입 사용자는 `passwordHash`가 `null`이라 이메일+비밀번호 로그인이 불가합니다. 같은 이메일로 비밀번호 로그인을 시도하면 `Invalid credentials`로 응답합니다 (어느 계정이 OAuth-only인지 노출하지 않기 위함).
- 프로덕션에서는 callback URL을 HTTPS로 바꾸고 `JWT_SECRET`을 반드시 강한 값으로 교체하세요.

## 상품 인식 모드 (3가지)

`/order` 페이지에서 사용자가 탭으로 선택할 수 있습니다.

| 모드 | 엔드포인트 | 동작 | 비용 | 차단 사이트 |
|---|---|---|---|---|
| **빠른 URL** | `POST /api/products/parse` (`mode=fast`) | fetch + cheerio + JSON-LD/OG | 0 | ❌ |
| **정밀 URL** | `POST /api/products/parse` (`mode=playwright`) | 헤드리스 Chromium 렌더링 후 추출 | 서버 자원 | ✅ |
| **스크린샷** | `POST /api/products/parse-image` | Claude Sonnet vision으로 이미지 → 구조화 추출 | ~$0.01/req | ✅ |

### Playwright 모드 배포 (Google Cloud Run)

Vercel serverless에서는 chromium 바이너리 크기 제한으로 못 돌리므로 **API만** Cloud Run으로 분리합니다. Web(Next.js)은 Vercel 그대로.

Cloud Run 무료 한도: 월 200만 요청 + 360K GiB-초 + 180K vCPU-초. 개인 프로젝트 규모는 **$0**.

```bash
gcloud run deploy wbk-api \
  --source . \
  --dockerfile apps/api/Dockerfile \
  --region asia-northeast3 \
  --memory 2Gi --cpu 1 \
  --min-instances 0 --max-instances 3 \
  --allow-unauthenticated \
  --update-secrets DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,WEB_ORIGIN=WEB_ORIGIN:latest
```

자세한 단계별 가이드는 [해야할 것.md](해야할 것.md) 참고.

> Dockerfile은 `mcr.microsoft.com/playwright:v1.47.0-jammy` 베이스 이미지를 사용해 Chromium + 의존성을 미리 포함합니다. Cloud Run 주입 `$PORT`(기본 8080)를 자동으로 사용합니다.
>
> **⚠️ 비용 폭탄 방지**: `--max-instances 3` 필수, Billing Budget Alert 설정 권장.

### Vision 모드 환경변수

```
ANTHROPIC_API_KEY=sk-ant-api03-...
```

키는 **절대 코드에 하드코딩하거나 채팅에 붙여넣지 말고** Render/Vercel 대시보드 또는 `apps/api/.env`에만 두세요.

## 수수료 엔진

`apps/api/src/fees/fee.engine.ts`에서 단일 source-of-truth로 관리. Jest 단위 테스트 포함.

```
total = item_price + handling_charge + surcharge + shipping(optional)
handling_charge = max(MIN_HANDLING, item_price * HANDLING_RATE)
surcharge       = item_price * SURCHARGE_RATE   // 카드/환차/검수 리스크 버퍼
```
