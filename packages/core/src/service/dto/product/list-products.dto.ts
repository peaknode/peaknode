/**
 * 상품 목록 조회 옵션 DTO.
 */
export class ListProductsDto {
  /**
   * 건너뛸 레코드 수 (페이지네이션 오프셋).
   * @default 0
   */
  skip?: number;

  /**
   * 가져올 최대 레코드 수.
   * @default 20
   * @max 100
   */
  take?: number;

  /** 활성화 여부 필터 */
  enabled?: boolean;

  /**
   * FacetValue UUID 목록으로 필터링.
   * 지정한 FacetValue를 모두 보유한 상품만 반환된다 (AND 조건).
   */
  facetValueIds?: string[];

  /** 특정 Collection에 속한 상품만 필터링 */
  collectionId?: string;

  /** 상품명 부분 검색 (LIKE %search%) */
  search?: string;
}
