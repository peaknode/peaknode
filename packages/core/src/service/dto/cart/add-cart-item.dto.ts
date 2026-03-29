import { Field, ID, InputType, Int } from "@nestjs/graphql";
import { IsInt, IsUUID, Max, Min } from "class-validator";

/**
 * 장바구니에 아이템을 추가할 때 사용하는 입력 DTO.
 */
@InputType()
export class AddCartItemDto {
  /** 추가할 ProductVariant(SKU)의 UUID. */
  @Field(() => ID)
  @IsUUID()
  productVariantId: string;

  /**
   * 추가할 수량.
   * 1 이상 100 이하여야 한다.
   */
  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}
