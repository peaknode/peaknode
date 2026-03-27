import { SetMetadata } from "@nestjs/common";
import { Permission } from "../permissions/permission.enum";

/**
 * `@RequirePermissions()` 데코레이터가 메타데이터를 저장할 키.
 *
 * `AdminAuthGuard`에서 `Reflector.getAllAndOverride(PERMISSIONS_KEY, ...)` 로 읽는다.
 */
export const PERMISSIONS_KEY = "permissions";

/**
 * 해당 Query/Mutation을 실행하기 위해 필요한 권한을 선언하는 데코레이터.
 *
 * 반드시 `AdminAuthGuard`와 함께 사용해야 한다.
 * 데코레이터가 없거나 빈 배열이면 "관리자이기만 하면 통과"로 처리된다.
 *
 * 클래스와 메서드 모두에 적용할 수 있으며, 메서드 레벨이 우선한다.
 *
 * @param permissions - 필요한 권한 목록
 *
 * @example
 * // 단일 권한
 * @RequirePermissions(Permission.ProductCreate)
 * @Mutation(() => Product)
 * createProduct(...) {}
 *
 * // 복수 권한 (AND 조건 — 모두 충족해야 통과)
 * @RequirePermissions(Permission.OrderRead, Permission.CustomerRead)
 * @Query(() => [Order])
 * ordersWithCustomer(...) {}
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
