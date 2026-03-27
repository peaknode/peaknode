import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthService } from "src/service/auth/auth.service";
import { TransactionConnection } from "src/common/database";
import { Administrator } from "src/entity/administrator/administrator.entity";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { Permission, SUPERADMIN_PERMISSION } from "../permissions/permission.enum";

/**
 * Admin API 전용 인증·권한 가드.
 *
 * 다음 세 단계를 순서대로 수행한다:
 * 1. **JWT 검증** — `Authorization: Bearer <token>` 헤더에서 토큰을 추출하고
 *    `AuthService.validateAccessToken()`으로 유효성을 검증한다.
 * 2. **관리자 확인** — 해당 userId로 활성 상태의 `Administrator`를 조회한다.
 *    관리자가 아니면 `ForbiddenException`을 던진다.
 *    통과 시 `req.userId`와 `req.admin`을 설정한다.
 * 3. **권한 확인** — `@RequirePermissions()` 메타데이터를 읽어 필요한 권한을 검사한다.
 *    - 메타데이터 없음 → 관리자이기만 하면 통과
 *    - `__superadmin__` 포함 역할 → 모든 권한 bypass
 *    - 필요한 권한이 모두 있으면 통과, 하나라도 없으면 `ForbiddenException`
 *
 * @example
 * // 클래스 전체 보호 — 모든 메서드에 관리자 인증 적용
 * @UseGuards(AdminAuthGuard)
 * @Resolver(() => Product)
 * export class ProductResolver { ... }
 *
 * // 메서드별 권한 지정
 * @RequirePermissions(Permission.ProductCreate)
 * @Mutation(() => Product)
 * createProduct(...) {}
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly db: TransactionConnection,
    private readonly reflector: Reflector,
  ) {}

  /**
   * JWT 검증 → Administrator 확인 → 권한 검사를 순차적으로 수행한다.
   *
   * @param context - NestJS 실행 컨텍스트
   * @returns 인증·권한 통과 여부
   * @throws UnauthorizedException - 토큰 없음 / 유효하지 않음
   * @throws ForbiddenException - 관리자 아님 / 권한 부족
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext<{
      req: {
        headers: Record<string, string>;
        userId?: string;
        admin?: Administrator;
      };
    }>().req;

    // ── 1. JWT 검증 ─────────────────────────────────────────────────────────
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("인증 토큰이 필요합니다.");
    }

    const token = authHeader.slice(7);
    const userId = await this.authService.validateAccessToken(token);

    // ── 2. Administrator 확인 ────────────────────────────────────────────────
    const admin = await this.db.getRepository(Administrator).findOne({
      where: { userId, isActive: true },
      relations: ["roles"],
    });

    if (!admin) {
      throw new ForbiddenException("관리자 권한이 필요합니다.");
    }

    req.userId = userId;
    req.admin = admin;

    // ── 3. 권한 확인 ─────────────────────────────────────────────────────────
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true; // @RequirePermissions 미지정 = 관리자이기만 하면 통과
    }

    const allPermissions = admin.roles.flatMap((role) => role.permissions);

    if (allPermissions.includes(SUPERADMIN_PERMISSION)) {
      return true; // 슈퍼관리자는 모든 권한 bypass
    }

    const hasAll = required.every((p) => allPermissions.includes(p));
    if (!hasAll) {
      throw new ForbiddenException("해당 작업에 대한 권한이 없습니다.");
    }

    return true;
  }
}
