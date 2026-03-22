import { Column, Entity, ManyToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Administrator } from "./administrator.entity";

@Entity("role")
export class Role extends BaseEntity {
  @Column({ unique: true })
  code: string;

  @Column()
  description: string;

  // e.g. ['order:read', 'product:create']
  // '__superadmin__' = 모든 권한 bypass
  @Column({ type: "simple-json" })
  permissions: string[];

  @ManyToMany(() => Administrator, (a) => a.roles)
  administrators: Administrator[];
}
