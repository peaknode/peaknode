import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";
import { Fulfillment } from "src/entity/order/fulfillment.entity";
import { Order, OrderState } from "src/entity/order/order.entity";
import { Payment } from "src/entity/order/payment.entity";
import { OrderService } from "src/service/order/order.service";
import { OrderListResult } from "src/api/types/order-list-result.type";
import { AddPaymentDto } from "src/service/dto/order/add-payment.dto";
import { CreateFulfillmentDto } from "src/service/dto/order/create-fulfillment.dto";
import { ListOrdersDto } from "src/service/dto/order/list-orders.dto";
import { UpdateFulfillmentDto } from "src/service/dto/order/update-fulfillment.dto";

/**
 * Admin API — 주문 관리 GraphQL Resolver.
 *
 * 주문 조회, 상태 전환, 결제 처리, 배송 관리 기능을 제공한다.
 *
 * Endpoint: POST /admin-api/graphql
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => Order)
export class OrderResolver {
  constructor(private readonly orderService: OrderService) {}

  /**
   * 주문 목록을 페이지네이션하여 반환한다.
   *
   * @example
   * query {
   *   orders(options: { state: CONFIRMED, take: 10 }) {
   *     total items { id code state total createdAt }
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderRead)
  @Query(() => OrderListResult, { description: "주문 목록 조회" })
  orders(
    @Args("options", { nullable: true }) options?: ListOrdersDto,
  ): Promise<OrderListResult> {
    return this.orderService.findAll(options);
  }

  /**
   * 주문 단건을 조회한다. lines, payments, fulfillments가 포함된다.
   *
   * @example
   * query {
   *   order(id: "...") {
   *     id code state subTotal shippingTotal total
   *     lines { id productVariantName quantity unitPrice linePrice }
   *     payments { id method amount state transactionId }
   *     fulfillments { id state trackingCode shippingCarrier }
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderRead)
  @Query(() => Order, { description: "주문 단건 조회" })
  order(@Args("id", { type: () => ID }) id: string): Promise<Order> {
    return this.orderService.findOne(id);
  }

  /**
   * 주문 상태를 전환한다.
   *
   * @example
   * mutation {
   *   transitionOrderToState(id: "...", state: SHIPPED) {
   *     id state
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderUpdate)
  @Mutation(() => Order, { description: "주문 상태 전환" })
  transitionOrderToState(
    @Args("id", { type: () => ID }) id: string,
    @Args("state", { type: () => OrderState }) state: OrderState,
  ): Promise<Order> {
    return this.orderService.transitionToState(id, state);
  }

  /**
   * 주문에 결제를 추가한다. AUTHORIZED 상태로 생성된다.
   *
   * @example
   * mutation {
   *   addPaymentToOrder(orderId: "...", input: { method: "card", transactionId: "pg-tx-id" }) {
   *     id method amount state transactionId
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderUpdate)
  @Mutation(() => Payment, { description: "주문에 결제 추가 (AUTHORIZED 상태로 생성)" })
  addPaymentToOrder(
    @Args("orderId", { type: () => ID }) orderId: string,
    @Args("input") input: AddPaymentDto,
  ): Promise<Payment> {
    return this.orderService.addPayment(orderId, input);
  }

  /**
   * 결제를 정산(SETTLED) 처리하고 주문 상태를 PAID로 전환한다.
   *
   * @example
   * mutation {
   *   settleOrderPayment(paymentId: "...", transactionId: "pg-final-tx-id") {
   *     id state transactionId
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderUpdate)
  @Mutation(() => Payment, { description: "결제 정산 처리 → Order 상태 PAID 전환" })
  settleOrderPayment(
    @Args("paymentId", { type: () => ID }) paymentId: string,
    @Args("transactionId") transactionId: string,
  ): Promise<Payment> {
    return this.orderService.settlePayment(paymentId, transactionId);
  }

  /**
   * 주문에 배송(출고)을 생성한다.
   *
   * @example
   * mutation {
   *   createOrderFulfillment(orderId: "...", input: {
   *     orderLineIds: ["..."],
   *     shippingCarrier: "CJ대한통운",
   *     trackingCode: "1234567890"
   *   }) {
   *     id state trackingCode shippingCarrier lines { id sku }
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderUpdate)
  @Mutation(() => Fulfillment, { description: "배송(출고) 생성 → Order 상태 SHIPPED 전환" })
  createOrderFulfillment(
    @Args("orderId", { type: () => ID }) orderId: string,
    @Args("input") input: CreateFulfillmentDto,
  ): Promise<Fulfillment> {
    return this.orderService.createFulfillment(orderId, input);
  }

  /**
   * 배송 정보(운송장, 배송사, 상태)를 수정한다.
   *
   * @example
   * mutation {
   *   updateOrderFulfillment(id: "...", input: { state: DELIVERED }) {
   *     id state trackingCode
   *   }
   * }
   * # Authorization: Bearer <adminAccessToken>
   */
  @RequirePermissions(Permission.OrderUpdate)
  @Mutation(() => Fulfillment, { description: "배송 정보 수정" })
  updateOrderFulfillment(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateFulfillmentDto,
  ): Promise<Fulfillment> {
    return this.orderService.updateFulfillment(id, input);
  }
}
