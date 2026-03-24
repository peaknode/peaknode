import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { ProductOptionGroup } from "./product-option-group.entity";
import { ProductVariant } from "./product-variant.entity";

/**
 * 상품 옵션 값 엔터티.
 *
 * {@link ProductOptionGroup}에 속하는 개별 옵션 값을 나타낸다.
 * 예: 그룹 "색상"의 값 "흰색", 그룹 "사이즈"의 값 "S".
 *
 * ProductVariant는 각 OptionGroup에서 하나씩 옵션을 선택해 구성된다.
 * 예: Variant "흰색/S" → options: [ProductOption("흰색"), ProductOption("S")]
 */
@ObjectType()
@Entity("product_option")
export class ProductOption extends BaseEntity {
  /** 옵션 값 표시명. 예: "흰색", "S", "XL". */
  @Field()
  @Column()
  name: string;

  /**
   * 옵션 값의 기계 판독용 식별자.
   * 영문 소문자와 하이픈 사용을 권장한다. 예: "white", "s", "xl".
   */
  @Field()
  @Column()
  code: string;

  /** 소속 옵션 그룹의 ID. */
  @Field(() => ID)
  @Column({ name: "group_id" })
  groupId: string;

  /** 소속 옵션 그룹. */
  @ManyToOne(() => ProductOptionGroup, (g) => g.options)
  @JoinColumn({ name: "group_id" })
  group: ProductOptionGroup;

  /**
   * 이 옵션 값을 사용하는 ProductVariant 목록.
   * JoinTable 소유권은 {@link ProductVariant} 쪽에 있다.
   * GraphQL에서는 역참조이므로 노출하지 않는다.
   */
  @ManyToMany(() => ProductVariant, (v) => v.options)
  productVariants: ProductVariant[];
}
