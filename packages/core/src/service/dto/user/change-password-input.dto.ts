import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, MinLength } from "class-validator";

/**
 * 비밀번호 변경 Input DTO.
 *
 * 현재 비밀번호를 검증한 후 새 비밀번호로 변경한다.
 * 대상 userId는 컨텍스트(요청 사용자)에서 서비스가 직접 받는다.
 */
@InputType()
export class ChangePasswordInput {
  /** 현재 비밀번호 */
  @Field()
  @IsNotEmpty()
  currentPassword: string;

  /** 새 비밀번호 (최소 8자) */
  @Field()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
