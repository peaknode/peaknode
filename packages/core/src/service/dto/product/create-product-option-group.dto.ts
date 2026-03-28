import { Field, InputType } from "@nestjs/graphql";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 옵션그룹 생성 시 함께 만들 초기 옵션 아이템 DTO.
 */
@InputType()
export class ProductOptionItemDto {
  /** 옵션 표시명. 예: "흰색", "S" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** 기계 판독용 식별자. 예: "white", "s" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;
}

/**
 * ProductOptionGroup 생성 요청 DTO.
 *
 * 그룹 생성과 동시에 초기 옵션 목록을 포함할 수 있다.
 */
@InputType()
export class CreateProductOptionGroupDto {
  /** 옵션 그룹 표시명. 예: "색상", "사이즈" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** 기계 판독용 식별자. 예: "color", "shoe-size" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  /** 그룹 생성과 함께 추가할 초기 옵션 목록 (선택) */
  @Field(() => [ProductOptionItemDto], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionItemDto)
  options?: ProductOptionItemDto[];
}
