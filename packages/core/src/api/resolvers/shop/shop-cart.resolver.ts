import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { Cart } from "src/entity/cart/cart.entity";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CurrentUserId } from "src/common/decorators/current-user.decorator";
import { CartService } from "src/service/cart/cart.service";
import { AddCartItemDto } from "src/service/dto/cart/add-cart-item.dto";
import { UpdateCartItemDto } from "src/service/dto/cart/update-cart-item.dto";

/**
 * Shop API — 장바구니 GraphQL Resolver.
 *
 * 게스트와 회원 모두 `token` 기반으로 장바구니를 사용한다.
 * `mergeCart`는 로그인한 사용자만 호출할 수 있다.
 *
 * Endpoint: POST /shop-api/graphql
 */
@Resolver(() => Cart)
export class ShopCartResolver {
  constructor(private readonly cartService: CartService) {}

  /**
   * 토큰으로 장바구니를 조회하거나, 없으면 빈 장바구니를 생성한다.
   *
   * @example
   * query {
   *   cart(token: "guest-uuid") {
   *     id token items { id quantity productVariant { id name price } }
   *   }
   * }
   */
  @Query(() => Cart, { description: "장바구니 조회 (없으면 생성)" })
  cart(@Args("token") token: string): Promise<Cart> {
    return this.cartService.getOrCreateCart(token);
  }

  /**
   * 장바구니에 상품을 추가한다.
   *
   * 같은 Variant가 이미 있으면 수량이 합산된다.
   *
   * @example
   * mutation {
   *   addItemToCart(token: "guest-uuid", input: { productVariantId: "...", quantity: 2 }) {
   *     id items { id quantity productVariant { name price } }
   *   }
   * }
   */
  @Mutation(() => Cart, { description: "장바구니에 상품 추가" })
  addItemToCart(
    @Args("token") token: string,
    @Args("input") input: AddCartItemDto,
  ): Promise<Cart> {
    return this.cartService.addItem(token, input);
  }

  /**
   * 장바구니 아이템 수량을 변경한다. quantity=0이면 아이템이 삭제된다.
   *
   * @example
   * mutation {
   *   updateCartItemQuantity(token: "...", cartItemId: "...", input: { quantity: 3 }) {
   *     id items { id quantity }
   *   }
   * }
   */
  @Mutation(() => Cart, { description: "장바구니 아이템 수량 변경 (0이면 삭제)" })
  updateCartItemQuantity(
    @Args("token") token: string,
    @Args("cartItemId", { type: () => ID }) cartItemId: string,
    @Args("input") input: UpdateCartItemDto,
  ): Promise<Cart> {
    return this.cartService.updateItemQuantity(token, cartItemId, input.quantity);
  }

  /**
   * 장바구니에서 특정 아이템을 삭제한다.
   *
   * @example
   * mutation {
   *   removeCartItem(token: "...", cartItemId: "...") {
   *     id items { id quantity }
   *   }
   * }
   */
  @Mutation(() => Cart, { description: "장바구니 아이템 삭제" })
  removeCartItem(
    @Args("token") token: string,
    @Args("cartItemId", { type: () => ID }) cartItemId: string,
  ): Promise<Cart> {
    return this.cartService.removeItem(token, cartItemId);
  }

  /**
   * 장바구니의 모든 아이템을 제거한다.
   *
   * @example
   * mutation {
   *   clearCart(token: "...") { id items { id } }
   * }
   */
  @Mutation(() => Cart, { description: "장바구니 비우기" })
  clearCart(@Args("token") token: string): Promise<Cart> {
    return this.cartService.clearCart(token);
  }

  /**
   * 로그인 시 게스트 장바구니를 회원 장바구니로 병합한다.
   *
   * 인증된 사용자만 호출할 수 있다.
   *
   * @example
   * mutation {
   *   mergeCart(guestToken: "guest-uuid") {
   *     id token customerId items { id quantity }
   *   }
   * }
   * # Authorization: Bearer <accessToken>
   */
  @UseGuards(JwtAuthGuard)
  @Mutation(() => Cart, { description: "게스트 장바구니를 회원 장바구니로 병합" })
  mergeCart(
    @CurrentUserId() userId: string,
    @Args("guestToken") guestToken: string,
  ): Promise<Cart> {
    return this.cartService.mergeGuestCart(guestToken, userId);
  }
}
