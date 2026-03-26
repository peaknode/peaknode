import { Field, ID, InputType } from "@nestjs/graphql";
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from "class-validator";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";

/**
 * 상품 수정 요청 DTO.
 * 모든 필드가 선택적이며, 전달된 필드만 업데이트된다.
 * slug를 변경하는 경우 고유성이 재검증된다.
 */
@InputType()
export class UpdateProductDto {
  /** 상품명 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /**
   * URL-friendly 고유 식별자.
   * 변경 시 기존 slug와 중복 여부를 재검증한다.
   */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug는 영문 소문자, 숫자, 하이픈만 사용 가능하며 하이픈으로 시작하거나 끝날 수 없습니다",
  })
  slug?: string;

  /** 상품 설명 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  /** 활성화 여부 */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** 대표 이미지 Asset UUID */
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  featuredAssetId?: string;

  /**
   * 연결할 FacetValue UUID 목록.
   * 전달 시 기존 facetValues를 전부 교체한다.
   */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  facetValueIds?: string[];

  /**
   * 연결할 Collection UUID 목록.
   * 전달 시 기존 collections를 전부 교체한다.
   */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  collectionIds?: string[];

  /**
   * 커스텀 필드 값 맵.
   * 전달 시 기존 customFields를 전부 교체한다.
   * 허용 필드와 타입은 `CustomFieldDefinition`(entityName="Product")으로 관리된다.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @IsOptional()
  customFields?: Record<string, unknown>;
}
