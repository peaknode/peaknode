/**
 * 데이터베이스 인프라 모듈의 공개 API 배럴 익스포트.
 *
 * @example
 * import { TransactionConnection, Transactional, DatabaseModule } from 'src/common/database';
 */
export { DatabaseModule } from "./database.module";
export { Transactional } from "./transactional.decorator";
export type { TransactionalOptions } from "./transactional.decorator";
export { TransactionConnection } from "./transaction-connection";
export { TransactionStore } from "./transaction-store";
