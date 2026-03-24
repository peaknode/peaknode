import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { EntityManager } from "typeorm";

/**
 * AsyncLocalStorage 기반 트랜잭션 컨텍스트 저장소.
 *
 * 현재 비동기 호출 스택에서 활성화된 트랜잭션 EntityManager를 보관한다.
 * `TransactionConnection.withTransaction()` 실행 중에는 이 스토어에 EntityManager가 설정되며,
 * 트랜잭션이 없을 때는 `undefined`를 반환한다.
 *
 * NestJS 싱글톤 프로바이더로 등록되므로 AsyncLocalStorage 인스턴스도 앱 전체에 하나만 존재한다.
 */
@Injectable()
export class TransactionStore {
  /**
   * 트랜잭션 EntityManager를 담는 AsyncLocalStorage 인스턴스.
   */
  private readonly storage = new AsyncLocalStorage<EntityManager>();

  /**
   * 현재 비동기 컨텍스트에서 활성화된 트랜잭션 EntityManager를 반환한다.
   * 트랜잭션 범위 밖에서 호출하면 `undefined`를 반환한다.
   */
  getManager(): EntityManager | undefined {
    return this.storage.getStore();
  }

  /**
   * 주어진 EntityManager를 현재 비동기 컨텍스트에 바인딩하고 콜백을 실행한다.
   * 콜백 내부(중첩 async 포함)에서 `getManager()`를 호출하면 이 manager가 반환된다.
   *
   * @param manager - 바인딩할 트랜잭션 EntityManager
   * @param callback - 트랜잭션 컨텍스트 내에서 실행할 비동기 함수
   * @returns 콜백의 반환값
   */
  run<T>(manager: EntityManager, callback: () => Promise<T>): Promise<T> {
    return this.storage.run(manager, callback);
  }
}
