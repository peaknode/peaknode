# RBAC 권한 설계

## 배경

Admin API Resolver들이 인증/권한 없이 열려 있었다. `Role` 엔터티에 `permissions: string[]`과 `__superadmin__` bypass 개념이 이미 정의돼 있어, 이를 실제 Resolver에서 강제하는 Guard/Decorator를 추가했다.

---

## 설계 목표

- **관리자 전용 API 보호**: JWT 검증 + Administrator 확인 + 권한 체크를 하나의 Guard로 처리
- **세분화된 권한**: 각 Query/Mutation에 `@RequirePermissions()`로 필요한 권한을 명시
- **슈퍼관리자 bypass**: `__superadmin__` 권한을 가진 역할은 모든 체크를 통과
- **Shop API 무영향**: 고객용 API는 기존 `JwtAuthGuard` 유지

---

## 구현 파일

| 파일 | 역할 |
|------|------|
| `src/common/permissions/permission.enum.ts` | `Permission` enum (모든 권한 정의), `SUPERADMIN_PERMISSION` 상수 |
| `src/common/decorators/require-permissions.decorator.ts` | `@RequirePermissions(...perms)` — SetMetadata 래퍼 |
| `src/common/decorators/current-admin.decorator.ts` | `@CurrentAdmin()` — request에서 Administrator 추출 |
| `src/common/guards/admin-auth.guard.ts` | `AdminAuthGuard` — JWT + Admin + Permission 통합 가드 |

---

## 권한 모델

**형식**: `resource:action` (예: `product:create`, `order:read`)

**슈퍼관리자**: `Role.permissions`에 `__superadmin__` 포함 시 모든 권한 bypass

**Permission 도메인**:

| 도메인 | 권한 |
|--------|------|
| product | `product:create/read/update/delete` |
| order | `order:read/update` |
| customer | `customer:read/update/delete` |
| administrator | `administrator:create/read/update/delete` |
| role | `role:create/read/update/delete` |
| custom-field | `custom-field:create/read/update/delete` |
| asset | `asset:create/read/delete` |

---

## Guard 흐름

```
요청
 │
 ▼
[1] Authorization 헤더에서 Bearer 토큰 추출
 │  없으면 → UnauthorizedException
 ▼
[2] AuthService.validateAccessToken(token)
 │  실패 → UnauthorizedException
 ▼
[3] Administrator.findOne({ userId, isActive: true }, relations: ['roles'])
 │  없으면 → ForbiddenException("관리자 권한이 필요합니다.")
 │  있으면 → req.userId, req.admin 설정
 ▼
[4] Reflector로 @RequirePermissions 메타데이터 읽기
 │  없음 → 통과 (관리자이기만 하면 됨)
 ▼
[5] 역할 permissions 합산
 │  __superadmin__ 포함 → 통과
 │  requiredPermissions 모두 충족 → 통과
 │  하나라도 미충족 → ForbiddenException("해당 작업에 대한 권한이 없습니다.")
```

---

## 사용 패턴

### 클래스 전체 보호 + 메서드별 권한

```typescript
@UseGuards(AdminAuthGuard)
@Resolver(() => Product)
export class ProductResolver {
  @RequirePermissions(Permission.ProductRead)
  @Query(() => [Product])
  products() { ... }

  @RequirePermissions(Permission.ProductCreate)
  @Mutation(() => Product)
  createProduct() { ... }
}
```

### 공개 엔드포인트 혼용 (메서드별 Guard)

`loginAsAdmin`, `refreshToken`처럼 인증 전에 호출해야 하는 엔드포인트는 클래스 레벨 Guard 없이 메서드별로 Guard를 적용한다.

```typescript
@Resolver(() => User)
export class UserResolver {
  // 공개 — Guard 없음
  @Mutation(() => AuthResult)
  loginAsAdmin() { ... }

  // 보호됨
  @UseGuards(AdminAuthGuard)
  @RequirePermissions(Permission.AdministratorCreate)
  @Mutation(() => User)
  createAdminUser() { ... }
}
```

### CurrentAdmin 데코레이터

Guard 통과 후 `req.admin`에 세팅된 `Administrator` 엔터티를 Resolver 파라미터로 주입한다.

```typescript
@UseGuards(AdminAuthGuard)
@Query(() => String)
whoAmI(@CurrentAdmin() admin: Administrator): string {
  return admin.emailAddress;
}
```

---

## 설계 결정 및 트레이드오프

### AND 조건 권한 체크

`@RequirePermissions(A, B)`는 A AND B 모두 충족 시 통과한다. OR 조건이 필요한 경우는 현재 없으며, 필요 시 별도 `@RequireAnyPermission()` 데코레이터를 추가할 수 있다.

### 별도 AdministratorService 없이 Guard에서 직접 DB 조회

Guard는 NestJS `@Injectable()`로 `TransactionConnection`을 직접 주입받아 DB 조회한다. Administrator 조회 전용 서비스를 만들면 계층 분리가 깔끔하지만, Guard 전용 단순 조회를 위해 서비스를 추가하는 것은 과도하다고 판단했다.

### Shop API와 Admin API Guard 분리

고객용 API는 `Administrator` 개념이 없으므로 `JwtAuthGuard`를 그대로 유지한다. 통합 Guard로 만들 경우 복잡도가 증가하고 Shop API에서 불필요한 DB 조회가 발생한다.
