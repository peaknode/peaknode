import { Field, ObjectType } from "@nestjs/graphql";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Customer } from "../customer";
import { BaseEntity } from "../base/base.entity";

/**
 * 고객 배송지 주소 엔터티.
 *
 * 고객이 저장해둔 배송지 목록을 관리한다.
 * `defaultAddress=true`인 주소는 1개만 존재해야 하며,
 * 서비스 레이어에서 기존 default를 해제한 후 새로 설정한다.
 */
@ObjectType()
@Entity("address")
export class Address extends BaseEntity {
  /** 수령인 이름. */
  @Field()
  @Column()
  fullName: string;

  /** 소속 고객의 ID. */
  @Field()
  @Column({ name: "customer_id" })
  customerId: string;

  /** 소속 고객. */
  @Index()
  @ManyToOne(() => Customer, (c) => c.addresses)
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  /** 도로명 주소 또는 지번 주소. */
  @Field()
  @Column()
  addressLine1: string;

  /** 상세 주소 (동/호수 등). */
  @Field()
  @Column()
  addressLine2: string;

  /** 수령인 연락처. */
  @Field()
  @Column()
  phoneNumber: string;

  /** 우편번호. */
  @Field()
  @Column()
  postalCode: string;

  /**
   * 기본 배송지 여부.
   * true인 주소는 고객당 1개만 존재해야 한다.
   * 체크아웃 시 기본 배송지를 자동 선택하는 데 사용한다.
   */
  @Field()
  @Column({ name: "default_address", default: false })
  defaultAddress: boolean;
}
