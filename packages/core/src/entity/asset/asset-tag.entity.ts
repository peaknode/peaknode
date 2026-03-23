import { Column, Entity, ManyToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Asset } from "./asset.entity";

@Entity("tag")
export class Tag extends BaseEntity {
  @Column({ name: "value", unique: true })
  value: string;

  @ManyToMany(() => Asset, (asset) => asset.tags)
  assets: Asset[];
}
