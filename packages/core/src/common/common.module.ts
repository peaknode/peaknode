import { Module } from "@nestjs/common";
import { DatabaseModule } from "./database";
import { AdminAuthGuard, JwtAuthGuard } from "./guards";
import { ServiceModule } from "src/service/service.module";

/**
 * 공통 인프라 모듈.
 *
 * Guard, Interceptor 등 횡단 관심사(cross-cutting concerns)를 제공한다.
 * AuthService(ServiceModule)와 TransactionConnection(DatabaseModule)을 import해
 * AdminAuthGuard/JwtAuthGuard에서 사용할 수 있도록 한다.
 */
@Module({
  imports: [DatabaseModule, ServiceModule],
  providers: [AdminAuthGuard, JwtAuthGuard],
  exports: [AdminAuthGuard, JwtAuthGuard, DatabaseModule, ServiceModule],
})
export class CommonModule {}
