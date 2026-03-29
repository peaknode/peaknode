import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
  ParseArrayPipe,
  Optional,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";
import { AssetService } from "src/service/asset/asset.service";
import { Asset } from "src/entity/asset/asset.entity";

/**
 * Admin API — Asset REST 업로드 컨트롤러.
 *
 * GraphQL은 파일 업로드에 적합하지 않으므로 REST 엔드포인트를 별도 제공한다.
 * 업로드된 파일은 MinIO에 저장되고, 메타데이터가 DB에 기록된 Asset이 반환된다.
 *
 * @route POST /admin-api/assets/upload
 */
@UseGuards(AdminAuthGuard)
@Controller("admin-api/assets")
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  /**
   * 파일을 MinIO에 업로드하고 Asset을 생성한다.
   *
   * `multipart/form-data` 형식으로 `file` 필드에 파일을 전달한다.
   * 선택적으로 `tagIds` 쿼리 파라미터로 Tag UUID 배열을 전달할 수 있다.
   *
   * @param file - 업로드할 파일 (multipart file)
   * @param tagIds - 연결할 Tag UUID 배열 (쿼리 파라미터, 선택)
   * @returns 생성된 Asset
   *
   * @example
   * POST /admin-api/assets/upload?tagIds=uuid1&tagIds=uuid2
   * Content-Type: multipart/form-data
   * Body: file=<binary>
   */
  @RequirePermissions(Permission.AssetCreate)
  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  uploadAsset(
    @UploadedFile() file: Express.Multer.File,
    @Optional()
    @Query("tagIds", new ParseArrayPipe({ items: String, separator: ",", optional: true }))
    tagIds?: string[],
  ): Promise<Asset> {
    return this.assetService.upload(file, tagIds);
  }
}
