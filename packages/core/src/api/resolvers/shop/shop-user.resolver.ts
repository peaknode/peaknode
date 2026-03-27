import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { Customer, User } from "src/entity";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CurrentUserId } from "src/common/decorators/current-user.decorator";
import { UserService } from "src/service/user/user.service";
import { ChangePasswordInput } from "src/service/dto/user/change-password-input.dto";
import { UpdateProfileInput } from "src/service/dto/user/update-profile.input";

/**
 * Shop API — 고객 계정 GraphQL Resolver.
 *
 * 인증된 고객이 본인의 정보를 조회/수정하는 Query/Mutation을 제공한다.
 * 모든 메서드는 JwtAuthGuard를 통해 인증이 필수적으로 요구된다.
 *
 * Endpoint: POST /shop-api
 */
@UseGuards(JwtAuthGuard)
@Resolver(() => User)
export class ShopUserResolver {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 로그인한 사용자의 User 정보를 반환한다.
   *
   * @example
   * query {
   *   me { id identifier verified isActive lastLogin }
   * }
   * # Authorization: Bearer <accessToken>
   */
  @Query(() => User, { description: "현재 로그인한 사용자 정보 조회" })
  me(@CurrentUserId() userId: string): Promise<User | undefined> {
    return this.userService.findById(userId);
  }

  /**
   * 현재 로그인한 고객의 프로필(Customer)을 수정한다.
   *
   * @example
   * mutation {
   *   updateMyProfile(input: { firstName: "길동", phone: "010-1234-5678" }) {
   *     id firstName lastName phone emailAddress
   *   }
   * }
   * # Authorization: Bearer <accessToken>
   */
  @Mutation(() => Customer, { description: "고객 프로필 수정 (이름, 전화번호 등)" })
  updateMyProfile(
    @CurrentUserId() userId: string,
    @Args("input") input: UpdateProfileInput,
  ): Promise<Customer> {
    return this.userService.updateProfile(userId, input);
  }

  /**
   * 현재 비밀번호를 확인한 후 새 비밀번호로 변경한다.
   *
   * @example
   * mutation {
   *   changePassword(input: { currentPassword: "old", newPassword: "newPass123" })
   * }
   * # Authorization: Bearer <accessToken>
   */
  @Mutation(() => Boolean, { description: "비밀번호 변경" })
  async changePassword(
    @CurrentUserId() userId: string,
    @Args("input") input: ChangePasswordInput,
  ): Promise<boolean> {
    await this.userService.changePassword(userId, input.currentPassword, input.newPassword);
    return true;
  }

  /**
   * 회원 탈퇴를 처리한다.
   *
   * User와 Customer 모두 비활성화(isActive=false)되며 기존 토큰이 무효화된다.
   * 주문 이력 등 관련 데이터는 보존된다.
   *
   * @example
   * mutation { withdrawAccount }
   * # Authorization: Bearer <accessToken>
   */
  @Mutation(() => Boolean, { description: "회원 탈퇴 (계정 비활성화)" })
  async withdrawAccount(@CurrentUserId() userId: string): Promise<boolean> {
    await this.userService.withdrawAccount(userId);
    return true;
  }
}
