import { Field, InputType, Int } from "@nestjs/graphql";
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { OrderState } from "src/entity/order/order.entity";

/**
 * 주문 목록 조회 페이지네이션/필터 DTO.
 */
@InputType()
export class ListOrdersDto {
  /** 건너뜀 수. 기본 0. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  /** 페이지 크기. 기본 20, 최대 100. */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  /** 특정 상태로 필터링. */
  @Field(() => OrderState, { nullable: true })
  @IsOptional()
  @IsEnum(OrderState)
  state?: OrderState;

  /** 특정 고객의 주문만 조회. */
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
