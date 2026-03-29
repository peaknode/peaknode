import { Field, ID, InputType } from "@nestjs/graphql";
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

/**
 * 에셋 포컬 포인트 입력 타입.
 * x, y 모두 0.0 ~ 1.0 범위.
 */
@InputType()
export class FocalPointInput {
  /** 수평 위치 (0.0 ~ 1.0) */
  @Field()
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  /** 수직 위치 (0.0 ~ 1.0) */
  @Field()
  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;
}

/**
 * 에셋 수정 요청 DTO.
 * 파일 자체(source, mimeType, fileSize 등)는 변경 불가.
 * name, focalPoint, tags만 수정 가능하다.
 */
@InputType()
export class UpdateAssetDto {
  /** 에셋 표시명 */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /**
   * 이미지 포컬 포인트.
   * null 전달 시 포컬 포인트를 제거한다.
   */
  @Field(() => FocalPointInput, { nullable: true })
  @IsOptional()
  focalPoint?: FocalPointInput | null;

  /**
   * 연결할 Tag UUID 목록.
   * 전달 시 기존 tags를 전부 교체한다.
   */
  @Field(() => [ID], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  tagIds?: string[];
}
