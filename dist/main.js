"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_config_1 = require("./swagger/swagger.config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    (0, swagger_config_1.setupSwagger)(app);
    const port = process.env.PORT || 3002;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    console.log(`Nest application successfully started`);
    console.log(`Listening on host "${host}" at port "${port}"`);
    console.log(`Access Swagger UI at http://<YOUR_SERVER_IP>:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map