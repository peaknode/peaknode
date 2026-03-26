import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Asset } from "../asset/asset.entity";
import { Collection } from "./collection.entity";
import { FacetValue } from "./facet-value.entity";
import { ProductAsset } from "./product-asset.entity";
import { ProductOptionGroup } from "./product-option-group.entity";
import { ProductVariant } from "./product-variant.entity";

/**
 * 상품 엔터티.
 *
 * 판매 가능한 상품의 기본 정보를 나타낸다.
 * 실제 판매 단위(가격, 재고, SKU)는 {@link ProductVariant}에서 관리하며,
 * 하나의 Product는 반드시 1개 이상의 ProductVariant를 가진다.
 *
 * @example
 * // "반팔 티셔츠" 상품 → variants: ["흰색/S", "흰색/M", "검정/S", ...]
 */
@ObjectType()
@Entity("product")
export class Product extends BaseEntity {
  /** 상품 표시명. 관리자 및 쇼핑몰 프론트에 노출되는 이름. */
  @Field()
  @Column()
  name: string;

  /**
   * URL에 사용되는 고유 슬러그.
   * 영문 소문자, 숫자, 하이픈 조합을 권장한다 (예: `mens-basic-tee`).
   */
  @Field()
  @Column({ unique: true })
  slug: string;

  /** 상품 상세 설명. HTML 또는 마크다운 허용. null이면 설명 없음. */
  @Field({ nullable: true })
  @Column({ type: "text", nullable: true })
  description: string | null;

  /**
   * 상품 활성화 여부.
   * false이면 쇼핑몰 프론트에 노출되지 않는다.
   */
  @Field()
  @Column({ default: true })
  enabled: boolean;

  /**
   * 대표 이미지 Asset의 ID.
   * null이면 대표 이미지 미지정 상태.
   * 갤러리 이미지 순서와 무관하게 명시적으로 지정할 수 있다.
   */
  @Field(() => ID, { nullable: true })
  @Column({ name: "featured_asset_id", nullable: true })
  featuredAssetId: string | null;

  /** 대표 이미지 Asset. */
  @Field(() => Asset, { nullable: true })
  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: "featured_asset_id" })
  featuredAsset: Asset | null;

  /**
   * 이 상품에 속한 판매 변형(SKU) 목록.
   * 옵션 조합(색상 × 사이즈 등)별로 각각 하나의 ProductVariant가 생성된다.
   */
  @Field(() => [ProductVariant])
  @OneToMany(() => ProductVariant, (v) => v.product)
  variants: ProductVariant[];

  /**
   * 이 상품에 정의된 옵션 그룹 목록.
   * 예: ["색상", "사이즈"]
   */
  @Field(() => [ProductOptionGroup])
  @OneToMany(() => ProductOptionGroup, (g) => g.product)
  optionGroups: ProductOptionGroup[];

  /**
   * 갤러리 이미지 목록. position 값으로 표시 순서를 제어한다.
   * {@link ProductAsset.position} 오름차순으로 정렬해 사용한다.
   */
  @Field(() => [ProductAsset])
  @OneToMany(() => ProductAsset, (pa) => pa.product)
  productAssets: ProductAsset[];

  /**
   * 이 상품에 연결된 Facet 값 목록.
   * 브랜드, 소재, 성별 등 필터링에 활용되는 속성값이다.
   * 조인 테이블: `product_facet_values`
   */
  @Field(() => [FacetValue])
  @ManyToMany(() => FacetValue, (fv) => fv.products)
  @JoinTable({
    name: "product_facet_values",
    joinColumn: { name: "product_id" },
    inverseJoinColumn: { name: "facet_value_id" },
  })
  facetValues: FacetValue[];

  /**
   * 이 상품이 속한 컬렉션 목록.
   * JoinTable 소유권은 {@link Collection} 쪽에 있다.
   */
  @Field(() => [Collection])
  @ManyToMany(() => Collection, (c) => c.products)
  collections: Collection[];
}
