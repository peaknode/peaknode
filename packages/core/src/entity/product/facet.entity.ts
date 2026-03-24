import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { FacetValue } from "./facet-value.entity";

/**
 * 패싯(Facet) 엔터티.
 *
 * 상품 필터링에 사용되는 속성 분류를 나타낸다. 예: "브랜드", "소재", "성별".
 * 실제 속성값(나이키, 면 등)은 {@link FacetValue}에서 관리한다.
 *
 * Facet은 Collection과 달리 탐색 계층 구조가 아닌
 * 검색/필터 사이드바에서 조건 선택에 활용된다.
 *
 * @example
 * // Facet: { name: "브랜드", code: "brand" }
 * //   └─ FacetValues: ["나이키", "아디다스", "뉴발란스"]
 * // Facet: { name: "소재", code: "material" }
 * //   └─ FacetValues: ["면", "폴리에스터", "울"]
 */
@ObjectType()
@Entity("facet")
export class Facet extends BaseEntity {
  /** 패싯 표시명. 예: "브랜드", "소재". */
  @Field()
  @Column()
  name: string;

  /**
   * 패싯의 기계 판독용 고유 식별자.
   * 영문 소문자와 하이픈 사용을 권장한다. 예: "brand", "material".
   */
  @Field()
  @Column({ unique: true })
  code: string;

  /**
   * 관리자 전용 패싯 여부.
   * true이면 쇼핑몰 프론트에 노출하지 않고 내부 관리 목적으로만 사용한다.
   */
  @Field()
  @Column({ name: "is_private", default: false })
  isPrivate: boolean;

  /**
   * 이 패싯에 속한 값 목록.
   * cascade가 활성화되어 있으므로 Facet 저장 시 FacetValue도 함께 저장된다.
   */
  @Field(() => [FacetValue])
  @OneToMany(() => FacetValue, (v) => v.facet, { cascade: true })
  values: FacetValue[];
}
