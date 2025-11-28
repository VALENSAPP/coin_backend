import { Controller, Get, Header, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('.well-known/apple-app-site-association')
  @Get('well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  getAppleAppSiteAssociation(@Res() res: Response) {
    try {
      // Use process.cwd() to get the project root directory
      const filePath = path.join(process.cwd(), 'public', '.well-known', 'apple-app-site-association');
      console.log('Looking for apple-app-site-association at:', filePath);

      if (!fs.existsSync(filePath)) {
        console.error('File does not exist at path:', filePath);
        return res.status(404).json({
          message: 'Apple App Site Association file not found',
          error: 'Not Found',
          statusCode: 404,
          path: filePath
        });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const jsonContent = JSON.parse(content);
      return res.json(jsonContent);
    } catch (error) {
      console.error('Error reading apple-app-site-association file:', error);
      return res.status(500).json({
        message: 'Error reading Apple App Site Association file',
        error: 'Internal Server Error',
        statusCode: 500,
        details: error.message
      });
    }
  }
}
