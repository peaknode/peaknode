import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { Product } from "src/entity";
import { CreateProductDto } from "src/service/dto/product/create-product.dto";
import { ListProductsDto } from "src/service/dto/product/list-products.dto";
import { UpdateProductDto } from "src/service/dto/product/update-product.dto";
import { ProductService } from "src/service/product/product.service";
import { ProductAssetService } from "src/service/product/product-asset.service";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";
import { ProductListResult } from "../../types/product-list-result.type";

/**
 * Admin API — Product GraphQL Resolver.
 *
 * 상품 CRUD 및 옵션그룹 관리를 위한 Query/Mutation을 제공한다.
 * 모든 요청은 `AdminAuthGuard`로 보호되며 메서드별 `@RequirePermissions()`로 권한을 세분화한다.
 * 트랜잭션은 서비스 레이어의 `@Transactional()` 데코레이터로 자동 처리된다.
 *
 * Endpoint: POST /admin-api
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => Product)
export class ProductResolver {
  constructor(
    private readonly productService: ProductService,
    private readonly productAssetService: ProductAssetService,
  ) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /**
   * 상품 목록을 페이지네이션하여 반환한다.
   *
   * @example
   * query {
   *   products(options: { skip: 0, take: 20, enabled: true }) {
   *     total
   *     items { id name slug enabled }
   *   }
   * }
   */
  @RequirePermissions(Permission.ProductRead)
  @Query(() => ProductListResult, { description: "상품 목록 조회 (페이지네이션)" })
  products(
    @Args("options", { type: () => ListProductsDto, nullable: true })
    options?: ListProductsDto,
  ): Promise<ProductListResult> {
    return this.productService.findAll(options);
  }

  /**
   * ID로 상품 단건을 조회한다.
   *
   * @example
   * query { product(id: "uuid") { id name slug variants { sku price } } }
   */
  @RequirePermissions(Permission.ProductRead)
  @Query(() => Product, { description: "ID로 상품 단건 조회" })
  product(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Product> {
    return this.productService.findOne(id);
  }

  /**
   * slug로 상품 단건을 조회한다.
   *
   * @example
   * query { productBySlug(slug: "mens-basic-tee") { id name } }
   */
  @RequirePermissions(Permission.ProductRead)
  @Query(() => Product, { description: "slug로 상품 단건 조회" })
  productBySlug(
    @Args("slug") slug: string,
  ): Promise<Product> {
    return this.productService.findBySlug(slug);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  /**
   * 새 상품을 생성한다.
   *
   * @example
   * mutation {
   *   createProduct(input: { name: "반팔 티셔츠", slug: "basic-tee" }) { id }
   * }
   */
  @RequirePermissions(Permission.ProductCreate)
  @Mutation(() => Product, { description: "상품 생성" })
  createProduct(
    @Args("input") input: CreateProductDto,
  ): Promise<Product> {
    return this.productService.create(input);
  }

  /**
   * 상품 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * @example
   * mutation {
   *   updateProduct(id: "uuid", input: { enabled: false }) { id enabled }
   * }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Product, { description: "상품 수정" })
  updateProduct(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.update(id, input);
  }

  /**
   * 상품을 소프트 딜리트한다. 하위 Variant도 함께 삭제된다.
   *
   * @example
   * mutation { deleteProduct(id: "uuid") }
   */
  @RequirePermissions(Permission.ProductDelete)
  @Mutation(() => Boolean, { description: "상품 소프트 딜리트" })
  async deleteProduct(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.productService.softDelete(id);
    return true;
  }

  /**
   * 기존 ProductOptionGroup을 Product에 추가한다.
   *
   * @example
   * mutation { addOptionGroupToProduct(productId: "p-uuid", optionGroupId: "og-uuid") { id optionGroups { name } } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Product, { description: "상품에 옵션그룹 추가" })
  addOptionGroupToProduct(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("optionGroupId", { type: () => ID }) optionGroupId: string,
  ): Promise<Product> {
    return this.productService.addOptionGroupToProduct(productId, optionGroupId);
  }

  /**
   * Product에서 ProductOptionGroup을 제거한다.
   *
   * force=true이면 해당 그룹의 옵션이 Variant에 사용 중이더라도 강제 제거한다.
   *
   * @example
   * mutation { removeOptionGroupFromProduct(productId: "p-uuid", optionGroupId: "og-uuid", force: true) { id } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Product, { description: "상품에서 옵션그룹 제거" })
  removeOptionGroupFromProduct(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("optionGroupId", { type: () => ID }) optionGroupId: string,
    @Args("force", { nullable: true, defaultValue: false }) force?: boolean,
  ): Promise<Product> {
    return this.productService.removeOptionGroupFromProduct(productId, optionGroupId, force);
  }

  // ─── 갤러리 Mutations ─────────────────────────────────────────────────────

  /**
   * 상품 갤러리에 이미지를 추가한다.
   *
   * @example
   * mutation { addProductAsset(productId: "p-uuid", assetId: "a-uuid") { id productAssets { position asset { id } } } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Product, { description: "상품 갤러리에 이미지 추가" })
  addProductAsset(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("assetId", { type: () => ID }) assetId: string,
  ): Promise<Product> {
    return this.productAssetService.add(productId, assetId);
  }

  /**
   * 상품 갤러리에서 이미지를 제거한다.
   *
   * @example
   * mutation { removeProductAsset(productId: "p-uuid", assetId: "a-uuid") { id productAssets { position asset { id } } } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Product, { description: "상품 갤러리에서 이미지 제거" })
  removeProductAsset(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("assetId", { type: () => ID }) assetId: string,
  ): Promise<Product> {
    return this.productAssetService.remove(productId, assetId);
  }

  /**
   * 상품 갤러리 이미지 순서를 재정렬한다.
   *
   * `assetIds` 배열의 인덱스 순서가 새 position이 된다.
   * 배열에 없는 기존 이미지는 제거된다.
   *
   * @example
   * mutation { reorderProductAssets(productId: "p-uuid", assetIds: ["a2-uuid", "a1-uuid"]) { id productAssets { position } } }
   */
  @RequirePermissions(Permission.ProductUpdate)
  @Mutation(() => Product, { description: "상품 갤러리 이미지 순서 재정렬" })
  reorderProductAssets(
    @Args("productId", { type: () => ID }) productId: string,
    @Args("assetIds", { type: () => [ID] }) assetIds: string[],
  ): Promise<Product> {
    return this.productAssetService.reorder(productId, assetIds);
  }
}
