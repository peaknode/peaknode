import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { Product, ProductOption, ProductOptionGroup } from "src/entity";
import { IsNull } from "typeorm";
import { CreateProductOptionGroupDto } from "../dto/product/create-product-option-group.dto";
import { CreateProductOptionDto } from "../dto/product/create-product-option.dto";
import { UpdateProductOptionDto } from "../dto/product/update-product-option.dto";
import { UpdateProductOptionGroupDto } from "../dto/product/update-product-option-group.dto";

/**
 * ProductOptionGroup 및 ProductOption 관련 비즈니스 로직을 담당하는 서비스.
 *
 * 옵션그룹 생성·수정, 옵션 추가·수정·삭제, 옵션그룹 삭제를 제공한다.
 * 어드민 UI에서 상품의 옵션 구조(색상, 사이즈 등)를 정의할 때 사용한다.
 *
 * @example
 * // 1. 옵션그룹 생성 (Product에 자동 연결)
 * const group = await service.create(productId, {
 *   name: '색상', code: 'color',
 *   options: [{ name: '흰색', code: 'white' }, { name: '검정', code: 'black' }],
 * });
 * // 2. 이후 ProductVariantService.create()로 Variant 생성 가능
 */
@Injectable()
export class ProductOptionGroupService {
  constructor(protected readonly db: TransactionConnection) {}

  // ---------------------------------------------------------------------------
  // 옵션그룹 CRUD
  // ---------------------------------------------------------------------------

  /**
   * 옵션그룹을 생성하고 지정한 Product에 연결한다.
   *
   * `dto.options`가 포함된 경우 초기 옵션 목록도 함께 생성한다.
   *
   * @param productId - 연결할 Product UUID
   * @param dto - 생성 데이터
   * @returns 생성된 ProductOptionGroup (options 포함)
   * @throws NotFoundException - Product가 없는 경우
   */
  @Transactional()
  async create(productId: string, dto: CreateProductOptionGroupDto): Promise<ProductOptionGroup> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id: productId, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${productId}")를 찾을 수 없습니다.`);
    }

    const repo = this.db.getRepository(ProductOptionGroup);
    const group = repo.create({
      name: dto.name,
      code: dto.code,
      productId,
      options: (dto.options ?? []).map((o) =>
        this.db.getRepository(ProductOption).create({ name: o.name, code: o.code }),
      ),
    });

    return repo.save(group);
  }

  /**
   * 옵션그룹 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * @param groupId - 수정할 ProductOptionGroup UUID
   * @param dto - 수정 데이터
   * @returns 수정된 ProductOptionGroup
   * @throws NotFoundException - 옵션그룹이 없는 경우
   */
  @Transactional()
  async update(groupId: string, dto: UpdateProductOptionGroupDto): Promise<ProductOptionGroup> {
    const group = await this.db.getRepository(ProductOptionGroup).findOne({
      where: { id: groupId },
      relations: ["options"],
    });

    if (!group) {
      throw new NotFoundException(`ProductOptionGroup(id: "${groupId}")를 찾을 수 없습니다.`);
    }

    if (dto.name !== undefined) group.name = dto.name;
    if (dto.code !== undefined) group.code = dto.code;

    return this.db.getRepository(ProductOptionGroup).save(group);
  }

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
    await this.db.findOneOrFail(ProductOptionGroup, optionGroupId);

    await this.db.getRepository(ProductOption).delete({ groupId: optionGroupId });
    await this.db.getRepository(ProductOptionGroup).delete(optionGroupId);
  }

  // ---------------------------------------------------------------------------
  // 옵션 CRUD
  // ---------------------------------------------------------------------------

  /**
   * 특정 옵션그룹에 새 옵션 값을 추가한다.
   *
   * @param groupId - 대상 ProductOptionGroup UUID
   * @param dto - 생성 데이터
   * @returns 생성된 ProductOption
   * @throws NotFoundException - 옵션그룹이 없는 경우
   */
  @Transactional()
  async createOption(groupId: string, dto: CreateProductOptionDto): Promise<ProductOption> {
    const group = await this.db.getRepository(ProductOptionGroup).findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`ProductOptionGroup(id: "${groupId}")를 찾을 수 없습니다.`);
    }

    const option = this.db.getRepository(ProductOption).create({
      name: dto.name,
      code: dto.code,
      groupId,
    });

    return this.db.getRepository(ProductOption).save(option);
  }

  /**
   * 옵션 값을 수정한다. 전달된 필드만 업데이트된다.
   *
   * @param optionId - 수정할 ProductOption UUID
   * @param dto - 수정 데이터
   * @returns 수정된 ProductOption
   * @throws NotFoundException - 옵션이 없는 경우
   */
  @Transactional()
  async updateOption(optionId: string, dto: UpdateProductOptionDto): Promise<ProductOption> {
    const option = await this.db.getRepository(ProductOption).findOne({
      where: { id: optionId },
    });

    if (!option) {
      throw new NotFoundException(`ProductOption(id: "${optionId}")를 찾을 수 없습니다.`);
    }

    if (dto.name !== undefined) option.name = dto.name;
    if (dto.code !== undefined) option.code = dto.code;

    return this.db.getRepository(ProductOption).save(option);
  }

  /**
   * 옵션 값을 영구 삭제한다.
   *
   * 현재 활성 ProductVariant에서 사용 중인 경우 ConflictException을 던진다.
   *
   * @param optionId - 삭제할 ProductOption UUID
   * @throws NotFoundException - 옵션이 없는 경우
   * @throws ConflictException - 옵션이 Variant에서 사용 중인 경우
   */
  @Transactional()
  async deleteOption(optionId: string): Promise<void> {
    const option = await this.db.getRepository(ProductOption).findOne({
      where: { id: optionId },
      relations: ["productVariants"],
    });

    if (!option) {
      throw new NotFoundException(`ProductOption(id: "${optionId}")를 찾을 수 없습니다.`);
    }

    const activeVariants = (option.productVariants ?? []).filter((v) => v.deletedAt == null);
    if (activeVariants.length > 0) {
      throw new ConflictException(
        `ProductOption(id: "${optionId}")이 ${activeVariants.length}개의 활성 Variant에서 사용 중입니다.`,
      );
    }

    await this.db.getRepository(ProductOption).delete(optionId);
  }
}
