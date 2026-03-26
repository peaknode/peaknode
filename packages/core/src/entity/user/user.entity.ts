import { Column, Entity, OneToMany, OneToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Administrator } from "../administrator/administrator.entity";
import { Customer } from "../customer/customer.entity";
import { AuthenticationMethod } from "./authentication-method.entity";

@Entity("user")
export class User extends BaseEntity {
  @Column({ unique: true })
  identifier: string;

  @Column({ name: "password_hash", nullable: true })
  passwordHash: string | null;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: "verification_token", nullable: true })
  verificationToken: string | null;

  @Column({ name: "verification_token_expires", type: "timestamp", nullable: true })
  verificationTokenExpires: Date | null;

  @Column({ name: "reset_password_token", nullable: true })
  resetPasswordToken: string | null;

  @Column({ name: "reset_password_token_expires", type: "timestamp", nullable: true })
  resetPasswordTokenExpires: Date | null;

  @Column({ name: "last_login", type: "timestamp", nullable: true })
  lastLogin: Date | null;

  @OneToOne(() => Customer, (c) => c.user)
  customer?: Customer;

  @OneToOne(() => Administrator, (a) => a.user)
  administrator?: Administrator;

  @OneToMany(() => AuthenticationMethod, (m) => m.user, { cascade: true })
  authenticationMethods: AuthenticationMethod[];

  /**
   * 관리자가 정의한 커스텀 필드 값 맵.
   * 허용 필드는 `CustomFieldDefinition`(entityName="User") 레코드로 관리한다.
   * null이면 커스텀 필드 미설정 상태.
   */
  @Column({ name: "custom_fields", type: "simple-json", nullable: true })
  customFields: Record<string, unknown> | null;
}
