import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { ShippingMethod } from "src/entity/shipping/shipping-method.entity";
import { Order, OrderState } from "src/entity/order/order.entity";
import { IsNull, Not, In } from "typeorm";
import { CreateShippingMethodDto } from "../dto/shipping/create-shipping-method.dto";
import { ListShippingMethodsDto } from "../dto/shipping/list-shipping-methods.dto";
import { UpdateShippingMethodDto } from "../dto/shipping/update-shipping-method.dto";

/** 삭제를 막는 활성 주문 상태 목록 */
const ACTIVE_ORDER_STATES = [
  OrderState.PENDING,
  OrderState.CONFIRMED,
  OrderState.PAID,
  OrderState.SHIPPED,
];

/**
 * 배송 방법(ShippingMethod) 도메인의 핵심 비즈니스 로직을 담당하는 서비스.
 *
 * CRUD 및 배송비 계산 기능을 제공한다.
 * `calculateShipping()`은 CartService, OrderService에서 재사용된다.
 *
 * @example
 * const fee = shippingMethodService.calculateShipping(method, 45000);
 * // price=3000, freeShippingThreshold=50000 → fee=3000
 */
@Injectable()
export class ShippingMethodService {
  constructor(protected readonly db: TransactionConnection) {}

  // ---------------------------------------------------------------------------
  // 조회
  // ---------------------------------------------------------------------------

  /**
   * 배송 방법 목록을 페이지네이션하여 반환한다.
   *
   * @param options - 페이지, enabled 필터 옵션
   * @returns items: 배송 방법 배열, total: 전체 건수
   */
  async findAll(
    options: ListShippingMethodsDto = {},
  ): Promise<{ items: ShippingMethod[]; total: number }> {
    const { skip = 0, take = 20, enabled } = options;
    const effectiveTake = Math.min(take, 100);

    const where: Record<string, unknown> = { deletedAt: IsNull() };
    if (enabled !== undefined) where.enabled = enabled;

    const [items, total] = await this.db.getRepository(ShippingMethod).findAndCount({
      where,
      skip,
      take: effectiveTake,
      order: { createdAt: "ASC" },
    });

    return { items, total };
  }

  /**
   * ID로 배송 방법 단건을 조회한다.
   *
   * @param id - ShippingMethod UUID
   * @throws NotFoundException
   */
  async findOne(id: string): Promise<ShippingMethod> {
    const method = await this.db.getRepository(ShippingMethod).findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!method) {
      throw new NotFoundException(`ShippingMethod(id: "${id}")를 찾을 수 없습니다.`);
    }

    return method;
  }

  /**
   * code로 배송 방법 단건을 조회한다.
   *
   * @param code - 고유 code (예: "standard")
   * @throws NotFoundException
   */
  async findByCode(code: string): Promise<ShippingMethod> {
    const method = await this.db.getRepository(ShippingMethod).findOne({
      where: { code, deletedAt: IsNull() },
    });

    if (!method) {
      throw new NotFoundException(`ShippingMethod(code: "${code}")를 찾을 수 없습니다.`);
    }

    return method;
  }

  // ---------------------------------------------------------------------------
  // 생성 / 수정 / 삭제
  // ---------------------------------------------------------------------------

  /**
   * 새 배송 방법을 생성한다.
   *
   * @param dto - 생성 데이터
   * @returns 생성된 ShippingMethod
   * @throws ConflictException - code가 이미 존재하는 경우
   */
  @Transactional()
  async create(dto: CreateShippingMethodDto): Promise<ShippingMethod> {
    await this.validateCode(dto.code);

    const repo = this.db.getRepository(ShippingMethod);
    const method = repo.create({
      name: dto.name,
      code: dto.code,
      description: dto.description ?? null,
      price: dto.price ?? 0,
      freeShippingThreshold: dto.freeShippingThreshold ?? null,
      enabled: dto.enabled ?? true,
    });

    const saved = await repo.save(method);
    return this.findOne(saved.id);
  }

  /**
   * 배송 방법 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * @param id - 수정할 ShippingMethod UUID
   * @param dto - 수정 데이터
   * @returns 수정된 ShippingMethod
   * @throws NotFoundException - 배송 방법이 없는 경우
   * @throws ConflictException - 변경할 code가 이미 존재하는 경우
   */
  @Transactional()
  async update(id: string, dto: UpdateShippingMethodDto): Promise<ShippingMethod> {
    const method = await this.findOne(id);

    if (dto.code && dto.code !== method.code) {
      await this.validateCode(dto.code, id);
    }

    if (dto.name !== undefined) method.name = dto.name;
    if (dto.code !== undefined) method.code = dto.code;
    if (dto.description !== undefined) method.description = dto.description ?? null;
    if (dto.price !== undefined) method.price = dto.price;
    if (dto.freeShippingThreshold !== undefined) {
      method.freeShippingThreshold = dto.freeShippingThreshold ?? null;
    }
    if (dto.enabled !== undefined) method.enabled = dto.enabled;

    await this.db.getRepository(ShippingMethod).save(method);
    return this.findOne(id);
  }

  /**
   * 배송 방법을 소프트 딜리트한다.
   *
   * 활성 주문(PENDING/CONFIRMED/PAID/SHIPPED)에서 사용 중인 경우 삭제가 거부된다.
   *
   * @param id - 삭제할 ShippingMethod UUID
   * @throws NotFoundException
   * @throws ConflictException - 활성 주문에서 사용 중인 경우
   */
  @Transactional()
  async delete(id: string): Promise<void> {
    const method = await this.findOne(id);

    const activeOrderCount = await this.db.getRepository(Order).count({
      where: {
        shippingMethodId: id,
        state: In(ACTIVE_ORDER_STATES),
        deletedAt: IsNull(),
      },
    });

    if (activeOrderCount > 0) {
      throw new ConflictException(
        `ShippingMethod(id: "${id}")는 ${activeOrderCount}개의 활성 주문에서 사용 중이므로 삭제할 수 없습니다. ` +
          `먼저 비활성화(enabled=false)하세요.`,
      );
    }

    method.deletedAt = new Date();
    await this.db.getRepository(ShippingMethod).save(method);
  }

  // ---------------------------------------------------------------------------
  // 배송비 계산
  // ---------------------------------------------------------------------------

  /**
   * 주문 합계 금액을 기준으로 배송비를 계산한다.
   *
   * - `subTotal >= freeShippingThreshold` → 무료 배송 (0원)
   * - 그 외 → `price` 반환
   *
   * @param shippingMethod - 계산 대상 ShippingMethod
   * @param subTotal - 상품 합계 금액 (원)
   * @returns 배송비 (원 단위 정수)
   */
  calculateShipping(shippingMethod: ShippingMethod, subTotal: number): number {
    if (
      shippingMethod.freeShippingThreshold !== null &&
      subTotal >= shippingMethod.freeShippingThreshold
    ) {
      return 0;
    }
    return shippingMethod.price;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * code 고유성을 검증한다.
   *
   * @param code - 검증할 code
   * @param excludeId - 수정 시 자기 자신을 제외하기 위한 UUID
   * @throws ConflictException - code가 이미 사용 중인 경우
   */
  private async validateCode(code: string, excludeId?: string): Promise<void> {
    const existing = await this.db.getRepository(ShippingMethod).findOne({
      where: { code, deletedAt: IsNull() },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`code "${code}"은 이미 사용 중입니다.`);
    }
  }
}
