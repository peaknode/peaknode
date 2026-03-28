import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Role } from "src/entity/administrator/role.entity";

/**
 * 역할 목록 조회 결과 타입.
 *
 * `items`: 역할 배열, `total`: 전체 역할 수 (페이지네이션 무관).
 */
@ObjectType()
export class RoleListResult {
  /** 역할 목록 */
  @Field(() => [Role])
  items: Role[];

  /** 전체 역할 수 */
  @Field(() => Int)
  total: number;
}
