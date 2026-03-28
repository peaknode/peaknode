import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * ProductOption 수정 요청 DTO.
 *
 * 전달된 필드만 업데이트된다.
 */
@InputType()
export class UpdateProductOptionDto {
  /** 변경할 옵션 값 표시명 (선택) */
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
