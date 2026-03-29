import { Field, InputType, Int } from "@nestjs/graphql";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from "class-validator";

/**
 * 배송 방법 수정 요청 DTO.
 * 모든 필드가 선택적이며, 전달된 필드만 업데이트된다.
 */
@InputType()
export class UpdateShippingMethodDto {
  /** 배송 방법 표시명 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  /**
   * 기계 판독용 고유 식별자.
   * 변경 시 기존 code와 중복 여부를 재검증한다.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "code는 영문 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다",
  })
  code?: string;

  /** 배송 방법 설명 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  /** 기본 배송비 (원 단위 정수) */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  /**
   * 무료 배송 기준 금액 (원 단위 정수).
   * null 전달 시 무조건 price 적용으로 변경.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeShippingThreshold?: number | null;

  /** 활성화 여부 */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
