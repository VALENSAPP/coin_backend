import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger.config';
import { PrismaClient } from '@prisma/client';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Stripe webhook needs raw body
  app.use('/billing/webhook', bodyParser.raw({ type: '*/*' }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  setupSwagger(app);
  const port = process.env.PORT || 3002;
const host = process.env.HOST || '0.0.0.0';
await app.listen(port, host);
  console.log(`Nest application successfully started`);
  console.log(`Listening on host "${host}" at port "${port}"`);
  console.log(`Access Swagger UI at http://<YOUR_SERVER_IP>:${port}/api`);
}
bootstrap();