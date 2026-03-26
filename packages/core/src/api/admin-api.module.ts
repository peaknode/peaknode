import { Module } from "@nestjs/common";
import { ServiceModule } from "src/service/service.module";
import { JsonScalar } from "./scalars/json.scalar";
import { CustomFieldResolver } from "./resolvers/admin/custom-field.resolver";
import { ProductResolver } from "./resolvers/admin/product.resolver";
import { UserResolver } from "./resolvers/admin/user.resolver";

/**
 * Admin API 모듈.
 *
 * 관리자용 GraphQL Resolver를 등록한다.
 * `AppModule`에서 `GraphQLModule`과 함께 import해야 한다.
 */
@Module({
  imports: [ServiceModule],
  providers: [JsonScalar, ProductResolver, CustomFieldResolver, UserResolver],
})
export class AdminApiModule {}
