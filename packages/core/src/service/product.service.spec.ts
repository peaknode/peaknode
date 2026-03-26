import { ConflictException, NotFoundException } from "@nestjs/common";
import { IsNull } from "typeorm";
import { Collection, FacetValue, Product, ProductOption, ProductOptionGroup, ProductVariant } from "src/entity";
import { ProductService } from "./product.service";
import { ProductVariantService } from "./product-variant.service";
import { ProductOptionGroupService } from "./product-option-group.service";

/**
 * ProductService 유닛 테스트.
 *
 * TransactionConnection을 목킹하여 DB 없이 비즈니스 로직만 검증한다.
 * @Transactional() 데코레이터는 withTransaction mock이 콜백을 즉시 실행하므로 투명하게 동작한다.
 */

/** 재사용 가능한 샘플 Product 픽스처 */
const makeProduct = (overrides: Partial<Product> = {}): Product =>
  ({
    id: "product-uuid-1",
    name: "테스트 상품",
    slug: "test-product",
    description: null,
    enabled: true,
    featuredAssetId: null,
    deletedAt: null,
    optionGroups: [],
    variants: [],
    facetValues: [],
    collections: [],
    productAssets: [],
    ...overrides,
  }) as Product;

describe("ProductService", () => {
  let service: ProductService;

  // Mock repositories
  let mockProductRepo: Record<string, jest.Mock>;
  let mockFacetValueRepo: Record<string, jest.Mock>;
  let mockCollectionRepo: Record<string, jest.Mock>;
  let mockVariantRepo: Record<string, jest.Mock>;

  // Mock QueryBuilder (findAll에서 사용)
  let mockQb: Record<string, jest.Mock>;

  // Mock TransactionConnection
  let mockDb: { getRepository: jest.Mock; withTransaction: jest.Mock; findOneOrFail: jest.Mock };

  // Mock 의존 서비스
  let mockVariantService: { softDeleteByProductId: jest.Mock };
  let mockOptionGroupService: { delete: jest.Mock };

  beforeEach(() => {
    mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockProductRepo = {
      findOne: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    };

    mockFacetValueRepo = { findBy: jest.fn() };
    mockCollectionRepo = { findBy: jest.fn() };
    mockVariantRepo = { save: jest.fn(), update: jest.fn() };

    mockDb = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === Product) return mockProductRepo;
        if (entity === FacetValue) return mockFacetValueRepo;
        if (entity === Collection) return mockCollectionRepo;
        if (entity === ProductVariant) return mockVariantRepo;
        return {};
      }),
      withTransaction: jest.fn().mockImplementation((work: () => Promise<unknown>) => work()),
      findOneOrFail: jest.fn(),
    };

    mockVariantService = { softDeleteByProductId: jest.fn().mockResolvedValue(undefined) };
    mockOptionGroupService = { delete: jest.fn().mockResolvedValue(undefined) };

    service = new ProductService(
      mockDb as any,
      mockVariantService as unknown as ProductVariantService,
      mockOptionGroupService as unknown as ProductOptionGroupService,
    );
  });

  // ===========================================================================
  // findAll
  // ===========================================================================

  describe("findAll", () => {
    it("기본 옵션으로 상품 목록과 총 개수를 반환한다", async () => {
      const products = [makeProduct()];
      mockQb.getManyAndCount.mockResolvedValue([products, 1]);

      const result = await service.findAll({});

      expect(result).toEqual({ items: products, total: 1 });
      expect(mockProductRepo.createQueryBuilder).toHaveBeenCalledWith("product");
      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });

    it("take가 100을 초과하면 100으로 클램핑한다", async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ take: 150 });

      expect(mockQb.take).toHaveBeenCalledWith(100);
    });

    it("enabled 필터를 andWhere로 추가한다", async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ enabled: true });

      expect(mockQb.andWhere).toHaveBeenCalledWith("product.enabled = :enabled", { enabled: true });
    });

    it("search 필터를 LIKE 조건으로 추가한다", async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: "티셔츠" });

      expect(mockQb.andWhere).toHaveBeenCalledWith("product.name LIKE :search", { search: "%티셔츠%" });
    });

    it("collectionId 필터를 leftJoin + andWhere로 추가한다", async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ collectionId: "col-uuid" });

      expect(mockQb.leftJoin).toHaveBeenCalledWith("product.collections", "collection");
      expect(mockQb.andWhere).toHaveBeenCalledWith("collection.id = :collectionId", { collectionId: "col-uuid" });
    });

    it("facetValueIds를 AND 조건으로 각각 leftJoin + andWhere를 추가한다", async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ facetValueIds: ["fv-1", "fv-2"] });

      expect(mockQb.leftJoin).toHaveBeenCalledWith("product.facetValues", "fv0");
      expect(mockQb.andWhere).toHaveBeenCalledWith("fv0.id = :fvId0", { fvId0: "fv-1" });
      expect(mockQb.leftJoin).toHaveBeenCalledWith("product.facetValues", "fv1");
      expect(mockQb.andWhere).toHaveBeenCalledWith("fv1.id = :fvId1", { fvId1: "fv-2" });
    });

    it("빈 facetValueIds는 facet join을 추가하지 않는다", async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ facetValueIds: [] });

      // facetValues join은 기본 leftJoinAndSelect에만 있어야 한다
      const leftJoinCalls = mockQb.leftJoin.mock.calls;
      expect(leftJoinCalls.every((call) => !String(call[0]).includes("facetValues"))).toBe(true);
    });
  });

  // ===========================================================================
  // findOne
  // ===========================================================================

  describe("findOne", () => {
    it("ID에 해당하는 상품을 반환한다", async () => {
      const product = makeProduct();
      mockProductRepo.findOne.mockResolvedValue(product);

      const result = await service.findOne("product-uuid-1");

      expect(result).toBe(product);
      expect(mockProductRepo.findOne).toHaveBeenCalledWith({
        where: { id: "product-uuid-1", deletedAt: IsNull() },
        relations: expect.any(Array),
      });
    });

    it("상품이 없으면 NotFoundException을 던진다", async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("not-exist")).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // findBySlug
  // ===========================================================================

  describe("findBySlug", () => {
    it("slug에 해당하는 상품을 반환한다", async () => {
      const product = makeProduct({ slug: "my-slug" });
      mockProductRepo.findOne.mockResolvedValue(product);

      const result = await service.findBySlug("my-slug");

      expect(result).toBe(product);
      expect(mockProductRepo.findOne).toHaveBeenCalledWith({
        where: { slug: "my-slug", deletedAt: IsNull() },
        relations: expect.any(Array),
      });
    });

    it("slug에 해당하는 상품이 없으면 NotFoundException을 던진다", async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(service.findBySlug("ghost-slug")).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // create
  // ===========================================================================

  describe("create", () => {
    it("상품을 생성하고 relations 포함 상품을 반환한다", async () => {
      const dto = { name: "새 상품", slug: "new-product" };
      const newProduct = makeProduct({ id: "new-id", name: "새 상품", slug: "new-product" });

      // validateSlug: slug 중복 없음
      mockProductRepo.findOne.mockResolvedValueOnce(null);
      // repo.create 반환값
      mockProductRepo.create.mockReturnValue(newProduct);
      // repo.save 반환값
      mockProductRepo.save.mockResolvedValue({ id: "new-id" });
      // this.findOne(saved.id) 호출
      mockProductRepo.findOne.mockResolvedValueOnce(newProduct);

      const result = await service.create(dto);

      expect(result).toBe(newProduct);
      expect(mockProductRepo.save).toHaveBeenCalledTimes(1);
    });

    it("slug가 이미 존재하면 ConflictException을 던진다", async () => {
      const dto = { name: "중복 상품", slug: "duplicate-slug" };
      const existingProduct = makeProduct({ id: "other-id", slug: "duplicate-slug" });

      // validateSlug: 이미 존재
      mockProductRepo.findOne.mockResolvedValueOnce(existingProduct);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockProductRepo.save).not.toHaveBeenCalled();
    });

    it("facetValueIds가 있으면 FacetValue를 조회해 product에 할당한다", async () => {
      const dto = { name: "상품", slug: "product-slug", facetValueIds: ["fv-uuid-1"] };
      const facetValues = [{ id: "fv-uuid-1" }] as FacetValue[];
      const newProduct = makeProduct({ id: "new-id" });

      mockProductRepo.findOne.mockResolvedValueOnce(null); // validateSlug
      mockProductRepo.create.mockReturnValue(newProduct);
      mockFacetValueRepo.findBy.mockResolvedValue(facetValues);
      mockProductRepo.save.mockResolvedValue({ id: "new-id" });
      mockProductRepo.findOne.mockResolvedValueOnce(newProduct); // findOne after save

      await service.create(dto);

      expect(mockFacetValueRepo.findBy).toHaveBeenCalledWith([{ id: "fv-uuid-1" }]);
      expect(newProduct.facetValues).toBe(facetValues);
    });

    it("collectionIds가 있으면 Collection을 조회해 product에 할당한다", async () => {
      const dto = { name: "상품", slug: "product-slug", collectionIds: ["col-uuid-1"] };
      const collections = [{ id: "col-uuid-1" }] as Collection[];
      const newProduct = makeProduct({ id: "new-id" });

      mockProductRepo.findOne.mockResolvedValueOnce(null); // validateSlug
      mockProductRepo.create.mockReturnValue(newProduct);
      mockCollectionRepo.findBy.mockResolvedValue(collections);
      mockProductRepo.save.mockResolvedValue({ id: "new-id" });
      mockProductRepo.findOne.mockResolvedValueOnce(newProduct); // findOne after save

      await service.create(dto);

      expect(mockCollectionRepo.findBy).toHaveBeenCalledWith([{ id: "col-uuid-1" }]);
      expect(newProduct.collections).toBe(collections);
    });

    it("enabled 기본값은 true이다", async () => {
      const dto = { name: "상품", slug: "product-slug" };
      const newProduct = makeProduct({ id: "new-id" });

      mockProductRepo.findOne.mockResolvedValueOnce(null);
      mockProductRepo.create.mockReturnValue(newProduct);
      mockProductRepo.save.mockResolvedValue({ id: "new-id" });
      mockProductRepo.findOne.mockResolvedValueOnce(newProduct);

      await service.create(dto);

      expect(mockProductRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });
  });

  // ===========================================================================
  // update
  // ===========================================================================

  describe("update", () => {
    it("전달된 필드만 업데이트하고 수정된 상품을 반환한다", async () => {
      const existing = makeProduct({ name: "기존 이름" });
      const updated = makeProduct({ name: "새 이름" });

      mockProductRepo.findOne.mockResolvedValueOnce(existing); // this.findOne(id) at start
      mockProductRepo.save.mockResolvedValue(existing);
      mockProductRepo.findOne.mockResolvedValueOnce(updated); // this.findOne(id) at end

      const result = await service.update("product-uuid-1", { name: "새 이름" });

      expect(result).toBe(updated);
      expect(existing.name).toBe("새 이름");
    });

    it("상품이 없으면 NotFoundException을 던진다", async () => {
      mockProductRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.update("not-exist", { name: "새 이름" })).rejects.toThrow(NotFoundException);
    });

    it("slug가 변경되면 중복 검증을 수행한다", async () => {
      const existing = makeProduct({ slug: "old-slug" });
      const updated = makeProduct({ slug: "new-slug" });

      mockProductRepo.findOne.mockResolvedValueOnce(existing); // this.findOne(id)
      mockProductRepo.findOne.mockResolvedValueOnce(null);     // validateSlug (new-slug 고유함)
      mockProductRepo.save.mockResolvedValue(existing);
      mockProductRepo.findOne.mockResolvedValueOnce(updated);  // this.findOne(id) at end

      await service.update("product-uuid-1", { slug: "new-slug" });

      // findOne이 3번 호출됨: findOne(id), validateSlug, findOne(id)
      expect(mockProductRepo.findOne).toHaveBeenCalledTimes(3);
    });

    it("slug가 동일하면 중복 검증을 수행하지 않는다", async () => {
      const existing = makeProduct({ slug: "same-slug" });

      mockProductRepo.findOne.mockResolvedValueOnce(existing);
      mockProductRepo.save.mockResolvedValue(existing);
      mockProductRepo.findOne.mockResolvedValueOnce(existing);

      await service.update("product-uuid-1", { slug: "same-slug" });

      // findOne이 2번만 호출됨: findOne(id) start, findOne(id) end
      expect(mockProductRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it("변경할 slug가 이미 사용 중이면 ConflictException을 던진다", async () => {
      const existing = makeProduct({ id: "product-uuid-1", slug: "old-slug" });
      const conflicting = makeProduct({ id: "other-id", slug: "conflict-slug" });

      mockProductRepo.findOne.mockResolvedValueOnce(existing);      // this.findOne(id)
      mockProductRepo.findOne.mockResolvedValueOnce(conflicting);   // validateSlug

      await expect(service.update("product-uuid-1", { slug: "conflict-slug" })).rejects.toThrow(ConflictException);
    });

    it("facetValueIds가 빈 배열이면 facetValues를 빈 배열로 대체한다", async () => {
      const existing = makeProduct({ facetValues: [{ id: "fv-1" }] as FacetValue[] });
      const updated = makeProduct({ facetValues: [] });

      mockProductRepo.findOne.mockResolvedValueOnce(existing);
      mockProductRepo.save.mockResolvedValue(existing);
      mockProductRepo.findOne.mockResolvedValueOnce(updated);

      await service.update("product-uuid-1", { facetValueIds: [] });

      expect(existing.facetValues).toEqual([]);
    });

    it("facetValueIds가 undefined이면 facetValues를 변경하지 않는다", async () => {
      const originalFacetValues = [{ id: "fv-1" }] as FacetValue[];
      const existing = makeProduct({ facetValues: originalFacetValues });

      mockProductRepo.findOne.mockResolvedValueOnce(existing);
      mockProductRepo.save.mockResolvedValue(existing);
      mockProductRepo.findOne.mockResolvedValueOnce(existing);

      await service.update("product-uuid-1", { name: "이름만 변경" });

      expect(mockFacetValueRepo.findBy).not.toHaveBeenCalled();
      expect(existing.facetValues).toBe(originalFacetValues);
    });
  });

  // ===========================================================================
  // softDelete
  // ===========================================================================

  describe("softDelete", () => {
    it("상품의 deletedAt을 설정하고 variant를 cascade 삭제한다", async () => {
      const product = makeProduct({ deletedAt: null });
      mockProductRepo.findOne.mockResolvedValue(product);
      mockProductRepo.save.mockResolvedValue(product);

      await service.softDelete("product-uuid-1");

      expect(product.deletedAt).toBeInstanceOf(Date);
      expect(mockProductRepo.save).toHaveBeenCalledWith(product);
      expect(mockVariantService.softDeleteByProductId).toHaveBeenCalledWith("product-uuid-1");
    });

    it("상품이 없으면 NotFoundException을 던진다", async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(service.softDelete("not-exist")).rejects.toThrow(NotFoundException);
      expect(mockVariantService.softDeleteByProductId).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // addOptionGroupToProduct
  // ===========================================================================

  describe("addOptionGroupToProduct", () => {
    it("옵션 그룹을 상품에 추가하고 업데이트된 상품을 반환한다", async () => {
      const optionGroup = { id: "og-uuid-1" } as ProductOptionGroup;
      const product = makeProduct({ optionGroups: [] });
      const updatedProduct = makeProduct({ optionGroups: [optionGroup] });

      mockProductRepo.findOne.mockResolvedValueOnce(product);    // addOptionGroup의 findOne
      mockDb.findOneOrFail.mockResolvedValue(optionGroup);
      mockProductRepo.save.mockResolvedValue(product);
      mockProductRepo.findOne.mockResolvedValueOnce(updatedProduct); // this.findOne at end

      const result = await service.addOptionGroupToProduct("product-uuid-1", "og-uuid-1");

      expect(result).toBe(updatedProduct);
      expect(product.optionGroups).toContain(optionGroup);
      expect(mockProductRepo.save).toHaveBeenCalled();
    });

    it("상품이 없으면 NotFoundException을 던진다", async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addOptionGroupToProduct("not-exist", "og-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("옵션 그룹이 없으면 NotFoundException을 던진다", async () => {
      const product = makeProduct({ optionGroups: [] });
      mockProductRepo.findOne.mockResolvedValue(product);
      mockDb.findOneOrFail.mockRejectedValue(new NotFoundException());

      await expect(
        service.addOptionGroupToProduct("product-uuid-1", "not-exist"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // removeOptionGroupFromProduct
  // ===========================================================================

  describe("removeOptionGroupFromProduct", () => {
    const makeProductWithOptionGroup = () => {
      const option = { id: "opt-1", groupId: "og-uuid-1" } as ProductOption;
      const optionGroup = { id: "og-uuid-1" } as ProductOptionGroup;
      const variant = { id: "var-1", deletedAt: null, options: [option] } as unknown as ProductVariant;
      return makeProduct({ optionGroups: [optionGroup], variants: [variant] });
    };

    it("force=false이고 옵션이 사용 중이면 ConflictException을 던진다", async () => {
      const product = makeProductWithOptionGroup();
      mockProductRepo.findOne.mockResolvedValue(product);

      await expect(
        service.removeOptionGroupFromProduct("product-uuid-1", "og-uuid-1", false),
      ).rejects.toThrow(ConflictException);
    });

    it("force=true이면 variant에서 옵션을 제거하고 그룹을 삭제한다", async () => {
      const product = makeProductWithOptionGroup();
      const finalProduct = makeProduct({ optionGroups: [] });

      mockProductRepo.findOne.mockResolvedValueOnce(product);   // removeOptionGroup의 findOne
      mockVariantRepo.save.mockResolvedValue([]);
      mockProductRepo.save.mockResolvedValue(product);
      mockProductRepo.findOne.mockResolvedValueOnce(finalProduct); // this.findOne at end

      const result = await service.removeOptionGroupFromProduct("product-uuid-1", "og-uuid-1", true);

      expect(mockVariantRepo.save).toHaveBeenCalled();
      expect(mockOptionGroupService.delete).toHaveBeenCalledWith("og-uuid-1");
      expect(result).toBe(finalProduct);
      // variant의 options에서 해당 groupId 옵션이 제거됨
      const variant = product.variants[0];
      expect(variant.options.some((o) => o.groupId === "og-uuid-1")).toBe(false);
    });

    it("상품이 없으면 NotFoundException을 던진다", async () => {
      mockProductRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeOptionGroupFromProduct("not-exist", "og-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });

    it("상품에 해당 옵션그룹이 연결되어 있지 않으면 NotFoundException을 던진다", async () => {
      const product = makeProduct({ optionGroups: [], variants: [] });
      mockProductRepo.findOne.mockResolvedValue(product);

      await expect(
        service.removeOptionGroupFromProduct("product-uuid-1", "og-uuid-1"),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
