import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

const APP_STORE_URL = process.env.APP_STORE_URL;
@Controller()
export class DeepLinkController {
    private fallbackHtml() {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="apple-itunes-app" content="app-id=6752780902">
          <title>Valens</title>
        </head>
        <body>
          Opening Valens...
          <script>
            setTimeout(() => {
              window.location.href = "${APP_STORE_URL}";
            }, 1500);
          </script>
        </body>
      </html>
    `;
    }

    @Get('profile/:id')
    profile(@Param('id') id: string, @Res() res: Response) {
        return res.send(this.fallbackHtml());
    }

    @Get('u/:id')
    user(@Param('id') id: string, @Res() res: Response) {
        return res.send(this.fallbackHtml());
    }

    @Get('share/:id')
    share(@Param('id') id: string, @Res() res: Response) {
        return res.send(this.fallbackHtml());
    }

    @Get('postshare/:id')
    postshare(@Param('id') id: string, @Res() res: Response) {
        return res.send(this.fallbackHtml());
    }

    @Get('reelshare/:id')
    reelshare(@Param('id') id: string, @Res() res: Response) {
        return res.send(this.fallbackHtml());
    }

    @Get('storyshare/:id')
    storyshare(@Param('id') id: string, @Res() res: Response) {
        return res.send(this.fallbackHtml());
    }
}