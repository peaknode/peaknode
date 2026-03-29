import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Order } from "src/entity/order/order.entity";

/**
 * 주문 목록 페이지네이션 응답 타입.
 */
@ObjectType()
export class OrderListResult {
  /** 현재 페이지 주문 목록. */
  @Field(() => [Order])
  items: Order[];

  /** 전체 주문 건수. */
  @Field(() => Int)
  total: number;
}
