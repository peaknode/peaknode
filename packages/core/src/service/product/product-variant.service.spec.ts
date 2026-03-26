import { IsNull } from "typeorm";
import { ProductVariant } from "src/entity";
import { ProductVariantService } from "./product-variant.service";

/**
 * ProductVariantService 유닛 테스트.
 *
 * TransactionConnection을 목킹하여 DB 없이 동작을 검증한다.
 */
describe("ProductVariantService", () => {
  let service: ProductVariantService;
  let mockVariantRepo: { update: jest.Mock };
  let mockDb: { getRepository: jest.Mock; withTransaction: jest.Mock };

  beforeEach(() => {
    mockVariantRepo = { update: jest.fn().mockResolvedValue({ affected: 2 }) };

    mockDb = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ProductVariant) return mockVariantRepo;
        return {};
      }),
      withTransaction: jest.fn().mockImplementation((work: () => Promise<unknown>) => work()),
    };

    service = new ProductVariantService(mockDb as any);
  });

  describe("softDeleteByProductId", () => {
    it("해당 productId의 활성 Variant를 소프트 딜리트한다", async () => {
      await service.softDeleteByProductId("product-uuid-1");

      expect(mockVariantRepo.update).toHaveBeenCalledWith(
        { productId: "product-uuid-1", deletedAt: IsNull() },
        { deletedAt: expect.any(Date) },
      );
    });

    it("이미 삭제된 Variant는 건드리지 않는다 (IsNull 조건 검증)", async () => {
      await service.softDeleteByProductId("product-uuid-1");

      const [where] = mockVariantRepo.update.mock.calls[0];
      // deletedAt: IsNull() 조건이 where 절에 포함되어야 한다
      expect(where).toHaveProperty("deletedAt");
    });
  });
});
