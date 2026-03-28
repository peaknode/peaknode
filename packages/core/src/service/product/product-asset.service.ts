import { Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { Product, ProductAsset } from "src/entity";
import { IsNull } from "typeorm";

/**
 * ProductAsset(상품 갤러리 이미지) 관련 비즈니스 로직을 담당하는 서비스.
 *
 * 갤러리 이미지 추가·제거·순서 재정렬을 제공한다.
 *
 * @example
 * // 이미지 추가
 * await productAssetService.add(productId, assetId);
 * // 순서 재정렬 (원하는 순서로 assetId 배열 전달)
 * await productAssetService.reorder(productId, [assetId2, assetId1, assetId3]);
 */
@Injectable()
export class ProductAssetService {
  constructor(protected readonly db: TransactionConnection) {}

  /**
   * 상품 갤러리에 이미지(Asset)를 추가한다.
   *
   * `position` 미지정 시 현재 갤러리의 마지막 순서로 추가된다.
   *
   * @param productId - 대상 Product UUID
   * @param assetId - 추가할 Asset UUID
   * @param position - 갤러리 내 위치 (선택, 미지정 시 맨 뒤)
   * @returns 업데이트된 Product (productAssets 포함)
   * @throws NotFoundException - Product가 없는 경우
   */
  @Transactional()
  async add(productId: string, assetId: string, position?: number): Promise<Product> {
    const product = await this.findProductOrFail(productId);

    let nextPosition = position;
    if (nextPosition === undefined) {
      const existing = await this.db.getRepository(ProductAsset).find({
        where: { productId },
        order: { position: "DESC" },
        take: 1,
      });
      nextPosition = existing.length > 0 ? existing[0].position + 1 : 0;
    }

    const productAsset = this.db.getRepository(ProductAsset).create({
      productId,
      assetId,
      position: nextPosition,
    });

    await this.db.getRepository(ProductAsset).save(productAsset);
    return this.findProductOrFail(productId);
  }

  /**
   * 상품 갤러리에서 이미지를 제거한다.
   *
   * @param productId - 대상 Product UUID
   * @param assetId - 제거할 Asset UUID
   * @returns 업데이트된 Product (productAssets 포함)
   * @throws NotFoundException - Product 또는 해당 ProductAsset이 없는 경우
   */
  @Transactional()
  async remove(productId: string, assetId: string): Promise<Product> {
    await this.findProductOrFail(productId);

    const productAsset = await this.db.getRepository(ProductAsset).findOne({
      where: { productId, assetId },
    });

    if (!productAsset) {
      throw new NotFoundException(
        `Product(id: "${productId}")에 Asset(id: "${assetId}")이 연결되어 있지 않습니다.`,
      );
    }

    await this.db.getRepository(ProductAsset).delete({ productId, assetId });
    return this.findProductOrFail(productId);
  }

  /**
   * 상품 갤러리 이미지 순서를 재정렬한다.
   *
   * `assetIds` 배열의 인덱스가 새 `position` 값이 된다.
   * 배열에 없는 기존 ProductAsset은 제거된다.
   *
   * @param productId - 대상 Product UUID
   * @param assetIds - 원하는 순서로 정렬된 Asset UUID 배열
   * @returns 업데이트된 Product (productAssets 포함)
   * @throws NotFoundException - Product가 없는 경우
   */
  @Transactional()
  async reorder(productId: string, assetIds: string[]): Promise<Product> {
    await this.findProductOrFail(productId);

    // 기존 연결 제거 후 새 순서로 재생성
    await this.db.getRepository(ProductAsset).delete({ productId });

    if (assetIds.length > 0) {
      const newAssets = assetIds.map((assetId, index) =>
        this.db.getRepository(ProductAsset).create({
          productId,
          assetId,
          position: index,
        }),
      );
      await this.db.getRepository(ProductAsset).save(newAssets);
    }

    return this.findProductOrFail(productId);
  }

  /**
   * Product를 조회한다. 없거나 소프트 딜리트된 경우 NotFoundException을 던진다.
   *
   * @param productId - Product UUID
   */
  private async findProductOrFail(productId: string): Promise<Product> {
    const product = await this.db.getRepository(Product).findOne({
      where: { id: productId, deletedAt: IsNull() },
      relations: ["productAssets", "productAssets.asset"],
      order: { productAssets: { position: "ASC" } },
    });

    if (!product) {
      throw new NotFoundException(`Product(id: "${productId}")를 찾을 수 없습니다.`);
    }

    return product;
  }
}
