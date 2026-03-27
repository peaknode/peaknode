import { Module } from "@nestjs/common";
import { CommonModule } from "src/common/common.module";
import { ServiceModule } from "src/service/service.module";
import { ShopAuthResolver } from "./resolvers/shop/shop-auth.resolver";
import { ShopUserResolver } from "./resolvers/shop/shop-user.resolver";

/**
 * Shop API 모듈.
 *
 * 고객용 GraphQL Resolver를 등록한다.
 * JsonScalar는 AdminApiModule에서 전역 등록되므로 중복 등록하지 않는다.
 */
@Module({
  imports: [CommonModule, ServiceModule],
  providers: [ShopAuthResolver, ShopUserResolver],
})
export class ShopApiModule {}
