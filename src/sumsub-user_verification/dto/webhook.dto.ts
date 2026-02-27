import { ApiProperty } from '@nestjs/swagger';

export class VeriffWebhookDto {
  @ApiProperty({ example: 'verification.reviewed' })
  event: string;

  @ApiProperty({
    example: {
      id: '8c0d61f7-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      status: 'approved',
      document: { type: 'DRIVERS_LICENSE' },
    },
  })
  verification: any;
}
