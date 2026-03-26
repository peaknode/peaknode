import { Field, ObjectType } from "@nestjs/graphql";
import { User } from "src/entity";

/**
 * 로그인/인증 성공 결과 타입.
 *
 * 네이티브 로그인(`login`) 및 OAuth 로그인(`loginWithOAuth`) 성공 시 반환된다.
 * - `accessToken`: API 요청에 사용하는 단기 JWT (만료: 15분)
 * - `refreshToken`: 액세스 토큰 재발급에 사용하는 장기 JWT (만료: 7일)
 */
@ObjectType()
export class AuthResult {
  /** 액세스 토큰 (JWT, 만료: 15분) */
  @Field()
  accessToken: string;

  /** 리프레시 토큰 (JWT, 만료: 7일) */
  @Field()
  refreshToken: string;

  /** 인증된 사용자 엔터티 */
  @Field(() => User)
  user: User;
}
