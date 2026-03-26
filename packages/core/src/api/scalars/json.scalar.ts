import { CustomScalar, Scalar } from "@nestjs/graphql";
import { GraphQLJSONScalar } from "src/common/types/json-scalar.class";
import { ASTNode, Kind } from "graphql";

/**
 * GraphQL JSON 커스텀 스칼라 Provider.
 *
 * 임의의 JSON 값(object, array, string, number, boolean, null)을 수용한다.
 * `@Field(() => GraphQLJSONScalar)` 형태로 ObjectType/InputType 필드에서 사용한다.
 *
 * 이 클래스를 NestJS 모듈의 `providers`에 등록하면 JSON 스칼라가 GraphQL 스키마에 추가된다.
 */
@Scalar("JSON", () => GraphQLJSONScalar)
export class JsonScalar implements CustomScalar<unknown, unknown> {
  description = "JSON 스칼라 타입 - 임의의 JSON 값을 직렬화/역직렬화한다";

  /**
   * 클라이언트에서 받은 변수 값을 역직렬화한다.
   * @param value - 클라이언트 입력 값
   */
  parseValue(value: unknown): unknown {
    return value;
  }

  /**
   * 서버 응답 값을 직렬화한다.
   * @param value - 직렬화할 값
   */
  serialize(value: unknown): unknown {
    return value;
  }

  /**
   * GraphQL 쿼리 리터럴(인라인 값)을 파싱한다.
   * @param ast - GraphQL AST 노드
   */
  parseLiteral(ast: ASTNode): unknown {
    return this.parseAst(ast);
  }

  /**
   * AST 노드를 재귀적으로 JavaScript 값으로 변환한다.
   * @param ast - GraphQL AST 노드
   */
  private parseAst(ast: ASTNode): unknown {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT:
        return Object.fromEntries(
          ast.fields.map((f) => [f.name.value, this.parseAst(f.value)]),
        );
      case Kind.LIST:
        return ast.values.map((v) => this.parseAst(v));
      case Kind.NULL:
        return null;
      default:
        return undefined;
    }
  }
}
