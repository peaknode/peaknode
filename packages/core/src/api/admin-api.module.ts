import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { ServiceModule } from "src/service/service.module";
import { JsonScalar } from "./scalars/json.scalar";
import { AssetController } from "./resolvers/admin/asset.controller";
import { AssetResolver } from "./resolvers/admin/asset.resolver";
import { ShippingMethodResolver } from "./resolvers/admin/shipping-method.resolver";
import { CustomFieldResolver } from "./resolvers/admin/custom-field.resolver";
import { ProductResolver } from "./resolvers/admin/product.resolver";
import { ProductOptionGroupResolver } from "./resolvers/admin/product-option-group.resolver";
import { ProductVariantResolver } from "./resolvers/admin/product-variant.resolver";
import { UserResolver } from "./resolvers/admin/user.resolver";
import { RoleResolver } from "./resolvers/admin/role.resolver";

/**
 * Admin API 모듈.
 *
 * 관리자용 GraphQL Resolver와 REST Controller를 등록한다.
 * `AppModule`에서 `GraphQLModule`과 함께 import해야 한다.
 *
 * CommonModule을 import해 AdminAuthGuard와 그 의존성(AuthService, TransactionConnection)을
 * 이 모듈 컨텍스트에서 사용할 수 있도록 한다.
 */
@Module({
  imports: [CommonModule, ServiceModule],
  controllers: [AssetController],
  providers: [
    JsonScalar,
    AssetResolver,
    ShippingMethodResolver,
    ProductResolver,
    ProductOptionGroupResolver,
    ProductVariantResolver,
    CustomFieldResolver,
    UserResolver,
    RoleResolver,
  ],
})
export class AdminApiModule {}
