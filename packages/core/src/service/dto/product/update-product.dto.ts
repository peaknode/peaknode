import { CreateProductDto } from "./create-product.dto";

/**
 * 상품 수정 요청 DTO.
 * 모든 필드가 선택적이며, 전달된 필드만 업데이트된다.
 * slug를 변경하는 경우 고유성이 재검증된다.
 */
export class UpdateProductDto implements Partial<CreateProductDto> {
  /** 상품명 */
  name?: string;

  /**
   * URL-friendly 고유 식별자.
   * 변경 시 기존 slug와 중복 여부를 재검증한다.
   */
  slug?: string;

  /** 상품 설명 */
  description?: string;

  /** 활성화 여부 */
  enabled?: boolean;

  /** 대표 이미지 Asset UUID */
  featuredAssetId?: string;

  /**
   * 연결할 FacetValue UUID 목록.
   * 전달 시 기존 facetValues를 전부 교체한다.
   */
  facetValueIds?: string[];

  /**
   * 연결할 Collection UUID 목록.
   * 전달 시 기존 collections를 전부 교체한다.
   */
  collectionIds?: string[];
}
