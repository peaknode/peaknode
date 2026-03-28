import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * ProductOptionGroup 수정 요청 DTO.
 *
 * 전달된 필드만 업데이트된다.
 * 하위 옵션 추가/수정/삭제는 별도 mutation(createProductOption, updateProductOption, deleteProductOption)을 사용한다.
 */
@InputType()
export class UpdateProductOptionGroupDto {
  /** 변경할 옵션 그룹 표시명 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  /** 변경할 기계 판독용 식별자 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code?: string;
}
