import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Asset } from "../asset/asset.entity";
import { ProductVariant } from "./product-variant.entity";

/**
 * 상품 변형 갤러리 이미지 연결 엔터티.
 *
 * {@link ProductVariant}와 {@link Asset}의 N:M 관계를 중간 테이블로 표현하며,
 * `position` 값으로 이미지 표시 순서를 제어한다.
 *
 * 변형별로 별도의 이미지를 관리할 때 사용한다.
 * 예: 색상 옵션별로 다른 이미지를 보여주는 경우.
 *
 * @example
 * // variant.variantAssets를 position 오름차순으로 정렬해 이미지를 구성한다.
 * const images = variant.variantAssets.sort((a, b) => a.position - b.position);
 */
@ObjectType()
@Entity("product_variant_asset")
export class ProductVariantAsset extends BaseEntity {
  /**
   * 갤러리 내 이미지 표시 순서. 0부터 시작하며 오름차순으로 정렬한다.
   * 같은 ProductVariant의 ProductVariantAsset들 사이에서 고유해야 한다.
   */
  @Field(() => Int)
  @Column({ type: "int" })
  position: number;

  /** 연결된 ProductVariant의 ID. */
  @Field(() => ID)
  @Column({ name: "product_variant_id" })
  productVariantId: string;

  /** 연결된 ProductVariant. */
  @Index()
  @ManyToOne(() => ProductVariant, (v) => v.variantAssets)
  @JoinColumn({ name: "product_variant_id" })
  productVariant: ProductVariant;

  /** 연결된 Asset의 ID. */
  @Field(() => ID)
  @Column({ name: "asset_id" })
  assetId: string;

  /** 연결된 Asset. */
  @Field(() => Asset)
  @ManyToOne(() => Asset)
  @JoinColumn({ name: "asset_id" })
  asset: Asset;
}
