import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is needed to verify X-Hub-Signature-256 against the exact bytes Meta sent.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`WhatsApp QR bot listening on :${port}`);
}
bootstrap();
