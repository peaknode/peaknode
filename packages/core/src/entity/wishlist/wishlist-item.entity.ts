import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Product } from "../product/product.entity";
import { ProductVariant } from "../product/product-variant.entity";
import { Wishlist } from "./wishlist.entity";

/**
 * 위시리스트 아이템 엔터티.
 *
 * {@link Wishlist}에 담긴 개별 상품을 나타낸다.
 * 상품(Product) 단위로 저장하되, 특정 옵션(ProductVariant)을 선택한 경우
 * `productVariantId`에 함께 기록한다.
 *
 * @example
 * // 옵션 미선택: productId="xxx", productVariantId=null
 * // 특정 색상/사이즈 선택: productId="xxx", productVariantId="yyy"
 */
@Entity("wishlist_item")
export class WishlistItem extends BaseEntity {
  /** 소속 위시리스트의 ID. */
  @Column({ name: "wishlist_id" })
  wishlistId: string;

  /** 소속 위시리스트. */
  @Index()
  @ManyToOne(() => Wishlist, (w) => w.items)
  @JoinColumn({ name: "wishlist_id" })
  wishlist: Wishlist;

  /** 담긴 상품의 ID. */
  @Column({ name: "product_id" })
  productId: string;

  /** 담긴 상품. */
  @Index()
  @ManyToOne(() => Product)
  @JoinColumn({ name: "product_id" })
  product: Product;

  /**
   * 선택된 상품 변형(SKU)의 ID.
   * null이면 특정 옵션을 선택하지 않은 상태.
   */
  @Column({ name: "product_variant_id", nullable: true })
  productVariantId: string | null;

  /**
   * 선택된 상품 변형(SKU).
   * null이면 옵션 미선택.
   */
  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: "product_variant_id" })
  productVariant: ProductVariant | null;
}
