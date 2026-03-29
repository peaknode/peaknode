import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ShippingMethod } from "src/entity/shipping/shipping-method.entity";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";
import { ShippingMethodService } from "src/service/shipping/shipping-method.service";
import { CreateShippingMethodDto } from "src/service/dto/shipping/create-shipping-method.dto";
import { UpdateShippingMethodDto } from "src/service/dto/shipping/update-shipping-method.dto";
import { ListShippingMethodsDto } from "src/service/dto/shipping/list-shipping-methods.dto";
import { ShippingMethodListResult } from "../../types/shipping-method-list-result.type";

/**
 * Admin API — ShippingMethod GraphQL Resolver.
 *
 * 배송 방법 CRUD를 제공한다.
 * 모든 요청은 `AdminAuthGuard`로 보호되며 메서드별 `@RequirePermissions()`로 권한을 세분화한다.
 *
 * Endpoint: POST /graphql
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => ShippingMethod)
export class ShippingMethodResolver {
  constructor(private readonly shippingMethodService: ShippingMethodService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /**
   * 배송 방법 목록을 페이지네이션하여 반환한다.
   *
   * @example
   * query {
   *   shippingMethods(options: { enabled: true }) {
   *     total
   *     items { id name code price freeShippingThreshold }
   *   }
   * }
   */
  @RequirePermissions(Permission.ShippingMethodRead)
  @Query(() => ShippingMethodListResult, { description: "배송 방법 목록 조회" })
  shippingMethods(
    @Args("options", { type: () => ListShippingMethodsDto, nullable: true })
    options?: ListShippingMethodsDto,
  ): Promise<ShippingMethodListResult> {
    return this.shippingMethodService.findAll(options);
  }

  /**
   * ID로 배송 방법 단건을 조회한다.
   *
   * @example
   * query { shippingMethod(id: "uuid") { id name code price } }
   */
  @RequirePermissions(Permission.ShippingMethodRead)
  @Query(() => ShippingMethod, { description: "ID로 배송 방법 단건 조회" })
  shippingMethod(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<ShippingMethod> {
    return this.shippingMethodService.findOne(id);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  /**
   * 새 배송 방법을 생성한다.
   *
   * @example
   * mutation {
   *   createShippingMethod(input: { name: "기본 배송", code: "standard", price: 3000, freeShippingThreshold: 50000 }) {
   *     id name code
   *   }
   * }
   */
  @RequirePermissions(Permission.ShippingMethodCreate)
  @Mutation(() => ShippingMethod, { description: "배송 방법 생성" })
  createShippingMethod(
    @Args("input") input: CreateShippingMethodDto,
  ): Promise<ShippingMethod> {
    return this.shippingMethodService.create(input);
  }

  /**
   * 배송 방법 정보를 수정한다.
   *
   * @example
   * mutation {
   *   updateShippingMethod(id: "uuid", input: { enabled: false }) { id enabled }
   * }
   */
  @RequirePermissions(Permission.ShippingMethodUpdate)
  @Mutation(() => ShippingMethod, { description: "배송 방법 수정" })
  updateShippingMethod(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateShippingMethodDto,
  ): Promise<ShippingMethod> {
    return this.shippingMethodService.update(id, input);
  }

  /**
   * 배송 방법을 소프트 딜리트한다.
   * 활성 주문에서 사용 중인 경우 삭제가 거부된다.
   *
   * @example
   * mutation { deleteShippingMethod(id: "uuid") }
   */
  @RequirePermissions(Permission.ShippingMethodDelete)
  @Mutation(() => Boolean, { description: "배송 방법 소프트 딜리트" })
  async deleteShippingMethod(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.shippingMethodService.delete(id);
    return true;
  }
}
