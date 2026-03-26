import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, MinLength } from "class-validator";

/**
 * 비밀번호 리셋 완료 Input DTO.
 *
 * `requestPasswordReset`으로 생성된 토큰과 새 비밀번호를 전달한다.
 */
@InputType()
export class ResetPasswordInput {
  /** 비밀번호 리셋 토큰 (User.resetPasswordToken) */
  @Field()
  @IsNotEmpty()
  token: string;

  /** 새 비밀번호 (최소 8자) */
  @Field()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
