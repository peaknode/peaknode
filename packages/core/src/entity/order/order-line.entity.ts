import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { ProductVariant } from "../product/product-variant.entity";
import { Fulfillment } from "./fulfillment.entity";
import { Order } from "./order.entity";

/**
 * 주문 라인 아이템 엔터티.
 *
 * 주문에 담긴 개별 상품(ProductVariant)을 나타낸다.
 * 하나의 {@link Order}는 1개 이상의 OrderLine을 가진다.
 *
 * 가격·상품명·SKU는 주문 시점의 값을 스냅샷으로 저장한다.
 * 이후 {@link ProductVariant}의 가격이나 이름이 변경되어도 주문 내역은 보존된다.
 *
 * @example
 * // OrderLine: { quantity: 2, unitPrice: 29000, linePrice: 58000, sku: "TEE-WHITE-S" }
 */
@ObjectType()
@Entity("order_line")
export class OrderLine extends BaseEntity {
  /** 주문 수량. */
  @Field(() => Int)
  @Column({ type: "int" })
  quantity: number;

  /**
   * 주문 시점 단가 (원 단위 정수).
   * ProductVariant.price의 스냅샷. 이후 가격 변경 영향을 받지 않는다.
   */
  @Field(() => Int)
  @Column({ name: "unit_price", type: "int" })
  unitPrice: number;

  /**
   * 라인 합계 금액 (원 단위 정수).
   * `unitPrice × quantity`로 계산된다.
   */
  @Field(() => Int)
  @Column({ name: "line_price", type: "int" })
  linePrice: number;

  /**
   * 주문 시점 변형 표시명 스냅샷.
   * 예: "흰색 / S".
   * ProductVariant.name이 변경되어도 주문 내역은 이 값을 유지한다.
   */
  @Field()
  @Column({ name: "product_variant_name" })
  productVariantName: string;

  /**
   * 주문 시점 SKU 스냅샷.
   * ProductVariant.sku가 변경되어도 주문 내역은 이 값을 유지한다.
   */
  @Field()
  @Column()
  sku: string;

  /** 소속 Order의 ID. */
  @Field()
  @Column({ name: "order_id" })
  orderId: string;

  /** 소속 Order. */
  @Index()
  @ManyToOne(() => Order, (o) => o.lines)
  @JoinColumn({ name: "order_id" })
  order: Order;

  /**
   * 연결된 ProductVariant의 ID.
   * 상품이 삭제되어도 주문 라인은 유지되므로 nullable로 설정하지 않는다.
   */
  @Field()
  @Column({ name: "product_variant_id" })
  productVariantId: string;

  /**
   * 연결된 ProductVariant.
   * 가격·이름·SKU는 스냅샷 컬럼을 사용하며, 이 관계는 실제 상품 조회에 활용한다.
   */
  @Index()
  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: "product_variant_id" })
  productVariant: ProductVariant;

  /**
   * 이 라인이 포함된 배송(Fulfillment) 목록.
   * JoinTable 소유권은 {@link Fulfillment} 쪽에 있다.
   * 부분 배송 시 하나의 OrderLine이 여러 Fulfillment에 걸칠 수 있다.
   */
  @Field(() => [Fulfillment])
  @ManyToMany(() => Fulfillment, (f) => f.lines)
  fulfillments: Fulfillment[];
}
