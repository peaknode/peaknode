import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, ManyToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Administrator } from "./administrator.entity";

/**
 * 관리자에게 할당되는 역할(Role) 엔터티.
 *
 * 역할은 `permissions` 배열을 통해 세분화된 권한을 묶어서 관리한다.
 * 하나의 관리자는 여러 역할을 가질 수 있다 (M:N).
 *
 * `SUPERADMIN_PERMISSION("__superadmin__")`이 포함된 역할을 가진 관리자는
 * 모든 권한 체크를 bypass한다.
 */
@ObjectType()
@Entity("role")
export class Role extends BaseEntity {
  /**
   * 역할 코드. 시스템 전체에서 고유한 식별자.
   * URL-friendly 소문자 + 하이픈 조합. 예: "superadmin", "product-manager"
   * 생성 후 변경 불가.
   */
  @Field()
  @Column({ unique: true })
  code: string;

  /** 역할에 대한 사람이 읽을 수 있는 설명 */
  @Field()
  @Column()
  description: string;

  /**
   * 이 역할이 가진 권한 문자열 배열.
   * `Permission` enum의 value(예: "product:create") 또는
   * `SUPERADMIN_PERMISSION("__superadmin__")`을 포함한다.
   */
  @Field(() => [String])
  @Column({ type: "simple-json" })
  permissions: string[];

  /** 이 역할이 할당된 관리자 목록. GraphQL에 노출하지 않음 (순환 로딩 방지). */
  @ManyToMany(() => Administrator, (a) => a.roles)
  administrators: Administrator[];
}
