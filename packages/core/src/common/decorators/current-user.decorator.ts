import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";

/**
 * JWT 인증된 요청에서 현재 사용자 ID를 추출하는 파라미터 데코레이터.
 *
 * JwtAuthGuard가 req.userId에 세팅한 값을 반환한다.
 * 반드시 @UseGuards(JwtAuthGuard)와 함께 사용해야 한다.
 *
 * 사용 예시:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Query(() => User)
 * me(@CurrentUserId() userId: string) {
 *   return this.userService.findById(userId);
 * }
 * ```
 */
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const gqlCtx = GqlExecutionContext.create(ctx);
  return gqlCtx.getContext<{ req: { userId: string } }>().req.userId;
});
