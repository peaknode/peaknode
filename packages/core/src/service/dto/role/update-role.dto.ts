import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * 역할 수정 Input DTO.
 *
 * `code`는 생성 후 불변이므로 포함하지 않는다.
 * `description`과 `permissions`만 변경 가능하다.
 */
@InputType()
export class UpdateRoleInput {
  /** 역할 설명 (변경 시에만 전달) */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /**
   * 권한 문자열 목록 (변경 시에만 전달).
   * 전달하면 기존 permissions를 전부 교체한다.
   */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
