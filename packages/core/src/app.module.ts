import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { AdminApiModule } from "./api/admin-api.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./common/database";
import { ServiceModule } from "./service/service.module";

/**
 * 애플리케이션 루트 모듈.
 *
 * - TypeORM: MySQL 연결 (docker-compose 기준 localhost:33061)
 * - GraphQL: Code-first, Admin API path `/admin-api`
 * - DatabaseModule: AsyncLocalStorage 기반 트랜잭션 인프라
 * - ServiceModule: 비즈니스 서비스 레이어
 * - AdminApiModule: 관리자용 GraphQL Resolver
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "mysql",
      host: "localhost",
      port: 33061,
      username: "dev-peaknode",
      password: "dev-peaknode",
      database: "dev-peaknode",
      entities: [join(__dirname, "/entity/**/*.entity{.ts,.js}")],
      synchronize: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"),
      sortSchema: true,
      path: "/admin-api",
      formatError: (error) => ({
        message: error.message,
        code: error.extensions?.code,
        statusCode: (error.extensions?.originalError as any)?.statusCode,
      }),
    }),
    DatabaseModule,
    ServiceModule,
    AdminApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
