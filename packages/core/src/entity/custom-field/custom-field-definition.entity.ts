import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Column, Entity, Index, Unique } from "typeorm";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";
import { BaseEntity } from "../base/base.entity";

/**
 * 커스텀 필드를 추가할 수 있는 엔터티 종류.
 */
export enum CustomFieldEntityName {
  Product = "Product",
  Customer = "Customer",
  Administrator = "Administrator",
  User = "User",
}

registerEnumType(CustomFieldEntityName, {
  name: "CustomFieldEntityName",
  description: "커스텀 필드를 추가할 수 있는 엔터티 종류",
});

/**
 * 커스텀 필드의 데이터 타입.
 */
export enum CustomFieldType {
  String = "string",
  Int = "int",
  Float = "float",
  Boolean = "boolean",
  Datetime = "datetime",
  Text = "text",
}

registerEnumType(CustomFieldType, {
  name: "CustomFieldType",
  description: "커스텀 필드의 데이터 타입",
});

/**
 * 관리자가 엔터티에 추가하는 커스텀 필드 정의 엔터티.
 *
 * 동일 엔터티(`entityName`) 내에서 `name`은 고유해야 한다.
 * 저장된 정의에 따라 각 엔터티의 `customFields` JSON 컬럼 값을 검증한다.
 *
 * @example
 * // Product에 "warranty_period" (string) 커스텀 필드 추가
 * { entityName: "Product", name: "warranty_period", type: "string", required: false }
 */
@ObjectType()
@Entity("custom_field_definition")
@Unique(["entityName", "name"])
export class CustomFieldDefinition extends BaseEntity {
  /**
   * 커스텀 필드가 속할 엔터티 이름.
   * 자주 필터링되므로 인덱스를 추가한다.
   */
  @Field(() => CustomFieldEntityName)
  @Index()
  @Column({ name: "entity_name" })
  entityName: CustomFieldEntityName;

  /**
   * 필드 키 이름 (snake_case 권장).
   * `customFields` 객체의 키로 사용된다.
   * @example "warranty_period"
   */
  @Field()
  @Column()
  name: string;

  /** 필드 데이터 타입. 생성 후 변경 불가. */
  @Field(() => CustomFieldType)
  @Column()
  type: CustomFieldType;

  /**
   * UI 표시용 레이블.
   * null이면 `name`을 그대로 표시한다.
   */
  @Field({ nullable: true })
  @Column({ nullable: true })
  label: string | null;

  /**
   * 필수 여부.
   * true이면 해당 엔터티 생성/수정 시 반드시 값을 전달해야 한다.
   */
  @Field()
  @Column({ default: false })
  required: boolean;

  /**
   * 배열 여부.
   * true이면 값이 `type`에 해당하는 배열이어야 한다.
   */
  @Field()
  @Column({ default: false })
  list: boolean;

  /**
   * 기본값.
   * 값을 지정하지 않았을 때 사용한다. `type`에 맞는 값이어야 한다.
   * null이면 기본값 없음.
   */
  @Field(() => GraphQLJSONScalar, { nullable: true })
  @Column({ name: "default_value", type: "simple-json", nullable: true })
  defaultValue: unknown | null;
}
