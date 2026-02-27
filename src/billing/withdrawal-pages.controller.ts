import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Response } from 'express';
import { join } from 'path';

@Controller('withdrawal')
export class WithdrawalPagesController {
  @Get('success')
  @ApiExcludeEndpoint()
  getOnboardingSuccess(@Res() res: Response) {
    const path = join(process.cwd(), 'public', 'withdrawal', 'success.html');
    return res.sendFile(path);
  }
}
