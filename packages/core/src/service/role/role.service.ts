import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import { Role } from "src/entity/administrator/role.entity";
import { CreateRoleInput } from "../dto/role/create-role.dto";
import { UpdateRoleInput } from "../dto/role/update-role.dto";

/**
 * 역할(Role) 도메인의 CRUD 비즈니스 로직을 담당하는 서비스.
 *
 * 역할은 `Administrator`에 M:N으로 연결되며 `permissions` 배열로 권한을 관리한다.
 * `code`는 생성 후 변경 불가 — 외부에서 code로 역할을 참조하는 경우를 위해 안정적인 식별자로 유지한다.
 */
@Injectable()
export class RoleService {
  constructor(protected readonly db: TransactionConnection) {}

  // ── 조회 ──────────────────────────────────────────────────────────────────

  /**
   * 역할 목록을 전체 조회한다.
   *
   * 역할은 구성 데이터이므로 페이지네이션 없이 전체를 반환한다.
   *
   * @returns items: 역할 배열 (생성일 오름차순), total: 전체 역할 수
   */
  async findAll(): Promise<{ items: Role[]; total: number }> {
    const [items, total] = await this.db
      .getRepository(Role)
      .findAndCount({ order: { createdAt: "ASC" } });
    return { items, total };
  }

  /**
   * ID로 역할 단건을 조회한다.
   *
   * @param id - Role UUID
   * @returns Role 엔터티
   * @throws NotFoundException - 해당 ID의 역할이 없을 때
   */
  async findById(id: string): Promise<Role> {
    return this.db.findOneOrFail(Role, id);
  }

  // ── 생성 / 수정 / 삭제 ────────────────────────────────────────────────────

  /**
   * 새 역할을 생성한다.
   *
   * @param dto - 역할 생성 데이터
   * @returns 생성된 Role 엔터티
   * @throws ConflictException - code가 이미 사용 중일 때
   */
  @Transactional()
  async create(dto: CreateRoleInput): Promise<Role> {
    const existing = await this.db
      .getRepository(Role)
      .findOne({ where: { code: dto.code } });

    if (existing) {
      throw new ConflictException(`code "${dto.code}"은 이미 사용 중입니다.`);
    }

    const role = this.db.getRepository(Role).create({
      code: dto.code,
      description: dto.description,
      permissions: dto.permissions,
    });
    return this.db.getRepository(Role).save(role);
  }

  /**
   * 역할 정보를 수정한다.
   *
   * `description`과 `permissions`만 변경 가능하다. `code`는 불변이다.
   *
   * @param id - 수정할 Role UUID
   * @param dto - 수정할 데이터 (undefined 필드는 기존 값 유지)
   * @returns 수정된 Role 엔터티
   * @throws NotFoundException - 해당 ID의 역할이 없을 때
   */
  @Transactional()
  async update(id: string, dto: UpdateRoleInput): Promise<Role> {
    const role = await this.findById(id);
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions !== undefined) role.permissions = dto.permissions;
    return this.db.getRepository(Role).save(role);
  }

  /**
   * 역할을 삭제한다.
   *
   * 역할은 구성 데이터이므로 소프트 딜리트 없이 영구 삭제한다.
   * Administrator에 할당된 경우 M:N join table 레코드도 함께 삭제된다.
   *
   * @param id - 삭제할 Role UUID
   * @throws NotFoundException - 해당 ID의 역할이 없을 때
   */
  @Transactional()
  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    await this.db.getRepository(Role).remove(role);
  }
}
