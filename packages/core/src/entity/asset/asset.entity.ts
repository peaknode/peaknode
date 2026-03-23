import { Column, Entity, Index, JoinTable, ManyToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Tag } from "./asset-tag.entity";

export enum AssetType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  BINARY = "BINARY",
  DOCUMENT = "DOCUMENT",
}

export interface FocalPoint {
  x: number;
  y: number;
}

@Entity("asset")
export class Asset extends BaseEntity {
  @Column({ name: "name" })
  name: string;

  @Index()
  @Column({ name: "type", type: "enum", enum: AssetType })
  type: AssetType;

  @Index()
  @Column({ name: "mime_type" })
  mimeType: string;

  @Column({ name: "file_size", type: "bigint" })
  fileSize: number;

  @Column({ name: "source" })
  source: string;

  @Column({ name: "preview", nullable: true })
  preview: string | null;

  @Column({ name: "width", type: "int", nullable: true })
  width: number | null;

  @Column({ name: "height", type: "int", nullable: true })
  height: number | null;

  @Column({ name: "focal_point", type: "simple-json", nullable: true })
  focalPoint: FocalPoint | null;

  @ManyToMany(() => Tag, (tag) => tag.assets, { cascade: true })
  @JoinTable({
    name: "asset_tags",
    joinColumn: { name: "asset_id" },
    inverseJoinColumn: { name: "tag_id" },
  })
  tags: Tag[];
}
