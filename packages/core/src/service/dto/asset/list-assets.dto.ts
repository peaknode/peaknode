import { Field, InputType, Int } from "@nestjs/graphql";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { AssetType } from "src/entity/asset/asset.entity";

/**
 * 에셋 목록 조회 옵션 DTO.
 */
@InputType()
export class ListAssetsDto {
  /**
   * 건너뛸 레코드 수 (페이지네이션 오프셋).
   * @default 0
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  /**
   * 가져올 최대 레코드 수.
   * @default 20
   * @max 100
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  /** 에셋 유형 필터 */
  @Field(() => AssetType, { nullable: true })
  @IsOptional()
  @IsEnum(AssetType)
  type?: AssetType;

  /** 에셋명 부분 검색 (LIKE %search%) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
