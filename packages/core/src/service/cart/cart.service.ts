import * as crypto from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { Cart } from "src/entity/cart/cart.entity";
import { CartItem } from "src/entity/cart/cart-item.entity";
import { ProductVariant } from "src/entity/product/product-variant.entity";
import { Customer } from "src/entity/customer/customer.entity";
import { AddCartItemDto } from "../dto/cart/add-cart-item.dto";

/**
 * 장바구니(Cart) 도메인의 비즈니스 로직을 담당하는 서비스.
 *
 * - 게스트(비회원)와 회원 모두 `token` 기반으로 장바구니를 식별한다.
 * - 로그인 시 `mergeGuestCart()`를 호출해 게스트 장바구니를 회원 장바구니로 병합한다.
 * - 재고 추적이 활성화된 Variant는 추가/수량 변경 시 가용 재고를 검증한다.
 *
 * @example
 * // 게스트 플로우:
 * const cart = await cartService.getOrCreateCart("guest-uuid-token");
 * await cartService.addItem("guest-uuid-token", variantId, 2);
 *
 * // 로그인 후 병합:
 * await cartService.mergeGuestCart("guest-uuid-token", userId);
 */
@Injectable()
export class CartService {
  constructor(protected readonly db: TransactionConnection) {}

  // ---------------------------------------------------------------------------
  // 조회 / 생성
  // ---------------------------------------------------------------------------

  /**
   * 토큰으로 장바구니를 조회하거나, 없으면 새로 생성한다.
   *
   * @param token - 클라이언트가 보관하는 장바구니 고유 토큰
   * @param customerId - 생성 시 연결할 Customer ID (선택)
   * @returns 아이템이 포함된 Cart
   */
  async getOrCreateCart(token: string, customerId?: string): Promise<Cart> {
    const existing = await this.loadCartByToken(token);
    if (existing) return existing;

    const repo = this.db.getRepository(Cart);
    const newCart = repo.create({ token, customerId: customerId ?? null, items: [] });
    const saved = await repo.save(newCart);
    return this.loadCartById(saved.id);
  }

  // ---------------------------------------------------------------------------
  // 아이템 추가 / 수정 / 삭제
  // ---------------------------------------------------------------------------

  /**
   * 장바구니에 상품을 추가한다.
   *
   * 동일한 Variant가 이미 있으면 수량을 합산한다.
   * 재고 추적 Variant는 가용 재고(stockOnHand - stockAllocated)를 초과할 수 없다.
   *
   * @param token - 장바구니 토큰
   * @param dto - 추가할 상품 정보
   * @returns 업데이트된 Cart
   * @throws NotFoundException - Variant를 찾을 수 없는 경우
   * @throws BadRequestException - 비활성 Variant이거나 재고 부족인 경우
   */
  @Transactional()
  async addItem(token: string, dto: AddCartItemDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(token);

    const variant = await this.db.getRepository(ProductVariant).findOne({
      where: { id: dto.productVariantId },
    });

    if (!variant) {
      throw new NotFoundException(`ProductVariant(id: "${dto.productVariantId}")를 찾을 수 없습니다.`);
    }
    if (!variant.enabled) {
      throw new BadRequestException(`ProductVariant(id: "${dto.productVariantId}")는 현재 구매 불가 상태입니다.`);
    }

    const cartItemRepo = this.db.getRepository(CartItem);
    const existingItem = cart.items.find((i) => i.productVariantId === dto.productVariantId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + dto.quantity;
      this.validateStock(variant, newQuantity);
      existingItem.quantity = newQuantity;
      await cartItemRepo.save(existingItem);
    } else {
      this.validateStock(variant, dto.quantity);
      const newItem = cartItemRepo.create({
        cartId: cart.id,
        productVariantId: dto.productVariantId,
        quantity: dto.quantity,
      });
      await cartItemRepo.save(newItem);
    }

    return this.loadCartById(cart.id);
  }

  /**
   * 장바구니 아이템의 수량을 변경한다.
   *
   * `quantity`가 0이면 아이템이 삭제된다.
   *
   * @param token - 장바구니 토큰
   * @param cartItemId - 변경할 CartItem UUID
   * @param quantity - 새 수량 (0이면 삭제)
   * @returns 업데이트된 Cart
   * @throws NotFoundException - 아이템이 없거나 해당 토큰의 장바구니에 속하지 않는 경우
   * @throws BadRequestException - 재고 부족인 경우
   */
  @Transactional()
  async updateItemQuantity(token: string, cartItemId: string, quantity: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(token);
    const item = cart.items.find((i) => i.id === cartItemId);

    if (!item) {
      throw new NotFoundException(`CartItem(id: "${cartItemId}")를 찾을 수 없습니다.`);
    }

    const cartItemRepo = this.db.getRepository(CartItem);

    if (quantity === 0) {
      await cartItemRepo.remove(item);
    } else {
      this.validateStock(item.productVariant, quantity);
      item.quantity = quantity;
      await cartItemRepo.save(item);
    }

    return this.loadCartById(cart.id);
  }

  /**
   * 장바구니에서 특정 아이템을 삭제한다.
   *
   * @param token - 장바구니 토큰
   * @param cartItemId - 삭제할 CartItem UUID
   * @returns 업데이트된 Cart
   * @throws NotFoundException - 아이템이 없거나 해당 토큰의 장바구니에 속하지 않는 경우
   */
  @Transactional()
  async removeItem(token: string, cartItemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(token);
    const item = cart.items.find((i) => i.id === cartItemId);

    if (!item) {
      throw new NotFoundException(`CartItem(id: "${cartItemId}")를 찾을 수 없습니다.`);
    }

    await this.db.getRepository(CartItem).remove(item);
    return this.loadCartById(cart.id);
  }

  /**
   * 장바구니의 모든 아이템을 제거한다.
   *
   * @param token - 장바구니 토큰
   * @returns 비워진 Cart
   */
  @Transactional()
  async clearCart(token: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(token);

    if (cart.items.length > 0) {
      await this.db.getRepository(CartItem).remove(cart.items);
    }

    return this.loadCartById(cart.id);
  }

  // ---------------------------------------------------------------------------
  // 병합
  // ---------------------------------------------------------------------------

  /**
   * 로그인 시 게스트 장바구니를 회원 장바구니로 병합한다.
   *
   * 병합 규칙:
   * - 회원 기존 장바구니가 없으면 → 게스트 장바구니의 customerId를 설정해 전환
   * - 회원 기존 장바구니가 있으면 → 게스트 아이템을 회원 장바구니에 합산, 게스트 장바구니 삭제
   * - 동일 Variant는 수량을 합산한다 (재고 초과 검증 없음; UI에서 결제 시 재검증)
   *
   * @param guestToken - 게스트 장바구니 토큰
   * @param userId - 로그인한 User UUID (Customer 조회에 사용)
   * @returns 병합 완료된 Cart
   * @throws NotFoundException - User에 연결된 Customer가 없는 경우
   */
  @Transactional()
  async mergeGuestCart(guestToken: string, userId: string): Promise<Cart> {
    const customer = await this.db.getRepository(Customer).findOne({ where: { userId } });

    if (!customer) {
      throw new NotFoundException(`User(id: "${userId}")에 연결된 Customer를 찾을 수 없습니다.`);
    }

    const guestCart = await this.loadCartByToken(guestToken);

    // 게스트 장바구니가 없으면 회원 장바구니를 반환 (없으면 새로 생성)
    if (!guestCart) {
      const customerCart = await this.db
        .getRepository(Cart)
        .findOne({ where: { customerId: customer.id }, relations: { items: { productVariant: true } } });
      if (customerCart) return customerCart;
      return this.getOrCreateCart(crypto.randomUUID(), customer.id);
    }

    // 회원 기존 장바구니 조회
    const customerCart = await this.db
      .getRepository(Cart)
      .findOne({ where: { customerId: customer.id }, relations: { items: true } });

    if (!customerCart) {
      // 게스트 장바구니를 회원 장바구니로 전환
      guestCart.customerId = customer.id;
      await this.db.getRepository(Cart).save(guestCart);
      return this.loadCartById(guestCart.id);
    }

    // 게스트 아이템을 회원 장바구니에 병합
    const cartItemRepo = this.db.getRepository(CartItem);

    for (const guestItem of guestCart.items) {
      const existing = customerCart.items.find(
        (i) => i.productVariantId === guestItem.productVariantId,
      );

      if (existing) {
        existing.quantity += guestItem.quantity;
        await cartItemRepo.save(existing);
      } else {
        const newItem = cartItemRepo.create({
          cartId: customerCart.id,
          productVariantId: guestItem.productVariantId,
          quantity: guestItem.quantity,
        });
        await cartItemRepo.save(newItem);
      }
    }

    // 게스트 장바구니 삭제
    await cartItemRepo.remove(guestCart.items);
    await this.db.getRepository(Cart).remove(guestCart);

    return this.loadCartById(customerCart.id);
  }

  // ---------------------------------------------------------------------------
  // 합계 계산
  // ---------------------------------------------------------------------------

  /**
   * 장바구니 상품 합계 금액(subTotal)을 계산한다.
   *
   * 각 아이템의 `productVariant.price × quantity`를 합산한다.
   * 장바구니 아이템에 `productVariant`가 로드되어 있어야 한다.
   *
   * @param cart - items.productVariant가 로드된 Cart
   * @returns 상품 합계 금액 (원)
   */
  calculateCartTotals(cart: Cart): { subTotal: number } {
    const subTotal = cart.items.reduce((sum, item) => {
      return sum + item.productVariant.price * item.quantity;
    }, 0);
    return { subTotal };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * 재고 추적이 활성화된 Variant의 가용 재고를 검증한다.
   *
   * @param variant - 검증할 ProductVariant
   * @param requestedQuantity - 요청 수량
   * @throws BadRequestException - 가용 재고 부족인 경우
   */
  private validateStock(variant: ProductVariant, requestedQuantity: number): void {
    if (!variant.trackInventory) return;

    const available = variant.stockOnHand - variant.stockAllocated;
    if (available < requestedQuantity) {
      throw new BadRequestException(
        `재고가 부족합니다. 가용 재고: ${available}개, 요청 수량: ${requestedQuantity}개`,
      );
    }
  }

  /**
   * 토큰으로 Cart를 조회한다. items와 productVariant relation이 함께 로드된다.
   *
   * @param token - 장바구니 토큰
   * @returns Cart 또는 null
   */
  private loadCartByToken(token: string): Promise<Cart | null> {
    return this.db.getRepository(Cart).findOne({
      where: { token },
      relations: { items: { productVariant: true } },
    });
  }

  /**
   * ID로 Cart를 조회한다. items와 productVariant relation이 함께 로드된다.
   *
   * @param cartId - Cart UUID
   * @returns Cart
   */
  private loadCartById(cartId: string): Promise<Cart> {
    return this.db.getRepository(Cart).findOne({
      where: { id: cartId },
      relations: { items: { productVariant: true } },
    });
  }
}
