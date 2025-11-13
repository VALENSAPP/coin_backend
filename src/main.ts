import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger.config';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import * as bodyParser from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Webhooks need raw body for signature verification
  app.use('/billing/webhook', bodyParser.raw({ type: '*/*' }));
  app.use('/kyc/webhook', bodyParser.raw({ type: '*/*' }));
  
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true }));

  // Serve static files from the public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));
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