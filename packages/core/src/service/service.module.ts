import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "src/common/database";
import { AuthService } from "./auth/auth.service";
import { CustomFieldsService } from "./custom-field/custom-field.service";
import { ProductOptionGroupService } from "./product/product-option-group.service";
import { ProductVariantService } from "./product/product-variant.service";
import { ProductService } from "./product/product.service";
import { UserService } from "./user/user.service";

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
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  providers: [
    ProductService,
    ProductVariantService,
    ProductOptionGroupService,
    CustomFieldsService,
    UserService,
    AuthService,
  ],
  exports: [
    ProductService,
    ProductVariantService,
    ProductOptionGroupService,
    CustomFieldsService,
    UserService,
    AuthService,
  ],
})
export class ServiceModule { }
