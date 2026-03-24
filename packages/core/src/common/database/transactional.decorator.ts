import { TransactionConnection } from "./transaction-connection";

/**
 * `@Transactional()` 데코레이터 옵션 인터페이스.
 */
export interface TransactionalOptions {
  /**
   * `TransactionConnection` 인스턴스를 가진 프로퍼티 이름.
   * 기본값은 `"db"`.
   *
   * 서비스가 `protected readonly db: TransactionConnection`으로 선언한 경우
   * 별도 옵션 없이 `@Transactional()`을 사용할 수 있다.
   *
   * @default "db"
   * @example
   * // 커스텀 프로퍼티명을 사용하는 경우
   * @Transactional({ connectionKey: 'connection' })
   * async someMethod() { ... }
   */
  connectionKey?: string;
}

/**
 * 메서드를 자동으로 트랜잭션으로 감싸는 메서드 데코레이터.
 *
 * 데코레이터가 붙은 메서드가 호출되면 `this[connectionKey].withTransaction()`을 통해
 * 트랜잭션 경계가 자동으로 생성된다. 메서드가 예외를 던지면 롤백되고,
 * 정상 반환하면 커밋된다.
 *
 * **사용 규칙:** 이 데코레이터를 사용하는 클래스는 `connectionKey`에 해당하는
 * 프로퍼티명으로 `TransactionConnection` 인스턴스를 보유해야 한다.
 * 프로젝트 관례상 `protected readonly db: TransactionConnection`을 사용한다.
 *
 * @param options - 데코레이터 옵션 (기본: `{ connectionKey: "db" }`)
 *
 * @example
 * // 기본 사용 (this.db가 TransactionConnection인 경우)
 * @Transactional()
 * async createProduct(dto: CreateProductDto): Promise<Product> {
 *   const repo = this.db.getRepository(Product);
 *   return repo.save(repo.create(dto));
 * }
 *
 * @example
 * // 커스텀 프로퍼티명 사용
 * @Transactional({ connectionKey: 'transactionConnection' })
 * async updateStock(variantId: string, delta: number): Promise<void> {
 *   // ...
 * }
 */
export function Transactional(options: TransactionalOptions = {}): MethodDecorator {
  const connectionKey = options.connectionKey ?? "db";

  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    descriptor.value = async function (
      this: Record<string, unknown>,
      ...args: unknown[]
    ) {
      const connection = this[connectionKey] as TransactionConnection | undefined;

      if (!connection || typeof connection.withTransaction !== "function") {
        throw new Error(
          `@Transactional(): "${String(propertyKey)}" 메서드가 있는 클래스에 ` +
            `"${connectionKey}" 프로퍼티로 TransactionConnection이 등록되지 않았습니다. ` +
            `클래스에 "protected readonly ${connectionKey}: TransactionConnection"을 선언했는지 확인하세요.`,
        );
      }

      return connection.withTransaction(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}
