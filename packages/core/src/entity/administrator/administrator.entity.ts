import { Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { User } from "../user/user.entity";
import { Role } from "./role.entity";

@Entity("administrator")
export class Administrator extends BaseEntity {
  @Column({ name: "first_name" })
  firstName: string;

  @Column({ name: "last_name" })
  lastName: string;

  @Column({ name: "email_address" })
  emailAddress: string;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "user_id" })
  userId: string;

  @OneToOne(() => User, (u) => u.administrator)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToMany(() => Role, (r) => r.administrators)
  @JoinTable({
    name: "administrator_roles",
    joinColumn: { name: "administrator_id" },
    inverseJoinColumn: { name: "role_id" },
  })
  roles: Role[];
}
