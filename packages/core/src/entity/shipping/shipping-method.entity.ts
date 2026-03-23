import { Column, Entity } from "typeorm";
import { BaseEntity } from "../base/base.entity";

/**
 * 배송 방법 엔터티.
 *
 * 쇼핑몰에서 제공하는 배송 정책을 나타낸다.
 * 기본 배송비(`price`)와 무료 배송 기준 금액(`freeShippingThreshold`)으로
 * 배송비를 계산한다.
 *
 * @example
 * // 일반 배송: price=3000, freeShippingThreshold=50000
 * // → 주문 금액 50,000원 미만이면 ₩3,000, 이상이면 무료
 *
 * // 무조건 무료 배송: price=0, freeShippingThreshold=null
 * // → 항상 무료
 *
 * // 프리미엄 배송: price=5000, freeShippingThreshold=null
 * // → 항상 ₩5,000
 */
@Entity("shipping_method")
export class ShippingMethod extends BaseEntity {
  /**
   * 배송 방법 표시명.
   * 예: "기본 배송", "빠른 배송", "새벽 배송".
   */
  @Column()
  name: string;

  /**
   * 배송 방법의 기계 판독용 고유 식별자.
   * 영문 소문자와 하이픈 사용을 권장한다.
   * 예: "standard", "express", "overnight".
   */
  @Column({ unique: true })
  code: string;

  /**
   * 배송 방법 설명.
   * 예: "영업일 기준 2~3일 내 도착".
   * null이면 설명 없음.
   */
  @Column({ type: "text", nullable: true })
  description: string | null;

  /**
   * 배송 방법 활성화 여부.
   * false이면 고객이 해당 배송 방법을 선택할 수 없다.
   */
  @Column({ default: true })
  enabled: boolean;

  /**
   * 기본 배송비 (원 단위 정수).
   * 0이면 무조건 무료 배송.
   * `freeShippingThreshold` 조건 충족 시 이 값 대신 0이 적용된다.
   */
  @Column({ type: "int", default: 0 })
  price: number;

  /**
   * 무료 배송 기준 금액 (원 단위 정수).
   * 주문 합계(subTotal)가 이 값 이상이면 배송비가 0이 된다.
   * null이면 무료 배송 기준 없이 항상 `price`가 적용된다.
   *
   * @example
   * // freeShippingThreshold=50000 → ₩50,000 이상 구매 시 무료
   * // freeShippingThreshold=null  → 항상 price 적용
   */
  @Column({ name: "free_shipping_threshold", type: "int", nullable: true })
  freeShippingThreshold: number | null;
}
