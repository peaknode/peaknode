import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";

/**
 * 네이티브 로그인 Input DTO.
 *
 * identifier(이메일/아이디) + 비밀번호 조합으로 로그인할 때 사용한다.
 */
@InputType()
export class LoginInput {
  /** 로그인 식별자 (User.identifier) */
  @Field()
  @IsNotEmpty()
  identifier: string;

  /** 비밀번호 */
  @Field()
  @IsNotEmpty()
  password: string;
}
