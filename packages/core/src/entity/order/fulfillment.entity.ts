import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { OrderLine } from "./order-line.entity";
import { Order } from "./order.entity";

/**
 * 배송(출고) 상태 열거형.
 */
export enum FulfillmentState {
  /** 출고 준비 중. 아직 배송사에 접수되지 않은 상태. */
  PENDING = "PENDING",
  /** 발송 완료. 배송사에 접수되어 운송 중. */
  SHIPPED = "SHIPPED",
  /** 배송 완료. 고객이 수령한 상태. */
  DELIVERED = "DELIVERED",
  /** 배송 취소. 출고 전 취소 또는 반송 처리. */
  CANCELLED = "CANCELLED",
}

registerEnumType(FulfillmentState, { name: "FulfillmentState" });

/**
 * 배송(출고) 엔터티.
 *
 * 하나의 {@link Order}에서 실제 물리적으로 발송되는 단위를 나타낸다.
 * {@link OrderLine}과 M:N 관계를 통해 **부분 배송**을 지원한다.
 *
 * @example
 * // 부분 배송 예시
 * // Order (lines: [티셔츠, 후드, 모자])
 * //   └─ Fulfillment #1: lines=[티셔츠, 후드], trackingCode="CJ-12345"
 * //   └─ Fulfillment #2: lines=[모자],         trackingCode="CJ-67890"
 */
@ObjectType()
@Entity("fulfillment")
export class Fulfillment extends BaseEntity {
  /**
   * 현재 배송 상태.
   * 상태별 조회(배송 중, 완료 등)에 자주 사용되므로 인덱스를 추가한다.
   */
  @Field(() => FulfillmentState)
  @Index()
  @Column({ name: "state", type: "enum", enum: FulfillmentState, default: FulfillmentState.PENDING })
  state: FulfillmentState;

  /**
   * 배송사 운송장 번호.
   * SHIPPED 상태가 되면 설정된다. null이면 아직 발송 전.
   */
  @Field({ nullable: true })
  @Column({ name: "tracking_code", nullable: true })
  trackingCode: string | null;

  /**
   * 배송사(택배사) 이름.
   * enum 대신 string으로 관리해 배송사 변경·추가가 용이하다.
   * 예: "CJ대한통운", "한진택배", "롯데택배", "우체국택배".
   */
  @Field({ nullable: true })
  @Column({ name: "shipping_carrier", nullable: true })
  shippingCarrier: string | null;

  /** 소속 Order의 ID. */
  @Field()
  @Column({ name: "order_id" })
  orderId: string;

  /** 소속 Order. */
  @Index()
  @ManyToOne(() => Order, (o) => o.fulfillments)
  @JoinColumn({ name: "order_id" })
  order: Order;

  /**
   * 이 배송에 포함된 OrderLine 목록.
   * 부분 배송 지원을 위해 OrderLine과 M:N 관계를 사용한다.
   * 조인 테이블: `fulfillment_lines`
   */
  @Field(() => [OrderLine])
  @ManyToMany(() => OrderLine, (l) => l.fulfillments)
  @JoinTable({
    name: "fulfillment_lines",
    joinColumn: { name: "fulfillment_id" },
    inverseJoinColumn: { name: "order_line_id" },
  })
  lines: OrderLine[];
}
