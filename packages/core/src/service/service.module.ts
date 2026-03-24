import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/common/database";
import { ProductOptionGroupService } from "./product-option-group.service";
import { ProductVariantService } from "./product-variant.service";
import { ProductService } from "./product.service";

/**
 * 서비스 레이어를 묶는 NestJS 모듈.
 *
 * `AppModule`에서 이 모듈을 import하면 모든 서비스를 주입받을 수 있다.
 *
 * **사용 조건:** `TypeOrmModule.forRoot()`와 `DatabaseModule`이 먼저 등록되어 있어야 한다.
 *
 * @example
 * // AppModule에서
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({ ... }),
 *     DatabaseModule,
 *     ServiceModule,
 *   ],
 * })
 * export class AppModule {}
 */
@Module({
  imports: [DatabaseModule],
  providers: [ProductService, ProductVariantService, ProductOptionGroupService],
  exports: [ProductService, ProductVariantService, ProductOptionGroupService],
})
export class ServiceModule {}
