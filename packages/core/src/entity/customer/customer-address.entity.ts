import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Customer } from "./customer.entity";

@Entity("customer_address")
export class CustomerAddress extends BaseEntity {
  @Column({ name: "customer_id" })
  customerId: string;

  @ManyToOne(() => Customer, (c) => c.addresses)
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  // 수령인 이름 (고객명과 다를 수 있음 — 선물 배송 등)
  @Column({ name: "full_name" })
  fullName: string;

  @Column({ nullable: true })
  company: string | null;

  @Column({ name: "street_line1" })
  streetLine1: string;

  @Column({ name: "street_line2", nullable: true })
  streetLine2: string | null;

  @Column()
  city: string;

  @Column({ nullable: true })
  province: string | null;

  @Column({ name: "postal_code" })
  postalCode: string;

  // ISO 3166-1 alpha-2 e.g. 'KR', 'US'
  @Column({ name: "country_code", length: 2 })
  countryCode: string;

  @Column({ nullable: true })
  phone: string | null;

  @Column({ name: "is_default_shipping", default: false })
  isDefaultShipping: boolean;

  @Column({ name: "is_default_billing", default: false })
  isDefaultBilling: boolean;
}
