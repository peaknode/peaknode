import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";
import { Role } from "src/entity/administrator/role.entity";
import { CreateRoleInput } from "src/service/dto/role/create-role.dto";
import { UpdateRoleInput } from "src/service/dto/role/update-role.dto";
import { RoleService } from "src/service/role/role.service";
import { RoleListResult } from "../../types/role-list-result.type";

/**
 * Admin API — Role GraphQL Resolver.
 *
 * 역할 CRUD를 위한 Query/Mutation을 제공한다.
 * 모든 요청은 `AdminAuthGuard`로 보호되며 메서드별 `@RequirePermissions()`로 권한을 세분화한다.
 *
 * Endpoint: POST /admin-api
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => Role)
export class RoleResolver {
  constructor(private readonly roleService: RoleService) {}

  // ─── Queries ─────────────────────────────────────────────────────────────

  /**
   * 역할 목록을 전체 반환한다.
   *
   * @returns items: 역할 배열 (생성일 오름차순), total: 전체 역할 수
   */
  @RequirePermissions(Permission.RoleRead)
  @Query(() => RoleListResult, { description: "역할 목록 조회" })
  roles(): Promise<RoleListResult> {
    return this.roleService.findAll();
  }

  /**
   * ID로 역할 단건을 조회한다.
   *
   * @param id - Role UUID
   * @returns Role 엔터티
   */
  @RequirePermissions(Permission.RoleRead)
  @Query(() => Role, { description: "ID로 역할 단건 조회" })
  role(@Args("id", { type: () => ID }) id: string): Promise<Role> {
    return this.roleService.findById(id);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────

  /**
   * 새 역할을 생성한다.
   *
   * @param input - 역할 생성 데이터
   * @returns 생성된 Role 엔터티
   */
  @RequirePermissions(Permission.RoleCreate)
  @Mutation(() => Role, { description: "역할 생성" })
  createRole(@Args("input") input: CreateRoleInput): Promise<Role> {
    return this.roleService.create(input);
  }

  /**
   * 역할 정보를 수정한다.
   *
   * @param id - 수정할 Role UUID
   * @param input - 수정 데이터
   * @returns 수정된 Role 엔터티
   */
  @RequirePermissions(Permission.RoleUpdate)
  @Mutation(() => Role, { description: "역할 수정" })
  updateRole(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateRoleInput,
  ): Promise<Role> {
    return this.roleService.update(id, input);
  }

  /**
   * 역할을 삭제한다.
   *
   * @param id - 삭제할 Role UUID
   * @returns 삭제 성공 여부
   */
  @RequirePermissions(Permission.RoleDelete)
  @Mutation(() => Boolean, { description: "역할 삭제" })
  async deleteRole(@Args("id", { type: () => ID }) id: string): Promise<boolean> {
    await this.roleService.delete(id);
    return true;
  }
}
