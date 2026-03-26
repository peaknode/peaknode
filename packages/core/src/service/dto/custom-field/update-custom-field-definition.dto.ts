import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * 커스텀 필드 정의 수정 요청 DTO.
 *
 * `entityName`, `name`, `type`은 생성 후 변경할 수 없으므로 포함하지 않는다.
 * 전달된 필드만 업데이트된다.
 */
@InputType()
export class UpdateCustomFieldDefinitionDto {
  /** UI 표시용 레이블 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  label?: string;

  /** 필수 여부 */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  /** 배열 여부 */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  list?: boolean;

  /** 기본값. type에 맞는 JSON 값이어야 한다. */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  defaultValue?: unknown;
}
