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
