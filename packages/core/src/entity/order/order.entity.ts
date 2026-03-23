import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Customer } from "../customer/customer.entity";
import { Promotion } from "../promotion/promotion.entity";
import { ShippingMethod } from "../shipping/shipping-method.entity";
import { Fulfillment } from "./fulfillment.entity";
import { OrderLine } from "./order-line.entity";
import { Payment } from "./payment.entity";

/**
 * 주문 상태 열거형.
 *
 * PENDING 상태의 Order가 장바구니 역할을 겸한다.
 * 별도의 Cart 엔터티 없이 상태 전이로 구매 플로우를 표현한다.
 */
export enum OrderState {
  /** 장바구니 단계. 상품을 담는 중이며 아직 주문 확정 전. */
  PENDING = "PENDING",
  /** 주문 확정. 결제 대기 중. */
  CONFIRMED = "CONFIRMED",
  /** 결제 완료. 출고 준비 단계. */
  PAID = "PAID",
  /** 배송 중. 전체 또는 일부 상품이 발송된 상태. */
  SHIPPED = "SHIPPED",
  /** 배송 완료. 고객이 상품을 수령한 상태. */
  DELIVERED = "DELIVERED",
  /** 주문 취소. */
  CANCELLED = "CANCELLED",
  /** 환불 완료. */
  REFUNDED = "REFUNDED",
}

/**
 * 배송지 주소 스냅샷 인터페이스.
 *
 * 주문 시점의 주소를 Order에 직접 저장한다.
 * 이후 Customer의 Address가 변경되어도 주문 당시 주소가 보존된다.
 */
export interface OrderAddress {
  /** 수령인 이름. */
  fullName: string;
  /** 도로명 주소 또는 지번 주소. */
  addressLine1: string;
  /** 상세 주소 (동/호수 등). */
  addressLine2: string;
  /** 우편번호. */
  postalCode: string;
  /** 수령인 연락처. */
  phoneNumber: string;
}

/**
 * 주문 엔터티.
 *
 * 커머스 시스템의 핵심 엔터티로, 장바구니(PENDING)부터 배송 완료(DELIVERED)까지
 * 전체 구매 사이클을 관리한다.
 *
 * @example
 * // 장바구니 → 주문 플로우
 * // 1. PENDING Order 생성 (장바구니)
 * // 2. OrderLine 추가
 * // 3. 주문 확정 → CONFIRMED
 * // 4. 결제 완료 → PAID
 * // 5. 출고 처리 → SHIPPED → DELIVERED
 */
@Entity("order")
export class Order extends BaseEntity {
  /**
   * 사람이 읽을 수 있는 고유 주문번호.
   * 예: "ORD-20240323-0001".
   * 생성 로직은 서비스 레이어에서 처리한다.
   */
  @Column({ unique: true })
  code: string;

  /**
   * 현재 주문 상태.
   * 주문 목록 필터링(미결제, 배송중 등)에 자주 사용되므로 인덱스를 추가한다.
   */
  @Index()
  @Column({ name: "state", type: "enum", enum: OrderState, default: OrderState.PENDING })
  state: OrderState;

  /**
   * 상품 합계 금액 (원 단위 정수).
   * 쿠폰/할인 적용 전 순수 상품 금액.
   */
  @Column({ name: "sub_total", type: "int", default: 0 })
  subTotal: number;

  /**
   * 배송비 (원 단위 정수).
   * 무료 배송이면 0.
   */
  @Column({ name: "shipping_total", type: "int", default: 0 })
  shippingTotal: number;

  /**
   * 할인 금액 합계 (원 단위 정수).
   * 쿠폰, 프로모션 등 모든 할인의 합.
   */
  @Column({ name: "discount_total", type: "int", default: 0 })
  discountTotal: number;

  /**
   * 최종 결제 금액 (원 단위 정수).
   * `subTotal + shippingTotal - discountTotal`로 계산한다.
   */
  @Column({ type: "int", default: 0 })
  total: number;

  /**
   * 주문 상품 총 수량.
   * 모든 OrderLine의 quantity 합계.
   */
  @Column({ name: "total_quantity", type: "int", default: 0 })
  totalQuantity: number;

  /**
   * 주문 시점 배송지 주소 스냅샷.
   * FK가 아닌 JSON으로 저장해 이후 주소 변경 영향을 받지 않는다.
   * 주문 확정 전(PENDING)이면 null일 수 있다.
   */
  @Column({ name: "shipping_address", type: "simple-json", nullable: true })
  shippingAddress: OrderAddress | null;

  /**
   * 선택된 배송 방법의 ID.
   * null이면 배송 방법 미선택 (PENDING 단계).
   */
  @Column({ name: "shipping_method_id", nullable: true })
  shippingMethodId: string | null;

  /**
   * 선택된 배송 방법.
   * 체크아웃 시 고객이 선택한 배송 방법을 기록한다.
   * ShippingMethod가 삭제되어도 주문 이력은 보존되도록 nullable로 설정.
   */
  @Index()
  @ManyToOne(() => ShippingMethod, { nullable: true })
  @JoinColumn({ name: "shipping_method_id" })
  shippingMethod: ShippingMethod | null;

  /**
   * 적용된 쿠폰 코드 (입력값 원본).
   * null이면 쿠폰 미사용.
   */
  @Column({ name: "coupon_code", nullable: true })
  couponCode: string | null;

  /**
   * 적용된 프로모션의 ID.
   * null이면 프로모션 미적용.
   */
  @Column({ name: "promotion_id", nullable: true })
  promotionId: string | null;

  /**
   * 적용된 프로모션.
   * 프로모션이 삭제되어도 주문 이력은 보존되도록 nullable로 설정.
   */
  @Index()
  @ManyToOne(() => Promotion, { nullable: true })
  @JoinColumn({ name: "promotion_id" })
  promotion: Promotion | null;

  /**
   * 주문한 고객의 ID.
   * null이면 게스트 주문.
   */
  @Column({ name: "customer_id", nullable: true })
  customerId: string | null;

  /**
   * 주문한 고객.
   * null이면 비회원 게스트 주문.
   */
  @Index()
  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer: Customer | null;

  /**
   * 주문 라인 목록.
   * cascade가 활성화되어 Order 저장 시 OrderLine도 함께 저장된다.
   */
  @OneToMany(() => OrderLine, (line) => line.order, { cascade: true })
  lines: OrderLine[];

  /** 이 주문의 결제 기록 목록. */
  @OneToMany(() => Payment, (p) => p.order)
  payments: Payment[];

  /** 이 주문의 배송(출고) 기록 목록. */
  @OneToMany(() => Fulfillment, (f) => f.order)
  fulfillments: Fulfillment[];
}
