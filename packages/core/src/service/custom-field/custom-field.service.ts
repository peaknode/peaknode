import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Transactional, TransactionConnection } from "src/common/database";
import {
  CustomFieldDefinition,
  CustomFieldEntityName,
  CustomFieldType,
} from "src/entity/custom-field/custom-field-definition.entity";
import { CreateCustomFieldDefinitionDto } from "../dto/custom-field/create-custom-field-definition.dto";
import { UpdateCustomFieldDefinitionDto } from "../dto/custom-field/update-custom-field-definition.dto";

/**
 * 커스텀 필드 정의 CRUD 및 값 검증을 담당하는 서비스.
 *
 * 각 엔터티(`Product`, `Customer` 등)에 추가할 수 있는 커스텀 필드를 관리하며,
 * 엔터티 저장 시 `customFields` 값이 정의에 부합하는지 검증하는 기능을 제공한다.
 *
 * @example
 * // Product에 커스텀 필드 추가
 * await customFieldsService.create({
 *   entityName: CustomFieldEntityName.Product,
 *   name: 'warranty_period',
 *   type: CustomFieldType.String,
 * });
 *
 * // 값 검증
 * await customFieldsService.validate('Product', { warranty_period: '2년' });
 */
@Injectable()
export class CustomFieldsService {
  constructor(protected readonly db: TransactionConnection) {}

  // ---------------------------------------------------------------------------
  // 조회
  // ---------------------------------------------------------------------------

  /**
   * 특정 엔터티의 커스텀 필드 정의 목록을 조회한다.
   *
   * @param entityName - 대상 엔터티 이름
   * @returns 정의 배열
   */
  async findAll(entityName: CustomFieldEntityName): Promise<CustomFieldDefinition[]> {
    return this.db.getRepository(CustomFieldDefinition).find({
      where: { entityName },
      order: { createdAt: "ASC" },
    });
  }

  /**
   * ID로 커스텀 필드 정의 단건을 조회한다.
   *
   * @param id - CustomFieldDefinition UUID
   * @returns 정의 엔터티
   * @throws NotFoundException
   */
  async findOne(id: string): Promise<CustomFieldDefinition> {
    const definition = await this.db.getRepository(CustomFieldDefinition).findOne({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`CustomFieldDefinition(id: "${id}")를 찾을 수 없습니다.`);
    }
    return definition;
  }

  // ---------------------------------------------------------------------------
  // 생성 / 수정 / 삭제
  // ---------------------------------------------------------------------------

  /**
   * 커스텀 필드 정의를 생성한다.
   *
   * 동일 엔터티 내에서 `name`은 고유해야 한다.
   *
   * @param dto - 생성 데이터
   * @returns 생성된 정의 엔터티
   * @throws ConflictException - 동일 엔터티에 같은 name이 존재하는 경우
   */
  @Transactional()
  async create(dto: CreateCustomFieldDefinitionDto): Promise<CustomFieldDefinition> {
    const existing = await this.db.getRepository(CustomFieldDefinition).findOne({
      where: { entityName: dto.entityName, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(
        `${dto.entityName}에 이미 "${dto.name}" 커스텀 필드가 존재합니다.`,
      );
    }

    const definition = this.db.getRepository(CustomFieldDefinition).create({
      entityName: dto.entityName,
      name: dto.name,
      type: dto.type,
      label: dto.label ?? null,
      required: dto.required ?? false,
      list: dto.list ?? false,
      defaultValue: dto.defaultValue ?? null,
    });

    return this.db.getRepository(CustomFieldDefinition).save(definition);
  }

  /**
   * 커스텀 필드 정의를 수정한다.
   * `entityName`, `name`, `type`은 변경할 수 없다.
   *
   * @param id - 수정할 정의 UUID
   * @param dto - 수정 데이터
   * @returns 수정된 정의 엔터티
   * @throws NotFoundException
   */
  @Transactional()
  async update(id: string, dto: UpdateCustomFieldDefinitionDto): Promise<CustomFieldDefinition> {
    const definition = await this.findOne(id);

    if (dto.label !== undefined) definition.label = dto.label ?? null;
    if (dto.required !== undefined) definition.required = dto.required;
    if (dto.list !== undefined) definition.list = dto.list;
    if (dto.defaultValue !== undefined) definition.defaultValue = dto.defaultValue ?? null;

    return this.db.getRepository(CustomFieldDefinition).save(definition);
  }

  /**
   * 커스텀 필드 정의를 삭제한다.
   *
   * @param id - 삭제할 정의 UUID
   * @throws NotFoundException
   */
  @Transactional()
  async delete(id: string): Promise<void> {
    const definition = await this.findOne(id);
    await this.db.getRepository(CustomFieldDefinition).remove(definition);
  }

  // ---------------------------------------------------------------------------
  // 검증
  // ---------------------------------------------------------------------------

  /**
   * `customFields` 값이 해당 엔터티의 정의에 부합하는지 검증한다.
   *
   * - 미정의 필드 거부 (whitelist)
   * - required 필드 누락 체크
   * - 각 필드 값의 타입 검증
   *
   * @param entityName - 대상 엔터티 이름
   * @param customFields - 검증할 커스텀 필드 값 맵
   * @throws BadRequestException - 검증 실패 시
   */
  async validate(
    entityName: CustomFieldEntityName,
    customFields: Record<string, unknown>,
  ): Promise<void> {
    const definitions = await this.findAll(entityName);
    const allowedKeys = new Set(definitions.map((d) => d.name));

    // 미정의 필드 거부
    for (const key of Object.keys(customFields)) {
      if (!allowedKeys.has(key)) {
        throw new BadRequestException(
          `"${entityName}"에 정의되지 않은 커스텀 필드 "${key}"입니다.`,
        );
      }
    }

    // required 필드 누락 체크
    for (const def of definitions.filter((d) => d.required)) {
      const value = customFields[def.name];
      if (value === undefined || value === null) {
        throw new BadRequestException(
          `커스텀 필드 "${def.name}"은(는) 필수 값입니다.`,
        );
      }
    }

    // 타입 검증
    for (const [key, value] of Object.entries(customFields)) {
      if (value === null || value === undefined) continue;
      const def = definitions.find((d) => d.name === key);
      if (!def) continue;
      this.assertFieldType(key, value, def);
    }
  }

  /**
   * 단일 필드 값의 타입을 검증한다.
   *
   * @param key - 필드 이름
   * @param value - 필드 값
   * @param def - 필드 정의
   * @throws BadRequestException - 타입 불일치 시
   */
  private assertFieldType(key: string, value: unknown, def: CustomFieldDefinition): void {
    if (def.list) {
      if (!Array.isArray(value)) {
        throw new BadRequestException(`커스텀 필드 "${key}"는 배열이어야 합니다.`);
      }
      for (const item of value) {
        this.assertSingleValue(key, item, def.type);
      }
    } else {
      this.assertSingleValue(key, value, def.type);
    }
  }

  /**
   * 단일 원시 값의 타입을 검증한다.
   *
   * @param key - 필드 이름 (에러 메시지용)
   * @param value - 검증할 값
   * @param type - 기대 타입
   * @throws BadRequestException - 타입 불일치 시
   */
  private assertSingleValue(key: string, value: unknown, type: CustomFieldType): void {
    switch (type) {
      case CustomFieldType.String:
      case CustomFieldType.Text:
        if (typeof value !== "string") {
          throw new BadRequestException(`커스텀 필드 "${key}"는 문자열이어야 합니다.`);
        }
        break;
      case CustomFieldType.Int:
        if (!Number.isInteger(value)) {
          throw new BadRequestException(`커스텀 필드 "${key}"는 정수여야 합니다.`);
        }
        break;
      case CustomFieldType.Float:
        if (typeof value !== "number") {
          throw new BadRequestException(`커스텀 필드 "${key}"는 숫자여야 합니다.`);
        }
        break;
      case CustomFieldType.Boolean:
        if (typeof value !== "boolean") {
          throw new BadRequestException(`커스텀 필드 "${key}"는 boolean이어야 합니다.`);
        }
        break;
      case CustomFieldType.Datetime:
        if (typeof value !== "string" || isNaN(Date.parse(value))) {
          throw new BadRequestException(
            `커스텀 필드 "${key}"는 ISO 8601 날짜 문자열이어야 합니다.`,
          );
        }
        break;
    }
  }
}
