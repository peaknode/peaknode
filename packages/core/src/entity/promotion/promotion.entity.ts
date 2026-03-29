import { Field, GraphQLISODateTime, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Column, Entity } from "typeorm";
import { BaseEntity } from "../base/base.entity";

/**
 * 할인 유형 열거형.
 */
export enum DiscountType {
  /** 정률 할인. `value`는 퍼센트(%) 단위. 예: value=10 → 10% 할인. */
  PERCENTAGE = "PERCENTAGE",
  /** 정액 할인. `value`는 원(KRW) 단위. 예: value=5000 → ₩5,000 할인. */
  FIXED_AMOUNT = "FIXED_AMOUNT",
  /** 무료 배송. `value`는 무시된다. */
  FREE_SHIPPING = "FREE_SHIPPING",
}

registerEnumType(DiscountType, { name: "DiscountType" });

/**
 * 프로모션(쿠폰/할인) 엔터티.
 *
 * 정률 할인, 정액 할인, 무료 배송 세 가지 유형을 지원한다.
 * `code`가 있으면 쿠폰 코드 입력 방식, null이면 조건 충족 시 자동 적용된다.
 *
 * @example
 * // 10% 할인 쿠폰: type=PERCENTAGE, value=10, code="SUMMER10"
 * // ₩5,000 즉시 할인: type=FIXED_AMOUNT, value=5000, minimumOrderAmount=30000
 * // 자동 무료 배송: type=FREE_SHIPPING, code=null, minimumOrderAmount=50000
 */
@ObjectType()
@Entity("promotion")
export class Promotion extends BaseEntity {
  /** 프로모션 표시명. 관리자 화면에서 식별하는 이름. */
  @Field()
  @Column()
  name: string;

  /**
   * 쿠폰 코드.
   * null이면 조건(`minimumOrderAmount` 등) 충족 시 자동 적용.
   * 값이 있으면 고객이 직접 코드를 입력해야 적용된다.
   */
  @Field({ nullable: true })
  @Column({ unique: true, nullable: true })
  code: string | null;

  /**
   * 할인 유형.
   * PERCENTAGE(정률) / FIXED_AMOUNT(정액) / FREE_SHIPPING(무료 배송).
   */
  @Field(() => DiscountType)
  @Column({ type: "enum", enum: DiscountType })
  type: DiscountType;

  /**
   * 할인 값.
   * - PERCENTAGE: 퍼센트 값. 예: 10 → 10% 할인.
   * - FIXED_AMOUNT: 원 단위 정수. 예: 5000 → ₩5,000 할인.
   * - FREE_SHIPPING: 사용되지 않음 (0으로 설정).
   */
  @Field(() => Int)
  @Column({ type: "int", default: 0 })
  value: number;

  /**
   * 최소 주문 금액 조건 (원 단위 정수).
   * 주문 합계(subTotal)가 이 값 미만이면 프로모션이 적용되지 않는다.
   * null이면 최소 금액 제한 없음.
   */
  @Field(() => Int, { nullable: true })
  @Column({ name: "minimum_order_amount", type: "int", nullable: true })
  minimumOrderAmount: number | null;

  /**
   * 전체 사용 가능 횟수.
   * `usageCount`가 이 값에 도달하면 더 이상 사용할 수 없다.
   * null이면 횟수 제한 없음.
   */
  @Field(() => Int, { nullable: true })
  @Column({ name: "usage_limit", type: "int", nullable: true })
  usageLimit: number | null;

  /**
   * 현재까지 사용된 횟수.
   * 주문 확정 시 1씩 증가한다.
   */
  @Field(() => Int)
  @Column({ name: "usage_count", type: "int", default: 0 })
  usageCount: number;

  /**
   * 고객 1인당 최대 사용 횟수.
   * null이면 1인당 횟수 제한 없음.
   */
  @Field(() => Int, { nullable: true })
  @Column({ name: "per_customer_limit", type: "int", nullable: true })
  perCustomerLimit: number | null;

  /**
   * 프로모션 시작 일시.
   * null이면 즉시 유효.
   */
  @Field(() => GraphQLISODateTime, { nullable: true })
  @Column({ name: "starts_at", type: "timestamp", nullable: true })
  startsAt: Date | null;

  /**
   * 프로모션 종료 일시.
   * null이면 만료 없음.
   */
  @Field(() => GraphQLISODateTime, { nullable: true })
  @Column({ name: "ends_at", type: "timestamp", nullable: true })
  endsAt: Date | null;

  /**
   * 프로모션 활성화 여부.
   * false이면 유효기간 내에도 적용되지 않는다.
   */
  @Field()
  @Column({ default: true })
  enabled: boolean;
}
