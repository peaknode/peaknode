/**
 * GraphQL JSON 스칼라 타입의 TypeScript 참조 클래스.
 *
 * 실제 스칼라 구현은 `JsonScalar` provider가 담당하며,
 * 이 클래스는 `@Field(() => GraphQLJSONScalar)` 형태의 타입 참조용으로만 사용한다.
 *
 * @example
 * ```typescript
 * @Field(() => GraphQLJSONScalar, { nullable: true })
 * @Column({ name: "custom_fields", type: "simple-json", nullable: true })
 * customFields: Record<string, unknown> | null;
 * ```
 */
export class GraphQLJSONScalar {}
