import { Column, Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { User } from "../user/user.entity";
import { Address } from "../address/address.entity";

@Entity("customer")
export class Customer extends BaseEntity {
  @Column({ name: "first_name" })
  firstName: string;

  @Column({ name: "last_name" })
  lastName: string;

  // User.identifier와 별도 컬럼 — 게스트(userId=null)도 이메일 보유
  @Column({ name: "email_address", unique: true })
  emailAddress: string;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  // null = 게스트 체크아웃
  @Column({ name: "user_id", nullable: true })
  userId: string | null;

  @OneToOne(() => User, (u) => u.customer, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user: User | null;

  @OneToMany(() => Address, (a) => a.customer, { cascade: true })
  addresses: Address[];

  // orders, coupons, cart 등은 각 모듈이 customer_id FK로 참조

  /**
   * 관리자가 정의한 커스텀 필드 값 맵.
   * 허용 필드는 `CustomFieldDefinition`(entityName="Customer") 레코드로 관리한다.
   * null이면 커스텀 필드 미설정 상태.
   */
  @Column({ name: "custom_fields", type: "simple-json", nullable: true })
  customFields: Record<string, unknown> | null;
}
