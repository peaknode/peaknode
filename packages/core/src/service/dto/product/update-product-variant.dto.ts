import { Field, ID, InputType, Int } from "@nestjs/graphql";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

/**
 * ProductVariant 수정 요청 DTO.
 *
 * 전달된 필드만 업데이트된다.
 * optionIds 전달 시 기존 옵션 연결을 전부 교체한다.
 */
@InputType()
export class UpdateProductVariantDto {
  /** 변경할 변형 표시명 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  /** 변경할 SKU (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku?: string;

  /** 변경할 판매 가격, 원(KRW) 단위 정수 (선택) */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  /** 변경할 활성화 여부 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** 변경할 재고 수량 (선택) */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockOnHand?: number;

  /** 변경할 재고 추적 여부 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  /** 변경할 품절 처리 기준 재고 수량 (선택) */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  outOfStockThreshold?: number;

  /**
   * 변경할 연결 옵션 UUID 목록 (선택).
   * 전달 시 기존 옵션 연결을 전부 교체한다.
   */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  optionIds?: string[];

  /** 변경할 대표 이미지 Asset UUID (선택) */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  featuredAssetId?: string;
}
