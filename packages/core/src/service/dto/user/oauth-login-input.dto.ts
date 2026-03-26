import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsOptional } from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * OAuth 로그인 Input DTO.
 *
 * OAuth 공급자(Google, Kakao 등)로부터 받은 정보를 전달할 때 사용한다.
 * - 기존 AuthenticationMethod가 있으면 로그인 처리
 * - 없으면 User + Customer + AuthenticationMethod를 자동 생성 (최초 OAuth 로그인)
 */
@InputType()
export class OAuthLoginInput {
  /**
   * OAuth 전략 이름.
   * 예: 'google', 'kakao'
   */
  @Field()
  @IsNotEmpty()
  strategy: string;

  /**
   * OAuth 공급자가 발급한 사용자 식별자 (sub / user_id 등).
   * AuthenticationMethod.externalIdentifier에 저장된다.
   */
  @Field()
  @IsNotEmpty()
  externalIdentifier: string;

  /**
   * OAuth 공급자로부터 얻은 이메일 주소 (최초 가입 시 필수).
   * User.identifier 및 Customer.emailAddress에 저장된다.
   */
  @Field({ nullable: true })
  @IsOptional()
  identifier?: string;

  /** 이름 (최초 가입 시 Customer.firstName에 저장) */
  @Field({ nullable: true })
  @IsOptional()
  firstName?: string;

  /** 성 (최초 가입 시 Customer.lastName에 저장) */
  @Field({ nullable: true })
  @IsOptional()
  lastName?: string;

  /**
   * OAuth 공급자 응답 원본 메타데이터 (선택).
   * AuthenticationMethod.metadata에 저장된다.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
