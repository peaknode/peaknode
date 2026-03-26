import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty } from "class-validator";

/**
 * 비밀번호 리셋 토큰 요청 Input DTO.
 *
 * 이 DTO로 요청하면 해당 사용자에게 리셋 토큰이 생성된다 (만료: 1시간).
 * 실제 이메일 발송은 이 서비스의 범위 밖이다.
 */
@InputType()
export class RequestPasswordResetInput {
  /** 비밀번호를 리셋할 사용자의 identifier (이메일) */
  @Field()
  @IsNotEmpty()
  identifier: string;
}
