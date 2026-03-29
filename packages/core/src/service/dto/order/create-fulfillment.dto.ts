import { Field, ID, InputType } from "@nestjs/graphql";
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * 배송(출고) 생성 입력 DTO.
 *
 * PAID 상태의 주문에서 특정 OrderLine들을 포함하는 Fulfillment를 생성한다.
 * 부분 배송을 지원하므로 일부 라인만 선택할 수 있다.
 */
@InputType()
export class CreateFulfillmentDto {
  /**
   * 이 배송에 포함할 OrderLine UUID 목록.
   * 최소 1개 이상이어야 한다.
   */
  @Field(() => [ID])
  @IsArray()
  @IsUUID("all", { each: true })
  @ArrayMinSize(1)
  orderLineIds: string[];

  /**
   * 배송사(택배사) 이름.
   * 예: "CJ대한통운", "한진택배"
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCarrier?: string;

  /**
   * 운송장 번호.
   * 발송 후 설정된다.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingCode?: string;
}
