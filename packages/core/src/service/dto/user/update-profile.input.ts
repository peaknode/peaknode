import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * 고객 프로필 수정 Input DTO.
 *
 * Customer 엔터티의 firstName, lastName, phone, customFields를 수정한다.
 * 모든 필드는 선택적이며 제공된 필드만 업데이트된다.
 */
@InputType()
export class UpdateProfileInput {
  /** 이름 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  /** 성 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  /** 전화번호 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  /**
   * 커스텀 필드 값 맵 (선택).
   * `CustomFieldDefinition`(entityName="Customer")로 정의된 필드만 허용된다.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  customFields?: Record<string, unknown>;
}
