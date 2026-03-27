import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Administrator } from "src/entity/administrator/administrator.entity";

/**
 * `AdminAuthGuard`가 `req.admin`에 세팅한 `Administrator` 엔터티를 추출하는 파라미터 데코레이터.
 *
 * 반드시 `@UseGuards(AdminAuthGuard)`와 함께 사용해야 한다.
 * Guard가 실행되지 않은 컨텍스트에서는 `undefined`를 반환한다.
 *
 * @example
 * @UseGuards(AdminAuthGuard)
 * @Query(() => String)
 * whoAmI(@CurrentAdmin() admin: Administrator) {
 *   return admin.emailAddress;
 * }
 */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Administrator => {
    const gqlCtx = GqlExecutionContext.create(ctx);
    return gqlCtx.getContext<{ req: { admin: Administrator } }>().req.admin;
  },
);
