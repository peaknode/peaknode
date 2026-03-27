import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";
import { BaseEntity } from "../base/base.entity";
import { User } from "../user/user.entity";
import { Address } from "../address/address.entity";

/**
 * 고객 프로필 엔터티.
 *
 * 이름, 이메일, 전화번호 등 고객 관련 정보를 저장한다.
 * `userId`가 null이면 게스트 체크아웃 고객이다.
 */
@ObjectType()
@Entity("customer")
export class Customer extends BaseEntity {
  /** 이름. */
  @Field()
  @Column({ name: "first_name" })
  firstName: string;

  /** 성. */
  @Field()
  @Column({ name: "last_name" })
  lastName: string;

  /**
   * 고객 이메일 주소.
   * User.identifier와 별도 컬럼 — 게스트(userId=null)도 이메일 보유.
   */
  @Field()
  @Column({ name: "email_address", unique: true })
  emailAddress: string;

  /** 전화번호. */
  @Field({ nullable: true })
  @Column({ nullable: true })
  phone: string | null;

  /** 계정 활성화 여부. */
  @Field()
  @Column({ name: "is_active", default: true })
  isActive: boolean;

  /** 연결된 User의 ID. null이면 게스트 체크아웃. */
  @Column({ name: "user_id", nullable: true })
  userId: string | null;

  @OneToOne(() => User, (u) => u.customer, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  @OneToMany(() => Address, (a) => a.customer, { cascade: true })
  addresses: Address[];

  /**
   * 관리자가 정의한 커스텀 필드 값 맵.
   * 허용 필드는 `CustomFieldDefinition`(entityName="Customer") 레코드로 관리한다.
   * null이면 커스텀 필드 미설정 상태.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @Column({ name: "custom_fields", type: "simple-json", nullable: true })
  customFields: Record<string, unknown> | null;
}
