import { Field, ID, InputType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import { IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";

/**
 * 체크아웃 시 배송지 주소 입력 DTO.
 */
@InputType()
export class CheckoutAddressInput {
  /** 수령인 이름. */
  @Field()
  @IsString()
  @MaxLength(100)
  fullName: string;

  /** 도로명 주소 또는 지번 주소. */
  @Field()
  @IsString()
  @MaxLength(255)
  addressLine1: string;

  /** 상세 주소 (동/호수 등). */
  @Field()
  @IsString()
  @MaxLength(255)
  addressLine2: string;

  /** 우편번호. */
  @Field()
  @IsString()
  @MaxLength(20)
  postalCode: string;

  /** 수령인 연락처. */
  @Field()
  @IsString()
  @MaxLength(20)
  phoneNumber: string;
}

/**
 * 장바구니 → 주문 전환(체크아웃) 입력 DTO.
 *
 * 인증된 고객이 장바구니 토큰, 배송 방법, 배송지를 제출해 주문을 생성한다.
 */
@InputType()
export class CheckoutDto {
  /** 선택한 배송 방법 UUID. */
  @Field(() => ID)
  @IsUUID()
  shippingMethodId: string;

  /** 배송지 주소 스냅샷. */
  @Field(() => CheckoutAddressInput)
  @ValidateNested()
  @Type(() => CheckoutAddressInput)
  shippingAddress: CheckoutAddressInput;

  /**
   * 적용할 쿠폰 코드.
   * null이면 쿠폰 미사용.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  couponCode?: string;
}
