import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // === SÉCURITÉ ===
  // Helmet : headers de sécurité (anti-injection, clickjacking, etc.)
  app.use(helmet());

  // Timeout global : tue toute requête > 30 secondes
  app.use((req: any, res: any, next: any) => {
    res.setTimeout(30000, () => {
      res.status(408).json({ message: 'Request timeout' });
    });
    next();
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  // Préfixe API
  app.setGlobalPrefix('api/v1');

  // Swagger / OpenAPI
  const config = new DocumentBuilder()
    .setTitle('SOC API')
    .setDescription('Synthetic Object Care — API Backend')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SOC API démarrée sur 0.0.0.0:${port}`);
  console.log(`📄 Docs Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
