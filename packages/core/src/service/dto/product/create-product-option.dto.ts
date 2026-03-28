import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * ProductOption 생성 요청 DTO.
 *
 * 특정 ProductOptionGroup에 새 옵션 값을 추가한다.
 */
@InputType()
export class CreateProductOptionDto {
  /** 옵션 값 표시명. 예: "흰색", "XL" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  /** 기계 판독용 식별자. 예: "white", "xl" */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;
}
