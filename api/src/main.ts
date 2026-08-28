import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // Refuse to start in production with the default JWT secret
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'changeme') {
    if (process.env.NODE_ENV === 'production') {
      console.error('[FATAL] JWT_SECRET is not set or is using the default value. Refusing to start.');
      process.exit(1);
    } else {
      console.warn('[WARN] JWT_SECRET is using the default "changeme" value. Set it before deploying to production.');
    }
  }

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // Security headers — HSTS, XSS protection, content-type sniffing, etc.
  app.use(helmet({
    contentSecurityPolicy: false, // disabled — frontend is served separately
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`DLR API running on http://localhost:${port}/api`);
}
bootstrap();
