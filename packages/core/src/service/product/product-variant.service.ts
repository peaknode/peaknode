import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { Product, ProductOption, ProductVariant } from "src/entity";
import { IsNull } from "typeorm";
import { CreateProductVariantDto } from "../dto/product/create-product-variant.dto";
import { UpdateProductVariantDto } from "../dto/product/update-product-variant.dto";

/**
 * ProductVariant 관련 비즈니스 로직을 담당하는 서비스.
 *
 * Variant(SKU) 생성·수정·소프트 딜리트 및 Product 소프트 딜리트 시 cascade 처리를 제공한다.
 *
 * @example
 * // Variant 생성 (옵션그룹이 먼저 정의된 상태에서)
 * const variant = await service.create(productId, {
 *   name: '흰색 / S',
 *   sku: 'TEE-WHITE-S',
 *   price: 29000,
 *   optionIds: [whiteOptionId, sOptionId],
 * });
 */
@Injectable()
export class ProductVariantService {
  constructor(protected readonly db: TransactionConnection) {}

  // ---------------------------------------------------------------------------
  // 생성 / 수정 / 삭제
  // ---------------------------------------------------------------------------

  /**
   * 새 ProductVariant를 생성한다.
   *
   * @param productId - 소속 Product UUID
   * @param dto - 생성 데이터
   * @returns 생성된 ProductVariant (options, featuredAsset 포함)
   * @throws NotFoundException - Product가 없는 경우
   * @throws ConflictException - SKU가 이미 존재하는 경우
   */
  @Transactional()
  async create(productId: string, dto: CreateProductVariantDto): Promise<ProductVariant> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id: productId, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${productId}")를 찾을 수 없습니다.`);
    }

    await this.validateSku(dto.sku);

    const repo = this.db.getRepository(ProductVariant);
    const variant = repo.create({
      name: dto.name,
      sku: dto.sku,
      price: dto.price,
      enabled: dto.enabled ?? true,
      stockOnHand: dto.stockOnHand ?? 0,
      trackInventory: dto.trackInventory ?? true,
      outOfStockThreshold: dto.outOfStockThreshold ?? 0,
      productId,
      featuredAssetId: dto.featuredAssetId ?? null,
    });

    if (dto.optionIds && dto.optionIds.length > 0) {
      variant.options = await this.db
        .getRepository(ProductOption)
        .findBy(dto.optionIds.map((id) => ({ id })));
    }

    const saved = await repo.save(variant);
    return this.findOneOrFail(saved.id);
  }

  /**
   * ProductVariant 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * `optionIds` 전달 시 기존 옵션 연결을 전부 교체한다.
   *
   * @param variantId - 수정할 ProductVariant UUID
   * @param dto - 수정 데이터
   * @returns 수정된 ProductVariant
   * @throws NotFoundException - Variant가 없는 경우
   * @throws ConflictException - 변경할 SKU가 이미 존재하는 경우
   */
  @Transactional()
  async update(variantId: string, dto: UpdateProductVariantDto): Promise<ProductVariant> {
    const variant = await this.findOneOrFail(variantId);

    if (dto.sku && dto.sku !== variant.sku) {
      await this.validateSku(dto.sku, variantId);
    }

    if (dto.name !== undefined) variant.name = dto.name;
    if (dto.sku !== undefined) variant.sku = dto.sku;
    if (dto.price !== undefined) variant.price = dto.price;
    if (dto.enabled !== undefined) variant.enabled = dto.enabled;
    if (dto.stockOnHand !== undefined) variant.stockOnHand = dto.stockOnHand;
    if (dto.trackInventory !== undefined) variant.trackInventory = dto.trackInventory;
    if (dto.outOfStockThreshold !== undefined) variant.outOfStockThreshold = dto.outOfStockThreshold;
    if (dto.featuredAssetId !== undefined) variant.featuredAssetId = dto.featuredAssetId;

    if (dto.optionIds !== undefined) {
      variant.options =
        dto.optionIds.length > 0
          ? await this.db
              .getRepository(ProductOption)
              .findBy(dto.optionIds.map((id) => ({ id })))
          : [];
    }

    await this.db.getRepository(ProductVariant).save(variant);
    return this.findOneOrFail(variantId);
  }

  /**
   * ProductVariant를 소프트 딜리트한다.
   *
   * @param variantId - 삭제할 ProductVariant UUID
   * @throws NotFoundException - Variant가 없거나 이미 삭제된 경우
   */
  @Transactional()
  async softDelete(variantId: string): Promise<void> {
    const variant = await this.db.getRepository(ProductVariant).findOne({
      where: { id: variantId, deletedAt: IsNull() },
    });

    if (!variant) {
      throw new NotFoundException(`ProductVariant(id: "${variantId}")를 찾을 수 없습니다.`);
    }

    variant.deletedAt = new Date();
    await this.db.getRepository(ProductVariant).save(variant);
  }

  // ---------------------------------------------------------------------------
  // 내부 / Cascade
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * ID로 Variant를 조회한다. 없거나 소프트 딜리트된 경우 NotFoundException을 던진다.
   *
   * @param id - ProductVariant UUID
   */
  private async findOneOrFail(id: string): Promise<ProductVariant> {
    const variant = await this.db.getRepository(ProductVariant).findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["options", "options.group", "featuredAsset"],
    });

    if (!variant) {
      throw new NotFoundException(`ProductVariant(id: "${id}")를 찾을 수 없습니다.`);
    }

    return variant;
  }

  /**
   * SKU 고유성을 검증한다.
   *
   * @param sku - 검증할 SKU
   * @param excludeId - 수정 시 자기 자신을 제외하기 위한 Variant UUID
   * @throws ConflictException - SKU가 이미 사용 중인 경우
   */
  private async validateSku(sku: string, excludeId?: string): Promise<void> {
    const existing = await this.db.getRepository(ProductVariant).findOne({ where: { sku } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`SKU "${sku}"는 이미 사용 중입니다.`);
    }
  }
}
