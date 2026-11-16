import 'dotenv/config'; // must run first: several modules read process.env when they are imported
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { NumericParamPipe } from './common/numeric-param.pipe';
import { validateJwtSecret } from './common/env-check';
import { join } from 'path';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  validateJwtSecret(process.env.JWT_SECRET, isProd);
  if (isProd && !process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in production.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a reverse proxy, trust it so rate limiting sees the real client IP.
  // TRUST_PROXY: number of proxy hops (default 1 in production, off otherwise).
  const hops = process.env.TRUST_PROXY ?? (isProd ? '1' : '0');
  if (Number(hops) > 0) app.set('trust proxy', Number(hops));

  app.use(
    helmet({
      // Avatars are loaded by the frontend from a different origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.useBodyParser('json', { limit: '1mb' });
  app.useBodyParser('urlencoded', { limit: '1mb', extended: true });

  // Only avatars are public (they are rendered via <img>). Task attachments are
  // NOT served statically: they are only reachable through the authenticated
  // GET /attachments/:id/download endpoint.
  app.useStaticAssets(join(__dirname, '..', 'uploads', 'avatars'), {
    prefix: '/uploads/avatars',
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });
  app.useGlobalPipes(
    new NumericParamPipe(),
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
