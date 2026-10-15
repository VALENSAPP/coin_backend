import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('logo.png')
  @Get('apple-touch-icon.png')
  @Get('apple-touch-icon-precomposed.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400')
  getLogo(@Res() res: Response) {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'logo.png'),
      path.join(process.cwd(), 'coin_backend', 'public', 'logo.png'),
      path.join(__dirname, '..', 'public', 'logo.png'),
      path.join(process.cwd(), 'public', 'images', 'logo.png'),
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p));
    if (filePath) {
      return res.sendFile(filePath);
    }
    return res.status(404).send('Logo not found');
  }

  @Get('share-assets/valens-share-og.png')
  @Get('share-assets/valens-share.png')
  @Get('share-assets/valens-welcome-banner.png')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'public, max-age=86400')
  getShareBanner(@Res() res: Response) {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'share-assets', 'valens-share-og.png'),
      path.join(process.cwd(), 'coin_backend', 'public', 'share-assets', 'valens-share-og.png'),
      path.join(__dirname, '..', 'public', 'share-assets', 'valens-share-og.png'),
      path.join(process.cwd(), 'public', 'share-assets', 'valens-share.png'),
      path.join(process.cwd(), 'coin_backend', 'public', 'share-assets', 'valens-share.png'),
      path.join(__dirname, '..', 'public', 'share-assets', 'valens-share.png'),
      path.join(process.cwd(), 'public', 'share-assets', 'valens-welcome-banner.png'),
      path.join(process.cwd(), 'coin_backend', 'public', 'share-assets', 'valens-welcome-banner.png'),
      path.join(__dirname, '..', 'public', 'share-assets', 'valens-welcome-banner.png'),
    ];
    const filePath = candidatePaths.find((p) => fs.existsSync(p));
    if (filePath) {
      return res.sendFile(filePath);
    }
    return res.status(404).send('Banner not found');
  }

  @Get('.well-known/apple-app-site-association')
  @Get('well-known/apple-app-site-association')
  @Header('Content-Type', 'application/json')
  getAppleAppSiteAssociation(@Res() res: Response) {
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'public', '.well-known', 'apple-app-site-association'),
        path.join(process.cwd(), 'coin_backend', 'public', '.well-known', 'apple-app-site-association'),
        path.join(__dirname, '..', 'public', '.well-known', 'apple-app-site-association'),
      ];
      const filePath = candidatePaths.find((p) => fs.existsSync(p));

      if (!filePath) {
        return res.status(404).json({
          message: 'Apple App Site Association file not found',
          error: 'Not Found',
          statusCode: 404,
        });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return res.json(JSON.parse(content));
    } catch (error) {
      return res.status(500).json({
        message: 'Error reading Apple App Site Association file',
        error: 'Internal Server Error',
        statusCode: 500,
        details: error.message,
      });
    }
  }

  @Get('.well-known/assetlinks.json')
  @Get('well-known/assetlinks.json')
  @Header('Content-Type', 'application/json')
  getAssetLinks(@Res() res: Response) {
    try {
      const candidatePaths = [
        path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json'),
        path.join(process.cwd(), 'coin_backend', 'public', '.well-known', 'assetlinks.json'),
        path.join(__dirname, '..', 'public', '.well-known', 'assetlinks.json'),
      ];
      const filePath = candidatePaths.find((p) => fs.existsSync(p));

      if (!filePath) {
        return res.status(404).json({
          message: 'Assetlinks file not found',
          error: 'Not Found',
          statusCode: 404,
        });
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return res.json(JSON.parse(content));
    } catch (error) {
      return res.status(500).json({
        message: 'Error reading Assetlinks file',
        error: 'Internal Server Error',
        statusCode: 500,
        details: error.message,
      });
    }
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  @Get('open-app')
  @Get('app')
  @Get('open')
  @Get('share/app')
  @Get('share-app')
  @Get('download')
  @Get('invite')
  openApp(@Req() req: Request, @Res() res: Response) {
    const configuredBaseUrl = process.env.BASE_URL;
    const configuredOgImageUrl = process.env.OG_IMAGE_URL;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = req.get('host');
    const baseUrl = configuredBaseUrl || (host ? `${protocol}://${host}` : 'https://api.valens.app');

    const ogImage =
      configuredOgImageUrl ||
      `${baseUrl}/share-assets/valens-share-og.png`;

    const appStoreUrl =
      process.env.APP_STORE_URL || 'https://apps.apple.com/app/valens/id6740683058';
    const playStoreUrl =
      process.env.PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.valens.app';
    const webUrl = process.env.WEB_URL || process.env.APP_BASE_URL || 'https://valensapp.com';

    const rawPath = typeof req.query.path === 'string' ? req.query.path.replace(/^\/+/, '') : 'home';
    const shareUrl = `${baseUrl}/app${rawPath && rawPath !== 'home' ? `?path=${encodeURIComponent(rawPath)}` : ''}`;

    const title = 'Valens App';
    const description = 'Reputation Earned. Value Built';

    const safeTitle = this.escapeHtml(title);
    const safeDesc = this.escapeHtml(description);
    const safeOgImage = this.escapeHtml(ogImage);
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safeAppStore = this.escapeHtml(appStoreUrl);
    const safePlayStore = this.escapeHtml(playStoreUrl);
    const safeWebUrl = this.escapeHtml(webUrl);
    const safePath = this.escapeHtml(rawPath);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} · Reputation Earned. Value Built</title>
  <meta name="description" content="${safeDesc}">

  <!-- Open Graph / WhatsApp / iMessage / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Valens">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  <meta property="og:url" content="${safeShareUrl}">
  <meta property="og:image" content="${safeOgImage}">
  <meta property="og:image:secure_url" content="${safeOgImage}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="473">
  <meta property="og:image:height" content="1024">
  <meta property="og:image:alt" content="Valens App">

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  <meta name="twitter:image" content="${safeOgImage}">

  <link rel="icon" type="image/png" href="${baseUrl}/logo.png">
  <link rel="apple-touch-icon" href="${baseUrl}/logo.png">
  <link rel="apple-touch-icon-precomposed" href="${baseUrl}/logo.png">
  <link rel="canonical" href="${safeShareUrl}">

  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: radial-gradient(circle at 50% 20%, #200b3b 0%, #0d0618 100%);
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 24px;
      padding: 36px 28px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .logo-container { margin-bottom: 20px; }
    .logo { max-width: 180px; width: 70%; height: auto; display: block; margin: 0 auto; border-radius: 16px; }
    .spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: #a855f7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 18px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 6px; }
    p.subtitle { font-size: 14px; color: rgba(255, 255, 255, 0.75); line-height: 1.5; margin-bottom: 24px; }
    .btn-group { display: flex; flex-direction: column; gap: 12px; width: 100%; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      padding: 14px 20px; border-radius: 12px; font-size: 15px; font-weight: 600;
      text-decoration: none; transition: all 0.2s ease; border: none; cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(109, 40, 217, 0.4);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(109, 40, 217, 0.5); }
    .btn-store { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: #ffffff; }
    .btn-store:hover { background: rgba(255, 255, 255, 0.14); }
    .footer-text { margin-top: 24px; font-size: 12px; color: rgba(255, 255, 255, 0.45); }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <img src="${safeOgImage}" alt="Valens" class="logo" onerror="this.src='${baseUrl}/logo.png'">
    </div>

    <div id="loading-state">
      <div class="spinner"></div>
      <h1 id="status-title">Opening Valens...</h1>
      <p class="subtitle" id="status-desc">If the app is installed, it will open automatically.</p>
    </div>

    <div class="btn-group">
      <a id="btn-open-app" href="com.valens.app://${safePath}" class="btn btn-primary">
        <span>🚀</span> Open in Valens App
      </a>
      <a id="btn-app-store" href="${safeAppStore}" class="btn btn-store" style="display:none;">
        <span>🍎</span> Download on App Store
      </a>
      <a id="btn-play-store" href="${safePlayStore}" class="btn btn-store" style="display:none;">
        <span>🤖</span> Get it on Google Play
      </a>
      <a id="btn-web" href="${safeWebUrl}" class="btn btn-store" style="display:none;">
        <span>🌐</span> Visit Valens Web
      </a>
    </div>

    <div class="footer-text">
      &copy; 2026 Valens Technologies INC. All rights reserved.
    </div>
  </div>

  <script>
    (function () {
      var path = "${safePath}";
      var appStore = "${safeAppStore}";
      var playStore = "${safePlayStore}";
      var webUrl = "${safeWebUrl}";

      var ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
      var isCrawler = /whatsapp|facebookexternalhit|twitterbot|telegrambot|applebot|discordbot|slackbot|linkedinbot/i.test(ua);
      var isIOS = /ipad|iphone|ipod/.test(ua) && !window.MSStream;
      var isAndroid = /android/i.test(ua);

      var btnAppStore = document.getElementById('btn-app-store');
      var btnPlayStore = document.getElementById('btn-play-store');
      var btnWeb = document.getElementById('btn-web');
      var spinner = document.querySelector('.spinner');

      if (isIOS) {
        btnAppStore.style.display = 'flex';
      } else if (isAndroid) {
        btnPlayStore.style.display = 'flex';
      } else {
        btnWeb.style.display = 'flex';
        btnAppStore.style.display = 'flex';
        btnPlayStore.style.display = 'flex';
      }

      if (isCrawler) {
        if (spinner) spinner.style.display = 'none';
        return;
      }

      var appOpened = false;
      function markOpened() { appOpened = true; }
      document.addEventListener('visibilitychange', function () {
        if (document.hidden || document.webkitHidden) markOpened();
      });
      window.addEventListener('pagehide', markOpened);
      window.addEventListener('blur', markOpened);

      var startTime = Date.now();

      if (isAndroid) {
        var fallbackUrl = encodeURIComponent(playStore);
        var androidIntent = "intent://" + path + "#Intent;scheme=com.valens;package=com.valens.app;S.browser_fallback_url=" + fallbackUrl + ";end";
        window.location.href = androidIntent;
      } else if (isIOS) {
        window.location.href = "com.valens.app://" + path;
        setTimeout(function () {
          var elapsed = Date.now() - startTime;
          if (!appOpened && elapsed < 2500) {
            window.location.href = appStore;
          }
        }, 1400);
      } else {
        if (spinner) spinner.style.display = 'none';
        var statusTitle = document.getElementById('status-title');
        var statusDesc = document.getElementById('status-desc');
        if (statusTitle) statusTitle.textContent = 'Welcome to Valens';
        if (statusDesc) statusDesc.textContent = 'Download the Valens mobile app on your phone:';
      }
    })();
  </script>
</body>
</html>`);
  }
}
