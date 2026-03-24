import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { BaseEntity } from "src/entity/base/base.entity";
import {
  DataSource,
  EntityManager,
  EntityTarget,
  FindOneOptions,
  Repository,
} from "typeorm";
import { TransactionStore } from "./transaction-store";

/**
 * 서비스 레이어의 핵심 데이터베이스 접근 클래스.
 *
 * `AsyncLocalStorage` 기반으로 트랜잭션을 암묵적으로 전파한다.
 * 서비스는 별도의 컨텍스트 객체를 전달할 필요 없이 `getRepository()`만 호출하면 된다.
 *
 * - 트랜잭션 경계 내부에서 호출하면 자동으로 트랜잭션 EntityManager를 사용한다.
 * - 트랜잭션 경계 밖에서 호출하면 DataSource의 기본 EntityManager를 사용한다.
 *
 * 크로스 서비스 트랜잭션 전파도 지원한다. `withTransaction()` 내부에서
 * 다른 서비스의 메서드를 호출하면 해당 서비스의 `getRepository()` 역시
 * 같은 트랜잭션 EntityManager를 자동으로 공유한다.
 *
 * @example
 * // 서비스에서의 기본 사용
 * @Injectable()
 * export class ProductService {
 *   constructor(protected readonly db: TransactionConnection) {}
 *
 *   @Transactional()
 *   async createProduct(name: string): Promise<Product> {
 *     const repo = this.db.getRepository(Product);
 *     return repo.save(repo.create({ name }));
 *   }
 * }
 *
 * @example
 * // 크로스 서비스 트랜잭션 전파
 * async placeOrder(dto: PlaceOrderDto): Promise<Order> {
 *   return this.db.withTransaction(async () => {
 *     const order = await this.createOrderRecord(dto);
 *     await this.inventoryService.allocateStock(order.lines); // 같은 트랜잭션 자동 참여
 *     return order;
 *   });
 * }
 */
@Injectable()
export class TransactionConnection {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly transactionStore: TransactionStore,
  ) {}

  /**
   * 현재 비동기 컨텍스트에서 사용할 EntityManager를 반환한다.
   * getter를 사용하여 호출 시점에 평가함으로써 트랜잭션 컨텍스트를 정확히 반영한다.
   */
  private get activeManager(): EntityManager {
    return this.transactionStore.getManager() ?? this.dataSource.manager;
  }

  /**
   * 현재 활성화된 EntityManager로부터 Repository를 반환한다.
   *
   * 트랜잭션 내에서 호출하면 트랜잭션에 참여하는 Repository를 반환하고,
   * 트랜잭션 밖에서 호출하면 일반 Repository를 반환한다.
   *
   * @param entity - TypeORM EntityTarget (엔터티 클래스 또는 테이블명)
   * @returns 현재 컨텍스트에 맞는 Repository 인스턴스
   */
  getRepository<T extends BaseEntity>(entity: EntityTarget<T>): Repository<T> {
    return this.activeManager.getRepository(entity);
  }

  /**
   * 주어진 비동기 작업을 단일 데이터베이스 트랜잭션으로 실행한다.
   *
   * 이미 트랜잭션이 활성화된 경우(중첩 호출)에는 새 트랜잭션을 시작하지 않고
   * 기존 트랜잭션에 합류한다. 이를 통해 서비스 간 호출에서도 안전하게 동작한다.
   *
   * 콜백이 예외를 던지면 자동으로 롤백되며, 정상 완료 시 커밋한다.
   * QueryRunner는 항상 `finally` 블록에서 해제된다.
   *
   * @param work - 트랜잭션 내에서 실행할 비동기 함수
   * @returns 콜백의 반환값
   * @throws 콜백에서 던진 예외 (롤백 후 re-throw)
   */
  async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    // 이미 트랜잭션이 활성화되어 있으면 기존 트랜잭션에 합류
    if (this.transactionStore.getManager()) {
      return work();
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await this.transactionStore.run(queryRunner.manager, work);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ID로 엔터티를 단건 조회하고, 존재하지 않으면 `NotFoundException`을 던진다.
   *
   * 트랜잭션 컨텍스트를 자동으로 인식하므로 `withTransaction()` 내부에서 호출해도
   * 같은 트랜잭션에서 조회가 이루어진다.
   *
   * @param entity - 조회할 엔터티 클래스
   * @param id - 조회할 엔터티의 UUID
   * @param options - 추가 TypeORM FindOneOptions (relations 로딩 등). `where`는 제외.
   * @returns 조회된 엔터티
   * @throws NotFoundException - 해당 ID의 엔터티가 없을 때
   *
   * @example
   * const product = await this.db.findOneOrFail(Product, productId, {
   *   relations: { variants: true },
   * });
   */
  async findOneOrFail<T extends BaseEntity>(
    entity: EntityTarget<T>,
    id: string,
    options?: Omit<FindOneOptions<T>, "where">,
  ): Promise<T> {
    const found = await this.getRepository(entity).findOne({
      where: { id } as any,
      ...options,
    });

    if (!found) {
      const entityName =
        typeof entity === "function" ? (entity as any).name : String(entity);
      throw new NotFoundException(`${entityName}(id: "${id}")를 찾을 수 없습니다.`);
    }

    return found;
  }
}
