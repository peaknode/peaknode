import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../base/base.entity";
import { Order } from "./order.entity";

/**
 * 결제 상태 열거형.
 *
 * PG사(결제대행사) 연동 플로우에 맞춰 설계되었다.
 * AUTHORIZED → SETTLED 흐름은 선승인 후 청구 방식(카드 결제 등)에 해당한다.
 */
export enum PaymentState {
  /** 결제 시도 전. Payment 레코드가 생성된 초기 상태. */
  PENDING = "PENDING",
  /** PG사로부터 승인됨. 아직 실제 청구(정산)는 완료되지 않은 상태. */
  AUTHORIZED = "AUTHORIZED",
  /** 청구(정산) 완료. 실제 결제가 이루어진 상태. */
  SETTLED = "SETTLED",
  /** PG사로부터 거절됨. 잔액 부족, 한도 초과 등. */
  DECLINED = "DECLINED",
  /** 결제 취소됨. */
  CANCELLED = "CANCELLED",
  /** 환불 완료. */
  REFUNDED = "REFUNDED",
  /** PG사 통신 오류 또는 시스템 오류 발생. */
  ERROR = "ERROR",
}

/**
 * 결제 엔터티.
 *
 * 주문에 연결된 개별 결제 시도를 나타낸다.
 * 하나의 {@link Order}에 여러 Payment가 존재할 수 있다.
 * 예: 결제 실패 후 재시도, 부분 결제(분할 납부).
 *
 * PG사 응답 데이터는 `metadata`에 원본 그대로 보존해 감사 추적에 활용한다.
 */
@Entity("payment")
export class Payment extends BaseEntity {
  /**
   * 결제 수단 식별자.
   * enum 대신 string으로 관리해 PG사 확장이 용이하다.
   * 예: "card", "bank_transfer", "kakao_pay", "naver_pay", "toss".
   */
  @Column()
  method: string;

  /**
   * 결제 금액 (원 단위 정수).
   * Order.total과 다를 수 있다 (부분 결제, 재시도 금액 조정 등).
   */
  @Column({ type: "int" })
  amount: number;

  /**
   * 현재 결제 상태.
   * 상태별 조회(미완료 결제, 환불 등)에 자주 사용되므로 인덱스를 추가한다.
   */
  @Index()
  @Column({ name: "state", type: "enum", enum: PaymentState, default: PaymentState.PENDING })
  state: PaymentState;

  /**
   * PG사에서 발급한 거래 고유 번호.
   * 결제 취소·환불 요청 시 PG사 API에 전달한다.
   * 결제 시도 전(PENDING) 또는 오류 시 null.
   */
  @Column({ name: "transaction_id", nullable: true })
  transactionId: string | null;

  /**
   * 오류 메시지.
   * DECLINED 또는 ERROR 상태일 때 PG사로부터 받은 오류 설명.
   */
  @Column({ name: "error_message", nullable: true })
  errorMessage: string | null;

  /**
   * PG사 응답 원본 데이터.
   * 승인 응답, 오류 응답 등 PG사로부터 받은 전체 데이터를 보관한다.
   * 감사 추적 및 이슈 디버깅에 활용한다.
   */
  @Column({ type: "simple-json", nullable: true })
  metadata: Record<string, unknown> | null;

  /** 소속 Order의 ID. */
  @Column({ name: "order_id" })
  orderId: string;

  /** 소속 Order. */
  @Index()
  @ManyToOne(() => Order, (o) => o.payments)
  @JoinColumn({ name: "order_id" })
  order: Order;
}
