import { Field, InputType } from "@nestjs/graphql";
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";
import {
  CustomFieldEntityName,
  CustomFieldType,
} from "src/entity/custom-field/custom-field-definition.entity";

/**
 * 커스텀 필드 정의 생성 요청 DTO.
 *
 * 생성 후 `entityName`, `name`, `type`은 변경할 수 없다.
 */
@InputType()
export class CreateCustomFieldDefinitionDto {
  /** 커스텀 필드를 추가할 엔터티 이름 */
  @Field(() => CustomFieldEntityName)
  @IsEnum(CustomFieldEntityName)
  entityName: CustomFieldEntityName;

  /**
   * 필드 키 이름 (snake_case 권장).
   * 동일 엔터티 내에서 고유해야 한다.
   * @example "warranty_period"
   */
  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: "name은 소문자로 시작하는 영문 소문자, 숫자, 언더스코어 조합이어야 합니다",
  })
  name: string;

  /** 필드 데이터 타입 */
  @Field(() => CustomFieldType)
  @IsEnum(CustomFieldType)
  type: CustomFieldType;

  /** UI 표시용 레이블 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  label?: string;

  /**
   * 필수 여부 (기본: false).
   * true이면 해당 엔터티 생성/수정 시 반드시 값을 전달해야 한다.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  /**
   * 배열 여부 (기본: false).
   * true이면 값이 type에 해당하는 배열이어야 한다.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  list?: boolean;

  /** 기본값 (선택). type에 맞는 JSON 값이어야 한다. */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  defaultValue?: unknown;
}
