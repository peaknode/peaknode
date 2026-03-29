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
 * 배송 방법 생성 요청 DTO.
 */
@InputType()
export class CreateShippingMethodDto {
  /**
   * 배송 방법 표시명.
   * 예: "기본 배송", "빠른 배송".
   */
  @Field()
  @IsString()
  @MaxLength(100)
  name: string;

  /**
   * 기계 판독용 고유 식별자.
   * 영문 소문자, 숫자, 하이픈만 허용.
   * 예: "standard", "express".
   */
  @Field()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "code는 영문 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다",
  })
  code: string;

  /** 배송 방법 설명 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 기본 배송비 (원 단위 정수).
   * @default 0
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  /**
   * 무료 배송 기준 금액 (원 단위 정수).
   * null이면 무조건 price 적용.
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  freeShippingThreshold?: number | null;

  /**
   * 활성화 여부.
   * @default true
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
