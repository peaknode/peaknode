import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Asset } from "../asset/asset.entity";
import { Product } from "./product.entity";

/**
 * 상품 갤러리 이미지 연결 엔터티.
 *
 * {@link Product}와 {@link Asset}의 N:M 관계를 중간 테이블로 표현하며,
 * `position` 값으로 이미지 표시 순서를 제어한다.
 *
 * 단순 조인 테이블이 아닌 `position` 컬럼이 필요하기 때문에 별도 엔터티로 분리했다.
 *
 * @example
 * // product.productAssets를 position 오름차순으로 정렬해 갤러리를 구성한다.
 * const gallery = product.productAssets.sort((a, b) => a.position - b.position);
 */
@ObjectType()
@Entity("product_asset")
export class ProductAsset extends BaseEntity {
  /**
   * 갤러리 내 이미지 표시 순서. 0부터 시작하며 오름차순으로 정렬한다.
   * 같은 Product의 ProductAsset들 사이에서 고유해야 한다.
   */
  @Field(() => Int)
  @Column({ type: "int" })
  position: number;

  /** 연결된 Product의 ID. */
  @Field(() => ID)
  @Column({ name: "product_id" })
  productId: string;

  /** 연결된 Product. */
  @Index()
  @ManyToOne(() => Product, (p) => p.productAssets)
  @JoinColumn({ name: "product_id" })
  product: Product;

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
