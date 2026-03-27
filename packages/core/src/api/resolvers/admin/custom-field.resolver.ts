import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import {
  CustomFieldDefinition,
  CustomFieldEntityName,
} from "src/entity/custom-field/custom-field-definition.entity";
import { CreateCustomFieldDefinitionDto } from "src/service/dto/custom-field/create-custom-field-definition.dto";
import { UpdateCustomFieldDefinitionDto } from "src/service/dto/custom-field/update-custom-field-definition.dto";
import { CustomFieldsService } from "src/service/custom-field/custom-field.service";
import { AdminAuthGuard } from "src/common/guards/admin-auth.guard";
import { RequirePermissions } from "src/common/decorators/require-permissions.decorator";
import { Permission } from "src/common/permissions/permission.enum";

/**
 * 커스텀 필드 정의 관리 Resolver (관리자 API).
 *
 * 엔터티별 커스텀 필드 정의의 CRUD를 제공한다.
 * 모든 요청은 `AdminAuthGuard`로 보호되며 메서드별 `@RequirePermissions()`로 권한을 세분화한다.
 * 정의된 커스텀 필드는 해당 엔터티 생성/수정 시 `customFields` 입력 필드에서 사용된다.
 */
@UseGuards(AdminAuthGuard)
@Resolver(() => CustomFieldDefinition)
export class CustomFieldResolver {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * 특정 엔터티의 커스텀 필드 정의 목록을 조회한다.
   *
   * @param entityName - 조회할 엔터티 이름
   * @returns 정의 배열
   */
  @RequirePermissions(Permission.CustomFieldRead)
  @Query(() => [CustomFieldDefinition], { name: "customFieldDefinitions" })
  findAll(
    @Args("entityName", { type: () => CustomFieldEntityName })
    entityName: CustomFieldEntityName,
  ): Promise<CustomFieldDefinition[]> {
    return this.customFieldsService.findAll(entityName);
  }

  /**
   * ID로 커스텀 필드 정의 단건을 조회한다.
   *
   * @param id - CustomFieldDefinition UUID
   * @returns 정의 엔터티
   */
  @RequirePermissions(Permission.CustomFieldRead)
  @Query(() => CustomFieldDefinition, { name: "customFieldDefinition" })
  findOne(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<CustomFieldDefinition> {
    return this.customFieldsService.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /**
   * 새 커스텀 필드 정의를 생성한다.
   *
   * @param input - 생성 데이터
   * @returns 생성된 정의 엔터티
   */
  @RequirePermissions(Permission.CustomFieldCreate)
  @Mutation(() => CustomFieldDefinition, { name: "createCustomFieldDefinition" })
  create(
    @Args("input") input: CreateCustomFieldDefinitionDto,
  ): Promise<CustomFieldDefinition> {
    return this.customFieldsService.create(input);
  }

  /**
   * 커스텀 필드 정의를 수정한다.
   *
   * @param id - 수정할 정의 UUID
   * @param input - 수정 데이터
   * @returns 수정된 정의 엔터티
   */
  @RequirePermissions(Permission.CustomFieldUpdate)
  @Mutation(() => CustomFieldDefinition, { name: "updateCustomFieldDefinition" })
  update(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") input: UpdateCustomFieldDefinitionDto,
  ): Promise<CustomFieldDefinition> {
    return this.customFieldsService.update(id, input);
  }

  /**
   * 커스텀 필드 정의를 삭제한다.
   *
   * @param id - 삭제할 정의 UUID
   * @returns 성공 여부
   */
  @RequirePermissions(Permission.CustomFieldDelete)
  @Mutation(() => Boolean, { name: "deleteCustomFieldDefinition" })
  async delete(
    @Args("id", { type: () => ID }) id: string,
  ): Promise<boolean> {
    await this.customFieldsService.delete(id);
    return true;
  }
}
