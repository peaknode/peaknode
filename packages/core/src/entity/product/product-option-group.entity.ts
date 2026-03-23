import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Product } from "./product.entity";
import { ProductOption } from "./product-option.entity";

/**
 * 상품 옵션 그룹 엔터티.
 *
 * 하나의 옵션 축(axis)을 나타낸다. 예: "색상", "사이즈".
 * 각 그룹은 하나의 {@link Product}에 속하며,
 * 그룹 내 실제 값(빨강, S 등)은 {@link ProductOption}으로 관리한다.
 *
 * @example
 * // Product: "반팔 티셔츠"
 * // OptionGroup: { name: "색상", code: "color" }
 * //   └─ Options: [{ name: "흰색", code: "white" }, { name: "검정", code: "black" }]
 * // OptionGroup: { name: "사이즈", code: "size" }
 * //   └─ Options: [{ name: "S", code: "s" }, { name: "M", code: "m" }]
 */
@Entity("product_option_group")
export class ProductOptionGroup extends BaseEntity {
  /** 옵션 그룹 표시명. 예: "색상", "사이즈". */
  @Column()
  name: string;

  /**
   * 옵션 그룹의 기계 판독용 식별자.
   * 영문 소문자와 하이픈 사용을 권장한다. 예: "color", "shoe-size".
   */
  @Column()
  code: string;

  /** 소속 Product의 ID. */
  @Column({ name: "product_id" })
  productId: string;

  /** 소속 Product. */
  @ManyToOne(() => Product, (p) => p.optionGroups)
  @JoinColumn({ name: "product_id" })
  product: Product;

  /**
   * 이 그룹에 속한 옵션 값 목록.
   * cascade가 활성화되어 있으므로 그룹 저장 시 옵션도 함께 저장된다.
   */
  @OneToMany(() => ProductOption, (o) => o.group, { cascade: true })
  options: ProductOption[];
}
