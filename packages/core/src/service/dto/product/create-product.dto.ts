import { Field, ID, InputType } from "@nestjs/graphql";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";

/**
 * 상품 생성 요청 DTO.
 */
@InputType()
export class CreateProductDto {
  /** 상품명 */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** URL-friendly 고유 식별자 (예: "mens-basic-tee") */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug는 영문 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다",
  })
  slug: string;

  /** 상품 설명 (HTML 또는 Markdown, 선택) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * 활성화 여부.
   * false면 프론트엔드에 노출되지 않는다.
   * @default true
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** 대표 이미지 Asset UUID (선택) */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  featuredAssetId?: string;

  /** 연결할 FacetValue UUID 목록 (선택) */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  facetValueIds?: string[];

  /** 연결할 Collection UUID 목록 (선택) */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  collectionIds?: string[];
}
