import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /**
   * 전역 ValidationPipe.
   * class-validator 데코레이터로 선언된 모든 DTO를 자동 검증한다.
   * - whitelist: DTO에 선언되지 않은 속성 제거
   * - forbidNonWhitelisted: 선언되지 않은 속성 전달 시 400 에러
   * - transform: 타입 자동 변환 (string → number 등)
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(3000);
}
bootstrap();
