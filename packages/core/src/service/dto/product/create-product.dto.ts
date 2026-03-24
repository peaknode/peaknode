/**
 * 상품 생성 요청 DTO.
 */
export class CreateProductDto {
  /** 상품명 */
  name: string;

  /** URL-friendly 고유 식별자 (예: "mens-basic-tee") */
  slug: string;

  /** 상품 설명 (HTML 또는 Markdown, 선택) */
  description?: string;

  /**
   * 활성화 여부.
   * false면 프론트엔드에 노출되지 않는다.
   * @default true
   */
  enabled?: boolean;

  /** 대표 이미지 Asset UUID (선택) */
  featuredAssetId?: string;

  /** 연결할 FacetValue UUID 목록 (선택) */
  facetValueIds?: string[];

  /** 연결할 Collection UUID 목록 (선택) */
  collectionIds?: string[];
}
