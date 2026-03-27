import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthService } from "src/service/auth/auth.service";

/**
 * JWT 액세스 토큰을 검증하는 GraphQL 가드.
 *
 * `Authorization: Bearer <token>` 헤더에서 토큰을 추출하여 AuthService.validateAccessToken()으로
 * 유효성 및 tokenVersion을 검증한다. 통과하면 GQL context의 req에 userId를 세팅한다.
 *
 * 사용 예시:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Query(() => User)
 * me(@CurrentUserId() userId: string) { ... }
 * ```
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  /**
   * 요청의 JWT 토큰을 검증하고 userId를 request 객체에 주입한다.
   *
   * @param context - NestJS 실행 컨텍스트
   * @returns 인증 통과 여부
   * @throws UnauthorizedException - 토큰 없음 / 유효하지 않음
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext<{ req: { headers: Record<string, string>; userId?: string } }>().req;

    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("인증 토큰이 필요합니다.");
    }

    const token = authHeader.slice(7);
    req.userId = await this.authService.validateAccessToken(token);
    return true;
  }
}
