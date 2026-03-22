import { BaseEntity, Column, Entity, Index, ManyToOne } from "typeorm";
import { Customer } from "../customer";

@Entity('address')
export class Address extends BaseEntity {
  @Column()
  fullName: string;

  @Index()
  @ManyToOne(() => Customer, (c) => c.addresses)
  customer: Customer;

  @Column()
  addressLine1: string;

  @Column()
  addressLine2: string;

  @Column()
  phoneNumber: string;

  @Column()
  postalCode: string;

  @Column({ default: false })
  defaultAddress: boolean;

}
