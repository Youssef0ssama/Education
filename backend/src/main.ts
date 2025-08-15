import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      configService.get('CLIENT_URL') || 'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Education Platform API')
    .setDescription(
      'A comprehensive education management platform API with course management, student enrollment, assignments, and analytics.',
    )
    .setVersion('1.0.0')
    .setContact(
      'Education Platform Team',
      'https://education-platform.com',
      'support@education-platform.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer(
      configService.get('NODE_ENV') === 'production'
        ? 'https://your-production-url.com/api'
        : `http://localhost:${configService.get('PORT', 3000)}/api`,
      configService.get('NODE_ENV') === 'production'
        ? 'Production server'
        : 'Development server',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User authentication and profile management')
    .addTag('Users', 'User management operations')
    .addTag('Courses', 'Course management operations')
    .addTag('Students', 'Student-specific operations')
    .addTag('Teachers', 'Teacher-specific operations')
    .addTag('Admin', 'Administrative operations')
    .addTag('Assignments', 'Assignment management')
    .addTag('Sessions', 'Class session management')
    .addTag('Content', 'Course content management')
    .addTag('Analytics', 'System analytics and reporting')
    .addTag('Notifications', 'Notification system')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customSiteTitle: 'Education Platform API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log('🚀 Education Platform API Started');
  console.log(`📍 Server running on port ${port}`);
  console.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🔐 API endpoints: http://localhost:${port}/api`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log('─'.repeat(50));
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});