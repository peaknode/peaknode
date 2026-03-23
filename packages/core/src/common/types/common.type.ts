import { BaseEntity } from "src/entity/base/base.entity";

/**
 * 목록 조회 시 사용할 공통 쿼리 옵션 인터페이스.
 */
export interface ListQueryOptions<T extends BaseEntity> {
  take?: number | null; // 페이지당 아이템 수. null이면 전체 조회.
  skip?: number | null; // 건너뛸 아이템 수. null이면 0.
  sort?: SortParam<T>[] | null; // 정렬 기준. null이면 정렬하지 않음.
  filter?: FilterParam<T>[] | null; // 필터링 기준. null이면 필터링하지 않음.
  filterOperator?: "AND" | "OR"; // 필터링 조건 연결 방식. 기본값은 "AND".
}

/**
 * 정렬 기준 인터페이스.
 */
export interface SortParam<T extends BaseEntity> {
  field: keyof T; // 정렬할 필드 이름
  order: "ASC" | "DESC"; // 정렬 순서
}

/**
 * 필터링 기준 인터페이스.
 */
export interface FilterParam<T extends BaseEntity> {
  field: keyof T; // 필터링할 필드 이름
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "like"; // 비교 연산자
  value: any; // 비교할 값
}
