import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('logo.png')
  @Header('Content-Type', 'image/png')
  getLogo(@Res() res: Response) {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'coin_backend', 'public', 'logo.png'),
      path.join(__dirname, '..', 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'share-assets', 'valens-share.png'),
      path.join(__dirname, '..', 'public', 'share-assets', 'valens-share.png'),
    ];
    const filePath = candidatePaths.find(p => fs.existsSync(p));
    if (filePath) {
      return res.sendFile(filePath);
    }
    return res.status(404).send('Logo not found');
  }

  @Get('.well-known/apple-app-site-association')
  @Get('well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  getAppleAppSiteAssociation(@Res() res: Response) {
    try {
      // Use process.cwd() to get the project root directory
      const filePath = path.join(process.cwd(), 'public', '.well-known', 'apple-app-site-association');

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

  @Get('open-app')
  @Get('app')
  @Get('open')
  openApp(@Req() req: Request, @Res() res: Response) {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    const appStoreUrl = process.env.APP_STORE_URL || 'https://apps.apple.com/app/valens/id6740683058';
    const playStoreUrl = process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.valens.app';
    const webUrl = process.env.WEB_URL || process.env.APP_BASE_URL || 'https://valens.app';

    if (isAndroid) {
      // Android: Native intent launches app if installed, or directly opens Google Play Store
      const fallbackUrl = encodeURIComponent(playStoreUrl);
      const androidIntent = `intent://home#Intent;scheme=valens;package=com.valens.app;S.browser_fallback_url=${fallbackUrl};end`;
      return res.redirect(androidIntent);
    }

    if (isIOS) {
      // iOS: Try custom scheme, fallback seamlessly to Apple App Store
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Valens</title>
  <script>
    window.location.href = "valens://home";
    setTimeout(function() {
      window.location.href = "${appStoreUrl}";
    }, 1200);
  </script>
</head>
<body style="background:#ffffff;margin:0;padding:0;"></body>
</html>`);
    }

    // Desktop / Laptop: Directly redirect to website (no intermediate screen)
    return res.redirect(webUrl);
  }
}
