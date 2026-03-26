import { NotFoundException } from "@nestjs/common";
import { ProductOption, ProductOptionGroup } from "src/entity";
import { ProductOptionGroupService } from "./product-option-group.service";

/**
 * ProductOptionGroupService 유닛 테스트.
 *
 * TransactionConnection을 목킹하여 DB 없이 동작을 검증한다.
 */
describe("ProductOptionGroupService", () => {
  let service: ProductOptionGroupService;
  let mockOptionRepo: { delete: jest.Mock };
  let mockOptionGroupRepo: { delete: jest.Mock };
  let mockDb: { getRepository: jest.Mock; withTransaction: jest.Mock; findOneOrFail: jest.Mock };

  beforeEach(() => {
    mockOptionRepo = { delete: jest.fn().mockResolvedValue({ affected: 3 }) };
    mockOptionGroupRepo = { delete: jest.fn().mockResolvedValue({ affected: 1 }) };

    mockDb = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ProductOption) return mockOptionRepo;
        if (entity === ProductOptionGroup) return mockOptionGroupRepo;
        return {};
      }),
      withTransaction: jest.fn().mockImplementation((work: () => Promise<unknown>) => work()),
      findOneOrFail: jest.fn().mockResolvedValue({ id: "og-uuid-1" } as ProductOptionGroup),
    };

    service = new ProductOptionGroupService(mockDb as any);
  });

  describe("delete", () => {
    it("옵션 그룹이 존재하면 하위 Option과 그룹을 순서대로 삭제한다", async () => {
      await service.delete("og-uuid-1");

      // 존재 확인
      expect(mockDb.findOneOrFail).toHaveBeenCalledWith(ProductOptionGroup, "og-uuid-1");

      // Option 먼저 삭제
      expect(mockOptionRepo.delete).toHaveBeenCalledWith({ groupId: "og-uuid-1" });

      // OptionGroup 삭제
      expect(mockOptionGroupRepo.delete).toHaveBeenCalledWith("og-uuid-1");

      // 순서 검증: Option이 OptionGroup보다 먼저 삭제되어야 한다
      const optionDeleteOrder = mockOptionRepo.delete.mock.invocationCallOrder[0];
      const groupDeleteOrder = mockOptionGroupRepo.delete.mock.invocationCallOrder[0];
      expect(optionDeleteOrder).toBeLessThan(groupDeleteOrder);
    });

    it("옵션 그룹이 없으면 NotFoundException을 던진다", async () => {
      mockDb.findOneOrFail.mockRejectedValue(new NotFoundException());

      await expect(service.delete("not-exist")).rejects.toThrow(NotFoundException);
      expect(mockOptionRepo.delete).not.toHaveBeenCalled();
      expect(mockOptionGroupRepo.delete).not.toHaveBeenCalled();
    });
  });
});
