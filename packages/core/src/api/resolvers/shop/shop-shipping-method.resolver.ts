import { Query, Resolver } from "@nestjs/graphql";
import { ShippingMethod } from "src/entity/shipping/shipping-method.entity";
import { ShippingMethodService } from "src/service/shipping/shipping-method.service";

/**
 * Shop API — ShippingMethod GraphQL Resolver.
 *
 * 고객이 선택 가능한 활성 배송 방법 목록을 공개 쿼리로 제공한다.
 * 인증 불필요 (공개 API).
 *
 * Endpoint: POST /graphql
 */
@Resolver(() => ShippingMethod)
export class ShopShippingMethodResolver {
  constructor(private readonly shippingMethodService: ShippingMethodService) {}

  /**
   * 활성화된 배송 방법 목록을 반환한다.
   * 체크아웃 화면에서 배송 방법 선택에 사용된다.
   *
   * @example
   * query {
   *   availableShippingMethods {
   *     id name code price freeShippingThreshold description
   *   }
   * }
   */
  @Query(() => [ShippingMethod], { description: "선택 가능한 배송 방법 목록 (enabled=true)" })
  async availableShippingMethods(): Promise<ShippingMethod[]> {
    const { items } = await this.shippingMethodService.findAll({ enabled: true, take: 100 });
    return items;
  }
}
