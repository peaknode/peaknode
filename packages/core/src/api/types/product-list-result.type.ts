import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Product } from "src/entity";

/**
 * 상품 목록 조회 결과 타입.
 * items: 현재 페이지의 상품 목록, total: 필터 조건에 맞는 전체 상품 수.
 */
@ObjectType()
export class ProductListResult {
  /** 현재 페이지 상품 목록 */
  @Field(() => [Product])
  items: Product[];

  /** 전체 상품 수 (페이지네이션 무관) */
  @Field(() => Int)
  total: number;
}
