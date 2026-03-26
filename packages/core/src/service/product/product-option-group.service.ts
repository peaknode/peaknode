import { Injectable } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { ProductOption, ProductOptionGroup } from "src/entity";

/**
 * ProductOptionGroup 관련 비즈니스 로직을 담당하는 서비스.
 *
 * 현재는 ProductService의 옵션그룹 제거 flow를 지원하는 최소 구현만 포함한다.
 */
@Injectable()
export class ProductOptionGroupService {
  constructor(protected readonly db: TransactionConnection) {}

  /**
   * 지정한 OptionGroup과 하위 Option들을 영구 삭제한다.
   *
   * **주의:** 이 메서드를 호출하기 전에 ProductVariant에서 해당 그룹의
   * 옵션 연결을 먼저 끊어야 한다 (ProductService.removeOptionGroupFromProduct 참고).
   *
   * @param optionGroupId - 삭제할 ProductOptionGroup UUID
   */
  @Transactional()
  async delete(optionGroupId: string): Promise<void> {
    // 존재 여부 확인 (없으면 NotFoundException throw)
    await this.db.findOneOrFail(ProductOptionGroup, optionGroupId);

    // 하위 Option 먼저 삭제 (variant 연결은 호출 측에서 먼저 처리됨)
    await this.db.getRepository(ProductOption).delete({ groupId: optionGroupId });
    await this.db.getRepository(ProductOptionGroup).delete(optionGroupId);
  }
}
