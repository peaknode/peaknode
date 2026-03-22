# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (run from repo root)
```bash
pnpm dev          # Start all apps in dev mode (via Turbo)
pnpm build        # Build all apps
pnpm lint         # Lint all apps/packages
pnpm format       # Prettier format all files
pnpm check-types  # TypeScript type check all
```

### Individual Apps
```bash
# From apps/web or apps/admin
pnpm dev
pnpm codegen        # Generate GraphQL types from schema
pnpm codegen:watch  # (admin only) Watch mode codegen

# From apps/server
pnpm dev            # NestJS watch mode
pnpm test           # Jest unit tests
pnpm test:watch     # Jest watch mode
pnpm test:cov       # Coverage report
pnpm test:e2e       # E2E tests
pnpm seed:orders    # Seed order data
```

### Database
MySQL runs via Docker Compose:
```bash
docker compose up -d  # Start MySQL on port 33061
```
- DB: `dev-bootleg-store`, User: `dev-bootleg-store`, Password: `dev-bootleg-store`

## Architecture

### Monorepo Structure
pnpm workspaces + Turbo. Three apps, four shared packages:
- `apps/web` — customer storefront (React + Vite)
- `apps/admin` — admin dashboard (React + Vite)
- `apps/server` — GraphQL API (NestJS)
- `apps/docs` — documentation (Next.js)
- `packages/ui` — `@bootleg/ui` shared component library
- `packages/http-client` — `@bootleg/http-client` axios wrapper
- `packages/eslint-config` — shared ESLint configs
- `packages/typescript-config` — shared TypeScript configs

### Frontend (web & admin)
Both apps share the same structure:
- **Router:** TanStack Router with file-based routing (`src/routes/`)
- **GraphQL:** Apollo Client; types auto-generated via `graphql-codegen`
- **HTTP:** `@bootleg/http-client` (axios) for REST calls
- **State:** Zustand for client state, Apollo for server state
- **Forms:** React Hook Form + Zod
- **UI:** Tailwind CSS 4, Radix UI, shadcn/ui, shared `@bootleg/ui`
- **Payment:** Toss Payments SDK (web only)

Feature-slice directory layout:
```
src/
├── routes/       # TanStack Router file-based routes
├── entities/     # Domain models (auth, product, cart, order, ...)
├── features/     # UI feature modules
├── pages/        # Page-level components
├── widgets/      # Reusable sections
└── shared/       # Apollo client, hooks, utilities
```

### Backend (apps/server)
NestJS with code-first GraphQL (schema auto-generated to `src/schema.gql`).
```
src/
├── auth/         # AWS Cognito + Passport JWT auth
├── modules/      # Domain modules: user, product, category, order, payment, cart, coupon, shipment
├── common/       # Global filters, interceptors, pipes
└── scripts/      # DB seeders
```
- **ORM:** TypeORM + MySQL2
- **Auth:** AWS Cognito JWTs validated via Passport strategy
- **Validation:** class-validator + class-transformer on all DTOs

### GraphQL Type Safety Flow
1. Server auto-generates `apps/server/src/schema.gql`
2. `pnpm codegen` in web/admin reads the schema and generates TypeScript types
3. Apollo Client uses generated hooks/types for fully typed queries

### Shared Packages
- `@bootleg/ui` — import shared components; consumed by both web and admin
- `@bootleg/http-client` — pre-configured axios instance with auth/error interceptors; used for non-GraphQL REST calls

## Git Commit Convention

작업이 완료되면 즉시 커밋한다. 커밋 메시지는 다음 접두사 컨벤션을 따른다:

| 접두사 | 용도 |
|--------|------|
| `feat:` | 새로운 기능 추가 |
| `fix:` | 버그 수정 |
| `refactor:` | 기능 변경 없는 코드 리팩토링 |
| `style:` | 포맷팅, 세미콜론 등 코드 스타일 변경 |
| `chore:` | 빌드 설정, 패키지, 환경설정 변경 |
| `docs:` | 문서 수정 |
| `test:` | 테스트 코드 추가/수정 |

### 커밋 규칙
- 작업 단위가 완료될 때마다 바로 커밋한다
- 메시지는 한국어로 작성한다 (접두사는 영문 유지)
- 예: `feat: 쿠폰 목록 페이지 필터링 기능 추가`
- 예: `fix: 주문 상태 뱃지 색상 오류 수정`

## Coding Conventions

### 파일 분리 원칙
단일 컴포넌트, 유틸 함수, 헬퍼 로직은 각자 별도 파일로 분리한다.
- 파일 하나에 여러 컴포넌트/유틸을 인라인으로 정의하지 않는다
- 예: `product-form.tsx`에 `ThumbnailPicker` 컴포넌트를 인라인 정의하지 않고 `thumbnail-picker.tsx`로 분리
- 예: `cartesian`, `slugify` 같은 유틸 함수는 `utils.ts`로 분리
- Feature/entity 슬라이스 내 `ui/`, `lib/`, `model/` 폴더를 활용해 역할별로 구성
