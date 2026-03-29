import { Field, InputType, Int } from "@nestjs/graphql";
import { IsInt, Max, Min } from "class-validator";

/**
 * 장바구니 아이템 수량을 변경할 때 사용하는 입력 DTO.
 *
 * `quantity`가 0이면 해당 아이템이 장바구니에서 제거된다.
 */
@InputType()
export class UpdateCartItemDto {
  /**
   * 새 수량.
   * 0이면 아이템 삭제, 1~100은 수량 변경.
   */
  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(100)
  quantity: number;
}
