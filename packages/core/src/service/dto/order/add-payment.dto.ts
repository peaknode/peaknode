import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsObject, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * 주문에 결제를 추가할 때 사용하는 입력 DTO.
 *
 * 결제가 추가되면 Payment는 AUTHORIZED 상태로 생성된다.
 * 실제 정산은 `settlePayment`를 호출해야 한다.
 */
@InputType()
export class AddPaymentDto {
  /**
   * 결제 수단 식별자.
   * 예: "card", "bank_transfer", "kakao_pay", "toss"
   */
  @Field()
  @IsString()
  @MaxLength(50)
  method: string;

  /**
   * 결제 금액. 미입력 시 Order.total이 사용된다.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  /**
   * PG사 승인 트랜잭션 ID.
   * PG사로부터 이미 승인 번호를 받은 경우에 설정한다.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;

  /**
   * PG사 응답 원본 데이터 (감사 추적용).
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
