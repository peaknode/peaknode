import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Asset } from "src/entity/asset/asset.entity";

/**
 * 에셋 목록 조회 결과 타입.
 * items: 현재 페이지의 에셋 목록, total: 필터 조건에 맞는 전체 에셋 수.
 */
@ObjectType()
export class AssetListResult {
  /** 현재 페이지 에셋 목록 */
  @Field(() => [Asset])
  items: Asset[];

  /** 전체 에셋 수 (페이지네이션 무관) */
  @Field(() => Int)
  total: number;
}
