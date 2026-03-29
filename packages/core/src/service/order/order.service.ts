import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { Cart } from "src/entity/cart/cart.entity";
import { CartItem } from "src/entity/cart/cart-item.entity";
import { Customer } from "src/entity/customer/customer.entity";
import { Fulfillment, FulfillmentState } from "src/entity/order/fulfillment.entity";
import { Order, OrderState } from "src/entity/order/order.entity";
import { OrderLine } from "src/entity/order/order-line.entity";
import { Payment, PaymentState } from "src/entity/order/payment.entity";
import { ProductVariant } from "src/entity/product/product-variant.entity";
import { IsNull } from "typeorm";
import { ShippingMethodService } from "../shipping/shipping-method.service";
import { AddPaymentDto } from "../dto/order/add-payment.dto";
import { CheckoutDto } from "../dto/order/checkout.dto";
import { CreateFulfillmentDto } from "../dto/order/create-fulfillment.dto";
import { ListOrdersDto } from "../dto/order/list-orders.dto";
import { UpdateFulfillmentDto } from "../dto/order/update-fulfillment.dto";

/** 상태 전환 허용 맵. key → 전환 가능한 상태 목록 */
const ALLOWED_TRANSITIONS: Partial<Record<OrderState, OrderState[]>> = {
  [OrderState.CONFIRMED]: [OrderState.PAID, OrderState.CANCELLED],
  [OrderState.PAID]: [OrderState.SHIPPED, OrderState.CANCELLED],
  [OrderState.SHIPPED]: [OrderState.DELIVERED],
  [OrderState.DELIVERED]: [OrderState.REFUNDED],
  [OrderState.CANCELLED]: [],
};

/**
 * 주문(Order) 도메인의 비즈니스 로직을 담당하는 서비스.
 *
 * - 체크아웃: Cart → Order 전환, 재고 할당, 주문 코드 생성
 * - 상태 머신: CONFIRMED → PAID → SHIPPED → DELIVERED (+ CANCELLED/REFUNDED)
 * - 결제: Payment 추가 및 정산
 * - 배송: Fulfillment 생성 및 상태 업데이트 (부분 배송 지원)
 *
 * @example
 * // 전체 주문 플로우
 * const order = await orderService.checkout(cartToken, dto, userId);
 * const payment = await orderService.addPayment(order.id, paymentDto);
 * await orderService.settlePayment(payment.id, "pg-transaction-id");
 * const fulfillment = await orderService.createFulfillment(order.id, fulfillmentDto);
 */
@Injectable()
export class OrderService {
  constructor(
    protected readonly db: TransactionConnection,
    private readonly shippingMethodService: ShippingMethodService,
  ) {}

  // ---------------------------------------------------------------------------
  // 조회
  // ---------------------------------------------------------------------------

  /**
   * 주문 목록을 페이지네이션하여 반환한다.
   *
   * @param options - 페이지, 상태, 고객 ID 필터 옵션
   * @returns items: 주문 배열, total: 전체 건수
   */
  async findAll(options: ListOrdersDto = {}): Promise<{ items: Order[]; total: number }> {
    const { skip = 0, take = 20, state, customerId } = options;

    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (state) where.state = state;
    if (customerId) where.customerId = customerId;

    const [items, total] = await this.db.getRepository(Order).findAndCount({
      where,
      skip,
      take: Math.min(take, 100),
      order: { createdAt: "DESC" },
    });

    return { items, total };
  }

  /**
   * ID로 주문 단건을 조회한다. 모든 관계(lines, payments, fulfillments)가 포함된다.
   *
   * @param id - Order UUID
   * @throws NotFoundException
   */
  async findOne(id: string): Promise<Order> {
    return this.loadOrder(id);
  }

  /**
   * 특정 고객의 주문 목록을 조회한다.
   *
   * @param customerId - Customer UUID
   * @param options - 페이지 옵션
   * @returns items: 주문 배열, total: 전체 건수
   */
  async findByCustomer(
    customerId: string,
    options: Pick<ListOrdersDto, "skip" | "take"> = {},
  ): Promise<{ items: Order[]; total: number }> {
    return this.findAll({ ...options, customerId });
  }

  // ---------------------------------------------------------------------------
  // 체크아웃
  // ---------------------------------------------------------------------------

  /**
   * 장바구니를 주문으로 전환한다 (체크아웃).
   *
   * - CartItem → OrderLine 변환 (가격·이름·SKU 스냅샷 저장)
   * - trackInventory=true인 Variant의 `stockAllocated` 증가
   * - 전환 완료 후 Cart 삭제
   * - 생성된 Order는 CONFIRMED 상태
   *
   * @param cartToken - 체크아웃할 장바구니 토큰
   * @param dto - 배송 방법, 배송지, 쿠폰 코드
   * @param userId - 로그인한 User UUID (Customer 조회에 사용)
   * @returns 생성된 Order
   * @throws BadRequestException - 장바구니가 비어 있거나 배송 방법이 비활성화된 경우
   * @throws NotFoundException - Customer 또는 Cart를 찾을 수 없는 경우
   */
  @Transactional()
  async checkout(cartToken: string, dto: CheckoutDto, userId: string): Promise<Order> {
    // 1. 고객 조회
    const customer = await this.db.getRepository(Customer).findOne({ where: { userId } });
    if (!customer) {
      throw new NotFoundException(`User(id: "${userId}")에 연결된 Customer를 찾을 수 없습니다.`);
    }

    // 2. 장바구니 조회
    const cart = await this.db.getRepository(Cart).findOne({
      where: { token: cartToken },
      relations: { items: { productVariant: true } },
    });
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("장바구니가 비어 있습니다.");
    }

    // 3. 배송 방법 검증
    const shippingMethod = await this.shippingMethodService.findOne(dto.shippingMethodId);
    if (!shippingMethod.enabled) {
      throw new BadRequestException("선택한 배송 방법을 사용할 수 없습니다.");
    }

    // 4. 금액 계산
    const subTotal = cart.items.reduce(
      (sum, item) => sum + item.productVariant.price * item.quantity,
      0,
    );
    const shippingTotal = this.shippingMethodService.calculateShipping(shippingMethod, subTotal);
    const discountTotal = 0;
    const total = subTotal + shippingTotal - discountTotal;
    const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    // 5. Order 생성
    const orderRepo = this.db.getRepository(Order);
    const order = orderRepo.create({
      code: this.generateOrderCode(),
      state: OrderState.CONFIRMED,
      customerId: customer.id,
      shippingMethodId: dto.shippingMethodId,
      shippingAddress: dto.shippingAddress,
      couponCode: dto.couponCode ?? null,
      promotionId: null,
      subTotal,
      shippingTotal,
      discountTotal,
      total,
      totalQuantity,
    });
    const savedOrder = await orderRepo.save(order);

    // 6. OrderLine 생성 + 재고 할당
    const orderLineRepo = this.db.getRepository(OrderLine);
    const variantRepo = this.db.getRepository(ProductVariant);

    for (const cartItem of cart.items) {
      const { productVariant } = cartItem;
      const line = orderLineRepo.create({
        orderId: savedOrder.id,
        productVariantId: cartItem.productVariantId,
        quantity: cartItem.quantity,
        unitPrice: productVariant.price,
        linePrice: productVariant.price * cartItem.quantity,
        productVariantName: productVariant.name,
        sku: productVariant.sku,
      });
      await orderLineRepo.save(line);

      if (productVariant.trackInventory) {
        await variantRepo.increment(
          { id: cartItem.productVariantId },
          "stockAllocated",
          cartItem.quantity,
        );
      }
    }

    // 7. Cart 삭제
    await this.db.getRepository(CartItem).remove(cart.items);
    await this.db.getRepository(Cart).remove(cart);

    return this.loadOrder(savedOrder.id);
  }

  // ---------------------------------------------------------------------------
  // 상태 머신
  // ---------------------------------------------------------------------------

  /**
   * 주문 상태를 전환한다.
   *
   * 허용된 전환:
   * - CONFIRMED → PAID | CANCELLED
   * - PAID → SHIPPED | CANCELLED
   * - SHIPPED → DELIVERED
   * - DELIVERED → REFUNDED
   *
   * CANCELLED 전환 시 할당된 재고가 해제된다.
   *
   * @param id - Order UUID
   * @param newState - 전환할 상태
   * @returns 업데이트된 Order
   * @throws BadRequestException - 허용되지 않은 상태 전환인 경우
   */
  @Transactional()
  async transitionToState(id: string, newState: OrderState): Promise<Order> {
    return this.doTransitionToState(id, newState);
  }

  // ---------------------------------------------------------------------------
  // 결제
  // ---------------------------------------------------------------------------

  /**
   * 주문에 결제를 추가한다. AUTHORIZED 상태로 생성된다.
   *
   * @param orderId - 결제할 Order UUID
   * @param dto - 결제 방법, 금액, 트랜잭션 ID 등
   * @returns 생성된 Payment
   * @throws BadRequestException - CONFIRMED 상태가 아닌 경우
   */
  @Transactional()
  async addPayment(orderId: string, dto: AddPaymentDto): Promise<Payment> {
    const order = await this.loadOrder(orderId);

    if (order.state !== OrderState.CONFIRMED) {
      throw new BadRequestException(
        `CONFIRMED 상태의 주문에만 결제를 추가할 수 있습니다. 현재: ${order.state}`,
      );
    }

    const paymentRepo = this.db.getRepository(Payment);
    const payment = paymentRepo.create({
      orderId,
      method: dto.method,
      amount: dto.amount ?? order.total,
      state: PaymentState.AUTHORIZED,
      transactionId: dto.transactionId ?? null,
      errorMessage: null,
      metadata: dto.metadata ?? null,
    });
    return paymentRepo.save(payment);
  }

  /**
   * 결제를 정산(SETTLED) 처리하고 주문 상태를 PAID로 전환한다.
   *
   * @param paymentId - Payment UUID
   * @param transactionId - PG사 트랜잭션 ID
   * @returns 업데이트된 Payment
   * @throws NotFoundException - Payment를 찾을 수 없는 경우
   * @throws BadRequestException - AUTHORIZED 상태가 아닌 경우
   */
  @Transactional()
  async settlePayment(paymentId: string, transactionId: string): Promise<Payment> {
    const payment = await this.db.getRepository(Payment).findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment(id: "${paymentId}")를 찾을 수 없습니다.`);
    }
    if (payment.state !== PaymentState.AUTHORIZED) {
      throw new BadRequestException(
        `AUTHORIZED 상태의 결제만 정산할 수 있습니다. 현재: ${payment.state}`,
      );
    }

    payment.state = PaymentState.SETTLED;
    payment.transactionId = transactionId;
    await this.db.getRepository(Payment).save(payment);

    await this.doTransitionToState(payment.orderId, OrderState.PAID);

    return payment;
  }

  // ---------------------------------------------------------------------------
  // 배송
  // ---------------------------------------------------------------------------

  /**
   * 주문에 배송(출고)을 생성한다. PENDING 상태로 생성된다.
   *
   * 부분 배송을 지원하므로 전체 라인의 일부만 선택할 수 있다.
   * 생성 즉시 Order 상태가 SHIPPED로 전환된다.
   *
   * @param orderId - Order UUID
   * @param dto - 포함할 OrderLine IDs, 운송장, 배송사
   * @returns 생성된 Fulfillment
   * @throws BadRequestException - PAID 상태가 아니거나 잘못된 OrderLine ID인 경우
   */
  @Transactional()
  async createFulfillment(orderId: string, dto: CreateFulfillmentDto): Promise<Fulfillment> {
    const order = await this.loadOrder(orderId);

    if (order.state !== OrderState.PAID) {
      throw new BadRequestException(
        `PAID 상태의 주문에만 배송을 생성할 수 있습니다. 현재: ${order.state}`,
      );
    }

    const validLines = order.lines.filter((l) => dto.orderLineIds.includes(l.id));
    if (validLines.length !== dto.orderLineIds.length) {
      throw new BadRequestException("잘못된 OrderLine ID가 포함되어 있습니다.");
    }

    const fulfillmentRepo = this.db.getRepository(Fulfillment);
    const fulfillment = fulfillmentRepo.create({
      orderId,
      state: FulfillmentState.PENDING,
      trackingCode: dto.trackingCode ?? null,
      shippingCarrier: dto.shippingCarrier ?? null,
    });
    fulfillment.lines = validLines;
    const saved = await fulfillmentRepo.save(fulfillment);

    await this.doTransitionToState(orderId, OrderState.SHIPPED);

    return this.loadFulfillment(saved.id);
  }

  /**
   * 배송 정보(운송장 번호, 배송사, 상태)를 수정한다.
   *
   * `state`를 DELIVERED로 변경하면 모든 Fulfillment가 DELIVERED인지 확인하고,
   * 모두 완료된 경우 Order 상태를 DELIVERED로 전환한다.
   *
   * @param id - Fulfillment UUID
   * @param dto - 수정할 필드
   * @returns 업데이트된 Fulfillment
   */
  @Transactional()
  async updateFulfillment(id: string, dto: UpdateFulfillmentDto): Promise<Fulfillment> {
    const fulfillment = await this.loadFulfillment(id);

    if (dto.trackingCode !== undefined) fulfillment.trackingCode = dto.trackingCode;
    if (dto.shippingCarrier !== undefined) fulfillment.shippingCarrier = dto.shippingCarrier;
    if (dto.state !== undefined) fulfillment.state = dto.state;

    await this.db.getRepository(Fulfillment).save(fulfillment);

    // 모든 배송이 완료되면 주문도 DELIVERED로 전환
    if (dto.state === FulfillmentState.DELIVERED) {
      const allFulfillments = await this.db.getRepository(Fulfillment).find({
        where: { orderId: fulfillment.orderId },
      });
      const allDelivered = allFulfillments.every((f) => f.state === FulfillmentState.DELIVERED);
      if (allDelivered) {
        await this.doTransitionToState(fulfillment.orderId, OrderState.DELIVERED);
      }
    }

    return this.loadFulfillment(id);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * 상태 전환 로직 내부 구현. `@Transactional()` 없이 외부 트랜잭션 내에서도 사용 가능.
   */
  private async doTransitionToState(id: string, newState: OrderState): Promise<Order> {
    const order = await this.loadOrder(id);
    this.validateTransition(order.state, newState);

    if (newState === OrderState.CANCELLED) {
      await this.releaseStock(order);
    }

    order.state = newState;
    await this.db.getRepository(Order).save(order);
    return this.loadOrder(id);
  }

  /**
   * 상태 전환이 허용되는지 검증한다.
   *
   * @throws BadRequestException - 허용되지 않은 전환인 경우
   */
  private validateTransition(current: OrderState, next: OrderState): void {
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `${current} → ${next} 상태 전환은 허용되지 않습니다. ` +
          `가능한 전환: [${(allowed as string[]).join(", ")}]`,
      );
    }
  }

  /**
   * 주문 취소 시 할당된 재고를 해제한다.
   */
  private async releaseStock(order: Order): Promise<void> {
    const variantRepo = this.db.getRepository(ProductVariant);

    for (const line of order.lines) {
      const variant = await variantRepo.findOne({ where: { id: line.productVariantId } });
      if (variant?.trackInventory) {
        const releaseAmount = Math.min(line.quantity, variant.stockAllocated);
        if (releaseAmount > 0) {
          await variantRepo.decrement({ id: line.productVariantId }, "stockAllocated", releaseAmount);
        }
      }
    }
  }

  /**
   * 주문 코드를 생성한다. 형식: `ORD-YYYYMMDD-{4자리 랜덤 대문자}`
   */
  private generateOrderCode(): string {
    const now = new Date();
    const datePart = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("");
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${datePart}-${randomPart}`;
  }

  /**
   * ID로 Order를 로드한다. lines, payments, fulfillments 관계가 포함된다.
   *
   * @throws NotFoundException
   */
  private async loadOrder(id: string): Promise<Order> {
    const order = await this.db.getRepository(Order).findOne({
      where: { id, deletedAt: IsNull() },
      relations: { lines: true, payments: true, fulfillments: { lines: true } },
    });
    if (!order) {
      throw new NotFoundException(`Order(id: "${id}")를 찾을 수 없습니다.`);
    }
    return order;
  }

  /**
   * ID로 Fulfillment를 로드한다.
   *
   * @throws NotFoundException
   */
  private async loadFulfillment(id: string): Promise<Fulfillment> {
    const fulfillment = await this.db.getRepository(Fulfillment).findOne({
      where: { id },
      relations: { lines: true },
    });
    if (!fulfillment) {
      throw new NotFoundException(`Fulfillment(id: "${id}")를 찾을 수 없습니다.`);
    }
    return fulfillment;
  }
}
