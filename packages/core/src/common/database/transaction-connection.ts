import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { BaseEntity } from "src/entity/base/base.entity";
import { DataSource, EntityManager, EntityTarget, Repository } from "typeorm";

@Injectable()
export class TransactionConnection {
  protected writeConnection: EntityManager;
  protected readConnection: EntityManager;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.writeConnection = this.dataSource.createQueryRunner().manager;
    this.readConnection = this.dataSource.manager;
  }

  getRepository<T extends BaseEntity>(entity: EntityTarget<T>): Repository<T> {
    return this.readConnection.getRepository(entity);
  }

  getWriteRepository<T extends BaseEntity>(entity: EntityTarget<T>): Repository<T> {
    return this.writeConnection.getRepository(entity);
  }
}
