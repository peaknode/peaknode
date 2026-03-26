import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * 고객 사용자 생성 Input DTO.
 *
 * User + Customer + AuthenticationMethod(native)를 동시에 생성할 때 사용한다.
 * identifier는 이메일 형식이어야 하며, Customer.emailAddress에도 동일하게 저장된다.
 */
@InputType()
export class CreateCustomerUserInput {
  /**
   * 로그인 식별자 (이메일).
   * User.identifier 및 Customer.emailAddress에 저장된다.
   */
  @Field()
  @IsEmail()
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

  /** 전화번호 (선택) */
  @Field({ nullable: true })
  @IsOptional()
  phone?: string;

  /**
   * 커스텀 필드 값 맵 (선택).
   * `CustomFieldDefinition`(entityName="User")로 정의된 필드만 허용된다.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  customFields?: Record<string, unknown>;
}
