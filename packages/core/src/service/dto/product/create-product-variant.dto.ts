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
 * ProductVariant 생성 요청 DTO.
 */
@InputType()
export class CreateProductVariantDto {
  /** 변형 표시명. 예: "흰색 / S" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** 재고 관리 단위(SKU). 전체 Variant에서 고유해야 한다. */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  /**
   * 판매 가격. 원(KRW) 단위 정수.
   * 예: 29000 → ₩29,000
   */
  @Field(() => Int)
  @IsInt()
  @Min(0)
  price: number;

  /**
   * 변형 활성화 여부.
   * @default true
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /**
   * 초기 재고 수량.
   * @default 0
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockOnHand?: number;

  /**
   * 재고 추적 여부.
   * false이면 재고 무관 항상 구매 가능.
   * @default true
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  /**
   * 품절 처리 기준 재고 수량.
   * @default 0
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  outOfStockThreshold?: number;

  /** 연결할 ProductOption UUID 목록 (선택) */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  optionIds?: string[];

  /** 변형 대표 이미지 Asset UUID (선택) */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  featuredAssetId?: string;
}
