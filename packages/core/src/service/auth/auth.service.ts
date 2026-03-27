import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Transactional, TransactionConnection } from "src/common/database";
import { User } from "src/entity/user/user.entity";
import { AuthResult } from "src/api/types/auth-result.type";
import { OAuthLoginInput } from "../dto/user/oauth-login-input.dto";
import { UserService } from "../user/user.service";

/**
 * 인증 플로우를 담당하는 서비스.
 *
 * - 네이티브 로그인 (identifier + 비밀번호)
 * - OAuth 로그인 / 자동 회원가입
 * - JWT 액세스 토큰 + 리프레시 토큰 발급
 * - 리프레시 토큰으로 액세스 토큰 재발급
 * - 로그아웃 (tokenVersion 증가로 기존 토큰 일괄 무효화)
 *
 * 사용자 계정 CRUD와 비밀번호 해시 관리는 `UserService`에 위임한다.
 */
@Injectable()
export class AuthService {
  constructor(
    protected readonly db: TransactionConnection,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  // ---------------------------------------------------------------------------
  // 로그인
  // ---------------------------------------------------------------------------

  /**
   * 네이티브 로그인을 처리한다.
   *
   * identifier와 비밀번호를 검증한 뒤 JWT 토큰 쌍을 발급한다.
   * 로그인 성공 시 `User.lastLogin`을 현재 시각으로 갱신한다.
   *
   * @param identifier - 로그인 식별자 (User.identifier)
   * @param password - 평문 비밀번호
   * @returns 액세스 토큰, 리프레시 토큰, 사용자 엔터티
   * @throws UnauthorizedException - 식별자 없음 / 비밀번호 불일치 / 비활성 계정
   */
  async login(identifier: string, password: string): Promise<AuthResult> {
    const user = await this.userService.findByIdentifier(identifier);
    if (!user) {
      throw new UnauthorizedException("identifier 또는 비밀번호가 올바르지 않습니다.");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("비활성화된 계정입니다.");
    }

    const authMethod = await this.userService.findNativeAuthMethod(user.id);
    if (!authMethod) {
      throw new UnauthorizedException("네이티브 인증 방식이 등록되어 있지 않습니다.");
    }

    const isValid = await this.verifyPassword(password, authMethod.externalIdentifier);
    if (!isValid) {
      throw new UnauthorizedException("identifier 또는 비밀번호가 올바르지 않습니다.");
    }

    await this.userService.updateLastLogin(user.id);

    return { ...this.issueTokens(user.id, user.tokenVersion), user };
  }

  /**
   * OAuth 로그인 또는 자동 회원가입을 처리한다.
   *
   * 기존 `AuthenticationMethod`가 있으면 로그인, 없으면 User + Customer + AuthenticationMethod를 자동 생성한다.
   * OAuth 사용자는 이메일 인증이 완료된 것으로 간주한다.
   *
   * @param dto - OAuth 로그인 데이터
   * @returns 액세스 토큰, 리프레시 토큰, 사용자 엔터티
   * @throws UnauthorizedException - 비활성 계정
   * @throws Error - 최초 가입 시 identifier/firstName/lastName 미제공
   */
  async loginWithOAuth(dto: OAuthLoginInput): Promise<AuthResult> {
    const existingMethod = await this.userService.findOAuthAuthMethod(
      dto.strategy,
      dto.externalIdentifier,
    );

    let user = existingMethod
      ? await this.userService.findById(existingMethod.userId)
      : undefined;

    if (!user) {
      // 최초 OAuth 로그인: 자동 회원가입
      if (!dto.identifier || !dto.firstName || !dto.lastName) {
        throw new UnauthorizedException(
          "최초 OAuth 로그인 시 identifier, firstName, lastName이 필요합니다.",
        );
      }

      user = await this.userService.createOAuthUser(
        dto.strategy,
        dto.externalIdentifier,
        dto.identifier,
        dto.firstName,
        dto.lastName,
        dto.metadata,
      );
    } else if (!user.isActive) {
      throw new UnauthorizedException("비활성화된 계정입니다.");
    }

    await this.userService.updateLastLogin(user.id);

    return { ...this.issueTokens(user.id, user.tokenVersion), user };
  }

  // ---------------------------------------------------------------------------
  // 토큰 관리
  // ---------------------------------------------------------------------------

  /**
   * 리프레시 토큰을 검증하고 새 액세스 토큰을 발급한다.
   *
   * tokenVersion을 DB와 비교하여 로그아웃 이후 발급된 리프레시 토큰을 거부한다.
   *
   * @param refreshToken - 리프레시 JWT
   * @returns 새 액세스 토큰
   * @throws UnauthorizedException - 토큰 유효하지 않음 / 타입 불일치 / tokenVersion 불일치
   */
  async refreshAccessToken(refreshToken: string): Promise<Pick<AuthResult, "accessToken">> {
    let payload: { sub: string; type: string; tv: number };
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException("유효하지 않은 리프레시 토큰입니다.");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("리프레시 토큰이 아닙니다.");
    }

    const user = await this.userService.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException("만료된 리프레시 토큰입니다.");
    }

    const { accessToken } = this.issueTokens(payload.sub, user.tokenVersion);
    return { accessToken };
  }

  /**
   * 로그아웃을 처리한다.
   *
   * User.tokenVersion을 1 증가시켜 해당 사용자에게 발급된 모든 기존 토큰을 일괄 무효화한다.
   *
   * @param userId - 로그아웃할 사용자 ID
   */
  @Transactional()
  async logout(userId: string): Promise<void> {
    await this.db.getRepository(User).increment({ id: userId }, "tokenVersion", 1);
  }

  /**
   * 액세스 토큰을 검증하고 사용자 ID를 반환한다.
   *
   * JwtAuthGuard에서 호출한다. tokenVersion을 DB와 비교하여
   * 로그아웃/탈퇴 이후 발급된 토큰을 거부한다.
   *
   * @param token - 액세스 JWT
   * @returns 토큰에 담긴 userId
   * @throws UnauthorizedException - 토큰 무효 / 타입 불일치 / tokenVersion 불일치 / 비활성 계정
   */
  async validateAccessToken(token: string): Promise<string> {
    let payload: { sub: string; type: string; tv: number };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }

    if (payload.type !== "access") {
      throw new UnauthorizedException("액세스 토큰이 아닙니다.");
    }

    const user = await this.userService.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException("만료된 토큰입니다.");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("비활성화된 계정입니다.");
    }

    return payload.sub;
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * 평문 비밀번호와 bcrypt 해시를 비교한다.
   *
   * @param plain - 평문 비밀번호
   * @param hash - bcrypt 해시
   * @returns 일치 여부
   */
  private async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * 사용자 ID와 tokenVersion으로 액세스 토큰, 리프레시 토큰을 발급한다.
   *
   * - accessToken: `{ sub, type: 'access', tv: tokenVersion }`, 만료 15분
   * - refreshToken: `{ sub, type: 'refresh', tv: tokenVersion }`, 만료 7일
   *
   * @param userId - User UUID
   * @param tokenVersion - 현재 tokenVersion
   * @returns 토큰 쌍
   */
  private issueTokens(
    userId: string,
    tokenVersion: number,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign(
      { sub: userId, type: "access", tv: tokenVersion },
      { expiresIn: "15m" },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId, type: "refresh", tv: tokenVersion },
      { expiresIn: "7d" },
    );
    return { accessToken, refreshToken };
  }
}
