import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { Transactional, TransactionConnection } from "src/common/database";
import { Administrator, AuthenticationMethod, Customer, Role, User } from "src/entity";
import { CustomFieldEntityName } from "src/entity/custom-field/custom-field-definition.entity";
import { CustomFieldsService } from "../custom-field/custom-field.service";
import { CreateAdminUserInput } from "../dto/user/create-admin-user-input.dto";
import { CreateCustomerUserInput } from "../dto/user/create-customer-user-input.dto";

const BCRYPT_SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24시간
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1시간

/**
 * 사용자 계정 생명주기를 관리하는 서비스.
 *
 * - User + Customer / Administrator의 원자적 생성
 * - 이메일 인증 토큰 발급 및 검증
 * - 비밀번호 리셋 / 변경
 * - OAuth 사용자 자동 프로비저닝
 *
 * 비밀번호 검증 및 JWT 발급 로직은 `AuthService`에 위임한다.
 */
@Injectable()
export class UserService {
  constructor(
    protected readonly db: TransactionConnection,
    private readonly customFieldsService: CustomFieldsService,
  ) {}

  // ---------------------------------------------------------------------------
  // 조회
  // ---------------------------------------------------------------------------

  /**
   * ID로 사용자를 조회한다.
   *
   * @param userId - User UUID
   * @returns 사용자 엔터티 또는 undefined
   */
  async findById(userId: string): Promise<User | undefined> {
    return this.db
      .getRepository(User)
      .findOne({ where: { id: userId } })
      .then((r) => r ?? undefined);
  }

  /**
   * identifier로 사용자를 조회한다.
   *
   * @param identifier - 로그인 식별자 (이메일 등)
   * @returns 사용자 엔터티 또는 undefined
   */
  async findByIdentifier(identifier: string): Promise<User | undefined> {
    return this.db
      .getRepository(User)
      .findOne({ where: { identifier } })
      .then((r) => r ?? undefined);
  }

  /**
   * userId로 네이티브(native) AuthenticationMethod를 조회한다.
   *
   * @param userId - User UUID
   * @returns AuthenticationMethod 또는 undefined
   */
  async findNativeAuthMethod(userId: string): Promise<AuthenticationMethod | undefined> {
    return this.db
      .getRepository(AuthenticationMethod)
      .findOne({ where: { userId, strategy: "native" } })
      .then((r) => r ?? undefined);
  }

  /**
   * OAuth 전략 + 외부 식별자로 AuthenticationMethod를 조회한다.
   *
   * @param strategy - OAuth 전략 이름 ('google', 'kakao' 등)
   * @param externalIdentifier - OAuth 공급자 발급 식별자
   * @returns AuthenticationMethod 또는 undefined
   */
  async findOAuthAuthMethod(
    strategy: string,
    externalIdentifier: string,
  ): Promise<AuthenticationMethod | undefined> {
    return this.db
      .getRepository(AuthenticationMethod)
      .findOne({ where: { strategy, externalIdentifier } })
      .then((r) => r ?? undefined);
  }

  // ---------------------------------------------------------------------------
  // 생성
  // ---------------------------------------------------------------------------

  /**
   * 고객 사용자를 생성한다.
   *
   * User + Customer + AuthenticationMethod(native)를 하나의 트랜잭션 안에서 생성한다.
   * 이메일 인증이 필요하므로 verified=false로 시작하며, verificationToken이 발급된다.
   *
   * @param dto - 고객 사용자 생성 데이터
   * @returns 생성된 User 엔터티
   * @throws ConflictException - identifier 또는 emailAddress 중복 시
   */
  @Transactional()
  async createCustomerUser(dto: CreateCustomerUserInput): Promise<User> {
    await this.assertIdentifierUnique(dto.identifier);
    await this.assertCustomerEmailUnique(dto.identifier);

    if (dto.customFields) {
      await this.customFieldsService.validate(CustomFieldEntityName.User, dto.customFields);
    }

    const verificationToken = this.generateToken();
    const verificationTokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    const user = await this.db.getRepository(User).save(
      this.db.getRepository(User).create({
        identifier: dto.identifier,
        isActive: true,
        verified: false,
        verificationToken,
        verificationTokenExpires,
        customFields: dto.customFields ?? null,
      }),
    );

    await this.db.getRepository(Customer).save(
      this.db.getRepository(Customer).create({
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailAddress: dto.identifier,
        phone: dto.phone ?? null,
        isActive: true,
        userId: user.id,
      }),
    );

    await this.db.getRepository(AuthenticationMethod).save(
      this.db.getRepository(AuthenticationMethod).create({
        strategy: "native",
        externalIdentifier: await this.hashPassword(dto.password),
        userId: user.id,
      }),
    );

    return user;
  }

  /**
   * 관리자 사용자를 생성한다.
   *
   * User + Administrator + AuthenticationMethod(native)를 하나의 트랜잭션 안에서 생성한다.
   * 관리자는 이메일 인증 없이 verified=true로 즉시 활성화된다.
   *
   * @param dto - 관리자 사용자 생성 데이터
   * @returns 생성된 User 엔터티
   * @throws ConflictException - identifier 중복 시
   */
  @Transactional()
  async createAdminUser(dto: CreateAdminUserInput): Promise<User> {
    await this.assertIdentifierUnique(dto.identifier);

    if (dto.customFields) {
      await this.customFieldsService.validate(CustomFieldEntityName.User, dto.customFields);
    }

    const user = await this.db.getRepository(User).save(
      this.db.getRepository(User).create({
        identifier: dto.identifier,
        isActive: true,
        verified: true,
        customFields: dto.customFields ?? null,
      }),
    );

    let roles: Role[] = [];
    if (dto.roleIds && dto.roleIds.length > 0) {
      roles = await Promise.all(dto.roleIds.map((id) => this.db.findOneOrFail(Role, id)));
    }

    const administrator = this.db.getRepository(Administrator).create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      emailAddress: dto.emailAddress,
      isActive: true,
      userId: user.id,
      roles,
    });
    await this.db.getRepository(Administrator).save(administrator);

    await this.db.getRepository(AuthenticationMethod).save(
      this.db.getRepository(AuthenticationMethod).create({
        strategy: "native",
        externalIdentifier: await this.hashPassword(dto.password),
        userId: user.id,
      }),
    );

    return user;
  }

  /**
   * OAuth 사용자를 자동 생성한다 (최초 OAuth 로그인 시 호출).
   *
   * User + Customer + AuthenticationMethod(OAuth)를 하나의 트랜잭션 안에서 생성한다.
   * 소셜 로그인은 이메일 인증이 완료된 것으로 간주하여 verified=true로 생성한다.
   *
   * @param strategy - OAuth 전략 이름 ('google', 'kakao' 등)
   * @param externalIdentifier - OAuth 공급자 발급 식별자
   * @param identifier - 이메일 주소
   * @param firstName - 이름
   * @param lastName - 성
   * @param metadata - OAuth 공급자 응답 메타데이터 (선택)
   * @returns 생성된 User 엔터티
   * @throws ConflictException - identifier 중복 시
   */
  @Transactional()
  async createOAuthUser(
    strategy: string,
    externalIdentifier: string,
    identifier: string,
    firstName: string,
    lastName: string,
    metadata?: Record<string, unknown>,
  ): Promise<User> {
    await this.assertIdentifierUnique(identifier);

    const user = await this.db.getRepository(User).save(
      this.db.getRepository(User).create({
        identifier,
        isActive: true,
        verified: true,
      }),
    );

    await this.db.getRepository(Customer).save(
      this.db.getRepository(Customer).create({
        firstName,
        lastName,
        emailAddress: identifier,
        phone: null,
        isActive: true,
        userId: user.id,
      }),
    );

    await this.db.getRepository(AuthenticationMethod).save(
      this.db.getRepository(AuthenticationMethod).create({
        strategy,
        externalIdentifier,
        metadata: metadata ?? null,
        userId: user.id,
      }),
    );

    return user;
  }

  // ---------------------------------------------------------------------------
  // 이메일 인증
  // ---------------------------------------------------------------------------

  /**
   * 이메일 인증 토큰을 검증하고 사용자를 인증 완료 상태로 변경한다.
   *
   * @param token - 이메일 인증 토큰 (User.verificationToken)
   * @returns 인증 완료된 User 엔터티
   * @throws NotFoundException - 토큰에 해당하는 사용자 없음
   * @throws UnauthorizedException - 토큰 만료
   */
  @Transactional()
  async verifyEmail(token: string): Promise<User> {
    const user = await this.db
      .getRepository(User)
      .findOne({ where: { verificationToken: token } })
      .then((r) => r ?? undefined);

    if (!user) {
      throw new NotFoundException("유효하지 않은 인증 토큰입니다.");
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      throw new UnauthorizedException("인증 토큰이 만료되었습니다.");
    }

    user.verified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    return this.db.getRepository(User).save(user);
  }

  // ---------------------------------------------------------------------------
  // 비밀번호 관리
  // ---------------------------------------------------------------------------

  /**
   * 비밀번호 리셋 토큰을 생성하여 저장하고 반환한다.
   *
   * 반환된 토큰을 이메일로 발송하는 것은 이 서비스의 책임 밖이다.
   * 토큰 만료 시간은 1시간이다.
   *
   * @param identifier - 비밀번호를 리셋할 사용자의 identifier
   * @returns 생성된 리셋 토큰
   * @throws NotFoundException - 사용자 없음
   */
  @Transactional()
  async generatePasswordResetToken(identifier: string): Promise<string> {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      throw new NotFoundException(`"${identifier}"에 해당하는 사용자를 찾을 수 없습니다.`);
    }

    const token = this.generateToken();
    user.resetPasswordToken = token;
    user.resetPasswordTokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.db.getRepository(User).save(user);
    return token;
  }

  /**
   * 비밀번호 리셋 토큰을 검증하고 새 비밀번호로 변경한다.
   *
   * @param token - 비밀번호 리셋 토큰
   * @param newPassword - 새 비밀번호 (평문)
   * @throws NotFoundException - 토큰에 해당하는 사용자 없음
   * @throws UnauthorizedException - 토큰 만료
   */
  @Transactional()
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.db
      .getRepository(User)
      .findOne({ where: { resetPasswordToken: token } })
      .then((r) => r ?? undefined);

    if (!user) {
      throw new NotFoundException("유효하지 않은 리셋 토큰입니다.");
    }

    if (user.resetPasswordTokenExpires && user.resetPasswordTokenExpires < new Date()) {
      throw new UnauthorizedException("리셋 토큰이 만료되었습니다.");
    }

    const authMethod = await this.findNativeAuthMethod(user.id);
    if (!authMethod) {
      throw new NotFoundException("네이티브 인증 방식이 등록되어 있지 않습니다.");
    }

    authMethod.externalIdentifier = await this.hashPassword(newPassword);
    await this.db.getRepository(AuthenticationMethod).save(authMethod);

    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await this.db.getRepository(User).save(user);
  }

  /**
   * 현재 비밀번호를 확인한 후 새 비밀번호로 변경한다.
   *
   * @param userId - 비밀번호를 변경할 사용자 ID
   * @param currentPassword - 현재 비밀번호 (평문)
   * @param newPassword - 새 비밀번호 (평문)
   * @throws NotFoundException - 네이티브 인증 방식 없음
   * @throws UnauthorizedException - 현재 비밀번호 불일치
   */
  @Transactional()
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const authMethod = await this.findNativeAuthMethod(userId);
    if (!authMethod) {
      throw new NotFoundException("네이티브 인증 방식이 등록되어 있지 않습니다.");
    }

    const isValid = await bcrypt.compare(currentPassword, authMethod.externalIdentifier);
    if (!isValid) {
      throw new UnauthorizedException("현재 비밀번호가 올바르지 않습니다.");
    }

    authMethod.externalIdentifier = await this.hashPassword(newPassword);
    await this.db.getRepository(AuthenticationMethod).save(authMethod);
  }

  // ---------------------------------------------------------------------------
  // 상태 관리
  // ---------------------------------------------------------------------------

  /**
   * 마지막 로그인 시각을 현재 시각으로 갱신한다.
   *
   * @param userId - 갱신할 사용자 ID
   */
  @Transactional()
  async updateLastLogin(userId: string): Promise<void> {
    await this.db.getRepository(User).update(userId, { lastLogin: new Date() });
  }

  /**
   * 사용자를 비활성화한다 (isActive=false).
   *
   * @param userId - 비활성화할 사용자 ID
   * @returns 비활성화된 User 엔터티
   * @throws NotFoundException - 사용자 없음
   */
  @Transactional()
  async deactivate(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User(id: "${userId}")를 찾을 수 없습니다.`);
    }
    user.isActive = false;
    return this.db.getRepository(User).save(user);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  /**
   * 비밀번호를 bcrypt로 해시한다.
   *
   * @param plain - 평문 비밀번호
   * @returns bcrypt 해시 문자열
   */
  private async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
  }

  /**
   * 암호학적으로 안전한 랜덤 토큰을 생성한다.
   *
   * @returns 64자리 16진수 문자열
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * identifier가 이미 사용 중인지 확인한다.
   *
   * @param identifier - 확인할 식별자
   * @throws ConflictException - 이미 사용 중인 경우
   */
  private async assertIdentifierUnique(identifier: string): Promise<void> {
    const existing = await this.db.getRepository(User).findOne({ where: { identifier } });
    if (existing) {
      throw new ConflictException(`이미 사용 중인 identifier입니다: "${identifier}"`);
    }
  }

  /**
   * Customer 이메일 주소가 이미 사용 중인지 확인한다.
   *
   * @param emailAddress - 확인할 이메일
   * @throws ConflictException - 이미 사용 중인 경우
   */
  private async assertCustomerEmailUnique(emailAddress: string): Promise<void> {
    const existing = await this.db.getRepository(Customer).findOne({ where: { emailAddress } });
    if (existing) {
      throw new ConflictException(`이미 사용 중인 이메일입니다: "${emailAddress}"`);
    }
  }
}
