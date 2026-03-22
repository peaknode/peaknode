import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { User } from "./user.entity";

@Entity("authentication_method")
export class AuthenticationMethod extends BaseEntity {
  // 'native' | 'google' | 'kakao' | ... (플러그인이 자유롭게 등록)
  @Column()
  strategy: string;

  // native: bcrypt hash, OAuth: provider의 sub/id
  @Column({ name: "external_identifier", nullable: true })
  externalIdentifier: string | null;

  // OAuth provider 응답 메타데이터 (선택적)
  @Column({ name: "metadata", type: "simple-json", nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, (u) => u.authenticationMethods)
  @JoinColumn({ name: "user_id" })
  user: User;
}
