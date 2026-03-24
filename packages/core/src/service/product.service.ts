import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import {
  Collection,
  FacetValue,
  Product,
  ProductOptionGroup,
  ProductVariant,
} from "src/entity";
import { IsNull } from "typeorm";
import { CreateProductDto } from "./dto/product/create-product.dto";
import { ListProductsDto } from "./dto/product/list-products.dto";
import { UpdateProductDto } from "./dto/product/update-product.dto";
import { ProductOptionGroupService } from "./product-option-group.service";
import { ProductVariantService } from "./product-variant.service";

/**
 * 상품(Product) 도메인의 핵심 비즈니스 로직을 담당하는 서비스.
 *
 * CRUD, 옵션그룹 관리, 소프트 딜리트를 제공한다.
 * 트랜잭션은 `@Transactional()` 데코레이터로 자동 관리된다.
 *
 * @example
 * // 상품 생성
 * const product = await productService.create({
 *   name: '기본 티셔츠',
 *   slug: 'basic-tee',
 *   enabled: true,
 * });
 */
@Injectable()
export class ProductService {
  /** findOne / findBySlug 공통 relations */
  private readonly defaultRelations = [
    "featuredAsset",
    "variants",
    "variants.options",
    "variants.options.group",
    "optionGroups",
    "optionGroups.options",
    "facetValues",
    "facetValues.facet",
    "productAssets",
    "productAssets.asset",
    "collections",
  ];

  constructor(
    protected readonly db: TransactionConnection,
    private readonly productVariantService: ProductVariantService,
    private readonly productOptionGroupService: ProductOptionGroupService,
  ) {}

  // ---------------------------------------------------------------------------
  // 조회
  // ---------------------------------------------------------------------------

  /**
   * 상품 목록을 페이지네이션하여 반환한다.
   *
   * @param options - 페이지, 필터, 검색 옵션
   * @returns items: 상품 배열, total: 전체 건수
   */
  async findAll(options: ListProductsDto = {}): Promise<{ items: Product[]; total: number }> {
    const { skip = 0, take = 20, enabled, facetValueIds, collectionId, search } = options;
    const effectiveTake = Math.min(take, 100);

    const qb = this.db
      .getRepository(Product)
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.featuredAsset", "featuredAsset")
      .leftJoinAndSelect("product.variants", "variants")
      .leftJoinAndSelect("product.facetValues", "facetValues")
      .leftJoinAndSelect("facetValues.facet", "facet")
      .where("product.deletedAt IS NULL")
      .skip(skip)
      .take(effectiveTake);

    if (enabled !== undefined) {
      qb.andWhere("product.enabled = :enabled", { enabled });
    }

    if (search) {
      qb.andWhere("product.name LIKE :search", { search: `%${search}%` });
    }

    if (collectionId) {
      qb.leftJoin("product.collections", "collection").andWhere(
        "collection.id = :collectionId",
        { collectionId },
      );
    }

    if (facetValueIds && facetValueIds.length > 0) {
      // 지정한 FacetValue를 모두 보유한 상품 (AND 조건)
      for (let i = 0; i < facetValueIds.length; i++) {
        const alias = `fv${i}`;
        qb.leftJoin("product.facetValues", alias).andWhere(`${alias}.id = :fvId${i}`, {
          [`fvId${i}`]: facetValueIds[i],
        });
      }
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * ID로 상품 단건을 조회한다. 없거나 소프트 딜리트된 경우 NotFoundException을 던진다.
   *
   * @param id - Product UUID
   * @returns relations이 로드된 Product
   * @throws NotFoundException
   */
  async findOne(id: string): Promise<Product> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id, deletedAt: IsNull() },
      relations: this.defaultRelations,
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${id}")를 찾을 수 없습니다.`);
    }

    return product;
  }

  /**
   * slug로 상품 단건을 조회한다. 없거나 소프트 딜리트된 경우 NotFoundException을 던진다.
   *
   * @param slug - 고유 URL slug
   * @returns relations이 로드된 Product
   * @throws NotFoundException
   */
  async findBySlug(slug: string): Promise<Product> {
    const product = await this.db.getRepository(Product).findOne({
      where: { slug, deletedAt: IsNull() },
      relations: this.defaultRelations,
    });

    if (!product) {
      throw new NotFoundException(`Product(slug: "${slug}")를 찾을 수 없습니다.`);
    }

    return product;
  }

  // ---------------------------------------------------------------------------
  // 생성 / 수정 / 삭제
  // ---------------------------------------------------------------------------

  /**
   * 새 상품을 생성한다.
   *
   * @param dto - 생성 데이터
   * @returns 생성된 Product (relations 포함)
   * @throws ConflictException - slug가 이미 존재하는 경우
   */
  @Transactional()
  async create(dto: CreateProductDto): Promise<Product> {
    await this.validateSlug(dto.slug);

    const repo = this.db.getRepository(Product);
    const product = repo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      enabled: dto.enabled ?? true,
      featuredAssetId: dto.featuredAssetId ?? null,
    });

    if (dto.facetValueIds && dto.facetValueIds.length > 0) {
      product.facetValues = await this.db
        .getRepository(FacetValue)
        .findBy(dto.facetValueIds.map((id) => ({ id })));
    }

    if (dto.collectionIds && dto.collectionIds.length > 0) {
      product.collections = await this.db
        .getRepository(Collection)
        .findBy(dto.collectionIds.map((id) => ({ id })));
    }

    const saved = await repo.save(product);
    return this.findOne(saved.id);
  }

  /**
   * 상품 정보를 수정한다. 전달된 필드만 업데이트된다.
   *
   * @param id - 수정할 Product UUID
   * @param dto - 수정 데이터
   * @returns 수정된 Product (relations 포함)
   * @throws NotFoundException - 상품이 없는 경우
   * @throws ConflictException - 변경할 slug가 이미 존재하는 경우
   */
  @Transactional()
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.slug && dto.slug !== product.slug) {
      await this.validateSlug(dto.slug, id);
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.slug !== undefined) product.slug = dto.slug;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.enabled !== undefined) product.enabled = dto.enabled;
    if (dto.featuredAssetId !== undefined) product.featuredAssetId = dto.featuredAssetId;

    if (dto.facetValueIds !== undefined) {
      product.facetValues =
        dto.facetValueIds.length > 0
          ? await this.db
              .getRepository(FacetValue)
              .findBy(dto.facetValueIds.map((fvId) => ({ id: fvId })))
          : [];
    }

    if (dto.collectionIds !== undefined) {
      product.collections =
        dto.collectionIds.length > 0
          ? await this.db
              .getRepository(Collection)
              .findBy(dto.collectionIds.map((cId) => ({ id: cId })))
          : [];
    }

    await this.db.getRepository(Product).save(product);
    return this.findOne(id);
  }

  /**
   * 상품을 소프트 딜리트한다.
   *
   * 하위 ProductVariant도 함께 소프트 딜리트된다.
   *
   * @param id - 삭제할 Product UUID
   * @throws NotFoundException - 상품이 없는 경우
   */
  @Transactional()
  async softDelete(id: string): Promise<void> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${id}")를 찾을 수 없습니다.`);
    }

    product.deletedAt = new Date();
    await this.db.getRepository(Product).save(product);

    await this.productVariantService.softDeleteByProductId(id);
  }

  // ---------------------------------------------------------------------------
  // 옵션그룹 관리
  // ---------------------------------------------------------------------------

  /**
   * 기존 ProductOptionGroup을 Product에 추가한다.
   *
   * @param productId - 대상 Product UUID
   * @param optionGroupId - 추가할 ProductOptionGroup UUID
   * @returns 업데이트된 Product
   * @throws NotFoundException - Product 또는 OptionGroup이 없는 경우
   */
  @Transactional()
  async addOptionGroupToProduct(productId: string, optionGroupId: string): Promise<Product> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id: productId, deletedAt: IsNull() },
      relations: ["optionGroups"],
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${productId}")를 찾을 수 없습니다.`);
    }

    const optionGroup = await this.db.findOneOrFail(ProductOptionGroup, optionGroupId);

    product.optionGroups = [...(product.optionGroups ?? []), optionGroup];
    await this.db.getRepository(Product).save(product);

    return this.findOne(productId);
  }

  /**
   * Product에서 ProductOptionGroup을 제거한다.
   *
   * `force = false`(기본)이면 해당 그룹의 옵션이 어느 Variant에라도 사용 중인 경우
   * ConflictException을 던진다.
   *
   * `force = true`이면 Variant에서 해당 옵션을 먼저 제거한 뒤 그룹을 삭제한다.
   *
   * @param productId - 대상 Product UUID
   * @param optionGroupId - 제거할 ProductOptionGroup UUID
   * @param force - 강제 제거 여부 (기본: false)
   * @returns 업데이트된 Product
   * @throws NotFoundException - Product 또는 OptionGroup이 없는 경우
   * @throws ConflictException - force=false이고 옵션이 Variant에 사용 중인 경우
   */
  @Transactional()
  async removeOptionGroupFromProduct(
    productId: string,
    optionGroupId: string,
    force = false,
  ): Promise<Product> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id: productId, deletedAt: IsNull() },
      relations: ["optionGroups", "variants", "variants.options"],
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${productId}")를 찾을 수 없습니다.`);
    }

    const targetGroup = (product.optionGroups ?? []).find((g) => g.id === optionGroupId);
    if (!targetGroup) {
      throw new NotFoundException(
        `ProductOptionGroup(id: "${optionGroupId}")가 이 상품에 연결되어 있지 않습니다.`,
      );
    }

    const activeVariants = (product.variants ?? []).filter((v) => v.deletedAt == null);
    const isInUse = activeVariants.some((v) =>
      (v.options ?? []).some((o) => o.groupId === optionGroupId),
    );

    if (isInUse && !force) {
      throw new ConflictException(
        `ProductOptionGroup(id: "${optionGroupId}")의 옵션이 ` +
          `${activeVariants.length}개의 Variant에서 사용 중입니다. ` +
          `강제 제거하려면 force=true를 전달하세요.`,
      );
    }

    if (isInUse && force) {
      for (const variant of activeVariants) {
        variant.options = (variant.options ?? []).filter((o) => o.groupId !== optionGroupId);
      }
      await this.db.getRepository(ProductVariant).save(activeVariants);
    }

    await this.productOptionGroupService.delete(optionGroupId);

    product.optionGroups = (product.optionGroups ?? []).filter((g) => g.id !== optionGroupId);
    await this.db.getRepository(Product).save(product);

    return this.findOne(productId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * slug 고유성을 검증한다.
   *
   * @param slug - 검증할 slug
   * @param excludeId - 수정 시 자기 자신을 제외하기 위한 Product UUID
   * @throws ConflictException - slug가 이미 사용 중인 경우
   */
  private async validateSlug(slug: string, excludeId?: string): Promise<void> {
    const existing = await this.db.getRepository(Product).findOne({ where: { slug } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`slug "${slug}"은 이미 사용 중입니다.`);
    }
  }
}
