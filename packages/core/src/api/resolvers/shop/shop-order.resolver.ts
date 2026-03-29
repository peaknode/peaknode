import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ForbiddenException, NotFoundException, UseGuards } from "@nestjs/common";
import { Order } from "src/entity/order/order.entity";
import { Customer } from "src/entity/customer/customer.entity";
import { JwtAuthGuard } from "src/common/guards/jwt-auth.guard";
import { CurrentUserId } from "src/common/decorators/current-user.decorator";
import { OrderService } from "src/service/order/order.service";
import { OrderListResult } from "src/api/types/order-list-result.type";
import { CheckoutDto } from "src/service/dto/order/checkout.dto";
import { ListOrdersDto } from "src/service/dto/order/list-orders.dto";
import { TransactionConnection } from "src/common/database";

/**
 * Shop API — 주문/체크아웃 GraphQL Resolver.
 *
 * 모든 엔드포인트는 JwtAuthGuard를 통해 인증이 필수다.
 *
 * Endpoint: POST /shop-api/graphql
 */
@UseGuards(JwtAuthGuard)
@Resolver(() => Order)
export class ShopOrderResolver {
  constructor(
    private readonly orderService: OrderService,
    private readonly db: TransactionConnection,
  ) {}

  /**
   * 장바구니를 주문으로 전환한다 (체크아웃).
   *
   * 성공 시 Cart가 삭제되고 CONFIRMED 상태의 Order가 반환된다.
   *
   * @example
   * mutation {
   *   checkout(cartToken: "...", input: {
   *     shippingMethodId: "...",
   *     shippingAddress: { fullName: "홍길동", addressLine1: "서울시 강남구", addressLine2: "101호", postalCode: "06100", phoneNumber: "010-1234-5678" }
   *   }) {
   *     id code state subTotal shippingTotal total
   *     lines { productVariantName quantity unitPrice linePrice }
   *   }
   * }
   * # Authorization: Bearer <accessToken>
   */
  @Mutation(() => Order, { description: "장바구니를 주문으로 전환 (체크아웃)" })
  checkout(
    @CurrentUserId() userId: string,
    @Args("cartToken") cartToken: string,
    @Args("input") input: CheckoutDto,
  ): Promise<Order> {
    return this.orderService.checkout(cartToken, input, userId);
  }

  /**
   * 내 주문 목록을 반환한다.
   *
   * @example
   * query {
   *   myOrders(options: { take: 5 }) {
   *     total items { id code state total createdAt }
   *   }
   * }
   * # Authorization: Bearer <accessToken>
   */
  @Query(() => OrderListResult, { description: "내 주문 목록 조회" })
  async myOrders(
    @CurrentUserId() userId: string,
    @Args("options", { nullable: true }) options?: Pick<ListOrdersDto, "skip" | "take">,
  ): Promise<OrderListResult> {
    const customer = await this.resolveCustomer(userId);
    return this.orderService.findByCustomer(customer.id, options);
  }

  /**
   * 내 주문 단건을 조회한다.
   *
   * @example
   * query {
   *   myOrder(id: "...") {
   *     id code state lines { productVariantName quantity }
   *     payments { method amount state }
   *     fulfillments { trackingCode shippingCarrier state }
   *   }
   * }
   * # Authorization: Bearer <accessToken>
   */
  @Query(() => Order, { description: "내 주문 단건 조회" })
  async myOrder(
    @CurrentUserId() userId: string,
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Order> {
    const customer = await this.resolveCustomer(userId);
    const order = await this.orderService.findOne(id);

    if (order.customerId !== customer.id) {
      throw new ForbiddenException("해당 주문에 접근할 권한이 없습니다.");
    }

    return order;
  }

  /**
   * userId로 Customer를 조회한다.
   *
   * @throws NotFoundException - Customer가 없는 경우
   */
  private async resolveCustomer(userId: string): Promise<Customer> {
    const customer = await this.db.getRepository(Customer).findOne({ where: { userId } });
    if (!customer) {
      throw new NotFoundException(`User(id: "${userId}")에 연결된 Customer를 찾을 수 없습니다.`);
    }
    return customer;
  }
}
