import { Field, Int, ObjectType } from "@nestjs/graphql";
import { ShippingMethod } from "src/entity/shipping/shipping-method.entity";

/**
 * 배송 방법 목록 조회 결과 타입.
 * items: 현재 페이지의 배송 방법 목록, total: 전체 건수.
 */
@ObjectType()
export class ShippingMethodListResult {
  /** 현재 페이지 배송 방법 목록 */
  @Field(() => [ShippingMethod])
  items: ShippingMethod[];

  /** 전체 배송 방법 수 (페이지네이션 무관) */
  @Field(() => Int)
  total: number;
}
