import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { FulfillmentState } from "src/entity/order/fulfillment.entity";

/**
 * 배송(출고) 정보 수정 입력 DTO.
 *
 * 운송장 번호, 배송사, 상태를 변경할 수 있다.
 * `state`를 SHIPPED로 변경하면 운송장 번호가 함께 설정되는 것이 권장된다.
 */
@InputType()
export class UpdateFulfillmentDto {
  /**
   * 새 배송 상태.
   * SHIPPED로 변경 시 Order도 SHIPPED로 전환된다.
   * DELIVERED 시 모든 Fulfillment가 DELIVERED이면 Order도 DELIVERED로 전환된다.
   */
  @Field(() => FulfillmentState, { nullable: true })
  @IsOptional()
  @IsEnum(FulfillmentState)
  state?: FulfillmentState;

  /** 운송장 번호. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingCode?: string;

  /** 배송사(택배사) 이름. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCarrier?: string;
}
