import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Facet } from "./facet.entity";
import { Product } from "./product.entity";

/**
 * 패싯 값(FacetValue) 엔터티.
 *
 * {@link Facet}에 속하는 개별 속성값을 나타낸다.
 * 예: 패싯 "브랜드"의 값 "나이키", 패싯 "소재"의 값 "면".
 *
 * FacetValue는 여러 상품에 걸쳐 공유되며,
 * 조인 테이블 `product_facet_values`를 통해 {@link Product}와 연결된다.
 *
 * @example
 * // 상품 필터: 브랜드=나이키 → FacetValue({ code: "nike" })에 연결된 Product 조회
 */
@Entity("facet_value")
export class FacetValue extends BaseEntity {
  /** 패싯 값 표시명. 예: "나이키", "면", "남성용". */
  @Column()
  name: string;

  /**
   * 패싯 값의 기계 판독용 식별자.
   * 같은 Facet 내에서 고유해야 한다. 영문 소문자와 하이픈 사용을 권장한다.
   * 예: "nike", "cotton", "mens".
   */
  @Column()
  code: string;

  /** 소속 Facet의 ID. */
  @Column({ name: "facet_id" })
  facetId: string;

  /** 소속 Facet. */
  @Index()
  @ManyToOne(() => Facet, (f) => f.values)
  @JoinColumn({ name: "facet_id" })
  facet: Facet;

  /**
   * 이 패싯 값이 적용된 상품 목록.
   * JoinTable 소유권은 {@link Product} 쪽에 있다.
   */
  @ManyToMany(() => Product, (p) => p.facetValues)
  products: Product[];
}
