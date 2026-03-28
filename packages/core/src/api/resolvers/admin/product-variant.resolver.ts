import { Args, ID, Mutation, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ProductVariant } from "src/entity";
import { CreateProductVariantDto } from "src/service/dto/product/create-product-variant.dto";
import { UpdateProductVariantDto } from "src/service/dto/product/update-product-variant.dto";
import { ProductVariantService } from "src/service/product/product-variant.service";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";

/**
 * Admin API — ProductVariant GraphQL Resolver.
 *
 * Variant(SKU) 생성·수정·소프트 딜리트 Mutation을 제공한다.
 * 모든 요청은 `AdminAuthGuard`로 보호되며 `Permission.ProductUpdate` 권한이 필요하다.
 *
 * **어드민 UX 흐름 (선행 작업 필요):**
 * 1. ProductOptionGroup Resolver로 옵션 구조 정의 완료
 * 2. `createProductVariant` — 옵션 조합마다 Variant 생성
 * 3. `updateProductVariant` — 가격·재고·활성화 상태 수정
 *
 * Endpoint: POST /admin-api
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => ProductVariant)
export class ProductVariantResolver {
  constructor(private readonly productVariantService: ProductVariantService) {}

  /**
   * 새 ProductVariant(SKU)를 생성한다.
   *
   * `input.optionIds`로 옵션 조합을 연결한다.
   *
   * @example
   * mutation {
   *   createProductVariant(productId: "p-uuid", input: {
   *     name: "흰색 / S", sku: "TEE-WHITE-S", price: 29000,
   *     optionIds: ["white-opt-uuid", "s-opt-uuid"]
   *   }) { id sku price options { name } }
   * }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => ProductVariant, { description: "ProductVariant(SKU) 생성" })
  createProductVariant(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("input") input: CreateProductVariantDto,
  ): Promise<ProductVariant> {
    return this.productVariantService.create(productId, input);
  }

  /**
   * ProductVariant 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * `input.optionIds` 전달 시 기존 옵션 연결을 전부 교체한다.
   *
   * @example
   * mutation {
   *   updateProductVariant(id: "v-uuid", input: { price: 32000, stockOnHand: 50 }) { id price stockOnHand }
   * }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => ProductVariant, { description: "ProductVariant 수정" })
  updateProductVariant(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateProductVariantDto,
  ): Promise<ProductVariant> {
    return this.productVariantService.update(id, input);
  }

  /**
   * ProductVariant를 소프트 딜리트한다.
   *
   * @example
   * mutation { deleteProductVariant(id: "v-uuid") }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Boolean, { description: "ProductVariant 소프트 딜리트" })
  async deleteProductVariant(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.productVariantService.softDelete(id);
    return true;
  }
}
