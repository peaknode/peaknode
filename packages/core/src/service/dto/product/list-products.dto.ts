import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

/**
 * 상품 목록 조회 옵션 DTO.
 */
@InputType()
export class ListProductsDto {
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

  /** 활성화 여부 필터 */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /**
   * FacetValue UUID 목록으로 필터링.
   * 지정한 FacetValue를 모두 보유한 상품만 반환된다 (AND 조건).
   */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  facetValueIds?: string[];

  /** 특정 Collection에 속한 상품만 필터링 */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  collectionId?: string;

  /** 상품명 부분 검색 (LIKE %search%) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
