/**
 * 슈퍼관리자 권한 식별자.
 *
 * Role.permissions에 이 값이 포함되면 모든 권한 체크를 bypass한다.
 */
export const SUPERADMIN_PERMISSION = "__superadmin__";

/**
 * 시스템에서 사용 가능한 모든 권한 목록.
 *
 * 값(value)은 DB의 `role.permissions` 배열에 저장되는 문자열이다.
 * 형식: `resource:action` (예: `product:create`)
 *
 * Role 생성 시 이 enum의 value를 조합하여 permissions 배열을 구성한다.
 *
 * @example
 * // 슈퍼관리자 역할 생성
 * { code: 'superadmin', permissions: [SUPERADMIN_PERMISSION] }
 *
 * // 상품 매니저 역할 생성
 * { code: 'product-manager', permissions: [Permission.ProductCreate, Permission.ProductUpdate] }
 */
export enum Permission {
  // ─── Product ───────────────────────────────────────────────────────────────
  /** 상품 생성 */
  ProductCreate = "product:create",
  /** 상품 목록/단건 조회 */
  ProductRead = "product:read",
  /** 상품 수정 */
  ProductUpdate = "product:update",
  /** 상품 삭제 */
  ProductDelete = "product:delete",

  // ─── Order ─────────────────────────────────────────────────────────────────
  /** 주문 조회 */
  OrderRead = "order:read",
  /** 주문 상태 변경 등 수정 */
  OrderUpdate = "order:update",

  // ─── Customer ──────────────────────────────────────────────────────────────
  /** 고객 조회 */
  CustomerRead = "customer:read",
  /** 고객 정보 수정 */
  CustomerUpdate = "customer:update",
  /** 고객 삭제/비활성화 */
  CustomerDelete = "customer:delete",

  // ─── Administrator ─────────────────────────────────────────────────────────
  /** 관리자 계정 생성 */
  AdministratorCreate = "administrator:create",
  /** 관리자 계정 조회 */
  AdministratorRead = "administrator:read",
  /** 관리자 계정 수정 */
  AdministratorUpdate = "administrator:update",
  /** 관리자 계정 삭제/비활성화 */
  AdministratorDelete = "administrator:delete",

  // ─── Role ──────────────────────────────────────────────────────────────────
  /** 역할 생성 */
  RoleCreate = "role:create",
  /** 역할 조회 */
  RoleRead = "role:read",
  /** 역할 수정 */
  RoleUpdate = "role:update",
  /** 역할 삭제 */
  RoleDelete = "role:delete",

  // ─── Custom Field ──────────────────────────────────────────────────────────
  /** 커스텀 필드 정의 생성 */
  CustomFieldCreate = "custom-field:create",
  /** 커스텀 필드 정의 조회 */
  CustomFieldRead = "custom-field:read",
  /** 커스텀 필드 정의 수정 */
  CustomFieldUpdate = "custom-field:update",
  /** 커스텀 필드 정의 삭제 */
  CustomFieldDelete = "custom-field:delete",

  // ─── Asset ─────────────────────────────────────────────────────────────────
  /** 에셋 업로드 */
  AssetCreate = "asset:create",
  /** 에셋 조회 */
  AssetRead = "asset:read",
  /** 에셋 삭제 */
  AssetDelete = "asset:delete",

  // ─── Facet ─────────────────────────────────────────────────────────────────
  /** 패싯 생성 */
  FacetCreate = "facet:create",
  /** 패싯 목록/단건 조회 */
  FacetRead = "facet:read",
  /** 패싯 수정 */
  FacetUpdate = "facet:update",
  /** 패싯 삭제 */
  FacetDelete = "facet:delete",

  // ─── Collection ────────────────────────────────────────────────────────────
  /** 컬렉션 생성 */
  CollectionCreate = "collection:create",
  /** 컬렉션 목록/단건 조회 */
  CollectionRead = "collection:read",
  /** 컬렉션 수정 */
  CollectionUpdate = "collection:update",
  /** 컬렉션 삭제 */
  CollectionDelete = "collection:delete",
}
