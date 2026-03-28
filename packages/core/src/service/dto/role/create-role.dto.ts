import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsNotEmpty, IsString, Matches, MaxLength } from "class-validator";

/**
 * 역할 생성 Input DTO.
 */
@InputType()
export class CreateRoleInput {
  /**
   * 역할 코드. 시스템 전체에서 고유한 식별자.
   * 소문자 알파벳으로 시작하고 소문자/숫자/하이픈 조합만 허용한다.
   * 예: "superadmin", "product-manager"
   */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9-]*$/, { message: "code는 소문자로 시작하는 영문 소문자/숫자/하이픈 조합이어야 합니다." })
  code: string;

  /** 역할에 대한 사람이 읽을 수 있는 설명 */
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  /**
   * 부여할 권한 문자열 목록.
   * `Permission` enum의 value(예: "product:create") 또는
   * `SUPERADMIN_PERMISSION("__superadmin__")`을 사용한다.
   */
  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
