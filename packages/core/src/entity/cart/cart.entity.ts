import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Customer } from "../customer/customer.entity";
import { CartItem } from "./cart-item.entity";

/**
 * 장바구니 엔터티.
 *
 * 회원과 비회원 모두의 장바구니를 관리한다.
 * 비회원은 `token`으로 식별하며, 로그인 시 `customerId`를 연결해 장바구니를 유지한다.
 *
 * 결제(체크아웃) 시 Cart의 CartItem들을 Order + OrderLine으로 변환한 후 Cart를 삭제한다.
 *
 * @example
 * // 비회원 플로우:
 * // 1. 첫 방문 시 token 발급 → Cart 생성
 * // 2. 로그인 시 Cart.customerId 연결 (또는 기존 Cart와 병합)
 * // 3. 결제 시 Cart → Order 변환 후 Cart 삭제
 */
@Entity("cart")
export class Cart extends BaseEntity {
  /**
   * 장바구니 고유 식별 토큰.
   * 브라우저 쿠키/localStorage에 저장해 비회원 장바구니를 식별한다.
   * UUID v4 형식을 권장한다.
   */
  @Column({ unique: true })
  token: string;

  /**
   * 장바구니 소유 고객의 ID.
   * null이면 비회원(게스트) 장바구니.
   * 로그인 시 token으로 찾은 Cart에 customerId를 설정해 회원 장바구니로 전환한다.
   */
  @Column({ name: "customer_id", nullable: true })
  customerId: string | null;

  /**
   * 장바구니 소유 고객.
   * null이면 비회원 장바구니.
   */
  @Index()
  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: "customer_id" })
  customer: Customer | null;

  /**
   * 장바구니에 담긴 아이템 목록.
   * cascade가 활성화되어 있으므로 Cart 저장/삭제 시 CartItem도 함께 처리된다.
   */
  @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
  items: CartItem[];
}
