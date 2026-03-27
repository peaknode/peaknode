import { Field, GraphQLISODateTime, ObjectType } from "@nestjs/graphql";
import { Column, Entity, OneToMany, OneToOne } from "typeorm";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";
import { BaseEntity } from "../base/base.entity";
import { Administrator } from "../administrator/administrator.entity";
import { Customer } from "../customer/customer.entity";
import { AuthenticationMethod } from "./authentication-method.entity";

/**
 * 인증 계정 엔터티.
 *
 * 로그인 식별자, 계정 상태, 이메일 인증, 비밀번호 리셋 토큰을 관리한다.
 * 실제 프로필 정보(이름, 전화번호 등)는 {@link Customer} 또는 {@link Administrator}에 저장된다.
 */
@ObjectType()
@Entity("user")
export class User extends BaseEntity {
  /** 로그인 식별자 (이메일 주소). */
  @Field()
  @Column({ unique: true })
  identifier: string;

  @Column({ name: "password_hash", nullable: true })
  passwordHash: string | null;

  /** 계정 활성화 여부. false이면 로그인 불가. */
  @Field()
  @Column({ name: "is_active", default: true })
  isActive: boolean;

  /** 이메일 인증 완료 여부. */
  @Field()
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

  /** 마지막 로그인 시각. */
  @Field(() => GraphQLISODateTime, { nullable: true })
  @Column({ name: "last_login", type: "timestamp", nullable: true })
  lastLogin: Date | null;

  /**
   * 토큰 버전. 로그아웃 또는 회원 탈퇴 시 1씩 증가한다.
   * JWT payload의 `tv` 값과 일치하지 않으면 해당 토큰을 무효 처리한다.
   */
  @Column({ name: "token_version", default: 0 })
  tokenVersion: number;

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
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @Column({ name: "custom_fields", type: "simple-json", nullable: true })
  customFields: Record<string, unknown> | null;
}
