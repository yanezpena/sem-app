import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors
          .flatMap((err) => Object.values(err.constraints ?? {}))
          .filter(Boolean);

        // Provide a single, user-friendly message if we can.
        const friendlyMessage =
          messages.length === 0
            ? 'Invalid input'
            : messages.length === 1
            ? messages[0]
            : messages.join('. ');

        return new BadRequestException({
          message: friendlyMessage,
          errors: messages,
        });
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
