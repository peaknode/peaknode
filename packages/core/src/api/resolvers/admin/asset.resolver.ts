import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { Asset } from "src/entity/asset/asset.entity";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";
import { AssetService } from "src/service/asset/asset.service";
import { ListAssetsDto } from "src/service/dto/asset/list-assets.dto";
import { UpdateAssetDto } from "src/service/dto/asset/update-asset.dto";
import { AssetListResult } from "../../types/asset-list-result.type";

/**
 * Admin API — Asset GraphQL Resolver.
 *
 * 에셋 목록 조회, 단건 조회, 수정, 삭제를 제공한다.
 * 파일 업로드는 별도 REST 컨트롤러(`POST /admin-api/assets/upload`)에서 처리한다.
 * 모든 요청은 `AdminAuthGuard`로 보호된다.
 *
 * Endpoint: POST /graphql
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => Asset)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /**
   * 에셋 목록을 페이지네이션하여 반환한다.
   *
   * @example
   * query {
   *   assets(options: { skip: 0, take: 20, type: IMAGE }) {
   *     total
   *     items { id name mimeType source createdAt }
   *   }
   * }
   */
  @RequirePermissions(Permission.AssetRead)
  @Query(() => AssetListResult, { description: "에셋 목록 조회 (페이지네이션)" })
  assets(
    @Args("options", { type: () => ListAssetsDto, nullable: true })
    options?: ListAssetsDto,
  ): Promise<AssetListResult> {
    return this.assetService.findAll(options);
  }

  /**
   * ID로 에셋 단건을 조회한다.
   *
   * @example
   * query { asset(id: "uuid") { id name source mimeType tags { id value } } }
   */
  @RequirePermissions(Permission.AssetRead)
  @Query(() => Asset, { description: "ID로 에셋 단건 조회" })
  asset(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<Asset> {
    return this.assetService.findOne(id);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  /**
   * 에셋 정보를 수정한다 (name, focalPoint, tags).
   *
   * @example
   * mutation {
   *   updateAsset(id: "uuid", input: { name: "새 이름" }) { id name }
   * }
   */
  @RequirePermissions(Permission.AssetCreate)
  @Mutation(() => Asset, { description: "에셋 수정 (name/focalPoint/tags)" })
  updateAsset(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateAssetDto,
  ): Promise<Asset> {
    return this.assetService.update(id, input);
  }

  /**
   * 에셋을 소프트 딜리트한다.
   * 상품 갤러리에서 사용 중인 경우 삭제가 거부된다.
   *
   * @example
   * mutation { deleteAsset(id: "uuid") }
   */
  @RequirePermissions(Permission.AssetDelete)
  @Mutation(() => Boolean, { description: "에셋 소프트 딜리트" })
  async deleteAsset(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.assetService.delete(id);
    return true;
  }
}
