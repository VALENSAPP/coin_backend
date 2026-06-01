import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

const APP_STORE_URL = process.env.APP_STORE_URL;
@Controller()
export class DeepLinkController {
  private fallbackHtml(route: string, id: string) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
         

          <script>
            window.location.href = "com.valens.app://${route}/${id}";

            setTimeout(function () {
              window.location.href = "${APP_STORE_URL}";
            }, 2000);
          </script>
        </body>
      </html>
    `;
  }

  @Get('profile/:id')
  profile(@Param('id') id: string, @Res() res: Response) {
    return res.send(this.fallbackHtml('profile', id));
  }

  @Get('u/:id')
  user(@Param('id') id: string, @Res() res: Response) {
    return res.send(this.fallbackHtml('u', id));
  }

  @Get('share/:id')
  share(@Param('id') id: string, @Res() res: Response) {
    return res.send(this.fallbackHtml('share', id));
  }

  @Get('postshare/:id')
  postshare(@Param('id') id: string, @Res() res: Response) {
    return res.send(this.fallbackHtml('postshare', id));
  }

  @Get('reelshare/:id')
  reelshare(@Param('id') id: string, @Res() res: Response) {
    return res.send(this.fallbackHtml('reelshare', id));
  }

  @Get('storyshare/:id')
  storyshare(@Param('id') id: string, @Res() res: Response) {
    return res.send(this.fallbackHtml('storyshare', id));
  }
}