import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AuthResult } from "src/api/types/auth-result.type";
import { User } from "src/entity";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CurrentUserId } from "src/common/decorators/current-user.decorator";
import { AuthService } from "src/service/auth/auth.service";
import { UserService } from "src/service/user/user.service";
import { CreateCustomerUserInput } from "src/service/dto/user/create-customer-user-input.dto";
import { LoginInput } from "src/service/dto/user/login-input.dto";
import { RequestPasswordResetInput } from "src/service/dto/user/request-password-reset-input.dto";
import { ResetPasswordInput } from "src/service/dto/user/reset-password-input.dto";

/**
 * Shop API — 인증 GraphQL Resolver.
 *
 * 고객용 회원가입, 로그인, 로그아웃, 토큰 갱신, 이메일 인증, 비밀번호 재설정 Mutation을 제공한다.
 *
 * Endpoint: POST /shop-api
 */
@Resolver(() => User)
export class ShopAuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * 고객 회원가입을 처리한다.
   *
   * User + Customer + AuthenticationMethod(native)를 생성하고 이메일 인증 토큰을 발급한다.
   * 이메일 인증 완료 전에는 로그인이 불가하지 않지만 verified=false 상태로 반환된다.
   *
   * @example
   * mutation {
   *   register(input: {
   *     identifier: "user@example.com"
   *     password: "password123"
   *     firstName: "길동"
   *     lastName: "홍"
   *   }) { accessToken refreshToken user { id verified } }
   * }
   */
  @Mutation(() => AuthResult, { description: "고객 회원가입 후 JWT 발급" })
  async register(@Args("input") input: CreateCustomerUserInput): Promise<AuthResult> {
    const user = await this.userService.createCustomerUser(input);
    return { ...await this.authService.login(input.identifier, input.password), user };
  }

  /**
   * 고객 계정으로 로그인한다.
   *
   * @example
   * mutation {
   *   loginAsCustomer(input: { identifier: "user@example.com", password: "password123" }) {
   *     accessToken refreshToken user { id identifier }
   *   }
   * }
   */
  @Mutation(() => AuthResult, { description: "고객 로그인 (JWT 발급)" })
  loginAsCustomer(@Args("input") input: LoginInput): Promise<AuthResult> {
    return this.authService.login(input.identifier, input.password);
  }

  /**
   * 로그아웃한다.
   *
   * 현재 사용자의 tokenVersion을 증가시켜 기존에 발급된 모든 토큰을 일괄 무효화한다.
   * 클라이언트는 보유 중인 토큰을 삭제해야 한다.
   *
   * @example
   * mutation { logout }
   * # Authorization: Bearer <accessToken>
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Boolean, { description: "로그아웃 (기존 토큰 전체 무효화)" })
  async logout(@CurrentUserId() userId: string): Promise<boolean> {
    await this.authService.logout(userId);
    return true;
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰을 발급한다.
   *
   * @example
   * mutation { refreshToken(token: "...") }
   * # Authorization: Bearer <accessToken>
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => String, { description: "리프레시 토큰으로 새 액세스 토큰 발급" })
  async refreshToken(
    @Args("token") token: string,
    @CurrentUserId() _userId: string,
  ): Promise<string> {
    const { accessToken } = await this.authService.refreshAccessToken(token);
    return accessToken;
  }

  /**
   * 이메일 인증 토큰을 검증하고 계정을 인증 완료 상태로 변경한다.
   *
   * @param token - 이메일로 발송된 인증 토큰
   * @example
   * mutation { verifyEmail(token: "abc123...") }
   */
  @Mutation(() => Boolean, { description: "이메일 인증" })
  async verifyEmail(@Args("token") token: string): Promise<boolean> {
    await this.userService.verifyEmail(token);
    return true;
  }

  /**
   * 비밀번호 재설정 토큰을 생성한다.
   *
   * 생성된 토큰은 실제 이메일 발송 시스템과 연동되어야 한다 (현재는 토큰만 생성).
   * 토큰 만료 시간은 1시간이다.
   *
   * @example
   * mutation { requestPasswordReset(input: { identifier: "user@example.com" }) }
   */
  @Mutation(() => Boolean, { description: "비밀번호 재설정 토큰 생성 요청" })
  async requestPasswordReset(@Args("input") input: RequestPasswordResetInput): Promise<boolean> {
    await this.userService.generatePasswordResetToken(input.identifier);
    return true;
  }

  /**
   * 비밀번호 재설정 토큰을 검증하고 새 비밀번호로 변경한다.
   *
   * @example
   * mutation { resetPassword(input: { token: "abc123...", newPassword: "newPass123" }) }
   */
  @Mutation(() => Boolean, { description: "비밀번호 재설정" })
  async resetPassword(@Args("input") input: ResetPasswordInput): Promise<boolean> {
    await this.userService.resetPassword(input.token, input.newPassword);
    return true;
  }
}
