import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty, IsOptional, IsUUID, MinLength } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * 관리자 사용자 생성 Input DTO.
 *
 * User + Administrator + AuthenticationMethod(native)를 동시에 생성할 때 사용한다.
 * 관리자 계정은 생성 즉시 verified=true로 활성화된다.
 */
@InputType()
export class CreateAdminUserInput {
  /**
   * 로그인 식별자 (이메일 권장).
   * User.identifier에 저장된다.
   */
  @Field()
  @IsNotEmpty()
  identifier: string;

  /** 비밀번호 (최소 8자). bcrypt로 해시되어 AuthenticationMethod에 저장된다. */
  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  /** 이름 */
  @Field()
  @IsNotEmpty()
  firstName: string;

  /** 성 */
  @Field()
  @IsNotEmpty()
  lastName: string;

  /** 관리자 이메일 주소 (identifier와 다를 수 있음) */
  @Field()
  @IsEmail()
  emailAddress: string;

  /**
   * 부여할 Role ID 목록 (선택).
   * 미지정 시 역할 없이 생성된다.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsUUID("4", { each: true })
  roleIds?: string[];

  /**
   * 커스텀 필드 값 맵 (선택).
   * `CustomFieldDefinition`(entityName="User")로 정의된 필드만 허용된다.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  customFields?: Record<string, unknown>;
}
