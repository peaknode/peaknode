import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Customer } from "../customer/customer.entity";
import { WishlistItem } from "./wishlist-item.entity";

/**
 * 위시리스트 엔터티.
 *
 * 고객 1인당 하나의 위시리스트를 가진다.
 * 서비스 레이어에서 Customer 생성 시 함께 생성하거나,
 * 첫 아이템 추가 시 lazy하게 생성한다.
 */
@ObjectType()
@Entity("wishlist")
export class Wishlist extends BaseEntity {
  /** 위시리스트 소유 고객의 ID. */
  @Field()
  @Column({ name: "customer_id" })
  customerId: string;

  /** 위시리스트 소유 고객. */
  @Index({ unique: true })
  @ManyToOne(() => Customer)
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  /**
   * 위시리스트에 담긴 아이템 목록.
   * cascade가 활성화되어 있으므로 Wishlist 삭제 시 WishlistItem도 함께 삭제된다.
   */
  @Field(() => [WishlistItem])
  @OneToMany(() => WishlistItem, (item) => item.wishlist, { cascade: true })
  items: WishlistItem[];
}
