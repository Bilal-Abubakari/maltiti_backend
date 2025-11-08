import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as process from "process";
import * as cookieParser from "cookie-parser";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
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

  // Enable cookie parser
  app.use(cookieParser());

  // Enable CORS with credentials support for cookies
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  });

  // Swagger/OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle("Maltiti A. Enterprise Ltd - Admin Portal API")
    .setDescription(
      "API documentation for Maltiti A. Enterprise Ltd Admin Portal Backend. " +
        "Manufacturer of premium shea-based products, cosmetics, and essential oils.",
    )
    .setVersion("1.0")
    .addTag("Authentication", "User authentication and authorization endpoints")
    .addTag("Products", "Product management endpoints")
    .addTag("Cart", "Shopping cart management endpoints")
    .addTag("Checkout", "Order and checkout endpoints")
    .addTag("Cooperative", "Cooperative management endpoints")
    .addTag("Users", "User management endpoints")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth",
    )
    .addServer(process.env.API_URL || "http://localhost:3002", "Development")
    .setContact("Maltiti Support", "https://maltiti.com", "support@maltiti.com")
    .setLicense("Proprietary", "https://maltiti.com/license")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    customSiteTitle: "Maltiti API Documentation",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: "none",
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  const port = process.env.APP_PORT || 3002;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api-docs`);
}

void bootstrap();
