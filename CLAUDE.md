# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root (runs all packages via Turbo)
pnpm build          # Build all packages
pnpm dev            # Start all packages in watch mode
pnpm lint           # Lint all packages
pnpm check-types    # TypeScript type-check all packages
pnpm format         # Prettier format (ts, tsx, md)

# Core backend only (packages/core)
pnpm --filter @peaknode/core start:dev   # Watch mode dev server (port 3000)
pnpm --filter @peaknode/core test        # Run unit tests
pnpm --filter @peaknode/core test:e2e    # Run e2e tests
pnpm --filter @peaknode/core test:cov    # Coverage report

# Run a single test file
pnpm --filter @peaknode/core test -- --testPathPattern=app.controller
```

## Infrastructure (Docker)

```bash
docker compose up -d    # Start MySQL (port 33061) + MinIO
```

- **MySQL**: `localhost:33061`, db/user/pass: `dev-peaknode`
- **MinIO**: S3-compatible object storage, bucket: `pdf-local`

## Architecture

Turbo monorepo with pnpm workspaces. Main packages:

- **`packages/core`** — NestJS 10 backend with TypeORM. The primary package where all commerce domain logic lives.
- **`packages/ui`** — React component library (shared UI).
- **`packages/http-client`** — Axios-based HTTP client with interceptors.
- **`packages/eslint-config`** / **`packages/typescript-config`** — Shared configs consumed by other packages.

### Entity Layer (`packages/core/src/entity/`)

All entities extend `BaseEntity` which provides `id` (UUID), `createdAt`, `updatedAt`, `deletedAt` (soft delete).

**Naming conventions:**
- Table names: explicit `@Entity("snake_case")` always required
- Columns: explicit `@Column({ name: "snake_case" })` for multi-word properties
- FKs: scalar FK column (e.g., `productId: string`) always defined alongside the relation decorator
- `@JoinColumn({ name: "fk_id" })` on the owning side of all FK relations
- `@Index()` on `@ManyToOne` FK columns that will be queried frequently
- `type: "simple-json"` for JSON objects stored as TEXT

**Entity domains:**
- `user/` — `User`, `AuthenticationMethod` (OAuth strategies: native, google, kakao)
- `customer/` — `Customer` (supports guest checkout via nullable `userId`), `Address`
- `administrator/` — `Administrator`, `Role` (RBAC with `permissions: string[]`)
- `asset/` — `Asset` (MinIO-backed, `AssetType` enum), `Tag` (M:N)
- `product/` — `Product`, `ProductVariant` (SKU/price/stock), `ProductOptionGroup`, `ProductOption`, `ProductAsset`, `ProductVariantAsset`, `Facet`, `FacetValue`, `Collection` (hierarchical self-ref)

**Price storage:** integers in KRW (원), e.g. `10000` = ₩10,000

**Asset storage:** `source` field holds the MinIO object key (not a full URL). URL construction is handled at the service layer.

### Custom Fields

엔터티 도메인을 확장할 수 있는 커스텀 필드 시스템이 구현되어 있다.

**지원 엔터티:** `Product`, `Customer`, `User`, `Administrator`
- 각 엔터티는 `customFields: Record<string, unknown> | null` 컬럼(`type: "simple-json"`)을 갖는다.

**커스텀 필드 정의:** `CustomFieldDefinition` 엔터티 (`src/entity/custom-field/`)
- `entityName` + `name` 조합이 UNIQUE (`@Unique(["entityName", "name"])`)
- `name`은 소문자로 시작하는 `[a-z][a-z0-9_]*` 형식 (snake_case 권장)
- `type`은 생성 후 변경 불가 (`string`, `int`, `float`, `boolean`, `datetime`, `text`)
- `list: true`이면 해당 타입의 배열로 저장

**서비스:** `CustomFieldsService` (`src/service/custom-field/`)
- `validate(entityName, customFields)` — whitelist 검증 + required 누락 체크 + 타입 검증
- 커스텀 필드가 있는 엔터티를 생성/수정하는 서비스는 저장 전 `customFieldsService.validate()`를 호출해야 한다.

**DTO 패턴:**
- `CreateCustomFieldDefinitionDto` — `entityName`, `name`, `type` 필수; `label`, `required`, `list`, `defaultValue` 선택
- `UpdateCustomFieldDefinitionDto` — `label`, `required`, `list`, `defaultValue`만 허용 (immutable 필드 제외)
- 커스텀 필드를 받는 엔터티 Input DTO에는 `@Field(() => GraphQLJSONScalar, { nullable: true }) customFields?: Record<string, unknown>` 패턴 사용

**새 엔터티에 커스텀 필드 추가 시:**
1. 엔터티에 `@Column({ name: "custom_fields", type: "simple-json", nullable: true }) customFields: Record<string, unknown> | null;` 추가
2. `CustomFieldEntityName` enum에 해당 엔터티 이름 추가 (`src/entity/custom-field/custom-field-definition.entity.ts`)
3. 생성/수정 서비스 메서드에서 `customFieldsService.validate()` 호출 추가

## Bruno API Collection

Resolver를 새로 작성하거나 Query/Mutation을 추가할 때마다 반드시 대응하는 Bruno `.bru` 파일을 생성한다.

**컬렉션 위치:** `api-collection/`
**폴더 구조:** 도메인별 폴더 → `클라이언트/` (Shop API) 또는 `어드민/` (Admin API) 하위 폴더

```
api-collection/
  {도메인}/
    클라이언트/   ← ShopApi resolver 요청
    어드민/       ← AdminApi resolver 요청
```

**파일 명명:** 한국어 동사/명사 조합 (예: `사용자 조회.bru`, `상품 생성.bru`)

**GraphQL 엔드포인트:** 모든 요청은 `{{baseUrl}}/graphql` 단일 엔드포인트 사용

**필수 포함 항목:**
- `meta` — `name` (한국어), `type: graphql`, `seq` (폴더 내 순번)
- `post` — `url: {{baseUrl}}/graphql`, `body: graphql`, `auth: inherit`
- `headers` — 인증이 필요한 엔드포인트에 `Authorization: Bearer {{accessToken}}`
- `body:graphql` — 타입 변수를 사용하는 완전한 operation (예: `mutation Foo($input: FooInput!) { foo(input: $input) { ... } }`)
- `body:graphql:vars` — 실행 가능한 예시 값
- `script:post-response` — 토큰을 반환하는 mutation은 `bru.setEnvVar()`로 환경변수에 저장; 로그아웃/탈퇴는 토큰 클리어
- `settings` — `encodeUrl: true`, `timeout: 0`

**반환 타입별 body:graphql 패턴:**
- `Boolean` / `String` 등 스칼라 반환: 중괄호 없이 필드명만 (`refreshToken(token: $token)`)
- Object 반환: 필요한 필드 선택자 포함

**예시 (인증 필요 mutation):**
```
meta {
  name: 상품 생성
  type: graphql
  seq: 1
}

post {
  url: {{baseUrl}}/graphql
  body: graphql
  auth: inherit
}

headers {
  Authorization: Bearer {{accessToken}}
}

body:graphql {
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      createdAt
    }
  }
}

body:graphql:vars {
  {
    "input": {
      "name": "테스트 상품"
    }
  }
}

settings {
  encodeUrl: true
  timeout: 0
}
```

## Documentation

새로운 기능이나 시스템을 구현할 때는 문서 작성여부를 확인한 후에 `docs/` 폴더에 설계 문서를 작성한다.

**작성 대상:** 새로운 도메인 시스템, 중요한 아키텍처 결정, 비자명한 설계 트레이드오프가 있는 경우
**포함 내용:**
- 왜 이 방식을 선택했는가 (설계 옵션 검토 + 선택 이유)
- 핵심 설계 결정과 그 근거
- 한계와 트레이드오프
- 구현 파일 경로 참조

**파일 명명:** `docs/{feature}-design.md` (예: `custom-fields-design.md`, `payment-flow-design.md`)

> **배경:** 이 프로젝트는 오픈소스 및 SaaS 커머스 솔루션을 지향한다. 설계 의도와 트레이드오프를 문서화해두지 않으면, 나중에 코드만 봐서는 왜 이런 구조인지 알 수 없다. 기술 블로그 일지 형식으로 작성해서 설계 히스토리를 보존한다.

## Code Style

**JSDoc is required on all created or modified files.** Add JSDoc comments to:
- Every class and interface
- Every public method and function
- Every non-trivial property (especially entity columns where the purpose isn't obvious)

```typescript
/**
 * 상품 대표 이미지 asset의 ID.
 * null이면 대표 이미지 미지정 상태.
 */
@Column({ name: "featured_asset_id", nullable: true })
featuredAssetId: string | null;
```

### TypeORM Notes

- `strictNullChecks: false` in `packages/core/tsconfig.json` — nullable types are not strictly enforced at compile time
- TypeORM module is not yet wired into `AppModule` — entities are defined but no `TypeOrmModule.forRoot()` exists yet
- No migrations directory — currently relies on `synchronize` for schema generation in development
