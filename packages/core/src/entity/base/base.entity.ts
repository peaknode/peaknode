import { Field, GraphQLISODateTime, ID, ObjectType } from "@nestjs/graphql";
import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * 모든 엔터티의 기반 추상 클래스.
 * UUID PK, 생성/수정/삭제 타임스탬프를 공통으로 제공한다.
 */
@ObjectType({ isAbstract: true })
export abstract class BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @CreateDateColumn({ nullable: true })
  createdAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @UpdateDateColumn({ nullable: true })
  updatedAt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;
}
