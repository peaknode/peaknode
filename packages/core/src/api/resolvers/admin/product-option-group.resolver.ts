import { Args, ID, Mutation, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ProductOption, ProductOptionGroup } from "src/entity";
import { CreateProductOptionGroupDto } from "src/service/dto/product/create-product-option-group.dto";
import { UpdateProductOptionGroupDto } from "src/service/dto/product/update-product-option-group.dto";
import { CreateProductOptionDto } from "src/service/dto/product/create-product-option.dto";
import { UpdateProductOptionDto } from "src/service/dto/product/update-product-option.dto";
import { ProductOptionGroupService } from "src/service/product/product-option-group.service";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";

/**
 * Admin API — ProductOptionGroup / ProductOption GraphQL Resolver.
 *
 * 옵션그룹 생성·수정 및 옵션 값 추가·수정·삭제 Mutation을 제공한다.
 * 모든 요청은 `AdminAuthGuard`로 보호되며 `Permission.ProductUpdate` 권한이 필요하다.
 *
 * **어드민 UX 흐름:**
 * 1. `createProductOptionGroup` — 상품에 옵션 구조 정의 (색상, 사이즈 등)
 * 2. `createProductOption` — 그룹에 옵션 값 추가
 * 3. 이후 ProductVariant Resolver로 Variant(SKU) 생성
 *
 * Endpoint: POST /admin-api
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => ProductOptionGroup)
export class ProductOptionGroupResolver {
  constructor(private readonly productOptionGroupService: ProductOptionGroupService) {}

  // ─── 옵션그룹 Mutations ──────────────────────────────────────────────────

  /**
   * 옵션그룹을 생성하고 지정한 Product에 연결한다.
   *
   * `input.options`를 포함하면 초기 옵션도 함께 생성된다.
   *
   * @example
   * mutation {
   *   createProductOptionGroup(productId: "p-uuid", input: {
   *     name: "색상", code: "color",
   *     options: [{ name: "흰색", code: "white" }, { name: "검정", code: "black" }]
   *   }) { id name options { id name code } }
   * }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => ProductOptionGroup, { description: "옵션그룹 생성 및 Product 연결" })
  createProductOptionGroup(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("input") input: CreateProductOptionGroupDto,
  ): Promise<ProductOptionGroup> {
    return this.productOptionGroupService.create(productId, input);
  }

  /**
   * 옵션그룹 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * @example
   * mutation { updateProductOptionGroup(id: "og-uuid", input: { name: "색상 (변경)" }) { id name } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => ProductOptionGroup, { description: "옵션그룹 수정" })
  updateProductOptionGroup(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateProductOptionGroupDto,
  ): Promise<ProductOptionGroup> {
    return this.productOptionGroupService.update(id, input);
  }

  // ─── 옵션 Mutations ──────────────────────────────────────────────────────

  /**
   * 특정 옵션그룹에 새 옵션 값을 추가한다.
   *
   * @example
   * mutation { createProductOption(groupId: "og-uuid", input: { name: "빨강", code: "red" }) { id name code } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => ProductOption, { description: "옵션그룹에 옵션 값 추가" })
  createProductOption(
    @Args("groupId", { type: () => ID }) groupId: string,
    @Args("input") input: CreateProductOptionDto,
  ): Promise<ProductOption> {
    return this.productOptionGroupService.createOption(groupId, input);
  }

  /**
   * 옵션 값을 수정한다. 전달된 필드만 업데이트된다.
   *
   * @example
   * mutation { updateProductOption(id: "opt-uuid", input: { name: "레드" }) { id name code } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => ProductOption, { description: "옵션 값 수정" })
  updateProductOption(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateProductOptionDto,
  ): Promise<ProductOption> {
    return this.productOptionGroupService.updateOption(id, input);
  }

  /**
   * 옵션 값을 영구 삭제한다.
   *
   * 현재 활성 Variant에서 사용 중인 경우 ConflictException이 발생한다.
   *
   * @example
   * mutation { deleteProductOption(id: "opt-uuid") }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Boolean, { description: "옵션 값 삭제" })
  async deleteProductOption(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.productOptionGroupService.deleteOption(id);
    return true;
  }
}
