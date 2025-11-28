import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('.well-known/apple-app-site-association')
  getAppleAppSiteAssociation() {
    const filePath = path.join(__dirname, '..', '..', 'public', '.well-known', 'apple-app-site-association');
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }
}
