import { Injectable } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { ProductVariant } from "src/entity";
import { IsNull } from "typeorm";

/**
 * ProductVariant 관련 비즈니스 로직을 담당하는 서비스.
 *
 * 현재는 Product 소프트 딜리트 시 cascade 처리를 위한 최소 구현만 포함한다.
 */
@Injectable()
export class ProductVariantService {
  constructor(protected readonly db: TransactionConnection) {}

  /**
   * 특정 Product에 속한 모든 활성 Variant를 소프트 딜리트한다.
   *
   * Product 소프트 딜리트 시 cascade로 호출된다.
   * 이미 삭제된(`deletedAt IS NOT NULL`) Variant는 건드리지 않는다.
   *
   * @param productId - 소프트 딜리트할 Variant의 상위 Product UUID
   */
  @Transactional()
  async softDeleteByProductId(productId: string): Promise<void> {
    await this.db.getRepository(ProductVariant).update(
      { productId, deletedAt: IsNull() },
      { deletedAt: new Date() },
    );
  }
}
