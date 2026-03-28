import { Args, ID, Query, Resolver } from "@nestjs/graphql";
import { NotFoundException } from "@nestjs/common";
import { Product } from "src/entity";
import { ListProductsDto } from "src/service/dto/product/list-products.dto";
import { ProductService } from "src/service/product/product.service";
import { ProductListResult } from "../../types/product-list-result.type";

/**
 * Shop API — Product GraphQL Resolver.
 *
 * 공개 상점에서 상품을 조회하는 Query를 제공한다.
 * 인증 불필요 (공개 엔드포인트).
 *
 * **Admin API와의 차이:**
 * - `enabled=true` 조건이 기본으로 적용되어 비활성 상품은 노출되지 않는다.
 * - 소프트 딜리트된 상품도 자동 제외된다.
 *
 * Endpoint: POST /shop-api
 */
@Resolver(() => Product)
export class ShopProductResolver {
  constructor(private readonly productService: ProductService) {}

  /**
   * 활성 상품 목록을 페이지네이션하여 반환한다.
   *
   * `options.enabled`를 명시적으로 전달해도 `true`로 고정된다.
   *
   * @example
   * query {
   *   products(options: { take: 20, search: "티셔츠" }) {
   *     total
   *     items { id name slug }
   *   }
   * }
   */
  @Query(() => ProductListResult, { description: "활성 상품 목록 조회 (Shop)" })
  products(
    @Args("options", { type: () => ListProductsDto, nullable: true })
    options?: ListProductsDto,
  ): Promise<ProductListResult> {
    return this.productService.findAll({ ...options, enabled: true });
  }

  /**
   * ID로 활성 상품 단건을 조회한다. 비활성 상품은 NotFoundException을 반환한다.
   *
   * @example
   * query { product(id: "uuid") { id name slug variants { sku price } } }
   */
  @Query(() => Product, { description: "ID로 활성 상품 단건 조회 (Shop)" })
  async product(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Product> {
    const p = await this.productService.findOne(id);
    if (!p.enabled) throw new NotFoundException(`Product(id: "${id}")를 찾을 수 없습니다.`);
    return p;
  }

  /**
   * slug로 활성 상품 단건을 조회한다. 비활성 상품은 NotFoundException을 반환한다.
   *
   * @example
   * query { productBySlug(slug: "basic-tee") { id name } }
   */
  @Query(() => Product, { description: "slug로 활성 상품 단건 조회 (Shop)" })
  async productBySlug(
    @Args("slug") slug: string,
  ): Promise<Product> {
    const p = await this.productService.findBySlug(slug);
    if (!p.enabled) throw new NotFoundException(`Product(slug: "${slug}")를 찾을 수 없습니다.`);
    return p;
  }
}
