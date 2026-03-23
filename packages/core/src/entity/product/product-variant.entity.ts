import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Asset } from "../asset/asset.entity";
import { ProductOption } from "./product-option.entity";
import { ProductVariantAsset } from "./product-variant-asset.entity";
import { Product } from "./product.entity";

/**
 * 상품 변형(SKU) 엔터티.
 *
 * 실제 판매 단위를 나타낸다. 하나의 {@link Product}는 1개 이상의 ProductVariant를 가지며,
 * 가격·재고·SKU는 모두 이 엔터티에서 관리한다.
 *
 * @example
 * // Product: "반팔 티셔츠"
 * // ProductVariant: { name: "흰색 / S", sku: "TEE-WHITE-S", price: 29000 }
 */
@Entity("product_variant")
export class ProductVariant extends BaseEntity {
  /**
   * 변형 표시명. 선택된 옵션 값들을 조합해 생성한다.
   * 예: "흰색 / S", "검정 / M"
   */
  @Column()
  name: string;

  /**
   * 재고 관리 단위(Stock Keeping Unit). 전체 Variant에서 고유해야 한다.
   * 예: "TEE-WHITE-S-001"
   */
  @Column({ unique: true })
  sku: string;

  /**
   * 판매 가격. 원(KRW) 단위 정수로 저장한다.
   * 예: 29000 → ₩29,000
   */
  @Column({ type: "int" })
  price: number;

  /**
   * 변형 활성화 여부.
   * false이면 해당 옵션 조합은 구매 불가 상태로 표시된다.
   */
  @Column({ default: true })
  enabled: boolean;

  /**
   * 실물 재고 수량.
   * 입고/출고 처리 시 이 값을 증감한다.
   */
  @Column({ name: "stock_on_hand", type: "int", default: 0 })
  stockOnHand: number;

  /**
   * 주문 예약(할당)된 재고 수량.
   * 결제 완료 전 주문에 의해 점유된 수량으로, 실제 출고 시 stockOnHand에서 차감한다.
   * 가용 재고 = stockOnHand - stockAllocated
   */
  @Column({ name: "stock_allocated", type: "int", default: 0 })
  stockAllocated: number;

  /**
   * 재고 추적 여부.
   * false이면 재고 수량과 무관하게 항상 구매 가능한 상태로 처리한다.
   * 디지털 상품이나 주문 제작 상품에 활용한다.
   */
  @Column({ name: "track_inventory", default: true })
  trackInventory: boolean;

  /**
   * 품절 처리 기준 재고 수량.
   * 가용 재고(stockOnHand - stockAllocated)가 이 값 이하가 되면 품절로 처리한다.
   * 기본값 0: 재고가 0이 되어야 품절.
   */
  @Column({ name: "out_of_stock_threshold", type: "int", default: 0 })
  outOfStockThreshold: number;

  /** 소속 Product의 ID. */
  @Column({ name: "product_id" })
  productId: string;

  /** 소속 Product. */
  @Index()
  @ManyToOne(() => Product, (p) => p.variants)
  @JoinColumn({ name: "product_id" })
  product: Product;

  /**
   * 이 변형의 대표 이미지 Asset ID.
   * null이면 Product의 featuredAsset을 대신 사용한다.
   */
  @Column({ name: "featured_asset_id", nullable: true })
  featuredAssetId: string | null;

  /** 이 변형의 대표 이미지 Asset. */
  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: "featured_asset_id" })
  featuredAsset: Asset | null;

  /**
   * 이 변형에 적용된 옵션 값 목록.
   * 예: [ProductOption("흰색"), ProductOption("S")]
   * 조인 테이블: `product_variant_options`
   */
  @ManyToMany(() => ProductOption, (o) => o.productVariants)
  @JoinTable({
    name: "product_variant_options",
    joinColumn: { name: "product_variant_id" },
    inverseJoinColumn: { name: "product_option_id" },
  })
  options: ProductOption[];

  /**
   * 이 변형의 갤러리 이미지 목록.
   * {@link ProductVariantAsset.position} 오름차순으로 정렬해 사용한다.
   */
  @OneToMany(() => ProductVariantAsset, (pva) => pva.productVariant)
  variantAssets: ProductVariantAsset[];
}
