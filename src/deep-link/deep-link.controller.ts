import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
@Controller()
export class DeepLinkController {
  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private fallbackHtml(route: string, id: string, req: Request) {
    const appStoreUrl = process.env.APP_STORE_URL || 'https://apps.apple.com/us/app/valens-app/id6752780902';
    const configuredBaseUrl = process.env.BASE_URL;
    const configuredOgImageUrl = process.env.OG_IMAGE_URL;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const baseUrl = configuredBaseUrl || (host ? `${protocol}://${host}` : 'https://prod-api.valens.app');
    const encodedId = encodeURIComponent(id);
    const shareUrl = `${baseUrl}/${route}/${encodedId}`;
    const ogImage = configuredOgImageUrl || `${baseUrl}/share-assets/valens-share.png`;
    const deepLinkUrl = `com.valens.app://${route}/${encodedId}`;
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safeOgImage = this.escapeHtml(ogImage);
    const safeDeepLinkUrl = this.escapeHtml(deepLinkUrl);
    const safeAppStoreUrl = this.escapeHtml(appStoreUrl);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Valens</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Join Valens and discover stories, profiles, and content shared with you.">

          <meta property="og:type" content="website">
          <meta property="og:site_name" content="Valens">
          <meta property="og:title" content="Valens">
          <meta property="og:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta property="og:url" content="${safeShareUrl}">
          <meta property="og:image" content="${safeOgImage}">
          <meta property="og:image:secure_url" content="${safeOgImage}">
          <meta property="og:image:type" content="image/png">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="og:image:alt" content="Valens App Logo">

          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Valens">
          <meta name="twitter:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta name="twitter:image" content="${safeOgImage}">

          <link rel="canonical" href="${safeShareUrl}">
        </head>
        <body>
          <p></p>

          <script>
            window.location.href = "${safeDeepLinkUrl}";

            setTimeout(function () {
              window.location.href = "${safeAppStoreUrl}";
            }, 2000);
          </script>
        </body>
      </html>
    `;
  }

  private callbackFallbackHtml(req: Request) {
    const appStoreUrl = process.env.APP_STORE_URL || 'https://apps.apple.com/us/app/valens-app/id6752780902';
    const configuredBaseUrl = process.env.BASE_URL;
    const configuredOgImageUrl = process.env.OG_IMAGE_URL;
    const configuredHomeDeepLink = process.env.HOME_DEEP_LINK_URL;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.get('host');
    const baseUrl = configuredBaseUrl || (host ? `${protocol}://${host}` : 'https://prod-api.valens.app');
    const shareUrl = `${baseUrl}/callback`;
    const ogImage = configuredOgImageUrl || `${baseUrl}/share-assets/valens-share.png`;
    const deepLinkUrl = configuredHomeDeepLink || 'com.valens://callback';
    const safeShareUrl = this.escapeHtml(shareUrl);
    const safeOgImage = this.escapeHtml(ogImage);
    const safeDeepLinkUrl = this.escapeHtml(deepLinkUrl);
    const safeAppStoreUrl = this.escapeHtml(appStoreUrl);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Valens</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Join Valens and discover stories, profiles, and content shared with you.">

          <meta property="og:type" content="website">
          <meta property="og:site_name" content="Valens">
          <meta property="og:title" content="Valens">
          <meta property="og:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta property="og:url" content="${safeShareUrl}">
          <meta property="og:image" content="${safeOgImage}">
          <meta property="og:image:secure_url" content="${safeOgImage}">
          <meta property="og:image:type" content="image/png">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="og:image:alt" content="Valens App Logo">

          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="Valens">
          <meta name="twitter:description" content="Join Valens and discover stories, profiles, and content shared with you.">
          <meta name="twitter:image" content="${safeOgImage}">

          <link rel="canonical" href="${safeShareUrl}">
        </head>
        <body>
          <p></p>

          <script>
            window.location.href = "${safeDeepLinkUrl}";

            setTimeout(function () {
              window.location.href = "${safeAppStoreUrl}";
            }, 2000);
          </script>
        </body>
      </html>
    `;
  }

  @Get('callback')
  callback(@Req() req: Request, @Res() res: Response) {
    return res.send(this.callbackFallbackHtml(req));
  }

  @Get('profile/:id')
  profile(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('profile', id, req));
  }

  @Get('u/:id')
  user(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('u', id, req));
  }

  @Get('share/:id')
  share(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('share', id, req));
  }

  @Get('postshare/:id')
  postshare(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('postshare', id, req));
  }

  @Get('reelshare/:id')
  reelshare(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('reelshare', id, req));
  }

  @Get('storyshare/:id')
  storyshare(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    return res.send(this.fallbackHtml('storyshare', id, req));
  }
}