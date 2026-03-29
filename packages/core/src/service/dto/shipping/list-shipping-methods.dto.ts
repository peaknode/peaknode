import { Field, InputType, Int } from "@nestjs/graphql";
import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * 배송 방법 목록 조회 옵션 DTO.
 */
@InputType()
export class ListShippingMethodsDto {
  /**
   * 건너뛸 레코드 수 (페이지네이션 오프셋).
   * @default 0
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  /**
   * 가져올 최대 레코드 수.
   * @default 20
   * @max 100
   */
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  /** 활성화 여부 필터 */
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
