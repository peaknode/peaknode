import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthResult } from "src/api/types/auth-result.type";
import { User } from "src/entity";
import { AuthService } from "src/service/auth/auth.service";
import { CreateAdminUserInput } from "src/service/dto/user/create-admin-user-input.dto";
import { LoginInput } from "src/service/dto/user/login-input.dto";
import { UserService } from "src/service/user/user.service";

/**
 * Admin API — User & Auth GraphQL Resolver.
 *
 * 관리자용 사용자 관리 및 인증 Mutation/Query를 제공한다.
 * 트랜잭션은 서비스 레이어의 `@Transactional()` 데코레이터로 자동 처리된다.
 *
 * Endpoint: POST /admin-api
 */
@Resolver(() => User)
export class UserResolver {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /**
   * ID로 사용자를 조회한다.
   *
   * @example
   * query { user(id: "uuid") { id identifier isActive verified } }
   */
  @Query(() => User, { nullable: true, description: "ID로 사용자 단건 조회" })
  user(@Args("id", { type: () => ID }) id: string): Promise<User | undefined> {
    return this.userService.findById(id);
  }

  // ─── Mutations ────────────────────────────────────────────────────────────

  /**
   * 관리자 사용자를 생성한다.
   *
   * User + Administrator + AuthenticationMethod(native)를 동시에 생성한다.
   *
   * @example
   * mutation {
   *   createAdminUser(input: {
   *     identifier: "admin@example.com"
   *     password: "securePass1"
   *     firstName: "길동"
   *     lastName: "홍"
   *     emailAddress: "admin@example.com"
   *   }) { id identifier }
   * }
   */
  @Mutation(() => User, { description: "관리자 사용자 생성" })
  createAdminUser(@Args("input") input: CreateAdminUserInput): Promise<User> {
    return this.userService.createAdminUser(input);
  }

  /**
   * 사용자를 비활성화한다.
   *
   * @example
   * mutation { deactivateUser(id: "uuid") { id isActive } }
   */
  @Mutation(() => User, { description: "사용자 비활성화" })
  deactivateUser(@Args("id", { type: () => ID }) id: string): Promise<User> {
    return this.userService.deactivate(id);
  }

  /**
   * 관리자 계정으로 로그인한다.
   *
   * 성공 시 JWT 액세스 토큰과 리프레시 토큰을 반환한다.
   *
   * @example
   * mutation {
   *   loginAsAdmin(input: { identifier: "admin@example.com", password: "securePass1" }) {
   *     accessToken
   *     refreshToken
   *     user { id identifier }
   *   }
   * }
   */
  @Mutation(() => AuthResult, { description: "관리자 로그인 (JWT 발급)" })
  loginAsAdmin(@Args("input") input: LoginInput): Promise<AuthResult> {
    return this.authService.login(input.identifier, input.password);
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰을 발급한다.
   *
   * @example
   * mutation { refreshToken(token: "...") }
   */
  @Mutation(() => String, { description: "리프레시 토큰으로 새 액세스 토큰 발급" })
  async refreshToken(@Args("token") token: string): Promise<string> {
    const { accessToken } = await this.authService.refreshAccessToken(token);
    return accessToken;
  }
}
