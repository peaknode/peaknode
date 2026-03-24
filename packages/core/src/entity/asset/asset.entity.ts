import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
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

registerEnumType(AssetType, { name: "AssetType" });

/**
 * 이미지 포컬 포인트.
 * Asset 크롭 시 중심점을 나타낸다 (0.0 ~ 1.0 범위).
 */
@ObjectType()
export class FocalPoint {
  /** 수평 위치 */
  @Field()
  x: number;

  /** 수직 위치 */
  @Field()
  y: number;
}

/**
 * Asset(미디어 파일) 엔터티.
 * MinIO에 저장된 이미지, 비디오, 문서 등을 나타낸다.
 * `source` 필드는 MinIO 오브젝트 키이며, URL은 서비스 레이어에서 조합한다.
 */
@ObjectType()
@Entity("asset")
export class Asset extends BaseEntity {
  /** 파일 표시명 */
  @Field()
  @Column({ name: "name" })
  name: string;

  /** 에셋 유형 */
  @Field(() => AssetType)
  @Index()
  @Column({ name: "type", type: "enum", enum: AssetType })
  type: AssetType;

  /** MIME 타입 (예: "image/jpeg") */
  @Field()
  @Index()
  @Column({ name: "mime_type" })
  mimeType: string;

  /** 파일 크기 (바이트) */
  @Field(() => Int)
  @Column({ name: "file_size", type: "bigint" })
  fileSize: number;

  /** MinIO 오브젝트 키. 전체 URL이 아님. */
  @Field()
  @Column({ name: "source" })
  source: string;

  /** 미리보기 이미지 URL 또는 키 (선택) */
  @Field({ nullable: true })
  @Column({ name: "preview", nullable: true })
  preview: string | null;

  /** 이미지 너비 (픽셀) */
  @Field(() => Int, { nullable: true })
  @Column({ name: "width", type: "int", nullable: true })
  width: number | null;

  /** 이미지 높이 (픽셀) */
  @Field(() => Int, { nullable: true })
  @Column({ name: "height", type: "int", nullable: true })
  height: number | null;

  /** 이미지 포컬 포인트 (크롭 중심점) */
  @Field(() => FocalPoint, { nullable: true })
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
