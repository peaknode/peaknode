import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { ProductVariant } from "../product/product-variant.entity";
import { Cart } from "./cart.entity";

/**
 * 장바구니 아이템 엔터티.
 *
 * {@link Cart}에 담긴 개별 상품(ProductVariant)을 나타낸다.
 * 가격은 저장하지 않고 항상 {@link ProductVariant.price}에서 실시간으로 조회한다.
 * 결제(체크아웃) 시 `quantity × productVariant.price`를 OrderLine의 unitPrice 스냅샷으로 저장한다.
 *
 * 동일한 ProductVariant가 같은 Cart에 중복으로 추가되지 않도록
 * 서비스 레이어에서 quantity를 증가시켜 처리한다.
 */
@ObjectType()
@Entity("cart_item")
export class CartItem extends BaseEntity {
  /** 장바구니에 담긴 수량. */
  @Field(() => Int)
  @Column({ type: "int" })
  quantity: number;

  /** 소속 Cart의 ID. */
  @Field()
  @Column({ name: "cart_id" })
  cartId: string;

  /** 소속 Cart. */
  @Index()
  @ManyToOne(() => Cart, (c) => c.items)
  @JoinColumn({ name: "cart_id" })
  cart: Cart;

  /** 담긴 상품 변형(SKU)의 ID. */
  @Field()
  @Column({ name: "product_variant_id" })
  productVariantId: string;

  /**
   * 담긴 상품 변형(SKU).
   * 가격·재고·활성화 여부를 확인할 때 이 관계를 조회한다.
   */
  @Field(() => ProductVariant)
  @Index()
  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: "product_variant_id" })
  productVariant: ProductVariant;
}
