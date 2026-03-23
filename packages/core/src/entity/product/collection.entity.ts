import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Asset } from "../asset/asset.entity";
import { Product } from "./product.entity";

/**
 * 컬렉션 엔터티.
 *
 * 쇼핑몰의 카테고리/메뉴 계층 구조를 나타낸다.
 * `parent`/`children` 자기 참조 관계로 무한 depth의 계층을 표현할 수 있다.
 *
 * Facet이 검색 필터 목적이라면, Collection은 네비게이션과 상품 목록 페이지 구성에 쓰인다.
 * 예: 패션 > 남성 > 아우터
 *
 * @example
 * // 루트 컬렉션 (isRoot: true)
 * //   └─ 패션 (position: 0)
 * //        ├─ 남성 (position: 0)
 * //        │    ├─ 상의 (position: 0)
 * //        │    └─ 아우터 (position: 1)
 * //        └─ 여성 (position: 1)
 */
@Entity("collection")
export class Collection extends BaseEntity {
  /** 컬렉션 표시명. 예: "남성", "아우터". */
  @Column()
  name: string;

  /**
   * URL에 사용되는 고유 슬러그.
   * 전체 컬렉션에서 고유해야 한다. 예: "mens-outerwear".
   */
  @Column({ unique: true })
  slug: string;

  /** 컬렉션 설명. 목록 페이지 상단 안내 문구 등에 활용한다. null이면 설명 없음. */
  @Column({ type: "text", nullable: true })
  description: string | null;

  /**
   * 최상위 루트 컬렉션 여부.
   * true인 컬렉션은 단 하나만 존재해야 하며, 모든 컬렉션 트리의 시작점이 된다.
   * 일반적으로 UI에 직접 노출하지 않는다.
   */
  @Column({ name: "is_root", default: false })
  isRoot: boolean;

  /**
   * 같은 부모를 가진 형제 컬렉션 간의 표시 순서.
   * 0부터 시작하며 오름차순으로 정렬한다.
   */
  @Column({ type: "int", default: 0 })
  position: number;

  /**
   * 비공개 컬렉션 여부.
   * true이면 쇼핑몰 프론트 네비게이션에 노출되지 않는다.
   * 관리자 전용 임시 그룹이나 프로모션 목적으로 활용한다.
   */
  @Column({ name: "is_private", default: false })
  isPrivate: boolean;

  /**
   * 부모 컬렉션의 ID.
   * null이면 루트 컬렉션의 직속 자식이거나 루트 컬렉션 자신이다.
   */
  @Column({ name: "parent_id", nullable: true })
  parentId: string | null;

  /** 부모 컬렉션. null이면 최상위 수준 컬렉션. */
  @ManyToOne(() => Collection, (c) => c.children, { nullable: true })
  @JoinColumn({ name: "parent_id" })
  parent: Collection | null;

  /** 자식 컬렉션 목록. position 오름차순으로 정렬해 메뉴를 구성한다. */
  @OneToMany(() => Collection, (c) => c.parent)
  children: Collection[];

  /**
   * 컬렉션 대표 이미지 Asset ID.
   * 카테고리 배너나 썸네일로 사용한다. null이면 이미지 미지정.
   */
  @Column({ name: "featured_asset_id", nullable: true })
  featuredAssetId: string | null;

  /** 컬렉션 대표 이미지 Asset. */
  @ManyToOne(() => Asset, { nullable: true })
  @JoinColumn({ name: "featured_asset_id" })
  featuredAsset: Asset | null;

  /**
   * 이 컬렉션에 속한 상품 목록.
   * 조인 테이블: `collection_products`
   */
  @ManyToMany(() => Product, (p) => p.collections)
  @JoinTable({
    name: "collection_products",
    joinColumn: { name: "collection_id" },
    inverseJoinColumn: { name: "product_id" },
  })
  products: Product[];
}
