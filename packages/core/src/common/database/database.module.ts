import { Module } from "@nestjs/common";
import { TransactionConnection } from "./transaction-connection";
import { TransactionStore } from "./transaction-store";

/**
 * 데이터베이스 트랜잭션 인프라를 제공하는 NestJS 모듈.
 *
 * 이 모듈을 import하면 `TransactionConnection`과 `TransactionStore`를
 * 주입받아 사용할 수 있다.
 *
 * **사용 조건:** `AppModule`에 `TypeOrmModule.forRoot()`가 먼저 등록되어 있어야 한다.
 * `DataSource`가 이미 NestJS 컨테이너에 등록되어 있다고 가정한다.
 *
 * @example
 * // AppModule에서
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     DatabaseModule,
 *   ],
 * })
 * export class AppModule {}
 *
 * @example
 * // Feature 모듈에서
 * @Module({
 *   imports: [DatabaseModule],
 *   providers: [ProductService],
 * })
 * export class ProductModule {}
 */
@Module({
  providers: [TransactionStore, TransactionConnection],
  exports: [TransactionStore, TransactionConnection],
})
export class DatabaseModule {}
