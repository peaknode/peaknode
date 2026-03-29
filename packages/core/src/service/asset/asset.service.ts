import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Client } from "minio";
import * as path from "path";
import * as crypto from "crypto";
import { Transactional, TransactionConnection } from "src/common/database";
import { Asset, AssetType } from "src/entity/asset/asset.entity";
import { Tag } from "src/entity/asset/asset-tag.entity";
import { ProductAsset } from "src/entity/product/product-asset.entity";
import { IsNull } from "typeorm";
import { ListAssetsDto } from "../dto/asset/list-assets.dto";
import { UpdateAssetDto } from "../dto/asset/update-asset.dto";

/**
 * Asset(미디어 파일) 도메인의 핵심 비즈니스 로직을 담당하는 서비스.
 *
 * MinIO 업로드/삭제 + Asset DB CRUD를 담당한다.
 * 모듈 초기화 시 MinIO 버킷이 없으면 자동으로 생성한다.
 *
 * @example
 * const asset = await assetService.upload(file);
 * const url = assetService.getUrl(asset.source);
 */
@Injectable()
export class AssetService implements OnModuleInit {
  private readonly logger = new Logger(AssetService.name);

  /** MinIO 클라이언트 */
  private readonly minioClient: Client;

  /** 업로드 대상 버킷 이름 */
  private readonly bucket: string;

  constructor(protected readonly db: TransactionConnection) {
    this.bucket = process.env.MINIO_BUCKET ?? "pdf-local";

    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
      secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
    });
  }

  /**
   * 모듈 초기화 시 MinIO 버킷 존재 여부를 확인하고, 없으면 생성한다.
   */
  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket);
        this.logger.log(`MinIO 버킷 생성: ${this.bucket}`);
      }
    } catch (err) {
      this.logger.warn(`MinIO 버킷 초기화 실패 (서버 미기동 가능성): ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 조회
  // ---------------------------------------------------------------------------

  /**
   * 에셋 목록을 페이지네이션하여 반환한다.
   *
   * @param options - 페이지, 유형 필터, 검색 옵션
   * @returns items: 에셋 배열, total: 전체 건수
   */
  async findAll(options: ListAssetsDto = {}): Promise<{ items: Asset[]; total: number }> {
    const { skip = 0, take = 20, type, search } = options;
    const effectiveTake = Math.min(take, 100);

    const qb = this.db
      .getRepository(Asset)
      .createQueryBuilder("asset")
      .leftJoinAndSelect("asset.tags", "tags")
      .where("asset.deletedAt IS NULL")
      .skip(skip)
      .take(effectiveTake)
      .orderBy("asset.createdAt", "DESC");

    if (type) {
      qb.andWhere("asset.type = :type", { type });
    }

    if (search) {
      qb.andWhere("asset.name LIKE :search", { search: `%${search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * ID로 에셋 단건을 조회한다. 없거나 소프트 딜리트된 경우 NotFoundException을 던진다.
   *
   * @param id - Asset UUID
   * @returns tags가 로드된 Asset
   * @throws NotFoundException
   */
  async findOne(id: string): Promise<Asset> {
    const asset = await this.db.getRepository(Asset).findOne({
      where: { id, deletedAt: IsNull() },
      relations: ["tags"],
    });

    if (!asset) {
      throw new NotFoundException(`Asset(id: "${id}")를 찾을 수 없습니다.`);
    }

    return asset;
  }

  // ---------------------------------------------------------------------------
  // 업로드 / 수정 / 삭제
  // ---------------------------------------------------------------------------

  /**
   * 파일을 MinIO에 업로드하고 Asset 레코드를 DB에 저장한다.
   *
   * 오브젝트 키 형식: `{timestamp}-{uuid}.{ext}`
   *
   * @param file - Express.Multer.File 객체 (buffer 기반 메모리 스토리지)
   * @param tagIds - 연결할 Tag UUID 목록 (선택)
   * @returns 생성된 Asset
   */
  @Transactional()
  async upload(file: Express.Multer.File, tagIds?: string[]): Promise<Asset> {
    const ext = path.extname(file.originalname).toLowerCase();
    const objectKey = `${Date.now()}-${crypto.randomUUID()}${ext}`;

    await this.minioClient.putObject(
      this.bucket,
      objectKey,
      file.buffer,
      file.size,
      { "Content-Type": file.mimetype },
    );

    const repo = this.db.getRepository(Asset);
    const asset = repo.create({
      name: path.basename(file.originalname, ext) || objectKey,
      type: this.resolveAssetType(file.mimetype),
      mimeType: file.mimetype,
      fileSize: file.size,
      source: objectKey,
      preview: null,
      width: null,
      height: null,
      focalPoint: null,
    });

    if (tagIds && tagIds.length > 0) {
      asset.tags = await this.db.getRepository(Tag).findBy(tagIds.map((id) => ({ id })));
    } else {
      asset.tags = [];
    }

    const saved = await repo.save(asset);
    return this.findOne(saved.id);
  }

  /**
   * 에셋 정보를 수정한다. name, focalPoint, tags만 변경 가능하다.
   *
   * @param id - 수정할 Asset UUID
   * @param dto - 수정 데이터
   * @returns 수정된 Asset
   * @throws NotFoundException - 에셋이 없는 경우
   */
  @Transactional()
  async update(id: string, dto: UpdateAssetDto): Promise<Asset> {
    const asset = await this.findOne(id);

    if (dto.name !== undefined) asset.name = dto.name;
    if (dto.focalPoint !== undefined) asset.focalPoint = dto.focalPoint ?? null;

    if (dto.tagIds !== undefined) {
      asset.tags =
        dto.tagIds.length > 0
          ? await this.db.getRepository(Tag).findBy(dto.tagIds.map((tagId) => ({ id: tagId })))
          : [];
    }

    await this.db.getRepository(Asset).save(asset);
    return this.findOne(id);
  }

  /**
   * 에셋을 소프트 딜리트한다.
   *
   * 상품 갤러리(ProductAsset, ProductVariantAsset)에서 사용 중인 경우 ConflictException을 던진다.
   *
   * @param id - 삭제할 Asset UUID
   * @throws NotFoundException - 에셋이 없는 경우
   * @throws ConflictException - 상품에서 참조 중인 경우
   */
  @Transactional()
  async delete(id: string): Promise<void> {
    const asset = await this.findOne(id);

    // 상품 갤러리 참조 검사
    const usageCount = await this.db
      .getRepository(ProductAsset)
      .count({ where: { assetId: id } });

    if (usageCount > 0) {
      throw new ConflictException(
        `Asset(id: "${id}")는 상품 갤러리에서 사용 중이므로 삭제할 수 없습니다.`,
      );
    }

    asset.deletedAt = new Date();
    await this.db.getRepository(Asset).save(asset);
  }

  // ---------------------------------------------------------------------------
  // URL 생성
  // ---------------------------------------------------------------------------

  /**
   * MinIO 오브젝트 키로부터 공개 접근 URL을 생성한다.
   *
   * 형식: `http(s)://{endpoint}:{port}/{bucket}/{objectKey}`
   *
   * @param source - Asset.source (MinIO 오브젝트 키)
   * @returns 공개 URL 문자열
   */
  getUrl(source: string): string {
    const protocol = process.env.MINIO_USE_SSL === "true" ? "https" : "http";
    const endpoint = process.env.MINIO_ENDPOINT ?? "localhost";
    const port = process.env.MINIO_PORT ?? "9000";
    return `${protocol}://${endpoint}:${port}/${this.bucket}/${source}`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * MIME 타입으로부터 AssetType을 결정한다.
   *
   * @param mimeType - 파일 MIME 타입
   * @returns AssetType 열거값
   */
  private resolveAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith("image/")) return AssetType.IMAGE;
    if (mimeType.startsWith("video/")) return AssetType.VIDEO;
    if (mimeType.startsWith("audio/")) return AssetType.AUDIO;
    if (
      mimeType.startsWith("text/") ||
      mimeType === "application/pdf" ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("presentation")
    ) {
      return AssetType.DOCUMENT;
    }
    return AssetType.BINARY;
  }
}
